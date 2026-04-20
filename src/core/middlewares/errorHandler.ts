/**
 * Global error handler middleware
 * Handles all errors and returns consistent API responses
 */

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ILogger } from '../../infrastructure/logging';
import { AppError } from '../errors/AppError';
import { ApiResponse } from '../types';

/**
 * Creates the error handler middleware
 * @param logger - Logger instance for error logging
 * @returns Express error handler middleware
 */
export function errorHandler(logger: ILogger): ErrorRequestHandler {
  return (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
  ): void => {
    // Determine if this is an operational error
    const isOperational = err instanceof AppError && err.isOperational;

    // Log the error
    if (isOperational) {
      logger.warn('Operational error occurred', {
        code: (err as AppError).code,
        message: err.message,
        path: req.path,
        method: req.method,
      });
    } else {
      logger.error('Unexpected error occurred', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
      });
    }

    // Build error response
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const code = err instanceof AppError ? err.code : 'INTERNAL_ERROR';
    const message = isOperational ? err.message : 'An unexpected error occurred';

    const response: ApiResponse = {
      success: false,
      error: {
        code,
        message,
        details: err instanceof AppError ? err.details : undefined,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string | undefined,
      },
    };

    res.status(statusCode).json(response);
  };
}
