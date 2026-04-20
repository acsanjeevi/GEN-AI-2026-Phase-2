/**
 * Step domain model
 * Represents a Gherkin step (Given/When/Then/And/But)
 * 
 * This is a pure domain model with NO infrastructure dependencies
 */

/**
 * Step keyword types
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
 * Step argument - either a data table or doc string
 */
export type StepArgument = DataTable | DocString;

/**
 * Step domain model
 * Represents a single step in a scenario
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

/**
 * Creates a new Step with default values
 * @param partial - Partial step data
 * @returns Complete Step object
 */
export function createStep(
  partial: Partial<Step> & { id: string; keyword: StepKeyword; text: string; line: number }
): Step {
  return {
    id: partial.id,
    keyword: partial.keyword,
    text: partial.text,
    line: partial.line,
    dataTable: partial.dataTable,
    docString: partial.docString,
    status: partial.status ?? 'pending',
    errorMessage: partial.errorMessage,
    duration: partial.duration,
  };
}

/**
 * Gets the full step text including keyword
 * @param step - Step to get text for
 * @returns Full step text with keyword
 */
export function getFullStepText(step: Step): string {
  return `${step.keyword} ${step.text}`;
}

/**
 * Checks if step has a data table argument
 * @param step - Step to check
 * @returns True if step has a data table
 */
export function hasDataTable(step: Step): boolean {
  return step.dataTable !== undefined && step.dataTable.rows.length > 0;
}

/**
 * Checks if step has a doc string argument
 * @param step - Step to check
 * @returns True if step has a doc string
 */
export function hasDocString(step: Step): boolean {
  return step.docString !== undefined && step.docString.content.length > 0;
}

/**
 * Checks if step has any argument
 * @param step - Step to check
 * @returns True if step has either data table or doc string
 */
export function hasArgument(step: Step): boolean {
  return hasDataTable(step) || hasDocString(step);
}

/**
 * Marks a step as passed
 * @param step - Step to update
 * @param duration - Execution duration in ms
 * @returns Updated step
 */
export function markStepPassed(step: Step, duration: number): Step {
  return {
    ...step,
    status: 'passed',
    duration,
    errorMessage: undefined,
  };
}

/**
 * Marks a step as failed
 * @param step - Step to update
 * @param errorMessage - Error message
 * @param duration - Execution duration in ms
 * @returns Updated step
 */
export function markStepFailed(step: Step, errorMessage: string, duration: number): Step {
  return {
    ...step,
    status: 'failed',
    duration,
    errorMessage,
  };
}

/**
 * Marks a step as skipped
 * @param step - Step to update
 * @returns Updated step
 */
export function markStepSkipped(step: Step): Step {
  return {
    ...step,
    status: 'skipped',
    duration: 0,
  };
}

/**
 * Type guard to check if argument is a DataTable
 * @param arg - Argument to check
 * @returns True if argument is a DataTable
 */
export function isDataTable(arg: StepArgument): arg is DataTable {
  return 'headers' in arg && 'rows' in arg;
}

/**
 * Type guard to check if argument is a DocString
 * @param arg - Argument to check
 * @returns True if argument is a DocString
 */
export function isDocString(arg: StepArgument): arg is DocString {
  return 'content' in arg && !('headers' in arg);
}
