/**
 * ExecutionSettings Component
 * Configure default execution options
 */

import { Play, Clock, RefreshCw, Video, Camera, FileSearch, RotateCcw, Globe } from 'lucide-react';
import { useSettingsStore } from '@/stores';

export interface ExecutionSettingsProps {
  /** Additional CSS classes */
  className?: string;
}

const TIMEOUT_PRESETS = [
  { label: '15 seconds', value: 15000 },
  { label: '30 seconds', value: 30000 },
  { label: '1 minute', value: 60000 },
  { label: '2 minutes', value: 120000 },
  { label: '5 minutes', value: 300000 },
];

export function ExecutionSettings({ className }: ExecutionSettingsProps) {
  const execution = useSettingsStore((state) => state.execution);
  const updateExecution = useSettingsStore((state) => state.updateExecution);
  const resetSection = useSettingsStore((state) => state.resetSection);

  return (
    <section className={className}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Play className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Execution Settings</h2>
        </div>
        <button
          onClick={() => resetSection('execution')}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          title="Reset to defaults"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <div className="space-y-6">
          {/* Default Base URL */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Default Base URL
            </label>
            <input
              type="url"
              value={execution.defaultBaseUrl}
              onChange={(e) => updateExecution({ defaultBaseUrl: e.target.value })}
              placeholder="https://example.com"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              The default target website URL. This will be pre-filled when running tests.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Timeout */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Action Timeout
              </label>
              <select
                value={execution.timeout}
                onChange={(e) => updateExecution({ timeout: parseInt(e.target.value, 10) })}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {TIMEOUT_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Maximum time to wait for each action
              </p>
            </div>

            {/* Custom Timeout */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Custom Timeout (ms)
              </label>
              <input
                type="number"
                value={execution.timeout}
                onChange={(e) => updateExecution({ timeout: parseInt(e.target.value, 10) || 30000 })}
                min={1000}
                max={600000}
                step={1000}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Max Retries */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                Max Retries
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  value={execution.maxRetries}
                  onChange={(e) => updateExecution({ maxRetries: parseInt(e.target.value, 10) })}
                  min={0}
                  max={5}
                  className="flex-1"
                />
                <span className="w-8 text-center text-sm font-medium text-foreground">
                  {execution.maxRetries}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Number of retry attempts on failure
              </p>
            </div>
          </div>

          {/* Recording Options */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-foreground">Recording Options</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Record Video */}
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                  execution.recordVideo
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'hover:bg-muted'
                }`}
              >
                <input
                  type="checkbox"
                  checked={execution.recordVideo}
                  onChange={(e) => updateExecution({ recordVideo: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <Video className={`h-4 w-4 ${execution.recordVideo ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="font-medium text-foreground">Video</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Record video of execution
                  </p>
                </div>
              </label>

              {/* Screenshot on Failure */}
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                  execution.screenshotOnFailure
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'hover:bg-muted'
                }`}
              >
                <input
                  type="checkbox"
                  checked={execution.screenshotOnFailure}
                  onChange={(e) => updateExecution({ screenshotOnFailure: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <Camera className={`h-4 w-4 ${execution.screenshotOnFailure ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="font-medium text-foreground">Screenshots</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Capture on failure
                  </p>
                </div>
              </label>

              {/* Trace */}
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                  execution.traceEnabled
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'hover:bg-muted'
                }`}
              >
                <input
                  type="checkbox"
                  checked={execution.traceEnabled}
                  onChange={(e) => updateExecution({ traceEnabled: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <FileSearch className={`h-4 w-4 ${execution.traceEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="font-medium text-foreground">Trace</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Enable Playwright trace
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ExecutionSettings;
