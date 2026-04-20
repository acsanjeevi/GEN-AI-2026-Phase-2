/**
 * Click Tool
 * Clicks on an element
 */

import { McpToolResult } from '../../common/McpClient.interface';
import { IMcpClient } from '../../common/McpClient.interface';
import { BaseTool, BaseToolOptions } from './BaseTool';

/**
 * Click tool parameters
 */
export interface ClickParams extends BaseToolOptions {
  /** Human-readable element description */
  element: string;
  /** Element reference from page snapshot */
  ref: string;
  /** Mouse button to use */
  button?: 'left' | 'right' | 'middle';
  /** Number of clicks */
  clickCount?: number;
  /** Modifier keys */
  modifiers?: ('Alt' | 'Control' | 'Meta' | 'Shift')[];
}

/**
 * Click tool result
 */
export interface ClickResult {
  /** Whether click was successful */
  clicked: boolean;
}

/**
 * Click Tool
 * Wraps the browser_click MCP tool
 */
export class ClickTool extends BaseTool<ClickParams, ClickResult> {
  protected toolName = 'browser_click';

  constructor(client: IMcpClient) {
    super(client);
  }

  async execute(params: ClickParams): Promise<McpToolResult<ClickResult>> {
    this.validateConnection();

    return this.client.executeTool<ClickResult>(this.toolName, {
      element: params.element,
      ref: params.ref,
      button: params.button,
      clickCount: params.clickCount,
      modifiers: params.modifiers,
    });
  }
}
