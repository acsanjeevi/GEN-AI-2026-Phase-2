/**
 * TestPlan domain model
 * Represents an execution plan for running tests
 * 
 * This is a pure domain model with NO infrastructure dependencies
 */

import { Feature } from './Feature';
import { Scenario } from './Scenario';
import { MappedStep } from './MappedStep';

/**
 * Test plan status
 */
export type TestPlanStatus = 
  | 'draft'
  | 'ready'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Execution mode for the test plan
 */
export type ExecutionMode = 
  | 'sequential'    // Run tests one by one
  | 'parallel';     // Run tests in parallel

/**
 * Browser configuration for test execution
 */
export interface BrowserConfig {
  /** Browser type */
  browser: 'chromium' | 'firefox' | 'webkit';
  /** Run in headless mode */
  headless: boolean;
  /** Viewport width */
  viewportWidth: number;
  /** Viewport height */
  viewportHeight: number;
  /** Default timeout in milliseconds */
  defaultTimeout: number;
  /** Whether to record video */
  recordVideo: boolean;
  /** Whether to capture screenshots on failure */
  screenshotOnFailure: boolean;
  /** Whether to capture trace */
  traceEnabled: boolean;
}

/**
 * Test execution item - a scenario with its mapped steps
 */
export interface TestExecutionItem {
  /** Unique ID for this execution item */
  id: string;
  /** Scenario to execute */
  scenario: Scenario;
  /** Mapped steps for execution */
  mappedSteps: MappedStep[];
  /** Item status */
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  /** Error message if failed */
  errorMessage?: string;
  /** Execution duration in ms */
  duration?: number;
  /** Retry count */
  retryCount: number;
  /** Maximum retries allowed */
  maxRetries: number;
  /** Screenshots captured during execution */
  screenshots: string[];
  /** Video recording path */
  videoPath?: string;
  /** Trace file path */
  tracePath?: string;
  /** Generated code for this scenario (accumulated from steps) */
  generatedCode?: string;
}

/**
 * Test plan execution result summary
 */
export interface ExecutionSummary {
  /** Total number of scenarios */
  total: number;
  /** Passed scenarios */
  passed: number;
  /** Failed scenarios */
  failed: number;
  /** Skipped scenarios */
  skipped: number;
  /** Total duration in ms */
  duration: number;
  /** Pass rate percentage */
  passRate: number;
}

/**
 * TestPlan domain model
 * Represents a complete test execution plan
 */
export interface TestPlan {
  /** Unique identifier for the test plan */
  id: string;
  
  /** Test plan name */
  name: string;
  
  /** Test plan description */
  description?: string;
  
  /** Feature being tested */
  feature: Feature;
  
  /** Items to execute */
  items: TestExecutionItem[];
  
  /** Current status */
  status: TestPlanStatus;
  
  /** Execution mode */
  executionMode: ExecutionMode;
  
  /** Browser configuration */
  browserConfig: BrowserConfig;
  
  /** Base URL for the application under test */
  baseUrl?: string;
  
  /** Tags to filter scenarios (optional) */
  tagFilter?: string[];
  
  /** When the plan was created */
  createdAt: Date;
  
  /** When execution started */
  startedAt?: Date;
  
  /** When execution completed */
  completedAt?: Date;
  
  /** User who created the plan */
  createdBy?: string;
  
  /** Execution summary (populated after completion) */
  summary?: ExecutionSummary;
  
  /** Generated Playwright test code */
  generatedCode?: string;
  
  /** Artifacts directory path */
  artifactsPath?: string;
  
  /** Unique script ID for tracking generated spec files */
  scriptId?: string;
  
  /** Path to generated spec file */
  specPath?: string;
  
  /** Whether execution used an existing spec file */
  hasExistingSpec?: boolean;
}

/**
 * Default browser configuration
 */
