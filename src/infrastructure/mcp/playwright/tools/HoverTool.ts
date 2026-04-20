/**
 * Hover Tool
 * Hovers over an element
 */

import { McpToolResult } from '../../common/McpClient.interface';
import { IMcpClient } from '../../common/McpClient.interface';
import { BaseTool, BaseToolOptions } from './BaseTool';

/**
 * Hover tool parameters
 */
export interface HoverParams extends BaseToolOptions {
  /** Human-readable element description */
  element: string;
  /** Element reference from page snapshot */
  ref: string;
}

/**
 * Hover tool result
 */
export interface HoverResult {
  /** Whether hover was successful */
  hovered: boolean;
}

/**
 * Hover Tool
 * Wraps the browser_hover MCP tool
 */
export class HoverTool extends BaseTool<HoverParams, HoverResult> {
  protected toolName = 'browser_hover';

  constructor(client: IMcpClient) {
    super(client);
  }

  async execute(params: HoverParams): Promise<McpToolResult<HoverResult>> {
    this.validateConnection();

    return this.client.executeTool<HoverResult>(this.toolName, {
      element: params.element,
      ref: params.ref,
    });
  }
}
