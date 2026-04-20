/**
 * Map Single Step Use Case
 * Maps a single Gherkin step to abstract UI actions
 * 
 * This is a pure application service with NO infrastructure dependencies
 */

import { v4 as uuidv4 } from 'uuid';
import { Step } from '../../domain/models/Step';
import {
  MappedStep,
  UIAction,
  MappingConfidence,
  createMappedStep,
} from '../../domain/models/MappedStep';
import { createLocator, Locator, LocatorStrategy } from '../../domain/models/Locator';
import {
  matchStepPattern,
  normalizeStepText,
  PatternMatchResult,
} from '../../utils/mapping/pattern-matcher';

/**
 * Input for mapping a single step
 */
export interface MapSingleStepInput {
  /** The step to map */
  step: Step;
  /** Optional context from previous steps (for element resolution) */
  context?: StepMappingContext;
  /** Whether to use strict matching only (no heuristics) */
  strictMode?: boolean;
}

/**
 * Context for step mapping
 */
export interface StepMappingContext {
  /** Known locators from previous mappings */
  knownLocators?: Map<string, Locator>;
  /** Current page context (e.g., 'login-page', 'dashboard') */
  pageContext?: string;
  /** Previously mapped steps (for reference) */
  previousMappings?: MappedStep[];
}

/**
 * Output from mapping a single step
 */
export interface MapSingleStepOutput {
  /** Whether mapping was successful */
  success: boolean;
  /** The mapped step (if successful) */
  mappedStep?: MappedStep;
  /** Error message (if failed) */
  error?: string;
  /** Warnings or suggestions */
  warnings?: string[];
  /** Whether LLM fallback is recommended */
  needsLlmFallback?: boolean;
}

/**
 * Map Single Step Use Case
 * Pure function to map a Gherkin step to UI actions
 */
