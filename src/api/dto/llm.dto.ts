/**
 * LLM DTOs
 * Data Transfer Objects for LLM-related API endpoints
 */

import { LocatorStrategy, LocatorConfidence } from '../../domain/models/Locator';
import { UIActionType } from '../../domain/models/MappedStep';
import { StepKeyword } from '../../domain/models/Step';

// ============================================================================
// Suggest Locator DTOs
// ============================================================================

/**
 * Request to suggest a locator using LLM
 */
export interface SuggestLocatorRequestDto {
  /** Human-readable element description (e.g., "login button", "email input") */
  elementDescription: string;
  
  /** DOM snapshot or accessibility tree from the page */
  domSnapshot: string;
  
  /** Optional page URL for context */
  pageUrl?: string;
  
  /** Optional page title for context */
  pageTitle?: string;
  
  /** Preferred locator strategies (in order of preference) */
  preferredStrategies?: LocatorStrategy[];
  
  /** Additional context about the element or page */
  additionalContext?: string;
  
  /** Number of locator suggestions to return */
  maxSuggestions?: number;
}

/**
 * Single locator suggestion from LLM
 */
export interface LocatorSuggestionDto {
  /** Locator strategy */
  strategy: LocatorStrategy;
  
  /** Locator value/selector */
  value: string;
  
  /** Confidence level */
  confidence: LocatorConfidence;
  
  /** Explanation of why this locator was chosen */
  reasoning: string;
  
  /** Alternative locators if primary fails */
  alternatives?: Array<{
    strategy: LocatorStrategy;
    value: string;
  }>;
}

/**
 * Response from suggest-locator endpoint
 */
export interface SuggestLocatorResponseDto {
  /** List of suggested locators */
  suggestions: LocatorSuggestionDto[];
  
  /** Element description that was analyzed */
  elementDescription: string;
  
  /** Whether LLM was able to find the element in the snapshot */
  elementFound: boolean;
  
  /** Additional notes or warnings */
  notes?: string;
  
  /** Token usage for this request */
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================================================
// Generate Step Code DTOs
// ============================================================================

/**
 * Request to generate Playwright code for a step
 */
export interface GenerateStepCodeRequestDto {
  /** Step keyword */
  keyword: StepKeyword;
  
  /** Step text */
  stepText: string;
  
  /** UI action type */
  actionType: UIActionType;
  
  /** Element locator (strategy and value) */
  locator?: {
    strategy: LocatorStrategy;
    value: string;
  };
  
  /** Value for the action (e.g., text to type, URL to navigate) */
  actionValue?: string;
  
  /** Additional action options */
  actionOptions?: Record<string, unknown>;
  
  /** Whether to include comments in generated code */
  includeComments?: boolean;
  
  /** Code style preference */
  codeStyle?: 'async-await' | 'promise-chain';
}

/**
 * Response from generate-step-code endpoint
 */
export interface GenerateStepCodeResponseDto {
  /** Generated Playwright code */
  code: string;
  
  /** Required imports for this code */
  imports: string[];
  
  /** Step text this code was generated for */
  stepText: string;
  
  /** Explanation of the generated code */
  explanation?: string;
  
  /** Token usage for this request */
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================================================
// Generate Full Spec DTOs
// ============================================================================

/**
 * Step definition for full spec generation
 */
export interface StepDefinitionDto {
  keyword: StepKeyword;
  text: string;
  locator?: {
    strategy: LocatorStrategy;
    value: string;
  };
  actionType?: UIActionType;
  actionValue?: string;
}

/**
 * Scenario definition for full spec generation
 */
export interface ScenarioDefinitionDto {
  name: string;
  tags?: string[];
  steps: StepDefinitionDto[];
}

/**
 * Request to generate a complete Playwright test spec
 */
export interface GenerateFullSpecRequestDto {
  /** Feature name */
  featureName: string;
  
  /** Feature description */
  featureDescription?: string;
  
  /** Scenarios to include */
  scenarios: ScenarioDefinitionDto[];
  
  /** Base URL for the tests */
  baseUrl?: string;
  
  /** Whether to generate with test fixtures */
  useFixtures?: boolean;
  
  /** Test timeout in milliseconds */
  testTimeout?: number;
  
  /** Whether to include screenshot on failure */
  screenshotOnFailure?: boolean;
  
  /** Output format */
  format?: 'playwright-test' | 'playwright-bdd';
}

/**
 * Response from generate-full-spec endpoint
 */
export interface GenerateFullSpecResponseDto {
  /** Complete Playwright test file content */
  specContent: string;
  
  /** Suggested filename */
  suggestedFilename: string;
  
  /** Feature name */
  featureName: string;
  
  /** Number of test cases generated */
  testCount: number;
  
  /** Required dependencies */
  dependencies: string[];
  
  /** Token usage for this request */
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================================================
// Heal Step DTOs
// ============================================================================

/**
 * Request to heal a broken step
 */
export interface HealStepRequestDto {
  /** Original step text */
  stepText: string;
  
  /** Original locator that failed */
  originalLocator: {
    strategy: LocatorStrategy;
    value: string;
  };
  
  /** Error message from the failure */
  errorMessage: string;
  
  /** Current DOM snapshot */
  currentDomSnapshot: string;
  
  /** Previous DOM snapshot (if available) */
  previousDomSnapshot?: string;
  
  /** Page URL */
  pageUrl?: string;
  
  /** Element description */
  elementDescription?: string;
  
  /** Number of previous healing attempts */
  healingAttempt?: number;
  
  /** Maximum suggestions to return */
  maxSuggestions?: number;
}

/**
 * Healing suggestion
 */
export interface HealingSuggestionDto {
  /** New suggested locator */
  locator: {
    strategy: LocatorStrategy;
    value: string;
  };
  
  /** Confidence in this fix */
  confidence: LocatorConfidence;
  
  /** Explanation of what changed and why this should work */
  explanation: string;
  
  /** Type of change detected */
  changeType: 'attribute-changed' | 'element-moved' | 'element-removed' | 'structure-changed' | 'unknown';
  
  /** Suggested action to prevent future failures */
  preventionTip?: string;
}

/**
 * Response from heal-step endpoint
 */
export interface HealStepResponseDto {
  /** Whether a healing suggestion was found */
  healed: boolean;
  
  /** Healing suggestions */
  suggestions: HealingSuggestionDto[];
  
  /** Analysis of what went wrong */
  analysis: string;
  
  /** Whether the element appears to exist in the current DOM */
  elementExists: boolean;
  
  /** Recommended action */
  recommendation: 'retry-with-suggestion' | 'manual-review' | 'update-feature' | 'wait-and-retry';
  
  /** Token usage for this request */
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
