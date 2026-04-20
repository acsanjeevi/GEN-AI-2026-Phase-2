/**
 * Mapping Routes
 * Route definitions for step mapping endpoints
 */

import { Router } from 'express';
import { mapStep, mapScenario, checkStep } from '../controllers/mapping.controller';
import { validateRequest } from '../../core/middlewares/validateRequest';
import { mapStepSchema, mapScenarioSchema, checkStepSchema } from '../validators/mapping.validator';

const router = Router();

/**
 * POST /mapping/map-step
 * Map a single Gherkin step to UI actions
 * 
 * Request body:
 * - stepText: string (required) - The step text
 * - keyword: StepKeyword (optional) - Gherkin keyword
 * - line: number (optional) - Line number
 * - dataTable: DataTable (optional) - Data table argument
 * - docString: DocString (optional) - Doc string argument
 * - pageContext: string (optional) - Current page context
 * - strictMode: boolean (optional) - Use strict matching only
 * 
 * Response:
 * - success: boolean
 * - data: { id, originalText, actions, confidence, ... }
 * - error: string (if failed)
 * - needsLlmFallback: boolean
 */
router.post('/map-step', validateRequest(mapStepSchema), mapStep);

/**
 * POST /mapping/map-scenario
 * Map all steps in a scenario to UI actions
 * 
 * Request body:
 * - scenarioId: string (optional) - Scenario ID
 * - scenarioName: string (required) - Scenario name
 * - steps: StepInput[] (required) - Array of steps
 * - tags: string[] (optional) - Scenario tags
 * - pageContext: string (optional) - Page context
 * - stopOnFailure: boolean (optional) - Stop on first failure
 * - strictMode: boolean (optional) - Use strict matching only
 * 
 * Response:
 * - success: boolean
 * - data: { scenarioId, scenarioName, steps, stats }
 * - warnings: string[]
 */
router.post('/map-scenario', validateRequest(mapScenarioSchema), mapScenario);

/**
 * POST /mapping/check-step
 * Check if a step can be mapped without performing actual mapping
 * 
 * Request body:
 * - stepText: string (required) - Step text to check
 * - keyword: StepKeyword (optional) - Gherkin keyword
 * - includePatternAnalysis: boolean (optional) - Include detailed analysis
 * 
 * Response:
 * - canMap: boolean
 * - actionType: string
 * - confidence: number (0-100)
 * - needsLlmFallback: boolean
 * - suggestions: string[]
 * - characteristics: { isAssertion, isNavigation, ... }
 */
router.post('/check-step', validateRequest(checkStepSchema), checkStep);

export default router;
