/**
 * In-Memory Execution Result Repository
 * Dummy implementation for development and testing
 */

import { v4 as uuidv4 } from 'uuid';
import { TestPlan } from '../../../domain/models/TestPlan';
import { 
  IExecutionResultRepository,
  ExecutionResult,
  FindExecutionResultsOptions,
  PaginatedExecutionResults,
  ExecutionStatistics,
} from '../../../domain/repositories/IExecutionResultRepository';

/**
 * In-Memory Execution Result Repository
 * Stores execution results in memory for development and testing
 */
export class InMemoryExecutionResultRepository implements IExecutionResultRepository {
  private results: Map<string, ExecutionResult> = new Map();

  async save(result: ExecutionResult): Promise<ExecutionResult> {
    const id = result.id || uuidv4();
    const savedResult = { ...result, id };
    this.results.set(id, savedResult);
    return savedResult;
  }

  async createFromTestPlan(testPlan: TestPlan, executedBy?: string): Promise<ExecutionResult> {
    if (!testPlan.startedAt || !testPlan.completedAt) {
      throw new Error('Test plan must have startedAt and completedAt dates');
    }

    const result: ExecutionResult = {
      id: uuidv4(),
      testPlanId: testPlan.id,
      testPlanName: testPlan.name,
      featureId: testPlan.feature.id,
      featureName: testPlan.feature.name,
      summary: testPlan.summary || {
        total: testPlan.items.length,
        passed: testPlan.items.filter(i => i.status === 'passed').length,
        failed: testPlan.items.filter(i => i.status === 'failed').length,
        skipped: testPlan.items.filter(i => i.status === 'skipped').length,
        duration: testPlan.items.reduce((sum, i) => sum + (i.duration || 0), 0),
        passRate: 0,
      },
      items: testPlan.items,
      browser: testPlan.browserConfig.browser,
      startedAt: testPlan.startedAt,
      completedAt: testPlan.completedAt,
      duration: testPlan.completedAt.getTime() - testPlan.startedAt.getTime(),
      executedBy,
      artifactsPath: testPlan.artifactsPath,
      generatedCode: testPlan.generatedCode,
      errors: testPlan.items
        .filter(i => i.errorMessage)
        .map(i => i.errorMessage!),
    };

    // Calculate pass rate
    if (result.summary.total > 0) {
      result.summary.passRate = (result.summary.passed / result.summary.total) * 100;
    }

    return this.save(result);
  }

  async findById(id: string): Promise<ExecutionResult | null> {
    return this.results.get(id) || null;
  }

  async find(options?: FindExecutionResultsOptions): Promise<PaginatedExecutionResults> {
    let results = Array.from(this.results.values());
    
    // Apply filters
    if (options?.testPlanId) {
      results = results.filter(r => r.testPlanId === options.testPlanId);
    }
    
    if (options?.featureId) {
      results = results.filter(r => r.featureId === options.featureId);
    }
    
    if (options?.executedBy) {
      results = results.filter(r => r.executedBy === options.executedBy);
    }
    
    if (options?.executedAfter) {
      results = results.filter(r => r.startedAt >= options.executedAfter!);
    }
    
    if (options?.executedBefore) {
      results = results.filter(r => r.startedAt <= options.executedBefore!);
    }
    
    if (options?.minPassRate !== undefined) {
      results = results.filter(r => r.summary.passRate >= options.minPassRate!);
    }
    
    if (options?.maxPassRate !== undefined) {
      results = results.filter(r => r.summary.passRate <= options.maxPassRate!);
    }

    // Sort
    const sortBy = options?.sortBy || 'startedAt';
    const sortOrder = options?.sortOrder || 'desc';
    
    results.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'startedAt':
          comparison = a.startedAt.getTime() - b.startedAt.getTime();
          break;
        case 'duration':
          comparison = a.duration - b.duration;
          break;
        case 'passRate':
          comparison = a.summary.passRate - b.summary.passRate;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Paginate
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const total = results.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const items = results.slice(start, start + limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getHistoryByTestPlan(testPlanId: string, limit?: number): Promise<ExecutionResult[]> {
    const results = Array.from(this.results.values())
      .filter(r => r.testPlanId === testPlanId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    
    return limit ? results.slice(0, limit) : results;
  }

  async getHistoryByFeature(featureId: string, limit?: number): Promise<ExecutionResult[]> {
    const results = Array.from(this.results.values())
      .filter(r => r.featureId === featureId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    
    return limit ? results.slice(0, limit) : results;
  }

  async getLatestByTestPlan(testPlanId: string): Promise<ExecutionResult | null> {
    const history = await this.getHistoryByTestPlan(testPlanId, 1);
    return history[0] || null;
  }

  async getStatistics(startDate: Date, endDate: Date): Promise<ExecutionStatistics> {
    const results = Array.from(this.results.values())
      .filter(r => r.startedAt >= startDate && r.startedAt <= endDate);
    
    const totalExecutions = results.length;
    const totalPassed = results.reduce((sum, r) => sum + r.summary.passed, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.summary.failed, 0);
    const totalPassRate = results.reduce((sum, r) => sum + r.summary.passRate, 0);
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    
    // Calculate executions per day for last 7 days
    const executionsPerDay: { date: string; count: number }[] = [];
    const dayMs = 24 * 60 * 60 * 1000;
    
    for (let d = new Date(startDate); d <= endDate; d = new Date(d.getTime() + dayMs)) {
      const dateStr = d.toISOString().split('T')[0];
      const count = results.filter(r => 
        r.startedAt.toISOString().split('T')[0] === dateStr
      ).length;
      executionsPerDay.push({ date: dateStr, count });
    }

    return {
      totalExecutions,
      totalPassed,
      totalFailed,
      averagePassRate: totalExecutions > 0 ? totalPassRate / totalExecutions : 0,
      averageDuration: totalExecutions > 0 ? totalDuration / totalExecutions : 0,
      executionsPerDay,
    };
  }

  async delete(id: string): Promise<boolean> {
    return this.results.delete(id);
  }

  async deleteByTestPlan(testPlanId: string): Promise<number> {
    let count = 0;
    for (const [id, result] of this.results.entries()) {
      if (result.testPlanId === testPlanId) {
        this.results.delete(id);
        count++;
      }
    }
    return count;
  }

  async getRecent(limit: number): Promise<ExecutionResult[]> {
    return Array.from(this.results.values())
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Clear all results (useful for testing)
   */
  clear(): void {
    this.results.clear();
  }
}
