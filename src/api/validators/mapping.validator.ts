/**
 * Mapping Validators
 * Zod schemas for validating mapping API requests
 */

import { z } from 'zod';
import { ValidationConfig } from '../../core/middlewares/validateRequest';

/**
 * Valid Gherkin keywords
 */
const stepKeywordSchema = z.enum(['Given', 'When', 'Then', 'And', 'But', '*']);

/**
 * Data table row schema
 */
const dataTableSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
});

/**
 * Doc string schema
 */
const docStringSchema = z.object({
  contentType: z.string().optional(),
  content: z.string(),
});

// ============================================================================
// Map Step Validators
// ============================================================================

/**
 * Body schema for map-step request
 */
export const mapStepBodySchema = z.object({
  /** Step text - required */
  stepText: z
    .string({
      required_error: 'Step text is required',
      invalid_type_error: 'Step text must be a string',
    })
    .min(1, 'Step text cannot be empty')
    .max(500, 'Step text is too long (max 500 characters)'),
  
  /** Keyword - optional */
  keyword: stepKeywordSchema.optional(),
  
  /** Line number - optional */
  line: z.number().int().positive().optional(),
  
  /** Data table - optional */
  dataTable: dataTableSchema.optional(),
  
  /** Doc string - optional */
  docString: docStringSchema.optional(),
  
  /** Page context - optional */
  pageContext: z.string().max(200).optional(),
  
  /** Strict mode - optional, defaults to false */
  strictMode: z.boolean().optional().default(false),
});

/**
 * Validation config for map-step endpoint
 */
export const mapStepSchema: ValidationConfig = {
  body: mapStepBodySchema,
};

// ============================================================================
// Map Scenario Validators
// ============================================================================

/**
 * Step input schema for scenario mapping
 */
const stepInputSchema = z.object({
  text: z
    .string()
    .min(1, 'Step text cannot be empty')
    .max(500, 'Step text is too long'),
  keyword: stepKeywordSchema,
  line: z.number().int().positive().optional(),
  dataTable: dataTableSchema.optional(),
  docString: docStringSchema.optional(),
});

/**
 * Body schema for map-scenario request
 */
export const mapScenarioBodySchema = z.object({
  /** Scenario ID - optional */
  scenarioId: z.string().uuid().optional(),
  
  /** Scenario name - required */
  scenarioName: z
    .string({
      required_error: 'Scenario name is required',
    })
    .min(1, 'Scenario name cannot be empty')
    .max(200, 'Scenario name is too long'),
  
  /** Steps - required, at least one */
  steps: z
    .array(stepInputSchema)
    .min(1, 'At least one step is required')
    .max(100, 'Too many steps (max 100)'),
  
  /** Tags - optional */
  tags: z.array(z.string()).max(20).optional(),
  
  /** Page context - optional */
  pageContext: z.string().max(200).optional(),
  
  /** Stop on failure - optional */
  stopOnFailure: z.boolean().optional().default(false),
  
  /** Strict mode - optional */
  strictMode: z.boolean().optional().default(false),
});

/**
 * Validation config for map-scenario endpoint
 */
export const mapScenarioSchema: ValidationConfig = {
  body: mapScenarioBodySchema,
};

// ============================================================================
// Check Step Validators
// ============================================================================

/**
 * Body schema for check-step request
 */
export const checkStepBodySchema = z.object({
  /** Step text - required */
  stepText: z
    .string({
      required_error: 'Step text is required',
    })
    .min(1, 'Step text cannot be empty')
    .max(500, 'Step text is too long'),
  
  /** Keyword - optional */
  keyword: stepKeywordSchema.optional(),
  
  /** Include pattern analysis - optional */
  includePatternAnalysis: z.boolean().optional().default(false),
});

/**
 * Validation config for check-step endpoint
 */
export const checkStepSchema: ValidationConfig = {
  body: checkStepBodySchema,
};

// ============================================================================
// Type exports
// ============================================================================

export type MapStepRequestBody = z.infer<typeof mapStepBodySchema>;
export type MapScenarioRequestBody = z.infer<typeof mapScenarioBodySchema>;
export type CheckStepRequestBody = z.infer<typeof checkStepBodySchema>;
