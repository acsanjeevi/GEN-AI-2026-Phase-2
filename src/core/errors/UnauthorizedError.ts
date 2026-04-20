/**
 * Unauthorized error class
 * Used when authentication or authorization fails
 */

import { AppError } from './AppError';

export class UnauthorizedError extends AppError {
  public readonly reason: string;

  /**
   * Creates an UnauthorizedError instance
   * @param message - Human-readable error message
   * @param reason - Specific reason for unauthorized access
   */
  constructor(message: string = 'Unauthorized access', reason: string = 'INVALID_CREDENTIALS') {
    super(message, 401, 'UNAUTHORIZED', true, { reason });
    this.reason = reason;

    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }

  /**
   * Creates an UnauthorizedError for missing token
   */
  static missingToken(): UnauthorizedError {
    return new UnauthorizedError('Authentication token is required', 'MISSING_TOKEN');
  }

  /**
   * Creates an UnauthorizedError for invalid token
   */
  static invalidToken(): UnauthorizedError {
    return new UnauthorizedError('Invalid authentication token', 'INVALID_TOKEN');
  }

  /**
   * Creates an UnauthorizedError for expired token
   */
  static expiredToken(): UnauthorizedError {
    return new UnauthorizedError('Authentication token has expired', 'EXPIRED_TOKEN');
  }

  /**
   * Creates an UnauthorizedError for insufficient permissions
   */
  static insufficientPermissions(): UnauthorizedError {
    return new UnauthorizedError(
      'Insufficient permissions to access this resource',
      'INSUFFICIENT_PERMISSIONS'
    );
  }
}
