/**
 * ScenarioResults Component
 * Display scenario execution results with step details
 */

import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  SkipForward,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/utils';
import type { ExecutionItemSummary, StepDetail, ExecutionItemStatus } from '@/types';

export interface ScenarioResultsProps {
  /** Array of scenario results */
  scenarios: ExecutionItemSummary[];
  /** Show step details by default */
  expandedByDefault?: boolean;
  /** On scenario click handler */
  onScenarioClick?: (scenario: ExecutionItemSummary) => void;
  /** Additional CSS classes */
  className?: string;
}

// Status icon mapping
const statusIcons: Record<ExecutionItemStatus, React.ComponentType<{ className?: string }>> = {
  passed: CheckCircle,
  failed: XCircle,
  pending: Clock,
  running: Clock,
  skipped: SkipForward,
};

const statusColors: Record<ExecutionItemStatus, string> = {
  passed: 'text-green-600 dark:text-green-400',
  failed: 'text-red-600 dark:text-red-400',
  pending: 'text-gray-400 dark:text-gray-500',
  running: 'text-blue-600 dark:text-blue-400',
  skipped: 'text-yellow-600 dark:text-yellow-400',
};

const statusBgColors: Record<ExecutionItemStatus, string> = {
  passed: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  failed: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  pending: 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700',
  running: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  skipped: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700',
};

// Format duration from milliseconds
function formatDuration(ms?: number): string {
  if (ms === undefined || ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}

// Step result row component
function StepRow({ step, index }: { step: StepDetail; index: number }) {
  const status = step.status || 'pending';
  const StatusIcon = statusIcons[status];

  return (
    <div
      className={cn(
        'flex items-start gap-3 border-l-2 py-2 pl-4 pr-2',
        status === 'passed' && 'border-l-green-500',
        status === 'failed' && 'border-l-red-500',
        status === 'pending' && 'border-l-gray-300',
        status === 'running' && 'border-l-blue-500',
        status === 'skipped' && 'border-l-yellow-500'
      )}
    >
      {/* Step Number */}
      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
        {index + 1}
      </span>

      {/* Step Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <span className="font-medium text-primary/80">{step.keyword}</span>
          <span className="text-sm text-foreground">{step.text}</span>
        </div>

        {/* Error Message */}
        {step.error && (
          <div className="mt-2 flex items-start gap-2 rounded bg-red-50 p-2 dark:bg-red-900/20">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
            <pre className="text-xs text-red-700 dark:text-red-300 whitespace-pre-wrap overflow-x-auto">
              {step.error}
            </pre>
          </div>
        )}
      </div>

      {/* Status & Duration */}
      <div className="flex flex-shrink-0 items-center gap-2">
        {step.duration !== undefined && (
          <span className="text-xs text-muted-foreground">
            {formatDuration(step.duration)}
          </span>
        )}
        <StatusIcon className={cn('h-4 w-4', statusColors[status])} />
      </div>
    </div>
  );
}

// Single scenario card component
function ScenarioCard({
  scenario,
  expandedByDefault,
  onScenarioClick,
}: {
  scenario: ExecutionItemSummary;
  expandedByDefault: boolean;
  onScenarioClick?: (scenario: ExecutionItemSummary) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(expandedByDefault);
  const StatusIcon = statusIcons[scenario.status];

  const passedSteps = scenario.steps?.filter(s => s.status === 'passed').length || 0;
  const totalSteps = scenario.steps?.length || scenario.stepCount;

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded && onScenarioClick) {
      onScenarioClick(scenario);
    }
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border transition-colors',
        statusBgColors[scenario.status]
      )}
    >
      {/* Header */}
      <button
        onClick={toggleExpand}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-black/5 dark:hover:bg-white/5"
      >
        {/* Expand Icon */}
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        )}

        {/* Status Icon */}
        <StatusIcon className={cn('h-5 w-5 flex-shrink-0', statusColors[scenario.status])} />

        {/* Scenario Name */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate">
            {scenario.scenarioName}
          </h3>
          {scenario.tags && scenario.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {scenario.tags.map((tag, i) => (
                <span
                  key={i}
                  className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            {passedSteps}/{totalSteps} steps
          </span>
          {scenario.duration !== undefined && (
            <span>{formatDuration(scenario.duration)}</span>
          )}
          {scenario.retryCount > 0 && (
            <span className="text-yellow-600 dark:text-yellow-400">
              {scenario.retryCount} retries
            </span>
          )}
        </div>
      </button>

      {/* Steps (expanded) */}
      {isExpanded && scenario.steps && scenario.steps.length > 0 && (
        <div className="border-t bg-background/50 px-4 py-2">
          <div className="space-y-1">
            {scenario.steps.map((step, index) => (
              <StepRow key={index} step={step} index={index} />
            ))}
          </div>
        </div>
      )}

      {/* Error Message (if no steps but has error) */}
      {isExpanded && scenario.errorMessage && (!scenario.steps || scenario.steps.length === 0) && (
        <div className="border-t bg-background/50 p-4">
          <div className="flex items-start gap-2 rounded bg-red-50 p-3 dark:bg-red-900/20">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
            <pre className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap overflow-x-auto">
              {scenario.errorMessage}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export function ScenarioResults({
  scenarios,
  expandedByDefault = false,
  onScenarioClick,
  className,
}: ScenarioResultsProps) {
  if (scenarios.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center rounded-lg border bg-muted/50 p-8', className)}>
        <p className="text-muted-foreground">No scenario results available</p>
      </div>
    );
  }

  // Summary counts
  const passed = scenarios.filter(s => s.status === 'passed').length;
  const failed = scenarios.filter(s => s.status === 'failed').length;
  const skipped = scenarios.filter(s => s.status === 'skipped').length;

  return (
    <div className={className}>
      {/* Summary Bar */}
      <div className="mb-4 flex items-center gap-4 text-sm">
        <span className="font-medium text-foreground">
          {scenarios.length} Scenario{scenarios.length !== 1 ? 's' : ''}
        </span>
        <span className="text-muted-foreground">|</span>
        {passed > 0 && (
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            {passed} passed
          </span>
        )}
        {failed > 0 && (
          <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
            <XCircle className="h-4 w-4" />
            {failed} failed
          </span>
        )}
        {skipped > 0 && (
          <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
            <SkipForward className="h-4 w-4" />
            {skipped} skipped
          </span>
        )}
      </div>

      {/* Scenario List */}
      <div className="space-y-3">
        {scenarios.map((scenario) => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            expandedByDefault={expandedByDefault}
            onScenarioClick={onScenarioClick}
          />
        ))}
      </div>
    </div>
  );
}

export default ScenarioResults;
