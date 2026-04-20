/**
 * Add Cookies Tool
 * Adds cookies to the browser context using Playwright's browser_run_code tool
 */

import { McpToolResult } from '../../common/McpClient.interface';
import { IMcpClient } from '../../common/McpClient.interface';
import { BaseTool, BaseToolOptions } from './BaseTool';

/**
 * Cookie structure matching Playwright's cookie format
 */
export interface Cookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

/**
 * Add cookies parameters
 */
export interface AddCookiesParams extends BaseToolOptions {
  /** Array of cookies to add */
  cookies: Cookie[];
}

/**
 * Add Cookies Tool
 * Uses browser_run_code to inject cookies into the browser context
 */
export class AddCookiesTool extends BaseTool<AddCookiesParams, unknown> {
  protected toolName = 'browser_run_code';

  constructor(client: IMcpClient) {
    super(client);
  }

  async execute(params: AddCookiesParams): Promise<McpToolResult<unknown>> {
    this.validateConnection();

    if (!params.cookies || params.cookies.length === 0) {
      // Return early with a dummy call
      return this.client.executeTool<unknown>(this.toolName, {
        code: '// No cookies to add',
      });
    }

    // Generate Playwright code to add cookies
    const cookiesJson = JSON.stringify(params.cookies);
    const code = `await page.context().addCookies(${cookiesJson});`;

    return this.client.executeTool<unknown>(this.toolName, {
      code,
    });
  }
}
