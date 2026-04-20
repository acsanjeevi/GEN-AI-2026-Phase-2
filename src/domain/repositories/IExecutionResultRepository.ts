/**
 * Execution Result Repository Interface
 * Defines the contract for execution result persistence operations
 * 
 * This is a pure interface with NO infrastructure dependencies
 */

import { TestPlan, ExecutionSummary, TestExecutionItem } from '../models/TestPlan';

/**
 * Execution result - snapshot of a test plan execution
 */
export interface ExecutionResult {
  /** Unique identifier */
  id: string;
  /** Test plan ID this result belongs to */
  testPlanId: string;
  /** Test plan name (denormalized for querying) */
  testPlanName: string;
  /** Feature ID (denormalized) */
  featureId: string;
  /** Feature name (denormalized) */
  featureName: string;
  /** Execution summary */
  summary: ExecutionSummary;
  /** Individual item results */
  items: TestExecutionItem[];
  /** Browser used for execution */
  browser: string;
  /** When execution started */
  startedAt: Date;
  /** When execution completed */
  completedAt: Date;
  /** Execution duration in ms */
  duration: number;
  /** User who initiated the execution */
  executedBy?: string;
  /** Path to artifacts (screenshots, videos, traces) */
  artifactsPath?: string;
  /** Generated Playwright test code */
  generatedCode?: string;
  /** Environment information */
  environment?: Record<string, string>;
  /** Any errors during execution */
  errors: string[];
}

/**
 * Query options for finding execution results
 */
export interface FindExecutionResultsOptions {
  /** Filter by test plan ID */
  testPlanId?: string;
  /** Filter by feature ID */
  featureId?: string;
  /** Filter by executor */
  executedBy?: string;
  /** Filter by date range (after) */
  executedAfter?: Date;
  /** Filter by date range (before) */
  executedBefore?: Date;
  /** Filter by pass rate (minimum) */
  minPassRate?: number;
  /** Filter by pass rate (maximum) */
  maxPassRate?: number;
  /** Pagination: page number */
  page?: number;
  /** Pagination: items per page */
  limit?: number;
  /** Sort field */
  sortBy?: 'startedAt' | 'duration' | 'passRate';
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated result interface
 */
export interface PaginatedExecutionResults {
  items: ExecutionResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Execution statistics
 */
export interface ExecutionStatistics {
  /** Total executions */
  totalExecutions: number;
  /** Total passed */
  totalPassed: number;
  /** Total failed */
  totalFailed: number;
  /** Average pass rate */
  averagePassRate: number;
  /** Average duration */
  averageDuration: number;
  /** Executions per day (last 7 days) */
  executionsPerDay: { date: string; count: number }[];
}

/**
 * Execution Result Repository Interface
 */
export interface IExecutionResultRepository {
  /**
   * Saves an execution result
   * @param result - Execution result to save
   * @returns Saved execution result
   */
  save(result: ExecutionResult): Promise<ExecutionResult>;

  /**
   * Creates execution result from a completed test plan
   * @param testPlan - Completed test plan
   * @param executedBy - User who executed the plan
   * @returns Created execution result
   */
  createFromTestPlan(testPlan: TestPlan, executedBy?: string): Promise<ExecutionResult>;

  /**
   * Finds an execution result by ID
   * @param id - Execution result ID
   * @returns Execution result if found, null otherwise
   */
  findById(id: string): Promise<ExecutionResult | null>;

  /**
   * Finds execution results matching criteria
   * @param options - Query options
   * @returns Paginated execution results
   */
  find(options?: FindExecutionResultsOptions): Promise<PaginatedExecutionResults>;

  /**
   * Gets execution history for a test plan
   * @param testPlanId - Test plan ID
   * @param limit - Maximum results to return
   * @returns Array of execution results
   */
  getHistoryByTestPlan(testPlanId: string, limit?: number): Promise<ExecutionResult[]>;

  /**
   * Gets execution history for a feature
   * @param featureId - Feature ID
   * @param limit - Maximum results to return
   * @returns Array of execution results
   */
  getHistoryByFeature(featureId: string, limit?: number): Promise<ExecutionResult[]>;

  /**
   * Gets the latest execution result for a test plan
   * @param testPlanId - Test plan ID
   * @returns Latest execution result or null
   */
  getLatestByTestPlan(testPlanId: string): Promise<ExecutionResult | null>;

  /**
   * Gets execution statistics for a date range
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Execution statistics
   */
  getStatistics(startDate: Date, endDate: Date): Promise<ExecutionStatistics>;

  /**
   * Deletes an execution result
   * @param id - Execution result ID
   * @returns True if deleted
   */
  delete(id: string): Promise<boolean>;

  /**
   * Deletes all execution results for a test plan
   * @param testPlanId - Test plan ID
   * @returns Number of deleted results
   */
  deleteByTestPlan(testPlanId: string): Promise<number>;

  /**
   * Gets recent execution results
   * @param limit - Maximum results
   * @returns Array of recent results
   */
  getRecent(limit: number): Promise<ExecutionResult[]>;
}
