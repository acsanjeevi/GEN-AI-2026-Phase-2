/**
 * LLM-based Locator Resolution Use Case
 * Uses LLM to analyze accessibility snapshot and find the correct element reference
 * 
 * Features:
 * - Retry logic with exponential backoff for rate limits (429) and request too large (413)
 * - Snapshot truncation to stay within token limits
 * - Smart filtering to only include relevant elements
 */

import { UIActionType } from '../../domain/models/MappedStep';
import { ILlmClient, ChatMessage } from '../../infrastructure/llm/LlmClient.interface';
import { LlmClientFactory, LlmClientConfig } from '../../infrastructure/llm/LlmClientFactory';
import { createLogger, ILogger } from '../../infrastructure/logging';
import { getEnv } from '../../core/env';

const logger: ILogger = createLogger({ level: 'info', format: 'json' });

// Maximum snapshot size (characters) to send to LLM
const MAX_SNAPSHOT_SIZE = 6000;

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 5000; // 5 seconds
const MAX_RETRY_DELAY_MS = 60000; // 60 seconds

/**
 * Input for LLM-based locator resolution
 */
export interface LlmResolveLocatorInput {
  /** Target description from the test step */
  target: string;
  /** The UI action type */
  actionType: UIActionType;
  /** Raw accessibility snapshot from Playwright MCP */
  snapshot: string;
  /** Optional value to be used (for fill/type actions) */
  value?: string;
}

/**
 * Single target for batch resolution
 */
export interface BatchLocatorTarget {
  /** Unique identifier for this target (e.g., step ID) */
  id: string;
  /** Target description from the test step */
  target: string;
  /** The UI action type */
  actionType: UIActionType;
  /** Optional value to be used */
  value?: string;
}

/**
 * Input for batch locator resolution
 */
export interface BatchResolveLocatorInput {
  /** Array of targets to resolve */
  targets: BatchLocatorTarget[];
  /** Raw accessibility snapshot from Playwright MCP */
  snapshot: string;
}

/**
 * Single result in batch resolution
 */
export interface BatchLocatorResult {
  /** The target ID this result corresponds to */
  id: string;
  /** Whether resolution was successful */
  resolved: boolean;
  /** The ref to use for targeting element */
  ref?: string;
  /** The role of the matched element */
  role?: string;
  /** The accessible name of the element */
  name?: string;
  /** Confidence from LLM */
  confidence: number;
  /** Reasoning from LLM */
  reasoning?: string;
}

/**
 * Output from batch locator resolution
 */
export interface BatchResolveLocatorOutput {
  /** Whether the batch call was successful */
  success: boolean;
  /** Map of target ID to resolution result */
  results: Map<string, BatchLocatorResult>;
  /** Number of successfully resolved targets */
  resolvedCount: number;
  /** Total targets */
  totalCount: number;
  /** Error if batch call failed */
  error?: string;
}

/**
 * Output from LLM-based locator resolution
 */
export interface LlmResolveLocatorOutput {
  /** Whether resolution was successful */
  resolved: boolean;
  /** The ref to use for targeting element */
  ref?: string;
  /** The role of the matched element */
  role?: string;
  /** The name/label of the matched element */
  name?: string;
  /** Confidence from LLM */
  confidence: number;
  /** Reasoning from LLM */
  reasoning?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * LLM Locator Resolution Use Case
 * Sends the snapshot and target to LLM to find the correct element ref
 */
export class LlmResolveLocatorUseCase {
  private llmClient: ILlmClient | null = null;

  constructor() {
    this.initializeLlmClient();
  }

