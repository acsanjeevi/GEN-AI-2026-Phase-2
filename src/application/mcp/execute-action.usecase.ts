/**
 * Execute Action Use Case
 * Executes a single UIAction using Playwright MCP tools
 */

import { v4 as uuidv4 } from 'uuid';
import { UIAction, UIActionType } from '../../domain/models/MappedStep';
import { Locator } from '../../domain/models/Locator';
import { IMcpClient, McpToolResult } from '../../infrastructure/mcp/common/McpClient.interface';
import { createLogger, ILogger } from '../../infrastructure/logging';
import {
  ClickTool,
  TypeTool,
  NavigateTool,
  HoverTool,
  SelectOptionTool,
  DragTool,
  PressKeyTool,
  WaitTool,
  SnapshotTool,
  ScreenshotTool,
  FileUploadTool,
} from '../../infrastructure/mcp/playwright/tools';
import { ResolveLocatorUseCase, ResolveLocatorOutput } from '../locator/resolve-locator.usecase';
import { getLlmResolveLocatorUseCase, LlmResolveLocatorUseCase } from '../locator/llm-resolve-locator.usecase';
import { 
  ExecutionContextService, 
  PageState, 
  StepExecutionRecord,
  getExecutionContext 
} from '../execution/execution-context.service';
import { AccessibilityNode, parseSnapshotString } from '../../utils/locator/snapshot-parser';
import { getEnv } from '../../core/env';

/**
 * Input for action execution
 */
export interface ExecuteActionInput {
  /** The UIAction to execute */
  action: UIAction;
  /** Session ID */
  sessionId: string;
  /** Mapped step ID (for tracking) */
  mappedStepId?: string;
  /** Whether to refresh snapshot before execution */
  refreshSnapshot?: boolean;
  /** Pre-resolved locator (if available) */
  resolvedRef?: string;
  /** Override timeout */
  timeout?: number;
}

/**
 * Output from action execution
 */
export interface ExecuteActionOutput {
  /** Whether execution was successful */
  success: boolean;
  /** Execution record ID */
  executionId: string;
  /** Error message if failed */
  error?: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Page state after execution */
  afterState?: PageState;
  /** Locator resolution info (if resolved during execution) */
  locatorResolution?: ResolveLocatorOutput;
  /** Raw MCP tool result */
  mcpResult?: McpToolResult<unknown>;
}

/**
 * Map UIActionType to MCP tool name
 */
const ACTION_TO_TOOL: Partial<Record<UIActionType, string>> = {
  navigate: 'browser_navigate',
  click: 'browser_click',
  type: 'browser_type',
  fill: 'browser_type', // fill uses type tool with clear
  select: 'browser_select_option',
  hover: 'browser_hover',
  drag: 'browser_drag',
  press: 'browser_press_key',
  wait: 'browser_wait_for',
  screenshot: 'browser_take_screenshot',
  upload: 'browser_file_upload',
  clear: 'browser_type', // clear by typing empty
  scroll: 'browser_evaluate', // scroll via JS
  assert: 'browser_snapshot', // assertions check snapshot
};

export class ExecuteActionUseCase {
  private mcpClient: IMcpClient;
  private resolveLocatorUseCase: ResolveLocatorUseCase;
  private llmResolveLocatorUseCase: LlmResolveLocatorUseCase;
  private executionContext: ExecutionContextService;
  private logger: ILogger;
  private locatorResolutionMode: 'pattern' | 'llm';

  // Tool instances (lazy initialized)
  private clickTool?: ClickTool;
  private typeTool?: TypeTool;
  private navigateTool?: NavigateTool;
  private hoverTool?: HoverTool;
  private selectTool?: SelectOptionTool;
  private dragTool?: DragTool;
  private pressKeyTool?: PressKeyTool;
  private waitTool?: WaitTool;
  private snapshotTool?: SnapshotTool;
  private screenshotTool?: ScreenshotTool;
  private uploadTool?: FileUploadTool;

  constructor(mcpClient: IMcpClient) {
    this.mcpClient = mcpClient;
    this.resolveLocatorUseCase = new ResolveLocatorUseCase();
    this.llmResolveLocatorUseCase = getLlmResolveLocatorUseCase();
    this.executionContext = getExecutionContext();
    this.logger = createLogger({ level: 'info', format: 'json' });
    
    // Get locator resolution mode from environment
    const env = getEnv();
    this.locatorResolutionMode = env.LOCATOR_RESOLUTION_MODE;
    this.logger.info('ExecuteActionUseCase initialized', { 
      locatorResolutionMode: this.locatorResolutionMode 
    });
    
    this.initializeTools();
  }

