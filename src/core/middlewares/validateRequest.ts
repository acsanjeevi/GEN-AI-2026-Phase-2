/**
 * Request validation middleware
 * Validates request body, query, and params using Zod schemas
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../errors/ValidationError';

/**
 * Validation targets for request validation
 */
export type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Validation schema configuration
 */
export interface ValidationConfig {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Helper function to safely extract nested value from object
 */
function getNestedValue(obj: unknown, path: (string | number)[]): unknown {
  let current: unknown = obj;
  for (const key of path) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string | number, unknown>)[key];
  }
  return current;
}

/**
 * Creates a validation middleware for request data
 * @param config - Validation configuration with schemas for body, query, params
 * @returns Express middleware function
 */
export function validateRequest(config: ValidationConfig) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors: { field: string; message: string; value?: unknown }[] = [];

      // Validate body if schema provided
      if (config.body) {
        try {
          req.body = config.body.parse(req.body);
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(
              ...error.errors.map((e) => ({
                field: `body.${e.path.join('.')}`,
                message: e.message,
                value: getNestedValue(req.body, e.path),
              }))
            );
          }
        }
      }

      // Validate query if schema provided
      if (config.query) {
        try {
          req.query = config.query.parse(req.query);
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(
              ...error.errors.map((e) => ({
                field: `query.${e.path.join('.')}`,
                message: e.message,
                value: getNestedValue(req.query, e.path),
              }))
            );
          }
        }
      }

      // Validate params if schema provided
      if (config.params) {
        try {
          req.params = config.params.parse(req.params);
        } catch (error) {
          if (error instanceof ZodError) {
            errors.push(
              ...error.errors.map((e) => ({
                field: `params.${e.path.join('.')}`,
                message: e.message,
                value: getNestedValue(req.params, e.path),
              }))
            );
          }
        }
      }

      // If there were validation errors, throw ValidationError
      if (errors.length > 0) {
        throw ValidationError.fromFields(errors);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Creates a body-only validation middleware
 * @param schema - Zod schema for body validation
 * @returns Express middleware function
 */
export function validateBody(schema: ZodSchema) {
  return validateRequest({ body: schema });
}

/**
 * Creates a query-only validation middleware
 * @param schema - Zod schema for query validation
 * @returns Express middleware function
 */
export function validateQuery(schema: ZodSchema) {
  return validateRequest({ query: schema });
}

/**
 * Creates a params-only validation middleware
 * @param schema - Zod schema for params validation
 * @returns Express middleware function
 */
export function validateParams(schema: ZodSchema) {
  return validateRequest({ params: schema });
}
