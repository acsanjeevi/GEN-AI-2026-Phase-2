/**
 * Execution DTOs
 * Data Transfer Objects for test execution endpoints
 */

import { 
  TestPlanStatus, 
  ExecutionMode, 
  BrowserConfig, 
  ExecutionSummary,
  TestExecutionItem 
} from '../../domain/models/TestPlan';

// ============================================================================
// Request DTOs
// ============================================================================

/**
 * Request to create and run a test execution
 */
export interface CreateExecutionRequest {
  /** Unique script ID for tracking generated spec files (passed from client) */
  scriptId?: string;
  /** Feature content (Gherkin) or feature ID */
  feature?: string;
  /** Alias for feature - Feature content (Gherkin) */
  featureContent?: string;
  /** Whether feature is raw content or an ID */
  isFeatureContent?: boolean;
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
  options?: {
    maxRetries?: number;
    timeout?: number;
    screenshotOnFailure?: boolean;
    recordVideo?: boolean;
    traceEnabled?: boolean;
  };
  /** Whether to start execution immediately */
  autoStart?: boolean;
  /** User creating the execution */
  createdBy?: string;
}

/**
 * Request to start/resume an existing test plan
 */
export interface StartExecutionRequest {
  /** Test plan ID to start */
  testPlanId: string;
}

/**
 * Request to retry a failed step
 */
export interface RetryStepRequest {
  /** Test plan ID */
  testPlanId: string;
  /** Execution item ID to retry */
  itemId: string;
  /** Optional: Alternative locator to use */
  alternativeLocator?: {
    type: 'css' | 'xpath' | 'text' | 'role' | 'testId' | 'label' | 'placeholder' | 'ref';
    value: string;
  };
  /** Whether to heal the step using LLM */
  useHealing?: boolean;
}

/**
 * Request to cancel execution
 */
export interface CancelExecutionRequest {
  /** Test plan ID to cancel */
  testPlanId: string;
  /** Reason for cancellation */
  reason?: string;
}

/**
 * Request to get execution status
 */
export interface GetExecutionStatusRequest {
  /** Test plan ID */
  testPlanId: string;
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

/**
 * Request to get artifacts for an execution
 */
export interface GetArtifactsRequest {
  /** Test plan ID */
  testPlanId: string;
  /** Optional: Filter by artifact type */
  type?: 'screenshot' | 'video' | 'trace' | 'log' | 'report';
  /** Optional: Filter by item ID */
  itemId?: string;
}

/**
 * Request to download a specific artifact
 */
export interface DownloadArtifactRequest {
  /** Test plan ID */
  testPlanId: string;
  /** Artifact ID or path */
  artifactId: string;
}

// ============================================================================
// Response DTOs
// ============================================================================

/**
 * Artifact information
 */
export interface ArtifactInfo {
  /** Artifact ID */
  id: string;
  /** Artifact type */
  type: 'screenshot' | 'video' | 'trace' | 'log' | 'report';
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
  capturedAt: Date;
  /** Description */
  description?: string;
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
  status?: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
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
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  /** Step count */
  stepCount: number;
  /** Completed step count */
  completedSteps: number;
  /** Step details */
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
  /** Whether an existing spec file was used for execution */
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
  createdAt: Date;
  /** Started timestamp */
  startedAt?: Date;
  /** Completed timestamp */
  completedAt?: Date;
  /** Created by */
  createdBy?: string;
  /** Artifacts path */
  artifactsPath?: string;
  /** Current step being executed */
  currentStep?: {
    itemId: string;
    stepIndex: number;
    stepText: string;
  };
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
  currentStep?: {
    itemId: string;
    stepIndex: number;
    stepText: string;
  };
  /** Last activity timestamp */
  lastActivity: Date;
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
 * Start execution response
 */
export interface StartExecutionResponse {
  /** Test plan ID */
  id: string;
  /** Status (should be 'running') */
  status: TestPlanStatus;
  /** Message */
  message: string;
}

/**
 * Cancel execution response
 */
export interface CancelExecutionResponse {
  /** Test plan ID */
  id: string;
  /** Status (should be 'cancelled') */
  status: TestPlanStatus;
  /** Message */
  message: string;
  /** Summary at time of cancellation */
  summary?: ExecutionSummary;
}

/**
 * Retry step response
 */
export interface RetryStepResponse {
  /** Test plan ID */
  testPlanId: string;
  /** Item ID */
  itemId: string;
  /** New status */
  status: 'pending' | 'running' | 'passed' | 'failed';
  /** Retry count */
  retryCount: number;
  /** Message */
  message: string;
  /** Healed locator (if healing was used) */
  healedLocator?: {
    type: string;
    value: string;
    confidence: number;
  };
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

/**
 * Execution webhook payload (for notifications)
 */
export interface ExecutionWebhookPayload {
  /** Event type */
  event: 'started' | 'step_completed' | 'item_completed' | 'completed' | 'failed' | 'cancelled';
  /** Test plan ID */
  testPlanId: string;
  /** Test plan name */
  testPlanName: string;
  /** Current status */
  status: TestPlanStatus;
  /** Progress */
  progress: number;
  /** Related item (if applicable) */
  item?: ExecutionItemSummary;
  /** Summary (if completed) */
  summary?: ExecutionSummary;
  /** Timestamp */
  timestamp: Date;
  /** Error details (if failed) */
  error?: {
    message: string;
    itemId?: string;
    stepIndex?: number;
  };
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Real-time execution event for SSE/WebSocket
 */
export interface ExecutionEvent {
  /** Event type */
  type: 'status_change' | 'step_start' | 'step_complete' | 'item_complete' | 'error' | 'log';
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
  timestamp: Date;
}

/**
 * Execution options for internal use
 */
export interface ExecutionOptions {
  /** Base URL */
  baseUrl: string;
  /** Browser config */
  browserConfig: BrowserConfig;
  /** Maximum retries */
  maxRetries: number;
  /** Timeout per step (ms) */
  stepTimeout: number;
  /** Delay between steps (ms) */
  stepDelay: number;
  /** Take screenshots */
  takeScreenshots: boolean;
  /** Record video */
  recordVideo: boolean;
  /** Enable tracing */
  enableTracing: boolean;
  /** Stop on first failure */
  stopOnFailure: boolean;
  /** Use LLM healing */
  useLlmHealing: boolean;
  /** Artifacts directory */
  artifactsDir: string;
}

// ============================================================================
// End-to-End Flow DTOs (Phase 9)
// ============================================================================

/**
 * Request for end-to-end flow execution
 */
export interface EndToEndFlowRequest {
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
 * Healing event in the response
 */
export interface HealingEventDto {
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
 * Response from end-to-end flow execution
 */
export interface EndToEndFlowResponse {
  /** Whether the flow completed successfully */
  success: boolean;
  /** Flow ID */
  flowId: string;
  /** Feature name */
  featureName?: string;
  /** Test plan ID (if created) */
  testPlanId?: string;
  /** Execution summary */
  summary?: ExecutionSummary;
  /** Healing events that occurred */
  healingEvents: HealingEventDto[];
  /** Errors encountered */
  errors: string[];
  /** Total duration in milliseconds */
  durationMs: number;
}
