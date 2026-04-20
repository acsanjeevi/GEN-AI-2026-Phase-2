/**
 * Default Configuration Values
 * Sensible defaults for all application settings
 */

import type {
  BrowserSettings,
  ExecutionSettings,
  UiSettings,
  ApiSettings,
  AppSettings,
  EditorSettings,
} from '@/types';

// ============================================================================
// Browser Defaults
// ============================================================================

/**
 * Default browser configuration
 */
export const defaultBrowserSettings: BrowserSettings = {
  type: 'chromium',
  headless: false,
  viewportWidth: 1280,
  viewportHeight: 720,
};

// ============================================================================
// Execution Defaults
// ============================================================================

/**
 * Default execution configuration
 */
export const defaultExecutionSettings: ExecutionSettings = {
  timeout: 30000,
  maxRetries: 1,
  screenshotOnFailure: true,
  recordVideo: true,
  traceEnabled: true,
  defaultBaseUrl: 'https://www.saucedemo.com', // Default test URL
};

// ============================================================================
// UI Defaults
// ============================================================================

/**
 * Default UI configuration
 */
export const defaultUiSettings: UiSettings = {
  theme: 'system',
  sidebarCollapsed: false,
  editorLineNumbers: true,
  editorFontSize: 14,
  autoSave: true,
  autoSaveInterval: 30,
};

// ============================================================================
// API Defaults
// ============================================================================

/**
 * Default API configuration
 */
export const defaultApiSettings: ApiSettings = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: 30000,
};

// ============================================================================
// Editor Defaults
// ============================================================================

/**
 * Default Monaco editor settings
 */
export const defaultEditorSettings: EditorSettings = {
  fontSize: 14,
  tabSize: 2,
  minimap: false,
  wordWrap: 'on',
  lineNumbers: 'on',
  theme: 'vs',
  autoClosingBrackets: 'always',
};

// ============================================================================
// Combined App Defaults
// ============================================================================

/**
 * Default application settings
 */
export const defaultAppSettings: AppSettings = {
  browser: defaultBrowserSettings,
  execution: defaultExecutionSettings,
  ui: defaultUiSettings,
  api: defaultApiSettings,
};

// ============================================================================
// Sample Feature
// ============================================================================

/**
 * Sample Gherkin feature for the editor
 */
export const sampleFeature = `Feature: Sample Login Test
  As a user
  I want to login to the application
  So that I can access my account

  @smoke @login
  Scenario: Successful login with valid credentials
    Given I navigate to "https://example.com/login"
    When I enter "testuser" in the username field
    And I enter "password123" in the password field
    And I click on the login button
    Then I should see the dashboard page
    And I should see text "Welcome, testuser"

  @smoke @login @negative
  Scenario: Failed login with invalid credentials
    Given I navigate to "https://example.com/login"
    When I enter "invaliduser" in the username field
    And I enter "wrongpassword" in the password field
    And I click on the login button
    Then I should see text "Invalid credentials"
`;

// ============================================================================
// Viewport Presets
// ============================================================================

/**
 * Common viewport presets
 */
export const viewportPresets = {
  desktop: { width: 1920, height: 1080, label: 'Desktop (1920x1080)' },
  laptop: { width: 1280, height: 720, label: 'Laptop (1280x720)' },
  tablet: { width: 768, height: 1024, label: 'Tablet (768x1024)' },
  mobile: { width: 375, height: 667, label: 'Mobile (375x667)' },
  mobileLarge: { width: 414, height: 896, label: 'Mobile Large (414x896)' },
} as const;

// ============================================================================
// Timeout Presets
// ============================================================================

/**
 * Common timeout presets in milliseconds
 */
export const timeoutPresets = {
  fast: { value: 10000, label: 'Fast (10s)' },
  normal: { value: 30000, label: 'Normal (30s)' },
  slow: { value: 60000, label: 'Slow (60s)' },
  verySlow: { value: 120000, label: 'Very Slow (120s)' },
} as const;
