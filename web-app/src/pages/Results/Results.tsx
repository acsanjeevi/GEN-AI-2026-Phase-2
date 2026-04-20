/**
 * Results Page
 * View test execution results and artifacts
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { PageContainer } from '@/components/layout';
import { LoadingSpinner, ErrorMessage } from '@/components/common';
import {
  ChevronLeft,
  Download,
  Video,
  Image,
  FileCode,
  ListChecks,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/utils';
import { executionService } from '@/services/execution.service';
import { apiConfig } from '@/config';
import type { ExecutionResponse, ExecutionItemSummary } from '@/types';
import { VideoPlayer, ScreenshotGallery, CodeViewer, ScenarioResults } from './components';
import type { Screenshot, AttemptGroup } from './components';

// Tab types
type TabType = 'overview' | 'video' | 'screenshots' | 'code' | 'scenarios';

// Artifact item with attempt info
interface ArtifactItem {
  name: string;
  path: string;
  url: string;
  attempt: number;
  timestamp: number;
}

// Script artifact
interface ScriptArtifact {
  name: string;
  path: string;
  url: string;
}

// Artifact files from API
interface ArtifactFiles {
  videos: ArtifactItem[];
  screenshots: ArtifactItem[];
  traces: ArtifactItem[];
  scripts: ScriptArtifact[];
  totalAttempts: number;
}

// Get full artifact URL (prepend API base URL if relative)
function getArtifactUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Remove leading slash if present for clean join
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${apiConfig.baseUrl}${cleanUrl}`;
}

// Get attempt label (e.g., "Attempt 1 (Failed)" or "Attempt 2 (Success)")
function getAttemptLabel(attempt: number, totalAttempts: number, isFinal: boolean): string {
  if (totalAttempts === 1) return '';
  const status = isFinal ? '✓ Success' : '✗ Failed';
  return `Attempt ${attempt} of ${totalAttempts} ${attempt === totalAttempts ? `(${status})` : '(✗ Failed)'}`;
}

// Format duration
function formatDuration(ms?: number): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}

// Get status color class
function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
    case 'passed':
      return 'text-green-600 dark:text-green-400';
    case 'failed':
      return 'text-red-600 dark:text-red-400';
    case 'running':
      return 'text-blue-600 dark:text-blue-400';
    case 'cancelled':
      return 'text-orange-600 dark:text-orange-400';
    default:
      return 'text-muted-foreground';
  }
}

export function Results() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [execution, setExecution] = useState<ExecutionResponse | null>(null);
  const [artifactFiles, setArtifactFiles] = useState<ArtifactFiles | null>(null);
  const [scriptContent, setScriptContent] = useState<string>('');
  const [scriptFileName, setScriptFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load execution data
  const loadData = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      const [execData, artifacts] = await Promise.all([
        executionService.getDetails(id),
        executionService.listArtifactFiles(id).catch(() => ({
          videos: [],
          screenshots: [],
          traces: [],
          scripts: [],
          totalAttempts: 1,
        })),
      ]);

      setExecution(execData);
      setArtifactFiles(artifacts as ArtifactFiles);
      
      // Fetch script content if available
      const typedArtifacts = artifacts as ArtifactFiles;
      if (typedArtifacts.scripts && typedArtifacts.scripts.length > 0) {
        const script = typedArtifacts.scripts[0];
        try {
          const content = await executionService.getScriptContent(id, script.path);
          setScriptContent(content);
          setScriptFileName(script.name);
        } catch (scriptErr) {
          console.warn('Failed to load script content:', scriptErr);
          // Fall back to generated code from execution items
          const fallbackCode = execData.items
            ?.filter((item: ExecutionItemSummary) => item.generatedCode)
            .map((item: ExecutionItemSummary) => item.generatedCode)
            .join('\n\n') || '';
          setScriptContent(fallbackCode);
          setScriptFileName(`${execData.scriptId || id}.spec.ts`);
        }
      } else {
        // Fall back to generated code from execution items
        const fallbackCode = execData.items
          ?.filter((item: ExecutionItemSummary) => item.generatedCode)
          .map((item: ExecutionItemSummary) => item.generatedCode)
          .join('\n\n') || '';
        setScriptContent(fallbackCode);
        setScriptFileName(`${execData.scriptId || id}.spec.ts`);
      }
    } catch (err) {
      console.error('Failed to load execution data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load execution data');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Download handler
  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download all artifacts
  const handleDownloadAll = async () => {
    if (!artifactFiles) return;

    // Download videos
    artifactFiles.videos.forEach((video) => {
      handleDownload(getArtifactUrl(video.url), video.name);
    });

    // Download screenshots
    artifactFiles.screenshots.forEach((screenshot) => {
      handleDownload(getArtifactUrl(screenshot.url), screenshot.name);
    });
  };

  // Convert artifact screenshots to gallery format
  const screenshots: Screenshot[] =
    artifactFiles?.screenshots.map((s) => ({
      url: getArtifactUrl(s.url),
      name: s.name,
      attempt: s.attempt,
    })) || [];

  // Build attempt groups for screenshots
  const screenshotAttemptGroups: AttemptGroup[] = (() => {
    if (!artifactFiles?.screenshots.length) return [];
    
    const totalAttempts = artifactFiles.totalAttempts || 1;
    const groupedByAttempt = artifactFiles.screenshots.reduce((acc, s) => {
      const attempt = s.attempt || 1;
      if (!acc[attempt]) acc[attempt] = [];
      acc[attempt].push({
        url: getArtifactUrl(s.url),
        name: s.name,
        attempt: s.attempt,
      });
      return acc;
    }, {} as Record<number, Screenshot[]>);

    return Object.keys(groupedByAttempt)
      .map(Number)
      .sort((a, b) => a - b)
      .map((attemptNum) => ({
        attemptNumber: attemptNum,
        totalAttempts,
        passed: attemptNum === totalAttempts && execution?.status === 'completed',
        screenshots: groupedByAttempt[attemptNum],
      }));
  })();

  // No execution ID - redirect to history page
  if (!id) {
    return <Navigate to="/history" replace />;
  }

  // Loading state
  if (isLoading) {
    return (
      <PageContainer title="Test Results" description="Loading...">
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size="lg" label="Loading results..." />
        </div>
      </PageContainer>
    );
  }

  // Error state
  if (error) {
    return (
      <PageContainer title="Test Results" description="Error">
        <Link
          to="/history"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to History
        </Link>
        <ErrorMessage
          title="Failed to Load Results"
          message={error}
          onRetry={loadData}
        />
      </PageContainer>
    );
  }

  // No execution found
  if (!execution) {
    return (
      <PageContainer title="Test Results" description="Not Found">
        <Link
          to="/history"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to History
        </Link>
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">Execution not found</p>
        </div>
      </PageContainer>
    );
  }

  // Calculate summary stats
  const summary = execution.summary;
  const passedScenarios = summary?.passed || execution.items.filter((i: ExecutionItemSummary) => i.status === 'passed').length;
  const totalScenarios = summary?.total || execution.items.length;
  const totalSteps = execution.items.reduce((acc: number, item: ExecutionItemSummary) => acc + item.stepCount, 0);
  const completedSteps = execution.items.reduce((acc: number, item: ExecutionItemSummary) => acc + item.completedSteps, 0);

  // Tab configuration
  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <ListChecks className="h-4 w-4" /> },
    {
      id: 'video',
      label: 'Video',
      icon: <Video className="h-4 w-4" />,
      count: artifactFiles?.videos.length || 0,
    },
    {
      id: 'screenshots',
      label: 'Screenshots',
      icon: <Image className="h-4 w-4" />,
      count: artifactFiles?.screenshots.length || 0,
    },
    { id: 'code', label: 'Generated Code', icon: <FileCode className="h-4 w-4" /> },
    {
      id: 'scenarios',
      label: 'Scenarios',
      icon: <ListChecks className="h-4 w-4" />,
      count: execution.items.length,
    },
  ];

  return (
    <PageContainer
      title={execution.name || 'Test Results'}
      description={execution.featureName}
    >
      {/* Back Link & Actions */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/history"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to History
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
          <div className="mt-1 flex items-center gap-2">
            {execution.status === 'completed' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : execution.status === 'failed' ? (
              <XCircle className="h-5 w-5 text-red-600" />
            ) : (
              <Clock className="h-5 w-5 text-muted-foreground" />
            )}
            <span className={cn('text-lg font-semibold capitalize', getStatusColor(execution.status))}>
              {execution.status}
            </span>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Duration</h3>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {formatDuration(summary?.duration)}
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Scenarios</h3>
          <p className="mt-1 text-lg font-semibold text-foreground">
            <span className={passedScenarios === totalScenarios ? 'text-green-600' : 'text-yellow-600'}>
              {passedScenarios}
            </span>
            /{totalScenarios}
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Steps</h3>
          <p className="mt-1 text-lg font-semibold text-foreground">
            <span className={completedSteps === totalSteps ? 'text-green-600' : 'text-yellow-600'}>
              {completedSteps}
            </span>
            /{totalSteps}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 border-b">
        <nav className="-mb-px flex gap-4" aria-label="Result tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'inline-flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Access Artifacts */}
            <section>
              <h2 className="mb-4 text-lg font-semibold text-foreground">Artifacts</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <button
                  onClick={() => setActiveTab('video')}
                  disabled={!artifactFiles?.videos.length}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border bg-card p-4 text-left transition-colors',
                    artifactFiles?.videos.length
                      ? 'hover:bg-muted'
                      : 'cursor-not-allowed opacity-50'
                  )}
                >
                  <Video className="h-8 w-8 text-blue-500" />
                  <div>
                    <h3 className="font-medium text-foreground">Video Recording</h3>
                    <p className="text-sm text-muted-foreground">
                      {artifactFiles?.videos.length || 0} video(s)
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('screenshots')}
                  disabled={!artifactFiles?.screenshots.length}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border bg-card p-4 text-left transition-colors',
                    artifactFiles?.screenshots.length
                      ? 'hover:bg-muted'
                      : 'cursor-not-allowed opacity-50'
                  )}
                >
                  <Image className="h-8 w-8 text-purple-500" />
                  <div>
                    <h3 className="font-medium text-foreground">Screenshots</h3>
                    <p className="text-sm text-muted-foreground">
                      {artifactFiles?.screenshots.length || 0} screenshot(s)
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('code')}
                  disabled={!scriptContent}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border bg-card p-4 text-left transition-colors',
                    scriptContent ? 'hover:bg-muted' : 'cursor-not-allowed opacity-50'
                  )}
                >
                  <FileCode className="h-8 w-8 text-green-500" />
                  <div>
                    <h3 className="font-medium text-foreground">Generated Spec</h3>
                    <p className="text-sm text-muted-foreground">
                      {scriptContent ? scriptFileName || 'View code' : 'No code generated'}
                    </p>
                  </div>
                </button>
              </div>
            </section>

            {/* Scenario Summary */}
            <section>
              <h2 className="mb-4 text-lg font-semibold text-foreground">Scenario Summary</h2>
              <ScenarioResults scenarios={execution.items} />
            </section>
          </div>
        )}

        {/* Video Tab */}
        {activeTab === 'video' && (
          <div className="space-y-6">
            {artifactFiles?.videos.length ? (
              (() => {
                // Group videos by attempt
                const totalAttempts = artifactFiles.totalAttempts || 1;
                const groupedByAttempt = artifactFiles.videos.reduce((acc, video) => {
                  const attempt = video.attempt || 1;
                  if (!acc[attempt]) acc[attempt] = [];
                  acc[attempt].push(video);
                  return acc;
                }, {} as Record<number, typeof artifactFiles.videos>);

                const attemptNumbers = Object.keys(groupedByAttempt).map(Number).sort((a, b) => a - b);

                return attemptNumbers.map((attemptNum) => {
                  const videos = groupedByAttempt[attemptNum];
                  const isLastAttempt = attemptNum === totalAttempts;
                  const attemptPassed = isLastAttempt && execution.status === 'completed';
                  const label = getAttemptLabel(attemptNum, totalAttempts, attemptPassed);

                  return (
                    <div key={attemptNum} className="space-y-4">
                      {/* Attempt Header */}
                      <div className={`flex items-center gap-2 rounded-lg border p-3 ${
                        attemptPassed
                          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
                          : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
                      }`}>
                        {attemptPassed ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <span className={`font-medium ${
                          attemptPassed ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                        }`}>
                          {label}
                        </span>
                      </div>

                      {/* Videos for this attempt */}
                      {videos.map((video, index) => (
                        <div key={`${attemptNum}-${index}`} className="space-y-2">
                          <h3 className="text-sm font-medium text-foreground">{video.name}</h3>
                          <VideoPlayer
                            src={getArtifactUrl(video.url)}
                            title={video.name}
                            className="aspect-video max-h-[600px]"
                            onDownload={() => handleDownload(getArtifactUrl(video.url), video.name)}
                          />
                        </div>
                      ))}
                    </div>
                  );
                });
              })()
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/50 p-8">
                <Video className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-muted-foreground">No video recordings available</p>
              </div>
            )}
          </div>
        )}

        {/* Screenshots Tab */}
        {activeTab === 'screenshots' && (
          <ScreenshotGallery
            screenshots={screenshots}
            attemptGroups={screenshotAttemptGroups.length > 0 ? screenshotAttemptGroups : undefined}
            columns={3}
            onDownload={(s) => handleDownload(s.url, s.name)}
          />
        )}

        {/* Code Tab */}
        {activeTab === 'code' && (
          <CodeViewer
            code={scriptContent}
            fileName={scriptFileName || `${execution.scriptId || id}.spec.ts`}
            onDownload={() => {
              const blob = new Blob([scriptContent], { type: 'text/typescript' });
              const url = URL.createObjectURL(blob);
              handleDownload(url, scriptFileName || `${execution.scriptId || id}.spec.ts`);
              URL.revokeObjectURL(url);
            }}
          />
        )}

        {/* Scenarios Tab */}
        {activeTab === 'scenarios' && (
          <ScenarioResults
            scenarios={execution.items}
            expandedByDefault={execution.items.length === 1}
          />
        )}
      </div>

      {/* Download Actions */}
      <section className="mt-8 flex justify-end gap-2 border-t pt-6">
        <button
          onClick={handleDownloadAll}
          disabled={!artifactFiles?.videos.length && !artifactFiles?.screenshots.length}
          className={cn(
            'inline-flex items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm font-medium text-foreground',
            artifactFiles?.videos.length || artifactFiles?.screenshots.length
              ? 'hover:bg-muted'
              : 'cursor-not-allowed opacity-50'
          )}
        >
          <Download className="h-4 w-4" />
          Download All Artifacts
        </button>
      </section>
    </PageContainer>
  );
}

export default Results;
