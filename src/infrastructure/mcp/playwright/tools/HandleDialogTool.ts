/**
 * Handle Dialog Tool
 * Manages browser dialogs (alert, confirm, prompt)
 */

import { McpToolResult } from '../../common/McpClient.interface';
import { IMcpClient } from '../../common/McpClient.interface';
import { BaseTool, BaseToolOptions } from './BaseTool';

/**
 * Dialog action type
 */
export type DialogAction = 'accept' | 'dismiss';

/**
 * Handle dialog parameters
 */
export interface HandleDialogParams extends BaseToolOptions {
  /** Whether to accept or dismiss the dialog */
  action: DialogAction;
  /** Text to enter for prompt dialogs */
  promptText?: string;
}

/**
 * Handle dialog result
 */
export interface HandleDialogResult {
  /** Whether the action was successful */
  handled: boolean;
  /** The dialog message */
  message?: string;
  /** The dialog type */
  dialogType?: string;
}

/**
 * Handle Dialog Tool
 * Accepts or dismisses browser dialogs
 */
export class HandleDialogTool extends BaseTool<HandleDialogParams, HandleDialogResult> {
  protected toolName = 'browser_handle_dialog';

  constructor(client: IMcpClient) {
    super(client);
  }

  async execute(params: HandleDialogParams): Promise<McpToolResult<HandleDialogResult>> {
    this.validateConnection();

    return this.client.executeTool<HandleDialogResult>(this.toolName, {
      accept: params.action === 'accept',
      promptText: params.promptText,
    });
  }
}
