/**
 * Execution Context Service
 * Manages browser session state, snapshot cache, and execution history
 * for step-by-step UI automation
 */

import { v4 as uuidv4 } from 'uuid';
import { AccessibilityNode } from '../../utils/locator/snapshot-parser';
import { UIAction, MappedStep } from '../../domain/models/MappedStep';
import { Locator } from '../../domain/models/Locator';

/**
 * Page state information
 */
export interface PageState {
  /** Current page URL */
  url: string;
  /** Page title */
  title?: string;
  /** Timestamp when state was captured */
  capturedAt: Date;
  /** Accessibility snapshot (if captured) */
  snapshot?: AccessibilityNode[];
  /** Raw snapshot string */
  rawSnapshot?: string;
  /** Screenshot data URL (if captured) */
  screenshot?: string;
}

/**
 * Step execution record
 */
export interface StepExecutionRecord {
  /** Unique execution ID */
  id: string;
  /** Reference to the mapped step */
  mappedStepId: string;
  /** Action that was executed */
  action: UIAction;
  /** Resolved locator used */
  resolvedLocator?: Locator;
  /** Ref used for the action */
  ref?: string;
  /** Execution status */
  status: 'pending' | 'executing' | 'success' | 'failed' | 'skipped';
  /** Error message if failed */
  error?: string;
  /** Duration in milliseconds */
  durationMs?: number;
  /** Page state before execution */
  beforeState?: PageState;
  /** Page state after execution */
  afterState?: PageState;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Execution session
 */
export interface ExecutionSession {
  /** Session ID */
  id: string;
  /** Session name/description */
  name?: string;
  /** Feature ID being executed */
  featureId?: string;
  /** Scenario ID being executed */
  scenarioId?: string;
  /** Session status */
  status: 'active' | 'paused' | 'completed' | 'aborted';
  /** Creation timestamp */
  createdAt: Date;
  /** Last activity timestamp */
  lastActivityAt: Date;
  /** Current page state */
  currentPageState?: PageState;
  /** Execution history */
  executionHistory: StepExecutionRecord[];
  /** Variable storage (for data tables, etc.) */
  variables: Map<string, unknown>;
  /** Configuration */
  config: ExecutionConfig;
}

/**
 * Execution configuration
 */
export interface ExecutionConfig {
  /** Default timeout for actions (ms) */
  defaultTimeout: number;
  /** Whether to take screenshots on failure */
  screenshotOnFailure: boolean;
  /** Whether to take screenshots on success */
  screenshotOnSuccess: boolean;
  /** Whether to refresh snapshot before each action */
  refreshSnapshotBeforeAction: boolean;
  /** Retry count for failed actions */
  retryCount: number;
  /** Delay between retries (ms) */
  retryDelay: number;
  /** Headless mode */
  headless: boolean;
  /** Browser type */
  browserType: 'chromium' | 'firefox' | 'webkit';
}

/**
 * Default execution configuration
 */
export const DEFAULT_EXECUTION_CONFIG: ExecutionConfig = {
  defaultTimeout: 30000,
  screenshotOnFailure: true,
  screenshotOnSuccess: false,
  refreshSnapshotBeforeAction: true,
  retryCount: 2,
  retryDelay: 1000,
  headless: false,
  browserType: 'chromium',
};

/**
 * Execution Context Service
 * Manages execution sessions and state
 */
export class ExecutionContextService {
  private sessions: Map<string, ExecutionSession> = new Map();
  private activeSessionId: string | null = null;

  /**
   * Create a new execution session
   */
  createSession(options?: {
    name?: string;
    featureId?: string;
    scenarioId?: string;
    config?: Partial<ExecutionConfig>;
  }): ExecutionSession {
    const session: ExecutionSession = {
      id: uuidv4(),
      name: options?.name,
      featureId: options?.featureId,
      scenarioId: options?.scenarioId,
      status: 'active',
      createdAt: new Date(),
      lastActivityAt: new Date(),
      executionHistory: [],
      variables: new Map(),
      config: {
        ...DEFAULT_EXECUTION_CONFIG,
        ...options?.config,
      },
    };

    this.sessions.set(session.id, session);
    this.activeSessionId = session.id;
    
    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): ExecutionSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get the active session
   */
  getActiveSession(): ExecutionSession | undefined {
    if (!this.activeSessionId) return undefined;
    return this.sessions.get(this.activeSessionId);
  }

  /**
   * Set active session
   */
  setActiveSession(sessionId: string): boolean {
    if (!this.sessions.has(sessionId)) return false;
    this.activeSessionId = sessionId;
    return true;
  }

  /**
   * Update page state for a session
   */
  updatePageState(sessionId: string, state: PageState): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    session.currentPageState = state;
    session.lastActivityAt = new Date();
  }

  /**
   * Get current page state
   */
  getPageState(sessionId: string): PageState | undefined {
    const session = this.sessions.get(sessionId);
    return session?.currentPageState;
  }

  /**
   * Get cached snapshot
   */
  getSnapshot(sessionId: string): AccessibilityNode[] | undefined {
    const session = this.sessions.get(sessionId);
    return session?.currentPageState?.snapshot;
  }

