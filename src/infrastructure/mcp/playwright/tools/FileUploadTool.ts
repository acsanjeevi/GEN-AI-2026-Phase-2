/**
 * File Upload Tool
 * Handles file uploads in the browser
 */

import { McpToolResult } from '../../common/McpClient.interface';
import { IMcpClient } from '../../common/McpClient.interface';
import { BaseTool, BaseToolOptions } from './BaseTool';

/**
 * File upload parameters
 */
export interface FileUploadParams extends BaseToolOptions {
  /** File paths to upload */
  paths: string[];
}

/**
 * File upload result
 */
export interface FileUploadResult {
  /** Number of files uploaded */
  filesUploaded: number;
  /** File names */
  fileNames: string[];
}

/**
 * File Upload Tool
 * Uploads files via a file input element
 */
export class FileUploadTool extends BaseTool<FileUploadParams, FileUploadResult> {
  protected toolName = 'browser_file_upload';

  constructor(client: IMcpClient) {
    super(client);
  }

  async execute(params: FileUploadParams): Promise<McpToolResult<FileUploadResult>> {
    this.validateConnection();
    
    if (!params.paths || params.paths.length === 0) {
      throw new Error('At least one file path is required for upload');
    }

    return this.client.executeTool<FileUploadResult>(this.toolName, {
      paths: params.paths,
    });
  }
}
