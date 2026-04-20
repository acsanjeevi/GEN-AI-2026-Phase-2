/**
 * Execution Validators
 * Request validation schemas for test execution endpoints
 */

import { body, param, query, ValidationChain } from 'express-validator';

/**
 * Valid test plan statuses
 */
const VALID_STATUSES = ['draft', 'ready', 'running', 'completed', 'failed', 'cancelled'];

/**
 * Valid execution modes
 */
const VALID_EXECUTION_MODES = ['sequential', 'parallel'];

/**
 * Valid browser types
 */
const VALID_BROWSER_TYPES = ['chromium', 'firefox', 'webkit'];

/**
 * Valid artifact types
 */
const VALID_ARTIFACT_TYPES = ['screenshot', 'video', 'trace', 'log', 'report'];

/**
 * Valid locator types
 */
const VALID_LOCATOR_TYPES = ['css', 'xpath', 'text', 'role', 'testId', 'label', 'placeholder', 'ref'];

/**
 * Valid sort fields for list executions
 */
const VALID_SORT_FIELDS = ['createdAt', 'startedAt', 'completedAt', 'name'];

/**
 * Validator for create execution endpoint
 */
export const createExecutionValidator: ValidationChain[] = [
  // Script ID for tracking generated spec files
  body('scriptId')
    .optional()
    .isString()
    .withMessage('scriptId must be a string')
    .isLength({ min: 1, max: 100 })
    .withMessage('scriptId must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('scriptId must contain only alphanumeric characters, hyphens, and underscores'),

  // Accept either 'feature' or 'featureContent'
  body('feature')
    .optional()
    .isString()
    .withMessage('feature must be a string'),

  body('featureContent')
    .optional()
    .isString()
    .withMessage('featureContent must be a string'),

  // Custom validator to ensure at least one is provided
  body()
    .custom((_, { req }) => {
      if (!req.body.feature && !req.body.featureContent) {
        throw new Error('Either feature or featureContent is required');
      }
      return true;
    }),

  body('isFeatureContent')
    .optional()
    .isBoolean()
    .withMessage('isFeatureContent must be a boolean'),

  body('name')
    .optional()
    .isString()
    .withMessage('name must be a string')
    .isLength({ max: 200 })
    .withMessage('name must be at most 200 characters'),

  body('description')
    .optional()
    .isString()
    .withMessage('description must be a string')
    .isLength({ max: 1000 })
    .withMessage('description must be at most 1000 characters'),

  body('baseUrl')
    .notEmpty()
    .withMessage('baseUrl is required')
    .isURL({ require_protocol: true })
    .withMessage('baseUrl must be a valid URL with protocol'),

  body('executionMode')
    .optional()
    .isIn(VALID_EXECUTION_MODES)
    .withMessage(`executionMode must be one of: ${VALID_EXECUTION_MODES.join(', ')}`),

  body('browserConfig')
    .optional()
    .isObject()
    .withMessage('browserConfig must be an object'),

  body('browserConfig.browser')
    .optional()
    .isIn(VALID_BROWSER_TYPES)
    .withMessage(`browser must be one of: ${VALID_BROWSER_TYPES.join(', ')}`),

  body('browserConfig.headless')
    .optional()
    .isBoolean()
    .withMessage('headless must be a boolean'),

  body('browserConfig.viewportWidth')
    .optional()
    .isInt({ min: 320, max: 3840 })
    .withMessage('viewportWidth must be an integer between 320 and 3840'),

  body('browserConfig.viewportHeight')
    .optional()
    .isInt({ min: 240, max: 2160 })
    .withMessage('viewportHeight must be an integer between 240 and 2160'),

  body('browserConfig.defaultTimeout')
    .optional()
    .isInt({ min: 1000, max: 300000 })
    .withMessage('defaultTimeout must be an integer between 1000 and 300000 ms'),

  body('browserConfig.recordVideo')
    .optional()
    .isBoolean()
    .withMessage('recordVideo must be a boolean'),

  body('browserConfig.screenshotOnFailure')
    .optional()
    .isBoolean()
    .withMessage('screenshotOnFailure must be a boolean'),

  body('browserConfig.traceEnabled')
    .optional()
    .isBoolean()
    .withMessage('traceEnabled must be a boolean'),

  // Support 'browser' as alias for 'browserConfig'
  body('browser')
    .optional()
    .isObject()
    .withMessage('browser must be an object'),

  body('browser.type')
    .optional()
    .isIn(VALID_BROWSER_TYPES)
    .withMessage(`browser.type must be one of: ${VALID_BROWSER_TYPES.join(', ')}`),

  body('browser.headless')
    .optional()
    .isBoolean()
    .withMessage('browser.headless must be a boolean'),

  // Support 'options' object
  body('options')
    .optional()
    .isObject()
    .withMessage('options must be an object'),

  body('options.maxRetries')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('options.maxRetries must be an integer between 0 and 10'),

  body('options.timeout')
    .optional()
    .isInt({ min: 1000, max: 300000 })
    .withMessage('options.timeout must be an integer between 1000 and 300000 ms'),

  body('options.screenshotOnFailure')
    .optional()
    .isBoolean()
    .withMessage('options.screenshotOnFailure must be a boolean'),

  body('options.recordVideo')
    .optional()
    .isBoolean()
    .withMessage('options.recordVideo must be a boolean'),

  body('options.traceEnabled')
    .optional()
    .isBoolean()
    .withMessage('options.traceEnabled must be a boolean'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('tags must be an array'),

  body('tags.*')
    .optional()
    .isString()
    .withMessage('each tag must be a string'),

  body('maxRetries')
    .optional()
    .isInt({ min: 0, max: 5 })
    .withMessage('maxRetries must be an integer between 0 and 5'),

  body('autoStart')
    .optional()
    .isBoolean()
    .withMessage('autoStart must be a boolean'),

  body('createdBy')
    .optional()
    .isString()
    .withMessage('createdBy must be a string')
    .isLength({ max: 100 })
    .withMessage('createdBy must be at most 100 characters'),
];

/**
 * Validator for start execution endpoint
 */
export const startExecutionValidator: ValidationChain[] = [
  param('id')
    .notEmpty()
    .withMessage('testPlanId is required')
    .isString()
    .withMessage('testPlanId must be a string'),
];

/**
 * Validator for get execution status endpoint
 */
export const getExecutionStatusValidator: ValidationChain[] = [
  param('id')
    .notEmpty()
    .withMessage('testPlanId is required')
    .isString()
    .withMessage('testPlanId must be a string'),
];

/**
 * Validator for cancel execution endpoint
 */
export const cancelExecutionValidator: ValidationChain[] = [
  param('id')
    .notEmpty()
    .withMessage('testPlanId is required')
    .isString()
    .withMessage('testPlanId must be a string'),

  body('reason')
    .optional()
    .isString()
    .withMessage('reason must be a string')
    .isLength({ max: 500 })
    .withMessage('reason must be at most 500 characters'),
];

/**
 * Validator for retry step endpoint
 */
export const retryStepValidator: ValidationChain[] = [
  param('id')
    .notEmpty()
    .withMessage('testPlanId is required')
    .isString()
    .withMessage('testPlanId must be a string'),

  param('itemId')
    .notEmpty()
    .withMessage('itemId is required')
    .isString()
    .withMessage('itemId must be a string'),

  body('alternativeLocator')
    .optional()
    .isObject()
    .withMessage('alternativeLocator must be an object'),

  body('alternativeLocator.type')
    .optional()
    .isIn(VALID_LOCATOR_TYPES)
    .withMessage(`alternativeLocator.type must be one of: ${VALID_LOCATOR_TYPES.join(', ')}`),

  body('alternativeLocator.value')
    .optional()
    .isString()
    .withMessage('alternativeLocator.value must be a string'),

  body('useHealing')
    .optional()
    .isBoolean()
    .withMessage('useHealing must be a boolean'),
];

/**
 * Validator for list executions endpoint
 */
export const listExecutionsValidator: ValidationChain[] = [
  query('status')
    .optional()
    .custom((value) => {
      // Accept single status or comma-separated list
      const statuses = Array.isArray(value) ? value : value.split(',');
      return statuses.every((s: string) => VALID_STATUSES.includes(s.trim()));
    })
    .withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),

  query('featureId')
    .optional()
    .isString()
    .withMessage('featureId must be a string'),

  query('createdBy')
    .optional()
    .isString()
    .withMessage('createdBy must be a string'),

  query('fromDate')
    .optional()
    .isISO8601()
    .withMessage('fromDate must be a valid ISO8601 date'),

  query('toDate')
    .optional()
    .isISO8601()
    .withMessage('toDate must be a valid ISO8601 date'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100'),

  query('sortBy')
    .optional()
    .isIn(VALID_SORT_FIELDS)
    .withMessage(`sortBy must be one of: ${VALID_SORT_FIELDS.join(', ')}`),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('sortOrder must be "asc" or "desc"'),
];

/**
 * Validator for get artifacts endpoint
 */
export const getArtifactsValidator: ValidationChain[] = [
  param('id')
    .notEmpty()
    .withMessage('testPlanId is required')
    .isString()
    .withMessage('testPlanId must be a string'),

  query('type')
    .optional()
    .isIn(VALID_ARTIFACT_TYPES)
    .withMessage(`type must be one of: ${VALID_ARTIFACT_TYPES.join(', ')}`),

  query('itemId')
    .optional()
    .isString()
    .withMessage('itemId must be a string'),
];

/**
 * Validator for download artifact endpoint
 */
export const downloadArtifactValidator: ValidationChain[] = [
  param('id')
    .notEmpty()
    .withMessage('testPlanId is required')
    .isString()
    .withMessage('testPlanId must be a string'),

  param('artifactId')
    .notEmpty()
    .withMessage('artifactId is required')
    .isString()
    .withMessage('artifactId must be a string'),
];

/**
 * Validator for get single execution endpoint
 */
export const getExecutionValidator: ValidationChain[] = [
  param('id')
    .notEmpty()
    .withMessage('testPlanId is required')
    .isString()
    .withMessage('testPlanId must be a string'),
];

/**
 * Validator for delete execution endpoint
 */
export const deleteExecutionValidator: ValidationChain[] = [
  param('id')
    .notEmpty()
    .withMessage('testPlanId is required')
    .isString()
    .withMessage('testPlanId must be a string'),
];

/**
 * Validator for end-to-end flow endpoint (Phase 9)
 */
export const endToEndFlowValidator: ValidationChain[] = [
  body('featureContent')
    .notEmpty()
    .withMessage('featureContent is required')
    .isString()
    .withMessage('featureContent must be a string'),

  body('baseUrl')
    .notEmpty()
    .withMessage('baseUrl is required')
    .isURL()
    .withMessage('baseUrl must be a valid URL'),

  body('browserConfig')
    .optional()
    .isObject()
    .withMessage('browserConfig must be an object'),

  body('browserConfig.browser')
    .optional()
    .isIn(['chromium', 'firefox', 'webkit'])
    .withMessage('browserConfig.browser must be chromium, firefox, or webkit'),

  body('browserConfig.headless')
    .optional()
    .isBoolean()
    .withMessage('browserConfig.headless must be a boolean'),

  body('browserConfig.viewportWidth')
    .optional()
    .isInt({ min: 320, max: 3840 })
    .withMessage('browserConfig.viewportWidth must be between 320 and 3840'),

  body('browserConfig.viewportHeight')
    .optional()
    .isInt({ min: 240, max: 2160 })
    .withMessage('browserConfig.viewportHeight must be between 240 and 2160'),

  body('maxHealingAttempts')
    .optional()
    .isInt({ min: 0, max: 5 })
    .withMessage('maxHealingAttempts must be between 0 and 5'),

  body('enableHealing')
    .optional()
    .isBoolean()
    .withMessage('enableHealing must be a boolean'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('tags must be an array'),

  body('tags.*')
    .optional()
    .isString()
    .withMessage('each tag must be a string'),

  body('timeout')
    .optional()
    .isInt({ min: 1000, max: 300000 })
    .withMessage('timeout must be between 1000 and 300000 ms'),
];
