/**
 * Retry Utility with Exponential Backoff
 * Provides retry logic for failed operations with configurable backoff strategies
 */

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts?: number;
  
  /** Initial delay in milliseconds */
  initialDelayMs?: number;
  
  /** Maximum delay in milliseconds */
  maxDelayMs?: number;
  
  /** Multiplier for exponential backoff */
  backoffMultiplier?: number;
  
  /** Whether to add jitter to delays */
  jitter?: boolean;
  
  /** Function to determine if error is retryable */
  shouldRetry?: (error: Error, attempt: number) => boolean;
  
  /** Callback on each retry attempt */
  onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  jitter: true,
  shouldRetry: (error) => {
    // Retry on network errors, timeouts, and 5xx errors
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('timeout') ||
        message.includes('econnrefused') ||
        message.includes('enotfound') ||
        message.includes('429') || // Rate limit
        message.includes('503') || // Service unavailable
        message.includes('500')    // Internal server error
      );
    }
    return false;
  },
  onRetry: () => {},
};

/**
 * Calculate delay for retry attempt with exponential backoff
 */
function calculateDelay(config: Required<RetryConfig>, attempt: number): number {
  let delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  
  // Cap at max delay
  delay = Math.min(delay, config.maxDelayMs);
  
  // Add jitter if enabled
  if (config.jitter) {
    delay = delay * (0.5 + Math.random() * 0.5); // 50% - 150% of calculated delay
  }
  
  return Math.round(delay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param fn - Async function to retry
 * @param config - Retry configuration
 * @returns Result of function execution
 * @throws Last error if all retries exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const finalConfig: Required<RetryConfig> = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (attempt === finalConfig.maxAttempts || !finalConfig.shouldRetry(lastError, attempt)) {
        throw lastError;
      }

      // Calculate delay
      const delayMs = calculateDelay(finalConfig, attempt);

      // Call onRetry callback
      finalConfig.onRetry(attempt, lastError, delayMs);

      // Wait before retrying
      await sleep(delayMs);
    }
  }

  // Should never reach here, but just in case
  throw lastError || new Error('Retry failed unexpectedly');
}

/**
 * Retry configuration presets
 */
export const RetryPresets = {
  /**
   * Aggressive retry: 5 attempts, quick backoff
   */
  aggressive: {
    maxAttempts: 5,
    initialDelayMs: 50,
    maxDelayMs: 5000,
    backoffMultiplier: 1.5,
  },

  /**
   * Default retry: 3 attempts, standard backoff
   */
  default: {
    maxAttempts: 3,
    initialDelayMs: 100,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
  },

  /**
   * Conservative retry: 2 attempts, slow backoff
   */
  conservative: {
    maxAttempts: 2,
    initialDelayMs: 200,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
  },

  /**
   * LLM-specific: 3 attempts with rate limit awareness
   */
  llm: {
    maxAttempts: 3,
    initialDelayMs: 500,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    shouldRetry: (error: Error) => {
      const message = error.message.toLowerCase();
      return (
        message.includes('rate_limit') ||
        message.includes('429') ||
        message.includes('timeout') ||
        message.includes('overloaded')
      );
    },
  },

  /**
   * Network-specific: handles transient network failures
   */
  network: {
    maxAttempts: 4,
    initialDelayMs: 100,
    maxDelayMs: 15000,
    backoffMultiplier: 2,
    shouldRetry: (error: Error) => {
      const message = error.message.toLowerCase();
      return (
        message.includes('econnrefused') ||
        message.includes('enotfound') ||
        message.includes('etimedout') ||
        message.includes('timeout') ||
        message.includes('socket hang up')
      );
    },
  },
};
