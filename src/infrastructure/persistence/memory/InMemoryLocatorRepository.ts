/**
 * In-Memory Locator Repository
 * Dummy implementation for development and testing
 */

import { v4 as uuidv4 } from 'uuid';
import { Locator, createLocator } from '../../../domain/models/Locator';
import { 
  ILocatorRepository,
  FindLocatorsOptions,
  LocatorHealingRecord,
} from '../../../domain/repositories/ILocatorRepository';

/**
 * Default failure threshold for healing
 */
const DEFAULT_FAILURE_THRESHOLD = 0.3;

/**
 * In-Memory Locator Repository
 * Stores locators in memory for development and testing
 */
export class InMemoryLocatorRepository implements ILocatorRepository {
  private locators: Map<string, Locator> = new Map();
  private healingRecords: Map<string, LocatorHealingRecord> = new Map();

  async save(locator: Locator): Promise<Locator> {
    const id = locator.id || uuidv4();
    const savedLocator = createLocator({ ...locator, id });
    this.locators.set(id, savedLocator);
    return savedLocator;
  }

  async findById(id: string): Promise<Locator | null> {
    return this.locators.get(id) || null;
  }

  async findByValue(value: string): Promise<Locator[]> {
    return Array.from(this.locators.values())
      .filter(l => l.value === value);
  }

  async find(options?: FindLocatorsOptions): Promise<Locator[]> {
    let locators = Array.from(this.locators.values());
    
    if (options?.strategy) {
      locators = locators.filter(l => l.strategy === options.strategy);
    }
    
    if (options?.source) {
      locators = locators.filter(l => l.source === options.source);
    }
    
    if (options?.minReliability !== undefined) {
      locators = locators.filter(l => {
        const total = l.successCount + l.failureCount;
        if (total === 0) return true; // No data, include it
        const reliability = l.successCount / total;
        return reliability >= options.minReliability!;
      });
    }
    
    if (options?.needsHealing) {
      locators = locators.filter(l => {
        const total = l.successCount + l.failureCount;
        if (total === 0) return false;
        const failureRate = l.failureCount / total;
        return failureRate >= DEFAULT_FAILURE_THRESHOLD;
      });
    }

    // Pagination
    const page = options?.page || 1;
    const limit = options?.limit || 100;
    const start = (page - 1) * limit;
    
    return locators.slice(start, start + limit);
  }

  async update(id: string, updates: Partial<Locator>): Promise<Locator | null> {
    const existing = this.locators.get(id);
    if (!existing) {
      return null;
    }

    const updated = createLocator({
      ...existing,
      ...updates,
      id,
    });

    this.locators.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.locators.delete(id);
  }

  async recordSuccess(id: string): Promise<Locator | null> {
    const existing = this.locators.get(id);
    if (!existing) {
      return null;
    }

    return this.update(id, {
      successCount: existing.successCount + 1,
      lastValidated: new Date(),
    });
  }

  async recordFailure(id: string): Promise<Locator | null> {
    const existing = this.locators.get(id);
    if (!existing) {
      return null;
    }

    return this.update(id, {
      failureCount: existing.failureCount + 1,
      lastValidated: new Date(),
    });
  }

  async getLocatorsNeedingHealing(failureThreshold?: number): Promise<Locator[]> {
    const threshold = failureThreshold ?? DEFAULT_FAILURE_THRESHOLD;
    
    return Array.from(this.locators.values()).filter(l => {
      const total = l.successCount + l.failureCount;
      if (total === 0) return false;
      const failureRate = l.failureCount / total;
      return failureRate >= threshold;
    });
  }

  async saveHealingRecord(record: LocatorHealingRecord): Promise<LocatorHealingRecord> {
    const id = record.id || uuidv4();
    const savedRecord = { ...record, id };
    this.healingRecords.set(id, savedRecord);
    return savedRecord;
  }

  async getHealingHistory(locatorId: string): Promise<LocatorHealingRecord[]> {
    return Array.from(this.healingRecords.values())
      .filter(r => r.originalLocator.id === locatorId)
      .sort((a, b) => b.healedAt.getTime() - a.healedAt.getTime());
  }

  async getRecentHealings(limit: number): Promise<LocatorHealingRecord[]> {
    return Array.from(this.healingRecords.values())
      .sort((a, b) => b.healedAt.getTime() - a.healedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Clear all data (useful for testing)
   */
  clear(): void {
    this.locators.clear();
    this.healingRecords.clear();
  }
}
