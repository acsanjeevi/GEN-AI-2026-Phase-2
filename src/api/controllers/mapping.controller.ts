/**
 * Mapping Controller
 * Thin controller for step mapping endpoints
 * Contains NO business logic - only input validation and use case invocation
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { MapSingleStepUseCase } from '../../application/mapping/map-single-step.usecase';
import { MapScenarioUseCase } from '../../application/mapping/map-scenario.usecase';
import { CheckStepUseCase } from '../../application/mapping/check-step.usecase';
import { Step, StepKeyword, createStep } from '../../domain/models/Step';
import { Scenario, ScenarioTag, createScenario } from '../../domain/models/Scenario';
import {
  MapStepRequestBody,
  MapScenarioRequestBody,
  CheckStepRequestBody,
} from '../validators/mapping.validator';
import {
  MapStepResponse,
  MapScenarioResponse,
  CheckStepResponse,
  MappedStepSummary,
} from '../dto/mapping.dto';

// Instantiate use cases
const mapSingleStepUseCase = new MapSingleStepUseCase();
const mapScenarioUseCase = new MapScenarioUseCase();
const checkStepUseCase = new CheckStepUseCase();

/**
 * POST /mapping/map-step
 * Map a single Gherkin step to UI actions
 */
export async function mapStep(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as MapStepRequestBody;
    
    // Build Step domain object
    const step: Step = createStep({
      id: uuidv4(),
      keyword: (body.keyword || 'Given') as StepKeyword,
      text: body.stepText,
      line: body.line || 1,
      dataTable: body.dataTable,
      docString: body.docString,
    });
    
    // Execute use case
    const result = mapSingleStepUseCase.execute({
      step,
      context: body.pageContext ? { pageContext: body.pageContext } : undefined,
      strictMode: body.strictMode,
    });
    
    // Build response
    const response: MapStepResponse = {
      success: result.success,
      warnings: result.warnings,
      needsLlmFallback: result.needsLlmFallback,
    };
    
    if (result.success && result.mappedStep) {
      response.data = {
        id: result.mappedStep.id,
        originalText: result.mappedStep.originalStep.text,
        actions: result.mappedStep.actions,
        confidence: result.mappedStep.confidence,
        matchedPattern: result.mappedStep.matchedPattern,
        extractedParams: result.mappedStep.extractedParams,
        needsReview: result.mappedStep.needsReview,
      };
    } else {
      response.error = result.error;
    }
    
    res.status(result.success ? 200 : 422).json({
      success: response.success,
      data: response.data,
      error: response.error ? { message: response.error } : undefined,
      warnings: response.warnings,
      needsLlmFallback: response.needsLlmFallback,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /mapping/map-scenario
 * Map all steps in a scenario to UI actions
 */
export async function mapScenario(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as MapScenarioRequestBody;
    
    // Build Step domain objects
    const steps: Step[] = body.steps.map((stepInput, index) => 
      createStep({
        id: uuidv4(),
        keyword: stepInput.keyword as StepKeyword,
        text: stepInput.text,
        line: stepInput.line || (index + 1),
        dataTable: stepInput.dataTable,
        docString: stepInput.docString,
      })
    );
    
    // Convert tags to ScenarioTag format
    const tags: ScenarioTag[] = (body.tags || []).map((tag, index) => ({
      name: tag,
      line: index + 1,
    }));
    
    // Build Scenario domain object
    const scenario: Scenario = createScenario({
      id: body.scenarioId || uuidv4(),
      featureId: 'temp-feature', // Not needed for mapping
      name: body.scenarioName,
      description: undefined,
      steps,
      tags,
      examples: [],
      line: 1,
    });
    
    // Execute use case
    const result = mapScenarioUseCase.execute({
      scenario,
      context: body.pageContext ? { pageContext: body.pageContext } : undefined,
      stopOnFailure: body.stopOnFailure,
      strictMode: body.strictMode,
    });
    
    // Build step summaries
    const stepSummaries: MappedStepSummary[] = [];
    
    // Add successful mappings
    result.mappedSteps.forEach((mappedStep, index) => {
      stepSummaries.push({
        position: index + 1,
        originalText: mappedStep.originalStep.text,
        keyword: mappedStep.originalStep.keyword,
        success: true,
        actions: mappedStep.actions,
        confidence: mappedStep.confidence,
      });
    });
    
    // Add failed mappings
    result.failedSteps.forEach((failedStep) => {
      stepSummaries.push({
        position: failedStep.position,
        originalText: failedStep.step.text,
        keyword: failedStep.step.keyword,
        success: false,
        error: failedStep.result.error,
        needsLlmFallback: failedStep.result.needsLlmFallback,
      });
    });
    
    // Sort by position
    stepSummaries.sort((a, b) => a.position - b.position);
    
    // Build response
    const response: MapScenarioResponse = {
      success: result.success,
      data: {
        scenarioId: result.scenarioId,
        scenarioName: result.scenarioName,
        steps: stepSummaries,
        stats: result.stats,
      },
      warnings: result.warnings.length > 0 ? result.warnings : undefined,
    };
    
    res.status(result.success ? 200 : 207).json({
      success: response.success,
      data: response.data,
      warnings: response.warnings,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /mapping/check-step
 * Check if a step can be mapped without performing actual mapping
 */
export async function checkStep(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as CheckStepRequestBody;
    
    // Execute use case
    const result = checkStepUseCase.execute({
      stepText: body.stepText,
      keyword: body.keyword as StepKeyword | undefined,
      includePatternAnalysis: body.includePatternAnalysis,
    });
    
    // Build response
    const response: CheckStepResponse = {
      canMap: result.canMap,
      actionType: result.actionType,
      confidence: Math.round(result.confidence * 100), // Convert to percentage
      needsLlmFallback: result.needsLlmFallback,
      reason: result.reason,
      suggestions: result.suggestions,
      extractedValues: result.extractedValues,
      characteristics: result.characteristics,
      patternAnalysis: result.patternAnalysis,
    };
    
    res.status(200).json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}
