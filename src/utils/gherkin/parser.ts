/**
 * Gherkin Parser Utility
 * Parses Gherkin feature files into domain models
 */

import * as Gherkin from '@cucumber/gherkin';
import * as Messages from '@cucumber/messages';
import { Feature, FeatureTag, createFeature } from '../../domain/models/Feature';
import { Scenario, createScenario, ScenarioTag } from '../../domain/models/Scenario';
import { Step, StepKeyword, createStep, DataTable, DocString } from '../../domain/models/Step';

/**
 * Parser result containing parsed feature and any errors
 */
export interface ParseResult {
  success: boolean;
  feature?: Feature;
  errors: ParseError[];
}

/**
 * Parser error details
 */
export interface ParseError {
  message: string;
  line?: number;
  column?: number;
}

/**
 * Syntax validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ParseError[];
  warnings: string[];
}

/**
 * Maps Gherkin keyword to our StepKeyword type
 */
function mapKeyword(keyword: string): StepKeyword {
  const normalized = keyword.trim().toLowerCase();
  switch (normalized) {
    case 'given':
      return 'Given';
    case 'when':
      return 'When';
    case 'then':
      return 'Then';
    case 'and':
      return 'And';
    case 'but':
      return 'But';
    case '*':
      return '*';
    default:
      return 'Given'; // Default fallback
  }
}

/**
 * Converts Gherkin tags to our FeatureTag format
 */
function convertTags(tags: readonly Messages.Tag[]): FeatureTag[] {
  return tags.map(tag => ({
    name: tag.name,
    line: tag.location?.line || 0,
  }));
}

/**
 * Converts Gherkin tags to ScenarioTag format
 */
function convertScenarioTags(tags: readonly Messages.Tag[]): ScenarioTag[] {
  return tags.map(tag => ({
    name: tag.name,
    line: tag.location?.line || 0,
  }));
}

/**
 * Converts Gherkin steps to our Step domain model
 */
function convertSteps(steps: readonly Messages.Step[]): Step[] {
  return steps.map((step, index) => {
    // Extract data table if present
    let dataTable: DataTable | undefined;
    if (step.dataTable && step.dataTable.rows && step.dataTable.rows.length > 0) {
      const rows = step.dataTable.rows.map(row => 
        row.cells?.map(cell => cell.value) || []
      );
      // First row is headers, rest are data
      dataTable = {
        headers: rows[0] || [],
        rows: rows.slice(1),
      };
    }

    // Extract doc string if present
    let docString: DocString | undefined;
    if (step.docString) {
      docString = {
        content: step.docString.content,
        contentType: step.docString.mediaType || undefined,
      };
    }

    return createStep({
      id: `step-${index + 1}`,
      keyword: mapKeyword(step.keyword),
      text: step.text,
      line: step.location?.line || 0,
      dataTable,
      docString,
    });
  });
}

/**
 * Converts Gherkin scenario to our Scenario domain model
 */
function convertScenario(
  scenario: Messages.Scenario,
  index: number,
  featureId: string
): Scenario {
  return createScenario({
    id: scenario.id || `scenario-${index + 1}`,
    name: scenario.name,
    description: scenario.description || undefined,
    tags: convertScenarioTags(scenario.tags || []),
    steps: convertSteps(scenario.steps || []),
    line: scenario.location?.line || 0,
    featureId,
  });
}

/**
 * Parses a Gherkin feature file content
 * @param content - The Gherkin feature file content
 * @param filePath - Optional file path for reference
 * @returns ParseResult with the parsed feature or errors
 */
