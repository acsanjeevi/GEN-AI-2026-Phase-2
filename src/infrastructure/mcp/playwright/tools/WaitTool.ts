/**
 * Wait Tool
 * Waits for specific conditions
 */

import { McpToolResult } from '../../common/McpClient.interface';
import { IMcpClient } from '../../common/McpClient.interface';
import { BaseTool, BaseToolOptions } from './BaseTool';

/**
 * Wait tool parameters
 */
export interface WaitParams extends BaseToolOptions {
  /** Text to wait for to appear */
  text?: string;
  /** Text to wait for to disappear */
  textGone?: string;
  /** Time to wait in seconds */
  time?: number;
}

/**
 * Wait tool result
 */
export interface WaitResult {
  /** Whether the condition was met */
  conditionMet: boolean;
  /** Actual wait time in milliseconds */
  waitedMs: number;
}

/**
 * Wait Tool
 * Wraps the browser_wait_for MCP tool
 */
export class WaitTool extends BaseTool<WaitParams, WaitResult> {
  protected toolName = 'browser_wait_for';

  constructor(client: IMcpClient) {
    super(client);
  }

  async execute(params: WaitParams): Promise<McpToolResult<WaitResult>> {
    this.validateConnection();

    return this.client.executeTool<WaitResult>(this.toolName, {
      text: params.text,
      textGone: params.textGone,
      time: params.time,
    });
  }
}
