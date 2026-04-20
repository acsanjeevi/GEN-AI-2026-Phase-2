/**
 * Select Option Tool
 * Selects an option from a dropdown
 */

import { McpToolResult } from '../../common/McpClient.interface';
import { IMcpClient } from '../../common/McpClient.interface';
import { BaseTool, BaseToolOptions } from './BaseTool';

/**
 * Select option tool parameters
 */
export interface SelectOptionParams extends BaseToolOptions {
  /** Human-readable element description */
  element: string;
  /** Element reference from page snapshot */
  ref: string;
  /** Value to select (single value, will be converted to array) */
  value?: string;
  /** Values to select (array) */
  values?: string[];
  /** Label to select */
  label?: string;
  /** Index to select */
  index?: number;
}

/**
 * Select option tool result
 */
export interface SelectOptionResult {
  /** Selected values */
  selected: string[];
}

/**
 * Select Option Tool
 * Wraps the browser_select_option MCP tool
 */
export class SelectOptionTool extends BaseTool<SelectOptionParams, SelectOptionResult> {
  protected toolName = 'browser_select_option';

  constructor(client: IMcpClient) {
    super(client);
  }

  async execute(params: SelectOptionParams): Promise<McpToolResult<SelectOptionResult>> {
    this.validateConnection();

    // Convert single value to array if needed - MCP expects 'values' array
    let values: string[] = [];
    if (params.values && params.values.length > 0) {
      values = params.values;
    } else if (params.value) {
      values = [params.value];
    } else if (params.label) {
      values = [params.label];
    }

    return this.client.executeTool<SelectOptionResult>(this.toolName, {
      element: params.element,
      ref: params.ref,
      values: values,
    });
  }
}
