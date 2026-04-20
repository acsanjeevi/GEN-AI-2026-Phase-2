/**
 * Feature Routes
 * Route definitions for feature parsing endpoints
 */

import { Router } from 'express';
import { parseFeature, validateSyntax } from '../controllers/feature.controller';
import { validateRequest } from '../../core/middlewares/validateRequest';
import { parseFeatureSchema, validateFeatureSyntaxSchema } from '../validators/feature.validator';

const router = Router();

/**
 * POST /feature/parse
 * Parse a Gherkin feature file
 * 
 * Request body:
 * - content: string (required) - Gherkin feature content
 * - filePath: string (optional) - File path for reference
 * - save: boolean (optional) - Whether to save the parsed feature
 * 
 * Response:
 * - success: boolean
 * - data: { feature, stats } on success
 * - errors: ParseError[] on failure
 */
router.post('/parse', validateRequest(parseFeatureSchema), parseFeature);

/**
 * POST /feature/validate-syntax
 * Validate Gherkin syntax without full parsing
 * 
 * Request body:
 * - content: string (required) - Gherkin feature content
 * 
 * Response:
 * - valid: boolean
 * - errors: ParseError[]
 * - warnings: string[]
 * - scenarioNames: string[]
 */
router.post('/validate-syntax', validateRequest(validateFeatureSyntaxSchema), validateSyntax);

export default router;
