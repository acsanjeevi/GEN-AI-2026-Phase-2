/**
 * Console Messages Tool
 * Retrieves console messages from the browser
 */

import { McpToolResult } from '../../common/McpClient.interface';
import { IMcpClient } from '../../common/McpClient.interface';
import { BaseTool, BaseToolOptions } from './BaseTool';

/**
 * Console message type
 */
export type ConsoleMessageType = 'log' | 'error' | 'warning' | 'info' | 'debug';

/**
 * Console message structure
 */
export interface ConsoleMessage {
  /** Message type */
  type: ConsoleMessageType;
  /** Message text */
  text: string;
  /** Timestamp */
  timestamp?: number;
  /** Source location */
  location?: {
    url?: string;
    lineNumber?: number;
    columnNumber?: number;
  };
}

/**
 * Console messages parameters
 */
export interface ConsoleMessagesParams extends BaseToolOptions {
  /** Filter to only show errors */
  onlyErrors?: boolean;
}

/**
 * Console messages result
 */
export interface ConsoleMessagesResult {
  /** List of console messages */
  messages: ConsoleMessage[];
  /** Total count */
  count: number;
}

/**
 * Console Messages Tool
 * Gets console messages from the browser
 */
export class ConsoleMessagesTool extends BaseTool<ConsoleMessagesParams, ConsoleMessagesResult> {
  protected toolName = 'browser_console_messages';

  constructor(client: IMcpClient) {
    super(client);
  }

  async execute(params: ConsoleMessagesParams = {}): Promise<McpToolResult<ConsoleMessagesResult>> {
    this.validateConnection();

    return this.client.executeTool<ConsoleMessagesResult>(this.toolName, {
      onlyErrors: params.onlyErrors,
    });
  }
}
