/**
 * Locator Repository Interface
 * Defines the contract for locator persistence and healing operations
 * 
 * This is a pure interface with NO infrastructure dependencies
 */

import { Locator, LocatorStrategy, LocatorSource } from '../models/Locator';

/**
 * Query options for finding locators
 */
export interface FindLocatorsOptions {
  /** Filter by strategy */
  strategy?: LocatorStrategy;
  /** Filter by source */
  source?: LocatorSource;
  /** Filter by minimum reliability score */
  minReliability?: number;
  /** Filter locators needing healing */
  needsHealing?: boolean;
  /** Pagination: page number */
  page?: number;
  /** Pagination: items per page */
  limit?: number;
}

/**
 * Locator healing record
 */
export interface LocatorHealingRecord {
  /** Healing record ID */
  id: string;
  /** Original locator that failed */
  originalLocator: Locator;
  /** New healed locator */
  healedLocator: Locator;
  /** Reason for healing */
  reason: string;
  /** DOM snapshot at time of failure */
  domSnapshot?: string;
  /** When healing occurred */
  healedAt: Date;
  /** Whether the healed locator was verified */
  verified: boolean;
}

/**
 * Locator Repository Interface
 */
export interface ILocatorRepository {
  /**
   * Saves a locator
   * @param locator - Locator to save
   * @returns Saved locator
   */
  save(locator: Locator): Promise<Locator>;

  /**
   * Finds a locator by ID
   * @param id - Locator ID
   * @returns Locator if found, null otherwise
   */
  findById(id: string): Promise<Locator | null>;

  /**
   * Finds locators by value (selector)
   * @param value - Locator value/selector
   * @returns Array of matching locators
   */
  findByValue(value: string): Promise<Locator[]>;

  /**
   * Finds locators matching criteria
   * @param options - Query options
   * @returns Array of locators
   */
  find(options?: FindLocatorsOptions): Promise<Locator[]>;

  /**
   * Updates a locator
   * @param id - Locator ID
   * @param updates - Updates to apply
   * @returns Updated locator or null
   */
  update(id: string, updates: Partial<Locator>): Promise<Locator | null>;

  /**
   * Deletes a locator
   * @param id - Locator ID
   * @returns True if deleted
   */
  delete(id: string): Promise<boolean>;

  /**
   * Records a successful use of a locator
   * @param id - Locator ID
   * @returns Updated locator
   */
  recordSuccess(id: string): Promise<Locator | null>;

  /**
   * Records a failed use of a locator
   * @param id - Locator ID
   * @returns Updated locator
   */
  recordFailure(id: string): Promise<Locator | null>;

  /**
   * Gets locators that need healing based on failure rate
   * @param failureThreshold - Failure rate threshold (0-1)
   * @returns Array of locators needing healing
   */
  getLocatorsNeedingHealing(failureThreshold?: number): Promise<Locator[]>;

  /**
   * Saves a healing record
   * @param record - Healing record to save
   * @returns Saved healing record
   */
  saveHealingRecord(record: LocatorHealingRecord): Promise<LocatorHealingRecord>;

  /**
   * Gets healing history for a locator
   * @param locatorId - Original locator ID
   * @returns Array of healing records
   */
  getHealingHistory(locatorId: string): Promise<LocatorHealingRecord[]>;

  /**
   * Gets recently healed locators
   * @param limit - Maximum results
   * @returns Array of healing records
   */
  getRecentHealings(limit: number): Promise<LocatorHealingRecord[]>;
}
