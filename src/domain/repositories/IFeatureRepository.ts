/**
 * Feature Repository Interface
 * Defines the contract for feature persistence operations
 * 
 * This is a pure interface with NO infrastructure dependencies
 */

import { Feature } from '../models/Feature';

/**
 * Query options for finding features
 */
export interface FindFeaturesOptions {
  /** Filter by tags */
  tags?: string[];
  /** Filter by name (partial match) */
  nameContains?: string;
  /** Pagination: page number (1-based) */
  page?: number;
  /** Pagination: items per page */
  limit?: number;
  /** Sort field */
  sortBy?: 'name' | 'createdAt';
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Result of a paginated query
 */
export interface PaginatedResult<T> {
  /** Items in current page */
  items: T[];
  /** Total count of items */
  total: number;
  /** Current page number */
  page: number;
  /** Items per page */
  limit: number;
  /** Total number of pages */
  totalPages: number;
}

/**
 * Feature Repository Interface
 * Implementations will handle actual persistence (MongoDB, file system, etc.)
 */
export interface IFeatureRepository {
  /**
   * Creates a new feature
   * @param feature - Feature to create
   * @returns Created feature with generated ID
   */
  create(feature: Feature): Promise<Feature>;

  /**
   * Finds a feature by ID
   * @param id - Feature ID
   * @returns Feature if found, null otherwise
   */
  findById(id: string): Promise<Feature | null>;

  /**
   * Finds a feature by name
   * @param name - Feature name
   * @returns Feature if found, null otherwise
   */
  findByName(name: string): Promise<Feature | null>;

  /**
   * Finds features matching the given options
   * @param options - Query options
   * @returns Paginated result of features
   */
  find(options?: FindFeaturesOptions): Promise<PaginatedResult<Feature>>;

  /**
   * Updates an existing feature
   * @param id - Feature ID
   * @param updates - Partial feature data to update
   * @returns Updated feature if found, null otherwise
   */
  update(id: string, updates: Partial<Feature>): Promise<Feature | null>;

  /**
   * Deletes a feature by ID
   * @param id - Feature ID
   * @returns True if deleted, false if not found
   */
  delete(id: string): Promise<boolean>;

  /**
   * Checks if a feature exists by ID
   * @param id - Feature ID
   * @returns True if exists
   */
  exists(id: string): Promise<boolean>;

  /**
   * Gets all features (use with caution for large datasets)
   * @returns Array of all features
   */
  getAll(): Promise<Feature[]>;

  /**
   * Counts features matching optional criteria
   * @param options - Optional filter options
   * @returns Count of matching features
   */
  count(options?: Pick<FindFeaturesOptions, 'tags' | 'nameContains'>): Promise<number>;
}
