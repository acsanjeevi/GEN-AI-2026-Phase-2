/**
 * BrowserSettings Component
 * Configure browser defaults for test execution
 */

import { Monitor, Globe, Maximize2, RotateCcw } from 'lucide-react';
import { useSettingsStore } from '@/stores';
import type { BrowserType } from '@/types';

export interface BrowserSettingsProps {
  /** Additional CSS classes */
  className?: string;
}

const BROWSER_OPTIONS: { value: BrowserType; label: string; description: string }[] = [
  { value: 'chromium', label: 'Chromium', description: 'Google Chrome compatible' },
  { value: 'firefox', label: 'Firefox', description: 'Mozilla Firefox' },
  { value: 'webkit', label: 'WebKit', description: 'Safari compatible' },
];

const VIEWPORT_PRESETS = [
  { label: 'Desktop (1920×1080)', width: 1920, height: 1080 },
  { label: 'Desktop (1280×720)', width: 1280, height: 720 },
  { label: 'Tablet (768×1024)', width: 768, height: 1024 },
  { label: 'Mobile (375×667)', width: 375, height: 667 },
  { label: 'Mobile Large (414×896)', width: 414, height: 896 },
];

export function BrowserSettings({ className }: BrowserSettingsProps) {
  const browser = useSettingsStore((state) => state.browser);
  const updateBrowser = useSettingsStore((state) => state.updateBrowser);
  const resetSection = useSettingsStore((state) => state.resetSection);

  const handleViewportPreset = (width: number, height: number) => {
    updateBrowser({ viewportWidth: width, viewportHeight: height });
  };

  return (
    <section className={className}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Monitor className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Browser Settings</h2>
        </div>
        <button
          onClick={() => resetSection('browser')}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          title="Reset to defaults"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Browser Type */}
          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-foreground">
              Browser Type
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {BROWSER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateBrowser({ type: option.value })}
                  className={`flex flex-col items-start rounded-lg border p-4 text-left transition-colors ${
                    browser.type === option.value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  <Globe className={`mb-2 h-5 w-5 ${
                    browser.type === option.value ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                  <span className="font-medium text-foreground">{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Headless Mode */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Execution Mode
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => updateBrowser({ headless: true })}
                className={`flex-1 rounded-md border-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                  browser.headless
                    ? 'border-green-600 bg-green-600 text-white shadow-md'
                    : 'border-gray-300 bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                Headless
              </button>
              <button
                onClick={() => updateBrowser({ headless: false })}
                className={`flex-1 rounded-md border-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                  !browser.headless
                    ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                    : 'border-gray-300 bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                Visible
              </button>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {browser.headless
                ? 'Browser runs in the background (faster)'
                : 'Browser window is visible during execution'}
            </p>
          </div>

          {/* Viewport Presets */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Viewport Preset
            </label>
            <select
              onChange={(e) => {
                const preset = VIEWPORT_PRESETS.find((p) => p.label === e.target.value);
                if (preset) {
                  handleViewportPreset(preset.width, preset.height);
                }
              }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              defaultValue=""
            >
              <option value="" disabled>
                Select preset...
              </option>
              {VIEWPORT_PRESETS.map((preset) => (
                <option key={preset.label} value={preset.label}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Viewport */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              <Maximize2 className="mr-1 inline h-4 w-4" />
              Viewport Width
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={browser.viewportWidth}
                onChange={(e) => updateBrowser({ viewportWidth: parseInt(e.target.value, 10) || 1280 })}
                min={320}
                max={3840}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-sm text-muted-foreground">px</span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              <Maximize2 className="mr-1 inline h-4 w-4" />
              Viewport Height
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={browser.viewportHeight}
                onChange={(e) => updateBrowser({ viewportHeight: parseInt(e.target.value, 10) || 720 })}
                min={240}
                max={2160}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-sm text-muted-foreground">px</span>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="mt-6 rounded-md bg-muted/50 p-4">
          <h4 className="mb-2 text-sm font-medium text-foreground">Current Configuration</h4>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {browser.type}
            </span>
            <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {browser.headless ? 'Headless' : 'Visible'}
            </span>
            <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
              {browser.viewportWidth} × {browser.viewportHeight}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default BrowserSettings;
