/**
 * Step Pattern Matcher
 * Extracts action, target, and value from Gherkin step text using regex patterns
 * 
 * This is a pure utility with NO infrastructure dependencies
 */

import { UIActionType, AssertionType } from '../../domain/models/MappedStep';
import { resolveActionType, resolveAssertionType, resolveElementType, isAssertionPhrase } from './synonyms';

/**
 * Pattern match result
 */
export interface PatternMatchResult {
  /** Whether the pattern matched successfully */
  matched: boolean;
  /** Detected action type */
  actionType?: UIActionType;
  /** Target element description */
  target?: string;
  /** Resolved element type (button, input, etc.) */
  elementType?: string;
  /** Value to use (text to type, URL to navigate, etc.) */
  value?: string;
  /** For assertions, the type of assertion */
  assertionType?: AssertionType;
  /** Expected value for assertions */
  expectedValue?: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Pattern name that matched */
  patternName?: string;
  /** Raw extracted groups */
  rawGroups?: Record<string, string>;
}

/**
 * Pattern definition
 */
interface StepPattern {
  /** Pattern name for debugging */
  name: string;
  /** Regex pattern */
  pattern: RegExp;
  /** Action type this pattern maps to */
  actionType: UIActionType;
  /** Named group mappings */
  groups: {
    target?: string;
    value?: string;
    expectedValue?: string;
  };
  /** Base confidence for this pattern */
  confidence: number;
  /** Optional assertion type */
  assertionType?: AssertionType;
}

/**
 * Step patterns ordered by specificity (most specific first)
 */
