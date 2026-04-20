/**
 * Rate Limiting Middleware
 * Implements token bucket algorithm for rate limiting by IP and endpoint
 */

import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../../infrastructure/logging';

// Create logger instance
const logger = createLogger({ level: 'info', format: 'json' });

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Requests per window (default: 100) */
  requestsPerWindow?: number;
  
  /** Time window in milliseconds (default: 60000 - 1 minute) */
  windowMs?: number;
  
  /** Skip rate limiting for certain paths */
  skip?: (req: Request) => boolean;
  
  /** Custom key generator (default: IP address) */
  keyGenerator?: (req: Request) => string;
  
  /** Handler when limit exceeded */
  handler?: (req: Request, res: Response) => void;
}

/**
 * Token bucket for rate limiting
 */
interface TokenBucket {
  tokens: number;
  lastRefillTime: number;
}

/**
 * In-memory store for token buckets
 * In production, this should be replaced with Redis
 */
class TokenBucketStore {
  private buckets = new Map<string, TokenBucket>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Clean up old buckets every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Get or create token bucket for key
   */
  getBucket(key: string, capacity: number): TokenBucket {
    if (!this.buckets.has(key)) {
      this.buckets.set(key, {
        tokens: capacity,
        lastRefillTime: Date.now(),
      });
    }
    return this.buckets.get(key)!;
  }

  /**
   * Try to consume tokens
   */
  consumeTokens(
    key: string,
    tokensNeeded: number,
    capacity: number,
    refillRatePerMs: number
  ): boolean {
    const bucket = this.getBucket(key, capacity);
    const now = Date.now();
    const timePassed = now - bucket.lastRefillTime;

    // Refill tokens based on time passed
    const tokensToAdd = timePassed * refillRatePerMs;
    bucket.tokens = Math.min(capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefillTime = now;

    // Try to consume tokens
    if (bucket.tokens >= tokensNeeded) {
      bucket.tokens -= tokensNeeded;
      return true;
    }

    return false;
  }

  /**
   * Clean up old buckets
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefillTime > maxAge) {
        this.buckets.delete(key);
      }
    }

    logger.debug(`Rate limiter cleanup: ${this.buckets.size} buckets remaining`);
  }

  /**
   * Destroy the cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

/**
 * Global token bucket store
 */
const globalStore = new TokenBucketStore();

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<RateLimitConfig> = {
  requestsPerWindow: 100,
  windowMs: 60000, // 1 minute
  skip: () => false,
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
      retryAfter: Math.ceil(res.getHeader('Retry-After') as any || 60),
    });
  },
};

/**
 * Rate limiter middleware factory
 */
export function createRateLimiter(customConfig: RateLimitConfig = {}): (req: Request, res: Response, next: NextFunction) => void {
  const config: Required<RateLimitConfig> = {
    ...DEFAULT_CONFIG,
    ...customConfig,
  };

  // Calculate tokens per millisecond
  const refillRatePerMs = config.requestsPerWindow / config.windowMs;
  const tokensPerRequest = 1;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip certain requests
    if (config.skip(req)) {
      return next();
    }

    // Generate key for rate limiting
    const key = config.keyGenerator(req);

    // Check if limit exceeded
    const allowed = globalStore.consumeTokens(
      key,
      tokensPerRequest,
      config.requestsPerWindow,
      refillRatePerMs
    );

    if (!allowed) {
      // Set retry-after header
      res.set('Retry-After', Math.ceil(config.windowMs / 1000).toString());
      res.set('X-RateLimit-Limit', config.requestsPerWindow.toString());
      res.set('X-RateLimit-Remaining', '0');

      logger.warn(`Rate limit exceeded for ${key}`, { key });
      return config.handler(req, res);
    }

    // Add rate limit headers
    res.set('X-RateLimit-Limit', config.requestsPerWindow.toString());
    
    next();
  };
}

/**
 * Rate limiter presets for common scenarios
 */
export const RateLimiterPresets = {
  /**
   * Strict: 50 requests per minute
   */
  strict: {
    requestsPerWindow: 50,
    windowMs: 60000,
  },

  /**
   * Standard: 100 requests per minute
   */
  standard: {
    requestsPerWindow: 100,
    windowMs: 60000,
  },

  /**
   * Relaxed: 200 requests per minute
   */
  relaxed: {
    requestsPerWindow: 200,
    windowMs: 60000,
  },

  /**
   * API: 1000 requests per hour
   */
  api: {
    requestsPerWindow: 1000,
    windowMs: 3600000,
  },

  /**
   * Execution: 10 concurrent executions (per 5 seconds)
   */
  execution: {
    requestsPerWindow: 10,
    windowMs: 5000,
  },
};

/**
 * Destroy global store (for cleanup)
 */
export function destroyRateLimiterStore(): void {
  globalStore.destroy();
}