  /**
   * Get raw snapshot string (for LLM-based resolution)
   */
  getRawSnapshot(sessionId: string): string | undefined {
    const session = this.sessions.get(sessionId);
    return session?.currentPageState?.rawSnapshot;
  }

  /**
   * Update snapshot
   */
  updateSnapshot(
    sessionId: string, 
    snapshot: AccessibilityNode[], 
    rawSnapshot?: string
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    if (!session.currentPageState) {
      session.currentPageState = {
        url: '',
        capturedAt: new Date(),
      };
    }

    session.currentPageState.snapshot = snapshot;
    session.currentPageState.rawSnapshot = rawSnapshot;
    session.currentPageState.capturedAt = new Date();
    session.lastActivityAt = new Date();
  }

  /**
   * Record step execution start
   */
  recordExecutionStart(
    sessionId: string,
    mappedStepId: string,
    action: UIAction,
    resolvedLocator?: Locator,
    ref?: string
  ): StepExecutionRecord {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const record: StepExecutionRecord = {
      id: uuidv4(),
      mappedStepId,
      action,
      resolvedLocator,
      ref,
      status: 'executing',
      beforeState: session.currentPageState 
        ? { ...session.currentPageState }
        : undefined,
      timestamp: new Date(),
    };

    session.executionHistory.push(record);
    session.lastActivityAt = new Date();

    return record;
  }

  /**
   * Record step execution completion
   */
  recordExecutionComplete(
    sessionId: string,
    recordId: string,
    success: boolean,
    error?: string,
    afterState?: PageState
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const record = session.executionHistory.find(r => r.id === recordId);
    if (!record) throw new Error(`Execution record ${recordId} not found`);

    record.status = success ? 'success' : 'failed';
    record.error = error;
    record.afterState = afterState;
    record.durationMs = Date.now() - record.timestamp.getTime();
    
    session.lastActivityAt = new Date();
  }

  /**
   * Get execution history for a session
   */
  getExecutionHistory(sessionId: string): StepExecutionRecord[] {
    const session = this.sessions.get(sessionId);
    return session?.executionHistory || [];
  }

  /**
   * Get last N execution records
   */
  getRecentExecutions(sessionId: string, count: number = 5): StepExecutionRecord[] {
    const history = this.getExecutionHistory(sessionId);
    return history.slice(-count);
  }

  /**
   * Set a variable in session context
   */
  setVariable(sessionId: string, name: string, value: unknown): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    
    session.variables.set(name, value);
    session.lastActivityAt = new Date();
  }

  /**
   * Get a variable from session context
   */
  getVariable<T = unknown>(sessionId: string, name: string): T | undefined {
    const session = this.sessions.get(sessionId);
    return session?.variables.get(name) as T | undefined;
  }

  /**
   * Get all variables
   */
  getAllVariables(sessionId: string): Map<string, unknown> {
    const session = this.sessions.get(sessionId);
    return session?.variables || new Map();
  }

  /**
   * Pause a session
   */
  pauseSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    
    session.status = 'paused';
    session.lastActivityAt = new Date();
  }

  /**
   * Resume a session
   */
  resumeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    
    session.status = 'active';
    session.lastActivityAt = new Date();
  }

  /**
   * Complete a session
   */
  completeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    
    session.status = 'completed';
    session.lastActivityAt = new Date();

    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null;
    }
  }

  /**
   * Abort a session
   */
  abortSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    
    session.status = 'aborted';
    session.lastActivityAt = new Date();

    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null;
    }
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): boolean {
    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null;
    }
    return this.sessions.delete(sessionId);
  }

  /**
   * Get session summary
   */
  getSessionSummary(sessionId: string): {
    totalSteps: number;
    successCount: number;
    failedCount: number;
    pendingCount: number;
    executingCount: number;
    skippedCount: number;
    totalDurationMs: number;
  } | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    const history = session.executionHistory;
    
    return {
      totalSteps: history.length,
      successCount: history.filter(r => r.status === 'success').length,
      failedCount: history.filter(r => r.status === 'failed').length,
      pendingCount: history.filter(r => r.status === 'pending').length,
      executingCount: history.filter(r => r.status === 'executing').length,
      skippedCount: history.filter(r => r.status === 'skipped').length,
      totalDurationMs: history.reduce((sum, r) => sum + (r.durationMs || 0), 0),
    };
  }

  /**
   * List all sessions
   */
  listSessions(): ExecutionSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Clear all sessions
   */
  clearAllSessions(): void {
    this.sessions.clear();
    this.activeSessionId = null;
  }
}

// Singleton instance
let executionContextInstance: ExecutionContextService | null = null;

/**
 * Get or create the execution context service instance
 */
export function getExecutionContext(): ExecutionContextService {
  if (!executionContextInstance) {
    executionContextInstance = new ExecutionContextService();
  }
  return executionContextInstance;
}

/**
 * Reset the execution context (mainly for testing)
 */
export function resetExecutionContext(): void {
  executionContextInstance?.clearAllSessions();
  executionContextInstance = null;
}
