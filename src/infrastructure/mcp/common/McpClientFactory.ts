/**
 * MCP Client Factory
 * Creates and manages MCP client instances for different servers
 */

import { IMcpClient, McpClientConfig } from './McpClient.interface';

/**
 * Supported MCP server types
 */
export type McpServerType = 'playwright' | 'filesystem' | 'custom';

/**
 * MCP client factory configuration
 */
export interface McpFactoryConfig {
  /** Default connection timeout */
  defaultConnectionTimeout: number;
  /** Default request timeout */
  defaultRequestTimeout: number;
  /** Whether to auto-connect on create */
  autoConnect: boolean;
}

/**
 * Default factory configuration
 */
export const DEFAULT_MCP_FACTORY_CONFIG: McpFactoryConfig = {
  defaultConnectionTimeout: 30000,
  defaultRequestTimeout: 60000,
  autoConnect: false,
};

/**
 * MCP client registry entry
 */
interface McpClientEntry {
  client: IMcpClient;
  createdAt: Date;
  lastUsed: Date;
}

/**
 * MCP Client Factory
 * Manages creation and lifecycle of MCP clients
 */
export class McpClientFactory {
  private clients: Map<string, McpClientEntry> = new Map();
  private clientConstructors: Map<McpServerType, new (config: McpClientConfig) => IMcpClient> = new Map();
  private config: McpFactoryConfig;

  constructor(config: Partial<McpFactoryConfig> = {}) {
    this.config = { ...DEFAULT_MCP_FACTORY_CONFIG, ...config };
  }

  /**
   * Registers a client constructor for a server type
   * @param serverType - Type of MCP server
   * @param constructor - Client constructor function
   */
  registerClientType(
    serverType: McpServerType,
    constructor: new (config: McpClientConfig) => IMcpClient
  ): void {
    this.clientConstructors.set(serverType, constructor);
  }

  /**
   * Creates a new MCP client
   * @param serverType - Type of MCP server
   * @param config - Client configuration
   * @returns Created MCP client
   */
  async createClient(
    serverType: McpServerType,
    config: Partial<McpClientConfig> & { serverName: string }
  ): Promise<IMcpClient> {
    const Constructor = this.clientConstructors.get(serverType);
    
    if (!Constructor) {
      throw new Error(`No client registered for server type: ${serverType}`);
    }

    const fullConfig: McpClientConfig = {
      serverName: config.serverName,
      serverType,
      connectionTimeout: config.connectionTimeout ?? this.config.defaultConnectionTimeout,
      requestTimeout: config.requestTimeout ?? this.config.defaultRequestTimeout,
      autoReconnect: config.autoReconnect ?? true,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 3,
      options: config.options,
    };

    const client = new Constructor(fullConfig);

    // Auto-connect if configured
    if (this.config.autoConnect) {
      await client.connect();
    }

    // Register the client
    this.clients.set(config.serverName, {
      client,
      createdAt: new Date(),
      lastUsed: new Date(),
    });

    return client;
  }

  /**
   * Gets an existing client by name
   * @param serverName - Server name
   * @returns Client if found, null otherwise
   */
  getClient(serverName: string): IMcpClient | null {
    const entry = this.clients.get(serverName);
    if (entry) {
      entry.lastUsed = new Date();
      return entry.client;
    }
    return null;
  }

  /**
   * Gets or creates a client
   * @param serverType - Server type
   * @param config - Client configuration
   * @returns MCP client
   */
  async getOrCreateClient(
    serverType: McpServerType,
    config: Partial<McpClientConfig> & { serverName: string }
  ): Promise<IMcpClient> {
    const existing = this.getClient(config.serverName);
    if (existing) {
      return existing;
    }
    return this.createClient(serverType, config);
  }

  /**
   * Checks if a client exists
   * @param serverName - Server name
   * @returns True if client exists
   */
  hasClient(serverName: string): boolean {
    return this.clients.has(serverName);
  }

  /**
   * Disconnects and removes a client
   * @param serverName - Server name
   */
  async removeClient(serverName: string): Promise<void> {
    const entry = this.clients.get(serverName);
    if (entry) {
      await entry.client.disconnect();
      this.clients.delete(serverName);
    }
  }

  /**
   * Disconnects and removes all clients
   */
  async removeAllClients(): Promise<void> {
    const disconnectPromises = Array.from(this.clients.values()).map(
      (entry) => entry.client.disconnect()
    );
    await Promise.all(disconnectPromises);
    this.clients.clear();
  }

  /**
   * Gets all registered client names
   * @returns Array of server names
   */
  getRegisteredClients(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Gets all registered server types
   * @returns Array of server types
   */
  getRegisteredServerTypes(): McpServerType[] {
    return Array.from(this.clientConstructors.keys());
  }

  /**
   * Gets client statistics
   * @param serverName - Server name
   * @returns Client statistics or null
   */
  getClientStats(serverName: string): { createdAt: Date; lastUsed: Date; status: string } | null {
    const entry = this.clients.get(serverName);
    if (!entry) return null;
    
    return {
      createdAt: entry.createdAt,
      lastUsed: entry.lastUsed,
      status: entry.client.status,
    };
  }
}

/**
 * Singleton factory instance
 */
let factoryInstance: McpClientFactory | null = null;

/**
 * Gets the singleton MCP client factory
 * @param config - Optional factory configuration
 * @returns MCP client factory instance
 */
export function getMcpClientFactory(config?: Partial<McpFactoryConfig>): McpClientFactory {
  if (!factoryInstance) {
    factoryInstance = new McpClientFactory(config);
  }
  return factoryInstance;
}

/**
 * Resets the singleton factory (useful for testing)
 */
export async function resetMcpClientFactory(): Promise<void> {
  if (factoryInstance) {
    await factoryInstance.removeAllClients();
    factoryInstance = null;
  }
}
