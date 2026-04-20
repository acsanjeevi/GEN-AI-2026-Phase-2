/**
 * Map Scenario Use Case
 * Maps all steps in a scenario to abstract UI actions
 * 
 * This is a pure application service with NO infrastructure dependencies
 */

import { v4 as uuidv4 } from 'uuid';
import { Scenario } from '../../domain/models/Scenario';
import { Step } from '../../domain/models/Step';
import { MappedStep } from '../../domain/models/MappedStep';
import { Locator } from '../../domain/models/Locator';
import {
  MapSingleStepUseCase,
  MapSingleStepOutput,
  StepMappingContext,
} from './map-single-step.usecase';

/**
 * Input for mapping a scenario
 */
export interface MapScenarioInput {
  /** The scenario to map */
  scenario: Scenario;
  /** Optional shared context */
  context?: StepMappingContext;
  /** Whether to stop on first failure */
  stopOnFailure?: boolean;
  /** Whether to use strict matching only */
  strictMode?: boolean;
}

/**
 * Step mapping result
 */
export interface StepMappingResult {
  /** The original step */
  step: Step;
  /** The mapping output */
  result: MapSingleStepOutput;
  /** Position in the scenario (1-based) */
  position: number;
}

/**
 * Output from mapping a scenario
 */
export interface MapScenarioOutput {
  /** Whether all steps were mapped successfully */
  success: boolean;
  /** Scenario ID */
  scenarioId: string;
  /** Scenario name */
  scenarioName: string;
  /** All mapped steps */
  mappedSteps: MappedStep[];
  /** Steps that failed to map */
  failedSteps: StepMappingResult[];
  /** Steps that need LLM fallback */
  stepsNeedingLlm: StepMappingResult[];
  /** Overall statistics */
  stats: {
    totalSteps: number;
    mappedCount: number;
    failedCount: number;
    needsLlmCount: number;
    averageConfidence: number;
  };
  /** Warnings from mapping */
  warnings: string[];
}

/**
 * Map Scenario Use Case
 * Maps all steps in a Gherkin scenario to UI actions
 */
export class MapScenarioUseCase {
  private readonly mapSingleStepUseCase: MapSingleStepUseCase;
  
  constructor() {
    this.mapSingleStepUseCase = new MapSingleStepUseCase();
  }
  
  /**
   * Execute the scenario mapping
   * @param input - Mapping input
   * @returns Mapping output
   */
  execute(input: MapScenarioInput): MapScenarioOutput {
    const { scenario, context, stopOnFailure = false, strictMode = false } = input;
    
    const mappedSteps: MappedStep[] = [];
    const failedSteps: StepMappingResult[] = [];
    const stepsNeedingLlm: StepMappingResult[] = [];
    const warnings: string[] = [];
    
    // Build context that accumulates across steps
    const mappingContext: StepMappingContext = {
      knownLocators: context?.knownLocators ?? new Map<string, Locator>(),
      pageContext: context?.pageContext,
      previousMappings: context?.previousMappings ?? [],
    };
    
    // Process each step
    const allSteps = this.collectAllSteps(scenario);
    
    for (let i = 0; i < allSteps.length; i++) {
      const step = allSteps[i];
      const position = i + 1;
      
      // Map the step
      const result = this.mapSingleStepUseCase.execute({
        step,
        context: mappingContext,
        strictMode,
      });
      
      // Collect warnings
      if (result.warnings) {
        warnings.push(...result.warnings.map(w => `Step ${position}: ${w}`));
      }
      
      if (result.success && result.mappedStep) {
        mappedSteps.push(result.mappedStep);
        
        // Update context with new locators
        this.updateContext(mappingContext, result.mappedStep);
      } else {
        const stepResult: StepMappingResult = {
          step,
          result,
          position,
        };
        
        failedSteps.push(stepResult);
        
        if (result.needsLlmFallback) {
          stepsNeedingLlm.push(stepResult);
        }
        
        // Check if we should stop
        if (stopOnFailure) {
          warnings.push(`Stopped at step ${position} due to mapping failure.`);
          break;
        }
      }
    }
    
    // Calculate statistics
    const totalSteps = allSteps.length;
    const mappedCount = mappedSteps.length;
    const failedCount = failedSteps.length;
    const needsLlmCount = stepsNeedingLlm.length;
    
    // Calculate average confidence
    let averageConfidence = 0;
    if (mappedSteps.length > 0) {
      const confidenceMap: Record<string, number> = {
        'exact': 1.0,
        'high': 0.85,
        'medium': 0.65,
        'low': 0.4,
        'uncertain': 0.2,
      };
      
      const totalConfidence = mappedSteps.reduce(
        (sum, ms) => sum + (confidenceMap[ms.confidence] || 0.5),
        0
      );
      averageConfidence = totalConfidence / mappedSteps.length;
    }
    
    return {
      success: failedCount === 0,
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      mappedSteps,
      failedSteps,
      stepsNeedingLlm,
      stats: {
        totalSteps,
        mappedCount,
        failedCount,
        needsLlmCount,
        averageConfidence: Math.round(averageConfidence * 100) / 100,
      },
      warnings,
    };
  }
  
  /**
   * Collect all steps from scenario (including background steps)
   */
  private collectAllSteps(scenario: Scenario): Step[] {
    // The scenario model already contains steps
    // Background steps would be prepended by the parser
    return scenario.steps;
  }
  
  /**
   * Update context with information from a mapped step
   */
  private updateContext(context: StepMappingContext, mappedStep: MappedStep): void {
    // Add previous mapping for reference
    context.previousMappings = context.previousMappings || [];
    context.previousMappings.push(mappedStep);
    
    // Extract and store any resolved locators
    for (const action of mappedStep.actions) {
      if (action.locator && action.locator.description) {
        context.knownLocators = context.knownLocators || new Map();
        context.knownLocators.set(action.locator.description, action.locator);
      }
    }
    
    // Update page context if this was a navigation
    if (mappedStep.actions.some(a => a.type === 'navigate')) {
      const navigateAction = mappedStep.actions.find(a => a.type === 'navigate');
      if (navigateAction?.value) {
        context.pageContext = navigateAction.value;
      }
    }
  }
}

/**
 * Factory function to create MapScenarioUseCase
 * Useful for dependency injection
 */
export function createMapScenarioUseCase(): MapScenarioUseCase {
  return new MapScenarioUseCase();
}
