/**
 * MCP Validators
 * Zod schemas for validating MCP execution requests
 */

import { z } from 'zod';
import { ValidationConfig } from '../../core/middlewares/validateRequest';

// ============================================================================
// Common Schemas
// ============================================================================

const sessionIdSchema = z.string().uuid('Invalid session ID format');

const uiActionTypeSchema = z.enum([
  'navigate', 'click', 'type', 'fill', 'select', 'check', 'uncheck',
  'hover', 'drag', 'scroll', 'wait', 'assert', 'screenshot', 'press',
  'upload', 'download', 'clear', 'focus', 'blur'
]);

const browserTypeSchema = z.enum(['chromium', 'firefox', 'webkit']);

const waitUntilSchema = z.enum(['load', 'domcontentloaded', 'networkidle']);

// ============================================================================
// Session Validators
// ============================================================================

const createSessionBodySchema = z.object({
  name: z.string().max(255).optional(),
  featureId: z.string().uuid().optional(),
  scenarioId: z.string().uuid().optional(),
  config: z.object({
    defaultTimeout: z.number().min(0).max(300000).optional(),
    screenshotOnFailure: z.boolean().optional(),
    screenshotOnSuccess: z.boolean().optional(),
    headless: z.boolean().optional(),
    browserType: browserTypeSchema.optional(),
  }).optional(),
});

const sessionIdParamsSchema = z.object({
  sessionId: sessionIdSchema,
});

export const createSessionValidator: ValidationConfig = {
  body: createSessionBodySchema,
};

export const getSessionValidator: ValidationConfig = {
  params: sessionIdParamsSchema,
};

export const deleteSessionValidator: ValidationConfig = {
  params: sessionIdParamsSchema,
};

// ============================================================================
// Navigation Validators
// ============================================================================

const navigateBodySchema = z.object({
  sessionId: sessionIdSchema,
  url: z.string().url('Invalid URL format'),
  waitUntil: waitUntilSchema.optional(),
  timeout: z.number().min(0).max(300000).optional(),
  captureSnapshot: z.boolean().optional().default(true),
});

const historyNavigateBodySchema = z.object({
  sessionId: sessionIdSchema,
  direction: z.enum(['back', 'forward']),
  captureSnapshot: z.boolean().optional().default(true),
});

export const navigateValidator: ValidationConfig = {
  body: navigateBodySchema,
};

export const historyNavigateValidator: ValidationConfig = {
  body: historyNavigateBodySchema,
};

// ============================================================================
// Snapshot Validators
// ============================================================================

const captureSnapshotBodySchema = z.object({
  sessionId: sessionIdSchema,
  includeHidden: z.boolean().optional().default(false),
  captureScreenshot: z.boolean().optional().default(false),
  screenshotOptions: z.object({
    filename: z.string().optional(),
    fullPage: z.boolean().optional(),
  }).optional(),
});

const searchSnapshotBodySchema = z.object({
  sessionId: sessionIdSchema,
  query: z.string().min(1, 'Search query is required').max(500),
  role: z.string().optional(),
  minConfidence: z.number().min(0).max(1).optional().default(0.3),
  maxResults: z.number().min(1).max(100).optional().default(10),
});

const getCachedSnapshotParamsSchema = z.object({
  sessionId: sessionIdSchema,
});

export const captureSnapshotValidator: ValidationConfig = {
  body: captureSnapshotBodySchema,
};

export const searchSnapshotValidator: ValidationConfig = {
  body: searchSnapshotBodySchema,
};

export const getCachedSnapshotValidator: ValidationConfig = {
  params: getCachedSnapshotParamsSchema,
};

// ============================================================================
// Action Execution Validators
// ============================================================================

const uiActionSchema = z.object({
  type: uiActionTypeSchema,
  value: z.string().optional(),
  target: z.string().optional(),
  ref: z.string().optional(),
  description: z.string().optional(),
  timeout: z.number().min(0).max(300000).optional(),
  options: z.record(z.unknown()).optional(),
});

const executeActionBodySchema = z.object({
  sessionId: sessionIdSchema,
  action: uiActionSchema,
  mappedStepId: z.string().uuid().optional(),
  refreshSnapshot: z.boolean().optional().default(true),
});

const executeActionsBodySchema = z.object({
  sessionId: sessionIdSchema,
  actions: z.array(uiActionSchema).min(1, 'At least one action is required').max(100),
  stopOnFailure: z.boolean().optional().default(true),
});

export const executeActionValidator: ValidationConfig = {
  body: executeActionBodySchema,
};

export const executeActionsValidator: ValidationConfig = {
  body: executeActionsBodySchema,
};

// ============================================================================
// Execution History Validators
// ============================================================================

const getExecutionHistoryQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(1000).optional().default(100),
  status: z.enum(['pending', 'executing', 'success', 'failed', 'skipped']).optional(),
});

export const getExecutionHistoryValidator: ValidationConfig = {
  params: sessionIdParamsSchema,
  query: getExecutionHistoryQuerySchema,
};

// ============================================================================
// Type Exports
// ============================================================================

export type CreateSessionBody = z.infer<typeof createSessionBodySchema>;
export type NavigateBody = z.infer<typeof navigateBodySchema>;
export type HistoryNavigateBody = z.infer<typeof historyNavigateBodySchema>;
export type CaptureSnapshotBody = z.infer<typeof captureSnapshotBodySchema>;
export type SearchSnapshotBody = z.infer<typeof searchSnapshotBodySchema>;
export type ExecuteActionBody = z.infer<typeof executeActionBodySchema>;
export type ExecuteActionsBody = z.infer<typeof executeActionsBodySchema>;
export type UIActionInput = z.infer<typeof uiActionSchema>;
