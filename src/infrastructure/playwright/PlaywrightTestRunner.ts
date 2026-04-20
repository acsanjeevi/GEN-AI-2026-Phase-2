/**
 * Playwright Test Runner
 * High-level service for running Playwright-based tests
 * Provides a simplified interface over the test orchestrator
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  TestOrchestratorUseCase,
  CreateTestPlanInput,
  CreateTestPlanOutput,
  ExecuteTestPlanInput,
  ExecuteTestPlanOutput,
  getTestOrchestrator,
} from '../../application/execution/test-orchestrator.usecase';
import { TestPlan, TestPlanStatus, ExecutionSummary, BrowserConfig } from '../../domain/models/TestPlan';
import { ILlmClient } from '../llm/LlmClient.interface';
import { createLogger, ILogger } from '../logging';

/**
 * Test run configuration
 */
export interface TestRunConfig {
  /** Feature content (Gherkin) */
  featureContent: string;
  /** Base URL for the application */
  baseUrl: string;
  /** Test run name */
  name?: string;
  /** Description */
  description?: string;
  /** Unique script ID for tracking generated spec files */
  scriptId?: string;
  /** Browser options */
  browser?: {
    type?: 'chromium' | 'firefox' | 'webkit';
    headless?: boolean;
    viewportWidth?: number;
    viewportHeight?: number;
  };
  /** Test options */
  options?: {
    /** Tags to filter scenarios */
    tags?: string[];
    /** Maximum retries per scenario */
    maxRetries?: number;
    /** Stop on first failure */
    stopOnFirstFailure?: boolean;
    /** Default timeout in ms */
    timeout?: number;
    /** Take screenshots on failure */
    screenshotOnFailure?: boolean;
    /** Record video */
    recordVideo?: boolean;
    /** Enable tracing */
    traceEnabled?: boolean;
  };
  /** LLM options */
  llm?: {
    /** Enable LLM-based healing */
    enableHealing?: boolean;
    /** Generate test code */
    generateCode?: boolean;
  };
  /** Created by user */
  createdBy?: string;
}

/**
 * Test run result
 */
export interface TestRunResult {
  /** Test plan ID */
  id: string;
  /** Test run name */
  name: string;
  /** Status */
  status: TestPlanStatus;
  /** Whether run was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Summary */
  summary?: ExecutionSummary;
  /** Progress (0-100) */
  progress: number;
  /** Duration in ms */
  duration?: number;
  /** Artifacts path */
  artifactsPath?: string;
  /** Generated test code */
  generatedCode?: string;
  /** Script ID for spec file tracking */
  scriptId?: string;
  /** Path to generated spec file */
  specPath?: string;
  /** Whether execution used existing spec */
  hasExistingSpec?: boolean;
}

/**
 * Real-time update for test run
 */
export interface TestRunUpdate {
  /** Update type */
  type: 'status' | 'scenario' | 'step' | 'action' | 'progress' | 'complete' | 'error';
  /** Test plan ID */
  testPlanId: string;
  /** Message */
  message: string;
  /** Current status */
  status: TestPlanStatus;
  /** Progress (0-100) */
  progress: number;
  /** Related scenario ID */
  scenarioId?: string;
  /** Related step ID */
  stepId?: string;
  /** Error details */
  error?: string;
  /** Summary (on complete) */
  summary?: ExecutionSummary;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Playwright Test Runner Service
 */
export class PlaywrightTestRunner extends EventEmitter {
  private orchestrator: TestOrchestratorUseCase;
  private llmClient?: ILlmClient;
  private logger: ILogger;
  private runningTests: Set<string> = new Set();

  constructor(llmClient?: ILlmClient) {
    super();
    this.llmClient = llmClient;
    this.orchestrator = getTestOrchestrator();
    this.logger = createLogger({ level: 'info', format: 'json' });
    
    // Forward orchestrator events
    this.setupEventForwarding();
  }

