/**
 * Feature Controller
 * Handles HTTP requests for feature parsing operations
 * 
 * Controllers are THIN - only input handling and calling use cases
 */

import { Request, Response, NextFunction } from 'express';
import { 
  createParseFeatureUseCase, 
  createValidateFeatureSyntaxUseCase 
} from '../../application/feature';
import { 
  createSuccessResponse, 
  createErrorResponse 
} from '../dto/feature.dto';
import { InMemoryFeatureRepository } from '../../infrastructure/persistence/memory/InMemoryFeatureRepository';

// Create repository instance (in production, this would be injected via DI)
const featureRepository = new InMemoryFeatureRepository();

/**
 * Parse a Gherkin feature file
 * POST /feature/parse
 */
export async function parseFeature(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { content, filePath, save } = req.body;

    // Create and execute use case
    const useCase = createParseFeatureUseCase(featureRepository);
    const result = await useCase.execute({
      content,
      filePath,
      save: save ?? false,
    });

    if (!result.success) {
      res.status(400).json(
        createErrorResponse('Failed to parse feature', result.errors)
      );
      return;
    }

    res.status(200).json(
      createSuccessResponse({
        feature: result.feature,
        stats: result.stats,
      })
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Validate Gherkin feature syntax
 * POST /feature/validate-syntax
 */
export async function validateSyntax(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { content } = req.body;

    // Create and execute use case
    const useCase = createValidateFeatureSyntaxUseCase();
    const result = await useCase.execute({ content });

    res.status(200).json(
      createSuccessResponse({
        valid: result.valid,
        errors: result.errors,
        warnings: result.warnings,
        scenarioNames: result.scenarioNames,
      })
    );
  } catch (error) {
    next(error);
  }
}