export class MapSingleStepUseCase {
  /**
   * Execute the mapping
   * @param input - Mapping input
   * @returns Mapping output
   */
  execute(input: MapSingleStepInput): MapSingleStepOutput {
    const { step, context, strictMode = false } = input;
    const warnings: string[] = [];
    
    // Normalize the step text (remove Gherkin keywords if present)
    const normalizedText = normalizeStepText(step.text);
    
    // Match against patterns
    const matchResult = matchStepPattern(normalizedText);
    
    // Check if we got a match
    if (!matchResult.matched) {
      if (strictMode) {
        return {
          success: false,
          error: `No pattern matched for step: "${step.text}"`,
          needsLlmFallback: true,
        };
      }
      
      // In non-strict mode, recommend LLM fallback
      return {
        success: false,
        error: `Could not map step: "${step.text}". Consider using LLM for complex steps.`,
        warnings: ['No pattern matched. LLM fallback recommended.'],
        needsLlmFallback: true,
      };
    }
    
    // Check confidence level
    if (matchResult.confidence < 0.6) {
      warnings.push(`Low confidence mapping (${(matchResult.confidence * 100).toFixed(0)}%). Review recommended.`);
    }
    
    // Build UI actions from the match result
    const actions = this.buildActions(matchResult, step, context);
    
    if (actions.length === 0) {
      return {
        success: false,
        error: `Pattern matched but could not build actions for step: "${step.text}"`,
        warnings,
        needsLlmFallback: true,
      };
    }
    
    // Determine confidence level
    const confidence = this.determineConfidence(matchResult);
    
    // Check if we have unresolved locators
    const unresolvedLocators = actions.filter(
      a => a.locator && a.locator.strategy === 'text' && !a.locator.value
    );
    
    if (unresolvedLocators.length > 0) {
      warnings.push('Some element locators need to be resolved at runtime.');
    }
    
    // Build the mapped step
    const mappedStep = createMappedStep({
      id: uuidv4(),
      originalStep: step,
      actions,
      confidence,
      isLlmMapped: false,
      matchedPattern: matchResult.patternName,
      extractedParams: matchResult.rawGroups || {},
      needsReview: confidence === 'low' || confidence === 'uncertain',
      notes: warnings.length > 0 ? warnings : undefined,
    });
    
    return {
      success: true,
      mappedStep,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
  
  /**
   * Build UI actions from pattern match result
   */
  private buildActions(
    matchResult: PatternMatchResult,
    step: Step,
    context?: StepMappingContext
  ): UIAction[] {
    const actions: UIAction[] = [];
    const { actionType, target, value, assertionType, expectedValue, elementType } = matchResult;
    
    if (!actionType) {
      return actions;
    }
    
    switch (actionType) {
      case 'navigate':
        actions.push({
          type: 'navigate',
          value: value || target,
          description: `Navigate to ${value || target}`,
        });
        break;
        
      case 'click':
        const clickLocator = this.resolveLocator(target, elementType, context);
        actions.push({
          type: 'click',
          locator: clickLocator,
          description: `Click on ${target}`,
        });
        break;
        
      case 'type':
      case 'fill':
        const inputLocator = this.resolveLocator(target, elementType || 'input', context);
        actions.push({
          type: 'fill',
          locator: inputLocator,
          value: value,
          description: target ? `Type "${value}" into ${target}` : `Type "${value}"`,
        });
        break;
        
      case 'select':
        const selectLocator = this.resolveLocator(target, 'select', context);
        actions.push({
          type: 'select',
          locator: selectLocator,
          value: value,
          description: target ? `Select "${value}" from ${target}` : `Select option "${value}"`,
        });
        break;
        
      case 'check':
        const checkLocator = this.resolveLocator(target, 'checkbox', context);
        actions.push({
          type: 'check',
          locator: checkLocator,
          description: `Check ${target}`,
        });
        break;
        
      case 'uncheck':
        const uncheckLocator = this.resolveLocator(target, 'checkbox', context);
        actions.push({
          type: 'uncheck',
          locator: uncheckLocator,
          description: `Uncheck ${target}`,
        });
        break;
        
      case 'hover':
        const hoverLocator = this.resolveLocator(target, elementType, context);
        actions.push({
          type: 'hover',
          locator: hoverLocator,
          description: `Hover over ${target}`,
        });
        break;
        
      case 'clear':
        const clearLocator = this.resolveLocator(target, 'input', context);
        actions.push({
          type: 'clear',
          locator: clearLocator,
          description: `Clear ${target}`,
        });
        break;
        
      case 'wait':
        if (target) {
          const waitLocator = this.resolveLocator(target, elementType, context);
          actions.push({
            type: 'wait',
            locator: waitLocator,
            description: `Wait for ${target}`,
          });
        } else if (value) {
          actions.push({
            type: 'wait',
            value: value,
            options: { timeout: parseInt(value, 10) * 1000 },
            description: `Wait for ${value} seconds`,
          });
        }
        break;
        
      case 'press':
        actions.push({
          type: 'press',
          value: value,
          description: `Press ${value} key`,
        });
        break;
        
      case 'screenshot':
        actions.push({
          type: 'screenshot',
          value: value,
          description: value ? `Take screenshot: ${value}` : 'Take screenshot',
        });
        break;
        
      case 'upload':
        const uploadLocator = this.resolveLocator(target, 'input', context);
        actions.push({
          type: 'upload',
          locator: uploadLocator,
          value: value,
          description: `Upload ${value}${target ? ` to ${target}` : ''}`,
        });
        break;
        
      case 'scroll':
        if (target) {
          const scrollLocator = this.resolveLocator(target, elementType, context);
          actions.push({
            type: 'scroll',
            locator: scrollLocator,
            description: `Scroll to ${target}`,
          });
        } else {
          actions.push({
            type: 'scroll',
            value: value,
            description: `Scroll ${value}`,
          });
        }
        break;
        
      case 'assert':
        const assertAction = this.buildAssertAction(
          assertionType,
          target,
          expectedValue,
          elementType,
          context
        );
        if (assertAction) {
          actions.push(assertAction);
        }
        break;
        
      default:
        // Unknown action type - could add as custom action
        break;
    }
    
    return actions;
  }
  
  /**
   * Build assertion action
   */
  private buildAssertAction(
    assertionType: string | undefined,
    target: string | undefined,
    expectedValue: string | undefined,
    elementType: string | undefined,
    context?: StepMappingContext
  ): UIAction | null {
    const action: UIAction = {
      type: 'assert',
      assertionType: assertionType as UIAction['assertionType'],
    };
    
    if (target) {
      action.locator = this.resolveLocator(target, elementType, context);
    }
    
    if (expectedValue !== undefined) {
      action.expectedValue = expectedValue;
    }
    
    // Build description
    switch (assertionType) {
      case 'visible':
        action.description = `Assert ${target} is visible`;
        break;
      case 'hidden':
        action.description = `Assert ${target} is hidden`;
        break;
      case 'text':
        action.description = target
          ? `Assert ${target} has text "${expectedValue}"`
          : `Assert text "${expectedValue}" is visible`;
        break;
      case 'value':
        action.description = `Assert ${target} has value "${expectedValue}"`;
        break;
      case 'url':
        action.description = `Assert URL contains "${expectedValue}"`;
        break;
      case 'title':
        action.description = `Assert page title is "${expectedValue}"`;
        break;
      case 'enabled':
        action.description = `Assert ${target} is enabled`;
        break;
      case 'disabled':
        action.description = `Assert ${target} is disabled`;
        break;
      default:
        action.description = `Assert ${target || 'element'} ${assertionType || 'condition'}`;
    }
    
    return action;
  }
  
  /**
   * Resolve a locator for an element
   * Uses context if available, otherwise creates a placeholder locator
   */
  private resolveLocator(
    target: string | undefined,
    elementType: string | undefined,
    context?: StepMappingContext
  ): Locator {
    if (!target) {
      return createLocator({
        id: uuidv4(),
        strategy: 'text',
        value: '',
        description: 'Unresolved locator',
      });
    }
    
    // Check if we have this locator in context
    if (context?.knownLocators?.has(target)) {
      return context.knownLocators.get(target)!;
    }
    
    // Determine best strategy based on element type
    let strategy: LocatorStrategy = 'text';
    let locatorValue = target;
    
    // For certain element types, use role-based selectors
    if (elementType) {
      switch (elementType) {
        case 'button':
          strategy = 'role';
          locatorValue = `button[name="${target}"]`;
          break;
        case 'link':
          strategy = 'role';
          locatorValue = `link[name="${target}"]`;
          break;
        case 'input':
        case 'textbox':
          strategy = 'role';
          locatorValue = `textbox[name="${target}"]`;
          break;
        case 'checkbox':
          strategy = 'role';
          locatorValue = `checkbox[name="${target}"]`;
          break;
        case 'select':
          strategy = 'role';
          locatorValue = `combobox[name="${target}"]`;
          break;
        default:
          strategy = 'text';
          locatorValue = target;
      }
    }
    
    return createLocator({
      id: uuidv4(),
      strategy,
      value: locatorValue,
      description: elementType ? `${elementType}: ${target}` : target,
    });
  }
  
  /**
   * Determine confidence level from match result
   */
  private determineConfidence(matchResult: PatternMatchResult): MappingConfidence {
    const score = matchResult.confidence;
    
    if (score >= 0.9) return 'exact';
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    if (score >= 0.4) return 'low';
    return 'uncertain';
  }
}
