/**
 * Unit tests for retry utility
 */

import { withRetry, RetryPresets } from '../../../../src/core/utils/retry';

describe('Retry Utility', () => {
  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure then succeed', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, { maxAttempts: 3 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should fail after max attempts exceeded', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Connection refused'));

      await expect(
        withRetry(fn, { maxAttempts: 2 })
      ).rejects.toThrow('Connection refused');

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should respect shouldRetry predicate', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Bad request'));
      const shouldRetry = () => false;

      await expect(
        withRetry(fn, { shouldRetry })
      ).rejects.toThrow('Bad request');

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should calculate exponential backoff', async () => {
      const delays: number[] = [];
      const fn = jest.fn().mockRejectedValue(new Error('Timeout'));
      const onRetry = (attempt: number, error: Error, delayMs: number) => {
        delays.push(delayMs);
      };

      await expect(
        withRetry(fn, {
          maxAttempts: 3,
          initialDelayMs: 100,
          backoffMultiplier: 2,
          jitter: false,
          onRetry,
        })
      ).rejects.toThrow();

      expect(delays.length).toBe(2);
      expect(delays[0]).toBe(100);
      expect(delays[1]).toBe(200);
    });

    it('should cap delay at maxDelayMs', async () => {
      const delays: number[] = [];
      const fn = jest.fn().mockRejectedValue(new Error('Timeout'));
      const onRetry = (attempt: number, error: Error, delayMs: number) => {
        delays.push(delayMs);
      };

      await expect(
        withRetry(fn, {
          maxAttempts: 5,
          initialDelayMs: 100,
          maxDelayMs: 500,
          backoffMultiplier: 2,
          jitter: false,
          onRetry,
        })
      ).rejects.toThrow();

      expect(Math.max(...delays)).toBeLessThanOrEqual(500);
    });
  });

  describe('Retry Presets', () => {
    it('should provide aggressive preset', () => {
      expect(RetryPresets.aggressive).toEqual({
        maxAttempts: 5,
        initialDelayMs: 50,
        maxDelayMs: 5000,
        backoffMultiplier: 1.5,
      });
    });

    it('should provide LLM preset', () => {
      expect(RetryPresets.llm.maxAttempts).toBe(3);
      expect(RetryPresets.llm.shouldRetry).toBeDefined();
    });

    it('should retry LLM rate limit errors', () => {
      const shouldRetry = RetryPresets.llm.shouldRetry!;
      expect(shouldRetry(new Error('rate_limit_exceeded'))).toBe(true);
      expect(shouldRetry(new Error('429 Too Many Requests'))).toBe(true);
      expect(shouldRetry(new Error('Invalid request'))).toBe(false);
    });
  });
});
