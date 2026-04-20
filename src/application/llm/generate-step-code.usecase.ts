/**
 * Generate Step Code Use Case
 * Uses LLM to generate Playwright code for a single step
 */

import { ILlmClient, ChatMessage, CompletionResponse } from '../../infrastructure/llm/LlmClient.interface';
import { LocatorStrategy } from '../../domain/models/Locator';
import { UIActionType } from '../../domain/models/MappedStep';
import { StepKeyword } from '../../domain/models/Step';

/**
 * Input for generate step code use case
 */
export interface GenerateStepCodeInput {
  /** Step keyword */
  keyword: StepKeyword;
  
  /** Step text */
  stepText: string;
  
  /** UI action type */
  actionType: UIActionType;
  
  /** Element locator */
  locator?: {
    strategy: LocatorStrategy;
    value: string;
  };
  
  /** Value for the action */
  actionValue?: string;
  
  /** Additional action options */
  actionOptions?: Record<string, unknown>;
  
  /** Include comments in generated code */
  includeComments?: boolean;
  
  /** Code style preference */
  codeStyle?: 'async-await' | 'promise-chain';
}

/**
 * Output from generate step code use case
 */
export interface GenerateStepCodeOutput {
  /** Generated Playwright code */
  code: string;
  
  /** Required imports */
  imports: string[];
  
  /** Step text */
  stepText: string;
  
  /** Explanation of the code */
  explanation?: string;
  
