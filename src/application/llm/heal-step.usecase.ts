/**
 * Heal Step Use Case
 * Uses LLM to heal broken locators by analyzing DOM changes
 */

import { ILlmClient, ChatMessage, CompletionResponse } from '../../infrastructure/llm/LlmClient.interface';
import { LocatorStrategy, LocatorConfidence } from '../../domain/models/Locator';

/**
 * Input for heal step use case
 */
export interface HealStepInput {
  /** Original step text */
  stepText: string;
  
  /** Original locator that failed */
  originalLocator: {
    strategy: LocatorStrategy;
    value: string;
  };
  
  /** Error message from failure */
  errorMessage: string;
  
  /** Current DOM snapshot */
  currentDomSnapshot: string;
  
  /** Previous DOM snapshot (if available) */
  previousDomSnapshot?: string;
  
  /** Page URL */
  pageUrl?: string;
  
  /** Element description */
  elementDescription?: string;
  
  /** Number of previous healing attempts */
  healingAttempt?: number;
  
  /** Maximum suggestions */
  maxSuggestions?: number;
}

/**
 * Type of change detected
 */
export type ChangeType = 
  | 'attribute-changed'
  | 'element-moved'
  | 'element-removed'
  | 'structure-changed'
  | 'unknown';

/**
 * Healing suggestion
 */
export interface HealingSuggestion {
  locator: {
    strategy: LocatorStrategy;
    value: string;
  };
  confidence: LocatorConfidence;
  explanation: string;
  changeType: ChangeType;
  preventionTip?: string;
}

/**
 * Recommendation type
 */
export type HealingRecommendation = 
  | 'retry-with-suggestion'
  | 'manual-review'
  | 'update-feature'
  | 'wait-and-retry';

/**
 * Output from heal step use case
 */
export interface HealStepOutput {
  /** Whether healing was successful */
  healed: boolean;
  
  /** Healing suggestions */
  suggestions: HealingSuggestion[];
  
  /** Analysis of the failure */
  analysis: string;
  
  /** Whether element exists in current DOM */
  elementExists: boolean;
  
  /** Recommendation */
  recommendation: HealingRecommendation;
  
