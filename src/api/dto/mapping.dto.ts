/**
 * Mapping DTOs
 * Data Transfer Objects for mapping API endpoints
 */

import { StepKeyword, Step, DataTable, DocString } from '../../domain/models/Step';
import { Scenario } from '../../domain/models/Scenario';
import { MappedStep, UIAction, MappingConfidence } from '../../domain/models/MappedStep';

// ============================================================================
// Map Step DTOs
// ============================================================================

/**
 * Request body for POST /mapping/map-step
 */
export interface MapStepRequest {
  /** Step text (can include or exclude Gherkin keyword) */
  stepText: string;
  /** Gherkin keyword */
  keyword?: StepKeyword;
  /** Line number in feature file */
  line?: number;
  /** Optional data table argument */
  dataTable?: DataTable;
  /** Optional doc string argument */
  docString?: DocString;
  /** Page context for better mapping */
  pageContext?: string;
  /** Use strict mode (no heuristics) */
  strictMode?: boolean;
}

/**
 * Response body for POST /mapping/map-step
 */
export interface MapStepResponse {
  /** Whether mapping was successful */
  success: boolean;
  /** The mapped step data */
  data?: {
    /** Mapped step ID */
    id: string;
    /** Original step text */
    originalText: string;
    /** UI actions to perform */
    actions: UIAction[];
    /** Mapping confidence */
    confidence: MappingConfidence;
    /** Pattern that matched */
    matchedPattern?: string;
    /** Extracted parameters */
    extractedParams: Record<string, string>;
    /** Whether review is recommended */
    needsReview: boolean;
  };
  /** Error message if failed */
  error?: string;
  /** Warnings */
  warnings?: string[];
  /** Whether LLM fallback is recommended */
  needsLlmFallback?: boolean;
}

// ============================================================================
// Map Scenario DTOs
// ============================================================================

/**
 * Step input for scenario mapping
 */
export interface StepInput {
  /** Step text */
  text: string;
  /** Gherkin keyword */
  keyword: StepKeyword;
  /** Line number */
  line?: number;
  /** Optional data table */
  dataTable?: DataTable;
  /** Optional doc string */
  docString?: DocString;
}

/**
 * Request body for POST /mapping/map-scenario
 */
export interface MapScenarioRequest {
  /** Scenario ID (optional, will be generated if not provided) */
  scenarioId?: string;
  /** Scenario name */
  scenarioName: string;
  /** Steps to map */
  steps: StepInput[];
  /** Tags on the scenario */
  tags?: string[];
  /** Page context */
  pageContext?: string;
  /** Stop mapping on first failure */
  stopOnFailure?: boolean;
  /** Use strict mode */
  strictMode?: boolean;
}

/**
 * Mapped step summary for response
 */
export interface MappedStepSummary {
  /** Step position (1-based) */
  position: number;
  /** Original step text */
  originalText: string;
  /** Keyword */
  keyword: StepKeyword;
  /** Mapping success */
  success: boolean;
  /** Actions (if mapped) */
  actions?: UIAction[];
  /** Confidence level */
  confidence?: MappingConfidence;
  /** Error message (if failed) */
  error?: string;
  /** Needs LLM fallback */
  needsLlmFallback?: boolean;
}

/**
 * Response body for POST /mapping/map-scenario
 */
export interface MapScenarioResponse {
  /** Overall success */
  success: boolean;
  /** Scenario data */
  data?: {
    /** Scenario ID */
    scenarioId: string;
    /** Scenario name */
    scenarioName: string;
    /** All step mappings */
    steps: MappedStepSummary[];
    /** Statistics */
    stats: {
      totalSteps: number;
      mappedCount: number;
      failedCount: number;
      needsLlmCount: number;
      averageConfidence: number;
    };
  };
  /** Error message */
  error?: string;
  /** Warnings */
  warnings?: string[];
}

// ============================================================================
// Check Step DTOs
// ============================================================================

/**
 * Request body for POST /mapping/check-step
 */
export interface CheckStepRequest {
  /** Step text to check */
  stepText: string;
  /** Optional keyword */
  keyword?: StepKeyword;
  /** Include detailed pattern analysis */
  includePatternAnalysis?: boolean;
}

/**
 * Pattern suggestion
 */
export interface PatternSuggestionDto {
  /** Pattern name */
  pattern: string;
  /** Why this might work */
  reason: string;
  /** Example rewrite */
  example: string;
}

/**
 * Response body for POST /mapping/check-step
 */
export interface CheckStepResponse {
  /** Whether step can be mapped */
  canMap: boolean;
  /** Detected action type */
  actionType?: string;
  /** Confidence score (0-100) */
  confidence: number;
  /** Needs LLM fallback */
  needsLlmFallback: boolean;
  /** Reason for result */
  reason: string;
  /** Improvement suggestions */
  suggestions: string[];
  /** Extracted values */
  extractedValues: {
    target?: string;
    value?: string;
    expectedValue?: string;
  };
  /** Step characteristics */
  characteristics: {
    isAssertion: boolean;
    isNavigation: boolean;
    isWaitAction: boolean;
    hasQuotedValues: boolean;
    quotedValuesCount: number;
  };
  /** Pattern analysis (if requested) */
  patternAnalysis?: {
    matchedPattern?: string;
    testedPatterns: number;
    similarPatterns: PatternSuggestionDto[];
  };
}
