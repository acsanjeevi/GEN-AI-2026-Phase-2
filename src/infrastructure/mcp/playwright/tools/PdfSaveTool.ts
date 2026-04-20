/**
 * PDF Save Tool
 * Saves the current page as PDF
 */

import { McpToolResult } from '../../common/McpClient.interface';
import { IMcpClient } from '../../common/McpClient.interface';
import { BaseTool, BaseToolOptions } from './BaseTool';

/**
 * PDF save parameters
 */
export interface PdfSaveParams extends BaseToolOptions {
  /** Output file path for the PDF */
  filename?: string;
  /** Print background graphics */
  printBackground?: boolean;
  /** Paper format (e.g., 'A4', 'Letter') */
  format?: string;
  /** Paper orientation */
  landscape?: boolean;
}

/**
 * PDF save result
 */
export interface PdfSaveResult {
  /** Path where PDF was saved */
  path: string;
  /** File size in bytes */
  size?: number;
}

/**
 * PDF Save Tool
 * Saves the current page as a PDF document
 */
export class PdfSaveTool extends BaseTool<PdfSaveParams, PdfSaveResult> {
  protected toolName = 'browser_pdf_save';

  constructor(client: IMcpClient) {
    super(client);
  }

  async execute(params: PdfSaveParams = {}): Promise<McpToolResult<PdfSaveResult>> {
    this.validateConnection();

    return this.client.executeTool<PdfSaveResult>(this.toolName, {
      filename: params.filename,
      printBackground: params.printBackground,
      format: params.format,
      landscape: params.landscape,
    });
  }
}
