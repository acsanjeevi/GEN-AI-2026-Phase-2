/**
 * Playwright Controller
 * Individual endpoints for each Playwright MCP tool
 * Delegates to MCP client tools directly
 */

import { Request, Response } from 'express';
import { RealPlaywrightMcpClient } from '../../../infrastructure/mcp/playwright/RealPlaywrightMcpClient';
import { PlaywrightMcpClient } from '../../../infrastructure/mcp/playwright/PlaywrightMcpClient';
import { createLogger, ILogger } from '../../../infrastructure/logging';
import * as Tools from '../../../infrastructure/mcp/playwright/tools';
import { getSalesforceAuth, isSalesforceUrl } from '../../../infrastructure/auth/SalesforceAuthService';

const logger: ILogger = createLogger({ level: 'info', format: 'json' });

// MCP client instance
let mcpClient: RealPlaywrightMcpClient | null = null;

// Track if Salesforce cookies have been injected for this browser session
let salesforceCookiesInjected = false;

/**
 * Initialize MCP client
 */
const initClient = async (): Promise<PlaywrightMcpClient> => {
  if (!mcpClient) {
    mcpClient = new RealPlaywrightMcpClient({
      serverName: 'playwright',
      serverType: 'playwright',
      connectionTimeout: 30000,
      requestTimeout: 30000,
      autoReconnect: true,
      maxReconnectAttempts: 3,
    });
    await mcpClient.connect();
    // Reset Salesforce cookie injection state on new browser session
    salesforceCookiesInjected = false;
    logger.info('Playwright MCP client initialized');
  }
  return mcpClient as unknown as PlaywrightMcpClient;
};

/**
 * Inject Salesforce cookies if navigating to a Salesforce URL
 * This enables automatic login using stored authentication state
 */
const injectSalesforceAuthIfNeeded = async (
  client: PlaywrightMcpClient,
  url: string
): Promise<void> => {
  // Only inject if URL is Salesforce and cookies haven't been injected yet
  if (!isSalesforceUrl(url) || salesforceCookiesInjected) {
    return;
  }

  const authService = getSalesforceAuth();
  const cookies = authService.getCookies();

  if (cookies.length === 0) {
    logger.warn('No Salesforce cookies found to inject', {
      storageStatePath: authService.getStorageStatePath(),
    });
    return;
  }

  try {
    logger.info('Injecting Salesforce authentication cookies', {
      cookieCount: cookies.length,
      url,
    });

    const addCookiesTool = new Tools.AddCookiesTool(client);
    const result = await addCookiesTool.execute({ cookies });

    if (result.success) {
      salesforceCookiesInjected = true;
      logger.info('Salesforce cookies injected successfully', {
        cookieCount: cookies.length,
      });
    } else {
      logger.error('Failed to inject Salesforce cookies', {
        error: result.error,
      });
    }
  } catch (error) {
    logger.error('Error injecting Salesforce cookies', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/** POST /mcp/playwright/navigate */
export const navigateHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await initClient();
    
    // Auto-inject Salesforce cookies before navigation if needed
    if (req.body.url) {
      await injectSalesforceAuthIfNeeded(client, req.body.url);
    }
    
    const tool = new Tools.NavigateTool(client);
    const result = await tool.execute(req.body);
    
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Navigate failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

/** POST /mcp/playwright/navigate-back */
export const navigateBackHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await initClient();
    const tool = new Tools.GoBackTool(client);
    const result = await tool.execute({});
    
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Navigate back failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

/** POST /mcp/playwright/navigate-forward */
export const navigateForwardHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await initClient();
    const tool = new Tools.GoForwardTool(client);
    const result = await tool.execute({});
    
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Navigate forward failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

/** POST /mcp/playwright/click */
export const clickHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await initClient();
    const tool = new Tools.ClickTool(client);
    const result = await tool.execute(req.body);
    
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Click failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

/** POST /mcp/playwright/type */
export const typeHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await initClient();
    const tool = new Tools.TypeTool(client);
    const result = await tool.execute(req.body);
    
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Type failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

/** POST /mcp/playwright/press-key */
export const pressKeyHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await initClient();
    const tool = new Tools.PressKeyTool(client);
    const result = await tool.execute(req.body);
    
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Press key failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

/** POST /mcp/playwright/select-option */
export const selectOptionHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await initClient();
    const tool = new Tools.SelectOptionTool(client);
    const result = await tool.execute(req.body);
    
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Select option failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

/** POST /mcp/playwright/hover */
export const hoverHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await initClient();
    const tool = new Tools.HoverTool(client);
    const result = await tool.execute(req.body);
    
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Hover failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

/** POST /mcp/playwright/drag */
export const dragHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await initClient();
    const tool = new Tools.DragTool(client);
    const result = await tool.execute(req.body);
    
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Drag failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

/** POST /mcp/playwright/file-upload */
export const fileUploadHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await initClient();
    const tool = new Tools.FileUploadTool(client);
    const result = await tool.execute(req.body);
    
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    logger.error('File upload failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

/** POST /mcp/playwright/handle-dialog */
export const handleDialogHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await initClient();
    const tool = new Tools.HandleDialogTool(client);
    const result = await tool.execute(req.body);
    
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Handle dialog failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

/** POST /mcp/playwright/close */
export const closeHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await initClient();
    const tool = new Tools.CloseTool(client);
    const result = await tool.execute(req.body);
    
    // Reset client and Salesforce auth state
    if (mcpClient) {
      await mcpClient.disconnect();
      mcpClient = null;
      salesforceCookiesInjected = false;
    }
    
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Close failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

/** POST /mcp/playwright/resize */
export const resizeHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await initClient();
    const tool = new Tools.ResizeTool(client);
    const result = await tool.execute(req.body);
    
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Resize failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

/** POST /mcp/playwright/take-screenshot */
export const takeScreenshotHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await initClient();
    const tool = new Tools.ScreenshotTool(client);
    const result = await tool.execute(req.body);
    
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Screenshot failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

/** POST /mcp/playwright/snapshot */
export const snapshotHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await initClient();
    const tool = new Tools.SnapshotTool(client);
    const result = await tool.execute(req.body);
    
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Snapshot failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

/** POST /mcp/playwright/console-messages */
export const consoleMessagesHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await initClient();
    const tool = new Tools.ConsoleMessagesTool(client);
    const result = await tool.execute(req.body);
    
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Console messages failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

/** POST /mcp/playwright/network-requests */
export const networkRequestsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await initClient();
    const tool = new Tools.NetworkRequestsTool(client);
    const result = await tool.execute(req.body);
    
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Network requests failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

/** POST /mcp/playwright/wait-for */
export const waitForHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await initClient();
    const tool = new Tools.WaitTool(client);
    const result = await tool.execute(req.body);
    
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Wait failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

/** POST /mcp/playwright/tab-list */
export const tabListHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await initClient();
    const tool = new Tools.TabListTool(client);
    const result = await tool.execute({});
    
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Tab list failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

/** POST /mcp/playwright/tab-new */
export const tabNewHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await initClient();
    const tool = new Tools.TabNewTool(client);
    const result = await tool.execute({ url: req.body.url });
    
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Tab new failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

/** POST /mcp/playwright/tab-select */
export const tabSelectHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await initClient();
    const tool = new Tools.TabSelectTool(client);
    const result = await tool.execute({ index: req.body.index });
    
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Tab select failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

/** POST /mcp/playwright/tab-close */
export const tabCloseHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await initClient();
    const tool = new Tools.TabCloseTool(client);
    const result = await tool.execute({ index: req.body.index });
    
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Tab close failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};
