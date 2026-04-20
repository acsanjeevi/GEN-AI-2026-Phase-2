/**
 * Salesforce Authentication Service
 * Handles automatic login for Salesforce applications using stored cookies
 */

import * as fs from 'fs';
import * as path from 'path';
import { Cookie } from '../mcp/playwright/tools/AddCookiesTool';
import { createLogger, ILogger } from '../logging';

const logger: ILogger = createLogger({ level: 'info', format: 'json' });

/**
 * Storage state structure matching Playwright's format
 */
export interface StorageState {
  cookies: Cookie[];
  origins?: {
    origin: string;
    localStorage: { name: string; value: string }[];
  }[];
}

/**
 * Salesforce URL patterns to detect
 */
const SALESFORCE_URL_PATTERNS = [
  /\.salesforce\.com/i,
  /\.force\.com/i,
  /\.lightning\.force\.com/i,
  /\.my\.salesforce\.com/i,
];

/**
 * Default path to Salesforce login storage state
 */
const DEFAULT_STORAGE_STATE_PATH = path.join(
  process.cwd(),
  'config',
  'salesforceLogin.json'
);

/**
 * Check if a URL is a Salesforce URL
 */
export function isSalesforceUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return SALESFORCE_URL_PATTERNS.some(pattern => pattern.test(urlObj.hostname));
  } catch {
    return false;
  }
}

/**
 * Load Salesforce storage state from file
 */
export function loadSalesforceStorageState(
  filePath: string = DEFAULT_STORAGE_STATE_PATH
): StorageState | null {
  try {
    if (!fs.existsSync(filePath)) {
      logger.warn('Salesforce storage state file not found', { filePath });
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const storageState = JSON.parse(content) as StorageState;

    if (!storageState.cookies || !Array.isArray(storageState.cookies)) {
      logger.warn('Invalid storage state format: cookies array not found');
      return null;
    }

    logger.info('Salesforce storage state loaded', {
      filePath,
      cookieCount: storageState.cookies.length,
    });

    return storageState;
  } catch (error) {
    logger.error('Failed to load Salesforce storage state', {
      filePath,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Get cookies from storage state for injection
 * Filters and transforms cookies for Playwright's addCookies API
 */
export function getCookiesForInjection(storageState: StorageState): Cookie[] {
  return storageState.cookies.map(cookie => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path || '/',
    httpOnly: cookie.httpOnly ?? false,
    secure: cookie.secure ?? true,
    sameSite: cookie.sameSite || 'None',
    // Only include expires if it's a positive number (not session cookie)
    ...(cookie.expires && cookie.expires > 0 ? { expires: cookie.expires } : {}),
  }));
}

/**
 * Salesforce Authentication Service
 * Singleton service for managing Salesforce authentication
 */
export class SalesforceAuthService {
  private static instance: SalesforceAuthService;
  private storageState: StorageState | null = null;
  private storageStatePath: string;

  private constructor(storageStatePath: string = DEFAULT_STORAGE_STATE_PATH) {
    this.storageStatePath = storageStatePath;
  }

  /**
   * Get singleton instance
   */
  static getInstance(storageStatePath?: string): SalesforceAuthService {
    if (!SalesforceAuthService.instance) {
      SalesforceAuthService.instance = new SalesforceAuthService(storageStatePath);
    }
    return SalesforceAuthService.instance;
  }

  /**
   * Check if URL requires Salesforce authentication
   */
  requiresAuth(url: string): boolean {
    return isSalesforceUrl(url);
  }

  /**
   * Load storage state from file
   */
  loadStorageState(): boolean {
    this.storageState = loadSalesforceStorageState(this.storageStatePath);
    return this.storageState !== null;
  }

  /**
   * Get cookies for browser injection
   */
  getCookies(): Cookie[] {
    if (!this.storageState) {
      this.loadStorageState();
    }
    return this.storageState ? getCookiesForInjection(this.storageState) : [];
  }

  /**
   * Check if storage state is loaded
   */
  isLoaded(): boolean {
    return this.storageState !== null;
  }

  /**
   * Reload storage state from file
   */
  reload(): boolean {
    this.storageState = null;
    return this.loadStorageState();
  }

  /**
   * Get the storage state path
   */
  getStorageStatePath(): string {
    return this.storageStatePath;
  }
}

// Export singleton instance getter
export const getSalesforceAuth = SalesforceAuthService.getInstance;
