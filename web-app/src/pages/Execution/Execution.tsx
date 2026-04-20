/**
 * Execution Page
 * Real-time test execution monitoring with progress tracking
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PageContainer } from '@/components/layout';
import { ConfirmDialog, EmptyState, LoadingSpinner } from '@/components/common';
import { useExecutionStore, useNotificationStore } from '@/stores';
import { useExecutionPolling, useElapsedTime, useEstimatedTime } from '@/hooks';
import { executionService } from '@/services';
import { apiConfig } from '@/config';
import {
  ProgressTracker,
  StepList,
  ActionLog,
  LivePreview,
  type LogEntry,
} from './components';
import type { ArtifactInfo } from '@/types';
import {
  ArrowLeft,
  StopCircle,
  FileText,
  Video,
  Image,
} from 'lucide-react';

// ============================================================================
// Component
// ============================================================================

export function Execution() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const logIdCounter = useRef(0);

  // Stores
  const currentExecution = useExecutionStore((state) => state.currentExecution);
  const setExecution = useExecutionStore((state) => state.setExecution);
  const { success: notifySuccess, error: notifyError } = useNotificationStore();

  // Local state
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [artifacts, setArtifacts] = useState<ArtifactInfo[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [latestScreenshot, setLatestScreenshot] = useState<string | null>(null);

  // Determine which execution ID to use
  const executionId = id || currentExecution?.id;

  // Get execution data (either from store or fetched)
  const execution = currentExecution?.id === executionId ? currentExecution : null;

  // Check if running
  const isRunning = execution?.status === 'running';
  const isComplete = execution?.status && ['completed', 'failed', 'cancelled'].includes(execution.status);

  // Helper to add log entry
  const addLogEntry = useCallback((type: LogEntry['type'], message: string, details?: string) => {
    const entry: LogEntry = {
      id: `log-${++logIdCounter.current}`,
      timestamp: new Date(),
      type,
      message,
      details,
    };
    setLogEntries(prev => [...prev, entry]);
  }, []);

  // Polling hook
  const { status } = useExecutionPolling(
    executionId,
    {
      enabled: Boolean(executionId) && isRunning,
      onStatusChange: (newStatus) => {
        // Add log entry for current step
        if (newStatus.currentStep) {
          addLogEntry('step', `Step ${newStatus.currentStep.stepIndex + 1}: ${newStatus.currentStep.stepText}`);
        }
        
        // Update progress log
        if (newStatus.progress > 0 && newStatus.progress < 100) {
          // Only log at certain intervals to avoid spam
          if (newStatus.progress % 25 === 0) {
            addLogEntry('info', `Progress: ${newStatus.progress}%`);
          }
        }
      },
      onComplete: (finalStatus) => {
        if (finalStatus.status === 'completed') {
          addLogEntry('success', 'Execution completed successfully');
          notifySuccess('Execution Complete', 'All tests have finished running');
        } else if (finalStatus.status === 'failed') {
          addLogEntry('error', 'Execution failed', finalStatus.error?.message);
          notifyError('Execution Failed', finalStatus.error?.message || 'Some tests failed');
        } else if (finalStatus.status === 'cancelled') {
          addLogEntry('warning', 'Execution was cancelled');
        }
        
        // Fetch artifacts when complete
        if (executionId) {
          fetchArtifacts(executionId);
        }
      },
    }
  );

  // Fetch artifacts - use direct file listing from disk
  const fetchArtifacts = useCallback(async (execId: string) => {
    try {
      // Use the new file listing endpoint that scans disk directly
      const files = await executionService.listArtifactFiles(execId);
      
      // Get API base URL for constructing full URLs
      const baseUrl = apiConfig.baseUrl;
      
      // Set video URL if found
      if (files.videos.length > 0) {
        // Get the latest video (last one in the array)
        const latestVideo = files.videos[files.videos.length - 1];
        setVideoUrl(`${baseUrl}${latestVideo.url}`);
        addLogEntry('info', `Video recording available: ${latestVideo.name}`);
        
        // Create artifact info entries for display
        const videoArtifacts: ArtifactInfo[] = files.videos.map((v, idx) => ({
          id: `video-${idx}`,
          type: 'video' as const,
          fileName: v.name,
          size: 0,
          mimeType: 'video/webm',
          path: v.path,
          capturedAt: new Date().toISOString(),
        }));
        setArtifacts(prev => [...prev.filter(a => a.type !== 'video'), ...videoArtifacts]);
      }
      
      // Set screenshot URL if found
      if (files.screenshots.length > 0) {
        const latestScreenshotFile = files.screenshots[files.screenshots.length - 1];
        setLatestScreenshot(`${baseUrl}${latestScreenshotFile.url}`);
        addLogEntry('info', `${files.screenshots.length} screenshot(s) captured`);
        
        // Create artifact info entries for display
        const screenshotArtifacts: ArtifactInfo[] = files.screenshots.map((s, idx) => ({
          id: `screenshot-${idx}`,
          type: 'screenshot' as const,
          fileName: s.name,
          size: 0,
          mimeType: 'image/png',
          path: s.path,
          capturedAt: new Date().toISOString(),
        }));
        setArtifacts(prev => [...prev.filter(a => a.type !== 'screenshot'), ...screenshotArtifacts]);
      }
      
      // Add trace info
      if (files.traces.length > 0) {
        addLogEntry('info', `${files.traces.length} trace file(s) available`);
        
        const traceArtifacts: ArtifactInfo[] = files.traces.map((t, idx) => ({
          id: `trace-${idx}`,
          type: 'trace' as const,
          fileName: t.name,
          size: 0,
          mimeType: 'application/zip',
          path: t.path,
          capturedAt: new Date().toISOString(),
        }));
        setArtifacts(prev => [...prev.filter(a => a.type !== 'trace'), ...traceArtifacts]);
      }
      
    } catch (err) {
      console.error('Failed to fetch artifacts:', err);
      addLogEntry('warning', 'Could not load artifacts');
    }
  }, [addLogEntry]);

  // Elapsed time tracking
  const elapsedTime = useElapsedTime(execution?.startedAt, isRunning);
  const estimatedRemaining = useEstimatedTime(elapsedTime, execution?.progress || 0);

  // Fetch execution details if we have an ID but no data
  useEffect(() => {
    async function loadExecution() {
      if (!executionId) return;
      
      // If we already have the execution and it's the same ID, just refresh
      if (execution && execution.id === executionId) {
        // If complete, fetch artifacts
        if (['completed', 'failed', 'cancelled'].includes(execution.status)) {
          fetchArtifacts(executionId);
        }
        return;
      }

      setIsLoading(true);
      setLoadError(null);
      setLogEntries([]);

      try {
        const data = await executionService.getDetails(executionId);
        setExecution(data);
        
        // Add initial log entries based on execution state
        addLogEntry('info', `Loading execution: ${data.name || data.featureName}`);
        addLogEntry('info', `Status: ${data.status}`);
        
        if (data.startedAt) {
          addLogEntry('info', `Started at: ${new Date(data.startedAt).toLocaleTimeString()}`);
        }
        
        // Add entries for completed items
        data.items.forEach(item => {
          if (item.status === 'passed') {
            addLogEntry('success', `Scenario passed: ${item.scenarioName}`, 
              item.duration ? `Duration: ${(item.duration / 1000).toFixed(1)}s` : undefined);
          } else if (item.status === 'failed') {
            addLogEntry('error', `Scenario failed: ${item.scenarioName}`, item.errorMessage);
          } else if (item.status === 'running') {
            addLogEntry('step', `Running: ${item.scenarioName}`);
          }
        });
        
        // Fetch artifacts if execution is complete
        if (['completed', 'failed', 'cancelled'].includes(data.status)) {
          await fetchArtifacts(executionId);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load execution';
        setLoadError(message);
        notifyError('Load Failed', message);
      } finally {
        setIsLoading(false);
      }
    }

    loadExecution();
  }, [executionId, execution?.id, setExecution, notifyError, addLogEntry, fetchArtifacts]);

  // Handle cancel execution
  const handleCancel = useCallback(async () => {
    if (!executionId) return;

    setIsCancelling(true);
    addLogEntry('warning', 'Cancelling execution...');
    
    try {
      await executionService.cancel(executionId);
      notifySuccess('Execution Cancelled', 'The test execution has been stopped');
      setIsCancelDialogOpen(false);
      addLogEntry('warning', 'Execution cancelled by user');
      
      // Refresh status
      const updated = await executionService.getDetails(executionId);
      setExecution(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel execution';
      notifyError('Cancel Failed', message);
      addLogEntry('error', 'Failed to cancel execution', message);
    } finally {
      setIsCancelling(false);
    }
  }, [executionId, notifySuccess, notifyError, setExecution, addLogEntry]);

  // Handle download logs
  const handleDownloadLogs = useCallback(() => {
    const logText = logEntries
      .map((entry) => `[${entry.timestamp.toISOString()}] [${entry.type.toUpperCase()}] ${entry.message}${entry.details ? `\n  ${entry.details}` : ''}`)
      .join('\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `execution-${executionId}-logs.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [logEntries, executionId]);

  // Handle clear logs
  const handleClearLogs = useCallback(() => {
    setLogEntries([]);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <PageContainer title="Execution Monitor">
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" label="Loading execution..." />
        </div>
      </PageContainer>
    );
  }

  // Error state
  if (loadError) {
    return (
      <PageContainer title="Execution Monitor">
        <EmptyState
          icon="error"
          title="Failed to Load Execution"
          description={loadError}
          action={{
            label: 'Go to History',
            onClick: () => navigate('/history'),
          }}
        />
      </PageContainer>
    );
  }

  // No execution state
  if (!executionId || !execution) {
    return (
      <PageContainer
        title="Execution Monitor"
        description="Start a test execution to monitor progress in real-time"
      >
        <EmptyState
          icon="play"
          title="No Active Execution"
          description="Go to the Editor to create and run a test, or view a past execution from History."
          action={{
            label: 'Go to Editor',
            onClick: () => navigate('/editor'),
          }}
          secondaryAction={{
            label: 'View History',
            onClick: () => navigate('/history'),
          }}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Execution Monitor"
      description={`Tracking: ${execution.name || execution.featureName}`}
    >
      {/* Header Actions */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Back button and title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {execution.name || execution.featureName}
            </h2>
            <p className="text-sm text-muted-foreground">
              ID: {execution.id}
            </p>
          </div>
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-2">
          {/* Cancel button (when running) */}
          {isRunning && (
            <button
              onClick={() => setIsCancelDialogOpen(true)}
              className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              <StopCircle className="h-4 w-4" />
              Cancel Execution
            </button>
          )}

          {/* View Results button (when complete) */}
          {isComplete && (
            <Link
              to={`/results/${execution.id}`}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <FileText className="h-4 w-4" />
              View Results
            </Link>
          )}
        </div>
      </div>

      {/* Progress Tracker */}
      <ProgressTracker
        status={execution.status}
        progress={status?.progress ?? execution.progress}
        elapsedTime={elapsedTime}
        estimatedRemaining={estimatedRemaining}
        summary={status?.summary || execution.summary}
        name={execution.name || execution.featureName}
        className="mb-6"
      />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Step List (2 cols) */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Scenarios</h3>
            <span className="text-sm text-muted-foreground">
              {execution.items.filter((i) => i.status === 'passed').length} / {execution.items.length} passed
            </span>
          </div>
          <StepList
            items={execution.items}
            currentStep={status?.currentStep || execution.currentStep}
            defaultExpanded={execution.items.length <= 3}
          />
        </div>

        {/* Right: Sidebar (1 col) */}
        <div className="space-y-6">
          {/* Video Player (when available) */}
          {videoUrl && (
            <div className="rounded-lg border bg-card">
              <div className="flex items-center gap-2 border-b px-4 py-2">
                <Video className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Video Recording</span>
              </div>
              <div className="p-2">
                <video
                  src={videoUrl}
                  controls
                  className="w-full rounded"
                  poster={latestScreenshot || undefined}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          )}

          {/* Live Preview / Screenshot */}
          <LivePreview
            screenshotUrl={latestScreenshot || status?.error?.screenshot}
            isRunning={isRunning}
            alt={`Screenshot for ${execution.name}`}
          />

          {/* Artifacts Summary */}
          {artifacts.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <h4 className="mb-3 flex items-center gap-2 font-medium text-foreground">
                <Image className="h-4 w-4" />
                Artifacts ({artifacts.length})
              </h4>
              <div className="space-y-2 text-sm">
                {artifacts.filter(a => a.type === 'video').length > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Videos</span>
                    <span className="font-medium text-foreground">
                      {artifacts.filter(a => a.type === 'video').length}
                    </span>
                  </div>
                )}
                {artifacts.filter(a => a.type === 'screenshot').length > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Screenshots</span>
                    <span className="font-medium text-foreground">
                      {artifacts.filter(a => a.type === 'screenshot').length}
                    </span>
                  </div>
                )}
                {artifacts.filter(a => a.type === 'trace').length > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Traces</span>
                    <span className="font-medium text-foreground">
                      {artifacts.filter(a => a.type === 'trace').length}
                    </span>
                  </div>
                )}
                <Link
                  to={`/results/${execution.id}`}
                  className="mt-2 block text-center text-primary hover:underline"
                >
                  View all artifacts →
                </Link>
              </div>
            </div>
          )}

          {/* Quick Info */}
          <div className="rounded-lg border bg-card p-4">
            <h4 className="mb-3 font-medium text-foreground">Execution Details</h4>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Browser</dt>
                <dd className="font-medium text-foreground capitalize">
                  {execution.browserConfig.browser}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Mode</dt>
                <dd className="font-medium text-foreground capitalize">
                  {execution.browserConfig.headless ? 'Headless' : 'Headed'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Viewport</dt>
                <dd className="font-medium text-foreground">
                  {execution.browserConfig.viewportWidth}×{execution.browserConfig.viewportHeight}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Video</dt>
                <dd className="font-medium text-foreground">
                  {execution.browserConfig.recordVideo ? 'Enabled' : 'Disabled'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Trace</dt>
                <dd className="font-medium text-foreground">
                  {execution.browserConfig.traceEnabled ? 'Enabled' : 'Disabled'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Action Log */}
      <div className="mt-6">
        <ActionLog
          entries={logEntries}
          isRunning={isRunning}
          maxHeight="250px"
          onDownload={handleDownloadLogs}
          onClear={!isRunning ? handleClearLogs : undefined}
        />
      </div>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isCancelDialogOpen}
        onClose={() => setIsCancelDialogOpen(false)}
        onConfirm={handleCancel}
        title="Cancel Execution?"
        message="Are you sure you want to cancel this execution? Any progress will be lost and incomplete tests will be marked as cancelled."
        confirmLabel="Cancel Execution"
        cancelLabel="Keep Running"
        variant="warning"
        isLoading={isCancelling}
      />
    </PageContainer>
  );
}

export default Execution;

