/**
 * Default configuration settings
 * These values are used as fallbacks when environment-specific config is not available
 */

export const defaultConfig = {
  server: {
    port: 3000,
    host: 'localhost',
  },
  logging: {
    level: 'info',
    format: 'json',
  },
  mcp: {
    playwright: {
      enabled: true,
      timeout: 30000,
    },
  },
  execution: {
    /** Delay in milliseconds between steps (default: 1000ms) */
    stepDelayMs: 1000,
  },
  llm: {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4',
    baseUrl: '',
    apiVersion: '',
    deploymentName: '',
    maxTokens: 2048,
    temperature: 0.7,
    maxRetries: 3,
    timeout: 60000,
  },
  database: {
    uri: 'mongodb://localhost:27017/no-code-automation',
  },
};

export type DefaultConfig = typeof defaultConfig;
