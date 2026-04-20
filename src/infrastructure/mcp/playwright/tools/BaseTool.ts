/**
 * Base Tool Interface
 * Common interface for all Playwright MCP tool wrappers
 */

import { IMcpClient, McpToolResult } from '../../common/McpClient.interface';

/**
 * Base interface for tool execution options
 */
export interface BaseToolOptions {
  /** Timeout for the operation in milliseconds */
  timeout?: number;
}

/**
 * Base tool wrapper class
 * Provides common functionality for all tool wrappers
 */
export abstract class BaseTool<TParams, TResult> {
  protected client: IMcpClient;
  protected abstract toolName: string;

  constructor(client: IMcpClient) {
    this.client = client;
  }

  /**
   * Executes the tool with the given parameters
   * @param params - Tool parameters
   * @returns Tool execution result
   */
  abstract execute(params: TParams): Promise<McpToolResult<TResult>>;

  /**
   * Gets the tool name
   */
  getName(): string {
    return this.toolName;
  }

  /**
   * Validates that the client is connected
   */
  protected validateConnection(): void {
    if (!this.client.isConnected()) {
      throw new Error('MCP client is not connected');
    }
  }
}
