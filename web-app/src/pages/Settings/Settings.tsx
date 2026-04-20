/**
 * Settings Page
 * Configure application preferences
 */

import { useState } from 'react';
import { PageContainer } from '@/components/layout';
import { useSettingsStore } from '@/stores';
import { RotateCcw, CheckCircle } from 'lucide-react';
import {
  BrowserSettings,
  ExecutionSettings,
  LLMSettings,
  AppearanceSettings,
  APISettings,
} from './components';

type SettingsTab = 'browser' | 'execution' | 'llm' | 'appearance' | 'api';

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'browser', label: 'Browser' },
  { id: 'execution', label: 'Execution' },
  { id: 'llm', label: 'LLM' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'api', label: 'API' },
];

export function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('browser');
  const [showSaved, setShowSaved] = useState(false);
  const isModified = useSettingsStore((state) => state.isModified);
  const resetToDefaults = useSettingsStore((state) => state.resetToDefaults);

  const handleResetAll = () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults?')) {
      resetToDefaults();
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    }
  };

  return (
    <PageContainer
      title="Settings"
      description="Configure your preferences and defaults"
    >
      {/* Header Actions */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isModified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
              Unsaved changes
            </span>
          )}
          {showSaved && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle className="h-3 w-3" />
              Settings saved
            </span>
          )}
        </div>

        <button
          onClick={handleResetAll}
          className="inline-flex items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          <RotateCcw className="h-4 w-4" />
          Reset All to Defaults
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Settings tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-8">
        {activeTab === 'browser' && <BrowserSettings />}
        {activeTab === 'execution' && <ExecutionSettings />}
        {activeTab === 'llm' && <LLMSettings />}
        {activeTab === 'appearance' && <AppearanceSettings />}
        {activeTab === 'api' && <APISettings />}
      </div>

      {/* Footer Info */}
      <div className="mt-8 rounded-lg bg-muted/50 p-4">
        <p className="text-xs text-muted-foreground">
          Settings are automatically saved to your browser's local storage and will persist across sessions.
          Some settings (like LLM configuration) are managed on the server side.
        </p>
      </div>
    </PageContainer>
  );
}

export default Settings;
