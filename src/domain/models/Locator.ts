/**
 * Locator domain model
 * Represents element locator strategies for UI automation
 * 
 * This is a pure domain model with NO infrastructure dependencies
 */

/**
 * Supported locator strategies
 */
export type LocatorStrategy = 
  | 'css'
  | 'xpath'
  | 'id'
  | 'name'
  | 'class'
  | 'tag'
  | 'text'
  | 'role'
  | 'label'
  | 'placeholder'
  | 'testId'
  | 'title'
  | 'altText';

/**
 * Locator confidence level
 */
export type LocatorConfidence = 'high' | 'medium' | 'low';

/**
 * Source of the locator
 */
export type LocatorSource = 
  | 'mcp'        // From MCP tool
  | 'llm'        // From LLM suggestion
  | 'manual'     // Manually defined
  | 'healed';    // Auto-healed from failure

/**
 * Locator domain model
 * Represents a strategy to locate an element on a page
 */
export interface Locator {
  /** Unique identifier for the locator */
  id: string;
  
  /** Locator strategy (css, xpath, role, etc.) */
  strategy: LocatorStrategy;
  
  /** Locator value/selector */
  value: string;
  
  /** Human-readable description of what element this locates */
  description?: string;
  
  /** Confidence level of the locator */
  confidence: LocatorConfidence;
  
  /** Source of the locator */
  source: LocatorSource;
  
  /** Whether this locator is the primary/preferred one */
  isPrimary: boolean;
  
  /** Fallback locators if this one fails */
  fallbacks?: Locator[];
  
  /** Frame context if element is in an iframe */
  frameSelector?: string;
  
  /** Number of times this locator has been used successfully */
  successCount: number;
  
  /** Number of times this locator has failed */
  failureCount: number;
  
  /** Last time this locator was validated */
  lastValidated?: Date;
}

/**
 * Creates a new Locator with default values
 * @param partial - Partial locator data
 * @returns Complete Locator object
 */
export function createLocator(
  partial: Partial<Locator> & { 
    id: string; 
    strategy: LocatorStrategy; 
    value: string;
  }
): Locator {
  return {
    id: partial.id,
    strategy: partial.strategy,
    value: partial.value,
    description: partial.description,
    confidence: partial.confidence ?? 'medium',
    source: partial.source ?? 'manual',
    isPrimary: partial.isPrimary ?? true,
    fallbacks: partial.fallbacks,
    frameSelector: partial.frameSelector,
    successCount: partial.successCount ?? 0,
    failureCount: partial.failureCount ?? 0,
    lastValidated: partial.lastValidated,
  };
}

/**
 * Creates a CSS locator
 * @param id - Locator ID
 * @param selector - CSS selector
 * @param source - Locator source
 * @returns CSS Locator
 */
export function createCssLocator(
  id: string, 
  selector: string, 
  source: LocatorSource = 'manual'
): Locator {
  return createLocator({
    id,
    strategy: 'css',
    value: selector,
    source,
    confidence: 'medium',
  });
}

/**
 * Creates an XPath locator
 * @param id - Locator ID
 * @param xpath - XPath expression
 * @param source - Locator source
 * @returns XPath Locator
 */
export function createXPathLocator(
  id: string, 
  xpath: string, 
  source: LocatorSource = 'manual'
): Locator {
  return createLocator({
    id,
    strategy: 'xpath',
    value: xpath,
    source,
    confidence: 'medium',
  });
}

/**
 * Creates a role-based locator (Playwright-style)
 * @param id - Locator ID
 * @param role - ARIA role
 * @param options - Additional options like name
 * @param source - Locator source
 * @returns Role Locator
 */
export function createRoleLocator(
  id: string,
  role: string,
  options?: { name?: string },
  source: LocatorSource = 'manual'
): Locator {
  const value = options?.name 
    ? `${role}[name="${options.name}"]` 
    : role;
  
  return createLocator({
    id,
    strategy: 'role',
    value,
    source,
    confidence: 'high', // Role locators are generally more stable
  });
}

/**
 * Creates a test ID locator
 * @param id - Locator ID
 * @param testId - Test ID value
 * @param source - Locator source
 * @returns TestId Locator
 */
export function createTestIdLocator(
  id: string,
  testId: string,
  source: LocatorSource = 'manual'
): Locator {
  return createLocator({
    id,
    strategy: 'testId',
    value: testId,
    source,
    confidence: 'high', // Test IDs are stable
  });
}

/**
 * Converts locator to Playwright locator string
 * @param locator - Locator to convert
 * @returns Playwright-compatible locator string
 */
export function toPlaywrightLocator(locator: Locator): string {
  switch (locator.strategy) {
    case 'css':
      return locator.value;
    case 'xpath':
      return `xpath=${locator.value}`;
    case 'id':
      return `#${locator.value}`;
    case 'class':
      return `.${locator.value}`;
    case 'text':
      return `text=${locator.value}`;
    case 'role':
      return `role=${locator.value}`;
    case 'label':
      return `label=${locator.value}`;
    case 'placeholder':
      return `placeholder=${locator.value}`;
    case 'testId':
      return `data-testid=${locator.value}`;
    case 'title':
      return `title=${locator.value}`;
    case 'altText':
      return `alt=${locator.value}`;
    default:
      return locator.value;
  }
}

/**
 * Records a successful use of the locator
 * @param locator - Locator to update
 * @returns Updated locator with incremented success count
 */
export function recordSuccess(locator: Locator): Locator {
  return {
    ...locator,
    successCount: locator.successCount + 1,
    lastValidated: new Date(),
  };
}

/**
 * Records a failed use of the locator
 * @param locator - Locator to update
 * @returns Updated locator with incremented failure count
 */
export function recordFailure(locator: Locator): Locator {
  return {
    ...locator,
    failureCount: locator.failureCount + 1,
    lastValidated: new Date(),
  };
}

/**
 * Calculates reliability score for a locator (0-1)
 * @param locator - Locator to calculate score for
 * @returns Reliability score between 0 and 1
 */
export function calculateReliabilityScore(locator: Locator): number {
  const total = locator.successCount + locator.failureCount;
  if (total === 0) {
    return 0.5; // Unknown reliability
  }
  return locator.successCount / total;
}

/**
 * Checks if locator should be healed based on failure rate
 * @param locator - Locator to check
 * @param threshold - Failure rate threshold (default 0.3 = 30%)
 * @returns True if locator should be healed
 */
export function shouldHeal(locator: Locator, threshold: number = 0.3): boolean {
  const total = locator.successCount + locator.failureCount;
  if (total < 5) {
    return false; // Not enough data
  }
  return calculateReliabilityScore(locator) < (1 - threshold);
}
