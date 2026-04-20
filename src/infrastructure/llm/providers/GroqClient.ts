/**
 * Groq Client
 * LLM client implementation for Groq API
 * Groq provides fast inference for open-source models like Llama, Mixtral, etc.
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
 * Groq API response types (OpenAI-compatible)
 */
interface GroqChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    queue_time?: number;
    prompt_time?: number;
    completion_time?: number;
    total_time?: number;
  };
}

/**
 * Groq-specific configuration
 */
export interface GroqClientConfig extends BaseLlmConfig {
  /** Custom base URL (optional, defaults to Groq API) */
  baseUrl?: string;
}

/**
 * Available Groq models
 */
export type GroqModel =
  | 'llama-3.3-70b-versatile'
  | 'llama-3.1-70b-versatile'
  | 'llama-3.1-8b-instant'
  | 'llama3-groq-70b-8192-tool-use-preview'
  | 'llama3-groq-8b-8192-tool-use-preview'
  | 'mixtral-8x7b-32768'
  | 'gemma2-9b-it'
  | 'gemma-7b-it';

/**
 * Groq Client
 * Implements LLM client for Groq's ultra-fast inference API
 * 
 * @example
 * ```typescript
 * const client = new GroqClient({
 *   apiKey: process.env.GROQ_API_KEY,
 *   model: 'llama-3.3-70b-versatile',
 * });
 * 
 * const response = await client.complete([
 *   { role: 'user', content: 'Hello!' }
 * ]);
 * ```
 */
export class GroqClient extends BaseLlmClient {
  readonly provider: LlmProvider = 'groq';
  
  private readonly apiBaseUrl: string;

  constructor(config: GroqClientConfig) {
    super(config);
    this.apiBaseUrl = config.baseUrl || 'https://api.groq.com/openai/v1';
  }

  protected getDefaultModel(): string {
    return 'llama-3.3-70b-versatile';
  }

  /**
   * Generate a chat completion using Groq API
   * Groq uses OpenAI-compatible API format
   */
  async complete(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResponse> {
    const mergedOptions = this.mergeOptions(options);
    
    const requestBody: Record<string, unknown> = {
      model: this.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: mergedOptions.maxTokens,
      temperature: mergedOptions.temperature,
      top_p: mergedOptions.topP,
      stop: mergedOptions.stopSequences,
    };

    // Groq supports JSON mode for compatible models
    if (mergedOptions.responseFormat === 'json') {
      requestBody.response_format = { type: 'json_object' };
    }

    const response = await fetch(`${this.apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Groq API error: ${response.status} - ${JSON.stringify(error)}`);
    }

    const data = await response.json() as GroqChatResponse;
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
   * Generate embeddings
   * Note: Groq does not currently support embeddings API
   * This method throws an error to indicate the limitation
   */
  async embed(_text: string): Promise<EmbeddingResponse> {
    throw new Error(
      'Groq does not support embeddings API. ' +
      'Please use OpenAI or another provider for embeddings.'
    );
  }

  /**
   * Get request headers for Groq API
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }

  /**
   * Map Groq finish reason to our standard format
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

  /**
   * Get available Groq models
   * Utility method to list supported models
   */
  static getAvailableModels(): GroqModel[] {
    return [
      'llama-3.3-70b-versatile',
      'llama-3.1-70b-versatile',
      'llama-3.1-8b-instant',
      'llama3-groq-70b-8192-tool-use-preview',
      'llama3-groq-8b-8192-tool-use-preview',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
      'gemma-7b-it',
    ];
  }
}
