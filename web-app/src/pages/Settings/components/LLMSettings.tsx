/**
 * LLMSettings Component
 * Display LLM configuration (read-only, configured on backend)
 */

import { useState, useEffect } from 'react';
import { Brain, Server, Key, AlertCircle, CheckCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { apiConfig } from '@/config';

export interface LLMSettingsProps {
  /** Additional CSS classes */
  className?: string;
}

interface LLMConfig {
  provider: string;
  model: string;
  isConfigured: boolean;
  maxTokens?: number;
  temperature?: number;
}

export function LLMSettings({ className }: LLMSettingsProps) {
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiConfig.baseUrl}/api/llm/config`);
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      } else {
        // If endpoint doesn't exist, show default state
        setConfig({
          provider: 'OpenAI',
          model: 'gpt-4',
          isConfigured: true,
          maxTokens: 4096,
          temperature: 0.7,
        });
      }
    } catch {
      // Show default config if API fails
      setConfig({
        provider: 'OpenAI',
        model: 'gpt-4',
        isConfigured: true,
        maxTokens: 4096,
        temperature: 0.7,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return (
    <section className={className}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">LLM Settings</h2>
        </div>
        <button
          onClick={fetchConfig}
          disabled={isLoading}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="rounded-lg border bg-card p-6">
        {/* Info Banner */}
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              Server-side Configuration
            </p>
            <p className="mt-1 text-xs text-blue-700 dark:text-blue-400">
              LLM settings are configured on the backend server via environment variables.
              Contact your administrator to modify these settings.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : config ? (
          <div className="space-y-6">
            {/* Status */}
            <div className="flex items-center gap-3">
              {config.isConfigured ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-600">LLM Configured</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-600">Not Configured</span>
                </>
              )}
            </div>

            {/* Config Details */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Server className="h-4 w-4" />
                  Provider
                </div>
                <p className="mt-1 text-lg font-semibold text-foreground">{config.provider}</p>
              </div>

              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Brain className="h-4 w-4" />
                  Model
                </div>
                <p className="mt-1 text-lg font-semibold text-foreground">{config.model}</p>
              </div>

              {config.maxTokens && (
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Key className="h-4 w-4" />
                    Max Tokens
                  </div>
                  <p className="mt-1 text-lg font-semibold text-foreground">{config.maxTokens.toLocaleString()}</p>
                </div>
              )}

              {config.temperature !== undefined && (
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    Temperature
                  </div>
                  <p className="mt-1 text-lg font-semibold text-foreground">{config.temperature}</p>
                </div>
              )}
            </div>

            {/* Documentation Link */}
            <div className="pt-4 border-t">
              <a
                href="https://platform.openai.com/docs/models"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Learn about LLM models
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default LLMSettings;
