/**
 * Concurrent Execution Manager
 * Manages parallel test executions with queue and priority support
 */

import { createLogger } from '../../infrastructure/logging';

const logger = createLogger({ level: 'info', format: 'json' });

/**
 * Execution priority levels
 */
export enum ExecutionPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

/**
 * Execution status
 */
export enum ExecutionStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Queued execution entry
 */
export interface QueuedExecution {
  id: string;
  priority: ExecutionPriority;
  status: ExecutionStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  fn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

/**
 * Execution statistics
 */
export interface ExecutionStats {
  totalQueued: number;
  currentlyRunning: number;
  completed: number;
  failed: number;
  averageExecutionTime: number;
  queuedExecutions: number;
}

/**
 * Concurrent execution manager with priority queue
 */
export class ConcurrentExecutionManager {
  private executionQueue: QueuedExecution[] = [];
  private running = new Map<string, QueuedExecution>();
  private maxConcurrent: number;
  private stats = {
    totalQueued: 0,
    completed: 0,
    failed: 0,
    totalExecutionTime: 0,
  };

  constructor(maxConcurrent: number = 5) {
    this.maxConcurrent = Math.max(1, Math.min(maxConcurrent, 50)); // Cap between 1-50
    logger.info(`Execution manager initialized with max concurrent: ${this.maxConcurrent}`);
  }

  /**
   * Queue an execution
   */
  enqueue<T>(
    fn: () => Promise<T>,
    priority: ExecutionPriority = ExecutionPriority.NORMAL,
    id?: string
  ): { promise: Promise<T>; id: string } {
    const executionId = id || this.generateId();

    const promise = new Promise<T>((resolve, reject) => {
      const execution: QueuedExecution = {
        id: executionId,
        priority,
        status: ExecutionStatus.QUEUED,
        createdAt: new Date(),
        fn,
        resolve: resolve as (value: any) => void,
        reject,
      };

      this.executionQueue.push(execution);
      this.stats.totalQueued++;
      this.sortQueue();

      logger.debug(`Execution queued: ${executionId}`, { priority, queueSize: this.executionQueue.length });
      
      // Try to run if slots available
      this.processQueue();
    });

    return { promise, id: executionId };
  }

  /**
   * Process queued executions
   */
  private async processQueue(): Promise<void> {
    while (this.running.size < this.maxConcurrent && this.executionQueue.length > 0) {
      const execution = this.executionQueue.shift()!;

      execution.status = ExecutionStatus.RUNNING;
      execution.startedAt = new Date();
      this.running.set(execution.id, execution);

      logger.info(`Execution started: ${execution.id}`, { 
        running: this.running.size,
        queued: this.executionQueue.length,
      });

      // Run execution without awaiting to allow parallel processing
      this.executeAndCleanup(execution).catch(() => {
        // Error already handled in executeAndCleanup
      });
    }
  }

  /**
   * Execute and clean up an execution
   */
  private async executeAndCleanup(execution: QueuedExecution): Promise<void> {
    try {
      const result = await execution.fn();
      execution.status = ExecutionStatus.COMPLETED;
      execution.completedAt = new Date();
      
      const duration = execution.completedAt.getTime() - (execution.startedAt?.getTime() || 0);
      this.stats.totalExecutionTime += duration;
      this.stats.completed++;

      logger.info(`Execution completed: ${execution.id}`, { 
        duration,
        remaining: this.running.size - 1,
      });

      execution.resolve(result);
    } catch (error) {
      execution.status = ExecutionStatus.FAILED;
      execution.completedAt = new Date();
      this.stats.failed++;

      logger.error(`Execution failed: ${execution.id}`, { 
        error: error instanceof Error ? error.message : String(error),
      });

      execution.reject(error);
    } finally {
      this.running.delete(execution.id);
      await this.processQueue();
    }
  }

  /**
   * Sort queue by priority (highest first) and creation time
   */
  private sortQueue(): void {
    this.executionQueue.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * Cancel a queued or running execution
   */
  cancel(id: string): boolean {
    // Check in queue
    const queueIndex = this.executionQueue.findIndex(e => e.id === id);
    if (queueIndex !== -1) {
      const execution = this.executionQueue[queueIndex];
      execution.status = ExecutionStatus.CANCELLED;
      execution.reject(new Error(`Execution ${id} was cancelled`));
      this.executionQueue.splice(queueIndex, 1);
      logger.info(`Execution cancelled (queued): ${id}`);
      return true;
    }

    // Can't cancel running executions (would need task cancellation)
    if (this.running.has(id)) {
      logger.warn(`Cannot cancel running execution: ${id}`);
      return false;
    }

    logger.warn(`Execution not found: ${id}`);
    return false;
  }

  /**
   * Get execution status
   */
  getStatus(id: string): ExecutionStatus | null {
    const queued = this.executionQueue.find(e => e.id === id);
    if (queued) return queued.status;

    const running = this.running.get(id);
    if (running) return running.status;

    return null;
  }

  /**
   * Get statistics
   */
  getStats(): ExecutionStats {
    return {
      totalQueued: this.stats.totalQueued,
      currentlyRunning: this.running.size,
      completed: this.stats.completed,
      failed: this.stats.failed,
      averageExecutionTime: this.stats.completed > 0 
        ? this.stats.totalExecutionTime / this.stats.completed 
        : 0,
      queuedExecutions: this.executionQueue.length,
    };
  }

  /**
   * Get all queued executions
   */
  getQueuedExecutions(): Array<{ id: string; priority: ExecutionPriority; createdAt: Date }> {
    return this.executionQueue.map(e => ({
      id: e.id,
      priority: e.priority,
      createdAt: e.createdAt,
    }));
  }

  /**
   * Get all running executions
   */
  getRunningExecutions(): Array<{ id: string; startedAt: Date }> {
    return Array.from(this.running.values()).map(e => ({
      id: e.id,
      startedAt: e.startedAt || new Date(),
    }));
  }

  /**
   * Set max concurrent executions
   */
  setMaxConcurrent(max: number): void {
    this.maxConcurrent = Math.max(1, Math.min(max, 50));
    logger.info(`Max concurrent executions updated: ${this.maxConcurrent}`);
    this.processQueue().catch(() => {});
  }

  /**
   * Get max concurrent executions
   */
  getMaxConcurrent(): number {
    return this.maxConcurrent;
  }

  /**
   * Generate unique ID for execution
   */
  private generateId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all queued executions (running ones continue)
   */
  clearQueue(): number {
    const count = this.executionQueue.length;
    for (const execution of this.executionQueue) {
      execution.status = ExecutionStatus.CANCELLED;
      execution.reject(new Error('Queue was cleared'));
    }
    this.executionQueue = [];
    logger.info(`Queue cleared: ${count} executions cancelled`);
    return count;
  }

  /**
   * Wait for all executions to complete
   */
  async waitAll(): Promise<void> {
    while (this.executionQueue.length > 0 || this.running.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

/**
 * Global execution manager instance
 */
let globalManager: ConcurrentExecutionManager | null = null;

/**
 * Get or create global execution manager
 */
export function getExecutionManager(maxConcurrent?: number): ConcurrentExecutionManager {
  if (!globalManager) {
    globalManager = new ConcurrentExecutionManager(maxConcurrent);
  }
  return globalManager;
}

/**
 * Reset global execution manager
 */
export function resetExecutionManager(): void {
  globalManager = null;
}
