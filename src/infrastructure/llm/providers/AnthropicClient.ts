/**
 * Anthropic Client
 * LLM client implementation for Anthropic's Claude API
 */

import {
  LlmProvider,
  ChatMessage,
  CompletionOptions,
  CompletionResponse,
  EmbeddingResponse,
} from '../LlmClient.interface';
import { BaseLlmClient, BaseLlmConfig } from './BaseLlmClient';

/**
 * Anthropic API response types
 */
interface AnthropicChatResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  model: string;
}

/**
 * Anthropic-specific configuration
 */
export interface AnthropicClientConfig extends BaseLlmConfig {
  /** Anthropic API version */
  apiVersion?: string;
}

/**
 * Anthropic Client
 * Implements LLM client for Anthropic's Claude API
 */
export class AnthropicClient extends BaseLlmClient {
  readonly provider: LlmProvider = 'anthropic';
  
  private readonly apiVersion: string;
  private readonly apiBaseUrl: string;

  constructor(config: AnthropicClientConfig) {
    super(config);
    this.apiBaseUrl = config.baseUrl || 'https://api.anthropic.com';
    this.apiVersion = config.apiVersion || '2023-06-01';
  }

  protected getDefaultModel(): string {
    return 'claude-3-opus-20240229';
  }

  /**
   * Generate a chat completion using Anthropic API
   */
  async complete(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResponse> {
    const mergedOptions = this.mergeOptions(options);
    
    // Extract system message if present
    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch(`${this.apiBaseUrl}/v1/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.model,
        max_tokens: mergedOptions.maxTokens,
        system: systemMessage?.content,
        messages: chatMessages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
        temperature: mergedOptions.temperature,
        top_p: mergedOptions.topP,
        stop_sequences: mergedOptions.stopSequences,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Anthropic API error: ${response.status} - ${JSON.stringify(error)}`);
    }

    const data = await response.json() as AnthropicChatResponse;
    const textContent = data.content.find(c => c.type === 'text');

    return {
      content: textContent?.text || '',
      finishReason: this.mapFinishReason(data.stop_reason),
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      model: data.model,
    };
  }

  /**
   * Generate embeddings
   * Note: Anthropic doesn't have a native embedding API
   * This throws an error - use OpenAI for embeddings instead
   */
  async embed(_text: string): Promise<EmbeddingResponse> {
    throw new Error('Anthropic does not provide an embedding API. Use OpenAI for embeddings.');
  }

  /**
   * Get request headers
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': this.apiVersion,
    };
  }

  /**
   * Map Anthropic finish reason to our format
   */
  private mapFinishReason(reason: string): CompletionResponse['finishReason'] {
    switch (reason) {
      case 'end_turn':
      case 'stop_sequence':
        return 'stop';
      case 'max_tokens':
        return 'length';
      default:
        return 'error';
    }
  }
}
