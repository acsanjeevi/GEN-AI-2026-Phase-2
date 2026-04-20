/**
 * Snapshot Use Case
 * Captures and manages accessibility snapshots of the current page
 */

import { IMcpClient } from '../../infrastructure/mcp/common/McpClient.interface';
import { SnapshotTool, SnapshotResult } from '../../infrastructure/mcp/playwright/tools/SnapshotTool';
import { ScreenshotTool, ScreenshotResult } from '../../infrastructure/mcp/playwright/tools/ScreenshotTool';
import { 
  ExecutionContextService, 
  PageState,
  getExecutionContext 
} from '../execution/execution-context.service';
import { 
  AccessibilityNode, 
  parseSnapshotString,
  searchSnapshot,
  getElementsByRole,
  flattenTree,
  FlattenedNode,
} from '../../utils/locator/snapshot-parser';

/**
 * Input for snapshot capture
 */
export interface CaptureSnapshotInput {
  /** Session ID */
  sessionId: string;
  /** Include hidden elements */
  includeHidden?: boolean;
  /** Also capture screenshot */
  captureScreenshot?: boolean;
  /** Screenshot options */
  screenshotOptions?: {
    filename?: string;
    fullPage?: boolean;
  };
}

/**
 * Output from snapshot capture
 */
export interface CaptureSnapshotOutput {
  /** Whether capture was successful */
  success: boolean;
  /** Current page URL */
  url?: string;
  /** Page title */
  title?: string;
  /** Parsed accessibility tree */
  snapshot?: AccessibilityNode[];
  /** Raw snapshot string */
  rawSnapshot?: string;
  /** Screenshot data URL (if captured) */
  screenshot?: string;
  /** Error message if failed */
  error?: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Summary statistics */
  stats?: SnapshotStats;
}

/**
 * Snapshot statistics
 */
export interface SnapshotStats {
  /** Total number of nodes */
  totalNodes: number;
  /** Number of interactive elements */
  interactiveElements: number;
  /** Number of form elements */
  formElements: number;
  /** Number of links */
  links: number;
  /** Number of buttons */
  buttons: number;
  /** Number of images */
  images: number;
  /** Maximum depth of the tree */
  maxDepth: number;
}

/**
 * Input for element search in snapshot
 */
export interface SearchSnapshotInput {
  /** Session ID */
  sessionId: string;
  /** Search query */
  query: string;
  /** Filter by role */
  role?: string;
  /** Minimum confidence */
  minConfidence?: number;
  /** Maximum results */
  maxResults?: number;
}

/**
 * Search result
 */
export interface SearchSnapshotOutput {
  /** Whether search was successful */
  success: boolean;
  /** Search results */
  results: Array<{
    ref?: string;
    role: string;
    name?: string;
    confidence: number;
    path: number[];
  }>;
  /** Error message if failed */
  error?: string;
}

export class SnapshotUseCase {
  private mcpClient: IMcpClient;
  private executionContext: ExecutionContextService;
  private snapshotTool: SnapshotTool;
  private screenshotTool: ScreenshotTool;

  constructor(mcpClient: IMcpClient) {
    this.mcpClient = mcpClient;
    this.executionContext = getExecutionContext();
    this.snapshotTool = new SnapshotTool(mcpClient);
    this.screenshotTool = new ScreenshotTool(mcpClient);
  }

