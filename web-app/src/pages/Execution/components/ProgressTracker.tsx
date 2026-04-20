/**
 * ProgressTracker Component
 * Shows overall execution progress with status and timing
 */

import { cn } from '@/utils';
import { formatDuration } from '@/utils/formatters';
import { StatusBadge } from '@/components/common';
import type { TestPlanStatus, ExecutionSummary } from '@/types';
import {
  Clock,
  Timer,
  CheckCircle,
  XCircle,
  SkipForward,
  Zap,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface ProgressTrackerProps {
  /** Current status */
  status: TestPlanStatus;
  /** Progress percentage (0-100) */
  progress: number;
  /** Elapsed time in milliseconds */
  elapsedTime?: number;
  /** Estimated remaining time in milliseconds */
  estimatedRemaining?: number | null;
  /** Execution summary (when completed) */
  summary?: ExecutionSummary;
  /** Feature/test name */
  name?: string;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Status Color Mapping
// ============================================================================

const statusColors: Record<TestPlanStatus, string> = {
  draft: 'bg-gray-500',
  ready: 'bg-blue-500',
  running: 'bg-blue-500',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
  cancelled: 'bg-orange-500',
};

// ============================================================================
// Component
// ============================================================================

export function ProgressTracker({
  status,
  progress,
  elapsedTime = 0,
  estimatedRemaining,
  summary,
  name,
  className,
}: ProgressTrackerProps) {
  const isRunning = status === 'running';
  const isComplete = ['completed', 'failed', 'cancelled'].includes(status);

  // Map TestPlanStatus to StatusBadge status
  const badgeStatus = status === 'completed' 
    ? 'passed' 
    : status === 'ready' || status === 'draft' 
      ? 'pending' 
      : status;

  return (
    <div className={cn('rounded-lg border bg-card p-6', className)}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {name || 'Test Execution'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isRunning && 'Running tests...'}
            {status === 'completed' && 'Execution completed'}
            {status === 'failed' && 'Execution failed'}
            {status === 'cancelled' && 'Execution cancelled'}
            {(status === 'draft' || status === 'ready') && 'Waiting to start'}
          </p>
        </div>
        <StatusBadge status={badgeStatus} size="lg" />
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium text-foreground">{Math.round(progress)}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full transition-all duration-500 ease-out',
              statusColors[status],
              isRunning && 'animate-pulse'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Time Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Elapsed Time */}
        <div className="flex items-center gap-2 rounded-md bg-muted/50 p-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Elapsed</p>
            <p className="font-medium text-foreground">
              {formatDuration(elapsedTime)}
            </p>
          </div>
        </div>

        {/* Estimated Remaining */}
        {isRunning && estimatedRemaining && (
          <div className="flex items-center gap-2 rounded-md bg-muted/50 p-3">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p className="font-medium text-foreground">
                ~{formatDuration(estimatedRemaining)}
              </p>
            </div>
          </div>
        )}

        {/* Summary Stats (when complete) */}
        {isComplete && summary && (
          <>
            <div className="flex items-center gap-2 rounded-md bg-green-100 p-3 dark:bg-green-900/30">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-xs text-green-700 dark:text-green-300">Passed</p>
                <p className="font-medium text-green-800 dark:text-green-200">
                  {summary.passed}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-md bg-red-100 p-3 dark:bg-red-900/30">
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-xs text-red-700 dark:text-red-300">Failed</p>
                <p className="font-medium text-red-800 dark:text-red-200">
                  {summary.failed}
                </p>
              </div>
            </div>

            {summary.skipped > 0 && (
              <div className="flex items-center gap-2 rounded-md bg-yellow-100 p-3 dark:bg-yellow-900/30">
                <SkipForward className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">Skipped</p>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    {summary.skipped}
                  </p>
                </div>
              </div>
            )}

            {/* Pass Rate */}
            <div className="flex items-center gap-2 rounded-md bg-muted/50 p-3">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Pass Rate</p>
                <p className={cn(
                  'font-medium',
                  summary.passRate >= 80 ? 'text-green-600 dark:text-green-400' :
                  summary.passRate >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-red-600 dark:text-red-400'
                )}>
                  {summary.passRate}%
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ProgressTracker;
