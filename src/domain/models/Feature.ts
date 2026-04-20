/**
 * Feature domain model
 * Represents a Gherkin feature file containing test scenarios
 * 
 * This is a pure domain model with NO infrastructure dependencies
 */

import { Scenario } from './Scenario';

/**
 * Feature tag for categorization and filtering
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
  parsedAt?: Date;
  version?: string;
}

/**
 * Feature domain model
 * Represents a complete Gherkin feature
 */
export interface Feature {
  /** Unique identifier for the feature */
  id: string;
  
  /** Feature name/title from the Feature: line */
  name: string;
  
  /** Feature description (optional multi-line text) */
  description?: string;
  
  /** Tags applied to the feature (e.g., @smoke, @regression) */
  tags: FeatureTag[];
  
  /** Scenarios contained in this feature */
  scenarios: Scenario[];
  
  /** Background steps applied to all scenarios (optional) */
  background?: {
    name?: string;
    steps: import('./Step').Step[];
  };
  
  /** Feature metadata */
  metadata: FeatureMetadata;
  
  /** Language of the feature file (default: en) */
  language: string;
}

/**
 * Creates a new Feature with default values
 * @param partial - Partial feature data
 * @returns Complete Feature object
 */
export function createFeature(partial: Partial<Feature> & { id: string; name: string }): Feature {
  return {
    id: partial.id,
    name: partial.name,
    description: partial.description,
    tags: partial.tags ?? [],
    scenarios: partial.scenarios ?? [],
    background: partial.background,
    metadata: partial.metadata ?? {},
    language: partial.language ?? 'en',
  };
}

/**
 * Checks if a feature has any scenarios
 * @param feature - Feature to check
 * @returns True if feature has at least one scenario
 */
export function hasScenarios(feature: Feature): boolean {
  return feature.scenarios.length > 0;
}

/**
 * Gets all tags from a feature including scenario tags
 * @param feature - Feature to get tags from
 * @returns Array of unique tag names
 */
export function getAllTags(feature: Feature): string[] {
  const featureTags = feature.tags.map((t) => t.name);
  const scenarioTags = feature.scenarios.flatMap((s) => s.tags.map((t) => t.name));
  return [...new Set([...featureTags, ...scenarioTags])];
}

/**
 * Filters scenarios by tag
 * @param feature - Feature to filter
 * @param tagName - Tag name to filter by
 * @returns Scenarios matching the tag
 */
export function getScenariosByTag(feature: Feature, tagName: string): Scenario[] {
  return feature.scenarios.filter((s) => 
    s.tags.some((t) => t.name === tagName) || 
    feature.tags.some((t) => t.name === tagName)
  );
}

/**
 * Counts total steps in a feature (including background)
 * @param feature - Feature to count steps for
 * @returns Total number of steps
 */
export function countTotalSteps(feature: Feature): number {
  const backgroundSteps = feature.background?.steps.length ?? 0;
  const scenarioSteps = feature.scenarios.reduce(
    (sum, s) => sum + s.steps.length,
    0
  );
  return backgroundSteps + scenarioSteps;
}