  /**
   * Initialize the LLM client based on environment configuration
   */
  private initializeLlmClient(): void {
    const env = getEnv();
    
    if (!env.LLM_API_KEY) {
      logger.warn('LLM API key not configured, LLM locator resolution will not be available');
      return;
    }

    try {
      const config: LlmClientConfig = {
        provider: env.LLM_PROVIDER as any,
        apiKey: env.LLM_API_KEY,
        model: env.LLM_MODEL,
        baseUrl: env.LLM_BASE_URL,
        apiVersion: env.LLM_API_VERSION,
        deploymentName: env.LLM_DEPLOYMENT_NAME,
        defaultMaxTokens: env.LLM_MAX_TOKENS || 512,
        defaultTemperature: env.LLM_TEMPERATURE || 0.1,
      };

      this.llmClient = LlmClientFactory.create(config);
      logger.info('LLM client initialized for locator resolution', { provider: env.LLM_PROVIDER });
    } catch (error) {
      logger.error('Failed to initialize LLM client', { error: String(error) });
    }
  }

  /**
   * Sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if error is a rate limit or request too large error
   */
  private isRetryableError(error: string): { retryable: boolean; suggestedDelay?: number } {
    // Rate limit error (429)
    if (error.includes('429') || error.includes('rate_limit')) {
      // Try to extract suggested delay from error message
      const delayMatch = error.match(/try again in (\d+\.?\d*)\s*s/i);
      const suggestedDelay = delayMatch ? Math.ceil(parseFloat(delayMatch[1]) * 1000) : INITIAL_RETRY_DELAY_MS;
      return { retryable: true, suggestedDelay };
    }
    
    // Request too large (413) - we can retry with truncated snapshot
    if (error.includes('413') || error.includes('Request too large')) {
      return { retryable: true, suggestedDelay: 1000 }; // Quick retry after truncation
    }
    
    // JSON validation failed (400) - retry with different prompt approach
    if (error.includes('400') || error.includes('json_validate_failed') || error.includes('Failed to validate JSON')) {
      return { retryable: true, suggestedDelay: 1000 };
    }
    
    return { retryable: false };
  }

  /**
   * Filter and truncate snapshot to reduce size
   * Uses smart extraction to keep target-relevant sections
   */
  private truncateSnapshot(
    snapshot: string, 
    target: string, 
    actionType: UIActionType,
    maxSize: number = MAX_SNAPSHOT_SIZE
  ): string {
    // If already small enough, return as-is
    if (snapshot.length <= maxSize) {
      return snapshot;
    }

    logger.info('Truncating snapshot for LLM', { 
      originalSize: snapshot.length, 
      maxSize,
      target,
    });

    const lines = snapshot.split('\n');
    const targetLower = target.toLowerCase();
    // Extract meaningful words (3+ chars, not common words)
    const targetWords = targetLower
      .split(/[\s:]+/)
      .filter(w => w.length > 2 && !['the', 'and', 'for', 'link', 'button', 'input', 'field'].includes(w));
    
    // Find line indices that contain target words
    const relevantLineIndices: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase();
      if (targetWords.some(word => lineLower.includes(word))) {
        relevantLineIndices.push(i);
      }
    }

    logger.info('Found relevant lines', { 
      targetWords,
      relevantCount: relevantLineIndices.length,
    });

    // Build result starting with headers
    const resultLines: string[] = [];
    const includedIndices = new Set<number>();
    
    // Always include first 10 lines (headers, page info)
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      resultLines.push(lines[i]);
      includedIndices.add(i);
    }

    // For each relevant line, include it plus context (20 lines before and after)
    // This captures the label AND the input field that follows
    const contextRange = 20;
    for (const idx of relevantLineIndices) {
      const startIdx = Math.max(0, idx - contextRange);
      const endIdx = Math.min(lines.length - 1, idx + contextRange);
      
      for (let i = startIdx; i <= endIdx; i++) {
        if (!includedIndices.has(i)) {
          // Check if adding this line would exceed max size
          const newLine = lines[i];
          const currentSize = resultLines.join('\n').length;
          if (currentSize + newLine.length + 1 > maxSize * 0.9) {
            break;
          }
          resultLines.push(newLine);
          includedIndices.add(i);
        }
      }
    }

