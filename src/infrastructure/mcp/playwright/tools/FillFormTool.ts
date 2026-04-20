/**
 * Fill Form Tool
 * Fills multiple form fields at once
 */

import { McpToolResult } from '../../common/McpClient.interface';
import { IMcpClient } from '../../common/McpClient.interface';
import { BaseTool, BaseToolOptions } from './BaseTool';

/**
 * Form field definition
 */
export interface FormField {
  /** Element reference */
  ref: string;
  /** Element description */
  element: string;
  /** Value to fill */
  value: string;
}

/**
 * Fill form parameters
 */
export interface FillFormParams extends BaseToolOptions {
  /** Form fields to fill */
  fields: FormField[];
}

/**
 * Fill form result
 */
export interface FillFormResult {
  /** Number of fields filled */
  filledCount: number;
  /** Fields that were filled */
  filled: string[];
  /** Fields that failed */
  failed?: string[];
}

/**
 * Fill Form Tool
 * Fills multiple form fields efficiently
 */
export class FillFormTool extends BaseTool<FillFormParams, FillFormResult> {
  protected toolName = 'browser_fill_form';

  constructor(client: IMcpClient) {
    super(client);
  }

  async execute(params: FillFormParams): Promise<McpToolResult<FillFormResult>> {
    this.validateConnection();

    if (!params.fields || params.fields.length === 0) {
      throw new Error('At least one field is required');
    }

    return this.client.executeTool<FillFormResult>(this.toolName, {
      fields: params.fields,
    });
  }
}
