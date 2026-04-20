/**
 * ValidationPanel Component
 * Displays syntax validation errors and warnings
 */

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileCode,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import type { ParseError, ValidationResult } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface ValidationPanelProps {
  /** Validation result from syntax check */
  validationResult: ValidationResult | null;
  /** Whether validation is in progress */
  isValidating?: boolean;
  /** Callback when clicking on an error to jump to line */
  onErrorClick?: (error: ParseError) => void;
  /** Additional CSS class */
  className?: string;
}

// ============================================================================
// Sub-components
// ============================================================================

interface ErrorItemProps {
  error: ParseError;
  index: number;
  onClick?: (error: ParseError) => void;
}

function ErrorItem({ error, onClick }: ErrorItemProps) {
  return (
    <button
      onClick={() => onClick?.(error)}
      className="flex w-full items-start gap-2 rounded-md p-2 text-left transition-colors hover:bg-muted/50"
    >
      <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-red-700 dark:text-red-400">
          {error.message}
        </p>
        {error.line && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Line {error.line}
            {error.column && `, Column ${error.column}`}
          </p>
        )}
      </div>
    </button>
  );
}

interface WarningItemProps {
  warning: string;
  index: number;
}

function WarningItem({ warning }: WarningItemProps) {
  return (
    <div className="flex items-start gap-2 rounded-md p-2">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
      <p className="text-sm text-amber-700 dark:text-amber-400">{warning}</p>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function ValidationPanel({
  validationResult,
  isValidating = false,
  onErrorClick,
  className = '',
}: ValidationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showWarnings, setShowWarnings] = useState(true);

  // Handle loading state
  if (isValidating) {
    return (
      <div className={`rounded-lg border bg-card p-4 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">
            Validating syntax...
          </span>
        </div>
      </div>
    );
  }

  // Handle no validation result
  if (!validationResult) {
    return (
      <div className={`rounded-lg border bg-card p-4 ${className}`}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <FileCode className="h-4 w-4" />
          <span className="text-sm">
            Write some Gherkin to see validation results
          </span>
        </div>
      </div>
    );
  }

  const { valid, errors, warnings, scenarioNames = [] } = validationResult;
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;

  return (
    <div className={`rounded-lg border bg-card ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/30"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}

          {/* Status Icon */}
          {valid ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}

          {/* Title */}
          <span className="font-medium text-foreground">
            {valid ? 'Valid Gherkin' : 'Validation Issues'}
          </span>
        </div>

        {/* Badge counts */}
        <div className="flex items-center gap-2">
          {hasErrors && (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {errors.length} {errors.length === 1 ? 'error' : 'errors'}
            </span>
          )}
          {hasWarnings && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {warnings.length} {warnings.length === 1 ? 'warning' : 'warnings'}
            </span>
          )}
          {valid && scenarioNames.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              {scenarioNames.length}{' '}
              {scenarioNames.length === 1 ? 'scenario' : 'scenarios'}
            </span>
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t px-4 pb-4">
          {/* Errors */}
          {hasErrors && (
            <div className="mt-4">
              <h4 className="mb-2 text-sm font-medium text-foreground">
                Errors
              </h4>
              <div className="space-y-1">
                {errors.map((error, index) => (
                  <ErrorItem
                    key={index}
                    error={error}
                    index={index}
                    onClick={onErrorClick}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {hasWarnings && (
            <div className="mt-4">
              <button
                onClick={() => setShowWarnings(!showWarnings)}
                className="mb-2 flex items-center gap-1 text-sm font-medium text-foreground"
              >
                {showWarnings ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                Warnings ({warnings.length})
              </button>
              {showWarnings && (
                <div className="space-y-1">
                  {warnings.map((warning, index) => (
                    <WarningItem key={index} warning={warning} index={index} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Success state with scenarios */}
          {valid && scenarioNames.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 text-sm font-medium text-foreground">
                Detected Scenarios
              </h4>
              <ul className="space-y-1">
                {scenarioNames.map((name, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 rounded-md p-2 text-sm"
                  >
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-foreground">{name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Empty valid state */}
          {valid && scenarioNames.length === 0 && !hasWarnings && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-500" />
              <p>Syntax is valid. Add scenarios to get started.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ValidationPanel;
