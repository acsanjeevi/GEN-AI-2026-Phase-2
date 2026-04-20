/**
 * BulkActions Component
 * Actions for selected executions (delete, export)
 */

import { Trash2, Download, X } from 'lucide-react';
import { cn } from '@/utils';

export interface BulkActionsProps {
  /** Number of selected items */
  selectedCount: number;
  /** Total number of items */
  totalCount: number;
  /** Callback to clear selection */
  onClearSelection: () => void;
  /** Callback to delete selected */
  onDeleteSelected: () => void;
  /** Is delete in progress */
  isDeleting?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function BulkActions({
  selectedCount,
  totalCount,
  onClearSelection,
  onDeleteSelected,
  isDeleting = false,
  className,
}: BulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border bg-primary/5 px-4 py-3',
        className
      )}
    >
      <div className="flex items-center gap-4">
        {/* Selection info */}
        <span className="text-sm font-medium text-foreground">
          {selectedCount} of {totalCount} selected
        </span>

        {/* Clear selection */}
        <button
          onClick={onClearSelection}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
          Clear
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Export button (future feature) */}
        <button
          disabled
          className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50"
          title="Coming soon"
        >
          <Download className="h-4 w-4" />
          Export
        </button>

        {/* Delete button */}
        <button
          onClick={onDeleteSelected}
          disabled={isDeleting}
          className={cn(
            'inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50',
            isDeleting && 'cursor-wait'
          )}
        >
          {isDeleting ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4" />
              Delete ({selectedCount})
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default BulkActions;
