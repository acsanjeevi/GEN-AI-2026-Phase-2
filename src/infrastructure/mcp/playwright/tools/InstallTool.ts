/**
 * Install Tool
 * Installs browser for Playwright
 */

import { McpToolResult } from '../../common/McpClient.interface';
import { IMcpClient } from '../../common/McpClient.interface';
import { BaseTool, BaseToolOptions } from './BaseTool';

/**
 * Install parameters
 */
export interface InstallParams extends BaseToolOptions {}

/**
 * Install result
 */
export interface InstallResult {
  /** Whether installation was successful */
  installed: boolean;
  /** Browser that was installed */
  browser?: string;
}

/**
 * Install Tool
 * Installs the browser specified in config
 */
export class InstallTool extends BaseTool<InstallParams, InstallResult> {
  protected toolName = 'browser_install';

  constructor(client: IMcpClient) {
    super(client);
  }

  async execute(_params: InstallParams = {}): Promise<McpToolResult<InstallResult>> {
    this.validateConnection();
    return this.client.executeTool<InstallResult>(this.toolName, {});
  }
}