    // If we still have room, add lines with refs (interactive elements)
    if (resultLines.join('\n').length < maxSize * 0.7) {
      const priorityRoles = actionType === 'fill' || actionType === 'type'
        ? ['textbox', 'searchbox', 'combobox', 'textarea']
        : ['button', 'link', 'menuitem', 'checkbox'];
      
      // For button clicks, ALWAYS include ALL button elements first (before links)
      // This ensures the LLM sees all buttons on the page
      const isLookingForButton = targetLower.includes('button') || targetLower.includes('btn') || targetLower.includes('submit');
      const isLookingForCheckbox = targetLower.includes('checkbox') || targetLower.includes('check box');
      
      if (isLookingForButton) {
        // First pass: add ALL buttons
        for (let i = 0; i < lines.length; i++) {
          if (includedIndices.has(i)) continue;
          const lineLower = lines[i].toLowerCase();
          
          if ((lineLower.includes('button') || lineLower.includes('btn')) && lineLower.includes('[ref=')) {
            const currentSize = resultLines.join('\n').length;
            if (currentSize + lines[i].length + 1 > maxSize * 0.85) break;
            resultLines.push(lines[i]);
            includedIndices.add(i);
          }
        }
      }
      
      // For checkbox clicks, prioritize checkbox elements
      if (isLookingForCheckbox) {
        for (let i = 0; i < lines.length; i++) {
          if (includedIndices.has(i)) continue;
          const lineLower = lines[i].toLowerCase();
          
          if (lineLower.includes('checkbox') && lineLower.includes('[ref=')) {
            const currentSize = resultLines.join('\n').length;
            if (currentSize + lines[i].length + 1 > maxSize * 0.85) break;
            resultLines.push(lines[i]);
            includedIndices.add(i);
          }
        }
      }
      
      // Then add other interactive elements
      for (let i = 0; i < lines.length; i++) {
        if (includedIndices.has(i)) continue;
        const lineLower = lines[i].toLowerCase();
        
        // Add lines with target roles and refs
        if (priorityRoles.some(role => lineLower.includes(role)) && lineLower.includes('[ref=')) {
          const currentSize = resultLines.join('\n').length;
          if (currentSize + lines[i].length + 1 > maxSize) break;
          resultLines.push(lines[i]);
          includedIndices.add(i);
        }
      }
    }

    // Sort by original index to maintain structure
    const sortedLines = [...includedIndices]
      .sort((a, b) => a - b)
      .map(i => lines[i]);

    const truncated = sortedLines.join('\n');

    logger.info('Snapshot truncated', { 
      originalSize: snapshot.length, 
      truncatedSize: truncated.length,
      linesKept: sortedLines.length,
      totalLines: lines.length,
    });