  /**
   * Capture accessibility snapshot of current page
   */
  async capture(input: CaptureSnapshotInput): Promise<CaptureSnapshotOutput> {
    const { sessionId, includeHidden, captureScreenshot, screenshotOptions } = input;
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
      // Capture snapshot
      const snapshotResult = await this.snapshotTool.execute({
        includeHidden,
      });

      if (!snapshotResult.success) {
        return {
          success: false,
          error: snapshotResult.error,
          durationMs: Date.now() - startTime,
        };
      }

      // Handle different MCP response formats
      // The MCP response may have data in .snapshot, .text, or .content fields
      const data = snapshotResult.data as unknown as Record<string, unknown>;
      let rawSnapshot = '';
      
      if (typeof data === 'string') {
        rawSnapshot = data;
      } else if (data?.snapshot && typeof data.snapshot === 'string') {
        rawSnapshot = data.snapshot;
      } else if (data?.text && typeof data.text === 'string') {
        rawSnapshot = data.text;
      } else if (data?.content && typeof data.content === 'string') {
        rawSnapshot = data.content;
      }
      
      // Extract URL and title from the response if available
      const snapshotData = data as Partial<SnapshotResult>;
      const parsedSnapshot = parseSnapshotString(rawSnapshot);

      // Build page state
      const pageState: PageState = {
        url: snapshotData.url || session.currentPageState?.url || '',
        title: snapshotData.title,
        capturedAt: new Date(),
        snapshot: parsedSnapshot,
        rawSnapshot,
      };

      // Capture screenshot if requested
      let screenshot: string | undefined;
      if (captureScreenshot) {
        const screenshotResult = await this.screenshotTool.execute({
          filename: screenshotOptions?.filename,
          fullPage: screenshotOptions?.fullPage,
        });

        if (screenshotResult.success) {
          const ssData = screenshotResult.data as ScreenshotResult;
          screenshot = ssData?.data;
          pageState.screenshot = screenshot;
        }
      }

      // Update execution context
      this.executionContext.updatePageState(sessionId, pageState);

      // Calculate stats
      const stats = this.calculateStats(parsedSnapshot);

      return {
        success: true,
        url: pageState.url,
        title: pageState.title,
        snapshot: parsedSnapshot,
        rawSnapshot,
        screenshot,
        durationMs: Date.now() - startTime,
        stats,
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
   * Get cached snapshot from session
   */
  getCached(sessionId: string): CaptureSnapshotOutput {
    const session = this.executionContext.getSession(sessionId);
    
    if (!session) {
      return {
        success: false,
        error: `Session ${sessionId} not found`,
        durationMs: 0,
      };
    }

    const pageState = session.currentPageState;
    if (!pageState?.snapshot) {
      return {
        success: false,
        error: 'No cached snapshot available',
        durationMs: 0,
      };
    }

    const stats = this.calculateStats(pageState.snapshot);

    return {
      success: true,
      url: pageState.url,
      title: pageState.title,
      snapshot: pageState.snapshot,
      rawSnapshot: pageState.rawSnapshot,
      screenshot: pageState.screenshot,
      durationMs: 0,
      stats,
    };
  }

  /**
   * Search for elements in the snapshot
   */
  search(input: SearchSnapshotInput): SearchSnapshotOutput {
    const { sessionId, query, role, minConfidence = 0.3, maxResults = 10 } = input;

    const session = this.executionContext.getSession(sessionId);
    if (!session) {
      return {
        success: false,
        results: [],
        error: `Session ${sessionId} not found`,
      };
    }

    const snapshot = session.currentPageState?.snapshot;
    if (!snapshot) {
      return {
        success: false,
        results: [],
        error: 'No snapshot available. Capture a snapshot first.',
      };
    }

    const searchResults = searchSnapshot(snapshot, {
      target: query,
      role,
      minConfidence,
      maxResults,
    });

    return {
      success: true,
      results: searchResults.map(r => ({
        ref: r.ref,
        role: r.node.role,
        name: r.node.name,
        confidence: r.confidence,
        path: r.path,
      })),
    };
  }

  /**
   * Get all elements of a specific role
   */
  getElementsByRole(sessionId: string, role: string): AccessibilityNode[] {
    const session = this.executionContext.getSession(sessionId);
    if (!session?.currentPageState?.snapshot) {
      return [];
    }
    return getElementsByRole(session.currentPageState.snapshot, role);
  }

  /**
   * Get flattened tree view
   */
  getFlattenedTree(sessionId: string): FlattenedNode[] {
    const session = this.executionContext.getSession(sessionId);
    if (!session?.currentPageState?.snapshot) {
      return [];
    }
    return flattenTree(session.currentPageState.snapshot);
  }

  /**
   * Calculate snapshot statistics
   */
  private calculateStats(nodes: AccessibilityNode[]): SnapshotStats {
    const flattened = flattenTree(nodes);
    
    const interactiveRoles = ['button', 'link', 'textbox', 'checkbox', 'radio', 
      'combobox', 'slider', 'switch', 'tab', 'menuitem'];
    const formRoles = ['textbox', 'checkbox', 'radio', 'combobox', 'listbox', 
      'slider', 'spinbutton', 'searchbox'];

    return {
      totalNodes: flattened.length,
      interactiveElements: flattened.filter(n => 
        interactiveRoles.includes(n.node.role.toLowerCase())
      ).length,
      formElements: flattened.filter(n => 
        formRoles.includes(n.node.role.toLowerCase())
      ).length,
      links: flattened.filter(n => n.node.role.toLowerCase() === 'link').length,
      buttons: flattened.filter(n => n.node.role.toLowerCase() === 'button').length,
      images: flattened.filter(n => n.node.role.toLowerCase() === 'img').length,
      maxDepth: Math.max(0, ...flattened.map(n => n.depth)),
    };
  }

  /**
   * Compare two snapshots
   */
  compareSnapshots(
    snapshot1: AccessibilityNode[],
    snapshot2: AccessibilityNode[]
  ): {
    added: AccessibilityNode[];
    removed: AccessibilityNode[];
    changed: Array<{ before: AccessibilityNode; after: AccessibilityNode }>;
  } {
    const flat1 = flattenTree(snapshot1);
    const flat2 = flattenTree(snapshot2);

    const refs1 = new Map(flat1.filter(n => n.node.ref).map(n => [n.node.ref!, n.node]));
    const refs2 = new Map(flat2.filter(n => n.node.ref).map(n => [n.node.ref!, n.node]));

    const added: AccessibilityNode[] = [];
    const removed: AccessibilityNode[] = [];
    const changed: Array<{ before: AccessibilityNode; after: AccessibilityNode }> = [];

    // Find added nodes
    for (const [ref, node] of refs2) {
      if (!refs1.has(ref)) {
        added.push(node);
      }
    }

    // Find removed nodes
    for (const [ref, node] of refs1) {
      if (!refs2.has(ref)) {
        removed.push(node);
      }
    }

    // Find changed nodes
    for (const [ref, node1] of refs1) {
      const node2 = refs2.get(ref);
      if (node2 && (node1.name !== node2.name || node1.value !== node2.value)) {
        changed.push({ before: node1, after: node2 });
      }
    }

    return { added, removed, changed };
  }
}
