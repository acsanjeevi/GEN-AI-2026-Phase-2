/**
 * Generate Full Spec Use Case
 * Uses LLM to generate a complete Playwright test spec from feature scenarios
 */

import { ILlmClient, ChatMessage, CompletionResponse } from '../../infrastructure/llm/LlmClient.interface';
import { LocatorStrategy } from '../../domain/models/Locator';
import { UIActionType } from '../../domain/models/MappedStep';
import { StepKeyword } from '../../domain/models/Step';

/**
 * Step definition for spec generation
 */
export interface StepDefinition {
  keyword: StepKeyword;
  text: string;
  locator?: {
    strategy: LocatorStrategy;
    value: string;
  };
  actionType?: UIActionType;
  actionValue?: string;
}

/**
 * Scenario definition for spec generation
 */
export interface ScenarioDefinition {
  name: string;
  tags?: string[];
  steps: StepDefinition[];
}

/**
 * Input for generate full spec use case
 */
export interface GenerateFullSpecInput {
  /** Feature name */
  featureName: string;
  
  /** Feature description */
  featureDescription?: string;
  
  /** Scenarios to generate */
  scenarios: ScenarioDefinition[];
  
  /** Base URL for tests */
  baseUrl?: string;
  
  /** Use test fixtures */
  useFixtures?: boolean;
  
  /** Test timeout in milliseconds */
  testTimeout?: number;
  
  /** Screenshot on failure */
  screenshotOnFailure?: boolean;
  
  /** Output format */
  format?: 'playwright-test' | 'playwright-bdd';
}

/**
 * Output from generate full spec use case
 */
export interface GenerateFullSpecOutput {
  /** Complete test file content */
  specContent: string;
  
  /** Suggested filename */
  suggestedFilename: string;
  
  /** Feature name */
  featureName: string;
  
  /** Number of tests generated */
  testCount: number;
  
  /** Required dependencies */
  dependencies: string[];
  
  /** Token usage */
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * System prompt for full spec generation
 */
const SYSTEM_PROMPT = `You are an expert Playwright test automation engineer.
Your task is to generate a complete, production-ready Playwright test specification file.

Guidelines:
1. Use @playwright/test framework
2. Structure tests using describe/test blocks
3. Add proper setup and teardown hooks
4. Include meaningful assertions
5. Handle async operations properly
6. Add comments for clarity
7. Follow Playwright best practices
8. Generate idiomatic TypeScript code

Respond ONLY with valid JSON in this exact format:
{
  "specContent": "the complete test file content",
  "suggestedFilename": "feature-name.spec.ts",
  "dependencies": ["@playwright/test", "other-deps"]
}`;

/**
 * Convert feature name to valid filename
 */
function toFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + '.spec.ts';
}

/**
 * Build locator code based on strategy
 */
