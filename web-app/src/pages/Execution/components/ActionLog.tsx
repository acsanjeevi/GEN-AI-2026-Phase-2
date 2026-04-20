/**
 * ActionLog Component
 * Live scrolling log of execution actions
 */

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/utils';
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Trash2,
  Download,
  AlertTriangle,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'warning' | 'step';
  message: string;
  details?: string;
}

export interface ActionLogProps {
  /** Log entries to display */
  entries: LogEntry[];
  /** Whether execution is running (enables auto-scroll) */
  isRunning?: boolean;
  /** Maximum height */
  maxHeight?: string;
  /** Show timestamps */
  showTimestamps?: boolean;
  /** Callback to clear logs */
  onClear?: () => void;
  /** Callback to download logs */
  onDownload?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Type Config
// ============================================================================

const typeConfig = {
  info: {
    icon: Clock,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  success: {
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  error: {
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  step: {
    icon: Play,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format timestamp for log display
 */
function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

// ============================================================================
// Component
// ============================================================================

export function ActionLog({
  entries,
  isRunning = false,
  maxHeight = '300px',
  showTimestamps = true,
  onClear,
  onDownload,
  className,
}: ActionLogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);

  // Auto-scroll when new entries arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [entries, autoScroll]);

  // Handle manual scroll
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-foreground/80"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
          Action Log
          {entries.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
              {entries.length}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2">
          {/* Auto-scroll indicator */}
          {isRunning && (
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={cn(
                'rounded px-2 py-1 text-xs',
                autoScroll
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
            </button>
          )}

          {/* Download button */}
          {onDownload && entries.length > 0 && (
            <button
              onClick={onDownload}
              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Download logs"
            >
              <Download className="h-4 w-4" />
            </button>
          )}

          {/* Clear button */}
          {onClear && entries.length > 0 && !isRunning && (
            <button
              onClick={onClear}
              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Clear logs"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Log Content */}
      {isExpanded && (
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="overflow-auto p-4 font-mono text-sm"
          style={{ maxHeight }}
        >
          {entries.length === 0 ? (
            <p className="text-center text-muted-foreground">
              No log entries yet. Start an execution to see live updates.
            </p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => {
                const config = typeConfig[entry.type];
                const Icon = config.icon;

                return (
                  <div
                    key={entry.id}
                    className={cn(
                      'flex items-start gap-2 rounded px-2 py-1.5',
                      entry.type === 'error' && 'bg-red-50 dark:bg-red-900/10'
                    )}
                  >
                    {/* Timestamp */}
                    {showTimestamps && (
                      <span className="flex-shrink-0 text-xs text-muted-foreground">
                        [{formatTimestamp(entry.timestamp)}]
                      </span>
                    )}

                    {/* Icon */}
                    <Icon className={cn('mt-0.5 h-4 w-4 flex-shrink-0', config.color)} />

                    {/* Message */}
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground">{entry.message}</p>
                      {entry.details && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {entry.details}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Running indicator */}
              {isRunning && (
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
                  <span className="text-xs">Execution in progress...</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ActionLog;
