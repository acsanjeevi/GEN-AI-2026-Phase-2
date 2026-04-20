/**
 * Stores index
 * Re-exports all Zustand stores
 */

// Execution Store
export {
  useExecutionStore,
  selectCanCancel,
  selectPassRate,
  selectStatus,
} from './execution.store';

// Editor Store
export {
  useEditorStore,
  selectErrors,
  selectIsValid,
  selectScenarioNames,
  selectSavedFeatureCount,
} from './editor.store';

// Settings Store
export {
  useSettingsStore,
  selectResolvedTheme,
  selectBrowserType,
  selectIsRecordingEnabled,
} from './settings.store';

// Notification Store
export {
  useNotificationStore,
  selectNotificationsByType,
  selectNotificationCount,
  selectHasErrors,
} from './notification.store';