function buildLocatorCode(locator: { strategy: LocatorStrategy; value: string }): string {
  const escape = (s: string) => s.replace(/'/g, "\\'");
  
  switch (locator.strategy) {
    case 'css':
      return `page.locator('${escape(locator.value)}')`;
    case 'xpath':
      return `page.locator('xpath=${escape(locator.value)}')`;
    case 'id':
      return `page.locator('#${escape(locator.value)}')`;
    case 'name':
      return `page.locator('[name="${escape(locator.value)}"]')`;
    case 'text':
      return `page.getByText('${escape(locator.value)}')`;
    case 'role':
      return `page.getByRole('${escape(locator.value)}')`;
    case 'label':
      return `page.getByLabel('${escape(locator.value)}')`;
    case 'placeholder':
      return `page.getByPlaceholder('${escape(locator.value)}')`;
    case 'testId':
      return `page.getByTestId('${escape(locator.value)}')`;
    default:
      return `page.locator('${escape(locator.value)}')`;
  }
}

/**
 * Generate code for a single step
 */
function generateStepCode(step: StepDefinition): string {
  const actionType = step.actionType || inferActionType(step.text);
  const escape = (s: string) => s.replace(/'/g, "\\'");

  switch (actionType) {
    case 'navigate':
      const url = step.actionValue || extractUrl(step.text);
      return url ? `await page.goto('${escape(url)}');` : '// TODO: Add navigation URL';

    case 'click':
      if (step.locator) {
        return `await ${buildLocatorCode(step.locator)}.click();`;
      }
      return `// TODO: Add locator for click action`;

    case 'type':
    case 'fill':
      if (step.locator && step.actionValue) {
        return `await ${buildLocatorCode(step.locator)}.fill('${escape(step.actionValue)}');`;
      }
      return `// TODO: Add locator and value for type action`;

    case 'select':
      if (step.locator && step.actionValue) {
        return `await ${buildLocatorCode(step.locator)}.selectOption('${escape(step.actionValue)}');`;
      }
      return `// TODO: Add locator and value for select action`;

    case 'assert':
      return generateAssertionCode(step);

    case 'wait':
      const timeout = step.actionValue ? parseInt(step.actionValue, 10) : 1000;
      return `await page.waitForTimeout(${timeout});`;

    case 'hover':
      if (step.locator) {
        return `await ${buildLocatorCode(step.locator)}.hover();`;
      }
      return `// TODO: Add locator for hover action`;

    default:
      return `// TODO: Implement step - ${step.text}`;
  }
}

/**
 * Infer action type from step text
 */
function inferActionType(text: string): UIActionType {
  const lower = text.toLowerCase();
  
  if (lower.includes('navigate') || lower.includes('go to') || lower.includes('open') || lower.includes('visit')) {
    return 'navigate';
  }
  if (lower.includes('click') || lower.includes('press') || lower.includes('tap')) {
    return 'click';
  }
  if (lower.includes('type') || lower.includes('enter') || lower.includes('fill') || lower.includes('input')) {
    return 'type';
  }
  if (lower.includes('select') || lower.includes('choose') || lower.includes('pick')) {
    return 'select';
  }
  if (lower.includes('should') || lower.includes('see') || lower.includes('verify') || lower.includes('expect')) {
    return 'assert';
  }
  if (lower.includes('wait')) {
    return 'wait';
  }
  if (lower.includes('hover')) {
    return 'hover';
  }
  
  return 'click';
}

/**
 * Extract URL from step text
 */
function extractUrl(text: string): string | null {
  const urlMatch = text.match(/https?:\/\/[^\s"']+/);
  if (urlMatch) return urlMatch[0];
  
  const quotedMatch = text.match(/"([^"]+)"|'([^']+)'/);
  if (quotedMatch) return quotedMatch[1] || quotedMatch[2];
  
  return null;
}

/**
 * Generate assertion code
 */
function generateAssertionCode(step: StepDefinition): string {
  const text = step.text.toLowerCase();
  const escape = (s: string) => s.replace(/'/g, "\\'");
  
  if (text.includes('visible') && step.locator) {
    return `await expect(${buildLocatorCode(step.locator)}).toBeVisible();`;
  }
  if (text.includes('hidden') && step.locator) {
    return `await expect(${buildLocatorCode(step.locator)}).toBeHidden();`;
  }
  if (text.includes('text') && step.locator && step.actionValue) {
    return `await expect(${buildLocatorCode(step.locator)}).toHaveText('${escape(step.actionValue)}');`;
  }
  if (text.includes('url') && step.actionValue) {
    return `await expect(page).toHaveURL('${escape(step.actionValue)}');`;
  }
  if (text.includes('title') && step.actionValue) {
    return `await expect(page).toHaveTitle('${escape(step.actionValue)}');`;
  }
  
  // Default assertion
  if (step.locator) {
    return `await expect(${buildLocatorCode(step.locator)}).toBeVisible();`;
  }
  
  return `// TODO: Add assertion for - ${step.text}`;
}

/**
 * Generate spec without LLM (template-based)
 */
function generateTemplateSpec(input: GenerateFullSpecInput): GenerateFullSpecOutput {
  const lines: string[] = [];
  
  // Imports
  lines.push("import { test, expect, Page } from '@playwright/test';");
  lines.push('');
  
  // Test configuration
  if (input.testTimeout) {
    lines.push(`test.setTimeout(${input.testTimeout});`);
    lines.push('');
  }
  
  // Feature description
  lines.push(`/**`);
  lines.push(` * ${input.featureName}`);
  if (input.featureDescription) {
    lines.push(` * ${input.featureDescription}`);
  }
  lines.push(` */`);
  lines.push('');
  
  // Test suite
  lines.push(`test.describe('${escapeString(input.featureName)}', () => {`);
  
  // Setup hook
  if (input.baseUrl) {
    lines.push('');
    lines.push(`  test.beforeEach(async ({ page }) => {`);
    lines.push(`    await page.goto('${escapeString(input.baseUrl)}');`);
    lines.push(`  });`);
  }
  
  // Generate each scenario as a test
  for (const scenario of input.scenarios) {
    lines.push('');
    
    // Tags as test annotations
    if (scenario.tags && scenario.tags.length > 0) {
      const tagComment = scenario.tags.map(t => `@${t}`).join(' ');
      lines.push(`  // ${tagComment}`);
    }
    
    lines.push(`  test('${escapeString(scenario.name)}', async ({ page }) => {`);
    
    // Generate step code
    for (const step of scenario.steps) {
      lines.push(`    // ${step.keyword} ${step.text}`);
      lines.push(`    ${generateStepCode(step)}`);
      lines.push('');
    }
    
    lines.push(`  });`);
  }
  
  lines.push('});');
  lines.push('');
  
  return {
    specContent: lines.join('\n'),
    suggestedFilename: toFilename(input.featureName),
    featureName: input.featureName,
    testCount: input.scenarios.length,
    dependencies: ['@playwright/test'],
  };
}

/**
 * Escape string for JavaScript
 */
function escapeString(str: string): string {
  return str.replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

/**
 * Build user prompt for LLM spec generation
 */
function buildUserPrompt(input: GenerateFullSpecInput): string {
  const parts: string[] = [
    'Generate a complete Playwright test specification file.',
    '',
    `Feature: ${input.featureName}`,
  ];

  if (input.featureDescription) {
    parts.push(`Description: ${input.featureDescription}`);
  }

  if (input.baseUrl) {
    parts.push(`Base URL: ${input.baseUrl}`);
  }

  parts.push('');
  parts.push('Scenarios:');
  
  for (const scenario of input.scenarios) {
    parts.push('');
    parts.push(`  Scenario: ${scenario.name}`);
    if (scenario.tags) {
      parts.push(`  Tags: ${scenario.tags.join(', ')}`);
    }
    for (const step of scenario.steps) {
      let stepLine = `    ${step.keyword} ${step.text}`;
      if (step.locator) {
        stepLine += ` [${step.locator.strategy}: ${step.locator.value}]`;
      }
      if (step.actionValue) {
        stepLine += ` (value: "${step.actionValue}")`;
      }
      parts.push(stepLine);
    }
  }

  parts.push('');
  parts.push('Configuration:');
  parts.push(`- Use fixtures: ${input.useFixtures ?? false}`);
  parts.push(`- Test timeout: ${input.testTimeout || 30000}ms`);
  parts.push(`- Screenshot on failure: ${input.screenshotOnFailure ?? true}`);
  parts.push(`- Format: ${input.format || 'playwright-test'}`);

  return parts.join('\n');
}

/**
 * Parse LLM response
 */
function parseResponse(response: CompletionResponse, input: GenerateFullSpecInput): GenerateFullSpecOutput {
  try {
    const content = response.content.trim();
    let jsonStr = content;
    
    // Handle markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    const parsed = JSON.parse(jsonStr);
    
    return {
      specContent: String(parsed.specContent || ''),
      suggestedFilename: parsed.suggestedFilename || toFilename(input.featureName),
      featureName: input.featureName,
      testCount: input.scenarios.length,
      dependencies: Array.isArray(parsed.dependencies) ? parsed.dependencies : ['@playwright/test'],
    };
  } catch {
    // If parsing fails, use template generation
    return generateTemplateSpec(input);
  }
}

/**
 * Execute generate full spec use case
 */
export async function generateFullSpec(
  llmClient: ILlmClient | null,
  input: GenerateFullSpecInput
): Promise<GenerateFullSpecOutput> {
  // If no LLM client or simple case, use template generation
  if (!llmClient || !llmClient.isConfigured() || input.scenarios.length <= 2) {
    return generateTemplateSpec(input);
  }

  // Use LLM for complex specs
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserPrompt(input) },
  ];

  try {
    const response = await llmClient.complete(messages, {
      maxTokens: 4000,
      temperature: 0.3,
      responseFormat: 'json',
    });

    const result = parseResponse(response, input);

    return {
      ...result,
      tokenUsage: {
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens,
      },
    };
  } catch {
    // Fall back to template if LLM fails
    return generateTemplateSpec(input);
  }
}

/**
 * Generate Full Spec Use Case Class
 */
export class GenerateFullSpecUseCase {
  constructor(private readonly llmClient: ILlmClient | null) {}

  async execute(input: GenerateFullSpecInput): Promise<GenerateFullSpecOutput> {
    return generateFullSpec(this.llmClient, input);
  }
}
