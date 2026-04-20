/**
 * Validation error class
 * Used when request validation fails
 */

import { AppError } from './AppError';

/**
 * Validation error field details
 */
export interface ValidationErrorField {
  field: string;
  message: string;
  value?: unknown;
}

export class ValidationError extends AppError {
  public readonly fields: ValidationErrorField[];

  /**
   * Creates a ValidationError instance
   * @param message - Human-readable error message
   * @param fields - Array of field-specific validation errors
   */
  constructor(message: string, fields: ValidationErrorField[] = []) {
    super(message, 400, 'VALIDATION_ERROR', true, { fields });
    this.fields = fields;

    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  /**
   * Creates a ValidationError from a single field error
   * @param field - Field name
   * @param message - Error message for the field
   * @param value - Invalid value (optional)
   */
  static fromField(field: string, message: string, value?: unknown): ValidationError {
    return new ValidationError(`Validation failed for field: ${field}`, [
      { field, message, value },
    ]);
  }

  /**
   * Creates a ValidationError from multiple field errors
   * @param fields - Array of field validation errors
   */
  static fromFields(fields: ValidationErrorField[]): ValidationError {
    const fieldNames = fields.map((f) => f.field).join(', ');
    return new ValidationError(`Validation failed for fields: ${fieldNames}`, fields);
  }
}
