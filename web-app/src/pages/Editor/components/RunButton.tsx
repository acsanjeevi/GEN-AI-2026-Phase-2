/**
 * RunButton Component
 * Execute button with configuration modal
 */

import { useState } from 'react';
import {
  Play,
  Settings2,
  X,
  Chrome,
  Globe,
  Monitor,
  Video,
  Camera,
  RefreshCw,
  Clock,
  Loader2,
} from 'lucide-react';
import { useSettingsStore } from '@/stores';
import type { BrowserType, BrowserConfig, ExecutionOptions } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface RunConfig {
  /** Base URL for the application under test */
  baseUrl: string;
  /** Browser configuration */
  browser: BrowserConfig;
  /** Execution options */
  options: ExecutionOptions;
}

export interface RunButtonProps {
  /** Whether the run button is disabled */
  disabled?: boolean;
  /** Whether execution is in progress */
  isRunning?: boolean;
  /** Callback when run is clicked */
  onRun: (config: RunConfig) => void;
  /** Additional CSS class */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const BROWSER_OPTIONS: { value: BrowserType; label: string; icon: React.ReactNode }[] = [
  { value: 'chromium', label: 'Chromium', icon: <Chrome className="h-4 w-4" /> },
  { value: 'firefox', label: 'Firefox', icon: <Globe className="h-4 w-4" /> },
  { value: 'webkit', label: 'WebKit', icon: <Monitor className="h-4 w-4" /> },
];

// ============================================================================
// Component
// ============================================================================

export function RunButton({
  disabled = false,
  isRunning = false,
  onRun,
  className = '',
}: RunButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const { browser, execution } = useSettingsStore();

  // Local state for the form - initialize from settings
  const [baseUrl, setBaseUrl] = useState(execution.defaultBaseUrl || '');
  const [browserType, setBrowserType] = useState<BrowserType>(browser.type);
  const [headless, setHeadless] = useState(browser.headless);
  const [viewportWidth, setViewportWidth] = useState(browser.viewportWidth);
  const [viewportHeight, setViewportHeight] = useState(browser.viewportHeight);
  const [timeout, setTimeout] = useState(execution.timeout);
  const [maxRetries, setMaxRetries] = useState(execution.maxRetries);
  const [recordVideo, setRecordVideo] = useState(execution.recordVideo);
  const [screenshotOnFailure, setScreenshotOnFailure] = useState(execution.screenshotOnFailure);
  const [traceEnabled, setTraceEnabled] = useState(execution.traceEnabled);

  // Sync local state when modal opens (to pick up any settings changes)
  const handleOpenModal = () => {
    setBaseUrl(execution.defaultBaseUrl || '');
    setBrowserType(browser.type);
    setHeadless(browser.headless);
    setViewportWidth(browser.viewportWidth);
    setViewportHeight(browser.viewportHeight);
    setTimeout(execution.timeout);
    setMaxRetries(execution.maxRetries);
    setRecordVideo(execution.recordVideo);
    setScreenshotOnFailure(execution.screenshotOnFailure);
    setTraceEnabled(execution.traceEnabled);
    setShowModal(true);
  };

  const handleQuickRun = () => {
    // Use default base URL from settings if local baseUrl is empty
    const effectiveBaseUrl = baseUrl || execution.defaultBaseUrl || '';
    
    onRun({
      baseUrl: effectiveBaseUrl,
      browser: {
        browser: browser.type,
        headless: browser.headless,
        viewportWidth: browser.viewportWidth,
        viewportHeight: browser.viewportHeight,
        defaultTimeout: execution.timeout,
        recordVideo: execution.recordVideo,
        screenshotOnFailure: execution.screenshotOnFailure,
        traceEnabled: execution.traceEnabled,
      },
      options: {
        timeout: execution.timeout,
        maxRetries: execution.maxRetries,
        recordVideo: execution.recordVideo,
        screenshotOnFailure: execution.screenshotOnFailure,
        traceEnabled: execution.traceEnabled,
      },
    });
  };

  const handleConfiguredRun = () => {
    onRun({
      baseUrl,
      browser: {
        browser: browserType,
        headless,
        viewportWidth,
        viewportHeight,
        defaultTimeout: timeout,
        recordVideo,
        screenshotOnFailure,
        traceEnabled,
      },
      options: {
        timeout,
        maxRetries,
        recordVideo,
        screenshotOnFailure,
        traceEnabled,
      },
    });
    setShowModal(false);
  };

  return (
    <>
      {/* Button Group */}
      <div className={`flex items-center gap-1 ${className}`}>
        {/* Main Run Button */}
        <button
          onClick={handleQuickRun}
          disabled={disabled || isRunning}
          className="inline-flex items-center gap-2 rounded-l-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Run
            </>
          )}
        </button>

        {/* Config Button */}
        <button
          onClick={handleOpenModal}
          disabled={isRunning}
          className="inline-flex items-center rounded-r-md border-l border-green-700 bg-green-600 px-2 py-2 text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          title="Configure and run"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </div>

      {/* Config Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-card shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold text-foreground">
                Run Configuration
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="max-h-[60vh] overflow-y-auto p-4">
              {/* Base URL */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Base URL
                </label>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={execution.defaultBaseUrl || 'https://example.com'}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Default: {execution.defaultBaseUrl || 'Not set'} (configure in Settings)
                </p>
              </div>

              {/* Browser Settings */}
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-medium text-foreground">
                  Browser Settings
                </h3>

                <div className="space-y-4">
                  {/* Browser Type */}
                  <div>
                    <label className="mb-2 block text-xs text-muted-foreground">
                      Browser
                    </label>
                    <div className="flex gap-2">
                      {BROWSER_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setBrowserType(opt.value)}
                          className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                            browserType === opt.value
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {opt.icon}
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Viewport */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">
                        Viewport Width
                      </label>
                      <input
                        type="number"
                        value={viewportWidth}
                        onChange={(e) => setViewportWidth(Number(e.target.value))}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">
                        Viewport Height
                      </label>
                      <input
                        type="number"
                        value={viewportHeight}
                        onChange={(e) => setViewportHeight(Number(e.target.value))}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Headless */}
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={headless}
                      onChange={(e) => setHeadless(e.target.checked)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-foreground">Run headless</span>
                    <span className="text-xs text-muted-foreground">
                      (no browser window)
                    </span>
                  </label>
                </div>
              </div>

              {/* Execution Options */}
              <div>
                <h3 className="mb-3 text-sm font-medium text-foreground">
                  Execution Options
                </h3>

                <div className="space-y-4">
                  {/* Timeout & Retries */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Timeout (ms)
                      </label>
                      <input
                        type="number"
                        value={timeout}
                        onChange={(e) => setTimeout(Number(e.target.value))}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <RefreshCw className="h-3 w-3" />
                        Max Retries
                      </label>
                      <input
                        type="number"
                        value={maxRetries}
                        onChange={(e) => setMaxRetries(Number(e.target.value))}
                        min={0}
                        max={5}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Recording Options */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={recordVideo}
                        onChange={(e) => setRecordVideo(e.target.checked)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <Video className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">Record video</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={screenshotOnFailure}
                        onChange={(e) => setScreenshotOnFailure(e.target.checked)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <Camera className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">
                        Screenshot on failure
                      </span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={traceEnabled}
                        onChange={(e) => setTraceEnabled(e.target.checked)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <Settings2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">Enable tracing</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 border-t p-4">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-md border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleConfiguredRun}
                disabled={disabled}
                className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                Run with Config
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default RunButton;
