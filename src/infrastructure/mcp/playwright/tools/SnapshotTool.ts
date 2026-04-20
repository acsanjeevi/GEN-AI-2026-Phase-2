/**
 * Snapshot Tool
 * Gets accessibility snapshot of the page
 */

import { McpToolResult } from '../../common/McpClient.interface';
import { IMcpClient } from '../../common/McpClient.interface';
import { BaseTool, BaseToolOptions } from './BaseTool';

/**
 * Snapshot tool parameters
 */
export interface SnapshotParams extends BaseToolOptions {
  /** Include hidden elements */
  includeHidden?: boolean;
}

/**
 * Accessibility tree node
 */
export interface AccessibilityNode {
  role: string;
  name?: string;
  ref?: string;
  description?: string;
  value?: string;
  checked?: boolean;
  disabled?: boolean;
  expanded?: boolean;
  focused?: boolean;
  selected?: boolean;
  children?: AccessibilityNode[];
}

/**
 * Snapshot tool result
 */
export interface SnapshotResult {
  /** Page URL */
  url: string;
  /** Page title */
  title: string;
  /** Accessibility tree */
  snapshot: string;
}

/**
 * Snapshot Tool
 * Wraps the browser_snapshot MCP tool
 */
export class SnapshotTool extends BaseTool<SnapshotParams, SnapshotResult> {
  protected toolName = 'browser_snapshot';

  constructor(client: IMcpClient) {
    super(client);
  }

  async execute(params: SnapshotParams = {}): Promise<McpToolResult<SnapshotResult>> {
    this.validateConnection();

    return this.client.executeTool<SnapshotResult>(this.toolName, {
      includeHidden: params.includeHidden,
    });
  }
}
