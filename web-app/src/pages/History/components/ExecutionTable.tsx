/**
 * ExecutionTable Component
 * Sortable table displaying execution history
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronUp,
  ChevronDown,
  Eye,
  Play,
  Trash2,
  MoreHorizontal,
  Video,
  Image as ImageIcon,
  FileCode,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/utils';
import { StatusBadge } from '@/components/common';
import type { ExecutionResponse } from '@/types';

export type SortField = 'createdAt' | 'name' | 'status' | 'duration';
export type SortOrder = 'asc' | 'desc';

export interface ExecutionTableProps {
  /** Executions to display */
  executions: ExecutionResponse[];
  /** Selected execution IDs */
  selectedIds: string[];
  /** Callback when selection changes */
  onSelectionChange: (ids: string[]) => void;
  /** Current sort field */
  sortField: SortField;
  /** Current sort order */
  sortOrder: SortOrder;
  /** Callback when sort changes */
  onSortChange: (field: SortField, order: SortOrder) => void;
  /** Callback when view is clicked */
  onView: (id: string) => void;
  /** Callback when re-run is clicked */
  onRerun: (id: string) => void;
  /** Callback when delete is clicked */
  onDelete: (id: string) => void;
  /** Is loading */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// Format duration in human-readable format
function formatDuration(ms?: number): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}

// Format date in relative or absolute format
function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // Less than 1 minute ago
  if (diff < 60000) return 'Just now';
  // Less than 1 hour ago
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  // Less than 24 hours ago
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  // Less than 7 days ago
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  // Otherwise show date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

// Map test plan status to status badge status
function mapStatus(status: string): 'pending' | 'running' | 'passed' | 'failed' | 'cancelled' {
  switch (status) {
    case 'completed':
      return 'passed';
    case 'failed':
      return 'failed';
    case 'running':
      return 'running';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
}

export function ExecutionTable({
  executions,
  selectedIds,
  onSelectionChange,
  sortField,
  sortOrder,
  onSortChange,
  onView: _onView,
  onRerun,
  onDelete,
  isLoading = false,
  className,
}: ExecutionTableProps) {
  // onView is available via _onView if needed for custom handling
  void _onView;
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      onSortChange(field, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(field, 'desc');
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === executions.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(executions.map((e) => e.id));
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronDown className="h-4 w-4 opacity-0 group-hover:opacity-50" />;
    }
    return sortOrder === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  const isAllSelected = executions.length > 0 && selectedIds.length === executions.length;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < executions.length;

  return (
    <div className={cn('overflow-hidden rounded-lg border bg-card', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-muted/50">
            <tr>
              {/* Checkbox */}
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isSomeSelected;
                  }}
                  onChange={handleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  aria-label="Select all"
                />
              </th>

              {/* Name / ID */}
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('name')}
                  className="group inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  Name / ID
                  <SortIcon field="name" />
                </button>
              </th>

              {/* Status */}
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('status')}
                  className="group inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  Status
                  <SortIcon field="status" />
                </button>
              </th>

              {/* Scenarios */}
              <th className="hidden px-4 py-3 text-left lg:table-cell">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Scenarios
                </span>
              </th>

              {/* Duration */}
              <th className="hidden px-4 py-3 text-left sm:table-cell">
                <button
                  onClick={() => handleSort('duration')}
                  className="group inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  Duration
                  <SortIcon field="duration" />
                </button>
              </th>

              {/* Artifacts */}
              <th className="hidden px-4 py-3 text-left md:table-cell">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Artifacts
                </span>
              </th>

              {/* Date */}
              <th className="hidden px-4 py-3 text-left md:table-cell">
                <button
                  onClick={() => handleSort('createdAt')}
                  className="group inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  Date
                  <SortIcon field="createdAt" />
                </button>
              </th>

              {/* Actions */}
              <th className="w-20 px-4 py-3 text-right">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Actions
                </span>
              </th>
            </tr>
          </thead>
          <tbody className={cn('divide-y', isLoading && 'opacity-50')}>
            {executions.map((execution) => {
              const isSelected = selectedIds.includes(execution.id);
              const passed = execution.summary?.passed || 0;
              const total = execution.summary?.total || execution.items.length;
              const hasVideo = execution.items.some((i) => i.hasVideo);
              const hasScreenshots = execution.items.some((i) => i.hasScreenshots);
              const hasCode = execution.items.some((i) => i.generatedCode);

              return (
                <tr
                  key={execution.id}
                  className={cn(
                    'hover:bg-muted/50 transition-colors',
                    isSelected && 'bg-primary/5'
                  )}
                >
                  {/* Checkbox */}
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectOne(execution.id)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      aria-label={`Select ${execution.name}`}
                    />
                  </td>

                  {/* Name / ID */}
                  <td className="px-4 py-3">
                    <div>
                      <Link
                        to={`/results/${execution.id}`}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {execution.name || execution.featureName || 'Untitled'}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground font-mono">
                        {execution.id.substring(0, 8)}...
                      </p>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <StatusBadge status={mapStatus(execution.status)} size="sm" />
                  </td>

                  {/* Scenarios */}
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          passed === total
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-yellow-600 dark:text-yellow-400'
                        )}
                      >
                        {passed}
                      </span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-sm text-muted-foreground">{total}</span>
                    </div>
                  </td>

                  {/* Duration */}
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(execution.summary?.duration)}
                    </span>
                  </td>

                  {/* Artifacts */}
                  <td className="hidden px-4 py-3 md:table-cell">
                    <div className="flex items-center gap-2">
                      {hasVideo && (
                        <span
                          title="Has video"
                          className="rounded bg-blue-100 p-1 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                        >
                          <Video className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {hasScreenshots && (
                        <span
                          title="Has screenshots"
                          className="rounded bg-purple-100 p-1 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {hasCode && (
                        <span
                          title="Has generated code"
                          className="rounded bg-green-100 p-1 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                        >
                          <FileCode className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {!hasVideo && !hasScreenshots && !hasCode && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>

                  {/* Date */}
                  <td className="hidden px-4 py-3 md:table-cell">
                    <span
                      className="text-sm text-muted-foreground"
                      title={execution.createdAt ? new Date(execution.createdAt).toLocaleString() : ''}
                    >
                      {formatDate(execution.createdAt)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* View Button */}
                      <Link
                        to={`/results/${execution.id}`}
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="View results"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>

                      {/* More Actions Menu */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === execution.id ? null : execution.id)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="More actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {openMenuId === execution.id && (
                          <>
                            {/* Backdrop */}
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenuId(null)}
                            />

                            {/* Menu */}
                            <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-md border bg-background py-1 shadow-lg">
                              <Link
                                to={`/results/${execution.id}`}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
                                onClick={() => setOpenMenuId(null)}
                              >
                                <ExternalLink className="h-4 w-4" />
                                View Details
                              </Link>
                              <button
                                onClick={() => {
                                  onRerun(execution.id);
                                  setOpenMenuId(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
                                disabled={execution.status === 'running'}
                              >
                                <Play className="h-4 w-4" />
                                Re-run
                              </button>
                              <hr className="my-1" />
                              <button
                                onClick={() => {
                                  onDelete(execution.id);
                                  setOpenMenuId(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ExecutionTable;
