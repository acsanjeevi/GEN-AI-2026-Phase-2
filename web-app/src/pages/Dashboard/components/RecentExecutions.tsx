/**
 * RecentExecutions Component
 * List of recent test executions
 */

import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/utils';
import {
  EmptyState,
  LoadingSpinner,
  ErrorMessage,
  ConfirmDialog,
} from '@/components/common';
import { ExecutionCard, type ExecutionCardData } from './ExecutionCard';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';

export interface RecentExecutionsProps {
  /** List of recent executions */
  executions: ExecutionCardData[];
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: string | null;
  /** Retry callback */
  onRetry?: () => void;
  /** Delete execution callback */
  onDelete?: (id: string) => Promise<void>;
  /** Re-run execution callback */
  onRerun?: (id: string) => void;
  /** Maximum items to show */
  maxItems?: number;
  /** Show as compact list */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function RecentExecutions({
  executions,
  isLoading = false,
  error = null,
  onRetry,
  onDelete,
  onRerun,
  maxItems = 5,
  compact = false,
  className,
}: RecentExecutionsProps) {
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const displayedExecutions = executions.slice(0, maxItems);

  const handleView = (id: string) => {
    navigate(`/results/${id}`);
  };

  const handleRerun = (id: string) => {
    if (onRerun) {
      onRerun(id);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId || !onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(deleteId);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteId(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('rounded-lg border bg-card p-6', className)}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Recent Executions
          </h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" label="Loading executions..." />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn('rounded-lg border bg-card p-6', className)}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Recent Executions
          </h2>
        </div>
        <ErrorMessage
          title="Failed to load executions"
          message={error}
          onRetry={onRetry}
        />
      </div>
    );
  }

  // Empty state
  if (executions.length === 0) {
    return (
      <div className={cn('rounded-lg border bg-card p-6', className)}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Recent Executions
          </h2>
        </div>
        <EmptyState
          icon="inbox"
          title="No executions yet"
          description="Run your first test to see execution history here."
          actionLabel="Create Test"
          onAction={() => navigate('/editor')}
        />
      </div>
    );
  }

  return (
    <div className={cn('overflow-hidden rounded-xl border bg-card shadow-sm', className)}>
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-100 px-6 py-4 dark:bg-gray-800">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Recent Executions
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Your latest test runs</p>
        </div>
        {executions.length > maxItems && (
          <Link
            to="/history"
            className="flex items-center gap-1 rounded-lg bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      
      {/* Content */}
      <div className="p-6">

      {/* Execution List */}
      {compact ? (
        <div className="space-y-2">
          {displayedExecutions.map((execution) => (
            <ExecutionCard
              key={execution.id}
              execution={execution}
              compact
              onView={handleView}
              onRerun={onRerun ? handleRerun : undefined}
              onDelete={onDelete ? handleDeleteClick : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {displayedExecutions.map((execution) => (
            <ExecutionCard
              key={execution.id}
              execution={execution}
              onView={handleView}
              onRerun={onRerun ? handleRerun : undefined}
              onDelete={onDelete ? handleDeleteClick : undefined}
            />
          ))}
        </div>
      )}

      {/* View All Link (bottom) */}
      {executions.length > maxItems && (
        <div className="mt-4 text-center">
          <Link
            to="/history"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            Showing {maxItems} of {executions.length} executions
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Execution"
        message="Are you sure you want to delete this execution? This action cannot be undone and all associated artifacts will be removed."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}

export default RecentExecutions;
