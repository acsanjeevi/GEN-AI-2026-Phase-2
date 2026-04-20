/**
 * Navigation Tools
 * Back and Forward navigation
 */

import { McpToolResult } from '../../common/McpClient.interface';
import { IMcpClient } from '../../common/McpClient.interface';
import { BaseTool, BaseToolOptions } from './BaseTool';

/**
 * Navigation params
 */
export interface NavigationParams extends BaseToolOptions {}

/**
 * Navigation result
 */
export interface NavigationResult {
  /** Current URL after navigation */
  url: string;
}

/**
 * Go Back Tool
 * Navigates back in browser history
 */
export class GoBackTool extends BaseTool<NavigationParams, NavigationResult> {
  protected toolName = 'browser_navigate_back';

  constructor(client: IMcpClient) {
    super(client);
  }

  async execute(_params: NavigationParams = {}): Promise<McpToolResult<NavigationResult>> {
    this.validateConnection();
    return this.client.executeTool<NavigationResult>(this.toolName, {});
  }
}

/**
 * Go Forward Tool
 * Navigates forward in browser history
 */
export class GoForwardTool extends BaseTool<NavigationParams, NavigationResult> {
  protected toolName = 'browser_navigate_forward';

  constructor(client: IMcpClient) {
    super(client);
  }

  async execute(_params: NavigationParams = {}): Promise<McpToolResult<NavigationResult>> {
    this.validateConnection();
    return this.client.executeTool<NavigationResult>(this.toolName, {});
  }
}
