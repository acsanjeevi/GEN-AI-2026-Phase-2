/**
 * Network Requests Tool
 * Retrieves network request information from the browser
 */

import { McpToolResult } from '../../common/McpClient.interface';
import { IMcpClient } from '../../common/McpClient.interface';
import { BaseTool, BaseToolOptions } from './BaseTool';

/**
 * Network request structure
 */
export interface NetworkRequest {
  /** Request URL */
  url: string;
  /** HTTP method */
  method: string;
  /** Request headers */
  headers?: Record<string, string>;
  /** Resource type */
  resourceType?: string;
  /** Response status */
  status?: number;
  /** Response status text */
  statusText?: string;
  /** Timestamp */
  timestamp?: number;
  /** Duration in ms */
  duration?: number;
}

/**
 * Network requests parameters
 */
export interface NetworkRequestsParams extends BaseToolOptions {
  /** Filter by URL pattern */
  urlPattern?: string;
  /** Filter by resource type */
  resourceType?: string;
}

/**
 * Network requests result
 */
export interface NetworkRequestsResult {
  /** List of network requests */
  requests: NetworkRequest[];
  /** Total count */
  count: number;
}

/**
 * Network Requests Tool
 * Gets network requests made by the page
 */
export class NetworkRequestsTool extends BaseTool<NetworkRequestsParams, NetworkRequestsResult> {
  protected toolName = 'browser_network_requests';

  constructor(client: IMcpClient) {
    super(client);
  }

  async execute(params: NetworkRequestsParams = {}): Promise<McpToolResult<NetworkRequestsResult>> {
    this.validateConnection();

    return this.client.executeTool<NetworkRequestsResult>(this.toolName, {
      urlPattern: params.urlPattern,
      resourceType: params.resourceType,
    });
  }
}
