/**
 * Navigate Use Case
 * Handles browser navigation operations via Playwright MCP
 */

import { IMcpClient, McpToolResult } from '../../infrastructure/mcp/common/McpClient.interface';
import {
  NavigateTool,
  NavigateResult,
  NavigateBackTool,
  NavigateForwardTool,
} from '../../infrastructure/mcp/playwright/tools';
import { 
  ExecutionContextService, 
  PageState,
  getExecutionContext 
} from '../execution/execution-context.service';
import { SnapshotTool } from '../../infrastructure/mcp/playwright/tools/SnapshotTool';
import { parseSnapshotString } from '../../utils/locator/snapshot-parser';

/**
 * Input for navigation
 */
export interface NavigateInput {
  /** URL to navigate to */
  url: string;
  /** Session ID */
  sessionId: string;
  /** Wait until condition */
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  /** Timeout in milliseconds */
  timeout?: number;
  /** Whether to capture snapshot after navigation */
  captureSnapshot?: boolean;
}

/**
 * Output from navigation
 */
export interface NavigateOutput {
  /** Whether navigation was successful */
  success: boolean;
  /** Final URL after navigation */
  url?: string;
  /** Page title */
  title?: string;
  /** Error message if failed */
  error?: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Page state after navigation */
  pageState?: PageState;
}

/**
 * Input for history navigation
 */
export interface HistoryNavigateInput {
  /** Session ID */
  sessionId: string;
  /** Direction */
  direction: 'back' | 'forward';
  /** Whether to capture snapshot after navigation */
  captureSnapshot?: boolean;
}

export class NavigateUseCase {
  private mcpClient: IMcpClient;
  private executionContext: ExecutionContextService;
  private navigateTool: NavigateTool;
  private navigateBackTool: NavigateBackTool;
  private navigateForwardTool: NavigateForwardTool;
  private snapshotTool: SnapshotTool;

  constructor(mcpClient: IMcpClient) {
    this.mcpClient = mcpClient;
    this.executionContext = getExecutionContext();
    this.navigateTool = new NavigateTool(mcpClient);
    this.navigateBackTool = new NavigateBackTool(mcpClient);
    this.navigateForwardTool = new NavigateForwardTool(mcpClient);
    this.snapshotTool = new SnapshotTool(mcpClient);
  }

  /**
   * Navigate to a URL
   */
  async execute(input: NavigateInput): Promise<NavigateOutput> {
    const { url, sessionId, waitUntil, timeout, captureSnapshot = true } = input;
    const startTime = Date.now();

    // Validate session
    const session = this.executionContext.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        error: `Session ${sessionId} not found`,
        durationMs: Date.now() - startTime,
      };
    }

    try {
      // Execute navigation
      const result = await this.navigateTool.execute({
        url,
        waitUntil,
        timeout,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          durationMs: Date.now() - startTime,
        };
      }

      const navData = result.data as NavigateResult;

      // Build page state
      const pageState: PageState = {
        url: navData.url || url,
        title: navData.title,
        capturedAt: new Date(),
      };

      // Capture snapshot if requested
      if (captureSnapshot) {
        const snapshotResult = await this.snapshotTool.execute({});
        if (snapshotResult.success) {
          const snapshotData = snapshotResult.data as { snapshot?: string };
          const rawSnapshot = snapshotData?.snapshot || '';
          pageState.snapshot = parseSnapshotString(rawSnapshot);
          pageState.rawSnapshot = rawSnapshot;
        }
      }

      // Update execution context
      this.executionContext.updatePageState(sessionId, pageState);

      return {
        success: true,
        url: pageState.url,
        title: pageState.title,
        durationMs: Date.now() - startTime,
        pageState,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Navigate back or forward in history
   */
  async navigateHistory(input: HistoryNavigateInput): Promise<NavigateOutput> {
    const { sessionId, direction, captureSnapshot = true } = input;
    const startTime = Date.now();

    // Validate session
    const session = this.executionContext.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        error: `Session ${sessionId} not found`,
        durationMs: Date.now() - startTime,
      };
    }

    try {
      // Execute history navigation
      const result = direction === 'back'
        ? await this.navigateBackTool.execute({})
        : await this.navigateForwardTool.execute({});

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          durationMs: Date.now() - startTime,
        };
      }

      // Build page state (we need to get current URL from snapshot)
      const pageState: PageState = {
        url: session.currentPageState?.url || '',
        capturedAt: new Date(),
      };

      // Capture snapshot to get new page info
      if (captureSnapshot) {
        const snapshotResult = await this.snapshotTool.execute({});
        if (snapshotResult.success) {
          const snapshotData = snapshotResult.data as { 
            snapshot?: string; 
            url?: string;
            title?: string;
          };
          
          if (snapshotData.url) {
            pageState.url = snapshotData.url;
          }
          if (snapshotData.title) {
            pageState.title = snapshotData.title;
          }
          
          const rawSnapshot = snapshotData?.snapshot || '';
          pageState.snapshot = parseSnapshotString(rawSnapshot);
          pageState.rawSnapshot = rawSnapshot;
        }
      }

      // Update execution context
      this.executionContext.updatePageState(sessionId, pageState);

      return {
        success: true,
        url: pageState.url,
        title: pageState.title,
        durationMs: Date.now() - startTime,
        pageState,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Get current URL from session
   */
  getCurrentUrl(sessionId: string): string | undefined {
    const session = this.executionContext.getSession(sessionId);
    return session?.currentPageState?.url;
  }

  /**
   * Check if URL matches pattern
   */
  urlMatches(sessionId: string, pattern: string | RegExp): boolean {
    const url = this.getCurrentUrl(sessionId);
    if (!url) return false;

    if (typeof pattern === 'string') {
      return url.includes(pattern) || url === pattern;
    }
    return pattern.test(url);
  }
}
