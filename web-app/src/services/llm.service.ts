/**
 * LLM Service
 * API methods for LLM-powered features
 */

import apiClient from './api.client';
import { endpoints } from '@/config';
import type { ApiResponse } from '@/types';

// ============================================================================
// Request/Response Types
// ============================================================================

interface GenerateSpecRequest {
  /** Feature content (Gherkin) */
  featureContent: string;
  /** Base URL for the application */
  baseUrl: string;
  /** Script ID for tracking */
  scriptId?: string;
  /** Browser configuration */
  browserConfig?: {
    browser: 'chromium' | 'firefox' | 'webkit';
    headless: boolean;
    viewportWidth: number;
    viewportHeight: number;
  };
}

interface GenerateSpecResponse {
  /** Whether generation was successful */
  success: boolean;
  /** Generated spec file content */
  specContent?: string;
  /** Path where spec file was saved */
  specPath?: string;
  /** Script ID */
  scriptId?: string;
  /** Any errors during generation */
  errors?: string[];
}

interface SuggestLocatorRequest {
  /** Element description or context */
  elementDescription: string;
  /** Page HTML or context */
  pageContext?: string;
  /** Current URL */
  currentUrl?: string;
}

interface SuggestLocatorResponse {
  /** Suggested locators in order of preference */
  locators: Array<{
    strategy: 'css' | 'xpath' | 'text' | 'role' | 'testId';
    value: string;
    confidence: number;
    reason: string;
  }>;
}

interface HealStepRequest {
  /** Original step text */
  stepText: string;
  /** Original locator that failed */
  originalLocator: {
    strategy: string;
    value: string;
  };
  /** Error message from the failure */
  errorMessage: string;
  /** Screenshot of the page (base64) */
  screenshot?: string;
  /** Page HTML */
  pageHtml?: string;
}

interface HealStepResponse {
  /** Whether healing found a solution */
  success: boolean;
  /** New healed locator */
  healedLocator?: {
    strategy: string;
    value: string;
  };
  /** Confidence in the healed locator */
  confidence?: number;
  /** Analysis of why original failed */
  analysis?: string;
  /** Suggestions for improving the step */
  suggestions?: string[];
}

// ============================================================================
// LLM Service
// ============================================================================

export const llmService = {
  /**
   * Generate a Playwright spec file from Gherkin feature
   */
  async generateSpec(request: GenerateSpecRequest): Promise<GenerateSpecResponse> {
    const response = await apiClient.post<ApiResponse<GenerateSpecResponse>>(
      endpoints.llm.generateSpec,
      request
    );
    
    if (!response.data.success) {
      return {
        success: false,
        errors: [response.data.error || 'Failed to generate spec'],
      };
    }
    
    return response.data.data || { success: false };
  },

  /**
   * Suggest locators for an element using LLM analysis
   */
  async suggestLocator(request: SuggestLocatorRequest): Promise<SuggestLocatorResponse> {
    const response = await apiClient.post<ApiResponse<SuggestLocatorResponse>>(
      endpoints.llm.suggestLocator,
      request
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to suggest locator');
    }
    
    return response.data.data;
  },

  /**
   * Heal a failed step by finding alternative locator
   */
  async healStep(request: HealStepRequest): Promise<HealStepResponse> {
    const response = await apiClient.post<ApiResponse<HealStepResponse>>(
      '/api/llm/heal-step',
      request
    );
    
    if (!response.data.success) {
      return {
        success: false,
        analysis: response.data.error,
      };
    }
    
    return response.data.data || { success: false };
  },

  /**
   * Generate step suggestions based on page context
   */
  async suggestSteps(pageContext: {
    url: string;
    title: string;
    elements: string[];
  }): Promise<string[]> {
    const response = await apiClient.post<ApiResponse<{ suggestions: string[] }>>(
      '/api/llm/suggest-steps',
      pageContext
    );
    
    if (!response.data.success || !response.data.data) {
      return [];
    }
    
    return response.data.data.suggestions;
  },

  /**
   * Analyze test failure and provide insights
   */
  async analyzeFailure(context: {
    stepText: string;
    errorMessage: string;
    screenshot?: string;
    stackTrace?: string;
  }): Promise<{
    analysis: string;
    possibleCauses: string[];
    recommendations: string[];
  }> {
    const response = await apiClient.post<
      ApiResponse<{
        analysis: string;
        possibleCauses: string[];
        recommendations: string[];
      }>
    >('/api/llm/analyze-failure', context);
    
    if (!response.data.success || !response.data.data) {
      return {
        analysis: 'Unable to analyze failure',
        possibleCauses: [],
        recommendations: [],
      };
    }
    
    return response.data.data;
  },
};

export default llmService;
