/**
 * Feature DTOs
 * Data Transfer Objects for feature-related API operations
 */

import { Feature } from '../../domain/models/Feature';
import { ParseError } from '../../utils/gherkin/parser';

/**
 * Request DTO for parsing a feature
 */
export interface ParseFeatureRequestDTO {
  /** Gherkin feature file content */
  content: string;
  /** Optional file path for reference */
  filePath?: string;
  /** Whether to save the parsed feature */
  save?: boolean;
}

/**
 * Response DTO for parsing a feature
 */
export interface ParseFeatureResponseDTO {
  /** Whether parsing was successful */
  success: boolean;
  /** Parsed feature data */
  data?: {
    feature: Feature;
    stats: {
      scenarios: number;
      steps: number;
      tags: number;
    };
  };
  /** Error information if parsing failed */
  errors?: ParseError[];
}

/**
 * Request DTO for validating feature syntax
 */
export interface ValidateFeatureSyntaxRequestDTO {
  /** Gherkin feature file content */
  content: string;
}

/**
 * Response DTO for validating feature syntax
 */
export interface ValidateFeatureSyntaxResponseDTO {
  /** Whether syntax is valid */
  valid: boolean;
  /** Syntax errors */
  errors: ParseError[];
  /** Non-critical warnings */
  warnings: string[];
  /** List of scenario names found */
  scenarioNames: string[];
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  /** Whether the request was successful */
  success: boolean;
  /** Response data */
  data?: T;
  /** Error message if failed */
  error?: string;
  /** Detailed errors if available */
  errors?: ParseError[];
  /** Request timestamp */
  timestamp: string;
}

/**
 * Creates a success API response
 */
export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Creates an error API response
 */
export function createErrorResponse(
  error: string,
  errors?: ParseError[]
): ApiResponse<never> {
  return {
    success: false,
    error,
    errors,
    timestamp: new Date().toISOString(),
  };
}
