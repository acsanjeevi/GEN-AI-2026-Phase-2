/**
 * Not found error class
 * Used when a requested resource does not exist
 */

import { AppError } from './AppError';

export class NotFoundError extends AppError {
  public readonly resourceType: string;
  public readonly resourceId?: string;

  /**
   * Creates a NotFoundError instance
   * @param resourceType - Type of resource that was not found
   * @param resourceId - Identifier of the resource (optional)
   */
  constructor(resourceType: string, resourceId?: string) {
    const message = resourceId
      ? `${resourceType} with id '${resourceId}' not found`
      : `${resourceType} not found`;

    super(message, 404, 'NOT_FOUND', true, { resourceType, resourceId });
    this.resourceType = resourceType;
    this.resourceId = resourceId;

    Object.setPrototypeOf(this, NotFoundError.prototype);
  }

  /**
   * Creates a NotFoundError for a specific resource type
   * @param resourceType - Type of resource
   */
  static forResource(resourceType: string): NotFoundError {
    return new NotFoundError(resourceType);
  }

  /**
   * Creates a NotFoundError for a specific resource with ID
   * @param resourceType - Type of resource
   * @param resourceId - Resource identifier
   */
  static forResourceWithId(resourceType: string, resourceId: string): NotFoundError {
    return new NotFoundError(resourceType, resourceId);
  }
}
