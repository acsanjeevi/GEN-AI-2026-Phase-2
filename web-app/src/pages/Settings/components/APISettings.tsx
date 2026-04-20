/**
 * APISettings Component
 * Configure API endpoint and connection settings
 */

import { useState } from 'react';
import { Server, CheckCircle, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { useSettingsStore } from '@/stores';
import { apiConfig } from '@/config';

export interface APISettingsProps {
  /** Additional CSS classes */
  className?: string;
}

type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error';

export function APISettings({ className }: APISettingsProps) {
  const apiBaseUrl = useSettingsStore((state) => state.apiBaseUrl);
  const setApiBaseUrl = useSettingsStore((state) => state.setApiBaseUrl);
  
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const testConnection = async () => {
    setConnectionStatus('testing');
    setStatusMessage('Testing connection...');

    try {
      const response = await fetch(`${apiBaseUrl}/api/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (response.ok) {
        setConnectionStatus('success');
        setStatusMessage('Connection successful!');
      } else {
        setConnectionStatus('error');
        setStatusMessage(`Server returned ${response.status}`);
      }
    } catch (err) {
      setConnectionStatus('error');
      setStatusMessage('Could not connect to server');
    }
  };

  const resetToDefault = () => {
    setApiBaseUrl(apiConfig.baseUrl);
    setConnectionStatus('idle');
    setStatusMessage('');
  };

  return (
    <section className={className}>
      <div className="flex items-center gap-2 mb-4">
        <Server className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">API Settings</h2>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <div className="space-y-6">
          {/* API Base URL */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              API Base URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={apiBaseUrl}
                onChange={(e) => {
                  setApiBaseUrl(e.target.value);
                  setConnectionStatus('idle');
                }}
                placeholder="http://localhost:3000"
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={testConnection}
                disabled={connectionStatus === 'testing'}
                className="inline-flex items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                {connectionStatus === 'testing' ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Test
              </button>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              The base URL for the backend API server. Default:{' '}
              <code className="rounded bg-muted px-1 py-0.5">{apiConfig.baseUrl}</code>
            </p>
          </div>

          {/* Connection Status */}
          {connectionStatus !== 'idle' && (
            <div
              className={`flex items-center gap-3 rounded-lg p-4 ${
                connectionStatus === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20'
                  : connectionStatus === 'error'
                  ? 'bg-red-50 dark:bg-red-900/20'
                  : 'bg-blue-50 dark:bg-blue-900/20'
              }`}
            >
              {connectionStatus === 'success' && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              {connectionStatus === 'error' && (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              {connectionStatus === 'testing' && (
                <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
              )}
              <span
                className={`text-sm font-medium ${
                  connectionStatus === 'success'
                    ? 'text-green-700 dark:text-green-400'
                    : connectionStatus === 'error'
                    ? 'text-red-700 dark:text-red-400'
                    : 'text-blue-700 dark:text-blue-400'
                }`}
              >
                {statusMessage}
              </span>
            </div>
          )}

          {/* Warning if changed from default */}
          {apiBaseUrl !== apiConfig.baseUrl && (
            <div className="flex items-start gap-3 rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                  Custom API URL
                </p>
                <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-400">
                  You're using a custom API URL. Make sure the server is running and accessible.
                </p>
                <button
                  onClick={resetToDefault}
                  className="mt-2 text-xs font-medium text-yellow-800 underline hover:no-underline dark:text-yellow-300"
                >
                  Reset to default
                </button>
              </div>
            </div>
          )}

          {/* Endpoints Info */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-foreground">API Endpoints</h3>
            <div className="space-y-2 rounded-lg bg-muted/50 p-4 font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  GET
                </span>
                <span className="text-muted-foreground">/api/health</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  POST
                </span>
                <span className="text-muted-foreground">/api/execution/run</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  GET
                </span>
                <span className="text-muted-foreground">/api/execution/:id</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  GET
                </span>
                <span className="text-muted-foreground">/api/execution/list</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default APISettings;