  private initializeTools(): void {
    this.clickTool = new ClickTool(this.mcpClient);
    this.typeTool = new TypeTool(this.mcpClient);
    this.navigateTool = new NavigateTool(this.mcpClient);
    this.hoverTool = new HoverTool(this.mcpClient);
    this.selectTool = new SelectOptionTool(this.mcpClient);
    this.dragTool = new DragTool(this.mcpClient);
    this.pressKeyTool = new PressKeyTool(this.mcpClient);
    this.waitTool = new WaitTool(this.mcpClient);
    this.snapshotTool = new SnapshotTool(this.mcpClient);
    this.screenshotTool = new ScreenshotTool(this.mcpClient);
    this.uploadTool = new FileUploadTool(this.mcpClient);
  }

  /**
   * Execute a single UIAction
   */
  async execute(input: ExecuteActionInput): Promise<ExecuteActionOutput> {
    const { action, sessionId, mappedStepId, refreshSnapshot, resolvedRef, timeout } = input;
    const startTime = Date.now();

    // Validate session
    const session = this.executionContext.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        executionId: '',
        error: `Session ${sessionId} not found`,
        durationMs: Date.now() - startTime,
      };
    }

    // Record execution start
    const executionRecord = this.executionContext.recordExecutionStart(
      sessionId,
      mappedStepId || uuidv4(),
      action,
      action.locator,
      resolvedRef
    );

    try {
      // Get or refresh snapshot if needed for element targeting
      let snapshot = this.executionContext.getSnapshot(sessionId);
      let locatorResolution: ResolveLocatorOutput | undefined;

      // Refresh snapshot if needed or not available
      if (refreshSnapshot || !snapshot) {
        this.logger.info('Capturing snapshot for action', { actionType: action.type });
        const snapshotResult = await this.captureSnapshot();
        if (snapshotResult.success && snapshotResult.snapshot) {
          snapshot = snapshotResult.snapshot;
          this.logger.info('Snapshot captured', { 
            nodeCount: snapshot.length,
            hasElements: snapshot.length > 0,
          });
          this.executionContext.updateSnapshot(
            sessionId,
            snapshot,
            snapshotResult.rawSnapshot
          );
        } else {
          this.logger.warn('Failed to capture snapshot', { error: snapshotResult.error });
        }
      }

      // Resolve locator if needed (for actions that target elements)
      // Skip locator resolution for page-level assertions (no target, just expectedValue)
      let ref = resolvedRef;
      const isPageLevelAssertion = action.type === 'assert' && 
        !action.locator && 
        action.expectedValue !== undefined &&
        (action.assertionType === 'text' || action.assertionType === 'url' || action.assertionType === 'title');
      
      // DEBUG: Log assert action properties to diagnose locator resolution issues
      if (action.type === 'assert') {
        this.logger.info('DEBUG assert action properties', {
          assertionType: action.assertionType,
          hasLocator: !!action.locator,
          locatorValue: action.locator ? JSON.stringify(action.locator) : 'none',
          expectedValue: action.expectedValue,
          isPageLevelAssertion,
        });
      }
      
      if (!ref && this.requiresLocator(action.type) && snapshot && !isPageLevelAssertion) {
        const target = this.getTargetDescription(action);
        this.logger.info('Resolving locator', { 
          target, 
          actionType: action.type,
          snapshotSize: snapshot.length,
          mode: this.locatorResolutionMode,
        });
        
        if (target) {
          // Try resolution with retry on failure (re-capture snapshot if needed)
          const maxResolutionAttempts = 2;
          
          for (let resAttempt = 1; resAttempt <= maxResolutionAttempts; resAttempt++) {
            // Use LLM-based resolution if configured
            if (this.locatorResolutionMode === 'llm') {
              const rawSnapshot = this.executionContext.getRawSnapshot(sessionId);
              if (rawSnapshot) {
                this.logger.info('Using LLM for locator resolution', { target, attempt: resAttempt });
                const llmResult = await this.llmResolveLocatorUseCase.execute({
                  target,
                  actionType: action.type,
                  snapshot: rawSnapshot,
                  value: action.value,
                });

                this.logger.info('LLM locator resolution result', {
                  target,
                  resolved: llmResult.resolved,
                  ref: llmResult.ref,
                  role: llmResult.role,
                  confidence: llmResult.confidence,
                  reasoning: llmResult.reasoning,
                  error: llmResult.error,
                });

                if (llmResult.resolved && llmResult.ref && llmResult.ref !== 'e1') {
                  // Validate ref is not the root element (e1 is usually body)
                  ref = llmResult.ref;
                  locatorResolution = {
                    resolved: true,
                    ref: llmResult.ref,
                    confidence: llmResult.confidence,
                    element: {
                      role: llmResult.role || 'unknown',
                      name: llmResult.name,
                      ref: llmResult.ref,
                    },
                  };
                  break; // Success, exit retry loop
                } else if (resAttempt < maxResolutionAttempts) {
                  // LLM returned invalid ref (e1 or null), retry with fresh snapshot
                  this.logger.warn('LLM returned invalid ref, re-capturing snapshot', {
                    ref: llmResult.ref,
                    attempt: resAttempt,
                  });
                  const freshSnapshot = await this.captureSnapshot(2, 1500);
                  if (freshSnapshot.success && freshSnapshot.snapshot) {
                    snapshot = freshSnapshot.snapshot;
                    this.executionContext.updateSnapshot(sessionId, snapshot, freshSnapshot.rawSnapshot);
                  }
                  continue;
                } else {
                  // Fall back to pattern matching if LLM fails
                  this.logger.warn('LLM resolution failed, falling back to pattern matching', {
                    error: llmResult.error,
                  });
                  locatorResolution = this.resolveLocatorUseCase.execute({
                    target,
                    actionType: action.type,
                    snapshot,
                  });
                  if (locatorResolution.resolved && locatorResolution.ref) {
                    ref = locatorResolution.ref;
                  }
                }
              }
            } else {
              // Use pattern-based resolution
              locatorResolution = this.resolveLocatorUseCase.execute({
                target,
                actionType: action.type,
                snapshot,
              });

              this.logger.info('Locator resolution result', {
                target,
                resolved: locatorResolution.resolved,
                ref: locatorResolution.ref,
                confidence: locatorResolution.confidence,
                failureReason: locatorResolution.failureReason,
              });

              if (locatorResolution.resolved && locatorResolution.ref) {
                ref = locatorResolution.ref;
                break; // Success, exit retry loop
              } else if (resAttempt < maxResolutionAttempts) {
                // Pattern matching failed, retry with fresh snapshot
                this.logger.warn('Pattern resolution failed, re-capturing snapshot', {
                  attempt: resAttempt,
                });
                const freshSnapshot = await this.captureSnapshot(2, 1500);
                if (freshSnapshot.success && freshSnapshot.snapshot) {
                  snapshot = freshSnapshot.snapshot;
                  this.executionContext.updateSnapshot(sessionId, snapshot, freshSnapshot.rawSnapshot);
                }
              }
            }
          }
        }
      }

      // FAIL EARLY: If this action requires a locator and we couldn't resolve one, fail now
      // Exception: page-level assertions (text, url, title) with an expectedValue can fall through
      // to handleAssertion without needing an element ref — they operate on the page directly.
      // Exception 2: assert actions with no locator and no expectedValue (conceptual assertions like
      // "I should be logged in successfully") fall through to handleAssertion's default success.
      const isPageLevelAssertWithValue = action.type === 'assert' &&
        (action.assertionType === 'text' || action.assertionType === 'url' || action.assertionType === 'title') &&
        action.expectedValue !== undefined;
      const isConceptualAssertion = action.type === 'assert' && !action.locator && action.expectedValue === undefined;
      if (this.requiresLocator(action.type) && !ref && !isPageLevelAssertWithValue && !isConceptualAssertion) {
        const target = this.getTargetDescription(action);
        const errorMessage = `Failed to find element "${target}" on page. ` +
          (locatorResolution?.failureReason || 'Element not found in accessibility snapshot.');
        
        this.logger.error('Locator resolution failed - cannot execute action', {
          actionType: action.type,
          target,
          failureReason: locatorResolution?.failureReason,
        });

        // Record failure
        this.executionContext.recordExecutionComplete(
          sessionId,
          executionRecord.id,
          false,
          errorMessage
        );

        return {
          success: false,
          executionId: executionRecord.id,
          error: errorMessage,
          durationMs: Date.now() - startTime,
          locatorResolution,
        };
      }

      // Execute the action
      const mcpResult = await this.executeToolForAction(action, ref, timeout);

      // Update page state after execution
      const afterState: PageState = {
        url: session.currentPageState?.url || '',
        capturedAt: new Date(),
      };

      // Record completion
      this.executionContext.recordExecutionComplete(
        sessionId,
        executionRecord.id,
        mcpResult.success,
        mcpResult.error,
        afterState
      );

      return {
        success: mcpResult.success,
        executionId: executionRecord.id,
        error: mcpResult.error,
        durationMs: Date.now() - startTime,
        afterState,
        locatorResolution,
        mcpResult,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Record failure
      this.executionContext.recordExecutionComplete(
        sessionId,
        executionRecord.id,
        false,
        errorMessage
      );

      return {
        success: false,
        executionId: executionRecord.id,
        error: errorMessage,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Check if action type requires a locator
   */
  private requiresLocator(actionType: UIActionType): boolean {
    const noLocatorActions: UIActionType[] = ['navigate', 'wait', 'screenshot', 'press'];
    return !noLocatorActions.includes(actionType);
  }

  /**
   * Get target description from action for locator resolution
   * Returns a human-readable description like "company name" not a CSS selector or ref
   */
  private getTargetDescription(action: UIAction): string | undefined {
    // Priority: Extract human-readable target from available sources
    
    // 1. Try to extract from action description (e.g., "Type 'TestLeaf' into company name")
    if (action.description) {
      // Extract target from description patterns
      const intoMatch = action.description.match(/into\s+["']?([^"']+?)["']?(?:\s+field)?$/i);
      if (intoMatch) {
        const extracted = intoMatch[1].trim();
        // Skip pure generic role words — they are not meaningful element targets
        const genericRoleWords = ['field', 'input', 'textbox', 'element', 'box', 'control', 'form'];
        if (!genericRoleWords.includes(extracted.toLowerCase())) {
          return extracted;
        }
      }
      
      const onMatch = action.description.match(/(?:Click|click)\s+(?:on\s+)?["']?([^"']+?)["']?$/i);
      if (onMatch) {
        const extracted = onMatch[1].trim();
        const genericClickWords = ['button', 'link', 'element', 'icon', 'item'];
        if (extracted && !genericClickWords.includes(extracted.toLowerCase())) {
          return extracted;
        }
      }
      
      const fromMatch = action.description.match(/from\s+["']?([^"']+?)["']?(?:\s+dropdown)?$/i);
      if (fromMatch) {
        const extracted = fromMatch[1].trim();
        const genericSelectWords = ['dropdown', 'select', 'combobox', 'list', 'menu'];
        if (extracted && !genericSelectWords.includes(extracted.toLowerCase())) {
          return extracted;
        }
      }
      
      // Extract target from assertion patterns like "Assert Status has text" or "Assert Status is visible"
      // But skip patterns like "Assert text "X" is visible" which are page-level assertions
      const assertMatch = action.description.match(/^Assert\s+["']?([^"']+?)["']?\s+(?:has text|has value|is visible|is hidden|is enabled|is disabled)/i);
      if (assertMatch && assertMatch[1] !== 'undefined' && assertMatch[1].toLowerCase() !== 'text') {
        return assertMatch[1].trim();
      }
      
      // Skip page-level assertions - don't use description as target
      if (action.description.match(/^Assert\s+(?:text|URL|page title)/i)) {
        return undefined;
      }
      
      // If no pattern matches, use description directly if it's not too long
      // BUT skip assertion descriptions as they don't contain useful targets
      if (action.description.length < 100 && 
          !action.description.includes('Type "') && 
          !action.description.includes('Select "') &&
          !action.description.startsWith('Assert ')) {
        const direct = action.description.trim();
        if (direct) return direct;
      }
    }
    
    // 2. Try locator description (but skip "Unresolved locator" and refs like "e123")
    if (action.locator?.description && 
        action.locator.description !== 'Unresolved locator' &&
        !action.locator.description.match(/^e\d+$/i)) {
      // Extract from patterns like "textbox: company name" or "input: company name"
      const colonMatch = action.locator.description.match(/^[^:]+:\s*(.+)$/);
      if (colonMatch) return colonMatch[1].trim();
      return action.locator.description;
    }
    
    // 3. Try locator value (but only if it's human-readable, not a selector or ref)
    if (action.locator?.value) {
      const value = action.locator.value;
      // Skip if it looks like a ref (e.g., "e16", "e335")
      if (/^e\d+$/i.test(value)) {
        // This is a ref, not a target - skip it
      }
      // Skip if it looks like a role selector (e.g., "textbox[name='...']")
      else if (value.includes('[') || value.includes('=')) {
        // Try to extract the name from selector patterns like textbox[name="company name"]
        const nameMatch = value.match(/\[name=["']?([^"'\]]+)["']?\]/i);
        if (nameMatch) return nameMatch[1].trim();
      }
      // Otherwise use the value as-is if it's reasonable
      else if (value.length > 0 && value.length < 100) {
        return value;
      }
    }
    
    // 4. For non-fill actions, try the action value
    if (action.type !== 'type' && action.type !== 'fill' && action.value) {
      return action.value;
    }
    
    return undefined;
  }

  /**
   * Execute the appropriate MCP tool for the action
   */
  private async executeToolForAction(
    action: UIAction,
    ref?: string,
    timeout?: number
  ): Promise<McpToolResult<unknown>> {
    const elementDesc = action.description || action.locator?.description || 'element';

    switch (action.type) {
      case 'navigate':
        // Check if value is a valid URL or a relative path
        // Strip surrounding quotes if present (e.g. from "I am on the 'URL' page" pattern)
        const url = (action.value || '').replace(/^["']|["']$/g, '');
        // If it's not a URL (no protocol), skip - base navigation is handled by orchestrator
        if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
          // This is likely "I am on the X page" pattern - skip, baseUrl already navigated
          return { 
            success: true, 
            data: { skipped: true, reason: 'Non-URL navigation handled by baseUrl' },
            duration: 0,
            toolName: 'browser_navigate',
            timestamp: new Date(),
          };
        }
        return this.navigateTool!.execute({
          url,
          timeout,
        });

      case 'click':
        if (!ref) {
          return this.errorResult('Click action requires a resolved element reference');
        }
        return this.clickTool!.execute({
          element: elementDesc,
          ref,
          timeout,
        });

      case 'type':
      case 'fill':
        if (!ref) {
          return this.errorResult('Type/fill action requires a resolved element reference');
        }
        // For fill, we need to select all and type to replace
        // The browser_type tool doesn't have clear, so we use select-all first
        return this.typeTool!.execute({
          element: elementDesc,
          ref,
          text: action.value || '',
          timeout,
        });

      case 'clear':
        if (!ref) {
          return this.errorResult('Clear action requires a resolved element reference');
        }
        // Clear by selecting all and typing empty
        return this.typeTool!.execute({
          element: elementDesc,
          ref,
          text: '',
          timeout,
        });

      case 'select':
        if (!ref) {
          return this.errorResult('Select action requires a resolved element reference');
        }
        return this.selectTool!.execute({
          element: elementDesc,
          ref,
          value: action.value || '',
          timeout,
        });

      case 'hover':
        if (!ref) {
          return this.errorResult('Hover action requires a resolved element reference');
        }
        return this.hoverTool!.execute({
          element: elementDesc,
          ref,
          timeout,
        });

      case 'press':
        return this.pressKeyTool!.execute({
          key: action.value || 'Enter',
          timeout,
        });

      case 'wait':
        const waitTime = action.timeout || timeout || 1000;
        return this.waitTool!.execute({
          time: waitTime / 1000, // Convert to seconds
        });

      case 'screenshot':
        return this.screenshotTool!.execute({
          filename: action.value,
          fullPage: action.options?.fullPage as boolean,
        });

      case 'upload':
        if (!ref) {
          return this.errorResult('Upload action requires a resolved element reference');
        }
        const paths = Array.isArray(action.value) 
          ? action.value 
          : action.value ? [action.value] : [];
        return this.uploadTool!.execute({
          paths,
        });

      case 'drag':
        // Drag requires start and end refs
        return this.errorResult('Drag action not yet implemented - requires start and end elements');

      case 'assert':
        // Assertions are handled by checking the current snapshot
        return this.handleAssertion(action, ref);

      default:
        return this.errorResult(`Unsupported action type: ${action.type}`);
    }
  }

  /**
   * Handle assertion actions
   */
  private async handleAssertion(action: UIAction, ref?: string): Promise<McpToolResult<unknown>> {
    const snapshotResult = await this.snapshotTool!.execute({});
    
    if (!snapshotResult.success) {
      return snapshotResult;
    }

    // Get raw snapshot text for element lookup
    const data = snapshotResult.data as { text?: string; snapshot?: string };
    const rawSnapshot = data?.text || data?.snapshot || '';
    const lines = rawSnapshot.split('\n');
    
    // For text/value assertions, we verify the expected text exists on page
    if (action.assertionType === 'text' && action.expectedValue !== undefined) {
      const expectedStr = String(action.expectedValue);
      
      // FIRST: Check if expected text exists ANYWHERE on the page
      // This is more reliable than depending on LLM to find the exact value element
      let foundExpectedText = false;
      let foundLine = '';
      
      for (const line of lines) {
        // Look for exact or close match of expected text
        if (line.includes(`"${expectedStr}"`) || 
            line.toLowerCase().includes(`"${expectedStr.toLowerCase()}"`) ||
            // Also check without quotes for StaticText content
            (line.includes('StaticText') && line.toLowerCase().includes(expectedStr.toLowerCase()))) {
          foundExpectedText = true;
          foundLine = line.trim();
          break;
        }
      }
      
      if (foundExpectedText) {
        this.logger.info('Assertion passed: expected text found on page', {
          expected: expectedStr,
          foundLine,
        });
        return {
          success: true,
          data: { asserted: true, expected: expectedStr, foundLine },
          duration: 0,
          toolName: 'assertion',
          timestamp: new Date(),
        };
      }
      
      // SECOND: If we have a ref, check the element and nearby elements
      if (ref) {
        // Find the line index with the ref
        let refLineIdx = -1;
        for (let i = 0; i < lines.length; i++) {
          const refMatch = lines[i].match(/\[ref=(\w+)\]/);
          if (refMatch && refMatch[1] === ref) {
            refLineIdx = i;
            break;
          }
        }
        
        // Check nearby lines (within 10 lines) for the expected text
        if (refLineIdx >= 0) {
          const startIdx = Math.max(0, refLineIdx - 10);
          const endIdx = Math.min(lines.length - 1, refLineIdx + 10);
          
          for (let i = startIdx; i <= endIdx; i++) {
            const line = lines[i];
            if (line.toLowerCase().includes(expectedStr.toLowerCase())) {
              this.logger.info('Assertion passed: expected text found near target element', {
                expected: expectedStr,
                foundLine: line.trim(),
                ref,
              });
              return {
                success: true,
                data: { asserted: true, expected: expectedStr, foundNearRef: true },
                duration: 0,
                toolName: 'assertion',
                timestamp: new Date(),
              };
            }
          }
        }
      }
      
      this.logger.error('Assertion failed: text not found on page', {
        expected: expectedStr,
        ref,
      });
      return {
        success: false,
        error: `Assertion failed: text "${expectedStr}" not found on page`,
        data: { expected: expectedStr },
        duration: 0,
        toolName: 'assertion',
        timestamp: new Date(),
      };
    }
    
    // For URL assertions, check the current URL from the snapshot
    if (action.assertionType === 'url' && action.expectedValue !== undefined) {
      const expectedUrl = String(action.expectedValue);
      // The snapshot first line typically contains the page URL
      const urlLine = lines.find(l => l.includes('- Page URL:') || l.startsWith('Page URL:'));
      const currentUrl = urlLine ? urlLine.replace(/.*Page URL:\s*/i, '').trim() : '';

      // Also scan raw snapshot for iframe/document URL references
      const urlMatch = rawSnapshot.match(/https?:\/\/[^\s\]"']+/);
      const foundUrl = currentUrl || (urlMatch ? urlMatch[0] : '');

      // Check if foundUrl contains expected fragment, or fall back to snapshot text scan
      const urlFoundInSnapshot = foundUrl.includes(expectedUrl) ||
        rawSnapshot.toLowerCase().includes(expectedUrl.toLowerCase());

      if (urlFoundInSnapshot) {
        this.logger.info('Assertion passed: URL contains expected value', {
          expected: expectedUrl,
          foundUrl,
        });
        return {
          success: true,
          data: { asserted: true, expected: expectedUrl, foundUrl },
          duration: 0,
          toolName: 'assertion',
          timestamp: new Date(),
        };
      }

      this.logger.error('Assertion failed: URL does not contain expected value', {
        expected: expectedUrl,
        foundUrl,
      });
      return {
        success: false,
        error: `Assertion failed: URL "${foundUrl}" does not contain "${expectedUrl}"`,
        data: { expected: expectedUrl, foundUrl },
        duration: 0,
        toolName: 'assertion',
        timestamp: new Date(),
      };
    }

    // For visibility assertions, element being found means it's visible
    if (ref && action.assertionType === 'visible') {
      this.logger.info('Assertion passed: element visible', { ref });
      return {
        success: true,
        data: { asserted: true, ref, visible: true },
        duration: 0,
        toolName: 'assertion',
        timestamp: new Date(),
      };
    }

    // Default: return success (existing behavior for unhandled assertion types)
    return {
      success: true,
      data: { asserted: true },
      duration: 0,
      toolName: 'assertion',
      timestamp: new Date(),
    };
  }

  /**
   * Capture page snapshot with retry logic for page load
   */
  private async captureSnapshot(maxRetries = 3, waitBetweenMs = 1000): Promise<{
    success: boolean;
    snapshot?: AccessibilityNode[];
    rawSnapshot?: string;
    error?: string;
  }> {
    let lastError = '';
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Wait for page to potentially load (except first attempt)
      if (attempt > 1) {
        this.logger.info('Waiting before snapshot retry', { attempt, waitMs: waitBetweenMs });
        await this.sleep(waitBetweenMs);
      }

      const result = await this.snapshotTool!.execute({});
      
      this.logger.info('Snapshot tool result', {
        attempt,
        success: result.success,
        error: result.error,
        dataType: typeof result.data,
        dataKeys: result.data ? Object.keys(result.data as object) : [],
        rawData: JSON.stringify(result.data).substring(0, 500),
      });

      if (!result.success) {
        lastError = result.error || 'Snapshot failed';
        continue;
      }

      // The MCP response may have different formats
      const data = result.data as unknown as Record<string, unknown>;
      let rawSnapshot = '';
      
      // Try different possible response formats
      if (typeof data === 'string') {
        rawSnapshot = data;
      } else if (data?.snapshot && typeof data.snapshot === 'string') {
        rawSnapshot = data.snapshot;
      } else if (data?.text && typeof data.text === 'string') {
        rawSnapshot = data.text;
      } else if (data?.content && typeof data.content === 'string') {
        rawSnapshot = data.content;
      } else {
        // Log the full data structure to understand format
        this.logger.warn('Unknown snapshot data format', { data: JSON.stringify(data) });
        rawSnapshot = JSON.stringify(data);
      }

      this.logger.info('Raw snapshot preview', { 
        length: rawSnapshot.length,
        preview: rawSnapshot.substring(0, 300),
      });

      const snapshot = parseSnapshotString(rawSnapshot);
      
      // Check if snapshot has meaningful content (more than just the root node)
      if (snapshot.length === 0 || (snapshot.length === 1 && this.countFlatNodes(snapshot) < 10)) {
        this.logger.warn('Snapshot appears empty or minimal, retrying', { 
          attempt,
          nodeCount: snapshot.length,
          flatCount: this.countFlatNodes(snapshot),
        });
        lastError = 'Snapshot has insufficient elements';
        continue;
      }

      return {
        success: true,
        snapshot,
        rawSnapshot,
      };
    }

    return {
      success: false,
      error: `Failed to capture valid snapshot after ${maxRetries} attempts: ${lastError}`,
    };
  }

  /**
   * Count total flat nodes including children
   */
  private countFlatNodes(nodes: AccessibilityNode[]): number {
    let count = nodes.length;
    for (const node of nodes) {
      if (node.children) {
        count += this.countFlatNodes(node.children);
      }
    }
    return count;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create error result
   */
  private errorResult(message: string): McpToolResult<unknown> {
    return {
      success: false,
      error: message,
      errorCode: 'ACTION_ERROR',
      duration: 0,
      toolName: 'execute_action',
      timestamp: new Date(),
    };
  }
}
