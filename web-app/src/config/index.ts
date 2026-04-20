/**
 * Config index
 * Re-exports all configuration
 */

// API configuration
export { apiConfig, endpoints } from './api.config';

// Default values
export {
  defaultBrowserSettings,
  defaultExecutionSettings,
  defaultUiSettings,
  defaultApiSettings,
  defaultEditorSettings,
  defaultAppSettings,
  sampleFeature,
  viewportPresets,
  timeoutPresets,
} from './defaults.config';

// Editor configuration
export {
  GHERKIN_LANGUAGE_ID,
  gherkinKeywords,
  gherkinLanguageDefinition,
  gherkinLanguageConfig,
  gherkinLightTheme,
  gherkinDarkTheme,
  getEditorOptions,
  gherkinCompletions,
} from './editor.config';
