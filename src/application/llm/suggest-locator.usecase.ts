/**
 * Suggest Locator Use Case
 * Uses LLM to suggest element locators based on DOM snapshot and element description
 */

import { ILlmClient, ChatMessage, CompletionResponse } from '../../infrastructure/llm/LlmClient.interface';
import { LocatorStrategy, LocatorConfidence } from '../../domain/models/Locator';

/**
 * Input for suggest locator use case
 */
export interface SuggestLocatorInput {
  /** Human-readable element description */
  elementDescription: string;
  
  /** DOM snapshot or accessibility tree */
  domSnapshot: string;
  
  /** Page URL for context */
  pageUrl?: string;
  
  /** Page title for context */
  pageTitle?: string;
  
  /** Preferred locator strategies */
  preferredStrategies?: LocatorStrategy[];
  
  /** Additional context */
  additionalContext?: string;
  
  /** Maximum suggestions to return */
  maxSuggestions?: number;
}

/**
 * Single locator suggestion
 */
export interface LocatorSuggestion {
  strategy: LocatorStrategy;
  value: string;
  confidence: LocatorConfidence;
  reasoning: string;
  alternatives?: Array<{
    strategy: LocatorStrategy;
    value: string;
  }>;
}

/**
 * Output from suggest locator use case
 */
export interface SuggestLocatorOutput {
  suggestions: LocatorSuggestion[];
  elementDescription: string;
  elementFound: boolean;
  notes?: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * System prompt for locator suggestion
 */
const SYSTEM_PROMPT = `You are an expert UI test automation engineer specializing in element locator strategies.
Your task is to analyze DOM snapshots and suggest robust, maintainable locators for web elements.

Guidelines:
1. Prefer stable locators: test-id > role > label > text > CSS > XPath
2. Avoid brittle locators based on dynamic classes, indexes, or generated IDs
3. Consider accessibility best practices
4. Suggest multiple fallback strategies when possible
5. Explain your reasoning for each suggestion

Respond ONLY with valid JSON in this exact format:
{
  "elementFound": boolean,
  "suggestions": [
    {
      "strategy": "css|xpath|id|name|class|tag|text|role|label|placeholder|testId|title|altText",
      "value": "the locator value",
      "confidence": "high|medium|low",
      "reasoning": "why this locator is recommended",
      "alternatives": [
        { "strategy": "...", "value": "..." }
      ]
    }
  ],
  "notes": "any additional notes or warnings"
}`;

/**
 * Build the user prompt for locator suggestion
 */
function buildUserPrompt(input: SuggestLocatorInput): string {
  const parts: string[] = [
    `Find a locator for: "${input.elementDescription}"`,
  ];

  if (input.pageUrl) {
    parts.push(`Page URL: ${input.pageUrl}`);
  }

  if (input.pageTitle) {
    parts.push(`Page Title: ${input.pageTitle}`);
  }

  if (input.preferredStrategies && input.preferredStrategies.length > 0) {
    parts.push(`Preferred strategies (in order): ${input.preferredStrategies.join(', ')}`);
  }

  if (input.additionalContext) {
    parts.push(`Additional context: ${input.additionalContext}`);
  }

  const maxSuggestions = input.maxSuggestions || 3;
  parts.push(`Return up to ${maxSuggestions} locator suggestions.`);

  parts.push('');
  parts.push('DOM Snapshot:');
  parts.push('```');
  parts.push(truncateSnapshot(input.domSnapshot, 15000));
  parts.push('```');

  return parts.join('\n');
}

/**
 * Truncate DOM snapshot to fit within token limits
 */
function truncateSnapshot(snapshot: string, maxLength: number): string {
  if (snapshot.length <= maxLength) {
    return snapshot;
  }
  
  return snapshot.substring(0, maxLength) + '\n... [truncated]';
}

/**
 * Parse LLM response into structured output
 */
function parseResponse(response: CompletionResponse): Omit<SuggestLocatorOutput, 'tokenUsage'> {
  try {
    // Try to extract JSON from the response
    const content = response.content.trim();
    let jsonStr = content;
    
    // Handle markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    const parsed = JSON.parse(jsonStr);
    
    return {
      elementFound: parsed.elementFound ?? false,
      suggestions: (parsed.suggestions || []).map((s: Record<string, unknown>) => ({
        strategy: validateStrategy(s.strategy as string),
        value: String(s.value || ''),
        confidence: validateConfidence(s.confidence as string),
        reasoning: String(s.reasoning || 'No reasoning provided'),
        alternatives: Array.isArray(s.alternatives) 
          ? s.alternatives.map((a: Record<string, unknown>) => ({
              strategy: validateStrategy(a.strategy as string),
              value: String(a.value || ''),
            }))
          : undefined,
      })),
      elementDescription: '',
      notes: parsed.notes,
    };
  } catch (error) {
    // If parsing fails, return a failed result
    return {
      elementFound: false,
      suggestions: [],
      elementDescription: '',
      notes: `Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Validate and normalize locator strategy
 */
function validateStrategy(strategy: string): LocatorStrategy {
  const validStrategies: LocatorStrategy[] = [
    'css', 'xpath', 'id', 'name', 'class', 'tag',
    'text', 'role', 'label', 'placeholder', 'testId', 'title', 'altText'
  ];
  
  const normalized = strategy?.toLowerCase();
  if (validStrategies.includes(normalized as LocatorStrategy)) {
    return normalized as LocatorStrategy;
  }
  
  // Map common variations
  const mappings: Record<string, LocatorStrategy> = {
    'data-testid': 'testId',
    'datatestid': 'testId',
    'test-id': 'testId',
    'aria-label': 'label',
    'arialabel': 'label',
    'alt': 'altText',
    'cssselector': 'css',
    'css-selector': 'css',
  };
  
  return mappings[normalized] || 'css';
}

/**
 * Validate and normalize confidence level
 */
function validateConfidence(confidence: string): LocatorConfidence {
  const normalized = confidence?.toLowerCase();
  if (['high', 'medium', 'low'].includes(normalized)) {
    return normalized as LocatorConfidence;
  }
  return 'medium';
}

/**
 * Execute suggest locator use case
 * @param llmClient - LLM client instance
 * @param input - Use case input
 * @returns Suggested locators
 */
export async function suggestLocator(
  llmClient: ILlmClient,
  input: SuggestLocatorInput
): Promise<SuggestLocatorOutput> {
  // Build messages
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserPrompt(input) },
  ];

  // Call LLM
  const response = await llmClient.complete(messages, {
    maxTokens: 2000,
    temperature: 0.3, // Lower temperature for more deterministic results
    responseFormat: 'json',
  });

  // Parse response
  const result = parseResponse(response);

  return {
    ...result,
    elementDescription: input.elementDescription,
    tokenUsage: {
      promptTokens: response.usage.promptTokens,
      completionTokens: response.usage.completionTokens,
      totalTokens: response.usage.totalTokens,
    },
  };
}

/**
 * Suggest Locator Use Case Class
 * Alternative OOP implementation
 */
export class SuggestLocatorUseCase {
  constructor(private readonly llmClient: ILlmClient) {}

  async execute(input: SuggestLocatorInput): Promise<SuggestLocatorOutput> {
    return suggestLocator(this.llmClient, input);
  }
}
