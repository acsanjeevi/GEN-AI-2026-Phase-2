/**
 * Mapping Service
 * API methods for step mapping and checking
 */

import apiClient from './api.client';
import { endpoints } from '@/config';
import type {
  CheckStepResponse,
  StepKeyword,
  ApiResponse,
} from '@/types';

// ============================================================================
// Request Types
// ============================================================================

interface CheckStepRequest {
  /** Step text to check */
  stepText: string;
  /** Optional keyword */
  keyword?: StepKeyword;
  /** Include detailed pattern analysis */
  includePatternAnalysis?: boolean;
}

interface MapStepRequest {
  /** Step text (can include or exclude Gherkin keyword) */
  stepText: string;
  /** Gherkin keyword */
  keyword?: StepKeyword;
  /** Page context for better mapping */
  pageContext?: string;
  /** Use strict mode (no heuristics) */
  strictMode?: boolean;
}

interface MapStepResponse {
  success: boolean;
  data?: {
    id: string;
    originalText: string;
    actions: Array<{
      type: string;
      locator?: { strategy: string; value: string };
      value?: string;
    }>;
    confidence: 'high' | 'medium' | 'low' | 'none';
    matchedPattern?: string;
    extractedParams: Record<string, string>;
    needsReview: boolean;
  };
  error?: string;
  warnings?: string[];
  needsLlmFallback?: boolean;
}

// ============================================================================
// Mapping Service
// ============================================================================

export const mappingService = {
  /**
   * Check if a step can be mapped to UI actions
   */
  async checkStep(
    stepText: string,
    options?: { keyword?: StepKeyword; includePatternAnalysis?: boolean }
  ): Promise<CheckStepResponse> {
    const request: CheckStepRequest = {
      stepText,
      keyword: options?.keyword,
      includePatternAnalysis: options?.includePatternAnalysis ?? false,
    };
    
    const response = await apiClient.post<ApiResponse<CheckStepResponse>>(
      endpoints.mapping.checkStep,
      request
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to check step');
    }
    
    return response.data.data;
  },

  /**
   * Map a single step to UI actions
   */
  async mapStep(
    stepText: string,
    options?: { keyword?: StepKeyword; pageContext?: string; strictMode?: boolean }
  ): Promise<MapStepResponse> {
    const request: MapStepRequest = {
      stepText,
      keyword: options?.keyword,
      pageContext: options?.pageContext,
      strictMode: options?.strictMode ?? false,
    };
    
    const response = await apiClient.post<ApiResponse<MapStepResponse['data']>>(
      '/api/mapping/map-step',
      request
    );
    
    return {
      success: response.data.success,
      data: response.data.data,
      error: response.data.error,
    };
  },

  /**
   * Check multiple steps in batch
   */
  async checkSteps(
    steps: Array<{ text: string; keyword?: StepKeyword }>
  ): Promise<Array<CheckStepResponse & { stepText: string }>> {
    const results = await Promise.all(
      steps.map(async (step) => {
        try {
          const result = await this.checkStep(step.text, { keyword: step.keyword });
          return { ...result, stepText: step.text };
        } catch (error) {
          // Return a default failed response for errors
          return {
            stepText: step.text,
            canMap: false,
            confidence: 0,
            needsLlmFallback: true,
            reason: error instanceof Error ? error.message : 'Unknown error',
            suggestions: [],
            extractedValues: {},
            characteristics: {
              isAssertion: false,
              isNavigation: false,
              isWaitAction: false,
              hasQuotedValues: false,
              quotedValuesCount: 0,
            },
          };
        }
      })
    );
    
    return results;
  },

  /**
   * Get mapping suggestions for a step
   */
  async getSuggestions(stepText: string): Promise<string[]> {
    try {
      const result = await this.checkStep(stepText, { includePatternAnalysis: true });
      return result.suggestions || [];
    } catch {
      return [];
    }
  },
};

export default mappingService;
