/**
 * External service error class
 * Used when an external service (MCP, LLM, database) fails
 */

import { AppError } from './AppError';

export class ExternalServiceError extends AppError {
  public readonly serviceName: string;
  public readonly originalError?: Error;

  /**
   * Creates an ExternalServiceError instance
   * @param serviceName - Name of the external service that failed
   * @param message - Human-readable error message
   * @param originalError - Original error from the external service
   */
  constructor(serviceName: string, message: string, originalError?: Error) {
    super(
      `External service error [${serviceName}]: ${message}`,
      503,
      'EXTERNAL_SERVICE_ERROR',
      true,
      {
        serviceName,
        originalMessage: originalError?.message,
      }
    );
    this.serviceName = serviceName;
    this.originalError = originalError;

    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }

  /**
   * Creates an ExternalServiceError for MCP service
   * @param message - Error message
   * @param originalError - Original error
   */
  static forMcp(message: string, originalError?: Error): ExternalServiceError {
    return new ExternalServiceError('MCP', message, originalError);
  }

  /**
   * Creates an ExternalServiceError for LLM service
   * @param message - Error message
   * @param originalError - Original error
   */
  static forLlm(message: string, originalError?: Error): ExternalServiceError {
    return new ExternalServiceError('LLM', message, originalError);
  }

  /**
   * Creates an ExternalServiceError for database service
   * @param message - Error message
   * @param originalError - Original error
   */
  static forDatabase(message: string, originalError?: Error): ExternalServiceError {
    return new ExternalServiceError('Database', message, originalError);
  }
}
