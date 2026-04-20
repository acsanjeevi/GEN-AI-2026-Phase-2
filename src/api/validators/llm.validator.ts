/**
 * LLM Validators
 * Request validation schemas for LLM endpoints
 */

import { body, ValidationChain } from 'express-validator';

/**
 * Valid locator strategies
 */
const VALID_LOCATOR_STRATEGIES = [
  'css', 'xpath', 'id', 'name', 'class', 'tag', 
  'text', 'role', 'label', 'placeholder', 'testId', 'title', 'altText'
];

/**
 * Valid UI action types
 */
const VALID_ACTION_TYPES = [
  'navigate', 'click', 'type', 'fill', 'select', 'check', 'uncheck',
  'hover', 'drag', 'scroll', 'wait', 'assert', 'screenshot',
  'press', 'upload', 'download', 'clear', 'focus', 'blur'
];

/**
 * Valid step keywords
 */
const VALID_KEYWORDS = ['Given', 'When', 'Then', 'And', 'But', '*'];

/**
 * Validator for suggest-locator endpoint
 */
export const suggestLocatorValidator: ValidationChain[] = [
  body('elementDescription')
    .notEmpty()
    .withMessage('elementDescription is required')
    .isString()
    .withMessage('elementDescription must be a string')
    .isLength({ min: 2, max: 500 })
    .withMessage('elementDescription must be between 2 and 500 characters'),

  body('domSnapshot')
    .notEmpty()
    .withMessage('domSnapshot is required')
    .isString()
    .withMessage('domSnapshot must be a string'),

  body('pageUrl')
    .optional()
    .isString()
    .withMessage('pageUrl must be a string'),

  body('pageTitle')
    .optional()
    .isString()
    .withMessage('pageTitle must be a string'),

  body('preferredStrategies')
    .optional()
    .isArray()
    .withMessage('preferredStrategies must be an array'),

  body('preferredStrategies.*')
    .optional()
    .isIn(VALID_LOCATOR_STRATEGIES)
    .withMessage(`preferredStrategies must be one of: ${VALID_LOCATOR_STRATEGIES.join(', ')}`),

  body('additionalContext')
    .optional()
    .isString()
    .withMessage('additionalContext must be a string'),

  body('maxSuggestions')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('maxSuggestions must be an integer between 1 and 10'),
];

/**
 * Validator for generate-step-code endpoint
 */
export const generateStepCodeValidator: ValidationChain[] = [
  body('keyword')
    .notEmpty()
    .withMessage('keyword is required')
    .isIn(VALID_KEYWORDS)
    .withMessage(`keyword must be one of: ${VALID_KEYWORDS.join(', ')}`),

  body('stepText')
    .notEmpty()
    .withMessage('stepText is required')
    .isString()
    .withMessage('stepText must be a string'),

  body('actionType')
    .notEmpty()
    .withMessage('actionType is required')
    .isIn(VALID_ACTION_TYPES)
    .withMessage(`actionType must be one of: ${VALID_ACTION_TYPES.join(', ')}`),

  body('locator')
    .optional()
    .isObject()
    .withMessage('locator must be an object'),

  body('locator.strategy')
    .optional()
    .isIn(VALID_LOCATOR_STRATEGIES)
    .withMessage(`locator.strategy must be one of: ${VALID_LOCATOR_STRATEGIES.join(', ')}`),

  body('locator.value')
    .optional()
    .isString()
    .withMessage('locator.value must be a string'),

  body('actionValue')
    .optional()
    .isString()
    .withMessage('actionValue must be a string'),

  body('actionOptions')
    .optional()
    .isObject()
    .withMessage('actionOptions must be an object'),

  body('includeComments')
    .optional()
    .isBoolean()
    .withMessage('includeComments must be a boolean'),

  body('codeStyle')
    .optional()
    .isIn(['async-await', 'promise-chain'])
    .withMessage('codeStyle must be either async-await or promise-chain'),
];

