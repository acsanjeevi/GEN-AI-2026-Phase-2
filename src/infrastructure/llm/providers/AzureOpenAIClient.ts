/**
 * Azure OpenAI Client
 * LLM client implementation for Azure OpenAI Service
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
 * Azure OpenAI API response types
 */
interface AzureOpenAIChatResponse {
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

interface AzureOpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[];
  }>;
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Azure OpenAI-specific configuration
 */
export interface AzureOpenAIClientConfig extends BaseLlmConfig {
  /** Azure resource endpoint */
  baseUrl: string;
  /** API version */
  apiVersion?: string;
  /** Deployment name */
  deploymentName: string;
  /** Embedding deployment name (optional) */
  embeddingDeploymentName?: string;
}

/**
 * Azure OpenAI Client
 * Implements LLM client for Azure OpenAI Service
 */
export class AzureOpenAIClient extends BaseLlmClient {
  readonly provider: LlmProvider = 'azure-openai';
  
  private readonly apiVersion: string;
  private readonly deploymentName: string;
  private readonly embeddingDeploymentName?: string;
  private readonly endpoint: string;

  constructor(config: AzureOpenAIClientConfig) {
    super(config);
    this.endpoint = config.baseUrl;
    this.apiVersion = config.apiVersion || '2024-02-15-preview';
    this.deploymentName = config.deploymentName;
    this.embeddingDeploymentName = config.embeddingDeploymentName;
  }

  protected getDefaultModel(): string {
    return 'gpt-4';
  }

  /**
   * Generate a chat completion using Azure OpenAI API
   */
  async complete(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResponse> {
    const mergedOptions = this.mergeOptions(options);
    const url = `${this.endpoint}/openai/deployments/${this.deploymentName}/chat/completions?api-version=${this.apiVersion}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
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
      throw new Error(`Azure OpenAI API error: ${response.status} - ${JSON.stringify(error)}`);
    }

    const data = await response.json() as AzureOpenAIChatResponse;
    const choice = data.choices[0];

    return {
      content: choice.message.content || '',
      finishReason: this.mapFinishReason(choice.finish_reason),
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      model: data.model || this.deploymentName,
    };
  }

  /**
   * Generate embeddings using Azure OpenAI API
   */
  async embed(text: string): Promise<EmbeddingResponse> {
    const deploymentName = this.embeddingDeploymentName || this.deploymentName;
    const url = `${this.endpoint}/openai/deployments/${deploymentName}/embeddings?api-version=${this.apiVersion}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        input: text,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Azure OpenAI API error: ${response.status} - ${JSON.stringify(error)}`);
    }

    const data = await response.json() as AzureOpenAIEmbeddingResponse;

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
    return {
      'Content-Type': 'application/json',
      'api-key': this.apiKey,
    };
  }

  /**
   * Map Azure finish reason to our format
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
