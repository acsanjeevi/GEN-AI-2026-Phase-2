/**
 * API Types
 * Generic API request/response types matching backend conventions
 */

// ============================================================================
// Generic API Response Types
// ============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  /** Whether the request was successful */
  success: boolean;
  /** Response data */
  data?: T;
  /** Error message if failed */
  error?: string;
  /** Detailed errors if available */
  errors?: ApiError[];
  /** Request timestamp */
  timestamp: string;
}

/**
 * API error details
 */
export interface ApiError {
  code?: string;
  message: string;
  line?: number;
  column?: number;
  details?: unknown;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  /** List of items */
  items: T[];
  /** Total count of all items */
  total: number;
  /** Current page (1-based) */
  page: number;
  /** Items per page */
  limit: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there are more pages */
  hasMore: boolean;
}

/**
 * Parameters for list/pagination requests
 */
export interface ListParams {
  /** Page number (1-based) */
  page?: number;
  /** Items per page */
  limit?: number;
  /** Field to sort by */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
  /** Filter by status */
  status?: string | string[];
  /** Filter by date range - start */
  fromDate?: string;
  /** Filter by date range - end */
  toDate?: string;
  /** Search query */
  search?: string;
}

// ============================================================================
// HTTP Error Types
// ============================================================================

/**
 * Transformed API error for client use
 */
export interface TransformedError {
  /** HTTP status code */
  status: number;
  /** Error message */
  message: string;
  /** Error code */
  code?: string;
  /** Original error */
  originalError?: unknown;
}
