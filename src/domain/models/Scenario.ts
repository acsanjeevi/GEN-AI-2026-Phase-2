/**
 * Scenario domain model
 * Represents a test scenario within a Gherkin feature
 * 
 * This is a pure domain model with NO infrastructure dependencies
 */

import { Step, StepStatus } from './Step';

/**
 * Scenario tag for categorization and filtering
 */
export interface ScenarioTag {
  name: string;
  line: number;
}

/**
 * Scenario type - regular or outline (parameterized)
 */
export type ScenarioType = 'Scenario' | 'ScenarioOutline';

/**
 * Scenario status based on step statuses
 */
export type ScenarioStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

/**
 * Example table for Scenario Outline
 */
export interface ExampleTable {
  /** Example table name */
  name?: string;
  /** Tags for this example set */
  tags: ScenarioTag[];
  /** Header row containing parameter names */
  headers: string[];
  /** Data rows containing parameter values */
  rows: string[][];
  /** Line number in feature file */
  line: number;
}

/**
 * Scenario domain model
 * Represents a test scenario with steps
 */
export interface Scenario {
  /** Unique identifier for the scenario */
  id: string;
  
  /** Scenario name/title */
  name: string;
  
  /** Scenario description (optional) */
  description?: string;
  
  /** Scenario type (Scenario or Scenario Outline) */
  type: ScenarioType;
  
  /** Tags applied to this scenario */
  tags: ScenarioTag[];
  
  /** Steps in this scenario */
  steps: Step[];
  
  /** Examples for Scenario Outline (parameterized tests) */
  examples?: ExampleTable[];
  
  /** Line number in feature file */
  line: number;
  
  /** Current status of the scenario */
  status: ScenarioStatus;
  
  /** ID of the parent feature */
  featureId: string;
  
  /** Execution duration in milliseconds */
  duration?: number;
}

/**
 * Creates a new Scenario with default values
 * @param partial - Partial scenario data
 * @returns Complete Scenario object
 */
export function createScenario(
  partial: Partial<Scenario> & { 
    id: string; 
    name: string; 
    featureId: string;
    line: number;
  }
): Scenario {
  return {
    id: partial.id,
    name: partial.name,
    description: partial.description,
    type: partial.type ?? 'Scenario',
    tags: partial.tags ?? [],
    steps: partial.steps ?? [],
    examples: partial.examples,
    line: partial.line,
    status: partial.status ?? 'pending',
    featureId: partial.featureId,
    duration: partial.duration,
  };
}

/**
 * Checks if scenario is a Scenario Outline
 * @param scenario - Scenario to check
 * @returns True if scenario is an outline with examples
 */
export function isScenarioOutline(scenario: Scenario): boolean {
  return scenario.type === 'ScenarioOutline' && 
    (scenario.examples?.length ?? 0) > 0;
}

/**
 * Gets the count of test iterations for a scenario
 * For regular scenarios, returns 1
 * For outlines, returns total number of example rows
 * @param scenario - Scenario to count iterations for
 * @returns Number of test iterations
 */
export function getIterationCount(scenario: Scenario): number {
  if (!isScenarioOutline(scenario)) {
    return 1;
  }
  return scenario.examples?.reduce((sum, ex) => sum + ex.rows.length, 0) ?? 1;
}

/**
 * Calculates scenario status based on step statuses
 * @param scenario - Scenario to calculate status for
 * @returns Computed scenario status
 */
export function calculateScenarioStatus(scenario: Scenario): ScenarioStatus {
  if (scenario.steps.length === 0) {
    return 'pending';
  }

  const statuses = scenario.steps.map((s) => s.status);
  
  if (statuses.some((s) => s === 'running')) {
    return 'running';
  }
  
  if (statuses.some((s) => s === 'failed')) {
    return 'failed';
  }
  
  if (statuses.every((s) => s === 'passed')) {
    return 'passed';
  }
  
  if (statuses.every((s) => s === 'skipped')) {
    return 'skipped';
  }
  
  return 'pending';
}

/**
 * Updates scenario status based on its steps
 * @param scenario - Scenario to update
 * @returns Updated scenario with computed status
 */
export function updateScenarioStatus(scenario: Scenario): Scenario {
  return {
    ...scenario,
    status: calculateScenarioStatus(scenario),
  };
}

/**
 * Gets all failed steps from a scenario
 * @param scenario - Scenario to get failed steps from
 * @returns Array of failed steps
 */
export function getFailedSteps(scenario: Scenario): Step[] {
  return scenario.steps.filter((s) => s.status === 'failed');
}

/**
 * Checks if scenario has any tags
 * @param scenario - Scenario to check
 * @returns True if scenario has at least one tag
 */
export function hasTags(scenario: Scenario): boolean {
  return scenario.tags.length > 0;
}

/**
 * Checks if scenario has a specific tag
 * @param scenario - Scenario to check
 * @param tagName - Tag name to look for
 * @returns True if scenario has the specified tag
 */
export function hasTag(scenario: Scenario, tagName: string): boolean {
  return scenario.tags.some((t) => t.name === tagName);
}

/**
 * Calculates total duration from step durations
 * @param scenario - Scenario to calculate duration for
 * @returns Total duration in milliseconds
 */
export function calculateTotalDuration(scenario: Scenario): number {
  return scenario.steps.reduce((sum, step) => sum + (step.duration ?? 0), 0);
}
