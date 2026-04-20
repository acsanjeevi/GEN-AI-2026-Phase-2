/**
 * Base LLM Client
 * Abstract base class for LLM providers
 */

import {
  ILlmClient,
  LlmProvider,
  ChatMessage,
  CompletionOptions,
  CompletionResponse,
  EmbeddingResponse,
} from '../LlmClient.interface';

/**
 * Base configuration for LLM clients
 */
export interface BaseLlmConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  defaultMaxTokens?: number;
  defaultTemperature?: number;
}

/**
 * Abstract Base LLM Client
 * Provides common functionality for all LLM providers
 */
export abstract class BaseLlmClient implements ILlmClient {
  abstract readonly provider: LlmProvider;
  readonly model: string;

  protected readonly apiKey: string;
  protected readonly baseUrl?: string;
  protected readonly defaultMaxTokens: number;
  protected readonly defaultTemperature: number;

  constructor(config: BaseLlmConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || this.getDefaultModel();
    this.baseUrl = config.baseUrl;
    this.defaultMaxTokens = config.defaultMaxTokens || 2048;
    this.defaultTemperature = config.defaultTemperature || 0.7;
  }

  /**
   * Get the default model for this provider
   */
  protected abstract getDefaultModel(): string;

  /**
   * Generate a chat completion
   */
  abstract complete(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResponse>;

  /**
   * Generate embeddings for text
   */
  abstract embed(text: string): Promise<EmbeddingResponse>;

  /**
   * Check if the client is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }

  /**
   * Merge options with defaults
   */
  protected mergeOptions(options?: CompletionOptions): Required<Omit<CompletionOptions, 'stopSequences' | 'responseFormat'>> & Pick<CompletionOptions, 'stopSequences' | 'responseFormat'> {
    return {
      maxTokens: options?.maxTokens || this.defaultMaxTokens,
      temperature: options?.temperature ?? this.defaultTemperature,
      topP: options?.topP ?? 1,
      stopSequences: options?.stopSequences,
      responseFormat: options?.responseFormat,
    };
  }
}
