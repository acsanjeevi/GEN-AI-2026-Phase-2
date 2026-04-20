/**
 * LLM Client Factory
 * Factory for creating LLM client instances
 */

import { ILlmClient, LlmProvider } from './LlmClient.interface';
import { OpenAIClient } from './providers/OpenAIClient';
import { AzureOpenAIClient } from './providers/AzureOpenAIClient';
import { AnthropicClient } from './providers/AnthropicClient';
import { GroqClient } from './providers/GroqClient';

/**
 * LLM client configuration
 */
export interface LlmClientConfig {
  /** Provider type */
  provider: LlmProvider;
  /** API key */
  apiKey: string;
  /** Model name */
  model?: string;
  /** Base URL (for Azure or custom endpoints) */
  baseUrl?: string;
  /** API version (for Azure) */
  apiVersion?: string;
  /** Deployment name (for Azure) */
  deploymentName?: string;
  /** Default max tokens */
  defaultMaxTokens?: number;
  /** Default temperature */
  defaultTemperature?: number;
}

/**
 * Registry of LLM clients by provider
 */
const clientRegistry = new Map<string, ILlmClient>();

/**
 * LLM Client Factory
 * Creates and manages LLM client instances
 */
export class LlmClientFactory {
  /**
   * Create an LLM client for the specified provider
   */
  static create(config: LlmClientConfig): ILlmClient {
    const key = LlmClientFactory.getRegistryKey(config);
    
    // Check if client already exists
    const existing = clientRegistry.get(key);
    if (existing) {
      return existing;
    }

    // Create new client based on provider
    let client: ILlmClient;
    
    switch (config.provider) {
      case 'openai':
        client = new OpenAIClient(config);
        break;
      case 'azure-openai':
        if (!config.baseUrl || !config.deploymentName) {
          throw new Error('Azure OpenAI requires baseUrl and deploymentName');
        }
        client = new AzureOpenAIClient({
          ...config,
          baseUrl: config.baseUrl,
          deploymentName: config.deploymentName,
        });
        break;
      case 'anthropic':
        client = new AnthropicClient(config);
        break;
      case 'groq':
        client = new GroqClient(config);
        break;
      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }

    // Register and return
    clientRegistry.set(key, client);
    return client;
  }

  /**
   * Get an existing client by provider
   */
  static get(provider: LlmProvider, model?: string): ILlmClient | undefined {
    const key = `${provider}:${model || 'default'}`;
    return clientRegistry.get(key);
  }

  /**
   * Remove a client from the registry
   */
  static remove(provider: LlmProvider, model?: string): boolean {
    const key = `${provider}:${model || 'default'}`;
    return clientRegistry.delete(key);
  }

  /**
   * Clear all registered clients
   */
  static clear(): void {
    clientRegistry.clear();
  }

  /**
   * Get registry key for config
   */
  private static getRegistryKey(config: LlmClientConfig): string {
    return `${config.provider}:${config.model || config.deploymentName || 'default'}`;
  }
}