  /**
   * Set up event forwarding from orchestrator
   */
  private setupEventForwarding(): void {
    // Forward scenario events
    this.orchestrator.on('scenario:started', (event) => {
      const update: TestRunUpdate = {
        type: 'scenario',
        testPlanId: '',
        message: `Starting scenario: ${event.scenarioName}`,
        status: 'running',
        progress: 0,
        scenarioId: event.scenarioId,
        timestamp: new Date(),
      };
      this.emit('update', update);
    });

    this.orchestrator.on('scenario:completed', (event) => {
      const update: TestRunUpdate = {
        type: 'scenario',
        testPlanId: '',
        message: `Scenario ${event.status}: ${event.scenarioId}`,
        status: 'running',
        progress: 0,
        scenarioId: event.scenarioId,
        timestamp: new Date(),
      };
      this.emit('update', update);
    });

    // Forward step events
    this.orchestrator.on('step:started', (event) => {
      const update: TestRunUpdate = {
        type: 'step',
        testPlanId: '',
        message: `Executing: ${event.stepText}`,
        status: 'running',
        progress: 0,
        stepId: event.stepId,
        timestamp: new Date(),
      };
      this.emit('update', update);
    });

    this.orchestrator.on('step:completed', (event) => {
      const update: TestRunUpdate = {
        type: 'step',
        testPlanId: '',
        message: `Step ${event.status}: ${event.stepId}`,
        status: 'running',
        progress: 0,
        stepId: event.stepId,
        timestamp: new Date(),
      };
      this.emit('update', update);
    });

    // Forward progress events
    this.orchestrator.on('execution:progress', (event) => {
      const update: TestRunUpdate = {
        type: 'progress',
        testPlanId: '',
        message: `Progress: ${event.completed}/${event.total} (${event.percentage}%)`,
        status: 'running',
        progress: event.percentage,
        timestamp: new Date(),
      };
      this.emit('update', update);
    });

    // Forward execution complete
    this.orchestrator.on('execution:completed', (event) => {
      const update: TestRunUpdate = {
        type: 'complete',
        testPlanId: event.testPlanId,
        message: `Execution completed: ${event.summary.passed}/${event.summary.total} passed`,
        status: event.summary.failed > 0 ? 'failed' : 'completed',
        progress: 100,
        summary: event.summary,
        timestamp: new Date(),
      };
      this.emit('update', update);
      this.runningTests.delete(event.testPlanId);
    });

    // Forward errors
    this.orchestrator.on('execution:error', (event) => {
      const update: TestRunUpdate = {
        type: 'error',
        testPlanId: '',
        message: event.error,
        status: 'failed',
        progress: 0,
        error: event.error,
        stepId: event.stepId,
        timestamp: new Date(),
      };
      this.emit('update', update);
    });
  }

