/**
 * Execution Types
 * Types matching backend execution DTOs
 */

// ============================================================================
// Status & Mode Types
// ============================================================================

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
 * Execution item status
 */
export type ExecutionItemStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

/**
 * Execution mode for the test plan
 */
export type ExecutionMode = 'sequential' | 'parallel';

// ============================================================================
// Browser Configuration
// ============================================================================

/**
 * Browser type
 */
export type BrowserType = 'chromium' | 'firefox' | 'webkit';

/**
 * Browser configuration for test execution
 */
export interface BrowserConfig {
  /** Browser type */
  browser: BrowserType;
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
 * Execution options
 */
export interface ExecutionOptions {
  /** Maximum retries per scenario */
  maxRetries: number;
  /** Timeout per step in milliseconds */
  timeout: number;
  /** Take screenshots on failure */
  screenshotOnFailure: boolean;
  /** Record video */
  recordVideo: boolean;
  /** Enable tracing */
  traceEnabled: boolean;
}

// ============================================================================
// Request DTOs
// ============================================================================

/**
 * Request to create and run a test execution
 */
export interface CreateExecutionRequest {
  /** Unique script ID for tracking generated spec files */
  scriptId?: string;
  /** Feature content (Gherkin) */
  feature?: string;
  /** Alias for feature - Feature content (Gherkin) */
  featureContent?: string;
  /** Test plan name */
  name?: string;
  /** Test plan description */
  description?: string;
  /** Base URL for the application */
  baseUrl: string;
  /** Execution mode */
  executionMode?: ExecutionMode;
  /** Browser configuration overrides */
  browserConfig?: Partial<BrowserConfig>;
  /** Alias for browserConfig */
  browser?: Partial<BrowserConfig>;
  /** Tags to filter scenarios */
  tags?: string[];
  /** Maximum retries per scenario */
  maxRetries?: number;
  /** Execution options */
  options?: Partial<ExecutionOptions>;
  /** Whether to start execution immediately */
  autoStart?: boolean;
}

/**
 * Request to list executions with filters
 */
export interface ListExecutionsRequest {
  /** Filter by status */
  status?: TestPlanStatus | TestPlanStatus[];
  /** Filter by feature ID */
  featureId?: string;
  /** Filter by creator */
  createdBy?: string;
  /** Filter by date range - start */
  fromDate?: string;
  /** Filter by date range - end */
  toDate?: string;
  /** Page number (1-based) */
  page?: number;
  /** Items per page */
  limit?: number;
  /** Sort field */
  sortBy?: 'createdAt' | 'startedAt' | 'completedAt' | 'name';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Response DTOs
// ============================================================================

/**
 * Execution summary statistics
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
 * Step detail information
 */
export interface StepDetail {
  /** Step keyword (Given, When, Then, And, But) */
  keyword: string;
  /** Step text */
  text: string;
  /** Step status */
  status?: ExecutionItemStatus;
  /** Duration in ms */
  duration?: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Simplified execution item for responses
 */
export interface ExecutionItemSummary {
  /** Item ID */
  id: string;
  /** Scenario name */
  scenarioName: string;
  /** Scenario tags */
  tags: string[];
  /** Item status */
  status: ExecutionItemStatus;
  /** Step count */
  stepCount: number;
  /** Completed step count */
  completedSteps: number;
  /** Step details (optional - populated when available) */
  steps?: StepDetail[];
  /** Error message if failed */
  errorMessage?: string;
  /** Duration in ms */
  duration?: number;
  /** Retry count */
  retryCount: number;
  /** Has screenshots */
  hasScreenshots: boolean;
  /** Has video */
  hasVideo: boolean;
  /** Generated code for this scenario */
  generatedCode?: string;
}

/**
 * Current step being executed
 */
export interface CurrentStepInfo {
  /** Item ID */
  itemId: string;
  /** Step index */
  stepIndex: number;
  /** Step text */
  stepText: string;
}

/**
 * Test plan execution response
 */
export interface ExecutionResponse {
  /** Test plan ID */
  id: string;
  /** Test plan name */
  name: string;
  /** Description */
  description?: string;
  /** Feature name */
  featureName: string;
  /** Feature ID */
  featureId?: string;
  /** Unique script ID for tracking generated spec files */
  scriptId?: string;
  /** Path to generated spec file */
  specPath?: string;
  /** Whether an existing spec file was used */
  hasExistingSpec?: boolean;
  /** Current status */
  status: TestPlanStatus;
  /** Execution mode */
  executionMode: ExecutionMode;
  /** Browser configuration */
  browserConfig: BrowserConfig;
  /** Execution items */
  items: ExecutionItemSummary[];
  /** Progress percentage (0-100) */
  progress: number;
  /** Execution summary (if completed) */
  summary?: ExecutionSummary;
  /** Created timestamp */
  createdAt: string;
  /** Started timestamp */
  startedAt?: string;
  /** Completed timestamp */
  completedAt?: string;
  /** Created by */
  createdBy?: string;
  /** Artifacts path */
  artifactsPath?: string;
  /** Current step being executed */
  currentStep?: CurrentStepInfo;
}

/**
 * Execution status response (lightweight)
 */
export interface ExecutionStatusResponse {
  /** Test plan ID */
  id: string;
  /** Test plan name */
  name: string;
  /** Current status */
  status: TestPlanStatus;
  /** Progress percentage */
  progress: number;
  /** Summary (if available) */
  summary?: ExecutionSummary;
  /** Current step being executed */
  currentStep?: CurrentStepInfo;
  /** Last activity timestamp */
  lastActivity: string;
  /** Estimated time remaining (ms) */
  estimatedTimeRemaining?: number;
  /** Error details if failed */
  error?: {
    itemId: string;
    stepIndex: number;
    message: string;
    screenshot?: string;
  };
}

/**
 * Create execution response
 */
export interface CreateExecutionResponse {
  /** Created test plan */
  execution: ExecutionResponse;
  /** Message */
  message: string;
  /** Whether execution has started */
  started: boolean;
}

/**
 * List executions response
 */
export interface ListExecutionsResponse {
  /** List of executions */
  executions: ExecutionResponse[];
  /** Total count */
  total: number;
  /** Current page */
  page: number;
  /** Items per page */
  limit: number;
  /** Total pages */
  totalPages: number;
  /** Has more pages */
  hasMore: boolean;
}

// ============================================================================
// Artifact Types
// ============================================================================

/**
 * Artifact type
 */
export type ArtifactType = 'screenshot' | 'video' | 'trace' | 'log' | 'report' | 'spec';

/**
 * Artifact information
 */
export interface ArtifactInfo {
  /** Artifact ID */
  id: string;
  /** Artifact type */
  type: ArtifactType;
  /** File name */
  fileName: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
  /** File path or URL */
  path: string;
  /** Related item ID (scenario) */
  itemId?: string;
  /** Related step ID */
  stepId?: string;
  /** Capture timestamp */
  capturedAt: string;
  /** Description */
  description?: string;
}

/**
 * Get artifacts response
 */
export interface GetArtifactsResponse {
  /** Test plan ID */
  testPlanId: string;
  /** Artifacts list */
  artifacts: ArtifactInfo[];
  /** Total count */
  total: number;
  /** Total size in bytes */
  totalSize: number;
}

// ============================================================================
// Real-time Event Types
// ============================================================================

/**
 * Execution event type for real-time updates
 */
export type ExecutionEventType =
  | 'status_change'
  | 'step_start'
  | 'step_complete'
  | 'item_complete'
  | 'error'
  | 'log';

/**
 * Real-time execution event
 */
export interface ExecutionEvent {
  /** Event type */
  type: ExecutionEventType;
  /** Test plan ID */
  testPlanId: string;
  /** Item ID (if applicable) */
  itemId?: string;
  /** Step index (if applicable) */
  stepIndex?: number;
  /** Event data */
  data: {
    status?: string;
    message?: string;
    progress?: number;
    duration?: number;
    screenshot?: string;
    error?: string;
  };
  /** Timestamp */
  timestamp: string;
}