/**
 * Validator for generate-full-spec endpoint
 */
export const generateFullSpecValidator: ValidationChain[] = [
  body('featureName')
    .notEmpty()
    .withMessage('featureName is required')
    .isString()
    .withMessage('featureName must be a string'),

  body('featureDescription')
    .optional()
    .isString()
    .withMessage('featureDescription must be a string'),

  body('scenarios')
    .notEmpty()
    .withMessage('scenarios is required')
    .isArray({ min: 1 })
    .withMessage('scenarios must be a non-empty array'),

  body('scenarios.*.name')
    .notEmpty()
    .withMessage('Each scenario must have a name')
    .isString()
    .withMessage('scenario name must be a string'),

  body('scenarios.*.tags')
    .optional()
    .isArray()
    .withMessage('scenario tags must be an array'),

  body('scenarios.*.steps')
    .notEmpty()
    .withMessage('Each scenario must have steps')
    .isArray({ min: 1 })
    .withMessage('steps must be a non-empty array'),

  body('scenarios.*.steps.*.keyword')
    .notEmpty()
    .withMessage('Each step must have a keyword')
    .isIn(VALID_KEYWORDS)
    .withMessage(`step keyword must be one of: ${VALID_KEYWORDS.join(', ')}`),

  body('scenarios.*.steps.*.text')
    .notEmpty()
    .withMessage('Each step must have text')
    .isString()
    .withMessage('step text must be a string'),

  body('baseUrl')
    .optional()
    .isURL()
    .withMessage('baseUrl must be a valid URL'),

  body('useFixtures')
    .optional()
    .isBoolean()
    .withMessage('useFixtures must be a boolean'),

  body('testTimeout')
    .optional()
    .isInt({ min: 1000, max: 300000 })
    .withMessage('testTimeout must be an integer between 1000 and 300000'),

  body('screenshotOnFailure')
    .optional()
    .isBoolean()
    .withMessage('screenshotOnFailure must be a boolean'),

  body('format')
    .optional()
    .isIn(['playwright-test', 'playwright-bdd'])
    .withMessage('format must be either playwright-test or playwright-bdd'),
];

/**
 * Validator for heal-step endpoint
 */
export const healStepValidator: ValidationChain[] = [
  body('stepText')
    .notEmpty()
    .withMessage('stepText is required')
    .isString()
    .withMessage('stepText must be a string'),

  body('originalLocator')
    .notEmpty()
    .withMessage('originalLocator is required')
    .isObject()
    .withMessage('originalLocator must be an object'),

  body('originalLocator.strategy')
    .notEmpty()
    .withMessage('originalLocator.strategy is required')
    .isIn(VALID_LOCATOR_STRATEGIES)
    .withMessage(`originalLocator.strategy must be one of: ${VALID_LOCATOR_STRATEGIES.join(', ')}`),

  body('originalLocator.value')
    .notEmpty()
    .withMessage('originalLocator.value is required')
    .isString()
    .withMessage('originalLocator.value must be a string'),

  body('errorMessage')
    .notEmpty()
    .withMessage('errorMessage is required')
    .isString()
    .withMessage('errorMessage must be a string'),

  body('currentDomSnapshot')
    .notEmpty()
    .withMessage('currentDomSnapshot is required')
    .isString()
    .withMessage('currentDomSnapshot must be a string'),

  body('previousDomSnapshot')
    .optional()
    .isString()
    .withMessage('previousDomSnapshot must be a string'),

  body('pageUrl')
    .optional()
    .isString()
    .withMessage('pageUrl must be a string'),

  body('elementDescription')
    .optional()
    .isString()
    .withMessage('elementDescription must be a string'),

  body('healingAttempt')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('healingAttempt must be an integer between 0 and 10'),

  body('maxSuggestions')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('maxSuggestions must be an integer between 1 and 10'),
];
