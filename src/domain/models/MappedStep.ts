/**
 * MappedStep domain model
 * Represents a Gherkin step mapped to abstract UI actions
 * 
 * This is a pure domain model with NO infrastructure dependencies
 */

import { Step } from './Step';
import { Locator } from './Locator';

/**
 * UI action types that can be performed
 */
export type UIActionType =
  | 'navigate'
  | 'click'
  | 'type'
  | 'fill'
  | 'select'
  | 'check'
  | 'uncheck'
  | 'hover'
  | 'drag'
  | 'scroll'
  | 'wait'
  | 'assert'
  | 'screenshot'
  | 'press'
  | 'upload'
  | 'download'
  | 'clear'
  | 'focus'
  | 'blur';

/**
 * Assertion types for verification actions
 */
export type AssertionType =
  | 'visible'
  | 'hidden'
  | 'enabled'
  | 'disabled'
  | 'checked'
  | 'unchecked'
  | 'text'
  | 'value'
  | 'attribute'
  | 'count'
  | 'url'
  | 'title';

/**
 * Resolved element information from execution
 * Contains the actual element info that was found and used during MCP execution
 */
export interface ResolvedElement {
  /** Element role (button, textbox, link, etc.) */
  role: string;
  /** Element name/label */
  name?: string;
  /** MCP ref used to interact with the element */
  ref?: string;
}

/**
 * UI Action definition
 */
export interface UIAction {
  /** Action type */
  type: UIActionType;
  
  /** Target element locator (if applicable) */
  locator?: Locator;
  
  /** Target element description (natural language, used for locator resolution) */
  target?: string;
  
  /** Action value/input (e.g., text to type, URL to navigate) */
  value?: string;
  
  /** Additional options for the action */
  options?: Record<string, unknown>;
  
  /** For assertions, the type of assertion */
  assertionType?: AssertionType;
  
  /** Expected value for assertions */
  expectedValue?: string | number | boolean;
  
  /** Timeout for this action in milliseconds */
  timeout?: number;
  
  /** Description of what this action does */
  description?: string;
  
  /** Resolved element info (populated after successful execution) */
  resolvedElement?: ResolvedElement;
}

/**
 * Mapping confidence level
 */
export type MappingConfidence = 'exact' | 'high' | 'medium' | 'low' | 'uncertain';

/**
 * Generated code information for a step
 */
export interface StepGeneratedCode {
  /** The generated Playwright code */
  code: string;
  /** Required imports for the code */
  imports: string[];
  /** Explanation of what the code does */
  explanation?: string;
  /** When the code was generated */
  generatedAt: Date;
}

/**
 * MappedStep domain model
 * Represents a step that has been mapped to one or more UI actions
 */
export interface MappedStep {
  /** Unique identifier for the mapped step */
  id: string;
  
  /** Reference to the original step */
  originalStep: Step;
  
  /** UI actions to perform for this step */
  actions: UIAction[];
  
  /** Confidence level of the mapping */
  confidence: MappingConfidence;
  
  /** Whether the mapping was done by LLM */
  isLlmMapped: boolean;
  
  /** Pattern that matched this step (if any) */
  matchedPattern?: string;
  
  /** Extracted parameters from the step text */
  extractedParams: Record<string, string>;
  
  /** Whether this mapping needs review */
  needsReview: boolean;
  
  /** Mapping notes or warnings */
  notes?: string[];
  
  /** When this mapping was created */
  createdAt: Date;
  
  /** When this mapping was last updated */
  updatedAt: Date;
  
  /** Generated code for this step (populated after successful execution) */
  generatedCode?: StepGeneratedCode;
}

/**
 * Creates a new MappedStep with default values
 * @param partial - Partial mapped step data
 * @returns Complete MappedStep object
 */
export function createMappedStep(
  partial: Partial<MappedStep> & { 
    id: string; 
    originalStep: Step;
    actions: UIAction[];
  }
): MappedStep {
  const now = new Date();
  return {
    id: partial.id,
    originalStep: partial.originalStep,
    actions: partial.actions,
    confidence: partial.confidence ?? 'medium',
    isLlmMapped: partial.isLlmMapped ?? false,
    matchedPattern: partial.matchedPattern,
    extractedParams: partial.extractedParams ?? {},
    needsReview: partial.needsReview ?? false,
    notes: partial.notes,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  };
}

