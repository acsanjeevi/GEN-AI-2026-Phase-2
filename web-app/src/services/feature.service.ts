/**
 * Feature Service
 * API methods for feature parsing and validation
 */

import apiClient from './api.client';
import { endpoints } from '@/config';
import type {
  ValidationResult,
  ParseFeatureResponse,
  ApiResponse,
} from '@/types';

// ============================================================================
// Response Types (matching backend DTOs)
// ============================================================================

interface ValidateSyntaxResponse {
  valid: boolean;
  errors: Array<{
    message: string;
    line?: number;
    column?: number;
  }>;
  warnings: string[];
  scenarioNames: string[];
}

// ============================================================================
// Feature Service
// ============================================================================

export const featureService = {
  /**
   * Parse a Gherkin feature file content
   */
  async parse(content: string): Promise<ParseFeatureResponse> {
    const response = await apiClient.post<ApiResponse<{ feature: import('@/types').Feature; stats: { scenarios: number; steps: number; tags: number } }>>(
      endpoints.feature.parse,
      { content }
    );
    
    if (!response.data.success || !response.data.data) {
      // Return the parse errors from the response
      return {
        success: false,
        errors: response.data.errors,
      };
    }
    
    // Wrap the response in ParseFeatureResponse format
    return {
      success: true,
      data: response.data.data,
    };
  },

  /**
   * Validate Gherkin syntax without full parsing
   */
  async validateSyntax(content: string): Promise<ValidationResult> {
    const response = await apiClient.post<ApiResponse<ValidateSyntaxResponse>>(
      endpoints.feature.validateSyntax,
      { content }
    );
    
    if (!response.data.success || !response.data.data) {
      // Return validation result with error
      return {
        valid: false,
        errors: response.data.errors || [{ message: response.data.error || 'Validation failed' }],
        warnings: [],
      };
    }
    
    const data = response.data.data;
    return {
      valid: data.valid,
      errors: data.errors,
      warnings: data.warnings,
      scenarioNames: data.scenarioNames,
    };
  },

  /**
   * Parse and validate content, returning combined result
   */
  async parseAndValidate(content: string): Promise<{
    parseResult: ParseFeatureResponse;
    validationResult: ValidationResult;
  }> {
    // Run both operations in parallel
    const [parseResult, validationResult] = await Promise.all([
      this.parse(content),
      this.validateSyntax(content),
    ]);
    
    return {
      parseResult,
      validationResult,
    };
  },

  /**
   * Quick syntax check - returns true if valid, false otherwise
   */
  async isValid(content: string): Promise<boolean> {
    try {
      const result = await this.validateSyntax(content);
      return result.valid;
    } catch {
      return false;
    }
  },
};

export default featureService;
