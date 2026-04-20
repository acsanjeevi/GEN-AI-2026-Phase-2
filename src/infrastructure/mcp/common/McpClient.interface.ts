/**
 * MCP Client Interface
 * Defines the contract for Model Context Protocol clients
 * 
 * This is an abstraction layer that allows plugging in different MCP servers
 */

/**
 * MCP tool parameter definition
 */
export interface McpToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: unknown;
}

/**
 * MCP tool definition
 */
export interface McpToolDefinition {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** Tool parameters */
  parameters: McpToolParameter[];
  /** Category for grouping */
  category?: string;
}

/**
 * MCP tool execution result
 */
export interface McpToolResult<T = unknown> {
  /** Whether the execution was successful */
  success: boolean;
  /** Result data if successful */
  data?: T;
  /** Error message if failed */
  error?: string;
  /** Error code if failed */
  errorCode?: string;
  /** Execution duration in milliseconds */
  duration: number;
  /** Tool that was executed */
  toolName: string;
  /** Timestamp of execution */
  timestamp: Date;
}

/**
 * MCP client connection status
 */
export type McpConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * MCP client configuration
 */
export interface McpClientConfig {
  /** Server name/identifier */
  serverName: string;
  /** Server type (e.g., 'playwright', 'filesystem') */
  serverType: string;
  /** Connection timeout in milliseconds */
  connectionTimeout: number;
  /** Request timeout in milliseconds */
  requestTimeout: number;
  /** Whether to auto-reconnect on disconnect */
  autoReconnect: boolean;
  /** Maximum reconnection attempts */
  maxReconnectAttempts: number;
  /** Additional server-specific options */
  options?: Record<string, unknown>;
}

/**
 * MCP Client Interface
 * All MCP server implementations must implement this interface
 */
export interface IMcpClient {
  /**
   * Gets the client configuration
   */
  readonly config: McpClientConfig;

  /**
   * Gets the current connection status
   */
  readonly status: McpConnectionStatus;

  /**
   * Connects to the MCP server
   * @returns Promise resolving when connected
   */
  connect(): Promise<void>;

  /**
   * Disconnects from the MCP server
   * @returns Promise resolving when disconnected
   */
  disconnect(): Promise<void>;

  /**
   * Gets available tools from the server
   * @returns Array of tool definitions
   */
  getAvailableTools(): Promise<McpToolDefinition[]>;

  /**
   * Executes a tool on the MCP server
   * @param toolName - Name of the tool to execute
   * @param params - Tool parameters
   * @returns Tool execution result
   */
  executeTool<T = unknown>(
    toolName: string,
    params: Record<string, unknown>
  ): Promise<McpToolResult<T>>;

  /**
   * Checks if a specific tool is available
   * @param toolName - Name of the tool
   * @returns True if tool is available
   */
  hasTool(toolName: string): Promise<boolean>;

  /**
   * Checks if the client is connected
   */
  isConnected(): boolean;

  /**
   * Gets tool definition by name
   * @param toolName - Name of the tool
   * @returns Tool definition or null
   */
  getToolDefinition(toolName: string): Promise<McpToolDefinition | null>;
}
