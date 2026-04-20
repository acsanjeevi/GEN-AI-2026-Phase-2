/**
 * LLM Routes
 * API routes for LLM-related endpoints
 */

import { Router } from 'express';

import {
  suggestLocatorHandler,
  generateStepCodeHandler,
  generateFullSpecHandler,
  healStepHandler,
  getLlmStatusHandler,
} from '../controllers/llm.controller';

import {
  suggestLocatorValidator,
  generateStepCodeValidator,
  generateFullSpecValidator,
  healStepValidator,
} from '../validators/llm.validator';

const router = Router();

/**
 * @route   GET /api/llm/status
 * @desc    Get LLM service status and configuration
 * @access  Public
 */
router.get('/status', getLlmStatusHandler);

/**
 * @route   POST /api/llm/suggest-locator
 * @desc    Suggest element locators using LLM analysis of DOM snapshot
 * @access  Public
 * @body    {
 *            elementDescription: string,    // Human-readable element description
 *            domSnapshot: string,           // DOM snapshot or accessibility tree
 *            pageUrl?: string,              // Optional page URL for context
 *            pageTitle?: string,            // Optional page title for context
 *            preferredStrategies?: string[], // Preferred locator strategies
 *            additionalContext?: string,    // Additional context
 *            maxSuggestions?: number        // Maximum suggestions (1-10)
 *          }
 */
router.post('/suggest-locator', suggestLocatorValidator, suggestLocatorHandler);

/**
 * @route   POST /api/llm/generate-step-code
 * @desc    Generate Playwright code for a single step
 * @access  Public
 * @body    {
 *            keyword: string,               // Step keyword (Given, When, Then, And, But)
 *            stepText: string,              // Step text
 *            actionType: string,            // UI action type
 *            locator?: object,              // Element locator { strategy, value }
 *            actionValue?: string,          // Value for the action
 *            actionOptions?: object,        // Additional action options
 *            includeComments?: boolean,     // Include comments in generated code
 *            codeStyle?: string             // Code style ('async-await' | 'promise-chain')
 *          }
 */
router.post('/generate-step-code', generateStepCodeValidator, generateStepCodeHandler);

/**
 * @route   POST /api/llm/generate-full-spec
 * @desc    Generate a complete Playwright test spec from feature scenarios
 * @access  Public
 * @body    {
 *            featureName: string,           // Feature name
 *            featureDescription?: string,   // Feature description
 *            scenarios: array,              // Scenarios with steps
 *            baseUrl?: string,              // Base URL for tests
 *            useFixtures?: boolean,         // Use test fixtures
 *            testTimeout?: number,          // Test timeout in ms
 *            screenshotOnFailure?: boolean, // Screenshot on failure
 *            format?: string                // Output format ('playwright-test' | 'playwright-bdd')
 *          }
 */
router.post('/generate-full-spec', generateFullSpecValidator, generateFullSpecHandler);

/**
 * @route   POST /api/llm/heal-step
 * @desc    Heal a broken step by analyzing DOM changes
 * @access  Public
 * @body    {
 *            stepText: string,              // Original step text
 *            originalLocator: object,       // Original locator { strategy, value }
 *            errorMessage: string,          // Error message from failure
 *            currentDomSnapshot: string,    // Current DOM snapshot
 *            previousDomSnapshot?: string,  // Previous DOM snapshot
 *            pageUrl?: string,              // Page URL
 *            elementDescription?: string,   // Element description
 *            healingAttempt?: number,       // Number of previous attempts
 *            maxSuggestions?: number        // Maximum suggestions (1-10)
 *          }
 */
router.post('/heal-step', healStepValidator, healStepHandler);

export default router;
