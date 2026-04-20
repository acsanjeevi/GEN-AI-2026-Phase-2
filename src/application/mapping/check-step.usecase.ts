/**
 * Check Step Use Case
 * Validates if a step can be mapped without actually performing the mapping
 * 
 * This is a pure application service with NO infrastructure dependencies
 */

import { Step, StepKeyword } from '../../domain/models/Step';
import { UIActionType } from '../../domain/models/MappedStep';
import {
  matchStepPattern,
  normalizeStepText,
  extractQuotedValues,
  getAvailablePatterns,
} from '../../utils/mapping/pattern-matcher';
import {
  resolveActionType,
  isAssertionPhrase,
  isNavigationPhrase,
  isWaitPhrase,
} from '../../utils/mapping/synonyms';

/**
 * Input for checking a step
 */
export interface CheckStepInput {
  /** Step text to check (can include or exclude Gherkin keyword) */
  stepText: string;
  /** Optional keyword if not included in text */
  keyword?: StepKeyword;
  /** Whether to include detailed pattern analysis */
  includePatternAnalysis?: boolean;
}

/**
 * Pattern suggestion for unmatched steps
 */
export interface PatternSuggestion {
  /** Suggested pattern */
  pattern: string;
  /** Why this might work */
  reason: string;
  /** Example of how to rewrite the step */
  example: string;
}

/**
 * Output from checking a step
 */
