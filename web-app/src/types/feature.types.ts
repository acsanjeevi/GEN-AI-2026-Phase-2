/**
 * Feature Types
 * Types matching backend feature/Gherkin domain models
 */

// ============================================================================
// Step Types
// ============================================================================

/**
 * Gherkin step keyword
 */
export type StepKeyword = 'Given' | 'When' | 'Then' | 'And' | 'But' | '*';

/**
 * Step status during execution
 */
export type StepStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

/**
 * Data table for step arguments
 */
export interface DataTable {
  /** Header row of the table */
  headers: string[];
  /** Data rows */
  rows: string[][];
}

/**
 * Doc string for multi-line text arguments
 */
export interface DocString {
  /** Content type (e.g., json, xml) */
  contentType?: string;
  /** The actual content */
  content: string;
}

/**
 * Step domain model
 */
export interface Step {
  /** Unique identifier for the step */
  id: string;
  /** Step keyword (Given, When, Then, And, But) */
  keyword: StepKeyword;
  /** Step text without the keyword */
  text: string;
  /** Line number in the feature file */
  line: number;
  /** Optional data table argument */
  dataTable?: DataTable;
  /** Optional doc string argument */
  docString?: DocString;
  /** Current status of the step */
  status: StepStatus;
  /** Error message if step failed */
  errorMessage?: string;
  /** Execution duration in milliseconds */
  duration?: number;
}

// ============================================================================
// Scenario Types
// ============================================================================

/**
 * Scenario tag
 */
export interface ScenarioTag {
  name: string;
  line: number;
}

/**
 * Scenario type
 */
export type ScenarioType = 'scenario' | 'scenarioOutline';

/**
 * Scenario status
 */
export type ScenarioStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

/**
 * Example table for scenario outlines
 */
export interface ExampleTable {
  name?: string;
  tags: ScenarioTag[];
  headers: string[];
  rows: string[][];
}

/**
 * Scenario domain model
 */
export interface Scenario {
  /** Unique identifier */
  id: string;
  /** Scenario name */
  name: string;
  /** Scenario description */
  description?: string;
  /** Scenario type */
  type: ScenarioType;
  /** Tags applied to the scenario */
  tags: ScenarioTag[];
  /** Steps in the scenario */
  steps: Step[];
  /** Example tables for scenario outlines */
  examples?: ExampleTable[];
  /** Line number in feature file */
  line: number;
  /** Current status */
  status: ScenarioStatus;
}

// ============================================================================
// Feature Types
// ============================================================================

/**
 * Feature tag
 */
export interface FeatureTag {
  name: string;
  line: number;
}

/**
 * Feature metadata
 */
export interface FeatureMetadata {
  filePath?: string;
  parsedAt?: string;
  version?: string;
}

/**
 * Background steps
 */
export interface Background {
  name?: string;
  steps: Step[];
}

/**
 * Feature domain model
 */
export interface Feature {
  /** Unique identifier */
  id: string;
  /** Feature name/title */
  name: string;
  /** Feature description */
  description?: string;
  /** Tags applied to the feature */
  tags: FeatureTag[];
  /** Scenarios in this feature */
  scenarios: Scenario[];
  /** Background steps */
  background?: Background;
  /** Feature metadata */
  metadata: FeatureMetadata;
  /** Language of the feature file */
  language: string;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Parse error details
 */
export interface ParseError {
  /** Error message */
  message: string;
  /** Line number where error occurred */
  line?: number;
  /** Column number where error occurred */
  column?: number;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether the content is valid */
  valid: boolean;
  /** List of errors */
  errors: ParseError[];
  /** Non-critical warnings */
  warnings: string[];
  /** List of scenario names found */
  scenarioNames?: string[];
}

/**
 * Feature parse response
 */
export interface ParseFeatureResponse {
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

// ============================================================================
// Mapping Types
// ============================================================================

/**
 * Mapping confidence level
 */
export type MappingConfidence = 'high' | 'medium' | 'low' | 'none';

/**
 * UI action type
 */
export type UIActionType =
  | 'navigate'
  | 'click'
  | 'type'
  | 'select'
  | 'check'
  | 'uncheck'
  | 'hover'
  | 'press'
  | 'clear'
  | 'upload'
  | 'screenshot'
  | 'wait'
  | 'waitForVisible'
  | 'waitForHidden'
  | 'waitForText'
  | 'assert'
  | 'assertVisible'
  | 'assertHidden'
  | 'assertText'
  | 'assertValue'
  | 'assertEnabled'
  | 'assertDisabled'
  | 'assertChecked'
  | 'assertUnchecked'
  | 'scroll'
  | 'focus'
  | 'blur'
  | 'dragAndDrop'
  | 'custom';

/**
 * Locator strategy type
 */
export type LocatorStrategy =
  | 'css'
  | 'xpath'
  | 'text'
  | 'role'
  | 'testId'
  | 'label'
  | 'placeholder'
  | 'ref';

/**
 * Locator for finding elements
 */
export interface Locator {
  /** Locator strategy */
  strategy: LocatorStrategy;
  /** Locator value */
  value: string;
}

/**
 * UI action
 */
export interface UIAction {
  /** Action type */
  type: UIActionType;
  /** Target locator */
  locator?: Locator;
  /** Value for the action */
  value?: string;
  /** Expected value for assertions */
  expectedValue?: string;
  /** Additional options */
  options?: Record<string, unknown>;
}

/**
 * Check step response
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
}
