/**
 * Config Types
 * Application configuration types
 */

import type { BrowserType } from './execution.types';

// ============================================================================
// Browser Settings
// ============================================================================

/**
 * Browser settings for the UI
 */
export interface BrowserSettings {
  /** Browser type */
  type: BrowserType;
  /** Run in headless mode */
  headless: boolean;
  /** Viewport width */
  viewportWidth: number;
  /** Viewport height */
  viewportHeight: number;
}

// ============================================================================
// Execution Settings
// ============================================================================

/**
 * Execution settings for the UI
 */
export interface ExecutionSettings {
  /** Default timeout in milliseconds */
  timeout: number;
  /** Maximum retries per scenario */
  maxRetries: number;
  /** Take screenshots on failure */
  screenshotOnFailure: boolean;
  /** Record video */
  recordVideo: boolean;
  /** Enable tracing */
  traceEnabled: boolean;
  /** Default base URL for test execution */
  defaultBaseUrl: string;
}

// ============================================================================
// API Settings
// ============================================================================

/**
 * API configuration settings
 */
export interface ApiSettings {
  /** Base URL for API calls */
  baseUrl: string;
  /** Request timeout in milliseconds */
  timeout: number;
}

// ============================================================================
// UI Settings
// ============================================================================

/**
 * Theme options
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * UI settings
 */
export interface UiSettings {
  /** Theme preference */
  theme: Theme;
  /** Whether sidebar is collapsed */
  sidebarCollapsed: boolean;
  /** Whether to show line numbers in editor */
  editorLineNumbers: boolean;
  /** Editor font size */
  editorFontSize: number;
  /** Whether to auto-save editor content */
  autoSave: boolean;
  /** Auto-save interval in seconds */
  autoSaveInterval: number;
}

// ============================================================================
// Combined App Settings
// ============================================================================

/**
 * Complete application settings
 */
export interface AppSettings {
  /** Browser configuration */
  browser: BrowserSettings;
  /** Execution configuration */
  execution: ExecutionSettings;
  /** API configuration */
  api: ApiSettings;
  /** UI configuration */
  ui: UiSettings;
}

// ============================================================================
// Editor Settings
// ============================================================================

/**
 * Monaco editor settings
 */
export interface EditorSettings {
  /** Font size */
  fontSize: number;
  /** Tab size */
  tabSize: number;
  /** Show minimap */
  minimap: boolean;
  /** Word wrap */
  wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  /** Line numbers */
  lineNumbers: 'on' | 'off' | 'relative';
  /** Theme */
  theme: 'vs' | 'vs-dark' | 'hc-black';
  /** Auto-closing brackets */
  autoClosingBrackets: 'always' | 'languageDefined' | 'beforeWhitespace' | 'never';
}

// ============================================================================
// Notification Types
// ============================================================================

/**
 * Notification type
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * Notification item
 */
export interface Notification {
  /** Unique ID */
  id: string;
  /** Notification type */
  type: NotificationType;
  /** Title */
  title: string;
  /** Message */
  message?: string;
  /** Auto-dismiss duration in milliseconds (0 = no auto-dismiss) */
  duration: number;
  /** Timestamp */
  timestamp: number;
}
