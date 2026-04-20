/**
 * QuickRunForm Component
 * Quick execution form with minimal configuration
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils';
import { Play, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { useSettingsStore } from '@/stores';
import { useToast } from '@/components/common';
import type { BrowserType } from '@/types';

export interface QuickRunFormProps {
  /** Submit callback */
  onSubmit?: (config: QuickRunConfig) => Promise<string>;
  /** Callback when execution is started */
  onExecutionStarted?: () => void;
  /** Loading state */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export interface QuickRunConfig {
  /** Base URL for the test */
  baseUrl: string;
  /** Feature content (Gherkin) */
  featureContent: string;
  /** Browser type */
  browserType: BrowserType;
  /** Run in headless mode */
  headless: boolean;
}

const sampleFeature = `Feature: Quick Test
  Scenario: Basic Navigation
    Given I navigate to the homepage
    When I click on the login button
    Then I should see the login form`;

export function QuickRunForm({
  onSubmit,
  isLoading = false,
  className,
}: QuickRunFormProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const browserSettings = useSettingsStore((state) => state.browser);

  const [baseUrl, setBaseUrl] = useState('');
  const [featureContent, setFeatureContent] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [browserType, setBrowserType] = useState<BrowserType>(browserSettings.type);
  const [headless, setHeadless] = useState(browserSettings.headless);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!baseUrl.trim()) {
      toast.error('Base URL is required');
      return;
    }

    if (!featureContent.trim()) {
      toast.error('Feature content is required');
      return;
    }

    setSubmitting(true);

    try {
      if (onSubmit) {
        const executionId = await onSubmit({
          baseUrl: baseUrl.trim(),
          featureContent: featureContent.trim(),
          browserType,
          headless,
        });
        navigate(`/execution/${executionId}`);
      } else {
        // Default behavior: navigate to editor with content
        toast.info('Opening editor with your feature...');
        navigate('/editor', {
          state: { content: featureContent, baseUrl },
        });
      }
    } catch (error) {
      toast.error('Failed to start execution');
      console.error('Quick run error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoadSample = () => {
    setFeatureContent(sampleFeature);
    toast.success('Sample feature loaded');
  };

  const handleOpenFullEditor = () => {
    navigate('/editor', {
      state: { content: featureContent, baseUrl },
    });
  };

  return (
    <div className={cn('rounded-lg border bg-card p-6 shadow-sm', className)}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Quick Run</h2>
        <button
          onClick={handleOpenFullEditor}
          className="text-sm text-primary hover:underline"
        >
          Open Full Editor →
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Base URL */}
        <div>
          <label
            htmlFor="baseUrl"
            className="mb-1 block text-sm font-medium text-foreground"
          >
            Base URL <span className="text-red-500">*</span>
          </label>
          <input
            id="baseUrl"
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            required
          />
        </div>

        {/* Feature Content */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label
              htmlFor="featureContent"
              className="text-sm font-medium text-foreground"
            >
              Feature (Gherkin) <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={handleLoadSample}
              className="text-xs text-primary hover:underline"
            >
              Load sample
            </button>
          </div>
          <textarea
            id="featureContent"
            value={featureContent}
            onChange={(e) => setFeatureContent(e.target.value)}
            placeholder={`Feature: My Feature
  Scenario: My Scenario
    Given I am on the homepage
    When I click the button
    Then I should see the result`}
            rows={8}
            className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            required
          />
        </div>

        {/* Advanced Options Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
          Advanced Options
          {showAdvanced ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="space-y-4 rounded-md border bg-muted/30 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="browserType"
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  Browser
                </label>
                <select
                  id="browserType"
                  value={browserType}
                  onChange={(e) => setBrowserType(e.target.value as BrowserType)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="chromium">Chromium</option>
                  <option value="firefox">Firefox</option>
                  <option value="webkit">WebKit</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="headless"
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  Mode
                </label>
                <select
                  id="headless"
                  value={headless ? 'headless' : 'headed'}
                  onChange={(e) => setHeadless(e.target.value === 'headless')}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="headless">Headless</option>
                  <option value="headed">Headed (visible)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
        >
          {submitting || isLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Starting...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Run Test
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default QuickRunForm;
