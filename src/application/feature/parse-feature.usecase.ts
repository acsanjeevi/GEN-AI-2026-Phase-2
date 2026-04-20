/**
 * Parse Feature Use Case
 * Orchestrates parsing of Gherkin feature files
 */

import { Feature } from '../../domain/models/Feature';
import { parseGherkinFeature, ParseError, countFeatureElements } from '../../utils/gherkin/parser';
import { IFeatureRepository } from '../../domain/repositories/IFeatureRepository';

/**
 * Input for parsing a feature
 */
export interface ParseFeatureInput {
  /** Gherkin feature file content */
  content: string;
  /** Optional file path for reference */
  filePath?: string;
  /** Whether to save the parsed feature to the repository */
  save?: boolean;
}

/**
 * Output from parsing a feature
 */
export interface ParseFeatureOutput {
  /** Whether parsing was successful */
  success: boolean;
  /** Parsed feature (if successful) */
  feature?: Feature;
  /** Parsing errors (if any) */
  errors: ParseError[];
  /** Statistics about the parsed feature */
  stats?: {
    scenarios: number;
    steps: number;
    tags: number;
  };
}

/**
 * Parse Feature Use Case
 * Parses Gherkin content and optionally saves to repository
 */
export class ParseFeatureUseCase {
  constructor(private readonly featureRepository?: IFeatureRepository) {}

  /**
   * Execute the use case
   * @param input - Parse feature input
   * @returns Parse result with feature or errors
   */
  async execute(input: ParseFeatureInput): Promise<ParseFeatureOutput> {
    // Parse the Gherkin content
    const parseResult = parseGherkinFeature(input.content, input.filePath);

    if (!parseResult.success || !parseResult.feature) {
      return {
        success: false,
        errors: parseResult.errors,
      };
    }

    const feature = parseResult.feature;

    // Optionally save to repository
    if (input.save && this.featureRepository) {
      try {
        await this.featureRepository.create(feature);
      } catch (error) {
        return {
          success: false,
          errors: [{
            message: `Failed to save feature: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
        };
      }
    }

    // Get statistics
    const stats = countFeatureElements(input.content);

    return {
      success: true,
      feature,
      errors: [],
      stats,
    };
  }
}

/**
 * Factory function to create the use case
 */
export function createParseFeatureUseCase(
  featureRepository?: IFeatureRepository
): ParseFeatureUseCase {
  return new ParseFeatureUseCase(featureRepository);
}
