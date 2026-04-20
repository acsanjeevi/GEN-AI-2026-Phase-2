/**
 * Press Key Tool
 * Presses keyboard keys
 */

import { McpToolResult } from '../../common/McpClient.interface';
import { IMcpClient } from '../../common/McpClient.interface';
import { BaseTool, BaseToolOptions } from './BaseTool';

/**
 * Press key parameters
 */
export interface PressKeyParams extends BaseToolOptions {
  /** Key to press (e.g., 'Enter', 'Tab', 'Escape') */
  key: string;
  /** Number of times to press */
  count?: number;
}

/**
 * Press key result
 */
export interface PressKeyResult {
  /** Whether key press was successful */
  pressed: boolean;
}

/**
 * Press Key Tool
 * Presses a keyboard key
 */
export class PressKeyTool extends BaseTool<PressKeyParams, PressKeyResult> {
  protected toolName = 'browser_press_key';

  constructor(client: IMcpClient) {
    super(client);
  }

  async execute(params: PressKeyParams): Promise<McpToolResult<PressKeyResult>> {
    this.validateConnection();

    if (!params.key) {
      throw new Error('Key is required');
    }

    return this.client.executeTool<PressKeyResult>(this.toolName, {
      key: params.key,
      count: params.count,
    });
  }
}
