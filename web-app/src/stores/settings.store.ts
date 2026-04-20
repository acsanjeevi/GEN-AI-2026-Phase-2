/**
 * Settings Store
 * Manages user preferences with localStorage persistence
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  BrowserSettings,
  ExecutionSettings,
  UiSettings,
  Theme,
  BrowserType,
} from '@/types';
import {
  defaultBrowserSettings,
  defaultExecutionSettings,
  defaultUiSettings,
  defaultApiSettings,
} from '@/config';

// ============================================================================
// Types
// ============================================================================

interface SettingsState {
  /** Browser configuration */
  browser: BrowserSettings;
  /** Execution configuration */
  execution: ExecutionSettings;
  /** UI configuration */
  ui: UiSettings;
  /** API base URL override */
  apiBaseUrl: string;
  /** Whether settings have been modified from defaults */
  isModified: boolean;
}

interface SettingsActions {
  /** Update browser settings */
  updateBrowser: (settings: Partial<BrowserSettings>) => void;
  /** Update execution settings */
  updateExecution: (settings: Partial<ExecutionSettings>) => void;
  /** Update UI settings */
  updateUi: (settings: Partial<UiSettings>) => void;
  /** Set theme */
  setTheme: (theme: Theme) => void;
  /** Toggle sidebar */
  toggleSidebar: () => void;
  /** Set API base URL */
  setApiBaseUrl: (url: string) => void;
  /** Reset to defaults */
  resetToDefaults: () => void;
  /** Reset specific section */
  resetSection: (section: 'browser' | 'execution' | 'ui') => void;
}

type SettingsStore = SettingsState & SettingsActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: SettingsState = {
  browser: defaultBrowserSettings,
  execution: defaultExecutionSettings,
  ui: defaultUiSettings,
  apiBaseUrl: defaultApiSettings.baseUrl,
  isModified: false,
};

// ============================================================================
// Store
// ============================================================================

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      updateBrowser: (settings) => {
        set({
          browser: { ...get().browser, ...settings },
          isModified: true,
        });
      },

      updateExecution: (settings) => {
        set({
          execution: { ...get().execution, ...settings },
          isModified: true,
        });
      },

      updateUi: (settings) => {
        set({
          ui: { ...get().ui, ...settings },
          isModified: true,
        });
      },

      setTheme: (theme) => {
        set({
          ui: { ...get().ui, theme },
          isModified: true,
        });
        // Apply theme to document
        applyTheme(theme);
      },

      toggleSidebar: () => {
        set({
          ui: { ...get().ui, sidebarCollapsed: !get().ui.sidebarCollapsed },
        });
      },

      setApiBaseUrl: (url) => {
        set({
          apiBaseUrl: url,
          isModified: true,
        });
      },

      resetToDefaults: () => {
        set({
          browser: defaultBrowserSettings,
          execution: defaultExecutionSettings,
          ui: defaultUiSettings,
          apiBaseUrl: defaultApiSettings.baseUrl,
          isModified: false,
        });
        applyTheme(defaultUiSettings.theme);
      },

      resetSection: (section) => {
        switch (section) {
          case 'browser':
            set({ browser: defaultBrowserSettings });
            break;
          case 'execution':
            set({ execution: defaultExecutionSettings });
            break;
          case 'ui':
            set({ ui: defaultUiSettings });
            applyTheme(defaultUiSettings.theme);
            break;
        }
      },
    }),
    {
      name: 'settings-storage',
      onRehydrateStorage: () => (state) => {
        // Apply theme on app load
        if (state?.ui.theme) {
          applyTheme(state.ui.theme);
        }
      },
    }
  )
);

// ============================================================================
// Theme Helper
// ============================================================================

/**
 * Apply theme to document
 */
function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (theme === 'dark' || (theme === 'system' && systemDark)) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { theme } = useSettingsStore.getState().ui;
    if (theme === 'system') {
      applyTheme(theme);
    }
  });
}

// ============================================================================
// Selectors
// ============================================================================

/**
 * Get current theme (resolved)
 */
export const selectResolvedTheme = (state: SettingsStore): 'light' | 'dark' => {
  if (state.ui.theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return state.ui.theme;
};

/**
 * Get browser type
 */
export const selectBrowserType = (state: SettingsStore): BrowserType => {
  return state.browser.type;
};

/**
 * Get whether recording is enabled
 */
export const selectIsRecordingEnabled = (state: SettingsStore): boolean => {
  return state.execution.recordVideo || state.execution.screenshotOnFailure;
};

export default useSettingsStore;
