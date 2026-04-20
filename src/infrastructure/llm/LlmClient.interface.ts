/**
 * LLM Client Interface
 * Defines the contract for LLM providers
 */

/**
 * Message role in conversation
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * Chat message structure
 */
export interface ChatMessage {
  /** Role of the message sender */
  role: MessageRole;
  /** Content of the message */
  content: string;
}

/**
 * LLM completion options
 */
export interface CompletionOptions {
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature for randomness (0-1) */
  temperature?: number;
  /** Top-p sampling */
  topP?: number;
  /** Stop sequences */
  stopSequences?: string[];
  /** Response format */
  responseFormat?: 'text' | 'json';
}

/**
 * LLM completion response
 */
export interface CompletionResponse {
  /** Generated content */
  content: string;
  /** Finish reason */
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';
  /** Token usage */
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Model used */
  model: string;
}

/**
 * LLM embedding response
 */
export interface EmbeddingResponse {
  /** Embedding vector */
  embedding: number[];
  /** Token usage */
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

/**
 * LLM Provider type
 */
export type LlmProvider = 'openai' | 'azure-openai' | 'anthropic' | 'groq';

/**
 * LLM Client Interface
 * Contract for all LLM provider implementations
 */
export interface ILlmClient {
  /** Provider name */
  readonly provider: LlmProvider;

  /** Model name/identifier */
  readonly model: string;

  /**
   * Generate a chat completion
   */
  complete(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResponse>;

  /**
   * Generate embeddings for text
   */
  embed(text: string): Promise<EmbeddingResponse>;

  /**
   * Check if the client is properly configured
   */
  isConfigured(): boolean;
}
