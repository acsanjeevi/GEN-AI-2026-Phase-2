/**
 * StepList Component
 * Displays step-by-step execution status with clickable step details
 */

import { cn } from '@/utils';
import { formatDuration } from '@/utils/formatters';
import { StatusBadge, type Status } from '@/components/common';
import type { ExecutionItemSummary, CurrentStepInfo, ExecutionItemStatus } from '@/types';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  CircleDot,
  X,
} from 'lucide-react';
import { useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface StepListProps {
  /** List of execution items (scenarios) */
  items: ExecutionItemSummary[];
  /** Current step being executed */
  currentStep?: CurrentStepInfo | null;
  /** Show expanded details by default */
  defaultExpanded?: boolean;
  /** Additional CSS classes */
  className?: string;
}

interface ScenarioItemProps {
  item: ExecutionItemSummary;
  isActive: boolean;
  currentStepIndex?: number;
  defaultExpanded?: boolean;
}

interface StepInfo {
  index: number;
  status: Status;
  isCurrent: boolean;
  text?: string;
  keyword?: string;
  duration?: number;
  error?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map ExecutionItemStatus to StatusBadge status
 */
function mapStatus(status: ExecutionItemStatus): Status {
  return status;
}

/**
 * Generate step indicators for a scenario
 */
function getStepIndicators(
  item: ExecutionItemSummary,
  currentStepIndex?: number
): StepInfo[] {
  const { stepCount, completedSteps, status, steps } = item;
  
  return Array.from({ length: stepCount }, (_, index) => {
    let stepStatus: Status = 'pending';
    const isCurrent = status === 'running' && index === currentStepIndex;

    if (index < completedSteps) {
      stepStatus = status === 'failed' && index === completedSteps - 1 ? 'failed' : 'passed';
    } else if (isCurrent) {
      stepStatus = 'running';
    }

    // Get step details if available
    const stepDetail = steps?.[index];

    return { 
      index,
      status: stepStatus, 
      isCurrent,
      text: stepDetail?.text,
      keyword: stepDetail?.keyword,
      duration: stepDetail?.duration,
      error: stepDetail?.error,
    };
  });
}

/**
 * Get status icon for a step
 */
function getStepStatusIcon(status: Status, className?: string) {
  switch (status) {
    case 'passed':
      return <CheckCircle className={cn('h-4 w-4 text-green-600', className)} />;
    case 'failed':
      return <XCircle className={cn('h-4 w-4 text-red-600', className)} />;
    case 'running':
      return <Loader2 className={cn('h-4 w-4 text-blue-600 animate-spin', className)} />;
    case 'skipped':
      return <CircleDot className={cn('h-4 w-4 text-yellow-600', className)} />;
    default:
      return <CircleDot className={cn('h-4 w-4 text-gray-400', className)} />;
  }
}

// ============================================================================
// ScenarioItem Component
// ============================================================================

function ScenarioItem({ item, isActive, currentStepIndex, defaultExpanded }: ScenarioItemProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || isActive);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  
  const stepIndicators = getStepIndicators(item, currentStepIndex);

  // Handle step click
  const handleStepClick = (index: number) => {
    setSelectedStepIndex(selectedStepIndex === index ? null : index);
  };

  const selectedStep = selectedStepIndex !== null ? stepIndicators[selectedStepIndex] : null;

  return (
    <div
      className={cn(
        'rounded-lg border bg-card transition-all',
        isActive && 'ring-2 ring-blue-500 ring-offset-2 ring-offset-background'
      )}
    >
      {/* Scenario Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50"
      >
        {/* Expand Icon */}
        <span className="text-muted-foreground">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>

        {/* Status Badge */}
        <StatusBadge status={mapStatus(item.status)} size="sm" />

        {/* Scenario Name */}
        <span className={cn(
          'flex-1 font-medium',
          isActive && 'text-blue-600 dark:text-blue-400'
        )}>
          {item.scenarioName}
        </span>

        {/* Step Progress */}
        <span className="text-sm text-muted-foreground">
          {item.completedSteps}/{item.stepCount} steps
        </span>

        {/* Duration */}
        {item.duration && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDuration(item.duration)}
          </span>
        )}

        {/* Retry indicator */}
        {item.retryCount > 0 && (
          <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-700 dark:bg-orange-900 dark:text-orange-300">
            Retry #{item.retryCount}
          </span>
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t px-4 py-3">
          {/* Step Indicators */}
          <div className="mb-3">
            <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
              Steps (click to view details)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {stepIndicators.map((step, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStepClick(index);
                  }}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-all cursor-pointer hover:scale-110',
                    step.status === 'passed' && 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800',
                    step.status === 'failed' && 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800',
                    step.status === 'running' && 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 animate-pulse',
                    step.status === 'pending' && 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
                    step.status === 'skipped' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800',
                    step.isCurrent && 'ring-2 ring-blue-500 ring-offset-1',
                    selectedStepIndex === index && 'ring-2 ring-primary ring-offset-1'
                  )}
                  title={`Step ${index + 1}: ${step.status}${step.text ? ` - ${step.text}` : ''}`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Step Details */}
          {selectedStep && (
            <div className="mb-3 rounded-md border bg-muted/50 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getStepStatusIcon(selectedStep.status)}
                    <span className="text-xs font-semibold uppercase text-muted-foreground">
                      Step {selectedStep.index + 1}
                    </span>
                    <StatusBadge status={selectedStep.status} size="sm" />
                    {selectedStep.duration && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDuration(selectedStep.duration)}
                      </span>
                    )}
                  </div>
                  {selectedStep.text ? (
                    <p className="text-sm text-foreground">
                      <span className="font-semibold text-primary">{selectedStep.keyword}</span>{' '}
                      {selectedStep.text}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Step details not available yet
                    </p>
                  )}
                  {selectedStep.error && (
                    <div className="mt-2 rounded bg-red-50 p-2 dark:bg-red-900/20">
                      <p className="text-xs text-red-700 dark:text-red-300">
                        {selectedStep.error}
                      </p>
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStepIndex(null);
                  }}
                  className="p-1 hover:bg-muted rounded"
                  title="Close"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                Tags
              </p>
              <div className="flex flex-wrap gap-1">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    @{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {item.errorMessage && (
            <div className="rounded-md bg-red-50 p-3 dark:bg-red-900/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    Error
                  </p>
                  <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                    {item.errorMessage}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function StepList({
  items,
  currentStep,
  defaultExpanded = false,
  className,
}: StepListProps) {
  if (items.length === 0) {
    return (
      <div className={cn('rounded-lg border bg-card p-8 text-center', className)}>
        <p className="text-muted-foreground">No scenarios to display</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {items.map((item) => (
        <ScenarioItem
          key={item.id}
          item={item}
          isActive={currentStep?.itemId === item.id}
          currentStepIndex={currentStep?.itemId === item.id ? currentStep.stepIndex : undefined}
          defaultExpanded={defaultExpanded}
        />
      ))}
    </div>
  );
}

export default StepList;
