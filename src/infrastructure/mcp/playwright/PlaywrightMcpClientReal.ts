/**
 * Real Playwright MCP Client
 * Communicates with Playwright MCP server via stdio using MCP SDK
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn, ChildProcess } from 'child_process';
import {
  IMcpClient,
  McpClientConfig,
  McpConnectionStatus,
  McpToolDefinition,
  McpToolResult,
} from '../common/McpClient.interface';
import { createLogger, ILogger } from '../../logging';

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
 * Real Playwright MCP Client Implementation
 * Spawns and communicates with the Playwright MCP server
 */
export class PlaywrightMcpClientReal implements IMcpClient {
  readonly config: PlaywrightMcpConfig;
  private _status: McpConnectionStatus = 'disconnected';
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private serverProcess: ChildProcess | null = null;
  private toolDefinitions: McpToolDefinition[] = [];
  private logger: ILogger;

  constructor(config: McpClientConfig) {
    this.config = config as PlaywrightMcpConfig;
    this.logger = createLogger({ level: 'info', format: 'json' });
  }

  get status(): McpConnectionStatus {
    return this._status;
  }

  /**
   * Connect to the Playwright MCP server
   */
  async connect(): Promise<void> {
    if (this._status === 'connected') {
      return;
    }

    this._status = 'connecting';
    this.logger.info('Connecting to Playwright MCP server...');

    try {
      // Build command args based on config
      const args: string[] = [];

      // Use isolated context (fresh browser profile) to prevent Chrome's built-in
      // password manager from showing "Change your password" breach warning popups.
      // This ensures a clean, passwordless context for every test run.
      args.push('--isolated');
      
      // Only add --headless if headless mode is explicitly requested
      // Headed mode is the default in Playwright MCP
      if (this.config.options?.headless === true) {
        args.push('--headless');
      }
      
      // Map browser types - Playwright MCP uses 'chrome' not 'chromium'
      if (this.config.options?.browser) {
        const browserMap: Record<string, string> = {
          'chromium': 'chrome',
          'firefox': 'firefox',
          'webkit': 'webkit',
          'chrome': 'chrome',
          'msedge': 'msedge',
        };
        const browser = browserMap[this.config.options.browser] || 'chrome';
        args.push(`--browser=${browser}`);
      }

      // Add viewport size if specified
      if (this.config.options?.viewportWidth && this.config.options?.viewportHeight) {
        args.push(`--viewport-size=${this.config.options.viewportWidth}x${this.config.options.viewportHeight}`);
      }

      // Add video recording if enabled
      if (this.config.options?.recordVideo) {
        // Playwright MCP uses --save-video with size parameter (e.g., "1280x720")
        // Use viewport size or default
        const videoWidth = this.config.options.viewportWidth || 1280;
        const videoHeight = this.config.options.viewportHeight || 720;
        args.push(`--save-video=${videoWidth}x${videoHeight}`);
      }

      // Add output directory for artifacts if recordVideo or traceEnabled
      if (this.config.options?.recordVideo || this.config.options?.traceEnabled) {
        const recordVideoConfig = this.config.options.recordVideo;
        // Get output dir from recordVideo config object or leave undefined (will use current dir)
        if (typeof recordVideoConfig === 'object' && recordVideoConfig !== null && 'dir' in recordVideoConfig) {
          args.push(`--output-dir=${recordVideoConfig.dir}`);
          this.logger.info('Using output directory from recordVideo config', { dir: recordVideoConfig.dir });
        } else {
          this.logger.warn('No output directory specified for artifacts - videos/traces will go to current directory');
        }
      }

      // Add trace recording if enabled
      if (this.config.options?.traceEnabled) {
        args.push('--save-trace');
      }

      this.logger.info('Starting Playwright MCP server', { args });

      // Create transport - spawns the MCP server
      this.transport = new StdioClientTransport({
        command: 'npx',
        args: ['@playwright/mcp@latest', ...args],
      });

      // Create MCP client
      this.client = new Client(
        {
          name: 'no-code-automation',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      // Connect
      await this.client.connect(this.transport);
      
      // Fetch available tools
      const toolsResponse = await this.client.listTools();
      this.toolDefinitions = toolsResponse.tools.map(tool => ({
        name: tool.name,
        description: tool.description || '',
        category: this.categorizeToolName(tool.name),
        parameters: this.parseToolParameters(tool.inputSchema),
      }));

      this._status = 'connected';
      this.logger.info('Connected to Playwright MCP server', {
        toolCount: this.toolDefinitions.length,
      });
    } catch (error) {
      this._status = 'error';
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to connect to Playwright MCP server', { error: errorMsg });
      throw new Error(`Failed to connect to MCP server: ${errorMsg}`);
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    // First, call browser_close to properly finalize video recordings
    // The MCP server saves videos when the browser context is closed via browser_close
    if (this.client && this._status === 'connected') {
      try {
        this.logger.info('Calling browser_close to finalize video recordings...');
        await this.client.callTool({
          name: 'browser_close',
          arguments: {},
        });
        this.logger.info('Browser closed via MCP tool');
        
        // Give time for video file to be written after browser_close
        // Playwright writes video asynchronously after context close
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        // Ignore browser_close errors - browser might already be closed
        this.logger.debug('browser_close call completed', { 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }
    
    if (this.client) {
      try {
        await this.client.close();
      } catch {
        // Ignore close errors
      }
      this.client = null;
    }

    if (this.transport) {
      try {
        await this.transport.close();
      } catch {
        // Ignore close errors
      }
      this.transport = null;
    }

    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }

    this._status = 'disconnected';
    this.logger.info('Disconnected from Playwright MCP server');
  }

  /**
   * Get available tools
   */
  async getAvailableTools(): Promise<McpToolDefinition[]> {
    return [...this.toolDefinitions];
  }

  /**
   * Execute a tool on the MCP server
   */
  async executeTool<T = unknown>(
    toolName: string,
    params: Record<string, unknown>
  ): Promise<McpToolResult<T>> {
    const startTime = Date.now();

    if (!this.client || this._status !== 'connected') {
      return {
        success: false,
        error: 'Not connected to MCP server',
        errorCode: 'NOT_CONNECTED',
        duration: Date.now() - startTime,
        toolName,
        timestamp: new Date(),
      };
    }

    try {
      this.logger.debug('Executing MCP tool', { toolName, params });

      // Call the tool via MCP
      const result = await this.client.callTool({
        name: toolName,
        arguments: params,
      });

      const duration = Date.now() - startTime;

      // Check if there's an error in the result
      if (result.isError) {
        const contentArray = result.content as Array<{ type: string; text?: string }>;
        const errorContent = contentArray?.[0];
        const errorText = errorContent && 'text' in errorContent ? errorContent.text : 'Unknown error';
        
        this.logger.warn('MCP tool execution failed', { toolName, error: errorText, duration });
        
        return {
          success: false,
          error: errorText,
          errorCode: 'TOOL_ERROR',
          duration,
          toolName,
          timestamp: new Date(),
        };
      }

      // Parse the result content
      const contentArray = result.content as Array<{ type: string; text?: string }>;
      const content = contentArray?.[0];
      let data: T;

      if (content && 'text' in content && content.text) {
        // Try to parse as JSON, otherwise use raw text
        try {
          data = JSON.parse(content.text) as T;
        } catch {
          data = { text: content.text } as T;
        }
      } else {
        data = result.content as T;
      }

      this.logger.debug('MCP tool executed successfully', { toolName, duration });

      return {
        success: true,
        data,
        duration,
        toolName,
        timestamp: new Date(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      this.logger.error('MCP tool execution error', { toolName, error: errorMsg, duration });

      return {
        success: false,
        error: errorMsg,
        errorCode: 'EXECUTION_ERROR',
        duration,
        toolName,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check if a tool exists
   */
  async hasTool(toolName: string): Promise<boolean> {
    return this.toolDefinitions.some(t => t.name === toolName);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this._status === 'connected';
  }

  /**
   * Get tool definition
   */
  async getToolDefinition(toolName: string): Promise<McpToolDefinition | null> {
    return this.toolDefinitions.find(t => t.name === toolName) ?? null;
  }

  /**
   * Categorize tool by name
   */
  private categorizeToolName(name: string): string {
    if (name.includes('navigate') || name.includes('click') || name.includes('type') || 
        name.includes('hover') || name.includes('drag') || name.includes('select') ||
        name.includes('press') || name.includes('file') || name.includes('dialog') ||
        name.includes('resize') || name.includes('close')) {
      return 'Browser Interaction & Navigation';
    }
    if (name.includes('screenshot') || name.includes('pdf') || name.includes('snapshot') ||
        name.includes('console') || name.includes('network') || name.includes('tab')) {
      return 'Content & Information Retrieval';
    }
    return 'Testing & Automation Specific';
  }

  /**
   * Parse tool input schema to parameters
   */
  private parseToolParameters(inputSchema: unknown): McpToolDefinition['parameters'] {
    const schema = inputSchema as {
      type?: string;
      properties?: Record<string, { type?: string; description?: string }>;
      required?: string[];
    };

    if (!schema || !schema.properties) {
      return [];
    }

    const required = schema.required || [];
    
    return Object.entries(schema.properties).map(([name, prop]) => ({
      name,
      type: (prop.type || 'string') as 'string' | 'number' | 'boolean' | 'object' | 'array',
      description: prop.description || '',
      required: required.includes(name),
    }));
  }
}

/**
 * Singleton instance
 */
let mcpClientInstance: PlaywrightMcpClientReal | null = null;

/**
 * Get or create the MCP client instance
 */
export function getPlaywrightMcpClient(config?: PlaywrightMcpConfig): PlaywrightMcpClientReal {
  if (!mcpClientInstance) {
    mcpClientInstance = new PlaywrightMcpClientReal(config || {
      serverName: 'playwright',
      serverType: 'playwright',
      connectionTimeout: 30000,
      requestTimeout: 30000,
      autoReconnect: true,
      maxReconnectAttempts: 3,
    });
  }
  return mcpClientInstance;
}

/**
 * Reset the client instance (for testing)
 */
export async function resetPlaywrightMcpClient(): Promise<void> {
  if (mcpClientInstance) {
    await mcpClientInstance.disconnect();
    mcpClientInstance = null;
  }
}
