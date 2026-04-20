/**
 * Request logger middleware
 * Logs incoming requests and their responses
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ILogger } from '../../infrastructure/logging';

/**
 * Creates the request logger middleware
 * @param logger - Logger instance
 * @returns Express middleware function
 */
export function requestLogger(logger: ILogger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Generate request ID if not present
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);

    const startTime = Date.now();

    // Create child logger with request context
    const reqLogger = logger.child({
      requestId,
      method: req.method,
      path: req.path,
    });

    // Log incoming request
    reqLogger.info('Incoming request', {
      query: req.query,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    // Capture response finish event
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const level = res.statusCode >= 400 ? 'warn' : 'info';

      reqLogger[level]('Request completed', {
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        contentLength: res.get('content-length'),
      });
    });

    next();
  };
}
