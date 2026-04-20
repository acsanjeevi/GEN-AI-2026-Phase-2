/**
 * OpenAI Client
 * LLM client implementation for OpenAI API
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
 * OpenAI API response types
 */
interface OpenAIChatResponse {
  choices: Array<{
    message: {
      content: string | null;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

interface OpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[];
  }>;
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI-specific configuration
 */
export interface OpenAIClientConfig extends BaseLlmConfig {
  /** Organization ID (optional) */
  organization?: string;
}

/**
 * OpenAI Client
 * Implements LLM client for OpenAI's API
 */
export class OpenAIClient extends BaseLlmClient {
  readonly provider: LlmProvider = 'openai';
  
  private readonly organization?: string;
  private readonly apiBaseUrl: string;

  constructor(config: OpenAIClientConfig) {
    super(config);
    this.organization = config.organization;
    this.apiBaseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  protected getDefaultModel(): string {
    return 'gpt-4';
  }

  /**
   * Generate a chat completion using OpenAI API
   */
  async complete(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResponse> {
    const mergedOptions = this.mergeOptions(options);
    
    const response = await fetch(`${this.apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        max_tokens: mergedOptions.maxTokens,
        temperature: mergedOptions.temperature,
        top_p: mergedOptions.topP,
        stop: mergedOptions.stopSequences,
        response_format: mergedOptions.responseFormat === 'json' 
          ? { type: 'json_object' } 
          : undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(error)}`);
    }

    const data = await response.json() as OpenAIChatResponse;
    const choice = data.choices[0];

    return {
      content: choice.message.content || '',
      finishReason: this.mapFinishReason(choice.finish_reason),
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      model: data.model,
    };
  }

  /**
   * Generate embeddings using OpenAI API
   */
  async embed(text: string): Promise<EmbeddingResponse> {
    const response = await fetch(`${this.apiBaseUrl}/embeddings`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: text,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(error)}`);
    }

    const data = await response.json() as OpenAIEmbeddingResponse;

    return {
      embedding: data.data[0].embedding,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  }

  /**
   * Get request headers
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };

    if (this.organization) {
      headers['OpenAI-Organization'] = this.organization;
    }

    return headers;
  }

  /**
   * Map OpenAI finish reason to our format
   */
  private mapFinishReason(reason: string): CompletionResponse['finishReason'] {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'error';
    }
  }
}
