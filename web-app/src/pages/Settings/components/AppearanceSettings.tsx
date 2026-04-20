/**
 * AppearanceSettings Component
 * Configure UI theme and appearance
 */

import { Palette, Sun, Moon, Monitor, RotateCcw } from 'lucide-react';
import { useSettingsStore, selectResolvedTheme } from '@/stores';
import type { Theme } from '@/types';

export interface AppearanceSettingsProps {
  /** Additional CSS classes */
  className?: string;
}

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'light', label: 'Light', icon: Sun, description: 'Light background with dark text' },
  { value: 'dark', label: 'Dark', icon: Moon, description: 'Dark background with light text' },
  { value: 'system', label: 'System', icon: Monitor, description: 'Follow system preference' },
];

export function AppearanceSettings({ className }: AppearanceSettingsProps) {
  const ui = useSettingsStore((state) => state.ui);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const resetSection = useSettingsStore((state) => state.resetSection);
  const resolvedTheme = useSettingsStore(selectResolvedTheme);

  return (
    <section className={className}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
        </div>
        <button
          onClick={() => resetSection('ui')}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          title="Reset to defaults"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <div className="space-y-6">
          {/* Theme Selection */}
          <div>
            <label className="mb-3 block text-sm font-medium text-foreground">
              Theme
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {THEME_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = ui.theme === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={`flex flex-col items-center rounded-lg border p-4 text-center transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div
                      className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="font-medium text-foreground">{option.label}</span>
                    <span className="mt-1 text-xs text-muted-foreground">{option.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Theme Info */}
          {ui.theme === 'system' && (
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                Currently using:{' '}
                <span className="font-medium text-foreground">
                  {resolvedTheme === 'dark' ? 'Dark' : 'Light'} theme
                </span>
                {' '}based on your system settings
              </p>
            </div>
          )}

          {/* Preview */}
          <div>
            <label className="mb-3 block text-sm font-medium text-foreground">
              Preview
            </label>
            <div className="grid grid-cols-2 gap-4">
              {/* Light Preview */}
              <div className="overflow-hidden rounded-lg border">
                <div className="bg-white p-3">
                  <div className="mb-2 h-2 w-16 rounded bg-gray-200" />
                  <div className="space-y-1">
                    <div className="h-2 w-full rounded bg-gray-100" />
                    <div className="h-2 w-3/4 rounded bg-gray-100" />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <div className="h-6 w-12 rounded bg-blue-500" />
                    <div className="h-6 w-12 rounded bg-gray-200" />
                  </div>
                </div>
                <div className="bg-gray-100 px-3 py-1.5 text-center text-xs text-gray-600">
                  Light
                </div>
              </div>

              {/* Dark Preview */}
              <div className="overflow-hidden rounded-lg border">
                <div className="bg-gray-900 p-3">
                  <div className="mb-2 h-2 w-16 rounded bg-gray-700" />
                  <div className="space-y-1">
                    <div className="h-2 w-full rounded bg-gray-800" />
                    <div className="h-2 w-3/4 rounded bg-gray-800" />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <div className="h-6 w-12 rounded bg-blue-500" />
                    <div className="h-6 w-12 rounded bg-gray-700" />
                  </div>
                </div>
                <div className="bg-gray-800 px-3 py-1.5 text-center text-xs text-gray-400">
                  Dark
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AppearanceSettings;