export interface CheckStepOutput {
  /** Whether the step can be mapped */
  canMap: boolean;
  /** Detected action type (if any) */
  actionType?: UIActionType;
  /** Confidence score (0-1) */
  confidence: number;
  /** Whether this step likely needs LLM fallback */
  needsLlmFallback: boolean;
  /** Reason for the result */
  reason: string;
  /** Suggestions to improve mapping */
  suggestions: string[];
  /** Extracted values from the step */
  extractedValues: {
    target?: string;
    value?: string;
    expectedValue?: string;
  };
  /** Pattern analysis (if requested) */
  patternAnalysis?: {
    matchedPattern?: string;
    testedPatterns: number;
    similarPatterns: PatternSuggestion[];
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

/**
 * Check Step Use Case
 * Analyzes a step to determine if it can be mapped
 */
export class CheckStepUseCase {
  /**
   * Execute the check
   * @param input - Check input
   * @returns Check output
   */
  execute(input: CheckStepInput): CheckStepOutput {
    const { stepText, keyword, includePatternAnalysis = false } = input;
    
    // Normalize the step text
    let normalizedText = normalizeStepText(stepText);
    
    // If keyword provided separately, we already have normalized text
    // If keyword is in the text, normalize will remove it
    
    // Try pattern matching
    const matchResult = matchStepPattern(normalizedText);
    
    // Extract quoted values
    const quotedValues = extractQuotedValues(normalizedText);
    
    // Determine characteristics
    const characteristics = {
      isAssertion: isAssertionPhrase(normalizedText),
      isNavigation: isNavigationPhrase(normalizedText),
      isWaitAction: isWaitPhrase(normalizedText),
      hasQuotedValues: quotedValues.length > 0,
      quotedValuesCount: quotedValues.length,
    };
    
    // Build extracted values
    const extractedValues: CheckStepOutput['extractedValues'] = {};
    if (matchResult.target) extractedValues.target = matchResult.target;
    if (matchResult.value) extractedValues.value = matchResult.value;
    if (matchResult.expectedValue) extractedValues.expectedValue = matchResult.expectedValue;
    
    // Generate suggestions
    const suggestions = this.generateSuggestions(
      normalizedText,
      matchResult.matched,
      matchResult.confidence,
      characteristics,
      quotedValues
    );
    
    // Determine if LLM fallback is needed
    const needsLlmFallback = !matchResult.matched || matchResult.confidence < 0.5;
    
    // Build pattern analysis if requested
    let patternAnalysis: CheckStepOutput['patternAnalysis'] | undefined;
    if (includePatternAnalysis) {
      patternAnalysis = {
        matchedPattern: matchResult.patternName,
        testedPatterns: getAvailablePatterns().length,
        similarPatterns: this.findSimilarPatterns(normalizedText),
      };
    }
    
    // Determine the result
    if (matchResult.matched) {
      return {
        canMap: true,
        actionType: matchResult.actionType,
        confidence: matchResult.confidence,
        needsLlmFallback: matchResult.confidence < 0.6,
        reason: `Matched pattern "${matchResult.patternName}" with ${(matchResult.confidence * 100).toFixed(0)}% confidence.`,
        suggestions,
        extractedValues,
        patternAnalysis,
        characteristics,
      };
    }
    
    // Try to identify action type even without pattern match
    const inferredActionType = resolveActionType(normalizedText);
    
    if (inferredActionType) {
      return {
        canMap: false,
        actionType: inferredActionType,
        confidence: 0.3,
        needsLlmFallback: true,
        reason: `Action type "${inferredActionType}" detected but no specific pattern matched. LLM fallback recommended.`,
        suggestions,
        extractedValues,
        patternAnalysis,
        characteristics,
      };
    }
    
    return {
      canMap: false,
      confidence: 0,
      needsLlmFallback: true,
      reason: 'Could not determine action type. Step may be too complex or use unsupported phrasing.',
      suggestions,
      extractedValues,
      patternAnalysis,
      characteristics,
    };
  }
  
  /**
   * Generate suggestions for improving step mappability
   */
  private generateSuggestions(
    stepText: string,
    matched: boolean,
    confidence: number,
    characteristics: CheckStepOutput['characteristics'],
    quotedValues: string[]
  ): string[] {
    const suggestions: string[] = [];
    
    if (!matched) {
      suggestions.push('Consider rephrasing to use common patterns like "I click...", "I type...", "I should see..."');
    }
    
    if (confidence < 0.7 && matched) {
      suggestions.push('Step matched with low confidence. Consider using more explicit phrasing.');
    }
    
    if (!characteristics.hasQuotedValues) {
      suggestions.push('Use quotes around element names and values for better extraction (e.g., I click "Login" button)');
    }
    
    if (characteristics.isAssertion && !stepText.toLowerCase().includes('should')) {
      suggestions.push('For assertions, use "should" phrasing (e.g., "I should see...", "the field should have...")');
    }
    
    if (characteristics.isNavigation && quotedValues.length === 0) {
      suggestions.push('For navigation, include the URL or page name in quotes');
    }
    
    // Check for common anti-patterns
    if (stepText.length > 100) {
      suggestions.push('Step is very long. Consider breaking it into smaller, more specific steps.');
    }
    
    const wordCount = stepText.split(/\s+/).length;
    if (wordCount > 15) {
      suggestions.push('Step has many words. Simpler steps are easier to map accurately.');
    }
    
    // Check for compound actions
    if (stepText.includes(' and ') && stepText.split(' and ').length > 2) {
      suggestions.push('Step appears to have multiple actions. Consider splitting into separate steps.');
    }
    
    return suggestions;
  }
  
  /**
   * Find similar patterns that might work for the step
   */
  private findSimilarPatterns(stepText: string): PatternSuggestion[] {
    const suggestions: PatternSuggestion[] = [];
    const lowerText = stepText.toLowerCase();
    
    // Check for navigation-like steps
    if (lowerText.includes('page') || lowerText.includes('url') || lowerText.includes('site')) {
      suggestions.push({
        pattern: 'navigate-to-url',
        reason: 'Step mentions page/URL',
        example: 'I navigate to "https://example.com"',
      });
    }
    
    // Check for click-like steps
    if (lowerText.includes('click') || lowerText.includes('press') || lowerText.includes('tap')) {
      suggestions.push({
        pattern: 'click-the-element',
        reason: 'Step contains click-related verb',
        example: 'I click the "Submit" button',
      });
    }
    
    // Check for input-like steps
    if (lowerText.includes('type') || lowerText.includes('enter') || lowerText.includes('fill')) {
      suggestions.push({
        pattern: 'type-into-field',
        reason: 'Step contains input-related verb',
        example: 'I type "username" in the "Email" field',
      });
    }
    
    // Check for assertion-like steps
    if (lowerText.includes('see') || lowerText.includes('verify') || lowerText.includes('should')) {
      suggestions.push({
        pattern: 'should-see-element',
        reason: 'Step contains assertion-related words',
        example: 'I should see the "Welcome" message',
      });
    }
    
    // Check for wait-like steps
    if (lowerText.includes('wait') || lowerText.includes('until') || lowerText.includes('appear')) {
      suggestions.push({
        pattern: 'wait-for-element',
        reason: 'Step contains wait-related words',
        example: 'I wait for the "Loading" spinner to disappear',
      });
    }
    
    return suggestions.slice(0, 3); // Return top 3 suggestions
  }
}

/**
 * Factory function to create CheckStepUseCase
 */
export function createCheckStepUseCase(): CheckStepUseCase {
  return new CheckStepUseCase();
}
