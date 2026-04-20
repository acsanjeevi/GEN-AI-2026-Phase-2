/**
 * End-to-End Flow Use Case
 * Phase 9 - Orchestrates the complete flow:
 * Parse → Map → Execute with LLM fallback and healing loop
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { createLogger, ILogger } from '../../infrastructure/logging';

// Domain models
import { Feature } from '../../domain/models/Feature';
import { Scenario } from '../../domain/models/Scenario';
import { MappedStep, UIAction } from '../../domain/models/MappedStep';
import { 
  TestPlan, 
  TestExecutionItem, 
  BrowserConfig, 
  ExecutionSummary,
  createTestPlan,
} from '../../domain/models/TestPlan';
import { LocatorStrategy } from '../../domain/models/Locator';

// Use cases
import { ParseFeatureUseCase, ParseFeatureInput, ParseFeatureOutput } from '../feature/parse-feature.usecase';
import { MapScenarioUseCase, MapScenarioInput, MapScenarioOutput } from '../mapping/map-scenario.usecase';
import { healStep, HealStepInput, HealStepOutput, HealingSuggestion } from '../llm/heal-step.usecase';

// Infrastructure
import { ILlmClient } from '../../infrastructure/llm/LlmClient.interface';

/**
 * End-to-End Flow Input
 */
export interface EndToEndFlowInput {
  /** Gherkin feature content */
  featureContent: string;
  
  /** Base URL for the application */
  baseUrl: string;
  
  /** Browser configuration */
  browserConfig?: Partial<BrowserConfig>;
  
  /** Maximum healing attempts per step */
  maxHealingAttempts?: number;
  
  /** Enable automatic healing */
  enableHealing?: boolean;
  
  /** Tags to filter scenarios */
  tags?: string[];
  
  /** Test timeout in milliseconds */
  timeout?: number;
}

/**
 * End-to-End Flow Output
 */
export interface EndToEndFlowOutput {
  /** Whether the flow completed successfully */
  success: boolean;
  
  /** Parsed feature */
  feature?: Feature;
  
  /** Generated test plan */
  testPlan?: TestPlan;
  
  /** Execution summary */
  summary?: ExecutionSummary;
  
  /** Healing events that occurred */
  healingEvents: HealingEvent[];
  
  /** Errors encountered */
  errors: string[];
  
  /** Total duration in milliseconds */
  durationMs: number;
}

/**
 * Healing event record
 */
export interface HealingEvent {
  /** Step ID that was healed */
  stepId: string;
  
  /** Original step text */
  stepText: string;
  
  /** Original locator */
  originalLocator: { strategy: string; value: string };
  
  /** Healed locator (if successful) */
  healedLocator?: { strategy: string; value: string };
  
  /** Healing attempt number */
  attemptNumber: number;
  
  /** Whether healing succeeded */
  success: boolean;
  
  /** Analysis from LLM */
  analysis: string;
  
  /** Timestamp */
  timestamp: Date;
}

/**
 * Flow events
 */
export interface EndToEndFlowEvents {
  'flow:started': { flowId: string; timestamp: Date };
  'parse:started': { flowId: string };
  'parse:completed': { flowId: string; scenarioCount: number };
  'map:started': { flowId: string; scenarioId: string };
  'map:completed': { flowId: string; scenarioId: string; stepCount: number };
  'execute:started': { flowId: string; testPlanId: string };
  'step:failed': { flowId: string; stepId: string; error: string };
  'healing:started': { flowId: string; stepId: string; attempt: number };
  'healing:completed': { flowId: string; stepId: string; success: boolean };
  'flow:completed': { flowId: string; success: boolean; summary?: ExecutionSummary };
  'flow:error': { flowId: string; error: string };
}

/**
 * End-to-End Flow Use Case
 * Coordinates the complete test automation flow with healing capabilities
 */
export class EndToEndFlowUseCase extends EventEmitter {
  private logger: ILogger;
  private parseFeatureUseCase: ParseFeatureUseCase;
  private mapScenarioUseCase: MapScenarioUseCase;
  private llmClient: ILlmClient | null;
  
  constructor(llmClient: ILlmClient | null = null) {
    super();
    this.logger = createLogger({ level: 'info', format: 'json' });
    this.parseFeatureUseCase = new ParseFeatureUseCase();
    this.mapScenarioUseCase = new MapScenarioUseCase();
    this.llmClient = llmClient;
  }
  