    return truncated;
  }

  /**
   * Resolve a target to an element ref using LLM with retry logic
   */
  async execute(input: LlmResolveLocatorInput): Promise<LlmResolveLocatorOutput> {
    const { target, actionType, snapshot, value } = input;

    if (!this.llmClient) {
      return {
        resolved: false,
        confidence: 0,
        error: 'LLM client not initialized. Check LLM_API_KEY in .env',
      };
    }

    logger.info('LLM locator resolution started', { 
      target, 
      actionType,
      snapshotSize: snapshot.length,
    });

    let currentSnapshot = snapshot;
    let lastError: string | undefined;

    // Retry loop
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Truncate snapshot if needed (more aggressive on retries)
        const maxSize = attempt === 0 ? MAX_SNAPSHOT_SIZE : MAX_SNAPSHOT_SIZE / (attempt + 1);
        currentSnapshot = this.truncateSnapshot(snapshot, target, actionType, maxSize);

        const systemPrompt = this.buildSystemPrompt();
        const userPrompt = this.buildUserPrompt(target, actionType, currentSnapshot, value);

        logger.info('Sending to LLM', { 
          attempt: attempt + 1, 
          promptSize: systemPrompt.length + userPrompt.length,
          snapshotSize: currentSnapshot.length,
        });

        const messages: ChatMessage[] = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ];

        const response = await this.llmClient.complete(messages, {
          maxTokens: 300,
          temperature: 0.1,
          // Don't use responseFormat: 'json' as not all providers support it
        });

        logger.info('LLM response received', { 
          contentLength: response.content.length,
          usage: response.usage,
        });

        // Parse LLM response
        const result = this.parseResponse(response.content);
        
        logger.info('LLM locator resolution result', {
          resolved: result.resolved,
          ref: result.ref,
          role: result.role,
          confidence: result.confidence,
        });

        return result;

      } catch (error) {
        const errorStr = String(error);
        lastError = errorStr;
        
        logger.error('LLM locator resolution attempt failed', { 
          attempt: attempt + 1, 
          error: errorStr,
        });

        const { retryable, suggestedDelay } = this.isRetryableError(errorStr);
        
        if (retryable && attempt < MAX_RETRIES) {
          const delay = Math.min(
            suggestedDelay || INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt),
            MAX_RETRY_DELAY_MS
          );
          
          logger.info('Retrying LLM call after delay', { 
            attempt: attempt + 1, 
            delayMs: delay,
            reason: errorStr.includes('413') ? 'request_too_large' : 'rate_limit',
          });
          
          await this.sleep(delay);
          continue;
        }
        
        // Not retryable or max retries reached
        break;
      }
    }

    return {
      resolved: false,
      confidence: 0,
      error: `LLM call failed: ${lastError}`,
    };
  }

  /**
   * Build the system prompt for locator resolution
   */
  private buildSystemPrompt(): string {
    return `You are a JSON-only element locator. You analyze accessibility snapshots to find UI elements.

Snapshot format: - role "name" [ref=eXX]

CRITICAL: Return ONLY valid JSON. No explanations, no markdown, no text before or after.

RULES:
1. For fill/type: Return TEXTBOX ref (not the label cell)
2. For select: Return COMBOBOX ref (the dropdown, not the label)
3. For click: Return button/link ref
4. Labels are "cell" or "generic" - the input element follows

ONLY OUTPUT THIS FORMAT:
{"resolved":true,"ref":"e123","role":"textbox","confidence":0.95,"reasoning":"found textbox after label"}

If not found:
{"resolved":false,"ref":null,"confidence":0,"reasoning":"no matching element"}`;
  }

  /**
   * Build the user prompt with the specific request
   */
  private buildUserPrompt(
    target: string,
    actionType: UIActionType,
    snapshot: string,
    value?: string
  ): string {
    let instruction = '';
    if (actionType === 'fill' || actionType === 'type') {
      instruction = `Find TEXTBOX for "${target}". Return the textbox ref after the label.`;
    } else if (actionType === 'select') {
      instruction = `Find COMBOBOX for "${target}". Return the combobox ref after the label, not the label cell.`;
    } else if (actionType === 'click') {
      // Check if target specifically mentions button or link
      const targetLower = target.toLowerCase();
      if (targetLower.includes('button') || targetLower.includes('btn') || targetLower.includes('submit')) {
        instruction = `Find BUTTON for "${target}". 
CRITICAL RULES:
1. ONLY return elements with role="button" - NEVER return role="link"
2. Look for submit buttons, input buttons, or elements with button role
3. The button may have text like "Create", "Submit", "Save", or similar
4. If no button is found, return resolved:false - DO NOT fall back to links`;
      } else if (targetLower.includes('link') || targetLower.includes('href')) {
        instruction = `Find LINK for "${target}". Return the link ref.`;
      } else {
        instruction = `Find button or link for "${target}". Prefer buttons over links if both exist with the same name.`;
      }
    } else if (actionType === 'assert') {
      // For assertions, we need to find the VALUE element, not the label
      instruction = `Find the VALUE element for "${target}" label.
CRITICAL RULES:
1. Find a label/text element that says "${target}"
2. Return the ADJACENT or NEARBY element that contains the actual VALUE (not the label itself)
3. The value is typically a StaticText, link, or cell element NEXT TO or NEAR the label
4. DO NOT return the label element itself - return the element that shows the value
5. Look for StaticText elements near the label that contain the displayed value`;
    } else {
      instruction = `Find element for ${actionType} on "${target}".`;
    }

    return `${instruction}

SNAPSHOT:
${snapshot}

RESPOND WITH JSON ONLY - NO OTHER TEXT:
{"resolved":true/false,"ref":"eXX","role":"..","name":"element name/label","confidence":0.X,"reasoning":".."}`;
  }

  /**
   * Parse the LLM response into structured output
   */
  private parseResponse(content: string): LlmResolveLocatorOutput {
    try {
      // Try multiple extraction methods
      let jsonStr = content.trim();
      
      // Method 1: Extract from markdown code block
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      
      // Method 2: Find JSON object in text
      if (!jsonStr.startsWith('{')) {
        const objectMatch = content.match(/\{[\s\S]*?"resolved"[\s\S]*?\}/);
        if (objectMatch) {
          jsonStr = objectMatch[0];
        }
      }

      // Method 3: Clean common issues
      jsonStr = jsonStr
        .replace(/^[^{]*/, '') // Remove text before first {
        .replace(/[^}]*$/, '') // Remove text after last }
        .replace(/[\r\n]+/g, ' ') // Normalize newlines
        .replace(/,\s*}/g, '}'); // Remove trailing commas

      const parsed = JSON.parse(jsonStr);

      // Validate the ref - reject e1 (usually body/root)
      const ref = parsed.ref;
      if (ref === 'e1' || ref === 'E1') {
        logger.warn('LLM returned root element e1, treating as not found');
        return {
          resolved: false,
          confidence: 0,
          reasoning: 'LLM returned root element (e1) which is invalid',
        };
      }

      return {
        resolved: parsed.resolved === true,
        ref: ref,
        role: parsed.role,
        name: parsed.name,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
        reasoning: parsed.reasoning,
      };
    } catch (error) {
      logger.error('Failed to parse LLM response', { content, error: String(error) });
      
      // Try to extract ref from text response as fallback
      // Prefer refs that are associated with actionable elements (textbox, button, etc.)
      // First, try to find refs in context of element types
      const textboxRefMatch = content.match(/textbox[^[]*\[ref=([eE]\d+)\]/i);
      if (textboxRefMatch) {
        const ref = textboxRefMatch[1].toLowerCase();
        logger.info('Extracted textbox ref from non-JSON response', { ref });
        return {
          resolved: true,
          ref: ref,
          role: 'textbox',
          confidence: 0.6,
          reasoning: 'Extracted textbox ref from non-JSON response',
        };
      }
      
      // Combobox for select/dropdown actions
      const comboboxRefMatch = content.match(/combobox[^[]*\[ref=([eE]\d+)\]/i);
      if (comboboxRefMatch) {
        const ref = comboboxRefMatch[1].toLowerCase();
        logger.info('Extracted combobox ref from non-JSON response', { ref });
        return {
          resolved: true,
          ref: ref,
          role: 'combobox',
          confidence: 0.6,
          reasoning: 'Extracted combobox ref from non-JSON response',
        };
      }
      
      const buttonRefMatch = content.match(/button[^[]*\[ref=([eE]\d+)\]/i);
      if (buttonRefMatch) {
        const ref = buttonRefMatch[1].toLowerCase();
        logger.info('Extracted button ref from non-JSON response', { ref });
        return {
          resolved: true,
          ref: ref,
          role: 'button',
          confidence: 0.6,
          reasoning: 'Extracted button ref from non-JSON response',
        };
      }
      
      const linkRefMatch = content.match(/link[^[]*\[ref=([eE]\d+)\]/i);
      if (linkRefMatch) {
        const ref = linkRefMatch[1].toLowerCase();
        logger.info('Extracted link ref from non-JSON response', { ref });
        return {
          resolved: true,
          ref: ref,
          role: 'link',
          confidence: 0.6,
          reasoning: 'Extracted link ref from non-JSON response',
        };
      }
      
      // Generic fallback - but exclude low refs (e1, e2, e3) which are usually containers
      const refMatch = content.match(/ref["\s:=]+([eE](?:\d{2,}|[4-9]))/i);
      if (refMatch) {
        const ref = refMatch[1].toLowerCase();
        logger.info('Extracted generic ref from non-JSON response', { ref });
        return {
          resolved: true,
          ref: ref,
          confidence: 0.4,
          reasoning: 'Extracted from non-JSON response (generic ref)',
        };
      }

      return {
        resolved: false,
        confidence: 0,
        error: 'Failed to parse LLM response',
      };
    }
  }

  /**
   * Batch resolve multiple targets in a single LLM call
   * Much more efficient for form-filling scenarios where multiple fields need to be resolved
   */
  async executeBatch(input: BatchResolveLocatorInput): Promise<BatchResolveLocatorOutput> {
    const { targets, snapshot } = input;
    
    if (!this.llmClient) {
      return {
        success: false,
        results: new Map(),
        resolvedCount: 0,
        totalCount: targets.length,
        error: 'LLM client not initialized',
      };
    }

    if (targets.length === 0) {
      return {
        success: true,
        results: new Map(),
        resolvedCount: 0,
        totalCount: 0,
      };
    }

    // If only one target, use single resolution
    if (targets.length === 1) {
      const singleResult = await this.execute({
        target: targets[0].target,
        actionType: targets[0].actionType,
        snapshot,
        value: targets[0].value,
      });
      
      const results = new Map<string, BatchLocatorResult>();
      results.set(targets[0].id, {
        id: targets[0].id,
        resolved: singleResult.resolved,
        ref: singleResult.ref,
        role: singleResult.role,
        confidence: singleResult.confidence,
        reasoning: singleResult.reasoning,
      });
      
      return {
        success: true,
        results,
        resolvedCount: singleResult.resolved ? 1 : 0,
        totalCount: 1,
      };
    }

    logger.info('Batch locator resolution started', {
      targetCount: targets.length,
      targets: targets.map(t => ({ id: t.id, target: t.target, action: t.actionType })),
      snapshotSize: snapshot.length,
    });

    let lastError: string | undefined;

    // Retry loop
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Truncate snapshot - use larger size for batch since we're doing more work
        const maxSize = attempt === 0 ? MAX_SNAPSHOT_SIZE * 1.5 : MAX_SNAPSHOT_SIZE / (attempt + 1);
        // Use first target for truncation heuristics, but we're being more generous
        const truncatedSnapshot = this.truncateSnapshotForBatch(snapshot, targets, maxSize);

        const systemPrompt = this.buildBatchSystemPrompt();
        const userPrompt = this.buildBatchUserPrompt(targets, truncatedSnapshot);

        logger.info('Sending batch to LLM', {
          attempt: attempt + 1,
          promptSize: systemPrompt.length + userPrompt.length,
          snapshotSize: truncatedSnapshot.length,
          targetCount: targets.length,
        });

        const messages: ChatMessage[] = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ];

        const response = await this.llmClient.complete(messages, {
          maxTokens: 100 + (targets.length * 80), // Scale tokens with number of targets
          temperature: 0.1,
        });

        logger.info('LLM batch response received', {
          contentLength: response.content.length,
          usage: response.usage,
        });

        // Parse batch response
        const results = this.parseBatchResponse(response.content, targets);
        
        const resolvedCount = Array.from(results.values()).filter(r => r.resolved).length;
        
        logger.info('Batch locator resolution complete', {
          resolvedCount,
          totalCount: targets.length,
          results: Array.from(results.entries()).map(([id, r]) => ({
            id,
            resolved: r.resolved,
            ref: r.ref,
            role: r.role,
          })),
        });

        return {
          success: true,
          results,
          resolvedCount,
          totalCount: targets.length,
        };

      } catch (error) {
        const errorStr = String(error);
        lastError = errorStr;

        logger.error('LLM batch resolution attempt failed', {
          attempt: attempt + 1,
          error: errorStr,
        });

        const { retryable, suggestedDelay } = this.isRetryableError(errorStr);

        if (retryable && attempt < MAX_RETRIES) {
          const delay = Math.min(
            suggestedDelay || INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt),
            MAX_RETRY_DELAY_MS
          );

          logger.info('Retrying batch LLM call after delay', {
            attempt: attempt + 1,
            delayMs: delay,
          });

          await this.sleep(delay);
          continue;
        }

        break;
      }
    }

    return {
      success: false,
      results: new Map(),
      resolvedCount: 0,
      totalCount: targets.length,
      error: `Batch LLM call failed: ${lastError}`,
    };
  }

  /**
   * Truncate snapshot for batch resolution - more inclusive
   */
  private truncateSnapshotForBatch(
    snapshot: string,
    targets: BatchLocatorTarget[],
    maxSize: number
  ): string {
    if (snapshot.length <= maxSize) {
      return snapshot;
    }

    logger.info('Truncating snapshot for batch LLM', {
      originalSize: snapshot.length,
      maxSize,
      targetCount: targets.length,
    });

    const lines = snapshot.split('\n');
    
    // Collect all target words from all targets
    const allTargetWords: string[] = [];
    for (const target of targets) {
      const words = target.target.toLowerCase()
        .split(/[\s:]+/)
        .filter(w => w.length > 2 && !['the', 'and', 'for', 'link', 'button', 'input', 'field'].includes(w));
      allTargetWords.push(...words);
    }
    const uniqueTargetWords = [...new Set(allTargetWords)];

    // Find all relevant line indices
    const relevantLineIndices: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase();
      if (uniqueTargetWords.some(word => lineLower.includes(word))) {
        relevantLineIndices.push(i);
      }
    }

    logger.info('Found relevant lines for batch', {
      targetWords: uniqueTargetWords,
      relevantCount: relevantLineIndices.length,
    });

    const includedIndices = new Set<number>();

    // Always include first 10 lines (headers, page info)
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      includedIndices.add(i);
    }

    // For each relevant line, include context
    const contextRange = 15;
    for (const idx of relevantLineIndices) {
      const startIdx = Math.max(0, idx - contextRange);
      const endIdx = Math.min(lines.length - 1, idx + contextRange);

      for (let i = startIdx; i <= endIdx; i++) {
        includedIndices.add(i);
      }
    }

    // Add lines with interactive elements (textbox, combobox, button)
    const interactiveRoles = ['textbox', 'combobox', 'button', 'link', 'searchbox'];
    for (let i = 0; i < lines.length; i++) {
      if (includedIndices.has(i)) continue;
      const lineLower = lines[i].toLowerCase();

      if (interactiveRoles.some(role => lineLower.includes(role)) && lineLower.includes('[ref=')) {
        includedIndices.add(i);
      }
    }

    // Build result, checking size
    const sortedIndices = [...includedIndices].sort((a, b) => a - b);
    const resultLines: string[] = [];
    let currentSize = 0;

    for (const idx of sortedIndices) {
      const line = lines[idx];
      if (currentSize + line.length + 1 > maxSize) break;
      resultLines.push(line);
      currentSize += line.length + 1;
    }

    const truncated = resultLines.join('\n');

    logger.info('Batch snapshot truncated', {
      originalSize: snapshot.length,
      truncatedSize: truncated.length,
      linesKept: resultLines.length,
      totalLines: lines.length,
    });

    return truncated;
  }

  /**
   * Build system prompt for batch resolution
   */
  private buildBatchSystemPrompt(): string {
    return `You are a JSON-only element locator. You analyze accessibility snapshots to find multiple UI elements in ONE response.

Snapshot format: - role "name" [ref=eXX]

CRITICAL: Return ONLY a valid JSON array. No explanations, no markdown, no text before or after.

RULES:
1. For fill/type: Return TEXTBOX ref (not the label cell)
2. For select: Return COMBOBOX ref (the dropdown, not the label)
3. For click: Return button/link ref
4. Labels are "cell" or "generic" - the input element follows them
5. Return results in the SAME ORDER as requested

OUTPUT FORMAT (JSON array):
[
  {"id":"1","resolved":true,"ref":"e123","role":"textbox","confidence":0.95,"reasoning":"found textbox"},
  {"id":"2","resolved":true,"ref":"e456","role":"combobox","confidence":0.9,"reasoning":"found dropdown"},
  {"id":"3","resolved":false,"ref":null,"confidence":0,"reasoning":"not found"}
]`;
  }

  /**
   * Build user prompt for batch resolution
   */
  private buildBatchUserPrompt(targets: BatchLocatorTarget[], snapshot: string): string {
    const targetList = targets.map((t, idx) => {
      const actionDesc = t.actionType === 'fill' || t.actionType === 'type'
        ? 'Find TEXTBOX for'
        : t.actionType === 'select'
          ? 'Find COMBOBOX for'
          : t.actionType === 'click'
            ? 'Find button/link for'
            : `Find element for ${t.actionType} on`;
      return `${idx + 1}. [id="${t.id}"] ${actionDesc} "${t.target}"`;
    }).join('\n');

    return `Find ALL these elements in ONE response:

${targetList}

SNAPSHOT:
${snapshot}

RESPOND WITH JSON ARRAY ONLY:
[{"id":"..","resolved":true/false,"ref":"eXX","role":"..","name":"element label/name","confidence":0.X,"reasoning":".."},...]`;
  }

  /**
   * Parse batch response into results map
   */
  private parseBatchResponse(content: string, targets: BatchLocatorTarget[]): Map<string, BatchLocatorResult> {
    const results = new Map<string, BatchLocatorResult>();

    // Initialize all targets as not found
    for (const target of targets) {
      results.set(target.id, {
        id: target.id,
        resolved: false,
        confidence: 0,
        reasoning: 'Not found in LLM response',
      });
    }

    try {
      // Try to extract JSON array from response
      let jsonStr = content.trim();

      // Extract from markdown code block
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      }

      // Find JSON array in text
      if (!jsonStr.startsWith('[')) {
        const arrayMatch = content.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          jsonStr = arrayMatch[0];
        }
      }

      // Clean up common issues
      jsonStr = jsonStr
        .replace(/^[^\[]*/, '')
        .replace(/[^\]]*$/, '')
        .replace(/,\s*\]/g, ']');

      const parsed = JSON.parse(jsonStr);

      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      // Process each result
      for (const item of parsed) {
        const id = String(item.id);
        
        // Skip invalid refs
        const ref = item.ref;
        if (ref === 'e1' || ref === 'E1' || ref === null) {
          continue;
        }

        if (item.resolved === true && ref) {
          results.set(id, {
            id,
            resolved: true,
            ref: ref.toLowerCase(),
            role: item.role,
            name: item.name,
            confidence: typeof item.confidence === 'number' ? item.confidence : 0.8,
            reasoning: item.reasoning,
          });
        }
      }

      logger.info('Parsed batch response', {
        parsedCount: parsed.length,
        resolvedCount: Array.from(results.values()).filter(r => r.resolved).length,
      });

    } catch (error) {
      logger.error('Failed to parse batch LLM response', { content, error: String(error) });

      // Fallback: try to extract refs using regex patterns
      for (const target of targets) {
        const targetLower = target.target.toLowerCase();
        
        // Look for patterns like: "id":"1"..."ref":"e123"
        const idPattern = new RegExp(`"id"\\s*:\\s*"${target.id}"[^}]*"ref"\\s*:\\s*"([eE]\\d+)"`, 'i');
        const idMatch = content.match(idPattern);
        
        if (idMatch) {
          const ref = idMatch[1].toLowerCase();
          if (ref !== 'e1') {
            results.set(target.id, {
              id: target.id,
              resolved: true,
              ref,
              confidence: 0.5,
              reasoning: 'Extracted from partial response',
            });
          }
        }
      }
    }

    return results;
  }
}

// Singleton instance
let instance: LlmResolveLocatorUseCase | null = null;

/**
 * Get the singleton instance of LlmResolveLocatorUseCase
 */
export function getLlmResolveLocatorUseCase(): LlmResolveLocatorUseCase {
  if (!instance) {
    instance = new LlmResolveLocatorUseCase();
  }
  return instance;
}