const STEP_PATTERNS: StepPattern[] = [
  // Navigation patterns
  {
    name: 'navigate-to-url',
    pattern: /^I (?:navigate|go|browse) to (?:the )?(?:url |page )?["']?([^"']+)["']?$/i,
    actionType: 'navigate',
    groups: { value: '$1' },
    confidence: 0.95,
  },
  {
    name: 'open-url',
    pattern: /^I open (?:the )?(?:url |page )?["']?([^"']+)["']?$/i,
    actionType: 'navigate',
    groups: { value: '$1' },
    confidence: 0.95,
  },
  {
    name: 'visit-url',
    pattern: /^I visit (?:the )?(?:url |page )?["']?([^"']+)["']?$/i,
    actionType: 'navigate',
    groups: { value: '$1' },
    confidence: 0.95,
  },
  {
    name: 'am-on-page',
    pattern: /^I am on (?:the )?["']?(.+?)["']? page$/i,
    actionType: 'navigate',
    groups: { value: '$1' },
    confidence: 0.85,
  },
  
  // Click patterns
  {
    name: 'click-the-element',
    // Lazy capture strips trailing 'button/link/element' keyword and location qualifiers
    // e.g. "I click the Create Lead button on rightside panel" → target = "Create Lead"
    pattern: /^I click (?:on )?(?:the )?["']?([^"']+?)["']?(?:\s+(?:button|link|element))?(?:\s+(?:on|in|inside|within|at|from)\s+.*)?$/i,
    actionType: 'click',
    groups: { target: '$1' },
    confidence: 0.9,
  },
  {
    name: 'click-button-named',
    pattern: /^I click (?:the )?["']?(.+?)["']? button$/i,
    actionType: 'click',
    groups: { target: '$1' },
    confidence: 0.95,
  },
  {
    name: 'click-link-named',
    pattern: /^I click (?:the )?["']?(.+?)["']? link$/i,
    actionType: 'click',
    groups: { target: '$1' },
    confidence: 0.95,
  },
  {
    name: 'press-button',
    pattern: /^I press (?:the )?["']?([^"']+)["']?(?: button)?$/i,
    actionType: 'click',
    groups: { target: '$1' },
    confidence: 0.85,
  },
  
  // Type/Fill patterns
  {
    name: 'type-into-field',
    pattern: /^I (?:type|enter|input) ["']?([^"']+)["']? (?:in(?:to)?|on) (?:the )?["']?([^"']+)["']?(?: field| input| textbox)?$/i,
    actionType: 'type',
    groups: { value: '$1', target: '$2' },
    confidence: 0.95,
  },
  {
    name: 'fill-field-with',
    pattern: /^I fill (?:in )?(?:the )?["']?([^"']+)["']?(?: field)? with ["']?([^"']+)["']?$/i,
    actionType: 'fill',
    groups: { target: '$1', value: '$2' },
    confidence: 0.95,
  },
  {
    name: 'enter-in-field',
    pattern: /^I enter ["']?([^"']+)["']? in (?:the )?["']?([^"']+)["']?(?: field)?$/i,
    actionType: 'type',
    groups: { value: '$1', target: '$2' },
    confidence: 0.9,
  },
  {
    name: 'type-target-as-value',
    // Matches: "I type the 'First Name' as 'John'" or 'I type the "First Name" as "John"'
    // Also allows trailing context qualifiers like "inside main container", "in the form", etc.
    pattern: /^I (?:type|enter|fill|input) (?:the )?["']?([^"']+?)["']? as ["']?([^"']+)["']?(?:\s+(?:inside|in|on|within|from|for|at|of)\s+.*)?$/i,
    actionType: 'fill',
    groups: { target: '$1', value: '$2' },
    confidence: 0.9,
  },
  {
    name: 'enter-target-as-value',
    // Matches: "I enter the username as 'value'" or "I enter username as 'value'"
    // Also allows trailing context qualifiers like "on rightside panel"
    pattern: /^I enter (?:the )?([^"']+?) as ["']?([^"']+)["']?(?:\s+(?:inside|in|on|within|from|for|at|of)\s+.*)?$/i,
    actionType: 'fill',
    groups: { target: '$1', value: '$2' },
    confidence: 0.9,
  },
  {
    name: 'set-field-to',
    pattern: /^I set (?:the )?["']?([^"']+)["']? (?:field )?to ["']?([^"']+)["']?$/i,
    actionType: 'fill',
    groups: { target: '$1', value: '$2' },
    confidence: 0.9,
  },
  
  // Select/Dropdown patterns
  {
    name: 'select-option-from',
    pattern: /^I select ["']?([^"']+)["']? from (?:the )?["']?([^"']+)["']?(?: dropdown| select| list)?$/i,
    actionType: 'select',
    groups: { value: '$1', target: '$2' },
    confidence: 0.95,
  },
  {
    name: 'select-target-as-value',
    // Matches: "I select the data source as 'Employee'"
    // Also allows trailing context qualifiers like "on rightside panel"
    pattern: /^I select (?:the )?([^"']+?) as ["']?([^"']+)["']?(?:\s+(?:inside|in|on|within|from|for|at|of)\s+.*)?$/i,
    actionType: 'select',
    groups: { target: '$1', value: '$2' },
    confidence: 0.9,
  },
  {
    name: 'choose-from-dropdown',
    pattern: /^I choose ["']?([^"']+)["']? from (?:the )?["']?([^"']+)["']?(?: dropdown)?$/i,
    actionType: 'select',
    groups: { value: '$1', target: '$2' },
    confidence: 0.9,
  },
  
  // Checkbox patterns
  {
    name: 'check-checkbox',
    pattern: /^I (?:check|tick|enable) (?:the )?["']?([^"']+)["']?(?: checkbox| option)?$/i,
    actionType: 'check',
    groups: { target: '$1' },
    confidence: 0.9,
  },
  {
    name: 'uncheck-checkbox',
    pattern: /^I (?:uncheck|untick|disable) (?:the )?["']?([^"']+)["']?(?: checkbox| option)?$/i,
    actionType: 'uncheck',
    groups: { target: '$1' },
    confidence: 0.9,
  },
  
  // Hover patterns
  {
    name: 'hover-over',
    pattern: /^I (?:hover|mouse) over (?:the )?["']?([^"']+)["']?$/i,
    actionType: 'hover',
    groups: { target: '$1' },
    confidence: 0.9,
  },
  {
    name: 'move-to-element',
    pattern: /^I move (?:the cursor )?to (?:the )?["']?([^"']+)["']?$/i,
    actionType: 'hover',
    groups: { target: '$1' },
    confidence: 0.85,
  },
  
  // Clear patterns
  {
    name: 'clear-field',
    pattern: /^I clear (?:the )?["']?([^"']+)["']?(?: field| input)?$/i,
    actionType: 'clear',
    groups: { target: '$1' },
    confidence: 0.9,
  },
  
  // Wait patterns — seconds pattern MUST come before wait-for-element to avoid
  // "I wait for 2 seconds" being captured as "wait for element named '2 seconds'"
  {
    name: 'wait-seconds',
    pattern: /^I wait (?:for )?(\d+) seconds?$/i,
    actionType: 'wait',
    groups: { value: '$1' },
    confidence: 0.95,
  },
  {
    name: 'wait-for-element',
    pattern: /^I wait for (?:the )?["']?([^"']+)["']?(?: to (?:be )?(?:visible|appear|load))?$/i,
    actionType: 'wait',
    groups: { target: '$1' },
    confidence: 0.9,
  },
  
  // Upload patterns
  {
    name: 'upload-file',
    pattern: /^I upload ["']?([^"']+)["']? to (?:the )?["']?([^"']+)["']?$/i,
    actionType: 'upload',
    groups: { value: '$1', target: '$2' },
    confidence: 0.9,
  },
  {
    name: 'attach-file',
    pattern: /^I attach (?:the )?(?:file )?["']?([^"']+)["']?$/i,
    actionType: 'upload',
    groups: { value: '$1' },
    confidence: 0.85,
  },
  
  // Scroll patterns
  {
    name: 'scroll-to-element',
    pattern: /^I scroll to (?:the )?["']?([^"']+)["']?$/i,
    actionType: 'scroll',
    groups: { target: '$1' },
    confidence: 0.9,
  },
  {
    name: 'scroll-direction',
    pattern: /^I scroll (up|down|left|right)(?: by (\d+))?$/i,
    actionType: 'scroll',
    groups: { value: '$1' },
    confidence: 0.9,
  },
  
  // Press key patterns
  {
    name: 'press-key',
    pattern: /^I press (?:the )?["']?([^"']+)["']? key$/i,
    actionType: 'press',
    groups: { value: '$1' },
    confidence: 0.9,
  },
  {
    name: 'hit-enter',
    pattern: /^I (?:press|hit) (?:the )?(Enter|Tab|Escape|Backspace|Delete)$/i,
    actionType: 'press',
    groups: { value: '$1' },
    confidence: 0.95,
  },
  
  // Screenshot patterns
  {
    name: 'take-screenshot',
    pattern: /^I take a screenshot(?: (?:named |called )?["']?([^"']+)["']?)?$/i,
    actionType: 'screenshot',
    groups: { value: '$1' },
    confidence: 0.9,
  },
  
  // Assertion patterns - visibility
  {
    name: 'should-see-element',
    pattern: /^I should see (?:the )?["']?([^"']+)["']?$/i,
    actionType: 'assert',
    assertionType: 'visible',
    groups: { target: '$1' },
    confidence: 0.9,
  },
  {
    name: 'should-not-see',
    pattern: /^I should not see (?:the )?["']?([^"']+)["']?$/i,
    actionType: 'assert',
    assertionType: 'hidden',
    groups: { target: '$1' },
    confidence: 0.9,
  },
  {
    name: 'element-is-visible',
    pattern: /^(?:the )?["']?([^"']+)["']? (?:should be|is) visible$/i,
    actionType: 'assert',
    assertionType: 'visible',
    groups: { target: '$1' },
    confidence: 0.9,
  },
  
  // Assertion patterns - URL (must appear before generic text/contains patterns)
  {
    name: 'url-should-be',
    pattern: /^(?:the )?url should (?:be|contain) ["']?([^"']+)["']?$/i,
    actionType: 'assert',
    assertionType: 'url',
    groups: { expectedValue: '$1' },
    confidence: 0.9,
  },
  {
    name: 'redirected-to',
    pattern: /^I (?:should be|am) redirected to ["']?([^"']+)["']?$/i,
    actionType: 'assert',
    assertionType: 'url',
    groups: { expectedValue: '$1' },
    confidence: 0.9,
  },
  
  // Assertion patterns - text content
  {
    name: 'page-should-contain',
    pattern: /^(?:the )?page should contain (?:the )?(?:text )?["']?([^"']+)["']?$/i,
    actionType: 'assert',
    assertionType: 'text',
    groups: { expectedValue: '$1' },
    confidence: 0.95,
  },
  {
    name: 'should-see-text',
    pattern: /^I should see (?:the )?(?:text )?["']?([^"']+)["']?(?: message| text)?$/i,
    actionType: 'assert',
    assertionType: 'text',
    groups: { expectedValue: '$1' },
    confidence: 0.85,
  },
  {
    name: 'should-verify-displayed-as',
    // Use lazy capture + explicit \s+is\s+ boundary so "Status is displayed as 'X'" → target="Status"
    pattern: /^I should (?:verify|see|check) (?:the )?["']?([^"']+?)["']?\s+is\s+(?:displayed|shown|appearing?|appears?)\s+(?:as\s+)?["']?([^"']+)["']?$/i,
    actionType: 'assert',
    assertionType: 'text',
    groups: { target: '$1', expectedValue: '$2' },
    confidence: 0.95,
  },
  {
    name: 'element-contains-text',
    pattern: /^(?:the )?["']?([^"']+)["']? (?:should )?contains? ["']?([^"']+)["']?$/i,
    actionType: 'assert',
    assertionType: 'text',
    groups: { target: '$1', expectedValue: '$2' },
    confidence: 0.9,
  },
  {
    name: 'element-has-text',
    pattern: /^(?:the )?["']?([^"']+)["']? (?:should )?(?:have|has) (?:the )?text ["']?([^"']+)["']?$/i,
    actionType: 'assert',
    assertionType: 'text',
    groups: { target: '$1', expectedValue: '$2' },
    confidence: 0.9,
  },
  
  // Assertion patterns - value
  {
    name: 'field-has-value',
    pattern: /^(?:the )?["']?([^"']+)["']?(?: field)? (?:should )?(?:have|has) (?:the )?value ["']?([^"']+)["']?$/i,
    actionType: 'assert',
    assertionType: 'value',
    groups: { target: '$1', expectedValue: '$2' },
    confidence: 0.9,
  },
  
  // Assertion patterns - enabled/disabled
  {
    name: 'element-is-enabled',
    pattern: /^(?:the )?["']?([^"']+)["']? (?:should be|is) enabled$/i,
    actionType: 'assert',
    assertionType: 'enabled',
    groups: { target: '$1' },
    confidence: 0.9,
  },
  {
    name: 'element-is-disabled',
    pattern: /^(?:the )?["']?([^"']+)["']? (?:should be|is) disabled$/i,
    actionType: 'assert',
    assertionType: 'disabled',
    groups: { target: '$1' },
    confidence: 0.9,
  },
  
  // Assertion patterns - title
  {
    name: 'page-title-should-be',
    pattern: /^(?:the )?page title should (?:be|contain) ["']?([^"']+)["']?$/i,
    actionType: 'assert',
    assertionType: 'title',
    groups: { expectedValue: '$1' },
    confidence: 0.9,
  },
];

/**
 * Match a step against all patterns
 * @param stepText - The step text to match
 * @returns Pattern match result
 */
export function matchStepPattern(stepText: string): PatternMatchResult {
  const normalizedText = stepText.trim();
  
  // Try each pattern in order
  for (const pattern of STEP_PATTERNS) {
    const match = normalizedText.match(pattern.pattern);
    
    if (match) {
      const result: PatternMatchResult = {
        matched: true,
        actionType: pattern.actionType,
        confidence: pattern.confidence,
        patternName: pattern.name,
        rawGroups: {},
      };
      
      // Extract groups
      if (pattern.groups.target && match[getGroupIndex(pattern, 'target')]) {
        result.target = match[getGroupIndex(pattern, 'target')].trim();
        result.elementType = resolveElementType(result.target);
        result.rawGroups!['target'] = result.target;
      }
      
      if (pattern.groups.value && match[getGroupIndex(pattern, 'value')]) {
        result.value = match[getGroupIndex(pattern, 'value')].trim();
        result.rawGroups!['value'] = result.value;
      }
      
      if (pattern.groups.expectedValue && match[getGroupIndex(pattern, 'expectedValue')]) {
        result.expectedValue = match[getGroupIndex(pattern, 'expectedValue')].trim();
        result.rawGroups!['expectedValue'] = result.expectedValue;
      }
      
      if (pattern.assertionType) {
        result.assertionType = pattern.assertionType;
      }
      
      return result;
    }
  }
  
  // No pattern matched, try heuristic matching
  return heuristicMatch(normalizedText);
}

/**
 * Get the index of a named group in the pattern
 */
function getGroupIndex(pattern: StepPattern, groupName: 'target' | 'value' | 'expectedValue'): number {
  const groupValue = pattern.groups[groupName];
  if (!groupValue) return 0;
  
  // Extract the group number from '$N'
  const match = groupValue.match(/\$(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Heuristic matching when no pattern matches
 * Uses synonym resolution and basic parsing
 */
function heuristicMatch(stepText: string): PatternMatchResult {
  const words = stepText.toLowerCase().split(/\s+/);
  
  // Try to resolve action type from the step text
  const actionType = resolveActionType(stepText);
  
  if (!actionType) {
    return {
      matched: false,
      confidence: 0,
    };
  }
  
  const result: PatternMatchResult = {
    matched: true,
    actionType,
    confidence: 0.5, // Lower confidence for heuristic matches
    patternName: 'heuristic',
    rawGroups: {},
  };
  
  // Check if it's an assertion
  if (isAssertionPhrase(stepText)) {
    result.actionType = 'assert';
    result.assertionType = resolveAssertionType(stepText);
  }
  
  // Extract quoted strings as potential targets/values
  const quotedStrings = stepText.match(/["']([^"']+)["']/g);
  if (quotedStrings) {
    const extracted = quotedStrings.map(s => s.replace(/["']/g, ''));
    
    if (actionType === 'navigate') {
      result.value = extracted[0];
    } else if (actionType === 'type' || actionType === 'fill') {
      if (extracted.length >= 2) {
        result.value = extracted[0];
        result.target = extracted[1];
      } else {
        result.value = extracted[0];
      }
    } else if (actionType === 'select') {
      if (extracted.length >= 2) {
        result.value = extracted[0];
        result.target = extracted[1];
      }
    } else if (actionType === 'assert') {
      if (extracted.length >= 2) {
        result.target = extracted[0];
        result.expectedValue = extracted[1];
      } else {
        result.expectedValue = extracted[0];
      }
    } else {
      result.target = extracted[0];
    }
  }
  
  // Try to find element type from remaining words
  if (!result.target) {
    for (const word of words) {
      const elementType = resolveElementType(word);
      if (elementType) {
        result.elementType = elementType;
        result.target = word;
        break;
      }
    }
  }
  
  // Resolve element type if we have a target but no type
  if (result.target && !result.elementType) {
    result.elementType = resolveElementType(result.target);
  }
  
  return result;
}

/**
 * Extract all quoted values from a string
 * @param text - Text to extract from
 * @returns Array of quoted values (without quotes)
 */
export function extractQuotedValues(text: string): string[] {
  const matches = text.match(/["']([^"']+)["']/g);
  if (!matches) return [];
  return matches.map(s => s.replace(/["']/g, ''));
}

/**
 * Normalize step text for better matching
 * @param text - Raw step text
 * @returns Normalized text
 */
export function normalizeStepText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/^(Given|When|Then|And|But)\s+/i, '') // Remove Gherkin keywords
    .trim();
}

/**
 * Get all available patterns for debugging/documentation
 * @returns Array of pattern names and their action types
 */
export function getAvailablePatterns(): Array<{ name: string; actionType: UIActionType; pattern: string }> {
  return STEP_PATTERNS.map(p => ({
    name: p.name,
    actionType: p.actionType,
    pattern: p.pattern.source,
  }));
}