export const DEFAULT_BROWSER_CONFIG: BrowserConfig = {
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
 * Creates a new TestPlan with default values
 * @param partial - Partial test plan data
 * @returns Complete TestPlan object
 */
export function createTestPlan(
  partial: Partial<TestPlan> & { 
    id: string; 
    name: string;
    feature: Feature;
    baseUrl?: string;
  }
): TestPlan {
  return {
    id: partial.id,
    name: partial.name,
    description: partial.description,
    feature: partial.feature,
    items: partial.items ?? [],
    status: partial.status ?? 'draft',
    executionMode: partial.executionMode ?? 'sequential',
    browserConfig: partial.browserConfig ?? { ...DEFAULT_BROWSER_CONFIG },
    baseUrl: partial.baseUrl,
    tagFilter: partial.tagFilter,
    createdAt: partial.createdAt ?? new Date(),
    startedAt: partial.startedAt,
    completedAt: partial.completedAt,
    createdBy: partial.createdBy,
    summary: partial.summary,
    generatedCode: partial.generatedCode,
    artifactsPath: partial.artifactsPath,
    scriptId: partial.scriptId,
    specPath: partial.specPath,
    hasExistingSpec: partial.hasExistingSpec,
  };
}

/**
 * Creates a test execution item from a scenario
 * @param scenario - Scenario to create item for
 * @param mappedSteps - Mapped steps for the scenario
 * @param maxRetries - Maximum retry attempts
 * @returns TestExecutionItem
 */
export function createExecutionItem(
  scenario: Scenario,
  mappedSteps: MappedStep[],
  maxRetries: number = 2
): TestExecutionItem {
  return {
    id: `exec-${scenario.id}`,
    scenario,
    mappedSteps,
    status: 'pending',
    retryCount: 0,
    maxRetries,
    screenshots: [],
  };
}

/**
 * Marks test plan as ready for execution
 * @param plan - Test plan to update
 * @returns Updated test plan
 */
export function markReady(plan: TestPlan): TestPlan {
  return {
    ...plan,
    status: 'ready',
  };
}

/**
 * Marks test plan as running
 * @param plan - Test plan to update
 * @returns Updated test plan
 */
export function markRunning(plan: TestPlan): TestPlan {
  return {
    ...plan,
    status: 'running',
    startedAt: new Date(),
  };
}

/**
 * Marks test plan as completed and calculates summary
 * @param plan - Test plan to update
 * @returns Updated test plan with summary
 */
export function markCompleted(plan: TestPlan): TestPlan {
  const summary = calculateSummary(plan);
  const status: TestPlanStatus = summary.failed > 0 ? 'failed' : 'completed';
  
  return {
    ...plan,
    status,
    completedAt: new Date(),
    summary,
  };
}

/**
 * Marks test plan as cancelled
 * @param plan - Test plan to update
 * @returns Updated test plan
 */
export function markCancelled(plan: TestPlan): TestPlan {
  return {
    ...plan,
    status: 'cancelled',
    completedAt: new Date(),
    summary: calculateSummary(plan),
  };
}

/**
 * Calculates execution summary for a test plan
 * @param plan - Test plan to calculate summary for
 * @returns Execution summary
 */
export function calculateSummary(plan: TestPlan): ExecutionSummary {
  const total = plan.items.length;
  const passed = plan.items.filter((i) => i.status === 'passed').length;
  const failed = plan.items.filter((i) => i.status === 'failed').length;
  const skipped = plan.items.filter((i) => i.status === 'skipped').length;
  const duration = plan.items.reduce((sum, i) => sum + (i.duration ?? 0), 0);
  const passRate = total > 0 ? (passed / total) * 100 : 0;
  
  return {
    total,
    passed,
    failed,
    skipped,
    duration,
    passRate: Math.round(passRate * 100) / 100,
  };
}

/**
 * Gets pending execution items
 * @param plan - Test plan to get items from
 * @returns Array of pending items
 */
export function getPendingItems(plan: TestPlan): TestExecutionItem[] {
  return plan.items.filter((i) => i.status === 'pending');
}

/**
 * Gets failed execution items that can be retried
 * @param plan - Test plan to get items from
 * @returns Array of retriable failed items
 */
export function getRetriableItems(plan: TestPlan): TestExecutionItem[] {
  return plan.items.filter(
    (i) => i.status === 'failed' && i.retryCount < i.maxRetries
  );
}

/**
 * Updates an execution item in the test plan
 * @param plan - Test plan to update
 * @param itemId - ID of item to update
 * @param updates - Partial updates to apply
 * @returns Updated test plan
 */
export function updateExecutionItem(
  plan: TestPlan,
  itemId: string,
  updates: Partial<TestExecutionItem>
): TestPlan {
  return {
    ...plan,
    items: plan.items.map((item) =>
      item.id === itemId ? { ...item, ...updates } : item
    ),
  };
}

/**
 * Checks if test plan can be executed
 * @param plan - Test plan to check
 * @returns True if plan can be executed
 */
export function canExecute(plan: TestPlan): boolean {
  return (
    plan.status === 'ready' &&
    plan.items.length > 0 &&
    plan.items.every((i) => i.mappedSteps.length > 0)
  );
}

/**
 * Gets the current progress percentage
 * @param plan - Test plan to get progress for
 * @returns Progress percentage (0-100)
 */
export function getProgress(plan: TestPlan): number {
  if (plan.items.length === 0) return 0;
  
  const completed = plan.items.filter(
    (i) => ['passed', 'failed', 'skipped'].includes(i.status)
  ).length;
  
  return Math.round((completed / plan.items.length) * 100);
}
