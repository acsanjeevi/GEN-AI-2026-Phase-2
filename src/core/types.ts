/**
 * Core application types
 * Shared type definitions used across the application
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Async request handler type for Express
 * Wraps async functions to properly handle promise rejections
 */
export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

/**
 * Standard API response structure
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Pagination parameters for list endpoints
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Request with validated body type
 */
export interface TypedRequest<T> extends Request {
  body: T;
}

/**
 * Request with validated query parameters
 */
export interface TypedRequestQuery<T> extends Request {
  query: T & Request['query'];
}

/**
 * Request with validated params
 */
export interface TypedRequestParams<T> extends Request {
  params: T & Request['params'];
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  services: {
    name: string;
    status: 'up' | 'down';
    latency?: number;
  }[];
}
