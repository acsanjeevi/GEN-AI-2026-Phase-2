/**
 * Evaluate Tool
 * Evaluates JavaScript in the browser context
 */

import { McpToolResult } from '../../common/McpClient.interface';
import { IMcpClient } from '../../common/McpClient.interface';
import { BaseTool, BaseToolOptions } from './BaseTool';

/**
 * Evaluate parameters
 */
export interface EvaluateParams extends BaseToolOptions {
  /** JavaScript code to evaluate */
  function: string;
  /** Element reference if needed */
  ref?: string;
  /** Element description */
  element?: string;
}

/**
 * Evaluate result
 */
export interface EvaluateResult {
  /** Result of the evaluation */
  result: unknown;
}

/**
 * Evaluate Tool
 * Executes JavaScript code in the browser
 */
export class EvaluateTool extends BaseTool<EvaluateParams, EvaluateResult> {
  protected toolName = 'browser_evaluate';

  constructor(client: IMcpClient) {
    super(client);
  }

  async execute(params: EvaluateParams): Promise<McpToolResult<EvaluateResult>> {
    this.validateConnection();

    if (!params.function) {
      throw new Error('JavaScript function is required');
    }

    return this.client.executeTool<EvaluateResult>(this.toolName, {
      function: params.function,
      ref: params.ref,
      element: params.element,
    });
  }
}
