/**
 * Tab Management Tools
 * Manages browser tabs
 */

import { McpToolResult } from '../../common/McpClient.interface';
import { IMcpClient } from '../../common/McpClient.interface';
import { BaseTool, BaseToolOptions } from './BaseTool';

/**
 * Tab info structure
 */
export interface TabInfo {
  /** Tab index */
  index: number;
  /** Tab URL */
  url: string;
  /** Tab title */
  title: string;
  /** Whether tab is active */
  active: boolean;
}

/**
 * Tab list parameters
 */
export interface TabListParams extends BaseToolOptions {}

/**
 * Tab list result
 */
export interface TabListResult {
  /** List of tabs */
  tabs: TabInfo[];
  /** Active tab index */
  activeIndex: number;
}

/**
 * Tab List Tool
 * Lists all open tabs
 */
export class TabListTool extends BaseTool<TabListParams, TabListResult> {
  protected toolName = 'browser_tabs';

  constructor(client: IMcpClient) {
    super(client);
  }

  async execute(_params: TabListParams = {}): Promise<McpToolResult<TabListResult>> {
    this.validateConnection();
    return this.client.executeTool<TabListResult>(this.toolName, { action: 'list' });
  }
}

/**
 * Tab new parameters
 */
export interface TabNewParams extends BaseToolOptions {
  /** URL to open in new tab */
  url?: string;
}

/**
 * Tab new result
 */
export interface TabNewResult {
  /** New tab index */
  index: number;
}

/**
 * Tab New Tool
 * Opens a new tab
 */
export class TabNewTool extends BaseTool<TabNewParams, TabNewResult> {
  protected toolName = 'browser_tabs';

  constructor(client: IMcpClient) {
    super(client);
  }

  async execute(params: TabNewParams = {}): Promise<McpToolResult<TabNewResult>> {
    this.validateConnection();
    return this.client.executeTool<TabNewResult>(this.toolName, { 
      action: 'new',
      url: params.url,
    });
  }
}

/**
 * Tab select parameters
 */
export interface TabSelectParams extends BaseToolOptions {
  /** Tab index to select */
  index: number;
}

/**
 * Tab Select Tool
 * Selects a tab by index
 */
export class TabSelectTool extends BaseTool<TabSelectParams, void> {
  protected toolName = 'browser_tabs';

  constructor(client: IMcpClient) {
    super(client);
  }

  async execute(params: TabSelectParams): Promise<McpToolResult<void>> {
    this.validateConnection();
    return this.client.executeTool<void>(this.toolName, { 
      action: 'select',
      index: params.index,
    });
  }
}

/**
 * Tab close parameters
 */
export interface TabCloseParams extends BaseToolOptions {
  /** Tab index to close (current if omitted) */
  index?: number;
}

/**
 * Tab Close Tool
 * Closes a tab
 */
export class TabCloseTool extends BaseTool<TabCloseParams, void> {
  protected toolName = 'browser_tabs';

  constructor(client: IMcpClient) {
    super(client);
  }

  async execute(params: TabCloseParams = {}): Promise<McpToolResult<void>> {
    this.validateConnection();
    return this.client.executeTool<void>(this.toolName, { 
      action: 'close',
      index: params.index,
    });
  }
}
