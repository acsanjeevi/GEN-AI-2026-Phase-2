/**
 * Unit tests for concurrent execution manager
 */

import {
  ConcurrentExecutionManager,
  ExecutionPriority,
  ExecutionStatus,
  resetExecutionManager,
} from '../../../../src/application/execution/concurrent-execution-manager';

describe('ConcurrentExecutionManager', () => {
  let manager: ConcurrentExecutionManager;

  beforeEach(() => {
    resetExecutionManager();
    manager = new ConcurrentExecutionManager(2);
  });

  describe('enqueue', () => {
    it('should queue and execute function', async () => {
      const fn = jest.fn().mockResolvedValue('result');
      const { promise, id } = manager.enqueue(fn);

      expect(id).toBeDefined();
      const result = await promise;

      expect(result).toBe('result');
      expect(fn).toHaveBeenCalled();
    });

    it('should support custom ID', async () => {
      const fn = jest.fn().mockResolvedValue('result');
      const customId = 'my-execution';
      const { id } = manager.enqueue(fn, ExecutionPriority.NORMAL, customId);

      expect(id).toBe(customId);
    });

    it('should execute up to max concurrent', async () => {
      let activeCount = 0;
      let maxActive = 0;

      const fn = async () => {
        activeCount++;
        maxActive = Math.max(maxActive, activeCount);
        await new Promise(resolve => setTimeout(resolve, 50));
        activeCount--;
      };

      const promises = [];
      for (let i = 0; i < 5; i++) {
        const { promise } = manager.enqueue(fn);
        promises.push(promise);
      }

      await Promise.all(promises);
      expect(maxActive).toBeLessThanOrEqual(2);
    });

    it('should respect priority order', async () => {
      const executionOrder: number[] = [];

      const createFn = (priority: number) => async () => {
        executionOrder.push(priority);
        await new Promise(resolve => setTimeout(resolve, 10));
      };

      // Queue in order: LOW, HIGH, NORMAL
      manager.enqueue(createFn(0), ExecutionPriority.LOW);
      manager.enqueue(createFn(2), ExecutionPriority.HIGH);
      manager.enqueue(createFn(1), ExecutionPriority.NORMAL);

      await new Promise(resolve => setTimeout(resolve, 200));

      // HIGH priority should execute first, then NORMAL, then LOW
      expect(executionOrder[0]).toBe(2);
      expect(executionOrder[1]).toBe(1);
      expect(executionOrder[2]).toBe(0);
    });

    it('should handle rejected functions', async () => {
      const error = new Error('Test error');
      const fn = jest.fn().mockRejectedValue(error);
      const { promise } = manager.enqueue(fn);

      await expect(promise).rejects.toThrow('Test error');
    });
  });

  describe('cancel', () => {
    it('should cancel queued execution', async () => {
      const fn = jest.fn().mockResolvedValue('result');
      const { id } = manager.enqueue(fn);

      const cancelled = manager.cancel(id);

      expect(cancelled).toBe(true);
      expect(fn).not.toHaveBeenCalled();
    });

    it('should not cancel running execution', async () => {
      let started = false;
      const fn = jest.fn().mockImplementation(async () => {
        started = true;
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const { id, promise } = manager.enqueue(fn);

      // Wait for execution to start
      await new Promise(resolve => setTimeout(resolve, 20));

      const cancelled = manager.cancel(id);

      expect(cancelled).toBe(false);
      expect(started).toBe(true);

      await promise;
    });

    it('should return false for non-existent execution', () => {
      const cancelled = manager.cancel('non-existent');
      expect(cancelled).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return QUEUED for queued execution', () => {
      const fn = jest.fn().mockImplementation(() => new Promise(() => {}));
      const { id } = manager.enqueue(fn);

      const status = manager.getStatus(id);
      expect(status).toBe(ExecutionStatus.QUEUED);
    });

    it('should return RUNNING for running execution', async () => {
      let resolveExecution: any = null;
      const fn = jest.fn().mockImplementation(
        () => new Promise(resolve => {
          resolveExecution = resolve;
        })
      );

      const { id } = manager.enqueue(fn);

      // Wait for execution to start
      await new Promise(resolve => setTimeout(resolve, 50));

      const status = manager.getStatus(id);
      expect(status).toBe(ExecutionStatus.RUNNING);

      if (resolveExecution) {
        resolveExecution(null);
      }
    });

    it('should return null for non-existent execution', () => {
      const status = manager.getStatus('non-existent');
      expect(status).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should track execution statistics', async () => {
      const fn = jest.fn().mockResolvedValue('result');

      manager.enqueue(fn);
      manager.enqueue(fn);
      manager.enqueue(fn);

      const stats = manager.getStats();

      expect(stats.totalQueued).toBe(3);
      expect(stats.currentlyRunning).toBeGreaterThan(0);

      await new Promise(resolve => setTimeout(resolve, 100));

      const finalStats = manager.getStats();
      expect(finalStats.completed).toBeGreaterThan(0);
    });

    it('should calculate average execution time', async () => {
      const fn = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 30))
      );

      manager.enqueue(fn);
      manager.enqueue(fn);

      await new Promise(resolve => setTimeout(resolve, 200));

      const stats = manager.getStats();
      expect(stats.averageExecutionTime).toBeGreaterThan(0);
    });
  });

  describe('setMaxConcurrent', () => {
    it('should update max concurrent executions', () => {
      manager.setMaxConcurrent(5);
      expect(manager.getMaxConcurrent()).toBe(5);
    });

    it('should clamp values between 1 and 50', () => {
      manager.setMaxConcurrent(0);
      expect(manager.getMaxConcurrent()).toBe(1);

      manager.setMaxConcurrent(100);
      expect(manager.getMaxConcurrent()).toBe(50);
    });
  });

  describe('clearQueue', () => {
    it('should clear all queued executions', async () => {
      const fn = jest.fn().mockResolvedValue('result');

      manager.enqueue(fn);
      manager.enqueue(fn);
      manager.enqueue(fn);

      const cleared = manager.clearQueue();

      expect(cleared).toBe(3);
      expect(manager.getStats().queuedExecutions).toBe(0);
    });

    it('should not affect running executions', async () => {
      let resolveExecution: any = null;
      const fn = jest.fn().mockImplementation(
        () => new Promise(resolve => {
          resolveExecution = resolve;
        })
      );

      manager.enqueue(fn);
      manager.enqueue(fn);
      manager.enqueue(fn);

      // Wait for some to start
      await new Promise(resolve => setTimeout(resolve, 50));

      const cleared = manager.clearQueue();

      const stats = manager.getStats();
      expect(stats.currentlyRunning).toBeGreaterThan(0);

      if (resolveExecution) {
        resolveExecution(null);
      }
    });
  });

  describe('waitAll', () => {
    it('should wait for all executions to complete', async () => {
      const fn = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 50))
      );

      manager.enqueue(fn);
      manager.enqueue(fn);
      manager.enqueue(fn);

      const startTime = Date.now();
      await manager.waitAll();
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThan(50);
      expect(manager.getStats().queuedExecutions).toBe(0);
      expect(manager.getStats().currentlyRunning).toBe(0);
    });
  });
});
