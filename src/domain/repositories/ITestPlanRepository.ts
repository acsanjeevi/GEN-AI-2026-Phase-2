/**
 * TestPlan Repository Interface
 * Defines the contract for test plan persistence operations
 * 
 * This is a pure interface with NO infrastructure dependencies
 */

import { TestPlan, TestPlanStatus } from '../models/TestPlan';
import { PaginatedResult } from './IFeatureRepository';

/**
 * Query options for finding test plans
 */
export interface FindTestPlansOptions {
  /** Filter by status */
  status?: TestPlanStatus;
  /** Filter by feature ID */
  featureId?: string;
  /** Filter by creator */
  createdBy?: string;
  /** Filter by creation date (after) */
  createdAfter?: Date;
  /** Filter by creation date (before) */
  createdBefore?: Date;
  /** Pagination: page number (1-based) */
  page?: number;
  /** Pagination: items per page */
  limit?: number;
  /** Sort field */
  sortBy?: 'name' | 'createdAt' | 'startedAt' | 'status';
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}

/**
 * TestPlan Repository Interface
 * Implementations will handle actual persistence
 */
export interface ITestPlanRepository {
  /**
   * Creates a new test plan
   * @param testPlan - Test plan to create
   * @returns Created test plan with generated ID
   */
  create(testPlan: TestPlan): Promise<TestPlan>;

  /**
   * Finds a test plan by ID
   * @param id - Test plan ID
   * @returns Test plan if found, null otherwise
   */
  findById(id: string): Promise<TestPlan | null>;

  /**
   * Finds test plans matching the given options
   * @param options - Query options
   * @returns Paginated result of test plans
   */
  find(options?: FindTestPlansOptions): Promise<PaginatedResult<TestPlan>>;

  /**
   * Finds test plans by feature ID
   * @param featureId - Feature ID
   * @returns Array of test plans for the feature
   */
  findByFeatureId(featureId: string): Promise<TestPlan[]>;

  /**
   * Finds running test plans
   * @returns Array of running test plans
   */
  findRunning(): Promise<TestPlan[]>;

  /**
   * Updates an existing test plan
   * @param id - Test plan ID
   * @param updates - Partial test plan data to update
   * @returns Updated test plan if found, null otherwise
   */
  update(id: string, updates: Partial<TestPlan>): Promise<TestPlan | null>;

  /**
   * Deletes a test plan by ID
   * @param id - Test plan ID
   * @returns True if deleted, false if not found
   */
  delete(id: string): Promise<boolean>;

  /**
   * Updates test plan status
   * @param id - Test plan ID
   * @param status - New status
   * @returns Updated test plan if found, null otherwise
   */
  updateStatus(id: string, status: TestPlanStatus): Promise<TestPlan | null>;

  /**
   * Gets recent test plans
   * @param limit - Maximum number of plans to return
   * @returns Array of recent test plans
   */
  getRecent(limit: number): Promise<TestPlan[]>;

  /**
   * Counts test plans by status
   * @returns Object with counts per status
   */
  countByStatus(): Promise<Record<TestPlanStatus, number>>;
}
