/**
 * Authentication middleware
 * Handles API key and token-based authentication
 */

import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../errors/UnauthorizedError';

/**
 * Authentication configuration
 */
export interface AuthConfig {
  apiKeyHeader?: string;
  apiKey?: string;
  enabled?: boolean;
}

/**
 * Creates an authentication middleware
 * @param config - Authentication configuration
 * @returns Express middleware function
 */
export function auth(config: AuthConfig = {}) {
  const {
    apiKeyHeader = 'x-api-key',
    apiKey,
    enabled = true,
  } = config;

  return (req: Request, _res: Response, next: NextFunction): void => {
    // Skip authentication if disabled
    if (!enabled) {
      next();
      return;
    }

    // Check for API key if configured
    if (apiKey) {
      const providedKey = req.headers[apiKeyHeader.toLowerCase()];

      if (!providedKey) {
        throw UnauthorizedError.missingToken();
      }

      if (providedKey !== apiKey) {
        throw UnauthorizedError.invalidToken();
      }
    }

    next();
  };
}

/**
 * Optional authentication middleware
 * Does not throw if authentication fails, just marks request as unauthenticated
 */
export function optionalAuth(config: AuthConfig = {}) {
  const {
    apiKeyHeader = 'x-api-key',
    apiKey,
  } = config;

  return (req: Request, _res: Response, next: NextFunction): void => {
    // Check for API key if configured
    if (apiKey) {
      const providedKey = req.headers[apiKeyHeader.toLowerCase()];

      // Mark request as authenticated or not
      (req as Request & { isAuthenticated: boolean }).isAuthenticated =
        providedKey === apiKey;
    }

    next();
  };
}
