/**
 * Type Tool
 * Types text into an input field
 */

import { McpToolResult } from '../../common/McpClient.interface';
import { IMcpClient } from '../../common/McpClient.interface';
import { BaseTool, BaseToolOptions } from './BaseTool';

/**
 * Type tool parameters
 */
export interface TypeParams extends BaseToolOptions {
  /** Human-readable element description */
  element: string;
  /** Element reference from page snapshot */
  ref: string;
  /** Text to type */
  text: string;
  /** Whether to submit after typing (press Enter) */
  submit?: boolean;
  /** Whether to type slowly (one character at a time) */
  slowly?: boolean;
}

/**
 * Type tool result
 */
export interface TypeResult {
  /** Whether typing was successful */
  typed: boolean;
}

/**
 * Type Tool
 * Wraps the browser_type MCP tool
 */
export class TypeTool extends BaseTool<TypeParams, TypeResult> {
  protected toolName = 'browser_type';

  constructor(client: IMcpClient) {
    super(client);
  }

  async execute(params: TypeParams): Promise<McpToolResult<TypeResult>> {
    this.validateConnection();

    return this.client.executeTool<TypeResult>(this.toolName, {
      element: params.element,
      ref: params.ref,
      text: params.text,
      submit: params.submit,
      slowly: params.slowly,
    });
  }
}