/**
 * Creates a navigate action
 * @param url - URL to navigate to
 * @returns Navigate UIAction
 */
export function createNavigateAction(url: string): UIAction {
  return {
    type: 'navigate',
    value: url,
    description: `Navigate to ${url}`,
  };
}

/**
 * Creates a click action
 * @param locator - Element locator
 * @param description - Action description
 * @returns Click UIAction
 */
export function createClickAction(locator: Locator, description?: string): UIAction {
  return {
    type: 'click',
    locator,
    description: description ?? `Click on ${locator.description ?? locator.value}`,
  };
}

/**
 * Creates a type/fill action
 * @param locator - Input element locator
 * @param text - Text to type
 * @param description - Action description
 * @returns Type UIAction
 */
export function createTypeAction(
  locator: Locator, 
  text: string, 
  description?: string
): UIAction {
  return {
    type: 'fill',
    locator,
    value: text,
    description: description ?? `Type "${text}" into ${locator.description ?? locator.value}`,
  };
}

/**
 * Creates an assertion action
 * @param locator - Element locator (optional for page assertions)
 * @param assertionType - Type of assertion
 * @param expectedValue - Expected value
 * @param description - Action description
 * @returns Assert UIAction
 */
export function createAssertAction(
  assertionType: AssertionType,
  expectedValue?: string | number | boolean,
  locator?: Locator,
  description?: string
): UIAction {
  return {
    type: 'assert',
    locator,
    assertionType,
    expectedValue,
    description: description ?? `Assert ${assertionType}${expectedValue !== undefined ? ` equals ${expectedValue}` : ''}`,
  };
}

/**
 * Creates a wait action
 * @param timeout - Wait duration in milliseconds
 * @param locator - Optional locator to wait for
 * @param description - Action description
 * @returns Wait UIAction
 */
export function createWaitAction(
  timeout: number,
  locator?: Locator,
  description?: string
): UIAction {
  return {
    type: 'wait',
    locator,
    timeout,
    description: description ?? (locator 
      ? `Wait for ${locator.description ?? locator.value}` 
      : `Wait for ${timeout}ms`),
  };
}

/**
 * Checks if mapped step has any locator-based actions
 * @param mappedStep - MappedStep to check
 * @returns True if any action has a locator
 */
export function hasLocatorActions(mappedStep: MappedStep): boolean {
  return mappedStep.actions.some((a) => a.locator !== undefined);
}

/**
 * Gets all locators used in a mapped step
 * @param mappedStep - MappedStep to get locators from
 * @returns Array of locators
 */
export function getAllLocators(mappedStep: MappedStep): Locator[] {
  return mappedStep.actions
    .filter((a) => a.locator !== undefined)
    .map((a) => a.locator as Locator);
}

/**
 * Checks if the mapping is reliable enough for automation
 * @param mappedStep - MappedStep to check
 * @returns True if confidence is sufficient
 */
export function isReliableMapping(mappedStep: MappedStep): boolean {
  return ['exact', 'high', 'medium'].includes(mappedStep.confidence) && 
    !mappedStep.needsReview;
}

/**
 * Marks a mapped step as needing review
 * @param mappedStep - MappedStep to update
 * @param note - Optional note explaining why review is needed
 * @returns Updated MappedStep
 */
export function markForReview(mappedStep: MappedStep, note?: string): MappedStep {
  return {
    ...mappedStep,
    needsReview: true,
    notes: note ? [...(mappedStep.notes ?? []), note] : mappedStep.notes,
    updatedAt: new Date(),
  };
}

/**
 * Updates mapped step with new locator
 * @param mappedStep - MappedStep to update
 * @param actionIndex - Index of action to update
 * @param newLocator - New locator
 * @returns Updated MappedStep
 */
export function updateLocator(
  mappedStep: MappedStep,
  actionIndex: number,
  newLocator: Locator
): MappedStep {
  const updatedActions = [...mappedStep.actions];
  if (updatedActions[actionIndex]) {
    updatedActions[actionIndex] = {
      ...updatedActions[actionIndex],
      locator: newLocator,
    };
  }
  
  return {
    ...mappedStep,
    actions: updatedActions,
    updatedAt: new Date(),
  };
}
