/**
 * Navigate Tool
 * Navigates to a specified URL
 */

import { McpToolResult } from '../../common/McpClient.interface';
import { IMcpClient } from '../../common/McpClient.interface';
import { BaseTool, BaseToolOptions } from './BaseTool';

/**
 * Navigate tool parameters
 */
export interface NavigateParams extends BaseToolOptions {
  /** URL to navigate to */
  url: string;
  /** Wait until network is idle */
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
}

/**
 * Navigate tool result
 */
export interface NavigateResult {
  /** Final URL after navigation */
  url: string;
  /** Page title */
  title?: string;
  /** HTTP status code */
  status?: number;
}

/**
 * Navigate Tool
 * Wraps the browser_navigate MCP tool
 */
export class NavigateTool extends BaseTool<NavigateParams, NavigateResult> {
  protected toolName = 'browser_navigate';

  constructor(client: IMcpClient) {
    super(client);
  }

  async execute(params: NavigateParams): Promise<McpToolResult<NavigateResult>> {
    this.validateConnection();

    return this.client.executeTool<NavigateResult>(this.toolName, {
      url: params.url,
      waitUntil: params.waitUntil,
    });
  }
}

/**
 * Navigate Back Tool
 * Goes back in browser history
 */
export class NavigateBackTool extends BaseTool<BaseToolOptions, void> {
  protected toolName = 'browser_navigate_back';

  constructor(client: IMcpClient) {
    super(client);
  }

  async execute(_params: BaseToolOptions = {}): Promise<McpToolResult<void>> {
    this.validateConnection();
    return this.client.executeTool<void>(this.toolName, {});
  }
}

/**
 * Navigate Forward Tool
 * Goes forward in browser history
 */
export class NavigateForwardTool extends BaseTool<BaseToolOptions, void> {
  protected toolName = 'browser_navigate_forward';

  constructor(client: IMcpClient) {
    super(client);
  }

  async execute(_params: BaseToolOptions = {}): Promise<McpToolResult<void>> {
    this.validateConnection();
    return this.client.executeTool<void>(this.toolName, {});
  }
}
