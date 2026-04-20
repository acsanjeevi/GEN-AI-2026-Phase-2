/**
 * Test Orchestrator Use Case
 * Phase 8 - Orchestrates the complete test execution flow:
 * Parse → Map → Execute → Report
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import * as path from 'path';
import { promises as fs } from 'fs';
import { Feature } from '../../domain/models/Feature';
import { Scenario } from '../../domain/models/Scenario';
import { Step } from '../../domain/models/Step';
import { 
  MappedStep, 
  UIAction, 
  UIActionType,
  MappingConfidence,
  StepGeneratedCode,
  ResolvedElement
} from '../../domain/models/MappedStep';
import { 
  TestPlan, 
  TestPlanStatus, 
  TestExecutionItem,
  BrowserConfig,
  ExecutionSummary,
  ExecutionMode
} from '../../domain/models/TestPlan';
import { ParseFeatureUseCase, ParseFeatureInput, ParseFeatureOutput } from '../feature/parse-feature.usecase';
import { MapScenarioUseCase, MapScenarioInput, MapScenarioOutput } from '../mapping/map-scenario.usecase';
import { ExecuteActionUseCase, ExecuteActionInput, ExecuteActionOutput } from '../mcp/execute-action.usecase';
import { SnapshotUseCase, CaptureSnapshotInput, CaptureSnapshotOutput } from '../mcp/snapshot.usecase';
import { NavigateUseCase, NavigateInput, NavigateOutput } from '../mcp/navigate.usecase';
import { ResolveLocatorUseCase, ResolveLocatorInput, ResolveLocatorOutput } from '../locator/resolve-locator.usecase';
import { 
  getLlmResolveLocatorUseCase, 
  LlmResolveLocatorUseCase,
  BatchLocatorTarget,
  BatchResolveLocatorOutput 
} from '../locator/llm-resolve-locator.usecase';
import { PlaywrightMcpClientReal, PlaywrightMcpConfig } from '../../infrastructure/mcp/playwright/PlaywrightMcpClientReal';
import { ExecutionContextService, getExecutionContext } from './execution-context.service';
import { createLogger, ILogger } from '../../infrastructure/logging';
import { getConfig } from '../../core/config';
import { getVideoCollector, VideoCollector } from '../../infrastructure/playwright/video-collector';
import { getSpecWriter, SpecWriter } from '../../infrastructure/playwright/spec-writer';
import { GenerateStepCodeUseCase, GenerateStepCodeInput, GenerateStepCodeOutput } from '../llm/generate-step-code.usecase';
import { getSalesforceAuth, isSalesforceUrl } from '../../infrastructure/auth/SalesforceAuthService';
import { AddCookiesTool } from '../../infrastructure/mcp/playwright/tools/AddCookiesTool';

/**
 * Events emitted during test execution
 */
export interface TestExecutionEvents {
  'execution:started': { testPlanId: string; timestamp: Date };
  'scenario:started': { scenarioId: string; scenarioName: string };
  'scenario:completed': { scenarioId: string; status: 'passed' | 'failed'; duration: number };
  'step:started': { stepId: string; stepText: string };
  'step:completed': { stepId: string; status: 'passed' | 'failed'; duration: number };
  'action:executed': { actionType: UIActionType; success: boolean };
  'execution:progress': { completed: number; total: number; percentage: number };
  'execution:completed': { testPlanId: string; summary: ExecutionSummary };
  'execution:error': { error: string; stepId?: string };
}

/**
 * Input for creating a test plan
 */
export interface CreateTestPlanInput {
  /** Feature content (Gherkin text) */
  featureContent: string;
  /** Base URL for the application */
  baseUrl: string;
  /** Optional tags to filter scenarios */
  tags?: string[];
  /** Browser configuration */
  browserConfig?: Partial<BrowserConfig>;
  /** Execution mode */
  executionMode?: ExecutionMode;
  /** Maximum retries per scenario */
  maxRetries?: number;
  /** Unique script ID for tracking generated spec files */
  scriptId?: string;
}

/**
 * Output from creating a test plan
 */
export interface CreateTestPlanOutput {
  /** Whether creation was successful */
  success: boolean;
  /** Created test plan */
  testPlan?: TestPlan;
  /** Error message if failed */
  error?: string;
  /** Parsing details */
  parseDetails?: {
    scenarioCount: number;
    totalSteps: number;
    warnings: string[];
  };
}

/**
 * Input for executing a test plan
 */
export interface ExecuteTestPlanInput {
  /** Test plan ID */
  testPlanId: string;
  /** Optionally run only specific items */
  itemIds?: string[];
  /** Skip already passed items */
  skipPassed?: boolean;
}

/**
 * Output from test plan execution
 */
export interface ExecuteTestPlanOutput {
  /** Whether execution completed */
  success: boolean;
  /** Test plan after execution */
  testPlan: TestPlan;
  /** Execution summary */
  summary: ExecutionSummary;
  /** Errors encountered */
  errors: string[];
}

/**
 * Execution state for tracking
 */
interface ExecutionState {
  testPlan: TestPlan;
  currentItemIndex: number;
  currentStepIndex: number;
  sessionId: string;
  startTime: Date;
  isCancelled: boolean;
  /** Current item being executed */
  currentItem?: TestExecutionItem;
}

/**
 * Default browser configuration
 */
const DEFAULT_BROWSER_CONFIG: BrowserConfig = {
  browser: 'chromium',
  headless: true,
  viewportWidth: 1280,
  viewportHeight: 720,
  defaultTimeout: 30000,
  recordVideo: false,
  screenshotOnFailure: true,
  traceEnabled: false,
};

/**
 * Test Orchestrator Use Case
 * Coordinates parsing, mapping, and execution of Gherkin features
 */
export class TestOrchestratorUseCase extends EventEmitter {
  private readonly logger: ILogger;
  private readonly parseFeatureUseCase: ParseFeatureUseCase;
  private readonly mapScenarioUseCase: MapScenarioUseCase;
  private readonly executionContext: ExecutionContextService;
  
  // MCP client and use cases (initialized when execution starts)
  private mcpClient?: PlaywrightMcpClientReal;
  private executeActionUseCase?: ExecuteActionUseCase;
  private snapshotUseCase?: SnapshotUseCase;
  private navigateUseCase?: NavigateUseCase;
  private resolveLocatorUseCase?: ResolveLocatorUseCase;
  private llmResolveLocatorUseCase?: LlmResolveLocatorUseCase;
  private videoCollector?: VideoCollector;
  private specWriter?: SpecWriter;
  
  // Test plan storage (in-memory for now)
  private testPlans: Map<string, TestPlan> = new Map();
  private executionStates: Map<string, ExecutionState> = new Map();

  constructor() {
    super();
    this.logger = createLogger({ level: 'info', format: 'json' });
    this.parseFeatureUseCase = new ParseFeatureUseCase();
    this.mapScenarioUseCase = new MapScenarioUseCase();
    this.executionContext = getExecutionContext();
    this.resolveLocatorUseCase = new ResolveLocatorUseCase();
    this.llmResolveLocatorUseCase = getLlmResolveLocatorUseCase();
    this.videoCollector = getVideoCollector();
    this.specWriter = getSpecWriter();
  }