export function parseGherkinFeature(
  content: string,
  filePath?: string
): ParseResult {
  const errors: ParseError[] = [];
  
  try {
    const uuidFn = Messages.IdGenerator.uuid();
    const builder = new Gherkin.AstBuilder(uuidFn);
    const matcher = new Gherkin.GherkinClassicTokenMatcher();
    const parser = new Gherkin.Parser(builder, matcher);

    const gherkinDocument = parser.parse(content);
    const gherkinFeature = gherkinDocument.feature;

    if (!gherkinFeature) {
      return {
        success: false,
        errors: [{ message: 'No feature found in the document' }],
      };
    }

    // Generate feature ID first
    const featureId = `feature-${Date.now()}`;

    // Convert scenarios
    const scenarios: Scenario[] = [];
    let backgroundSteps: Step[] = [];

    for (const child of gherkinFeature.children || []) {
      if (child.background) {
        backgroundSteps = convertSteps(child.background.steps || []);
      } else if (child.scenario) {
        scenarios.push(convertScenario(child.scenario, scenarios.length, featureId));
      }
      // Note: ScenarioOutline is also in child.scenario with examples
    }

    // Create the feature
    const feature = createFeature({
      id: featureId,
      name: gherkinFeature.name,
      description: gherkinFeature.description || undefined,
      tags: convertTags(gherkinFeature.tags || []),
      scenarios,
      background: backgroundSteps.length > 0 
        ? { steps: backgroundSteps }
        : undefined,
      metadata: {
        filePath,
        parsedAt: new Date(),
      },
      language: gherkinFeature.language || 'en',
    });

    return {
      success: true,
      feature,
      errors: [],
    };
  } catch (error) {
    // Handle parsing errors
    if (error instanceof Error) {
      // Parse line number from error message if available
      const lineMatch = error.message.match(/\((\d+):(\d+)\)/);
      errors.push({
        message: error.message,
        line: lineMatch ? parseInt(lineMatch[1], 10) : undefined,
        column: lineMatch ? parseInt(lineMatch[2], 10) : undefined,
      });
    } else {
      errors.push({
        message: 'Unknown parsing error',
      });
    }

    return {
      success: false,
      errors,
    };
  }
}

/**
 * Validates Gherkin syntax without fully parsing
 * @param content - The Gherkin feature file content
 * @returns ValidationResult with validity status and any errors/warnings
 */
export function validateGherkinSyntax(content: string): ValidationResult {
  const errors: ParseError[] = [];
  const warnings: string[] = [];

  // Check for empty content
  if (!content || content.trim().length === 0) {
    return {
      valid: false,
      errors: [{ message: 'Feature content is empty' }],
      warnings: [],
    };
  }

  // Check for Feature keyword
  if (!content.includes('Feature:')) {
    errors.push({
      message: 'Missing "Feature:" keyword',
    });
  }

  // Check for at least one Scenario
  const hasScenario = content.includes('Scenario:') || 
                       content.includes('Scenario Outline:');
  if (!hasScenario) {
    warnings.push('No scenarios found in the feature');
  }

  // Try to parse to find syntax errors
  const parseResult = parseGherkinFeature(content);
  if (!parseResult.success) {
    errors.push(...parseResult.errors);
  }

  // Additional validation warnings
  if (parseResult.feature) {
    const feature = parseResult.feature;
    
    // Check for empty scenario names
    for (const scenario of feature.scenarios) {
      if (!scenario.name || scenario.name.trim() === '') {
        warnings.push(`Scenario at line ${scenario.line} has no name`);
      }
      
      // Check for scenarios without steps
      if (scenario.steps.length === 0) {
        warnings.push(`Scenario "${scenario.name}" has no steps`);
      }
    }

    // Check for missing Given-When-Then structure
    for (const scenario of feature.scenarios) {
      const keywords = scenario.steps.map(s => s.keyword);
      const hasGiven = keywords.some(k => k === 'Given');
      const hasWhen = keywords.some(k => k === 'When');
      const hasThen = keywords.some(k => k === 'Then');
      
      if (!hasGiven && !hasWhen && !hasThen) {
        warnings.push(
          `Scenario "${scenario.name}" lacks Given/When/Then structure`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Extracts scenario names from Gherkin content
 * @param content - The Gherkin feature file content
 * @returns Array of scenario names
 */
export function extractScenarioNames(content: string): string[] {
  const result = parseGherkinFeature(content);
  if (!result.success || !result.feature) {
    return [];
  }
  return result.feature.scenarios.map(s => s.name);
}

/**
 * Counts elements in a Gherkin feature
 * @param content - The Gherkin feature file content
 * @returns Object with counts
 */
export function countFeatureElements(content: string): {
  scenarios: number;
  steps: number;
  tags: number;
} {
  const result = parseGherkinFeature(content);
  if (!result.success || !result.feature) {
    return { scenarios: 0, steps: 0, tags: 0 };
  }

  const feature = result.feature;
  const totalSteps = feature.scenarios.reduce(
    (sum, s) => sum + s.steps.length, 
    0
  );
  const totalTags = feature.tags.length + 
    feature.scenarios.reduce((sum, s) => sum + s.tags.length, 0);

  return {
    scenarios: feature.scenarios.length,
    steps: totalSteps,
    tags: totalTags,
  };
}