  /** Token usage */
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * System prompt for step healing
 */
const SYSTEM_PROMPT = `You are an expert UI test automation engineer specializing in self-healing test scripts.
Your task is to analyze why a locator failed and suggest fixes.

Analyze:
1. Compare the original locator with the current DOM
2. Identify what changed (attribute, structure, element removal, etc.)
3. Suggest robust alternative locators
4. Provide prevention tips for future stability

Common failure patterns:
- Dynamic IDs/classes that changed
- Element moved to different parent
- Text content changed
- Element removed or replaced
- Timing issues (element not yet loaded)

Respond ONLY with valid JSON in this exact format:
{
  "elementExists": boolean,
  "analysis": "detailed analysis of what went wrong",
  "suggestions": [
    {
      "locator": { "strategy": "...", "value": "..." },
      "confidence": "high|medium|low",
      "explanation": "why this locator should work",
      "changeType": "attribute-changed|element-moved|element-removed|structure-changed|unknown",
      "preventionTip": "how to prevent this failure in future"
    }
  ],
  "recommendation": "retry-with-suggestion|manual-review|update-feature|wait-and-retry"
}`;

/**
 * Build user prompt for healing
 */
function buildUserPrompt(input: HealStepInput): string {
  const parts: string[] = [
    'Analyze this locator failure and suggest fixes:',
    '',
    `Step: "${input.stepText}"`,
    `Original Locator: ${input.originalLocator.strategy} = "${input.originalLocator.value}"`,
    `Error: ${input.errorMessage}`,
  ];

  if (input.pageUrl) {
    parts.push(`Page URL: ${input.pageUrl}`);
  }

  if (input.elementDescription) {
    parts.push(`Element Description: ${input.elementDescription}`);
  }

  if (input.healingAttempt) {
    parts.push(`Healing Attempt: ${input.healingAttempt}`);
  }

  parts.push(`Max Suggestions: ${input.maxSuggestions || 3}`);

  // Add DOM snapshots
  parts.push('');
  parts.push('Current DOM Snapshot:');
  parts.push('```');
  parts.push(truncateSnapshot(input.currentDomSnapshot, 10000));
  parts.push('```');

  if (input.previousDomSnapshot) {
    parts.push('');
    parts.push('Previous DOM Snapshot (when it worked):');
    parts.push('```');
    parts.push(truncateSnapshot(input.previousDomSnapshot, 10000));
    parts.push('```');
  }

  return parts.join('\n');
}

/**
 * Truncate snapshot to fit token limits
 */
function truncateSnapshot(snapshot: string, maxLength: number): string {
  if (snapshot.length <= maxLength) {
    return snapshot;
  }
  return snapshot.substring(0, maxLength) + '\n... [truncated]';
}

/**
 * Analyze error message to provide quick insights
 */
function analyzeError(errorMessage: string): { possibleCause: string; quickFix?: string } {
  const lower = errorMessage.toLowerCase();
  
  if (lower.includes('timeout') || lower.includes('waiting for')) {
    return {
      possibleCause: 'Element took too long to appear or was never present',
      quickFix: 'Increase timeout or add explicit wait',
    };
  }
  
  if (lower.includes('strict mode') || lower.includes('multiple elements')) {
    return {
      possibleCause: 'Locator matches multiple elements',
      quickFix: 'Make locator more specific',
    };
  }
  
  if (lower.includes('not found') || lower.includes('no element')) {
    return {
      possibleCause: 'Element does not exist in DOM',
      quickFix: 'Verify element exists and update locator',
    };
  }
  
  if (lower.includes('detached') || lower.includes('stale')) {
    return {
      possibleCause: 'Element was removed from DOM after being found',
      quickFix: 'Re-query the element before interaction',
    };
  }
  
  if (lower.includes('hidden') || lower.includes('not visible')) {
    return {
      possibleCause: 'Element exists but is not visible/interactable',
      quickFix: 'Wait for element to be visible or scroll into view',
    };
  }
  
  return {
    possibleCause: 'Unknown cause - requires DOM analysis',
  };
}

/**
 * Try to find element in snapshot using simple heuristics
 */
function quickElementSearch(
  snapshot: string,
  locator: { strategy: LocatorStrategy; value: string },
  elementDescription?: string
): boolean {
  const snapshotLower = snapshot.toLowerCase();
  
  // Check if the locator value appears in the snapshot
  if (snapshot.includes(locator.value)) {
    return true;
  }
  
  // Check for partial matches based on strategy
  switch (locator.strategy) {
    case 'id':
      return snapshot.includes(`id="${locator.value}"`) || 
             snapshot.includes(`id='${locator.value}'`);
    case 'class':
      return snapshot.includes(`class="${locator.value}"`) || 
             snapshotLower.includes(locator.value.toLowerCase());
    case 'text':
      return snapshotLower.includes(locator.value.toLowerCase());
    case 'testId':
      return snapshot.includes(`data-testid="${locator.value}"`) ||
             snapshot.includes(`data-test-id="${locator.value}"`);
  }
  
  // If we have element description, check for that
  if (elementDescription) {
    const descWords = elementDescription.toLowerCase().split(/\s+/);
    return descWords.some(word => snapshotLower.includes(word));
  }
  
  return false;
}

/**
 * Generate suggestions without LLM (fallback)
 */
function generateFallbackSuggestions(input: HealStepInput): HealStepOutput {
  const errorAnalysis = analyzeError(input.errorMessage);
  const elementMightExist = quickElementSearch(
    input.currentDomSnapshot,
    input.originalLocator,
    input.elementDescription
  );

  const suggestions: HealingSuggestion[] = [];
  
  // Suggest alternative strategies based on original
  if (input.originalLocator.strategy === 'css' || input.originalLocator.strategy === 'xpath') {
    // Suggest using semantic locators
    if (input.elementDescription) {
      suggestions.push({
        locator: { strategy: 'text', value: input.elementDescription },
        confidence: 'low',
        explanation: 'Try using text-based locator from element description',
        changeType: 'unknown',
        preventionTip: 'Consider using semantic locators (role, label, testId) for stability',
      });
    }
  }
  
  // If original was ID, suggest class-based
  if (input.originalLocator.strategy === 'id') {
    suggestions.push({
      locator: { 
        strategy: 'css', 
        value: `[id*="${extractStableIdPart(input.originalLocator.value)}"]` 
      },
      confidence: 'low',
      explanation: 'Try partial ID match in case ID has dynamic portions',
      changeType: 'attribute-changed',
      preventionTip: 'Use data-testid instead of auto-generated IDs',
    });
  }

  // Determine recommendation
  let recommendation: HealingRecommendation = 'manual-review';
  if (suggestions.length > 0) {
    recommendation = 'retry-with-suggestion';
  } else if (errorAnalysis.possibleCause.includes('timeout')) {
    recommendation = 'wait-and-retry';
  }

  return {
    healed: suggestions.length > 0,
    suggestions,
    analysis: `${errorAnalysis.possibleCause}. ${errorAnalysis.quickFix || 'Please review the DOM snapshot.'}`,
    elementExists: elementMightExist,
    recommendation,
  };
}

/**
 * Extract stable part of an ID (remove numbers/timestamps)
 */
function extractStableIdPart(id: string): string {
  // Remove trailing numbers, UUIDs, timestamps
  return id
    .replace(/[-_]?\d{10,}/g, '') // Remove timestamps
    .replace(/[-_]?[a-f0-9]{8,}/gi, '') // Remove hex strings (UUIDs)
    .replace(/[-_]?\d+$/g, '') // Remove trailing numbers
    .replace(/[-_]+$/, ''); // Clean up trailing separators
}

/**
 * Parse LLM response
 */
function parseResponse(response: CompletionResponse): Omit<HealStepOutput, 'tokenUsage'> {
  try {
    const content = response.content.trim();
    let jsonStr = content;
    
    // Handle markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    const parsed = JSON.parse(jsonStr);
    
    const suggestions: HealingSuggestion[] = (parsed.suggestions || []).map((s: Record<string, unknown>) => ({
      locator: {
        strategy: validateStrategy((s.locator as Record<string, string>)?.strategy),
        value: String((s.locator as Record<string, string>)?.value || ''),
      },
      confidence: validateConfidence(s.confidence as string),
      explanation: String(s.explanation || 'No explanation provided'),
      changeType: validateChangeType(s.changeType as string),
      preventionTip: s.preventionTip as string | undefined,
    }));

    return {
      healed: suggestions.length > 0,
      suggestions,
      analysis: String(parsed.analysis || 'Analysis not available'),
      elementExists: Boolean(parsed.elementExists),
      recommendation: validateRecommendation(parsed.recommendation as string),
    };
  } catch (error) {
    return {
      healed: false,
      suggestions: [],
      analysis: `Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      elementExists: false,
      recommendation: 'manual-review',
    };
  }
}

/**
 * Validate locator strategy
 */
function validateStrategy(strategy: string): LocatorStrategy {
  const valid: LocatorStrategy[] = [
    'css', 'xpath', 'id', 'name', 'class', 'tag',
    'text', 'role', 'label', 'placeholder', 'testId', 'title', 'altText'
  ];
  return valid.includes(strategy as LocatorStrategy) 
    ? (strategy as LocatorStrategy) 
    : 'css';
}

/**
 * Validate confidence level
 */
function validateConfidence(confidence: string): LocatorConfidence {
  return ['high', 'medium', 'low'].includes(confidence) 
    ? (confidence as LocatorConfidence) 
    : 'medium';
}

/**
 * Validate change type
 */
function validateChangeType(changeType: string): ChangeType {
  const valid: ChangeType[] = [
    'attribute-changed', 'element-moved', 'element-removed', 'structure-changed', 'unknown'
  ];
  return valid.includes(changeType as ChangeType) 
    ? (changeType as ChangeType) 
    : 'unknown';
}

/**
 * Validate recommendation
 */
function validateRecommendation(rec: string): HealingRecommendation {
  const valid: HealingRecommendation[] = [
    'retry-with-suggestion', 'manual-review', 'update-feature', 'wait-and-retry'
  ];
  return valid.includes(rec as HealingRecommendation) 
    ? (rec as HealingRecommendation) 
    : 'manual-review';
}

/**
 * Execute heal step use case
 */
export async function healStep(
  llmClient: ILlmClient | null,
  input: HealStepInput
): Promise<HealStepOutput> {
  // If no LLM client, use fallback
  if (!llmClient || !llmClient.isConfigured()) {
    return generateFallbackSuggestions(input);
  }

  // Build messages
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserPrompt(input) },
  ];

  try {
    const response = await llmClient.complete(messages, {
      maxTokens: 2000,
      temperature: 0.3,
      responseFormat: 'json',
    });

    const result = parseResponse(response);

    return {
      ...result,
      tokenUsage: {
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens,
      },
    };
  } catch (error) {
    // Fall back to simple healing if LLM fails
    const fallback = generateFallbackSuggestions(input);
    return {
      ...fallback,
      analysis: `LLM error: ${error instanceof Error ? error.message : 'Unknown'}. ${fallback.analysis}`,
    };
  }
}

/**
 * Heal Step Use Case Class
 */
export class HealStepUseCase {
  constructor(private readonly llmClient: ILlmClient | null) {}

  async execute(input: HealStepInput): Promise<HealStepOutput> {
    return healStep(this.llmClient, input);
  }
}
