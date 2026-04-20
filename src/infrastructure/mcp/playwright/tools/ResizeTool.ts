/**
 * Resize Tool
 * Resizes the browser viewport
 */

import { McpToolResult } from '../../common/McpClient.interface';
import { IMcpClient } from '../../common/McpClient.interface';
import { BaseTool, BaseToolOptions } from './BaseTool';

/**
 * Resize parameters
 */
export interface ResizeParams extends BaseToolOptions {
  /** Viewport width in pixels */
  width: number;
  /** Viewport height in pixels */
  height: number;
}

/**
 * Resize result
 */
export interface ResizeResult {
  /** New viewport width */
  width: number;
  /** New viewport height */
  height: number;
}

/**
 * Resize Tool
 * Changes the browser viewport size
 */
export class ResizeTool extends BaseTool<ResizeParams, ResizeResult> {
  protected toolName = 'browser_resize';

  constructor(client: IMcpClient) {
    super(client);
  }

  async execute(params: ResizeParams): Promise<McpToolResult<ResizeResult>> {
    this.validateConnection();

    if (params.width <= 0 || params.height <= 0) {
      throw new Error('Width and height must be positive numbers');
    }

    return this.client.executeTool<ResizeResult>(this.toolName, {
      width: params.width,
      height: params.height,
    });
  }
}