  /**
   * Create a test plan from a Gherkin feature
   */
  async createTestPlan(input: CreateTestPlanInput): Promise<CreateTestPlanOutput> {
    const { featureContent, baseUrl, tags, browserConfig, executionMode, maxRetries } = input;
    
    try {
      // Step 1: Parse the feature
      const parseInput: ParseFeatureInput = { content: featureContent };
      const parseOutput: ParseFeatureOutput = await this.parseFeatureUseCase.execute(parseInput);
      
      if (!parseOutput.success || !parseOutput.feature) {
        const errorMsg = parseOutput.errors.length > 0 
          ? parseOutput.errors.map(e => e.message).join('; ') 
          : 'Failed to parse feature';
        return {
          success: false,
          error: errorMsg,
        };
      }
      
      const feature = parseOutput.feature;
      
      // Step 2: Filter scenarios by tags if specified
      let scenarios = feature.scenarios;
      if (tags && tags.length > 0) {
        scenarios = scenarios.filter(scenario => {
          if (!scenario.tags || scenario.tags.length === 0) return false;
          return scenario.tags.some(tag => tags.includes(tag.name));
        });
      }
      
      if (scenarios.length === 0) {
        return {
          success: false,
          error: tags ? 'No scenarios match the specified tags' : 'No scenarios found in feature',
        };
      }
      
      // Step 3: Map each scenario
      const items: TestExecutionItem[] = [];
      let totalSteps = 0;
      const warnings: string[] = [];
      
      for (const scenario of scenarios) {
        const mapInput: MapScenarioInput = { 
          scenario,
          stopOnFailure: false,
          strictMode: false 
        };
        const mapOutput: MapScenarioOutput = this.mapScenarioUseCase.execute(mapInput);
        
        if (mapOutput.warnings.length > 0) {
          warnings.push(...mapOutput.warnings.map(w => `[${scenario.name}] ${w}`));
        }
        
        // Create test execution item
        const item: TestExecutionItem = {
          id: uuidv4(),
          scenario,
          mappedSteps: mapOutput.mappedSteps,
          status: 'pending',
          retryCount: 0,
          maxRetries: maxRetries ?? 1,
          screenshots: [],
        };
        
        items.push(item);
        totalSteps += scenario.steps.length;
      }
      
      // Step 4: Create the test plan
      const testPlan: TestPlan = {
        id: uuidv4(),
        name: feature.name,
        description: feature.description,
        feature,
        items,
        status: 'draft',
        executionMode: executionMode || 'sequential',
        browserConfig: { ...DEFAULT_BROWSER_CONFIG, ...browserConfig },
        baseUrl: input.baseUrl,
        tagFilter: tags,
        createdAt: new Date(),
        scriptId: input.scriptId,
      };
      
      // Store the test plan
      this.testPlans.set(testPlan.id, testPlan);
      
      this.logger.info('Test plan created', {
        testPlanId: testPlan.id,
        featureName: feature.name,
        scenarioCount: items.length,
        totalSteps,
      });
      
      return {
        success: true,
        testPlan,
        parseDetails: {
          scenarioCount: items.length,
          totalSteps,
          warnings,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to create test plan', { error: errorMessage });
      return {
        success: false,
        error: `Failed to create test plan: ${errorMessage}`,
      };
    }
  }

  /**
   * Register an externally created test plan
   * This allows test plans created by other use cases (e.g., EndToEndFlowUseCase)
   * to be stored and later executed via executeTestPlan
   */
  registerTestPlan(testPlan: TestPlan): void {
    this.testPlans.set(testPlan.id, testPlan);
    this.logger.info('Test plan registered', {
      testPlanId: testPlan.id,
      featureName: testPlan.feature.name,
      scenarioCount: testPlan.items.length,
    });
  }

  /**
   * Execute a test plan
   */
  async executeTestPlan(input: ExecuteTestPlanInput): Promise<ExecuteTestPlanOutput> {
    const { testPlanId, itemIds, skipPassed } = input;
    
    // Get the test plan
    const testPlan = this.testPlans.get(testPlanId);
    if (!testPlan) {
      throw new Error(`Test plan ${testPlanId} not found`);
    }
    
    const errors: string[] = [];
    let sessionId: string | undefined;
    
    try {
      // Setup artifacts directory
      const artifactsPath = await this.setupArtifactsDirectory(testPlanId);
      testPlan.artifactsPath = artifactsPath;
      
      // Initialize spec file if scriptId is provided
      if (testPlan.scriptId && this.specWriter) {
        const specResult = await this.specWriter.initSpec({
          scriptId: testPlan.scriptId,
          featureName: testPlan.feature.name,
          baseUrl: testPlan.baseUrl || '',
          artifactsDir: artifactsPath,
          overwrite: false, // Don't overwrite existing spec
        });
        
        if (specResult.success) {
          testPlan.specPath = specResult.specPath;
          testPlan.hasExistingSpec = await this.specWriter.specExists(testPlan.scriptId);
          this.logger.info('Spec file initialized', {
            testPlanId,
            scriptId: testPlan.scriptId,
            specPath: testPlan.specPath,
            hasExistingSpec: testPlan.hasExistingSpec,
          });
        } else {
          this.logger.warn('Failed to initialize spec file', {
            testPlanId,
            scriptId: testPlan.scriptId,
            error: specResult.error,
          });
        }
      }
      
      // Initialize MCP client with base artifacts directory (Playwright MCP saves all artifacts there)
      await this.initializeMcpClient(testPlan.browserConfig, artifactsPath);
      
      // Create execution session
      const session = this.executionContext.createSession({
        name: testPlan.name,
        featureId: testPlan.feature.id,
        config: {
          browserType: testPlan.browserConfig.browser,
          headless: testPlan.browserConfig.headless,
        },
      });
      sessionId = session.id;
      
      // Initialize execution state
      const executionState: ExecutionState = {
        testPlan,
        currentItemIndex: 0,
        currentStepIndex: 0,
        sessionId,
        startTime: new Date(),
        isCancelled: false,
      };
      this.executionStates.set(testPlanId, executionState);
      
      // Update test plan status
      testPlan.status = 'running';
      testPlan.startedAt = new Date();
      
      this.emit('execution:started', { testPlanId, timestamp: testPlan.startedAt });
      
      // Navigate to base URL first (if specified)
      if (testPlan.baseUrl && this.navigateUseCase) {
        // Inject Salesforce cookies before navigation if this is a Salesforce URL
        if (isSalesforceUrl(testPlan.baseUrl) && this.mcpClient) {
          this.logger.info('Detected Salesforce URL, injecting authentication cookies', { 
            baseUrl: testPlan.baseUrl 
          });
          await this.injectSalesforceAuth();
        }
        
        this.logger.info('Navigating to base URL', { baseUrl: testPlan.baseUrl });
        const navResult = await this.navigateUseCase.execute({
          url: testPlan.baseUrl,
          sessionId,
          waitUntil: 'domcontentloaded',
        });
        if (!navResult.success) {
          throw new Error(`Failed to navigate to base URL: ${navResult.error}`);
        }
        // Wait a moment for page to stabilize
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Determine which items to execute
      let itemsToExecute = testPlan.items;
      if (itemIds && itemIds.length > 0) {
        itemsToExecute = testPlan.items.filter(item => itemIds.includes(item.id));
      }
      if (skipPassed) {
        itemsToExecute = itemsToExecute.filter(item => item.status !== 'passed');
      }
      
      const totalItems = itemsToExecute.length;
      let completedItems = 0;
      
      // Execute each item (scenario)
      for (const item of itemsToExecute) {
        if (executionState.isCancelled) {
          item.status = 'skipped';
          continue;
        }
        
        try {
          await this.executeItem(item, executionState);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`[${item.scenario.name}] ${errorMessage}`);
          item.status = 'failed';
          item.errorMessage = errorMessage;
        }
        
        completedItems++;
        this.emit('execution:progress', {
          completed: completedItems,
          total: totalItems,
          percentage: Math.round((completedItems / totalItems) * 100),
        });
      }
      
      // Finalize spec file if scriptId is provided
      if (testPlan.scriptId && this.specWriter) {
        const specResult = await this.specWriter.finalizeSpec(testPlan.scriptId);
        if (specResult.success) {
          testPlan.specPath = specResult.specPath;
          testPlan.generatedCode = this.specWriter.getGeneratedCode(testPlan.scriptId);
          this.logger.info('Spec file finalized', {
            testPlanId,
            scriptId: testPlan.scriptId,
            specPath: testPlan.specPath,
          });
        }
        // Cleanup spec writer state for this script
        this.specWriter.cleanup(testPlan.scriptId);
      }
      
      // Calculate summary
      const summary = this.calculateSummary(testPlan);
      testPlan.summary = summary;
      testPlan.completedAt = new Date();
      testPlan.status = summary.failed > 0 ? 'failed' : 'completed';
      
      // Close browser FIRST - video files are not finalized until browser closes
      this.logger.info('Closing browser before organizing artifacts');
      await this.closeBrowser();
      
      // Wait for video files to be finalized (Playwright writes video asynchronously)
      // Longer executions need more time for video encoding to complete
      if (testPlan.browserConfig.recordVideo && testPlan.artifactsPath) {
        await this.waitForVideoFiles(testPlan.artifactsPath, summary.duration);
      }
      
      // Organize artifacts - move files from base directory to appropriate subdirectories
      // Playwright MCP saves all files (videos, traces, screenshots) to the --output-dir
      if (testPlan.artifactsPath) {
        await this.organizeArtifacts(testPlan.artifactsPath);
      }
      
      // Assign video paths if recording was enabled
      // Videos are already organized into videos/ subfolder by organizeArtifacts()
      if (testPlan.browserConfig.recordVideo && testPlan.artifactsPath) {
        try {
          this.logger.info('Assigning video paths to scenarios', { testPlanId });
          
          // Find video files in artifacts directory
          const videoPaths = await this.collectVideoPathsFromDirectory(
            testPlanId,
            testPlan.artifactsPath
          );
          
          // Assign video paths to items in execution order
          // Playwright MCP creates one video per browser session, not per scenario
          // So we assign the first video to the first executed item
          const executedItems = testPlan.items.filter(item => item.status !== 'skipped');
          let videoIndex = 0;
          for (const item of executedItems) {
            const videoKey = `video-${videoIndex}`;
            if (videoPaths.has(videoKey)) {
              item.videoPath = videoPaths.get(videoKey);
              videoIndex++;
            }
          }
          
          // If only one video exists (typical), assign to all executed items
          if (videoPaths.size === 1 && executedItems.length > 0) {
            const singleVideoPath = videoPaths.get('video-0');
            for (const item of executedItems) {
              if (!item.videoPath) {
                item.videoPath = singleVideoPath;
              }
            }
          }
          
          this.logger.info('Video paths assigned successfully', {
            testPlanId,
            videoCount: videoPaths.size,
            itemsWithVideo: executedItems.filter(i => i.videoPath).length,
          });
        } catch (videoError) {
          const errorMsg = videoError instanceof Error ? videoError.message : String(videoError);
          this.logger.warn('Failed to assign video paths', { testPlanId, error: errorMsg });
          errors.push(`Video path assignment failed: ${errorMsg}`);
        }
      }
      
      // Collect traces if tracing was enabled
      if (testPlan.browserConfig.traceEnabled && testPlan.artifactsPath) {
        try {
          this.logger.info('Collecting recorded traces', { testPlanId });
          
          // Find trace files in artifacts directory
          const tracePaths = await this.collectTracePathsFromDirectory(
            testPlanId,
            testPlan.artifactsPath
          );
          
          // Assign trace paths to items (in execution order)
          const executedItems = testPlan.items.filter(item => item.status !== 'skipped');
          let traceIndex = 0;
          for (const item of executedItems) {
            const traceKey = `trace-${traceIndex}`;
            if (tracePaths.has(traceKey)) {
              item.tracePath = tracePaths.get(traceKey);
              traceIndex++;
            }
          }
          
          this.logger.info('Traces collected successfully', {
            testPlanId,
            count: tracePaths.size,
          });
        } catch (traceError) {
          const errorMsg = traceError instanceof Error ? traceError.message : String(traceError);
          this.logger.warn('Failed to collect traces', { testPlanId, error: errorMsg });
          errors.push(`Trace collection failed: ${errorMsg}`);
        }
      }
      
      // Save generated code to artifacts directory
      if (testPlan.artifactsPath) {
        try {
          await this.saveGeneratedCode(testPlan);
        } catch (codeError) {
          const errorMsg = codeError instanceof Error ? codeError.message : String(codeError);
          this.logger.warn('Failed to save generated code', { testPlanId, error: errorMsg });
          errors.push(`Code save failed: ${errorMsg}`);
        }
      }
      
      // Cleanup session state
      if (sessionId) {
        this.executionContext.completeSession(sessionId);
      }
      this.executionStates.delete(testPlanId);
      
      this.emit('execution:completed', { testPlanId, summary });
      
      this.logger.info('Test plan execution completed', {
        testPlanId,
        status: testPlan.status,
        summary,
      });
      
      return {
        success: true,
        testPlan,
        summary,
        errors,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Test plan execution failed', { testPlanId, error: errorMessage });
      
      testPlan.status = 'failed';
      testPlan.completedAt = new Date();
      
      // Cleanup session state on error
      if (sessionId) {
        this.executionContext.completeSession(sessionId);
      }
      this.executionStates.delete(testPlanId);
      
      errors.push(errorMessage);
      
      return {
        success: false,
        testPlan,
        summary: this.calculateSummary(testPlan),
        errors,
      };
    } finally {
      // Safety net: close browser if not already closed (e.g., on unexpected error)
      // closeBrowser() is idempotent - it checks if client is connected first
      await this.closeBrowser();
    }
  }

  /**
   * Execute a single test execution item (scenario)
   * Uses batch LLM resolution for form-filling steps to minimize API calls
   */
  private async executeItem(item: TestExecutionItem, state: ExecutionState): Promise<void> {
    const { scenario, mappedSteps } = item;
    const startTime = Date.now();
    
    // Track current item in state for step execution
    state.currentItem = item;
    
    this.emit('scenario:started', { 
      scenarioId: scenario.id, 
      scenarioName: scenario.name 
    });
    
    item.status = 'running';
    // Initialize generated code accumulator for this scenario
    const scenarioCodeBlocks: string[] = [];
    
    try {
      // Group steps into batches for efficient LLM resolution
      // A batch ends when we hit a click action (page might change) or navigation
      let i = 0;
      while (i < mappedSteps.length) {
        if (state.isCancelled) {
          throw new Error('Execution cancelled');
        }
        
        const mappedStep = mappedSteps[i];
        state.currentStepIndex = i;
        
        // Check if this step requires a snapshot refresh (click, navigate)
        const requiresSnapshotRefresh = this.stepRequiresSnapshotRefresh(mappedStep);
        
        if (requiresSnapshotRefresh) {
          // Execute single step with fresh snapshot
          this.logger.info('Executing step with fresh snapshot (click/navigate)', {
            stepIndex: i,
            stepText: mappedStep.originalStep.text,
          });
          await this.executeStep(mappedStep, state);
          
          // Add delay between steps for stability
          const stepDelay = getConfig().execution?.stepDelayMs || 1000;
          if (stepDelay > 0) {
            await this.sleep(stepDelay);
          }
          
          // Accumulate generated code with step comment
          if (mappedStep.generatedCode?.code) {
            const stepComment = `    // ${mappedStep.originalStep.keyword} ${mappedStep.originalStep.text}`;
            scenarioCodeBlocks.push(stepComment);
            // Add proper indentation (4 spaces) to each line of generated code
            const indentedCode = mappedStep.generatedCode.code
              .split('\n')
              .map(line => line.trim() ? `    ${line.trim()}` : '')
              .join('\n');
            scenarioCodeBlocks.push(indentedCode);
          }
          i++;
        } else {
          // Collect consecutive form-filling steps for batch resolution
          const batch = this.collectFormFillingBatch(mappedSteps, i);
          
          if (batch.length > 1) {
            this.logger.info('Executing form-filling batch with single LLM call', {
              batchSize: batch.length,
              startIndex: i,
              steps: batch.map(s => s.originalStep.text),
            });
            
            // Execute batch with single LLM resolution
            await this.executeBatchSteps(batch, state);
            
            // Add delay between steps for stability
            const batchStepDelay = getConfig().execution?.stepDelayMs || 1000;
            if (batchStepDelay > 0) {
              await this.sleep(batchStepDelay);
            }
            
            // Accumulate generated code from batch with step comments
            for (const step of batch) {
              if (step.generatedCode?.code) {
                const stepComment = `    // ${step.originalStep.keyword} ${step.originalStep.text}`;
                scenarioCodeBlocks.push(stepComment);
                // Add proper indentation (4 spaces) to each line of generated code
                const indentedCode = step.generatedCode.code
                  .split('\n')
                  .map(line => line.trim() ? `    ${line.trim()}` : '')
                  .join('\n');
                scenarioCodeBlocks.push(indentedCode);
              }
            }
            
            i += batch.length;
          } else {
            // Single form-filling step, execute normally
            await this.executeStep(mappedStep, state);
            
            // Add delay between steps for stability
            const singleStepDelay = getConfig().execution?.stepDelayMs || 1000;
            if (singleStepDelay > 0) {
              await this.sleep(singleStepDelay);
            }
            
            // Accumulate generated code with step comment
            if (mappedStep.generatedCode?.code) {
              const stepComment = `    // ${mappedStep.originalStep.keyword} ${mappedStep.originalStep.text}`;
              scenarioCodeBlocks.push(stepComment);
              // Add proper indentation (4 spaces) to each line of generated code
              const indentedCode = mappedStep.generatedCode.code
                .split('\n')
                .map(line => line.trim() ? `    ${line.trim()}` : '')
                .join('\n');
              scenarioCodeBlocks.push(indentedCode);
            }
            i++;
          }
        }
      }
      
      // Store accumulated code in the item
      if (scenarioCodeBlocks.length > 0) {
        item.generatedCode = scenarioCodeBlocks.join('\n');
      }
      
      // Mark scenario complete in spec file
      if (state.testPlan.scriptId && this.specWriter) {
        await this.specWriter.markScenarioComplete(state.testPlan.scriptId, scenario.id);
      }
      
      // Capture final screenshot on success
      if (state.testPlan.artifactsPath && this.snapshotUseCase) {
        const screenshotPath = await this.captureFinalScreenshot(
          item, 
          state, 
          state.testPlan.artifactsPath
        );
        if (screenshotPath) {
          item.screenshots.push(screenshotPath);
        }
      }
      
      item.status = 'passed';
      item.duration = Date.now() - startTime;
      
      this.emit('scenario:completed', {
        scenarioId: scenario.id,
        status: 'passed',
        duration: item.duration,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      item.status = 'failed';
      item.errorMessage = errorMessage;
      item.duration = Date.now() - startTime;
      
      // Store accumulated code even on failure (for passed steps before the failure)
      if (scenarioCodeBlocks.length > 0) {
        item.generatedCode = scenarioCodeBlocks.join('\n');
      }
      
      // Capture screenshot on failure
      if (state.testPlan.browserConfig.screenshotOnFailure && this.snapshotUseCase) {
        try {
          const screenshotOutput = await this.snapshotUseCase.capture({
            sessionId: state.sessionId,
            captureScreenshot: true,
          });
          if (screenshotOutput.screenshot) {
            item.screenshots.push(screenshotOutput.screenshot);
          }
        } catch {
          // Ignore screenshot errors
        }
      }
      
      this.emit('scenario:completed', {
        scenarioId: scenario.id,
        status: 'failed',
        duration: item.duration,
      });
      
      // Check if we should retry
      if (item.retryCount < item.maxRetries) {
        item.retryCount++;
        this.logger.info('Retrying scenario (full reset)', {
          scenarioId: scenario.id,
          retryCount: item.retryCount,
          maxRetries: item.maxRetries,
        });
        
        // Reset item state for retry
        item.status = 'pending';
        item.errorMessage = undefined;
        item.screenshots = [];
        
        // Perform full browser reset: close and re-open browser, navigate to base URL
        await this.performFullRetryReset(state);
        
        // Re-execute the item
        await this.executeItem(item, state);
      } else {
        throw error;
      }
    }
  }

  /**
   * Check if a step requires a snapshot refresh (click or navigate actions)
   * These actions may change the page state
   */
  private stepRequiresSnapshotRefresh(mappedStep: MappedStep): boolean {
    for (const action of mappedStep.actions) {
      if (action.type === 'click' || action.type === 'navigate') {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a step is a form-filling step (fill, type, select)
   */
  private isFormFillingStep(mappedStep: MappedStep): boolean {
    for (const action of mappedStep.actions) {
      if (action.type === 'fill' || action.type === 'type' || action.type === 'select') {
        return true;
      }
    }
    return false;
  }

  /**
   * Collect consecutive form-filling steps starting from index
   */
  private collectFormFillingBatch(mappedSteps: MappedStep[], startIndex: number): MappedStep[] {
    const batch: MappedStep[] = [];
    
    for (let i = startIndex; i < mappedSteps.length; i++) {
      const step = mappedSteps[i];
      
      // Stop at click/navigate actions
      if (this.stepRequiresSnapshotRefresh(step)) {
        break;
      }
      
      // Only include form-filling steps
      if (this.isFormFillingStep(step)) {
        batch.push(step);
      } else {
        // Non-form-filling, non-click step - include but stop batch
        batch.push(step);
        break;
      }
    }
    
    return batch;
  }

  /**
   * Execute a batch of form-filling steps with single LLM resolution
   */
  private async executeBatchSteps(batch: MappedStep[], state: ExecutionState): Promise<void> {
    if (batch.length === 0) return;

    // Step 1: Capture single snapshot for the entire batch with retry
    this.logger.info('Capturing snapshot for batch execution', { batchSize: batch.length });
    
    if (!this.snapshotUseCase) {
      throw new Error('Snapshot use case not initialized');
    }
    
    // Retry snapshot capture up to 3 times with wait between attempts
    let snapshotOutput: CaptureSnapshotOutput | null = null;
    const maxRetries = 3;
    const waitBetweenMs = 1000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Wait before retry (except first attempt)
      if (attempt > 1) {
        this.logger.info('Waiting before snapshot retry', { attempt, waitMs: waitBetweenMs });
        await this.sleep(waitBetweenMs);
      }
      
      snapshotOutput = await this.snapshotUseCase.capture({
        sessionId: state.sessionId,
      });
      
      this.logger.info('Batch snapshot capture result', {
        attempt,
        success: snapshotOutput.success,
        hasRawSnapshot: !!snapshotOutput.rawSnapshot,
        rawSnapshotLength: snapshotOutput.rawSnapshot?.length || 0,
        error: snapshotOutput.error,
        statsNodeCount: snapshotOutput.stats?.totalNodes,
      });
      
      if (snapshotOutput.success && snapshotOutput.rawSnapshot && snapshotOutput.rawSnapshot.length > 50) {
        // Got a valid snapshot
        break;
      }
      
      this.logger.warn('Batch snapshot appears empty or minimal, retrying', { 
        attempt,
        rawSnapshotLength: snapshotOutput.rawSnapshot?.length || 0,
      });
    }
    
    if (!snapshotOutput?.success || !snapshotOutput.rawSnapshot || snapshotOutput.rawSnapshot.length < 50) {
      throw new Error(`Failed to capture valid snapshot for batch after ${maxRetries} attempts: ${snapshotOutput?.error || 'empty snapshot'}`);
    }
    
    // Step 2: Build batch targets for LLM resolution
    const targets: BatchLocatorTarget[] = [];
    const actionMap = new Map<string, { step: MappedStep; action: UIAction }>();
    
    for (const step of batch) {
      for (const action of step.actions) {
        // Only resolve form-filling actions
        if (action.type === 'fill' || action.type === 'type' || action.type === 'select') {
          const target = this.getTargetDescription(action);
          if (target) {
            const targetId = `${step.id}-${action.type}-${targets.length}`;
            targets.push({
              id: targetId,
              target,
              actionType: action.type,
              value: action.value,
            });
            actionMap.set(targetId, { step, action });
          }
        }
      }
    }
    
    // Step 3: Batch resolve all targets in single LLM call
    let resolvedRefs = new Map<string, string>();
    let batchResults = new Map<string, { resolved: boolean; ref?: string; role?: string; name?: string }>();
    
    if (targets.length > 0 && this.llmResolveLocatorUseCase) {
      this.logger.info('Batch resolving targets with LLM', {
        targetCount: targets.length,
        targets: targets.map(t => ({ id: t.id, target: t.target, action: t.actionType })),
      });
      
      const batchResult = await this.llmResolveLocatorUseCase.executeBatch({
        targets,
        snapshot: snapshotOutput.rawSnapshot,
      });
      
      this.logger.info('Batch resolution complete', {
        success: batchResult.success,
        resolvedCount: batchResult.resolvedCount,
        totalCount: batchResult.totalCount,
      });
      
      // Extract resolved refs and store full results
      for (const [id, result] of batchResult.results) {
        if (result.resolved && result.ref) {
          resolvedRefs.set(id, result.ref);
          batchResults.set(id, {
            resolved: result.resolved,
            ref: result.ref,
            role: result.role,
            name: result.name,
          });
        }
      }
    }
    
    // Step 4: Execute each step sequentially with pre-resolved refs
    for (const step of batch) {
      const stepText = step.originalStep.text;
      const stepKeyword = step.originalStep.keyword;
      const stepStartTime = Date.now();
      
      this.emit('step:started', { stepId: step.id, stepText });
      
      try {
        // Execute each action with pre-resolved ref if available
        for (const action of step.actions) {
          const targetId = this.findTargetId(targets, step.id, action);
          const preResolvedRef = targetId ? resolvedRefs.get(targetId) : undefined;
          
          // Populate resolvedElement from batch results for code generation
          if (targetId && batchResults.has(targetId)) {
            const batchResultItem = batchResults.get(targetId);
            if (batchResultItem?.resolved && batchResultItem.ref) {
              // Get target description for the name if not returned by LLM
              const targetDesc = this.getTargetDescription(action);
              action.resolvedElement = {
                role: batchResultItem.role || (action.type === 'fill' ? 'textbox' : 'element'),
                name: batchResultItem.name || targetDesc,
                ref: batchResultItem.ref,
              };
            }
          }
          
          await this.executeActionWithRef(action, state, preResolvedRef);
        }
        
        // Generate code for successfully executed step
        const generatedCode = await this.generateStepCode(step);
        if (generatedCode) {
          step.generatedCode = {
            code: generatedCode.code,
            imports: generatedCode.imports,
            explanation: generatedCode.explanation,
            generatedAt: new Date(),
          };
          
          // Write code to spec file immediately after success
          if (state.testPlan.scriptId && this.specWriter && state.currentItem) {
            const scenario = state.currentItem.scenario;
            await this.specWriter.appendStepCode({
              scriptId: state.testPlan.scriptId,
              scenarioId: scenario.id,
              scenarioName: scenario.name,
              scenarioTags: scenario.tags?.map(t => typeof t === 'string' ? t : t.name) || [],
              keyword: stepKeyword,
              stepText,
              code: generatedCode.code,
              status: 'passed',
              imports: generatedCode.imports,
            });
            
            this.logger.debug('Batch step code written to spec file', {
              scriptId: state.testPlan.scriptId,
              stepId: step.id,
              stepText,
            });
          }
        }
        
        this.emit('step:completed', {
          stepId: step.id,
          status: 'passed',
          duration: Date.now() - stepStartTime,
        });
        
      } catch (error) {
        this.emit('step:completed', {
          stepId: step.id,
          status: 'failed',
          duration: Date.now() - stepStartTime,
        });
        throw error;
      }
    }
  }

  /**
   * Find the target ID for an action in the targets array
   */
  private findTargetId(targets: BatchLocatorTarget[], stepId: string, action: UIAction): string | undefined {
    for (const target of targets) {
      if (target.id.startsWith(stepId) && target.actionType === action.type) {
        return target.id;
      }
    }
    return undefined;
  }

  /**
   * Execute an action with an optional pre-resolved ref
   */
  private async executeActionWithRef(action: UIAction, state: ExecutionState, preResolvedRef?: string): Promise<void> {
    if (!this.executeActionUseCase) {
      throw new Error('ExecuteActionUseCase not initialized');
    }
    
    const input: ExecuteActionInput = {
      action,
      sessionId: state.sessionId,
      resolvedRef: preResolvedRef,  // Pass pre-resolved ref to skip LLM call
      refreshSnapshot: !preResolvedRef, // Only refresh snapshot if no pre-resolved ref
    };
    
    const output: ExecuteActionOutput = await this.executeActionUseCase.execute(input);
    
    if (!output.success) {
      throw new Error(output.error || `Failed to execute action: ${action.type}`);
    }
    
    // Update resolvedElement from execution output for code generation
    // This ensures even actions with pre-resolved refs get proper element info
    if (output.locatorResolution?.resolved && output.locatorResolution.element) {
      const resolvedElement = output.locatorResolution.element;
      const targetDesc = this.getTargetDescription(action);
      action.resolvedElement = {
        role: resolvedElement.role || (action.type === 'fill' ? 'textbox' : 'element'),
        name: resolvedElement.name || targetDesc,
        ref: resolvedElement.ref,
      };
    } else if (action.resolvedElement && !action.resolvedElement.name) {
      // If we have resolvedElement from batch but no name, add target description
      const targetDesc = this.getTargetDescription(action);
      if (targetDesc) {
        action.resolvedElement.name = targetDesc;
      }
    }
  }

  /**
   * Get target description from action for locator resolution
   * Returns a human-readable description like "company name" not a CSS selector or ref
   */
  private getTargetDescription(action: UIAction): string | undefined {
    // Priority: Extract human-readable target from available sources
    
    // 1. Try to extract from action description (e.g., "Type 'TestLeaf' into company name")
    if (action.description) {
      // Extract target from description patterns
      const intoMatch = action.description.match(/into\s+["']?([^"']+?)["']?(?:\s+field)?$/i);
      if (intoMatch) {
        const extracted = intoMatch[1].trim();
        // Skip pure generic role words — they are not meaningful element targets
        const genericRoleWords = ['field', 'input', 'textbox', 'element', 'box', 'control', 'form'];
        if (!genericRoleWords.includes(extracted.toLowerCase())) {
          return extracted;
        }
      }
      
      const onMatch = action.description.match(/(?:Click|click)\s+(?:on\s+)?["']?([^"']+?)["']?$/i);
      if (onMatch) {
        const extracted = onMatch[1].trim();
        const genericClickWords = ['button', 'link', 'element', 'icon', 'item'];
        if (extracted && !genericClickWords.includes(extracted.toLowerCase())) {
          return extracted;
        }
      }
      
      const fromMatch = action.description.match(/from\s+["']?([^"']+?)["']?(?:\s+dropdown)?$/i);
      if (fromMatch) {
        const extracted = fromMatch[1].trim();
        const genericSelectWords = ['dropdown', 'select', 'combobox', 'list', 'menu'];
        if (extracted && !genericSelectWords.includes(extracted.toLowerCase())) {
          return extracted;
        }
      }
      
      // Extract target from assertion patterns like "Assert Status has text" or "Assert Status is visible"
      const assertMatch = action.description.match(/^Assert\s+["']?([^"']+?)["']?\s+(?:has text|has value|is visible|is hidden|is enabled|is disabled)/i);
      if (assertMatch && assertMatch[1] !== 'undefined') return assertMatch[1].trim();
      
      // If no pattern matches, use description directly if it's not too long
      if (action.description.length < 100 && !action.description.includes('Type "') && !action.description.includes('Select "')) {
        const direct = action.description.trim();
        if (direct) return direct;
      }
    }
    
    // 2. Try locator description (but skip "Unresolved locator" and refs like "e123")
    if (action.locator?.description && 
        action.locator.description !== 'Unresolved locator' &&
        !action.locator.description.match(/^e\d+$/i)) {
      // Extract from patterns like "textbox: company name" or "input: company name"
      const colonMatch = action.locator.description.match(/^[^:]+:\s*(.+)$/);
      if (colonMatch) return colonMatch[1].trim();
      return action.locator.description;
    }
    
    // 3. Try locator value (but only if it's human-readable, not a selector or ref)
    if (action.locator?.value) {
      const value = action.locator.value;
      // Skip if it looks like a ref (e.g., "e16", "e335")
      if (/^e\d+$/i.test(value)) {
        // This is a ref, not a target - skip it
      }
      // Skip if it looks like a role selector (e.g., "textbox[name='...']")
      else if (value.includes('[') || value.includes('=')) {
        // Try to extract the name from selector patterns like textbox[name="company name"]
        const nameMatch = value.match(/\[name=["']?([^"'\]]+)["']?\]/i);
        if (nameMatch) return nameMatch[1].trim();
      }
      // Otherwise use the value as-is if it's reasonable
      else if (value.length > 0 && value.length < 100) {
        return value;
      }
    }
    
    // 4. For non-fill actions, try the action value
    if (action.type !== 'type' && action.type !== 'fill' && action.value) {
      return action.value;
    }
    
    return undefined;
  }

  /**
   * Execute a single mapped step
   */
  private async executeStep(mappedStep: MappedStep, state: ExecutionState): Promise<void> {
    const stepText = mappedStep.originalStep.text;
    const stepKeyword = mappedStep.originalStep.keyword;
    const startTime = Date.now();
    
    this.emit('step:started', { 
      stepId: mappedStep.id, 
      stepText 
    });
    
    try {
      // Execute each action in the step
      for (const action of mappedStep.actions) {
        await this.executeAction(action, state);
      }
      
      // Generate code for the successfully executed step
      const generatedCode = await this.generateStepCode(mappedStep);
      if (generatedCode) {
        mappedStep.generatedCode = {
          code: generatedCode.code,
          imports: generatedCode.imports,
          explanation: generatedCode.explanation,
          generatedAt: new Date(),
        };
        
        // Write code to spec file if scriptId is provided
        if (state.testPlan.scriptId && this.specWriter && state.currentItem) {
          const scenario = state.currentItem.scenario;
          await this.specWriter.appendStepCode({
            scriptId: state.testPlan.scriptId,
            scenarioId: scenario.id,
            scenarioName: scenario.name,
            scenarioTags: scenario.tags?.map(t => typeof t === 'string' ? t : t.name) || [],
            keyword: stepKeyword,
            stepText,
            code: generatedCode.code,
            status: 'passed',
            imports: generatedCode.imports,
          });
          
          this.logger.debug('Step code written to spec file', {
            scriptId: state.testPlan.scriptId,
            stepId: mappedStep.id,
            stepText,
          });
        }
      }
      
      this.emit('step:completed', {
        stepId: mappedStep.id,
        status: 'passed',
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.emit('step:completed', {
        stepId: mappedStep.id,
        status: 'failed',
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Generate Playwright code for a mapped step
   */
  private async generateStepCode(mappedStep: MappedStep): Promise<GenerateStepCodeOutput | null> {
    if (mappedStep.actions.length === 0) {
      return null;
    }
    
    // Generate code for each action and combine
    const codeBlocks: string[] = [];
    const allImports: Set<string> = new Set(['test', 'expect', 'Page']);
    
    for (const action of mappedStep.actions) {
      const code = this.generateActionCode(action);
      if (code) {
        codeBlocks.push(code);
      }
    }
    
    if (codeBlocks.length === 0) {
      return null;
    }
    
    return {
      code: codeBlocks.join('\n'),
      imports: Array.from(allImports),
      stepText: mappedStep.originalStep.text,
      explanation: `Code for: ${mappedStep.originalStep.keyword} ${mappedStep.originalStep.text}`,
    };
  }

  /**
   * Generate Playwright code for a single action
   * Uses resolvedElement info (from successful execution) for accurate locators
   */
  private generateActionCode(action: UIAction): string | null {
    // Prefer resolvedElement (from actual execution) over locator (from mapping)
    let locatorCode: string | null = null;
    
    if (action.resolvedElement) {
      // Use the actual element that was found during execution
      locatorCode = this.buildLocatorFromResolvedElement(action.resolvedElement);
    } else if (action.locator) {
      // Fallback to locator from mapping
      locatorCode = this.buildLocatorCode(action.locator);
    }
    
    switch (action.type) {
      case 'navigate':
        // Only generate navigate if value is a valid URL, otherwise skip (baseUrl in beforeEach handles it)
        if (action.value && (action.value.startsWith('http://') || action.value.startsWith('https://') || action.value.startsWith('/'))) {
          return `await page.goto('${this.escapeString(action.value)}');`;
        }
        return null; // Skip non-URL navigation (handled by baseUrl in beforeEach)
      case 'click':
        return locatorCode ? `await ${locatorCode}.click();` : null;
      case 'type':
      case 'fill':
        return locatorCode && action.value !== undefined 
          ? `await ${locatorCode}.fill('${this.escapeString(action.value)}');` 
          : null;
      case 'select':
        return locatorCode && action.value 
          ? `await ${locatorCode}.selectOption('${this.escapeString(action.value)}');` 
          : null;
      case 'check':
        return locatorCode ? `await ${locatorCode}.check();` : null;
      case 'uncheck':
        return locatorCode ? `await ${locatorCode}.uncheck();` : null;
      case 'hover':
        return locatorCode ? `await ${locatorCode}.hover();` : null;
      case 'wait':
        const timeout = action.timeout || (action.value ? parseInt(action.value, 10) : 5000);
        return `await page.waitForTimeout(${timeout});`;
      case 'press':
        if (locatorCode && action.value) {
          return `await ${locatorCode}.press('${this.escapeString(action.value)}');`;
        } else if (action.value) {
          return `await page.keyboard.press('${this.escapeString(action.value)}');`;
        }
        return null;
      case 'clear':
        return locatorCode ? `await ${locatorCode}.clear();` : null;
      case 'focus':
        return locatorCode ? `await ${locatorCode}.focus();` : null;
      case 'blur':
        return locatorCode ? `await ${locatorCode}.blur();` : null;
      case 'screenshot':
        const filename = action.value || 'screenshot.png';
        return `await page.screenshot({ path: '${this.escapeString(filename)}' });`;
      case 'assert':
        return this.generateAssertCode(action, locatorCode);
      default:
        return null;
    }
  }

  /**
   * Generate assertion code
   */
  private generateAssertCode(action: UIAction, locatorCode: string | null): string | null {
    if (!action.assertionType) return null;
    
    switch (action.assertionType) {
      case 'visible':
        return locatorCode ? `await expect(${locatorCode}).toBeVisible();` : null;
      case 'hidden':
        return locatorCode ? `await expect(${locatorCode}).toBeHidden();` : null;
      case 'text':
        if (!action.expectedValue) return null;
        const expectedText = String(action.expectedValue);
        
        // If the locator already contains the expected text (e.g., getByRole with name: 'expectedText')
        // then we just need to verify it's visible, not check text again
        if (locatorCode && locatorCode.includes(`name: '${expectedText}'`)) {
          return `await expect(${locatorCode}).toBeVisible();`;
        }
        
        // For text assertions, prefer getByText if we don't have a good locator
        if (!locatorCode) {
          return `await expect(page.getByText('${this.escapeString(expectedText)}')).toBeVisible();`;
        }
        
        return `await expect(${locatorCode}).toHaveText('${this.escapeString(expectedText)}');`;
      case 'value':
        return locatorCode && action.expectedValue !== undefined
          ? `await expect(${locatorCode}).toHaveValue('${this.escapeString(String(action.expectedValue))}');`
          : null;
      case 'url':
        return action.expectedValue !== undefined
          ? `await expect(page).toHaveURL('${this.escapeString(String(action.expectedValue))}');`
          : null;
      case 'title':
        return action.expectedValue !== undefined
          ? `await expect(page).toHaveTitle('${this.escapeString(String(action.expectedValue))}');`
          : null;
      default:
        return null;
    }
  }

  /**
   * Build Playwright locator code from a Locator object
   * 
   * Note: When using MCP, locators typically have strategy='role' but the value
   * is an MCP ref (like 'S1e'). We need to generate proper Playwright locators
   * based on the element info stored in the locator description.
   */
  private buildLocatorCode(locator: { strategy: string; value: string; description?: string }): string {
    const value = locator.value;
    const description = locator.description || '';
    
    // Check if this is an MCP ref (short alphanumeric like 'S1e', 'S2f', etc.)
    const isMcpRef = /^[A-Z]?[0-9a-zA-Z]{1,4}$/.test(value);
    
    // Parse the description to extract role and name
    // Format is typically: "role: name" like "textbox: Username" or "button: Log In"
    const descMatch = description.match(/^(\w+):\s*(.+)$/);
    const role = descMatch ? descMatch[1].toLowerCase() : '';
    const name = descMatch ? descMatch[2].trim() : '';
    
    // If we have role and name from description, generate proper Playwright locator
    if (role && name && isMcpRef) {
      return this.buildRoleBasedLocator(role, name);
    }
    
    // Fallback to strategy-based code generation
    switch (locator.strategy) {
      case 'css':
        return `page.locator('${this.escapeString(value)}')`;
      case 'xpath':
        return `page.locator('xpath=${this.escapeString(value)}')`;
      case 'id':
        return `page.locator('#${this.escapeString(value)}')`;
      case 'name':
        return `page.locator('[name="${this.escapeString(value)}"]')`;
      case 'class':
        return `page.locator('.${this.escapeString(value)}')`;
      case 'tag':
        return `page.locator('${this.escapeString(value)}')`;
      case 'text':
        return `page.getByText('${this.escapeString(value)}')`;
      case 'role':
        // If value looks like a role with options (e.g., "button" or "textbox")
        // try to parse and generate proper syntax
        if (isMcpRef) {
          // MCP ref - can't generate proper locator without description
          return `page.locator('[data-ref="${this.escapeString(value)}"]')`;
        }
        // Simple role without name
        return `page.getByRole('${this.escapeString(value)}')`;
      case 'label':
        return `page.getByLabel('${this.escapeString(value)}')`;
      case 'placeholder':
        return `page.getByPlaceholder('${this.escapeString(value)}')`;
      case 'testId':
        return `page.getByTestId('${this.escapeString(value)}')`;
      case 'title':
        return `page.getByTitle('${this.escapeString(value)}')`;
      case 'altText':
        return `page.getByAltText('${this.escapeString(value)}')`;
      case 'ref':
        // Playwright MCP ref format - fallback to data attribute
        return `page.locator('[data-ref="${this.escapeString(value)}"]')`;
      default:
        return `page.locator('${this.escapeString(value)}')`;
    }
  }

  /**
   * Build a Playwright locator using getByRole with proper syntax
   */
  private buildRoleBasedLocator(role: string, name: string): string {
    // Map accessibility roles to Playwright role names
    const roleMap: Record<string, string> = {
      'textbox': 'textbox',
      'searchbox': 'searchbox',
      'button': 'button',
      'link': 'link',
      'checkbox': 'checkbox',
      'radio': 'radio',
      'combobox': 'combobox',
      'listbox': 'listbox',
      'option': 'option',
      'menuitem': 'menuitem',
      'menu': 'menu',
      'tab': 'tab',
      'tablist': 'tablist',
      'heading': 'heading',
      'img': 'img',
      'dialog': 'dialog',
      'alert': 'alert',
      'alertdialog': 'alertdialog',
      'progressbar': 'progressbar',
      'slider': 'slider',
      'spinbutton': 'spinbutton',
      'switch': 'switch',
      'table': 'table',
      'row': 'row',
      'cell': 'cell',
      'columnheader': 'columnheader',
      'rowheader': 'rowheader',
      'grid': 'grid',
      'gridcell': 'gridcell',
      'tree': 'tree',
      'treeitem': 'treeitem',
      'navigation': 'navigation',
      'region': 'region',
      'article': 'article',
      'banner': 'banner',
      'complementary': 'complementary',
      'contentinfo': 'contentinfo',
      'form': 'form',
      'main': 'main',
      'search': 'search',
    };

    const playwrightRole = roleMap[role] || role;
    const escapedName = this.escapeString(name);
    
    // For inputs, prefer getByLabel if the name looks like a label
    if (['textbox', 'searchbox', 'combobox', 'spinbutton'].includes(playwrightRole)) {
      return `page.getByLabel('${escapedName}')`;
    }
    
    // For buttons and links, use getByRole with name option
    return `page.getByRole('${playwrightRole}', { name: '${escapedName}' })`;
  }

  /**
   * Build Playwright locator code from resolved element info
   * This uses the actual element that was found and interacted with during MCP execution
   */
  private buildLocatorFromResolvedElement(element: { role: string; name?: string; ref?: string }): string {
    const { role, name } = element;
    
    // If no name, we can't generate a reliable locator
    if (!name) {
      // Fallback to a generic role locator (may not be unique)
      return `page.getByRole('${role}')`;
    }
    
    const escapedName = this.escapeString(name);
    const roleLower = role.toLowerCase();
    
    // Map common roles to Playwright methods
    switch (roleLower) {
      // Input fields - use getByLabel for better reliability
      case 'textbox':
      case 'searchbox':
      case 'spinbutton':
      case 'combobox':
        return `page.getByLabel('${escapedName}')`;
      
      // Buttons - use getByRole with name
      case 'button':
        return `page.getByRole('button', { name: '${escapedName}' })`;
      
      // Links - use getByRole with name
      case 'link':
        return `page.getByRole('link', { name: '${escapedName}' })`;
      
      // Checkboxes and radios
      case 'checkbox':
        return `page.getByRole('checkbox', { name: '${escapedName}' })`;
      case 'radio':
        return `page.getByRole('radio', { name: '${escapedName}' })`;
      
      // Headings
      case 'heading':
        return `page.getByRole('heading', { name: '${escapedName}' })`;
      
      // Images
      case 'img':
      case 'image':
        return `page.getByRole('img', { name: '${escapedName}' })`;
      
      // Menu items
      case 'menuitem':
        return `page.getByRole('menuitem', { name: '${escapedName}' })`;
      
      // Tabs
      case 'tab':
        return `page.getByRole('tab', { name: '${escapedName}' })`;
      
      // Options in select
      case 'option':
        return `page.getByRole('option', { name: '${escapedName}' })`;
      
      // List items
      case 'listitem':
        return `page.getByRole('listitem', { name: '${escapedName}' })`;
      
      // Generic text elements - use getByText
      case 'text':
      case 'statictext':
      case 'paragraph':
      case 'generic':
        return `page.getByText('${escapedName}')`;
      
      // Default - use getByRole with name option
      default:
        return `page.getByRole('${roleLower}', { name: '${escapedName}' })`;
    }
  }

  /**
   * Escape string for JavaScript code
   */
  private escapeString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  }

  /**
   * Execute a single UI action
   * Updates the action's locator with resolved element info for code generation
   */
  private async executeAction(action: UIAction, state: ExecutionState): Promise<void> {
    if (!this.executeActionUseCase) {
      throw new Error('ExecuteActionUseCase not initialized');
    }
    
    const input: ExecuteActionInput = {
      action,
      sessionId: state.sessionId,
      refreshSnapshot: true,
    };
    
    const output: ExecuteActionOutput = await this.executeActionUseCase.execute(input);
    
    this.emit('action:executed', {
      actionType: action.type,
      success: output.success,
    });
    
    if (!output.success) {
      throw new Error(output.error || `Action ${action.type} failed`);
    }
    
    // Update the action's locator with resolved element info for accurate code generation
    // This ensures the generated spec uses the actual locator that worked
    if (output.locatorResolution?.resolved && output.locatorResolution.element) {
      const resolvedElement = output.locatorResolution.element;
      
      // Create or update locator with resolved info
      if (!action.locator) {
        action.locator = {
          id: `resolved_${Date.now()}`,
          strategy: 'role',
          value: resolvedElement.ref || '',
          description: `${resolvedElement.role}: ${resolvedElement.name || action.target || ''}`,
          confidence: 'high',
          source: 'mcp',
          isPrimary: true,
          successCount: 1,
          failureCount: 0,
        };
      } else {
        // Update existing locator with resolved info for code generation
        action.locator.description = `${resolvedElement.role}: ${resolvedElement.name || action.target || ''}`;
        action.locator.value = resolvedElement.ref || action.locator.value;
        action.locator.successCount = (action.locator.successCount || 0) + 1;
      }
      
      // Store the resolved element info directly on action for code generation
      // Use target description as fallback if LLM doesn't return name
      const targetDesc = this.getTargetDescription(action);
      action.resolvedElement = {
        role: resolvedElement.role,
        name: resolvedElement.name || targetDesc,
        ref: resolvedElement.ref,
      };
      
      this.logger.debug('Action locator updated with resolved info', {
        actionType: action.type,
        role: resolvedElement.role,
        name: resolvedElement.name,
        ref: resolvedElement.ref,
      });
    }
  }

  /**
   * Initialize MCP client and related use cases
   */
  private async initializeMcpClient(browserConfig: BrowserConfig, videoDir?: string): Promise<void> {
    // Build recordVideo configuration
    let recordVideoConfig: boolean | { dir: string } | undefined;
    if (browserConfig.recordVideo) {
      recordVideoConfig = videoDir ? { dir: videoDir } : true;
    }
    
    this.logger.info('Initializing MCP client with video config', {
      recordVideo: browserConfig.recordVideo,
      videoDir,
      recordVideoConfig,
    });
    
    const mcpConfig = {
      serverName: 'playwright',
      serverType: 'playwright',
      connectionTimeout: browserConfig.defaultTimeout,
      requestTimeout: browserConfig.defaultTimeout,
      autoReconnect: true,
      maxReconnectAttempts: 3,
      options: {
        browser: browserConfig.browser,
        headless: browserConfig.headless,
        viewportWidth: browserConfig.viewportWidth,
        viewportHeight: browserConfig.viewportHeight,
        recordVideo: recordVideoConfig,
        traceEnabled: browserConfig.traceEnabled,
      },
    } as PlaywrightMcpConfig;
    
    this.mcpClient = new PlaywrightMcpClientReal(mcpConfig);
    this.executeActionUseCase = new ExecuteActionUseCase(this.mcpClient);
    this.snapshotUseCase = new SnapshotUseCase(this.mcpClient);
    this.navigateUseCase = new NavigateUseCase(this.mcpClient);
    
    await this.mcpClient.connect();
  }

  /**
   * Close the browser and disconnect MCP client
   * Called in finally block to ensure cleanup regardless of outcome
   */
  private async closeBrowser(): Promise<void> {
    if (this.mcpClient && this.mcpClient.isConnected()) {
      try {
        this.logger.info('Closing browser and disconnecting MCP client');
        await this.mcpClient.disconnect();
        this.logger.info('Browser closed successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error('Error closing browser', { error: errorMessage });
        // Don't throw - we want cleanup to continue even if disconnect fails
      }
    }
    
    // Clear references
    this.mcpClient = undefined;
    this.executeActionUseCase = undefined;
    this.snapshotUseCase = undefined;
    this.navigateUseCase = undefined;
  }

  /**
   * Inject Salesforce authentication cookies into the browser context
   * This enables automatic login for Salesforce applications
   */
  private async injectSalesforceAuth(): Promise<void> {
    if (!this.mcpClient) {
      this.logger.warn('Cannot inject Salesforce auth: MCP client not initialized');
      return;
    }

    try {
      const authService = getSalesforceAuth();
      const cookies = authService.getCookies();

      if (cookies.length === 0) {
        this.logger.warn('No Salesforce cookies found to inject', {
          storageStatePath: authService.getStorageStatePath(),
        });
        return;
      }

      this.logger.info('Injecting Salesforce authentication cookies', {
        cookieCount: cookies.length,
      });

      const addCookiesTool = new AddCookiesTool(this.mcpClient);
      const result = await addCookiesTool.execute({ cookies });

      if (result.success) {
        this.logger.info('Salesforce cookies injected successfully', {
          cookieCount: cookies.length,
        });
      } else {
        this.logger.error('Failed to inject Salesforce cookies', {
          error: result.error,
        });
      }
    } catch (error) {
      this.logger.error('Error injecting Salesforce auth', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Wait for video files to be finalized by Playwright
   * Playwright writes video asynchronously after browser closes, and longer recordings take more time
   */
  private async waitForVideoFiles(artifactsPath: string, executionDurationMs: number): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Calculate max wait time based on execution duration
    // Longer executions need more time for video encoding
    // Base: 5 seconds, plus 50% of execution time, max 30 seconds
    const baseWaitMs = 5000;
    const scaledWaitMs = Math.floor(executionDurationMs * 0.5);
    const maxWaitMs = Math.min(baseWaitMs + scaledWaitMs, 30000);
    
    this.logger.info('Waiting for video files to be finalized', {
      executionDurationMs,
      maxWaitMs,
      artifactsPath
    });
    
    const pollIntervalMs = 500;
    let elapsedMs = 0;
    let videoFound = false;
    
    while (elapsedMs < maxWaitMs) {
      try {
        // Check the artifacts base directory for video files
        const files = await fs.readdir(artifactsPath);
        const videoFiles = files.filter(f => f.endsWith('.webm') || f.endsWith('.mp4'));
        
        if (videoFiles.length > 0) {
          this.logger.info('Video file(s) found', { videoFiles, elapsedMs });
          videoFound = true;
          
          // Give a bit more time for the file to be fully written
          await this.sleep(500);
          break;
        }
        
        // Also check the videos subdirectory if it exists
        const videosDir = path.join(artifactsPath, 'videos');
        try {
          const videoDirFiles = await fs.readdir(videosDir);
          const videoDirVideoFiles = videoDirFiles.filter(f => f.endsWith('.webm') || f.endsWith('.mp4'));
          
          if (videoDirVideoFiles.length > 0) {
            this.logger.info('Video file(s) found in videos directory', { videoDirVideoFiles, elapsedMs });
            videoFound = true;
            await this.sleep(500);
            break;
          }
        } catch {
          // videos directory doesn't exist yet, that's fine
        }
      } catch (error) {
        this.logger.warn('Error checking for video files', { error: String(error) });
      }
      
      await this.sleep(pollIntervalMs);
      elapsedMs += pollIntervalMs;
    }
    
    if (!videoFound) {
      this.logger.warn('Video file not found after waiting', { maxWaitMs, artifactsPath });
    }
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Perform full retry reset: close browser, reinitialize MCP client, navigate to base URL
   * This ensures each retry starts from a clean browser state
   */
  private async performFullRetryReset(state: ExecutionState): Promise<void> {
    this.logger.info('Performing full retry reset - closing browser and reinitializing');
    
    try {
      // Step 1: Close the current browser session
      await this.closeBrowser();
      
      // Step 2: Wait a brief moment to ensure clean shutdown
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 3: Reinitialize MCP client with the same browser config
      const testPlan = state.testPlan;
      await this.initializeMcpClient(testPlan.browserConfig, testPlan.artifactsPath);
      
      // Step 4: Navigate to base URL to start fresh
      if (testPlan.baseUrl && this.navigateUseCase) {
        this.logger.info('Navigating to base URL for retry', { baseUrl: testPlan.baseUrl });
        const navResult = await this.navigateUseCase.execute({
          url: testPlan.baseUrl,
          sessionId: state.sessionId,
          waitUntil: 'domcontentloaded',
        });
        if (!navResult.success) {
          throw new Error(`Failed to navigate to base URL: ${navResult.error}`);
        }
        // Wait a moment for page to stabilize
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      this.logger.info('Full retry reset completed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Error during full retry reset', { error: errorMessage });
      throw new Error(`Failed to perform full retry reset: ${errorMessage}`);
    }
  }

  /**
   * Setup artifacts directory for test execution
   */
  private async setupArtifactsDirectory(testPlanId: string): Promise<string> {
    const artifactsDir = path.join(process.cwd(), 'artifacts', testPlanId);
    const videosDir = path.join(artifactsDir, 'videos');
    const tracesDir = path.join(artifactsDir, 'traces');
    const screenshotsDir = path.join(artifactsDir, 'screenshots');
    
    try {
      await fs.mkdir(videosDir, { recursive: true });
      await fs.mkdir(tracesDir, { recursive: true });
      await fs.mkdir(screenshotsDir, { recursive: true });
      this.logger.debug('Artifacts directories created', { path: artifactsDir });
      return artifactsDir;
    } catch (error) {
      this.logger.warn('Failed to create artifacts directory', {
        path: artifactsDir,
        error: error instanceof Error ? error.message : String(error),
      });
      return artifactsDir; // Return path even if creation failed
    }
  }

  /**
   * Organize artifacts by moving files from base directory to appropriate subdirectories
   * Playwright MCP saves all files to --output-dir, so we need to organize them after execution
   */
  private async organizeArtifacts(artifactsPath: string): Promise<void> {
    this.logger.info('Organizing artifacts into subdirectories', { artifactsPath });
    
    try {
      const entries = await fs.readdir(artifactsPath, { withFileTypes: true });
      const files = entries.filter(e => e.isFile()).map(e => e.name);
      const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
      
      this.logger.info('Artifacts directory contents', { 
        path: artifactsPath,
        files,
        directories: dirs,
        totalFiles: files.length,
        totalDirs: dirs.length
      });
      
      for (const file of files) {
        const filePath = path.join(artifactsPath, file);
        
        let targetDir: string | null = null;
        
        // Determine target directory based on file extension
        if (file.endsWith('.webm') || file.endsWith('.mp4')) {
          targetDir = path.join(artifactsPath, 'videos');
          this.logger.info('Found video file to move', { file, targetDir });
        } else if (file.endsWith('.zip')) {
          targetDir = path.join(artifactsPath, 'traces');
          this.logger.info('Found trace zip to move', { file, targetDir });
        } else if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
          targetDir = path.join(artifactsPath, 'screenshots');
          this.logger.info('Found screenshot to move', { file, targetDir });
        }
        
        if (targetDir) {
          // Ensure target directory exists
          await fs.mkdir(targetDir, { recursive: true });
          
          const targetPath = path.join(targetDir, file);
          this.logger.info('Moving artifact file', { from: filePath, to: targetPath });
          
          try {
            await fs.rename(filePath, targetPath);
            this.logger.info('Successfully moved artifact file', { file, to: targetPath });
          } catch (moveError) {
            this.logger.warn('Rename failed, trying copy+delete', { 
              file, 
              error: moveError instanceof Error ? moveError.message : String(moveError) 
            });
            // If rename fails (e.g., cross-device), try copy and delete
            try {
              await fs.copyFile(filePath, targetPath);
              await fs.unlink(filePath);
              this.logger.info('Successfully copied and deleted artifact file', { file, to: targetPath });
            } catch (copyError) {
              this.logger.error('Failed to move artifact file', {
                file,
                from: filePath,
                to: targetPath,
                error: copyError instanceof Error ? copyError.message : String(copyError),
              });
            }
          }
        } else {
          this.logger.debug('Skipping file (no matching target)', { file });
        }
      }
      
      this.logger.info('Artifacts organization complete');
      
      // Create traces.zip from the traces folder
      await this.createTracesZip(artifactsPath);
    } catch (error) {
      this.logger.error('Failed to organize artifacts', {
        path: artifactsPath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Save generated Playwright code to the artifacts directory
   * Creates a scripts/ subfolder with the generated spec file
   */
  private async saveGeneratedCode(testPlan: TestPlan): Promise<void> {
    if (!testPlan.artifactsPath) {
      return;
    }

    // Collect all generated code from items
    const allCode: string[] = [];
    for (const item of testPlan.items) {
      if (item.generatedCode) {
        allCode.push(`// Scenario: ${item.scenario.name}`);
        allCode.push(item.generatedCode);
        allCode.push(''); // Empty line between scenarios
      }
    }

    if (allCode.length === 0) {
      this.logger.debug('No generated code to save', { testPlanId: testPlan.id });
      return;
    }

    // Create scripts directory
    const scriptsDir = path.join(testPlan.artifactsPath, 'scripts');
    await fs.mkdir(scriptsDir, { recursive: true });

    // Generate the spec file content with proper Playwright structure
    const specFileName = `${testPlan.scriptId || testPlan.id}.spec.ts`;
    const specFilePath = path.join(scriptsDir, specFileName);

    const specContent = this.generateSpecFileContent(testPlan, allCode);

    // Write the spec file
    await fs.writeFile(specFilePath, specContent, 'utf-8');

    // Also store the file path in testPlan for API access
    testPlan.generatedCode = specContent;

    this.logger.info('Generated code saved to artifacts', {
      testPlanId: testPlan.id,
      specFile: specFilePath,
      lineCount: specContent.split('\n').length,
    });
  }

  /**
   * Generate a complete Playwright spec file content
   */
  private generateSpecFileContent(testPlan: TestPlan, _codeBlocks: string[]): string {
    const lines: string[] = [];

    // File header
    lines.push('import { test, expect } from \'@playwright/test\';');
    lines.push('');

    // Test describe block
    lines.push(`test.describe('${testPlan.name || 'Generated Test Suite'}', () => {`);
    
    // Add each scenario as a test
    for (const item of testPlan.items) {
      if (item.generatedCode) {
        lines.push('');
        lines.push(`  test('${item.scenario.name.replace(/'/g, "\\'")}', async ({ page }) => {`);
        
        // The generated code already has proper indentation and comments
        const codeLines = item.generatedCode.split('\n');
        for (const codeLine of codeLines) {
          if (codeLine.trim()) {
            // Code already has indentation from accumulation, just add it
            lines.push(codeLine);
          }
        }
        
        lines.push('  });');
      }
    }

    lines.push('});');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Create a zip file of the traces folder
   * Creates traces.zip in the traces folder alongside the original trace files
   */
  private async createTracesZip(artifactsPath: string): Promise<void> {
    const tracesDir = path.join(artifactsPath, 'traces');
    const zipPath = path.join(tracesDir, 'traces.zip');
    
    try {
      // Check if traces directory exists and has content
      const entries = await fs.readdir(tracesDir, { withFileTypes: true });
      const traceFiles = entries.filter(e => !e.name.endsWith('.zip')); // Exclude any existing zips
      
      if (traceFiles.length === 0) {
        this.logger.debug('No trace files to zip', { tracesDir });
        return;
      }
      
      this.logger.info('Creating traces.zip', { tracesDir, fileCount: traceFiles.length });
      
      // Use spawn to run zip command (available on macOS/Linux)
      const { spawn } = await import('child_process');
      
      await new Promise<void>((resolve, reject) => {
        // Build list of files/folders to zip (exclude any .zip files)
        const itemsToZip = traceFiles.map(e => e.name);
        
        const zipProcess = spawn('zip', ['-r', 'traces.zip', ...itemsToZip], {
          cwd: tracesDir,
          stdio: ['ignore', 'pipe', 'pipe']
        });
        
        let stderr = '';
        zipProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        zipProcess.on('close', (code) => {
          if (code === 0) {
            this.logger.info('traces.zip created successfully', { zipPath });
            resolve();
          } else {
            this.logger.warn('zip command failed', { code, stderr });
            reject(new Error(`zip failed with code ${code}: ${stderr}`));
          }
        });
        
        zipProcess.on('error', (err) => {
          this.logger.warn('Failed to spawn zip command', { error: err.message });
          reject(err);
        });
      });
    } catch (error) {
      // Don't fail the entire process if zipping fails
      this.logger.warn('Failed to create traces.zip', {
        tracesDir,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Find and collect video files from artifacts directory
   * Playwright MCP saves videos with format: page-{timestamp}.webm
   */
  private async collectVideoPathsFromDirectory(
    testPlanId: string,
    artifactsPath: string
  ): Promise<Map<string, string>> {
    const videoPaths = new Map<string, string>();
    const videosDir = path.join(artifactsPath, 'videos');
    
    this.logger.info('Scanning for video files', { videosDir });
    
    try {
      const files = await fs.readdir(videosDir);
      this.logger.info('Files in videos directory', { count: files.length, files });
      
      const videoFiles = files.filter(f => f.endsWith('.webm') || f.endsWith('.mp4'));
      this.logger.info('Found video files', { count: videoFiles.length, videoFiles });
      
      // Playwright MCP names videos as page-{timestamp}.webm
      // We'll assign them to items in order since there's no item ID in filename
      for (let i = 0; i < videoFiles.length; i++) {
        const file = videoFiles[i];
        const videoPath = path.join(videosDir, file);
        // Store with index key - will be assigned to items in execution order
        videoPaths.set(`video-${i}`, videoPath);
        this.logger.debug('Found video file', { file, index: i, videoPath });
      }
    } catch (error) {
      // Directory might not exist yet - that's OK
      this.logger.warn('Failed to scan videos directory', {
        path: videosDir,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    
    this.logger.info('Video path collection complete', { mappedCount: videoPaths.size });
    return videoPaths;
  }

  /**
   * Find and collect trace files from artifacts directory
   * Playwright MCP saves traces as .trace files (not .zip)
   */
  private async collectTracePathsFromDirectory(
    testPlanId: string,
    artifactsPath: string
  ): Promise<Map<string, string>> {
    const tracePaths = new Map<string, string>();
    const tracesDir = path.join(artifactsPath, 'traces');
    
    this.logger.info('Scanning for trace files', { tracesDir });
    
    try {
      const files = await fs.readdir(tracesDir);
      this.logger.info('Files in traces directory', { count: files.length, files });
      
      // Playwright MCP saves traces as .trace files (e.g., trace-1234567890.trace)
      // Also look for .zip files in case traces are zipped
      const traceFiles = files.filter(f => f.endsWith('.trace') || f.endsWith('.zip'));
      this.logger.info('Found trace files', { count: traceFiles.length, traceFiles });
      
      // Map trace files to item IDs based on file naming convention
      // Expected format: trace-{timestamp}.trace or trace-{timestamp}.zip
      for (let i = 0; i < traceFiles.length; i++) {
        const file = traceFiles[i];
        const tracePath = path.join(tracesDir, file);
        // Store trace path with index as key (will be assigned to items in order)
        tracePaths.set(`trace-${i}`, tracePath);
        this.logger.debug('Found trace file', { file, tracePath });
      }
    } catch (error) {
      // Directory might not exist yet - that's OK
      this.logger.warn('Failed to scan traces directory', {
        path: tracesDir,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    
    this.logger.info('Trace path collection complete', { mappedCount: tracePaths.size });
    return tracePaths;
  }

  /**
   * Capture final screenshot for a scenario
   */
  private async captureFinalScreenshot(
    item: TestExecutionItem,
    state: ExecutionState,
    artifactsPath: string
  ): Promise<string | undefined> {
    if (!this.snapshotUseCase) {
      this.logger.warn('SnapshotUseCase not initialized, skipping final screenshot');
      return undefined;
    }
    
    try {
      this.logger.info('Capturing final screenshot', { 
        itemId: item.id, 
        scenarioName: item.scenario.name 
      });
      
      const screenshotOutput = await this.snapshotUseCase.capture({
        sessionId: state.sessionId,
        captureScreenshot: true,
      });
      
      if (screenshotOutput.screenshot) {
        // Save screenshot to file
        const screenshotsDir = path.join(artifactsPath, 'screenshots');
        const screenshotFileName = `${item.id}-final.png`;
        const screenshotPath = path.join(screenshotsDir, screenshotFileName);
        
        // If screenshot is base64, decode and save
        if (screenshotOutput.screenshot.startsWith('data:image')) {
          const base64Data = screenshotOutput.screenshot.replace(/^data:image\/\w+;base64,/, '');
          await fs.writeFile(screenshotPath, Buffer.from(base64Data, 'base64'));
        } else {
          // Already a path or raw data
          await fs.writeFile(screenshotPath, screenshotOutput.screenshot);
        }
        
        this.logger.info('Final screenshot saved', { screenshotPath });
        return screenshotPath;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn('Failed to capture final screenshot', { 
        itemId: item.id, 
        error: errorMsg 
      });
    }
    
    return undefined;
  }

  /**
   * Calculate execution summary
   */
  private calculateSummary(testPlan: TestPlan): ExecutionSummary {
    const items = testPlan.items;
    const total = items.length;
    const passed = items.filter(i => i.status === 'passed').length;
    const failed = items.filter(i => i.status === 'failed').length;
    const skipped = items.filter(i => i.status === 'skipped' || i.status === 'pending').length;
    const duration = items.reduce((sum, i) => sum + (i.duration || 0), 0);
    
    return {
      total,
      passed,
      failed,
      skipped,
      duration,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
    };
  }

  /**
   * Get a test plan by ID
   */
  getTestPlan(testPlanId: string): TestPlan | undefined {
    return this.testPlans.get(testPlanId);
  }

  /**
   * Get all test plans
   */
  getAllTestPlans(): TestPlan[] {
    return Array.from(this.testPlans.values());
  }

  /**
   * Get test plans with optional filtering
   */
  getTestPlans(options?: {
    status?: TestPlanStatus[];
    tags?: string[];
    limit?: number;
    offset?: number;
  }): { testPlans: TestPlan[]; total: number } {
    let plans = Array.from(this.testPlans.values());
    
    if (options?.status && options.status.length > 0) {
      plans = plans.filter(p => options.status!.includes(p.status));
    }
    
    if (options?.tags && options.tags.length > 0) {
      plans = plans.filter(p => {
        if (!p.tagFilter || p.tagFilter.length === 0) return false;
        return options.tags!.some(tag => p.tagFilter!.includes(tag));
      });
    }
    
    const total = plans.length;
    
    if (options?.offset) {
      plans = plans.slice(options.offset);
    }
    
    if (options?.limit) {
      plans = plans.slice(0, options.limit);
    }
    
    return { testPlans: plans, total };
  }

  /**
   * Delete a test plan
   */
  deleteTestPlan(testPlanId: string): boolean {
    return this.testPlans.delete(testPlanId);
  }

  /**
   * Cancel a running test plan
   */
  cancelExecution(testPlanId: string): boolean {
    const state = this.executionStates.get(testPlanId);
    if (!state) return false;
    
    state.isCancelled = true;
    state.testPlan.status = 'cancelled';
    
    this.logger.info('Execution cancelled', { testPlanId });
    return true;
  }

  /**
   * Get execution status
   */
  getExecutionStatus(testPlanId: string): {
    status: TestPlanStatus;
    progress: { completed: number; total: number; percentage: number };
    currentScenario?: string;
    currentStep?: string;
  } | null {
    const testPlan = this.testPlans.get(testPlanId);
    if (!testPlan) return null;
    
    const state = this.executionStates.get(testPlanId);
    const completedItems = testPlan.items.filter(i => 
      i.status === 'passed' || i.status === 'failed' || i.status === 'skipped'
    ).length;
    
    return {
      status: testPlan.status,
      progress: {
        completed: completedItems,
        total: testPlan.items.length,
        percentage: testPlan.items.length > 0 
          ? Math.round((completedItems / testPlan.items.length) * 100) 
          : 0,
      },
      currentScenario: state ? testPlan.items[state.currentItemIndex]?.scenario.name : undefined,
    };
  }

  /**
   * Retry a specific failed item
   */
  async retryItem(testPlanId: string, itemId: string): Promise<{
    success: boolean;
    item?: TestExecutionItem;
    error?: string;
  }> {
    const testPlan = this.testPlans.get(testPlanId);
    if (!testPlan) {
      return { success: false, error: 'Test plan not found' };
    }
    
    const item = testPlan.items.find(i => i.id === itemId);
    if (!item) {
      return { success: false, error: 'Item not found' };
    }
    
    if (item.status !== 'failed') {
      return { success: false, error: 'Can only retry failed items' };
    }
    
    try {
      // Initialize MCP client if not already
      if (!this.mcpClient) {
        const videosDir = testPlan.artifactsPath 
          ? path.join(testPlan.artifactsPath, 'videos')
          : undefined;
        await this.initializeMcpClient(testPlan.browserConfig, videosDir);
      }
      
      const session = this.executionContext.createSession({
        name: `Retry ${item.scenario.name}`,
        featureId: testPlan.feature.id,
        scenarioId: item.scenario.id,
        config: {
          browserType: testPlan.browserConfig.browser,
          headless: testPlan.browserConfig.headless,
        },
      });
      const sessionId = session.id;
      
      const state: ExecutionState = {
        testPlan,
        currentItemIndex: testPlan.items.indexOf(item),
        currentStepIndex: 0,
        sessionId,
        startTime: new Date(),
        isCancelled: false,
      };
      
      // Reset item status
      item.status = 'pending';
      item.errorMessage = undefined;
      item.duration = undefined;
      item.retryCount++;
      
      await this.executeItem(item, state);
      
      // Cleanup
      this.executionContext.completeSession(sessionId);
      
      // Update summary
      testPlan.summary = this.calculateSummary(testPlan);
      
      return { success: true, item };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, item, error: errorMessage };
    } finally {
      // Close browser after retry
      await this.closeBrowser();
    }
  }
}

/**
 * Factory function for creating test orchestrator
 */
export function createTestOrchestrator(): TestOrchestratorUseCase {
  return new TestOrchestratorUseCase();
}

// Singleton instance
let orchestratorInstance: TestOrchestratorUseCase | null = null;

/**
 * Get singleton test orchestrator instance
 */
export function getTestOrchestrator(): TestOrchestratorUseCase {
  if (!orchestratorInstance) {
    orchestratorInstance = new TestOrchestratorUseCase();
  }
  return orchestratorInstance;
}