  /**
   * Execute the end-to-end flow
   */
  async execute(input: EndToEndFlowInput): Promise<EndToEndFlowOutput> {
    const flowId = uuidv4();
    const startTime = Date.now();
    const healingEvents: HealingEvent[] = [];
    const errors: string[] = [];
    
    this.logger.info('End-to-end flow started', { flowId });
    this.emit('flow:started', { flowId, timestamp: new Date() });
    
    try {
      // Step 1: Parse feature
      this.emit('parse:started', { flowId });
      const parseOutput = await this.parseFeature(input.featureContent);
      
      if (!parseOutput.success || !parseOutput.feature) {
        const parseError = `Failed to parse feature: ${parseOutput.errors?.join(', ') || 'Unknown error'}`;
        errors.push(parseError);
        this.emit('flow:error', { flowId, error: parseError });
        
        return {
          success: false,
          errors,
          healingEvents,
          durationMs: Date.now() - startTime,
        };
      }
      
      const feature = parseOutput.feature;
      this.logger.info('Feature parsed', { 
        flowId, 
        scenarioCount: feature.scenarios.length 
      });
      this.emit('parse:completed', { 
        flowId, 
        scenarioCount: feature.scenarios.length 
      });
      
      // Step 2: Filter scenarios by tags if specified
      let scenariosToExecute = feature.scenarios;
      if (input.tags && input.tags.length > 0) {
        scenariosToExecute = feature.scenarios.filter(scenario => 
          scenario.tags?.some(tag => input.tags!.includes(tag.name))
        );
        this.logger.info('Filtered scenarios by tags', {
          flowId,
          originalCount: feature.scenarios.length,
          filteredCount: scenariosToExecute.length,
          tags: input.tags,
        });
      }
      
      // Step 3: Map each scenario to UI actions
      const mappedItems: TestExecutionItem[] = [];
      
      for (const scenario of scenariosToExecute) {
        this.emit('map:started', { flowId, scenarioId: scenario.id });
        
        const mapOutput = await this.mapScenario(scenario);
        
        if (!mapOutput.success) {
          const failedCount = mapOutput.failedSteps.length;
          const mapError = `Failed to map scenario "${scenario.name}": ${failedCount} steps failed to map`;
          this.logger.warn(mapError, { flowId, scenarioId: scenario.id });
          errors.push(mapError);
          continue;
        }
        
        const item: TestExecutionItem = {
          id: uuidv4(),
          scenario,
          mappedSteps: mapOutput.mappedSteps,
          status: 'pending',
          retryCount: 0,
          maxRetries: 0,
          screenshots: [],
        };
        
        mappedItems.push(item);
        
        this.emit('map:completed', { 
          flowId, 
          scenarioId: scenario.id, 
          stepCount: mapOutput.mappedSteps.length 
        });
      }
      
      if (mappedItems.length === 0) {
        const noScenariosError = 'No scenarios could be mapped for execution';
        errors.push(noScenariosError);
        
        return {
          success: false,
          feature,
          errors,
          healingEvents,
          durationMs: Date.now() - startTime,
        };
      }
      
      // Step 4: Create test plan
      const browserConfig = this.createBrowserConfig(input.browserConfig);
      // Note: timeout is set via browserConfig.defaultTimeout
      if (input.timeout) {
        browserConfig.defaultTimeout = input.timeout;
      }
      const testPlan = createTestPlan({
        id: uuidv4(),
        name: feature.name || 'Test Plan',
        description: feature.description,
        feature,
        items: mappedItems,
        browserConfig,
        baseUrl: input.baseUrl,
      });
      
      this.logger.info('Test plan created', {
        flowId,
        testPlanId: testPlan.id,
        itemCount: testPlan.items.length,
      });
      
      // Note: Actual execution is handled by TestOrchestratorUseCase
      // This use case prepares everything for execution
      
      const summary: ExecutionSummary = {
        total: mappedItems.length,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: Date.now() - startTime,
        passRate: 0,
      };
      
      this.emit('flow:completed', { flowId, success: true, summary });
      
      return {
        success: true,
        feature,
        testPlan,
        summary,
        healingEvents,
        errors,
        durationMs: Date.now() - startTime,
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('End-to-end flow failed', { flowId, error: errorMessage });
      errors.push(errorMessage);
      this.emit('flow:error', { flowId, error: errorMessage });
      
      return {
        success: false,
        errors,
        healingEvents,
        durationMs: Date.now() - startTime,
      };
    }
  }
  
  /**
   * Attempt to heal a failed step
   */
  async healFailedStep(
    step: MappedStep,
    action: UIAction,
    errorMessage: string,
    currentSnapshot: string,
    previousSnapshot?: string,
    pageUrl?: string,
    attemptNumber: number = 1
  ): Promise<HealingEvent> {
    const originalLocator = action.locator || { 
      strategy: 'unknown', 
      value: 'unknown',
      description: action.description,
    };
    
    this.logger.info('Starting healing attempt', {
      stepId: step.id,
      stepText: step.originalStep.text,
      attemptNumber,
    });
    
    // Build healing input
    // Map strategy to valid LocatorStrategy
    const rawStrategy = originalLocator.strategy || 'css';
    const validStrategy = this.mapToValidStrategy(rawStrategy);
    
    const healInput: HealStepInput = {
      stepText: step.originalStep.text,
      originalLocator: {
        strategy: validStrategy,
        value: originalLocator.value || originalLocator.description || '',
      },
      errorMessage,
      currentDomSnapshot: currentSnapshot,
      previousDomSnapshot: previousSnapshot,
      pageUrl,
      elementDescription: action.description || originalLocator.description,
      healingAttempt: attemptNumber,
      maxSuggestions: 3,
    };
    
    const healOutput = await healStep(this.llmClient, healInput);
    
    const healingEvent: HealingEvent = {
      stepId: step.id,
      stepText: step.originalStep.text,
      originalLocator: {
        strategy: healInput.originalLocator.strategy,
        value: healInput.originalLocator.value,
      },
      attemptNumber,
      success: healOutput.healed && healOutput.suggestions.length > 0,
      analysis: healOutput.analysis,
      timestamp: new Date(),
    };
    
    // If healing found a suggestion, include the best one
    if (healOutput.healed && healOutput.suggestions.length > 0) {
      const bestSuggestion = this.selectBestSuggestion(healOutput.suggestions);
      healingEvent.healedLocator = {
        strategy: bestSuggestion.locator.strategy,
        value: bestSuggestion.locator.value,
      };
      
      this.logger.info('Healing suggestion found', {
        stepId: step.id,
        healedLocator: healingEvent.healedLocator,
        confidence: bestSuggestion.confidence,
      });
    } else {
      this.logger.warn('Healing failed to find suggestion', {
        stepId: step.id,
        recommendation: healOutput.recommendation,
      });
    }
    
    return healingEvent;
  }
  
  /**
   * Select the best healing suggestion
   */
  private selectBestSuggestion(suggestions: HealingSuggestion[]): HealingSuggestion {
    // Sort by confidence: high > medium > low
    const confidenceOrder: Record<string, number> = {
      'high': 3,
      'medium': 2,
      'low': 1,
    };
    
    return suggestions.sort((a, b) => 
      (confidenceOrder[b.confidence] || 0) - (confidenceOrder[a.confidence] || 0)
    )[0];
  }
  
  /**
   * Parse feature content
   */
  private async parseFeature(content: string): Promise<ParseFeatureOutput> {
    const input: ParseFeatureInput = {
      content,
      filePath: 'api-input',
    };
    
    return this.parseFeatureUseCase.execute(input);
  }
  
  /**
   * Map a scenario to UI actions
   */
  private async mapScenario(scenario: Scenario): Promise<MapScenarioOutput> {
    const input: MapScenarioInput = {
      scenario,
    };
    
    return this.mapScenarioUseCase.execute(input);
  }
  
  /**
   * Create browser configuration with defaults
   */
  private createBrowserConfig(partial?: Partial<BrowserConfig>): BrowserConfig {
    return {
      browser: partial?.browser || 'chromium',
      headless: partial?.headless ?? false,
      viewportWidth: partial?.viewportWidth || 1280,
      viewportHeight: partial?.viewportHeight || 720,
      defaultTimeout: partial?.defaultTimeout || 30000,
      screenshotOnFailure: partial?.screenshotOnFailure ?? true,
      recordVideo: partial?.recordVideo ?? false,
      traceEnabled: partial?.traceEnabled ?? false,
    };
  }
  
  /**
   * Map any strategy string to valid LocatorStrategy
   */
  private mapToValidStrategy(strategy: string): LocatorStrategy {
    const validStrategies: LocatorStrategy[] = [
      'css', 'xpath', 'id', 'name', 'class', 'tag', 'text', 
      'role', 'label', 'placeholder', 'testId', 'title', 'altText'
    ];
    return validStrategies.includes(strategy as LocatorStrategy) 
      ? (strategy as LocatorStrategy) 
      : 'css';
  }
}

/**
 * Factory function
 */
export function createEndToEndFlow(llmClient: ILlmClient | null = null): EndToEndFlowUseCase {
  return new EndToEndFlowUseCase(llmClient);
}
