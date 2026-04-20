/**
 * Screenshot Tool
 * Captures screenshots of the page
 */

import { McpToolResult } from '../../common/McpClient.interface';
import { IMcpClient } from '../../common/McpClient.interface';
import { BaseTool, BaseToolOptions } from './BaseTool';

/**
 * Screenshot tool parameters
 */
export interface ScreenshotParams extends BaseToolOptions {
  /** Filename to save screenshot */
  filename?: string;
  /** Capture full page (scrollable) */
  fullPage?: boolean;
  /** Image format */
  type?: 'png' | 'jpeg';
  /** Quality (0-100, jpeg only) */
  quality?: number;
  /** Element to screenshot (optional) */
  element?: string;
  /** Element reference */
  ref?: string;
}

/**
 * Screenshot tool result
 */
export interface ScreenshotResult {
  /** Path to saved screenshot */
  path?: string;
  /** Base64 encoded image data */
  data?: string;
}

/**
 * Screenshot Tool
 * Wraps the browser_take_screenshot MCP tool
 */
export class ScreenshotTool extends BaseTool<ScreenshotParams, ScreenshotResult> {
  protected toolName = 'browser_take_screenshot';

  constructor(client: IMcpClient) {
    super(client);
  }

  async execute(params: ScreenshotParams = {}): Promise<McpToolResult<ScreenshotResult>> {
    this.validateConnection();

    return this.client.executeTool<ScreenshotResult>(this.toolName, {
      filename: params.filename,
      fullPage: params.fullPage,
      type: params.type,
      quality: params.quality,
      element: params.element,
      ref: params.ref,
    });
  }
}
