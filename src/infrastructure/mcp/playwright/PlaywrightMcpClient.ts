/**
 * Playwright MCP Client
 * Client implementation for communicating with Playwright MCP server
 */

import {
  IMcpClient,
  McpClientConfig,
  McpConnectionStatus,
  McpToolDefinition,
  McpToolResult,
} from '../common/McpClient.interface';

/**
 * Playwright-specific MCP client configuration
 */
export interface PlaywrightMcpConfig extends McpClientConfig {
  options?: {
    /** Browser to use */
    browser?: 'chromium' | 'firefox' | 'webkit';
    /** Run in headless mode */
    headless?: boolean;
    /** Default viewport width */
    viewportWidth?: number;
    /** Default viewport height */
    viewportHeight?: number;
    /** Whether to record video or video recording config */
    recordVideo?: boolean | { dir: string };
    /** Whether to capture trace */
    traceEnabled?: boolean;
  };
}

/**
 * Playwright MCP Tool Categories
 */
export const PLAYWRIGHT_TOOL_CATEGORIES = {
  NAVIGATION: 'Browser Interaction & Navigation',
  CONTENT: 'Content & Information Retrieval',
  TESTING: 'Testing & Automation Specific',
} as const;

/**
 * Playwright MCP Client Implementation
 * Handles communication with the Playwright MCP server
 */
export class PlaywrightMcpClient implements IMcpClient {
  readonly config: PlaywrightMcpConfig;
  private _status: McpConnectionStatus = 'disconnected';
  private toolDefinitions: McpToolDefinition[] = [];

  constructor(config: McpClientConfig) {
    this.config = config as PlaywrightMcpConfig;
    this.initializeToolDefinitions();
  }

  get status(): McpConnectionStatus {
    return this._status;
  }

  /**
   * Initializes the list of available Playwright tools
   */
  private initializeToolDefinitions(): void {
    this.toolDefinitions = [
      // Browser Interaction & Navigation
      {
        name: 'browser_navigate',
        description: 'Navigate to a specified URL',
        category: PLAYWRIGHT_TOOL_CATEGORIES.NAVIGATION,
        parameters: [
          { name: 'url', type: 'string', description: 'URL to navigate to', required: true },
        ],
      },
      {
        name: 'browser_navigate_back',
        description: 'Go back in browser history',
        category: PLAYWRIGHT_TOOL_CATEGORIES.NAVIGATION,
        parameters: [],
      },
      {
        name: 'browser_navigate_forward',
        description: 'Go forward in browser history',
        category: PLAYWRIGHT_TOOL_CATEGORIES.NAVIGATION,
        parameters: [],
      },
      {
        name: 'browser_click',
        description: 'Click on an element',
        category: PLAYWRIGHT_TOOL_CATEGORIES.NAVIGATION,
        parameters: [
          { name: 'element', type: 'string', description: 'Element description', required: true },
          { name: 'ref', type: 'string', description: 'Element reference from snapshot', required: true },
        ],
      },
      {
        name: 'browser_type',
        description: 'Type text into an input field',
        category: PLAYWRIGHT_TOOL_CATEGORIES.NAVIGATION,
        parameters: [
          { name: 'element', type: 'string', description: 'Element description', required: true },
          { name: 'ref', type: 'string', description: 'Element reference from snapshot', required: true },
          { name: 'text', type: 'string', description: 'Text to type', required: true },
          { name: 'submit', type: 'boolean', description: 'Submit after typing', required: false },
        ],
      },
      {
        name: 'browser_press_key',
        description: 'Simulate a key press',
        category: PLAYWRIGHT_TOOL_CATEGORIES.NAVIGATION,
        parameters: [
          { name: 'key', type: 'string', description: 'Key to press (e.g., Enter, Tab)', required: true },
        ],
      },
      {
        name: 'browser_select_option',
        description: 'Select an option from a dropdown',
        category: PLAYWRIGHT_TOOL_CATEGORIES.NAVIGATION,
        parameters: [
          { name: 'element', type: 'string', description: 'Element description', required: true },
          { name: 'ref', type: 'string', description: 'Element reference', required: true },
          { name: 'value', type: 'string', description: 'Option value to select', required: true },
        ],
      },
      {
        name: 'browser_hover',
        description: 'Hover over an element',
        category: PLAYWRIGHT_TOOL_CATEGORIES.NAVIGATION,
        parameters: [
          { name: 'element', type: 'string', description: 'Element description', required: true },
          { name: 'ref', type: 'string', description: 'Element reference', required: true },
        ],
      },
      {
        name: 'browser_drag',
        description: 'Perform a drag and drop action',
        category: PLAYWRIGHT_TOOL_CATEGORIES.NAVIGATION,
        parameters: [
          { name: 'startElement', type: 'string', description: 'Source element description', required: true },
          { name: 'startRef', type: 'string', description: 'Source element reference', required: true },
          { name: 'endElement', type: 'string', description: 'Target element description', required: true },
          { name: 'endRef', type: 'string', description: 'Target element reference', required: true },
        ],
      },
      {
        name: 'browser_file_upload',
        description: 'Upload a file',
        category: PLAYWRIGHT_TOOL_CATEGORIES.NAVIGATION,
        parameters: [
          { name: 'element', type: 'string', description: 'File input element', required: true },
          { name: 'ref', type: 'string', description: 'Element reference', required: true },
          { name: 'paths', type: 'array', description: 'File paths to upload', required: true },
        ],
      },
      {
        name: 'browser_handle_dialog',
        description: 'Interact with browser dialogs (alerts, confirms, prompts)',
        category: PLAYWRIGHT_TOOL_CATEGORIES.NAVIGATION,
        parameters: [
          { name: 'action', type: 'string', description: 'Action: accept or dismiss', required: true },
          { name: 'promptText', type: 'string', description: 'Text for prompt dialogs', required: false },
        ],
      },
      {
        name: 'browser_close',
        description: 'Close the browser',
        category: PLAYWRIGHT_TOOL_CATEGORIES.NAVIGATION,
        parameters: [],
      },
      {
        name: 'browser_resize',
        description: 'Resize the browser window',
        category: PLAYWRIGHT_TOOL_CATEGORIES.NAVIGATION,
        parameters: [
          { name: 'width', type: 'number', description: 'Window width', required: true },
          { name: 'height', type: 'number', description: 'Window height', required: true },
        ],
      },

      // Content & Information Retrieval
      {
        name: 'browser_snapshot',
        description: 'Get a snapshot of the page accessibility tree',
        category: PLAYWRIGHT_TOOL_CATEGORIES.CONTENT,
        parameters: [],
      },
      {
        name: 'browser_take_screenshot',
        description: 'Capture a screenshot of the page',
        category: PLAYWRIGHT_TOOL_CATEGORIES.CONTENT,
        parameters: [
          { name: 'filename', type: 'string', description: 'Screenshot filename', required: false },
          { name: 'fullPage', type: 'boolean', description: 'Capture full page', required: false },
        ],
      },
      {
        name: 'browser_pdf_save',
        description: 'Save the current page as a PDF',
        category: PLAYWRIGHT_TOOL_CATEGORIES.CONTENT,
        parameters: [
          { name: 'filename', type: 'string', description: 'PDF filename', required: true },
        ],
      },
      {
        name: 'browser_console_messages',
        description: 'Retrieve console log messages',
        category: PLAYWRIGHT_TOOL_CATEGORIES.CONTENT,
        parameters: [
          { name: 'onlyErrors', type: 'boolean', description: 'Only return errors', required: false },
        ],
      },
      {
        name: 'browser_network_requests',
        description: 'Monitor and retrieve network requests',
        category: PLAYWRIGHT_TOOL_CATEGORIES.CONTENT,
        parameters: [],
      },
      {
        name: 'browser_tabs',
        description: 'List, create, close, or select browser tabs',
        category: PLAYWRIGHT_TOOL_CATEGORIES.CONTENT,
        parameters: [
          { name: 'action', type: 'string', description: 'Action: list, new, close, select', required: true },
          { name: 'index', type: 'number', description: 'Tab index for close/select', required: false },
        ],
      },

      // Testing & Automation Specific
      {
        name: 'browser_wait_for',
        description: 'Wait for a specific condition or element',
        category: PLAYWRIGHT_TOOL_CATEGORIES.TESTING,
        parameters: [
          { name: 'text', type: 'string', description: 'Text to wait for', required: false },
          { name: 'textGone', type: 'string', description: 'Text to wait to disappear', required: false },
          { name: 'time', type: 'number', description: 'Time to wait in seconds', required: false },
        ],
      },
      {
        name: 'browser_generate_playwright_test',
        description: 'Generate Playwright test code based on interactions',
        category: PLAYWRIGHT_TOOL_CATEGORIES.TESTING,
        parameters: [],
      },
    ];
  }

