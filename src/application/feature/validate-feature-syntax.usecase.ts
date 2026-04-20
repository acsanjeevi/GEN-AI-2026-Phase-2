/**
 * Validate Feature Syntax Use Case
 * Validates Gherkin feature syntax without full parsing
 */

import { validateGherkinSyntax, ParseError, extractScenarioNames } from '../../utils/gherkin/parser';

/**
 * Input for validating feature syntax
 */
export interface ValidateFeatureSyntaxInput {
  /** Gherkin feature file content */
  content: string;
}

/**
 * Output from syntax validation
 */
export interface ValidateFeatureSyntaxOutput {
  /** Whether syntax is valid */
  valid: boolean;
  /** Syntax errors (if any) */
  errors: ParseError[];
  /** Warnings (non-critical issues) */
  warnings: string[];
  /** List of scenario names found */
  scenarioNames: string[];
}

/**
 * Validate Feature Syntax Use Case
 * Checks Gherkin syntax and provides detailed feedback
 */
export class ValidateFeatureSyntaxUseCase {
  /**
   * Execute the use case
   * @param input - Validation input
   * @returns Validation result with errors and warnings
   */
  async execute(input: ValidateFeatureSyntaxInput): Promise<ValidateFeatureSyntaxOutput> {
    // Validate the syntax
    const validationResult = validateGherkinSyntax(input.content);

    // Extract scenario names for additional context
    const scenarioNames = extractScenarioNames(input.content);

    return {
      valid: validationResult.valid,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      scenarioNames,
    };
  }
}

/**
 * Factory function to create the use case
 */
export function createValidateFeatureSyntaxUseCase(): ValidateFeatureSyntaxUseCase {
  return new ValidateFeatureSyntaxUseCase();
}
