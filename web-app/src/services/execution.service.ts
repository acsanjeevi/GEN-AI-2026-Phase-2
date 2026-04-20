/**
 * Execution Service
 * API methods for test execution endpoints
 */

import apiClient from './api.client';
import { endpoints } from '@/config';
import type {
  CreateExecutionRequest,
  CreateExecutionResponse,
  ExecutionResponse,
  ExecutionStatusResponse,
  ListExecutionsRequest,
  ListExecutionsResponse,
  GetArtifactsResponse,
  ApiResponse,
} from '@/types';

// ============================================================================
// Constants
// ============================================================================

// Longer timeout for execution requests (5 minutes)
const EXECUTION_TIMEOUT = 5 * 60 * 1000;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract data from response - handles both wrapped and direct formats
 * Backend may return: { success: true, data: {...} } OR direct data {...}
 */
function extractData<T>(responseData: ApiResponse<T> | T): T {
  // Check if it's wrapped format
  if (responseData && typeof responseData === 'object' && 'success' in responseData) {
    const wrapped = responseData as ApiResponse<T>;
    if (!wrapped.success) {
      throw new Error(wrapped.error || 'Request failed');
    }
    return wrapped.data as T;
  }
  // Direct format
  return responseData as T;
}

// ============================================================================
// Execution Service
// ============================================================================

export const executionService = {
  /**
   * Create and start a new test execution
   */
  async create(request: CreateExecutionRequest): Promise<ExecutionResponse> {
    const response = await apiClient.post<ApiResponse<CreateExecutionResponse> | CreateExecutionResponse>(
      endpoints.execution.run,
      request,
      { timeout: EXECUTION_TIMEOUT }
    );
    
    const data = extractData(response.data);
    return data.execution;
  },

  /**
   * Get execution status (lightweight)
   */
  async getStatus(id: string): Promise<ExecutionStatusResponse> {
    const response = await apiClient.get<ApiResponse<ExecutionStatusResponse> | ExecutionStatusResponse>(
      endpoints.execution.status(id)
    );
    
    return extractData(response.data);
  },

  /**
   * Get full execution details
   */
  async getDetails(id: string): Promise<ExecutionResponse> {
    const response = await apiClient.get<ApiResponse<ExecutionResponse> | ExecutionResponse>(
      endpoints.execution.details(id)
    );
    
    return extractData(response.data);
  },

  /**
   * List executions with filters and pagination
   */
  async list(params?: ListExecutionsRequest): Promise<ListExecutionsResponse> {
    const response = await apiClient.get<ApiResponse<ListExecutionsResponse> | ListExecutionsResponse>(
      endpoints.execution.list,
      { params }
    );
    
    return extractData(response.data);
  },

  /**
   * Get artifacts for an execution
   */
  async getArtifacts(id: string): Promise<GetArtifactsResponse> {
    const response = await apiClient.get<ApiResponse<GetArtifactsResponse> | GetArtifactsResponse>(
      endpoints.execution.artifacts(id)
    );
    
    return extractData(response.data);
  },

  /**
   * List artifact files directly from disk
   * Returns videos, screenshots, and traces found in the artifacts folder
   * Includes attempt number for grouping retry artifacts
   */
  async listArtifactFiles(id: string): Promise<{
    videos: Array<{ name: string; path: string; url: string; attempt: number; timestamp: number }>;
    screenshots: Array<{ name: string; path: string; url: string; attempt: number; timestamp: number }>;
    traces: Array<{ name: string; path: string; url: string; attempt: number; timestamp: number }>;
    totalAttempts: number;
  }> {
    const response = await apiClient.get<{
      videos: Array<{ name: string; path: string; url: string; attempt: number; timestamp: number }>;
      screenshots: Array<{ name: string; path: string; url: string; attempt: number; timestamp: number }>;
      traces: Array<{ name: string; path: string; url: string; attempt: number; timestamp: number }>;
      scripts: Array<{ name: string; path: string; url: string }>;
      totalAttempts: number;
    }>(`${endpoints.execution.artifacts(id)}/files`);
    
    return response.data;
  },

  /**
   * Fetch the content of a script file from artifacts
   */
  async getScriptContent(executionId: string, scriptPath: string): Promise<string> {
    const url = `${apiClient.defaults.baseURL}/artifacts/${executionId}/${scriptPath}`;
    const response = await apiClient.get<string>(url, {
      responseType: 'text',
    });
    return response.data;
  },

  /**
   * Download a specific artifact
   * Returns the blob URL for the artifact
   */
  async downloadArtifact(executionId: string, artifactId: string): Promise<Blob> {
    const response = await apiClient.get(
      `${endpoints.execution.artifacts(executionId)}/${artifactId}`,
      { responseType: 'blob' }
    );
    
    return response.data;
  },

  /**
   * Get artifact URL for direct access via artifacts API
   */
  getArtifactUrl(executionId: string, artifactId: string): string {
    return `${apiClient.defaults.baseURL}${endpoints.execution.artifacts(executionId)}/${encodeURIComponent(artifactId)}`;
  },

  /**
   * Get direct URL for static artifact files
   * Videos and screenshots are served from /artifacts/{executionId}/videos/ and /artifacts/{executionId}/screenshots/
   */
  getStaticArtifactUrl(executionId: string, type: 'video' | 'screenshot' | 'trace', filename: string): string {
    const folder = type === 'video' ? 'videos' : type === 'screenshot' ? 'screenshots' : 'traces';
    return `${apiClient.defaults.baseURL}/artifacts/${executionId}/${folder}/${encodeURIComponent(filename)}`;
  },

  /**
   * Get base URL for static artifacts folder
   */
  getArtifactsFolderUrl(executionId: string, type: 'video' | 'screenshot' | 'trace'): string {
    const folder = type === 'video' ? 'videos' : type === 'screenshot' ? 'screenshots' : 'traces';
    return `${apiClient.defaults.baseURL}/artifacts/${executionId}/${folder}`;
  },

  /**
   * Cancel a running execution
   */
  async cancel(id: string): Promise<void> {
    const response = await apiClient.post<ApiResponse<{ message: string }> | { message: string }>(
      endpoints.execution.cancel(id)
    );
    
    // Just extract to validate, don't need the result
    extractData(response.data);
  },

  /**
   * Delete an execution and its artifacts
   */
  async delete(id: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<{ message: string }> | { message: string }>(
      endpoints.execution.delete(id)
    );
    
    // Just extract to validate, don't need the result
    extractData(response.data);
  },

  /**
   * Re-run an execution with the same configuration
   */
  async rerun(id: string): Promise<ExecutionResponse> {
    // First get the original execution details
    const original = await this.getDetails(id);
    
    // Create a new execution with the same configuration
    const request: CreateExecutionRequest = {
      name: `${original.name} (Re-run)`,
      featureContent: original.featureName, // This might need adjustment based on actual API
      baseUrl: '', // Would need to be retrieved from original
      executionMode: original.executionMode,
      browserConfig: original.browserConfig,
      autoStart: true,
    };
    
    return this.create(request);
  },
};

export default executionService;
