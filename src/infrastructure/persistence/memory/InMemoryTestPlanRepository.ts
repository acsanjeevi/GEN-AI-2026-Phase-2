/**
 * In-Memory TestPlan Repository
 * Dummy implementation for development and testing
 */

import { v4 as uuidv4 } from 'uuid';
import { TestPlan, TestPlanStatus, createTestPlan } from '../../../domain/models/TestPlan';
import { 
  ITestPlanRepository, 
  FindTestPlansOptions 
} from '../../../domain/repositories/ITestPlanRepository';
import { PaginatedResult } from '../../../domain/repositories/IFeatureRepository';

/**
 * In-Memory TestPlan Repository
 * Stores test plans in memory for development and testing
 */
export class InMemoryTestPlanRepository implements ITestPlanRepository {
  private testPlans: Map<string, TestPlan> = new Map();

  async create(testPlan: TestPlan): Promise<TestPlan> {
    const id = testPlan.id || uuidv4();
    
    const newTestPlan = createTestPlan({
      ...testPlan,
      id,
      createdAt: testPlan.createdAt || new Date(),
    });

    this.testPlans.set(id, newTestPlan);
    return newTestPlan;
  }

  async findById(id: string): Promise<TestPlan | null> {
    return this.testPlans.get(id) || null;
  }

  async find(options?: FindTestPlansOptions): Promise<PaginatedResult<TestPlan>> {
    let plans = Array.from(this.testPlans.values());
    
    // Apply filters
    if (options?.status) {
      plans = plans.filter(p => p.status === options.status);
    }
    
    if (options?.featureId) {
      plans = plans.filter(p => p.feature.id === options.featureId);
    }
    
    if (options?.createdBy) {
      plans = plans.filter(p => p.createdBy === options.createdBy);
    }
    
    if (options?.createdAfter) {
      plans = plans.filter(p => p.createdAt >= options.createdAfter!);
    }
    
    if (options?.createdBefore) {
      plans = plans.filter(p => p.createdAt <= options.createdBefore!);
    }

    // Sort
    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'desc';
    
    plans.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'startedAt':
          const aStarted = a.startedAt?.getTime() || 0;
          const bStarted = b.startedAt?.getTime() || 0;
          comparison = aStarted - bStarted;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Paginate
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const total = plans.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const items = plans.slice(start, start + limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findByFeatureId(featureId: string): Promise<TestPlan[]> {
    return Array.from(this.testPlans.values())
      .filter(p => p.feature.id === featureId);
  }

  async findRunning(): Promise<TestPlan[]> {
    return Array.from(this.testPlans.values())
      .filter(p => p.status === 'running');
  }

  async update(id: string, updates: Partial<TestPlan>): Promise<TestPlan | null> {
    const existing = this.testPlans.get(id);
    if (!existing) {
      return null;
    }

    const updated = createTestPlan({
      ...existing,
      ...updates,
      id, // Preserve original ID
      createdAt: existing.createdAt, // Preserve creation date
    });

    this.testPlans.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.testPlans.delete(id);
  }

  async updateStatus(id: string, status: TestPlanStatus): Promise<TestPlan | null> {
    const existing = this.testPlans.get(id);
    if (!existing) {
      return null;
    }

    const updates: Partial<TestPlan> = { status };
    
    // Set timestamps based on status
    if (status === 'running' && !existing.startedAt) {
      updates.startedAt = new Date();
    } else if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      updates.completedAt = new Date();
    }

    return this.update(id, updates);
  }

  async getRecent(limit: number): Promise<TestPlan[]> {
    const plans = Array.from(this.testPlans.values());
    
    return plans
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async countByStatus(): Promise<Record<TestPlanStatus, number>> {
    const counts: Record<TestPlanStatus, number> = {
      draft: 0,
      ready: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    for (const plan of this.testPlans.values()) {
      counts[plan.status]++;
    }

    return counts;
  }

  /**
   * Clear all test plans (useful for testing)
   */
  clear(): void {
    this.testPlans.clear();
  }
}
