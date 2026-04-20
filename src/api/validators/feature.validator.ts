/**
 * Feature Validators
 * Zod schemas for validating feature-related requests
 */

import { z } from 'zod';
import { ValidationConfig } from '../../core/middlewares/validateRequest';

/**
 * Body schema for parsing feature request
 */
export const parseFeatureBodySchema = z.object({
  /** Gherkin feature content - required, non-empty string */
  content: z
    .string({
      required_error: 'Feature content is required',
      invalid_type_error: 'Feature content must be a string',
    })
    .min(1, 'Feature content cannot be empty')
    .refine(
      (val) => val.includes('Feature:'),
      'Content must contain a Feature: declaration'
    ),
  /** Optional file path for reference */
  filePath: z
    .string()
    .optional(),
  /** Whether to save the parsed feature */
  save: z
    .boolean()
    .optional()
    .default(false),
});

/**
 * Validation config for parse feature endpoint
 */
export const parseFeatureSchema: ValidationConfig = {
  body: parseFeatureBodySchema,
};

/**
 * Body schema for validating feature syntax request
 */
export const validateFeatureSyntaxBodySchema = z.object({
  /** Gherkin feature content - required */
  content: z
    .string({
      required_error: 'Feature content is required',
      invalid_type_error: 'Feature content must be a string',
    })
    .min(1, 'Feature content cannot be empty'),
});

/**
 * Validation config for validate syntax endpoint
 */
export const validateFeatureSyntaxSchema: ValidationConfig = {
  body: validateFeatureSyntaxBodySchema,
};

/**
 * Type inference for parse feature request body
 */
export type ParseFeatureRequestBody = z.infer<typeof parseFeatureBodySchema>;

/**
 * Type inference for validate syntax request body
 */
export type ValidateFeatureSyntaxRequestBody = z.infer<typeof validateFeatureSyntaxBodySchema>;