  /** Token usage */
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * System prompt for code generation
 */
const SYSTEM_PROMPT = `You are an expert Playwright test automation engineer.
Your task is to generate clean, robust Playwright test code for UI automation steps.

Guidelines:
1. Use modern async/await syntax (unless specified otherwise)
2. Add appropriate waits and assertions
3. Handle potential errors gracefully
4. Use Playwright best practices
5. Generate code that is self-documenting

Respond ONLY with valid JSON in this exact format:
{
  "code": "the generated Playwright code",
  "imports": ["list", "of", "required", "imports"],
  "explanation": "brief explanation of what the code does"
}`;

/**
 * Build locator code based on strategy
 */
function buildLocatorCode(locator: { strategy: LocatorStrategy; value: string }): string {
  switch (locator.strategy) {
    case 'css':
      return `page.locator('${escapeString(locator.value)}')`;
    case 'xpath':
      return `page.locator('xpath=${escapeString(locator.value)}')`;
    case 'id':
      return `page.locator('#${escapeString(locator.value)}')`;
    case 'name':
      return `page.locator('[name="${escapeString(locator.value)}"]')`;
    case 'class':
      return `page.locator('.${escapeString(locator.value)}')`;
    case 'tag':
      return `page.locator('${escapeString(locator.value)}')`;
    case 'text':
      return `page.getByText('${escapeString(locator.value)}')`;
    case 'role':
      return `page.getByRole('${escapeString(locator.value)}')`;
    case 'label':
      return `page.getByLabel('${escapeString(locator.value)}')`;
    case 'placeholder':
      return `page.getByPlaceholder('${escapeString(locator.value)}')`;
    case 'testId':
      return `page.getByTestId('${escapeString(locator.value)}')`;
    case 'title':
      return `page.getByTitle('${escapeString(locator.value)}')`;
    case 'altText':
      return `page.getByAltText('${escapeString(locator.value)}')`;
    default:
      return `page.locator('${escapeString(locator.value)}')`;
  }
}

/**
 * Escape string for JavaScript
 */
function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/**
 * Generate code for simple actions without LLM
 * Used as fallback or for straightforward cases
 */
function generateSimpleCode(input: GenerateStepCodeInput): GenerateStepCodeOutput | null {
  const { actionType, locator, actionValue, includeComments } = input;
  
  let code = '';
  const imports: string[] = [];
  let explanation = '';

  // Add comment if requested
  const comment = includeComments ? `// ${input.keyword} ${input.stepText}\n` : '';

  switch (actionType) {
    case 'navigate':
      if (actionValue) {
        code = `${comment}await page.goto('${escapeString(actionValue)}');`;
        explanation = `Navigate to ${actionValue}`;
        return { code, imports, stepText: input.stepText, explanation };
      }
      break;

    case 'click':
      if (locator) {
        code = `${comment}await ${buildLocatorCode(locator)}.click();`;
        explanation = `Click on element located by ${locator.strategy}`;
        return { code, imports, stepText: input.stepText, explanation };
      }
      break;

    case 'type':
    case 'fill':
      if (locator && actionValue !== undefined) {
        code = `${comment}await ${buildLocatorCode(locator)}.fill('${escapeString(actionValue)}');`;
        explanation = `Fill text into element located by ${locator.strategy}`;
        return { code, imports, stepText: input.stepText, explanation };
      }
      break;

    case 'select':
      if (locator && actionValue) {
        code = `${comment}await ${buildLocatorCode(locator)}.selectOption('${escapeString(actionValue)}');`;
        explanation = `Select option in element located by ${locator.strategy}`;
        return { code, imports, stepText: input.stepText, explanation };
      }
      break;

    case 'check':
      if (locator) {
        code = `${comment}await ${buildLocatorCode(locator)}.check();`;
        explanation = `Check checkbox located by ${locator.strategy}`;
        return { code, imports, stepText: input.stepText, explanation };
      }
      break;

    case 'uncheck':
      if (locator) {
        code = `${comment}await ${buildLocatorCode(locator)}.uncheck();`;
        explanation = `Uncheck checkbox located by ${locator.strategy}`;
        return { code, imports, stepText: input.stepText, explanation };
      }
      break;

    case 'hover':
      if (locator) {
        code = `${comment}await ${buildLocatorCode(locator)}.hover();`;
        explanation = `Hover over element located by ${locator.strategy}`;
        return { code, imports, stepText: input.stepText, explanation };
      }
      break;

    case 'wait':
      if (actionValue) {
        const timeout = parseInt(actionValue, 10) || 5000;
        code = `${comment}await page.waitForTimeout(${timeout});`;
        explanation = `Wait for ${timeout}ms`;
        return { code, imports, stepText: input.stepText, explanation };
      }
      break;

    case 'press':
      if (locator && actionValue) {
        code = `${comment}await ${buildLocatorCode(locator)}.press('${escapeString(actionValue)}');`;
        explanation = `Press key ${actionValue} on element`;
        return { code, imports, stepText: input.stepText, explanation };
      } else if (actionValue) {
        code = `${comment}await page.keyboard.press('${escapeString(actionValue)}');`;
        explanation = `Press key ${actionValue}`;
        return { code, imports, stepText: input.stepText, explanation };
      }
      break;

    case 'screenshot':
      const filename = actionValue || 'screenshot.png';
      code = `${comment}await page.screenshot({ path: '${escapeString(filename)}' });`;
      explanation = `Take screenshot and save to ${filename}`;
      return { code, imports, stepText: input.stepText, explanation };

    case 'clear':
      if (locator) {
        code = `${comment}await ${buildLocatorCode(locator)}.clear();`;
        explanation = `Clear input field located by ${locator.strategy}`;
        return { code, imports, stepText: input.stepText, explanation };
      }
      break;

    case 'focus':
      if (locator) {
        code = `${comment}await ${buildLocatorCode(locator)}.focus();`;
        explanation = `Focus on element located by ${locator.strategy}`;
        return { code, imports, stepText: input.stepText, explanation };
      }
      break;

    case 'blur':
      if (locator) {
        code = `${comment}await ${buildLocatorCode(locator)}.blur();`;
        explanation = `Remove focus from element located by ${locator.strategy}`;
        return { code, imports, stepText: input.stepText, explanation };
      }
      break;
  }

  return null;
}

/**
 * Build user prompt for LLM code generation
 */
function buildUserPrompt(input: GenerateStepCodeInput): string {
  const parts: string[] = [
    `Generate Playwright code for this step:`,
    `- Keyword: ${input.keyword}`,
    `- Step: "${input.stepText}"`,
    `- Action Type: ${input.actionType}`,
  ];

  if (input.locator) {
    parts.push(`- Locator Strategy: ${input.locator.strategy}`);
    parts.push(`- Locator Value: ${input.locator.value}`);
  }

  if (input.actionValue !== undefined) {
    parts.push(`- Action Value: "${input.actionValue}"`);
  }

  if (input.actionOptions) {
    parts.push(`- Options: ${JSON.stringify(input.actionOptions)}`);
  }

  parts.push(`- Include Comments: ${input.includeComments ?? false}`);
  parts.push(`- Code Style: ${input.codeStyle || 'async-await'}`);

  return parts.join('\n');
}

/**
 * Parse LLM response
 */
function parseResponse(response: CompletionResponse, stepText: string): GenerateStepCodeOutput {
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
      code: String(parsed.code || ''),
      imports: Array.isArray(parsed.imports) ? parsed.imports : [],
      stepText,
      explanation: parsed.explanation,
    };
  } catch (error) {
    // Return raw content as code if parsing fails
    return {
      code: response.content,
      imports: [],
      stepText,
      explanation: 'Failed to parse structured response, returning raw code',
    };
  }
}

/**
 * Execute generate step code use case
 */
export async function generateStepCode(
  llmClient: ILlmClient,
  input: GenerateStepCodeInput
): Promise<GenerateStepCodeOutput> {
  // Try simple code generation first
  const simpleCode = generateSimpleCode(input);
  if (simpleCode) {
    return simpleCode;
  }

  // Fall back to LLM for complex cases
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserPrompt(input) },
  ];

  const response = await llmClient.complete(messages, {
    maxTokens: 1000,
    temperature: 0.2,
    responseFormat: 'json',
  });

  const result = parseResponse(response, input.stepText);

  return {
    ...result,
    tokenUsage: {
      promptTokens: response.usage.promptTokens,
      completionTokens: response.usage.completionTokens,
      totalTokens: response.usage.totalTokens,
    },
  };
}

/**
 * Generate Step Code Use Case Class
 */
export class GenerateStepCodeUseCase {
  constructor(private readonly llmClient: ILlmClient) {}

  async execute(input: GenerateStepCodeInput): Promise<GenerateStepCodeOutput> {
    return generateStepCode(this.llmClient, input);
  }
}
