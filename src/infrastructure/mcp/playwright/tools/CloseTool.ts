/**
 * Close Tool
 * Closes the browser page
 */

import { McpToolResult } from '../../common/McpClient.interface';
import { IMcpClient } from '../../common/McpClient.interface';
import { BaseTool, BaseToolOptions } from './BaseTool';

/**
 * Close parameters
 */
export interface CloseParams extends BaseToolOptions {}

/**
 * Close result
 */
export interface CloseResult {
  /** Whether the page was closed */
  closed: boolean;
}

/**
 * Close Tool
 * Closes the current browser page
 */
export class CloseTool extends BaseTool<CloseParams, CloseResult> {
  protected toolName = 'browser_close';

  constructor(client: IMcpClient) {
    super(client);
  }

  async execute(_params: CloseParams = {}): Promise<McpToolResult<CloseResult>> {
    this.validateConnection();
    return this.client.executeTool<CloseResult>(this.toolName, {});
  }
}
