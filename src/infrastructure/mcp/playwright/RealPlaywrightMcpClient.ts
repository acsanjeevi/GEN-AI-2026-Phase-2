/**
 * Real Playwright MCP Client
 * Spawns and communicates with the actual Playwright MCP server via stdio
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import {
  IMcpClient,
  McpClientConfig,
  McpConnectionStatus,
  McpToolDefinition,
  McpToolResult,
} from '../common/McpClient.interface';

/**
 * JSON-RPC request structure
 */
interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

/**
 * JSON-RPC response structure
 */
interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Real Playwright MCP Client
 * Communicates with @playwright/mcp via stdio JSON-RPC
 */
export class RealPlaywrightMcpClient extends EventEmitter implements IMcpClient {
  readonly config: McpClientConfig;
  private _status: McpConnectionStatus = 'disconnected';
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests: Map<number, {
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  private buffer = '';
  private toolDefinitions: McpToolDefinition[] = [];

  constructor(config: McpClientConfig) {
    super();
    this.config = config;
  }

  get status(): McpConnectionStatus {
    return this._status;
  }

  /**
   * Connect to Playwright MCP server by spawning the process
   */
  async connect(): Promise<void> {
    if (this._status === 'connected') {
      return;
    }

    this._status = 'connecting';

    return new Promise((resolve, reject) => {
      try {
        // Spawn the Playwright MCP process
        this.process = spawn('npx', ['@playwright/mcp@latest'], {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true,
        });

        // Handle stdout (JSON-RPC responses)
        this.process.stdout?.on('data', (data: Buffer) => {
          this.handleStdout(data.toString());
        });

        // Handle stderr (logs/errors)
        this.process.stderr?.on('data', (data: Buffer) => {
          console.error('[Playwright MCP stderr]:', data.toString());
        });

        // Handle process exit
        this.process.on('exit', (code) => {
          console.log(`[Playwright MCP] Process exited with code ${code}`);
          this._status = 'disconnected';
          this.emit('disconnected');
        });

        // Handle process error
        this.process.on('error', (err) => {
          console.error('[Playwright MCP] Process error:', err);
          this._status = 'error';
          reject(err);
        });

        // Give the process time to start
        setTimeout(async () => {
          try {
            // Initialize the MCP connection
            await this.initialize();
            this._status = 'connected';
            this.emit('connected');
            resolve();
          } catch (err) {
            this._status = 'error';
            reject(err);
          }
        }, 1000);

      } catch (error) {
        this._status = 'error';
        reject(error);
      }
    });
  }

  /**
   * Initialize the MCP session
   */
  private async initialize(): Promise<void> {
    // Send initialize request
    const initResult = await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'no-code-ui-automation',
        version: '1.0.0',
      },
    });

    console.log('[Playwright MCP] Initialized:', initResult);

    // Send initialized notification
    this.sendNotification('notifications/initialized', {});

    // Get available tools
    const toolsResult = await this.sendRequest('tools/list', {}) as { tools: McpToolDefinition[] };
    this.toolDefinitions = toolsResult.tools || [];
    
    console.log(`[Playwright MCP] Available tools: ${this.toolDefinitions.length}`);
  }

  /**
   * Handle stdout data from the MCP process
   */
  private handleStdout(data: string): void {
    this.buffer += data;

    // Try to parse complete JSON-RPC messages
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const message = JSON.parse(line) as JsonRpcResponse;
        this.handleResponse(message);
      } catch (e) {
        // Not valid JSON, might be log output
        console.log('[Playwright MCP]:', line);
      }
    }
  }

  /**
   * Handle a JSON-RPC response
   */
  private handleResponse(response: JsonRpcResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (!pending) {
      console.warn(`[Playwright MCP] Received response for unknown request ${response.id}`);
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(response.id);

    if (response.error) {
      pending.reject(new Error(response.error.message));
    } else {
      pending.resolve(response.result);
    }
  }

  /**
   * Send a JSON-RPC request and wait for response
   */
  private sendRequest(method: string, params?: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.process?.stdin) {
        reject(new Error('MCP process not running'));
        return;
      }

      const id = ++this.requestId;
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request ${method} timed out`));
      }, this.config.requestTimeout);

      // Store pending request
      this.pendingRequests.set(id, { resolve, reject, timeout });

      // Send request
      const requestStr = JSON.stringify(request) + '\n';
      this.process.stdin.write(requestStr);
    });
  }

  /**
   * Send a JSON-RPC notification (no response expected)
   */
  private sendNotification(method: string, params?: Record<string, unknown>): void {
    if (!this.process?.stdin) {
      console.error('MCP process not running');
      return;
    }

    const notification = {
      jsonrpc: '2.0',
      method,
      params,
    };

    this.process.stdin.write(JSON.stringify(notification) + '\n');
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (this.process) {
      // Clear all pending requests
      for (const [id, pending] of this.pendingRequests) {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Client disconnecting'));
      }
      this.pendingRequests.clear();

      // Kill the process
      this.process.kill();
      this.process = null;
    }

    this._status = 'disconnected';
  }

  /**
   * Get available tools
   */
  async getAvailableTools(): Promise<McpToolDefinition[]> {
    if (this._status !== 'connected') {
      throw new Error('Client not connected');
    }

    const result = await this.sendRequest('tools/list', {}) as { tools: McpToolDefinition[] };
    this.toolDefinitions = result.tools || [];
    return this.toolDefinitions;
  }

  /**
   * Execute a tool
   */
  async executeTool<T = unknown>(
    toolName: string,
    params: Record<string, unknown>
  ): Promise<McpToolResult<T>> {
    const startTime = Date.now();

    if (this._status !== 'connected') {
      return {
        success: false,
        error: 'Client not connected',
        errorCode: 'NOT_CONNECTED',
        duration: Date.now() - startTime,
        toolName,
        timestamp: new Date(),
      };
    }

    try {
      const result = await this.sendRequest('tools/call', {
        name: toolName,
        arguments: params,
      }) as { content: Array<{ type: string; text?: string }> };

      // Parse the result content
      let data: T | undefined;
      const textContent = result.content?.find(c => c.type === 'text');
      if (textContent?.text) {
        try {
          data = JSON.parse(textContent.text) as T;
        } catch {
          data = textContent.text as unknown as T;
        }
      }

      return {
        success: true,
        data,
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

  /**
   * Check if tool exists
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
}
