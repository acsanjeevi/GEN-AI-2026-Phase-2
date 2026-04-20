/**
 * ExecutionCard Component
 * Card displaying recent execution with actions
 */

import { Link } from 'react-router-dom';
import { cn } from '@/utils';
import { formatDuration, formatRelativeTime } from '@/utils/formatters';
import { StatusBadge, type Status } from '@/components/common';
import {
  Eye,
  RotateCcw,
  Trash2,
  MoreVertical,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export interface ExecutionCardData {
  /** Execution ID */
  id: string;
  /** Feature name or execution name */
  name: string;
  /** Execution status */
  status: Status;
  /** Start timestamp */
  startedAt: string;
  /** End timestamp (if completed) */
  completedAt?: string;
  /** Duration in milliseconds */
  duration?: number;
  /** Number of scenarios */
  scenarioCount: number;
  /** Number of passed scenarios */
  passedCount: number;
  /** Number of failed scenarios */
  failedCount: number;
}

export interface ExecutionCardProps {
  /** Execution data */
  execution: ExecutionCardData;
  /** View results callback */
  onView?: (id: string) => void;
  /** Re-run callback */
  onRerun?: (id: string) => void;
  /** Delete callback */
  onDelete?: (id: string) => void;
  /** Compact display mode */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function ExecutionCard({
  execution,
  onView,
  onRerun,
  onDelete,
  compact = false,
  className,
}: ExecutionCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const passRate =
    execution.scenarioCount > 0
      ? Math.round((execution.passedCount / execution.scenarioCount) * 100)
      : 0;

  // Get status-based styling
  const getStatusStyles = () => {
    switch (execution.status) {
      case 'passed':
        return 'border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-950/20';
      case 'failed':
        return 'border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-950/20';
      case 'running':
        return 'border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20';
      case 'pending':
        return 'border-l-4 border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20';
      default:
        return 'border-l-4 border-l-gray-400 bg-gray-50/50 dark:bg-gray-800/50';
    }
  };

  if (compact) {
    return (
      <Link
        to={`/results/${execution.id}`}
        className={cn(
          'flex items-center justify-between rounded-lg border p-3 transition-all hover:shadow-md',
          getStatusStyles(),
          className
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <StatusBadge status={execution.status} size="sm" iconOnly />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {execution.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatRelativeTime(execution.startedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {execution.duration && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(execution.duration)}
            </span>
          )}
        </div>
      </Link>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border p-4 shadow-sm transition-all hover:shadow-md',
        getStatusStyles(),
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StatusBadge status={execution.status} size="sm" />
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(execution.startedAt)}
            </span>
          </div>
          <h3 className="mt-2 truncate text-base font-semibold text-foreground">
            {execution.name}
          </h3>
        </div>

        {/* Actions Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="More actions"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-36 rounded-md border bg-popover py-1 shadow-lg">
              {onView && (
                <button
                  onClick={() => {
                    onView(execution.id);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
                >
                  <Eye className="h-4 w-4" />
                  View Results
                </button>
              )}
              {onRerun && (
                <button
                  onClick={() => {
                    onRerun(execution.id);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
                >
                  <RotateCcw className="h-4 w-4" />
                  Re-run
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => {
                    onDelete(execution.id);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-muted"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 border-t pt-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground">
            <FileText className="h-4 w-4" />
          </div>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {execution.scenarioCount}
          </p>
          <p className="text-xs text-muted-foreground">Scenarios</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-green-600">
            <CheckCircle className="h-4 w-4" />
          </div>
          <p className="mt-1 text-lg font-semibold text-green-600">
            {execution.passedCount}
          </p>
          <p className="text-xs text-muted-foreground">Passed</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-red-600">
            <XCircle className="h-4 w-4" />
          </div>
          <p className="mt-1 text-lg font-semibold text-red-600">
            {execution.failedCount}
          </p>
          <p className="text-xs text-muted-foreground">Failed</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t pt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {execution.duration ? formatDuration(execution.duration) : '—'}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-foreground">{passRate}%</span>
          <span className="text-xs text-muted-foreground">pass rate</span>
        </div>
      </div>

      {/* Quick Action Button */}
      <Link
        to={`/results/${execution.id}`}
        className="mt-4 block w-full rounded-md bg-primary py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        View Results
      </Link>
    </div>
  );
}

export default ExecutionCard;
