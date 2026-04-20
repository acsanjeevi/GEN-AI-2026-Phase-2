/**
 * MCP Execution DTOs
 * Request and Response data transfer objects for MCP tool execution
 */

// ============================================================================
// Session DTOs
// ============================================================================

/**
 * Request to create a new execution session
 */
export interface CreateSessionRequest {
  /** Session name (optional) */
  name?: string;
  /** Feature ID to associate with session */
  featureId?: string;
  /** Scenario ID to associate with session */
  scenarioId?: string;
  /** Configuration overrides */
  config?: {
    defaultTimeout?: number;
    screenshotOnFailure?: boolean;
    screenshotOnSuccess?: boolean;
    headless?: boolean;
    browserType?: 'chromium' | 'firefox' | 'webkit';
  };
}

/**
 * Response from session creation
 */
export interface CreateSessionResponse {
  /** Session ID */
  sessionId: string;
  /** Session status */
  status: 'active' | 'paused' | 'completed' | 'aborted';
  /** Creation timestamp */
  createdAt: string;
}

/**
 * Session info response
 */
export interface SessionInfoResponse {
  /** Session ID */
  sessionId: string;
  /** Session name */
  name?: string;
  /** Session status */
  status: 'active' | 'paused' | 'completed' | 'aborted';
  /** Associated feature */
  featureId?: string;
  /** Associated scenario */
  scenarioId?: string;
  /** Creation timestamp */
  createdAt: string;
  /** Last activity timestamp */
  lastActivityAt: string;
  /** Current page URL */
  currentUrl?: string;
  /** Current page title */
  currentTitle?: string;
  /** Execution summary */
  summary: {
    totalSteps: number;
    successCount: number;
    failedCount: number;
    pendingCount: number;
  };
}

// ============================================================================
// Navigation DTOs
// ============================================================================

/**
 * Request to navigate to a URL
 */
export interface NavigateRequest {
  /** Session ID */
  sessionId: string;
  /** URL to navigate to */
  url: string;
  /** Wait until condition */
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  /** Timeout in milliseconds */
  timeout?: number;
  /** Whether to capture snapshot after navigation */
  captureSnapshot?: boolean;
}

/**
 * Response from navigation
 */
export interface NavigateResponse {
  /** Whether navigation was successful */
  success: boolean;
  /** Final URL after navigation */
  url?: string;
  /** Page title */
  title?: string;
  /** Error message if failed */
  error?: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Whether snapshot was captured */
  snapshotCaptured: boolean;
}

/**
 * Request for history navigation
 */
export interface HistoryNavigateRequest {
  /** Session ID */
  sessionId: string;
  /** Direction */
  direction: 'back' | 'forward';
  /** Whether to capture snapshot */
  captureSnapshot?: boolean;
}

// ============================================================================
// Snapshot DTOs
// ============================================================================

/**
 * Request to capture snapshot
 */
export interface CaptureSnapshotRequest {
  /** Session ID */
  sessionId: string;
  /** Include hidden elements */
  includeHidden?: boolean;
  /** Also capture screenshot */
  captureScreenshot?: boolean;
  /** Screenshot options */
  screenshotOptions?: {
    filename?: string;
    fullPage?: boolean;
  };
}

/**
 * Snapshot statistics
 */
export interface SnapshotStatsDto {
  totalNodes: number;
  interactiveElements: number;
  formElements: number;
  links: number;
  buttons: number;
  images: number;
  maxDepth: number;
}

/**
 * Response from snapshot capture
 */
export interface CaptureSnapshotResponse {
  /** Whether capture was successful */
  success: boolean;
  /** Current page URL */
  url?: string;
  /** Page title */
  title?: string;
  /** Raw snapshot string (accessibility tree) */
  rawSnapshot?: string;
  /** Error message if failed */
  error?: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Statistics */
  stats?: SnapshotStatsDto;
  /** Whether screenshot was captured */
  screenshotCaptured: boolean;
}

/**
 * Request to search snapshot
 */
export interface SearchSnapshotRequest {
  /** Session ID */
  sessionId: string;
  /** Search query */
  query: string;
  /** Filter by role */
  role?: string;
  /** Minimum confidence (0-1) */
  minConfidence?: number;
  /** Maximum results */
  maxResults?: number;
}

