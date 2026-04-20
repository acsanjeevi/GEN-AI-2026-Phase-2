/**
 * API Client
 * Axios instance with interceptors for request/response handling
 */

import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from 'axios';
import { apiConfig } from '@/config';
import type { ApiResponse, TransformedError } from '@/types';

// ============================================================================
// API Client Instance
// ============================================================================

/**
 * Create axios instance with base configuration
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: apiConfig.baseUrl,
  timeout: apiConfig.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// Request Interceptor
// ============================================================================

/**
 * Request interceptor for logging and token injection
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Log requests in development
    if (import.meta.env.DEV) {
      console.log(
        `[API Request] ${config.method?.toUpperCase()} ${config.url}`,
        config.data ? { data: config.data } : ''
      );
    }

    // Add timestamp to prevent caching issues
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }

    return config;
  },
  (error: AxiosError) => {
    if (import.meta.env.DEV) {
      console.error('[API Request Error]', error);
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// Response Interceptor
// ============================================================================

/**
 * Response interceptor for logging and error transformation
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log responses in development
    if (import.meta.env.DEV) {
      console.log(
        `[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`,
        { status: response.status, data: response.data }
      );
    }

    return response;
  },
  (error: AxiosError<ApiResponse<unknown>>) => {
    // Log errors in development
    if (import.meta.env.DEV) {
      console.error('[API Response Error]', {
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }

    // Transform error to standardized format
    const transformedError = transformError(error);
    return Promise.reject(transformedError);
  }
);

// ============================================================================
// Error Transformation
// ============================================================================

/**
 * Transform axios error to standardized error format
 */
export function transformError(error: AxiosError<ApiResponse<unknown>>): TransformedError {
  // Network error (no response)
  if (!error.response) {
    return {
      status: 0,
      message: error.message || 'Network error. Please check your connection.',
      code: 'NETWORK_ERROR',
      originalError: error,
    };
  }

  const { status, data } = error.response;

  // Extract error message from response
  let message = 'An unexpected error occurred';
  if (data?.error) {
    message = data.error;
  } else if (data?.errors && data.errors.length > 0) {
    message = data.errors.map((e: { message: string }) => e.message).join(', ');
  } else if (error.message) {
    message = error.message;
  }

  // Handle specific HTTP status codes
  switch (status) {
    case 400:
      return {
        status,
        message: message || 'Bad request. Please check your input.',
        code: 'BAD_REQUEST',
        originalError: error,
      };
    case 401:
      return {
        status,
        message: 'Unauthorized. Please log in again.',
        code: 'UNAUTHORIZED',
        originalError: error,
      };
    case 403:
      return {
        status,
        message: 'Forbidden. You do not have permission to perform this action.',
        code: 'FORBIDDEN',
        originalError: error,
      };
    case 404:
      return {
        status,
        message: message || 'Resource not found.',
        code: 'NOT_FOUND',
        originalError: error,
      };
    case 409:
      return {
        status,
        message: message || 'Conflict. The resource already exists.',
        code: 'CONFLICT',
        originalError: error,
      };
    case 422:
      return {
        status,
        message: message || 'Validation error. Please check your input.',
        code: 'VALIDATION_ERROR',
        originalError: error,
      };
    case 429:
      return {
        status,
        message: 'Too many requests. Please try again later.',
        code: 'RATE_LIMITED',
        originalError: error,
      };
    case 500:
    case 502:
    case 503:
    case 504:
      return {
        status,
        message: 'Server error. Please try again later.',
        code: 'SERVER_ERROR',
        originalError: error,
      };
    default:
      return {
        status,
        message,
        code: 'UNKNOWN_ERROR',
        originalError: error,
      };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Type guard to check if error is a TransformedError
 */
export function isTransformedError(error: unknown): error is TransformedError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'message' in error
  );
}

/**
 * Get error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (isTransformedError(error)) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'An unexpected error occurred';
}

// ============================================================================
// Export
// ============================================================================

export default apiClient;