  async connect(): Promise<void> {
    this._status = 'connecting';
    
    try {
      // TODO: Implement actual MCP server connection
      // For now, simulate connection
      await this.simulateDelay(100);
      this._status = 'connected';
    } catch (error) {
      this._status = 'error';
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this._status = 'disconnected';
  }

  async getAvailableTools(): Promise<McpToolDefinition[]> {
    return [...this.toolDefinitions];
  }

  async executeTool<T = unknown>(
    toolName: string,
    params: Record<string, unknown>
  ): Promise<McpToolResult<T>> {
    const startTime = Date.now();

    try {
      // Validate tool exists
      const tool = this.toolDefinitions.find((t) => t.name === toolName);
      if (!tool) {
        return {
          success: false,
          error: `Tool '${toolName}' not found`,
          errorCode: 'TOOL_NOT_FOUND',
          duration: Date.now() - startTime,
          toolName,
          timestamp: new Date(),
        };
      }

      // Validate required parameters
      const missingParams = tool.parameters
        .filter((p) => p.required && !(p.name in params))
        .map((p) => p.name);

      if (missingParams.length > 0) {
        return {
          success: false,
          error: `Missing required parameters: ${missingParams.join(', ')}`,
          errorCode: 'MISSING_PARAMETERS',
          duration: Date.now() - startTime,
          toolName,
          timestamp: new Date(),
        };
      }

      // TODO: Implement actual tool execution via MCP protocol
      // For now, return a placeholder success response
      await this.simulateDelay(50);

      return {
        success: true,
        data: { executed: true, toolName, params } as T,
        duration: Date.now() - startTime,
        toolName,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'EXECUTION_ERROR',
        duration: Date.now() - startTime,
        toolName,
        timestamp: new Date(),
      };
    }
  }

  async hasTool(toolName: string): Promise<boolean> {
    return this.toolDefinitions.some((t) => t.name === toolName);
  }

  isConnected(): boolean {
    return this._status === 'connected';
  }

  async getToolDefinition(toolName: string): Promise<McpToolDefinition | null> {
    return this.toolDefinitions.find((t) => t.name === toolName) ?? null;
  }

  /**
   * Gets tools by category
   * @param category - Tool category
   * @returns Array of tools in the category
   */
  getToolsByCategory(category: string): McpToolDefinition[] {
    return this.toolDefinitions.filter((t) => t.category === category);
  }

  /**
   * Simulates async delay (for placeholder implementation)
   */
  private simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