/**
 * Search result item
 */
export interface SearchResultItem {
  ref?: string;
  role: string;
  name?: string;
  confidence: number;
  path: number[];
}

/**
 * Response from snapshot search
 */
export interface SearchSnapshotResponse {
  /** Whether search was successful */
  success: boolean;
  /** Search results */
  results: SearchResultItem[];
  /** Total results found */
  totalResults: number;
  /** Error message if failed */
  error?: string;
}

// ============================================================================
// Action Execution DTOs
// ============================================================================

/**
 * UI Action DTO for requests
 */
export interface UIActionDto {
  /** Action type */
  type: 'navigate' | 'click' | 'type' | 'fill' | 'select' | 'check' | 'uncheck' |
    'hover' | 'drag' | 'scroll' | 'wait' | 'assert' | 'screenshot' | 'press' |
    'upload' | 'download' | 'clear' | 'focus' | 'blur';
  /** Action value (URL, text to type, etc.) */
  value?: string;
  /** Target element description */
  target?: string;
  /** Element reference (if already resolved) */
  ref?: string;
  /** Action description */
  description?: string;
  /** Timeout override */
  timeout?: number;
  /** Additional options */
  options?: Record<string, unknown>;
}

/**
 * Request to execute a single action
 */
export interface ExecuteActionRequest {
  /** Session ID */
  sessionId: string;
  /** The action to execute */
  action: UIActionDto;
  /** Mapped step ID (for tracking) */
  mappedStepId?: string;
  /** Whether to refresh snapshot before execution */
  refreshSnapshot?: boolean;
}

/**
 * Locator resolution info
 */
export interface LocatorResolutionDto {
  resolved: boolean;
  ref?: string;
  confidence: number;
  element?: {
    role: string;
    name?: string;
    ref?: string;
  };
  alternatives?: Array<{
    ref?: string;
    role: string;
    name?: string;
    confidence: number;
  }>;
  failureReason?: string;
}

/**
 * Response from action execution
 */
export interface ExecuteActionResponse {
  /** Whether execution was successful */
  success: boolean;
  /** Execution ID */
  executionId: string;
  /** Error message if failed */
  error?: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Locator resolution info */
  locatorResolution?: LocatorResolutionDto;
  /** Current page URL after action */
  currentUrl?: string;
}

/**
 * Request to execute multiple actions
 */
export interface ExecuteActionsRequest {
  /** Session ID */
  sessionId: string;
  /** Actions to execute */
  actions: UIActionDto[];
  /** Stop on first failure */
  stopOnFailure?: boolean;
}

/**
 * Response from multiple action execution
 */
export interface ExecuteActionsResponse {
  /** Whether all executions were successful */
  success: boolean;
  /** Total actions */
  totalActions: number;
  /** Successful actions */
  successCount: number;
  /** Failed actions */
  failedCount: number;
  /** Individual results */
  results: Array<{
    index: number;
    success: boolean;
    executionId: string;
    error?: string;
    durationMs: number;
  }>;
  /** Total duration */
  totalDurationMs: number;
}

// ============================================================================
// Execution History DTOs
// ============================================================================

/**
 * Execution record DTO
 */
export interface ExecutionRecordDto {
  id: string;
  mappedStepId: string;
  action: UIActionDto;
  status: 'pending' | 'executing' | 'success' | 'failed' | 'skipped';
  error?: string;
  durationMs?: number;
  timestamp: string;
  beforeUrl?: string;
  afterUrl?: string;
}

/**
 * Response with execution history
 */
export interface ExecutionHistoryResponse {
  /** Session ID */
  sessionId: string;
  /** Execution records */
  records: ExecutionRecordDto[];
  /** Total records */
  totalRecords: number;
  /** Summary */
  summary: {
    totalSteps: number;
    successCount: number;
    failedCount: number;
    pendingCount: number;
    executingCount: number;
    skippedCount: number;
    totalDurationMs: number;
  };
}

// ============================================================================
// Error Response
// ============================================================================

/**
 * Standard error response
 */
export interface McpErrorResponse {
  success: false;
  error: string;
  errorCode?: string;
  details?: unknown;
}
