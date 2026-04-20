/**
 * Unit tests for rate limiter middleware
 */

import { Request, Response, NextFunction } from 'express';
import { createRateLimiter, RateLimiterPresets, destroyRateLimiterStore } from '../../../../src/core/middlewares/rateLimiter';

describe('Rate Limiter Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' } as any,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      getHeader: jest.fn().mockReturnValue(undefined),
    };
    next = jest.fn();
  });

  afterEach(() => {
    destroyRateLimiterStore();
  });

  describe('createRateLimiter', () => {
    it('should allow requests under limit', () => {
      const limiter = createRateLimiter({
        requestsPerWindow: 5,
        windowMs: 1000,
      });

      for (let i = 0; i < 5; i++) {
        limiter(req as Request, res as Response, next);
        expect(next).toHaveBeenCalled();
      }
      expect(next).toHaveBeenCalledTimes(5);
    });

    it('should block requests over limit', () => {
      const limiter = createRateLimiter({
        requestsPerWindow: 2,
        windowMs: 1000,
      });

      // First two requests should succeed
      limiter(req as Request, res as Response, next);
      limiter(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledTimes(2);

      // Third request should be blocked
      limiter(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalled();
    });

    it('should reset tokens after window expires', async () => {
      const limiter = createRateLimiter({
        requestsPerWindow: 1,
        windowMs: 100,
      });

      limiter(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Second request in same window should be blocked
      limiter(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(429);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Reset mocks
      (next as jest.Mock).mockClear();
      res.status = jest.fn().mockReturnThis();
      res.json = jest.fn().mockReturnThis();

      // Request after window expiry should succeed
      limiter(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    });

    it('should use custom key generator', () => {
      const keyGenerator = (r: Request) => r.headers.authorization || 'anonymous';
      const limiter = createRateLimiter({
        requestsPerWindow: 1,
        windowMs: 1000,
        keyGenerator,
      });

      const req1 = { ...req, headers: { authorization: 'user1' } } as Request;
      const req2 = { ...req, headers: { authorization: 'user2' } } as Request;

      limiter(req1, res as Response, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Different user should have separate limit
      limiter(req2, res as Response, next);
      expect(next).toHaveBeenCalledTimes(2);
    });

    it('should skip rate limiting when skip returns true', () => {
      const limiter = createRateLimiter({
        requestsPerWindow: 0,
        skip: () => true,
      });

      limiter(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    });

    it('should use custom handler when limit exceeded', () => {
      const handler = jest.fn();
      const limiter = createRateLimiter({
        requestsPerWindow: 0,
        handler,
      });

      limiter(req as Request, res as Response, next);
      expect(handler).toHaveBeenCalledWith(req, res);
    });

    it('should set rate limit headers', () => {
      const limiter = createRateLimiter({
        requestsPerWindow: 10,
        windowMs: 1000,
      });

      limiter(req as Request, res as Response, next);
      expect(res.set).toHaveBeenCalledWith('X-RateLimit-Limit', '10');
    });

    it('should set Retry-After header when limited', () => {
      const limiter = createRateLimiter({
        requestsPerWindow: 0,
        windowMs: 30000,
      });

      limiter(req as Request, res as Response, next);
      expect(res.set).toHaveBeenCalledWith('Retry-After', '30');
    });
  });

  describe('Rate Limiter Presets', () => {
    it('should provide standard preset', () => {
      expect(RateLimiterPresets.standard).toEqual({
        requestsPerWindow: 100,
        windowMs: 60000,
      });
    });

    it('should provide strict preset', () => {
      expect(RateLimiterPresets.strict.requestsPerWindow).toBeLessThan(
        RateLimiterPresets.standard.requestsPerWindow
      );
    });

    it('should provide execution preset', () => {
      expect(RateLimiterPresets.execution.requestsPerWindow).toBe(10);
      expect(RateLimiterPresets.execution.windowMs).toBe(5000);
    });
  });
});
