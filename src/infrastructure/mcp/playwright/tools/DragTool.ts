/**
 * Drag Tool
 * Performs drag and drop operations
 */

import { McpToolResult } from '../../common/McpClient.interface';
import { IMcpClient } from '../../common/McpClient.interface';
import { BaseTool, BaseToolOptions } from './BaseTool';

/**
 * Drag tool parameters
 */
export interface DragParams extends BaseToolOptions {
  /** Source element description */
  startElement: string;
  /** Source element reference */
  startRef: string;
  /** Target element description */
  endElement: string;
  /** Target element reference */
  endRef: string;
}

/**
 * Drag tool result
 */
export interface DragResult {
  /** Whether drag was successful */
  dragged: boolean;
}

/**
 * Drag Tool
 * Wraps the browser_drag MCP tool
 */
export class DragTool extends BaseTool<DragParams, DragResult> {
  protected toolName = 'browser_drag';

  constructor(client: IMcpClient) {
    super(client);
  }

  async execute(params: DragParams): Promise<McpToolResult<DragResult>> {
    this.validateConnection();

    return this.client.executeTool<DragResult>(this.toolName, {
      startElement: params.startElement,
      startRef: params.startRef,
      endElement: params.endElement,
      endRef: params.endRef,
    });
  }
}