  /**
   * Start a new test run
   */
  async startRun(config: TestRunConfig): Promise<TestRunResult> {
    const startTime = Date.now();

    this.logger.info('Starting test run', { name: config.name, scriptId: config.scriptId });

    // Build orchestrator input
    const createInput: CreateTestPlanInput = {
      featureContent: config.featureContent,
      baseUrl: config.baseUrl,
      tags: config.options?.tags,
      maxRetries: config.options?.maxRetries || 0,
      executionMode: 'sequential',
      browserConfig: {
        browser: config.browser?.type || 'chromium',
        headless: config.browser?.headless ?? true,
        viewportWidth: config.browser?.viewportWidth || 1280,
        viewportHeight: config.browser?.viewportHeight || 720,
        defaultTimeout: config.options?.timeout || 30000,
        recordVideo: config.options?.recordVideo ?? false,
        screenshotOnFailure: config.options?.screenshotOnFailure ?? true,
        traceEnabled: config.options?.traceEnabled ?? false,
      },
      scriptId: config.scriptId,
    };

    try {
      // Step 1: Create test plan
      const createResult = await this.orchestrator.createTestPlan(createInput);
      
      if (!createResult.success || !createResult.testPlan) {
        return {
          id: uuidv4(),
          name: config.name || 'Unknown',
          status: 'failed',
          success: false,
          error: createResult.error || 'Failed to create test plan',
          progress: 0,
          duration: Date.now() - startTime,
        };
      }

      const testPlan = createResult.testPlan;
      this.runningTests.add(testPlan.id);

      // Step 2: Execute the test plan
      const executeInput: ExecuteTestPlanInput = {
        testPlanId: testPlan.id,
      };

      const executeResult = await this.orchestrator.executeTestPlan(executeInput);

      return {
        id: testPlan.id,
        name: testPlan.name,
        status: executeResult.testPlan.status,
        success: executeResult.success,
        error: executeResult.errors.length > 0 ? executeResult.errors.join('; ') : undefined,
        summary: executeResult.summary,
        progress: 100,
        duration: Date.now() - startTime,
        artifactsPath: executeResult.testPlan.artifactsPath,
        generatedCode: executeResult.testPlan.generatedCode,
        scriptId: executeResult.testPlan.scriptId,
        specPath: executeResult.testPlan.specPath,
        hasExistingSpec: executeResult.testPlan.hasExistingSpec,
      };
    } catch (error) {
      this.logger.error('Test run failed', { error });
      return {
        id: uuidv4(),
        name: config.name || 'Unknown',
        status: 'failed',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        progress: 0,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Get run status
   */
  getRunStatus(testPlanId: string): TestRunResult | undefined {
    const status = this.orchestrator.getExecutionStatus(testPlanId);
    if (!status) return undefined;

    const testPlan = this.orchestrator.getTestPlan(testPlanId);
    if (!testPlan) return undefined;

    return {
      id: testPlan.id,
      name: testPlan.name,
      status: status.status,
      success: status.status === 'completed',
      summary: testPlan.summary,
      progress: status.progress.percentage,
      duration: testPlan.completedAt
        ? testPlan.completedAt.getTime() - (testPlan.startedAt?.getTime() || testPlan.createdAt.getTime())
        : undefined,
      artifactsPath: testPlan.artifactsPath,
      generatedCode: testPlan.generatedCode,
    };
  }

  /**
   * Cancel a running test
   */
  cancelRun(testPlanId: string): TestRunResult | undefined {
    const success = this.orchestrator.cancelExecution(testPlanId);
    this.runningTests.delete(testPlanId);

    const testPlan = this.orchestrator.getTestPlan(testPlanId);
    if (!testPlan) return undefined;

    return {
      id: testPlan.id,
      name: testPlan.name,
      status: testPlan.status,
      success: success,
      summary: testPlan.summary,
      progress: 100,
    };
  }

  /**
   * Retry a failed scenario
   */
  async retryScenario(
    testPlanId: string,
    itemId: string
  ): Promise<TestRunResult | undefined> {
    const result = await this.orchestrator.retryItem(testPlanId, itemId);

    const testPlan = this.orchestrator.getTestPlan(testPlanId);
    if (!testPlan) return undefined;

    return {
      id: testPlan.id,
      name: testPlan.name,
      status: testPlan.status,
      success: result.success,
      error: result.error,
      summary: testPlan.summary,
      progress: testPlan.status === 'running' ? 0 : 100,
    };
  }

  /**
   * List all test runs
   */
  listRuns(filters?: {
    status?: TestPlanStatus[];
    limit?: number;
    offset?: number;
  }): { testPlans: TestPlan[]; total: number } {
    return this.orchestrator.getTestPlans(filters);
  }

  /**
   * Get a specific test run
   */
  getRun(testPlanId: string): TestPlan | undefined {
    return this.orchestrator.getTestPlan(testPlanId);
  }

  /**
   * Delete a test run
   */
  deleteRun(testPlanId: string): boolean {
    this.runningTests.delete(testPlanId);
    return this.orchestrator.deleteTestPlan(testPlanId);
  }

  /**
   * Check if a test is currently running
   */
  isRunning(testPlanId: string): boolean {
    return this.runningTests.has(testPlanId);
  }

  /**
   * Get all running test IDs
   */
  getRunningTests(): string[] {
    return Array.from(this.runningTests);
  }

  /**
   * Register a pre-created test plan for later execution
   * Used by end-to-end flow when parsing/mapping is done separately
   */
  registerTestPlan(testPlan: TestPlan): void {
    this.orchestrator.registerTestPlan(testPlan);
    this.logger.info('Test plan registered', { testPlanId: testPlan.id, name: testPlan.name });
  }

  /**
   * Wait for a test run to complete
   */
  async waitForCompletion(testPlanId: string, timeoutMs: number = 300000): Promise<TestRunResult> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkStatus = () => {
        const result = this.getRunStatus(testPlanId);
        
        if (!result) {
          reject(new Error(`Test run ${testPlanId} not found`));
          return;
        }

        if (!['running', 'draft', 'ready'].includes(result.status)) {
          this.runningTests.delete(testPlanId);
          resolve(result);
          return;
        }

        if (Date.now() - startTime > timeoutMs) {
          reject(new Error(`Test run ${testPlanId} timed out after ${timeoutMs}ms`));
          return;
        }

        // Poll again after delay
        setTimeout(checkStatus, 1000);
      };

      checkStatus();
    });
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Cancel all running tests
    for (const testPlanId of this.runningTests) {
      try {
        this.cancelRun(testPlanId);
      } catch {
        // Ignore errors during cleanup
      }
    }

    this.runningTests.clear();
    this.removeAllListeners();
  }
}

// Singleton instance
let runnerInstance: PlaywrightTestRunner | null = null;

/**
 * Get or create the Playwright test runner instance
 */
export function getPlaywrightTestRunner(llmClient?: ILlmClient): PlaywrightTestRunner {
  if (!runnerInstance) {
    runnerInstance = new PlaywrightTestRunner(llmClient);
  }
  return runnerInstance;
}

/**
 * Reset the runner instance (mainly for testing)
 */
export async function resetPlaywrightTestRunner(): Promise<void> {
  if (runnerInstance) {
    await runnerInstance.cleanup();
    runnerInstance = null;
  }
}
