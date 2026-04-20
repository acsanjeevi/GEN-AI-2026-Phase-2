/**
 * MCP Service
 * API methods for MCP (Model Context Protocol) integration
 */

import apiClient from './api.client';
import type { ApiResponse } from '@/types';

// ============================================================================
// Types
// ============================================================================

interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

interface MCPServer {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  tools: MCPTool[];
  lastConnected?: string;
  error?: string;
}

interface MCPToolExecutionRequest {
  serverName: string;
  toolName: string;
  arguments: Record<string, unknown>;
}

interface MCPToolExecutionResponse {
  success: boolean;
  result?: unknown;
  error?: string;
  duration?: number;
}

// ============================================================================
// MCP Service
// ============================================================================

export const mcpService = {
  /**
   * Get list of available MCP servers
   */
  async getServers(): Promise<MCPServer[]> {
    const response = await apiClient.get<ApiResponse<{ servers: MCPServer[] }>>(
      '/api/mcp/servers'
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get MCP servers');
    }
    
    return response.data.data.servers;
  },

  /**
   * Get tools available from a specific MCP server
   */
  async getTools(serverName: string): Promise<MCPTool[]> {
    const response = await apiClient.get<ApiResponse<{ tools: MCPTool[] }>>(
      `/api/mcp/servers/${encodeURIComponent(serverName)}/tools`
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get MCP tools');
    }
    
    return response.data.data.tools;
  },

  /**
   * Execute a tool on an MCP server
   */
  async executeTool(request: MCPToolExecutionRequest): Promise<MCPToolExecutionResponse> {
    const response = await apiClient.post<ApiResponse<MCPToolExecutionResponse>>(
      '/api/mcp/execute',
      request
    );
    
    if (!response.data.success) {
      return {
        success: false,
        error: response.data.error || 'Failed to execute MCP tool',
      };
    }
    
    return response.data.data || { success: false };
  },

  /**
   * Connect to an MCP server
   */
  async connect(serverName: string): Promise<void> {
    const response = await apiClient.post<ApiResponse<{ message: string }>>(
      `/api/mcp/servers/${encodeURIComponent(serverName)}/connect`
    );
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to connect to MCP server');
    }
  },

  /**
   * Disconnect from an MCP server
   */
  async disconnect(serverName: string): Promise<void> {
    const response = await apiClient.post<ApiResponse<{ message: string }>>(
      `/api/mcp/servers/${encodeURIComponent(serverName)}/disconnect`
    );
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to disconnect from MCP server');
    }
  },

  /**
   * Get MCP server status
   */
  async getStatus(serverName: string): Promise<MCPServer> {
    const response = await apiClient.get<ApiResponse<MCPServer>>(
      `/api/mcp/servers/${encodeURIComponent(serverName)}/status`
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get MCP server status');
    }
    
    return response.data.data;
  },
};

export default mcpService;

// Export types for use in components
export type { MCPTool, MCPServer, MCPToolExecutionRequest, MCPToolExecutionResponse };
