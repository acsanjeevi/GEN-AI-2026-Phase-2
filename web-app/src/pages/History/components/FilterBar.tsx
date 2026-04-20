/**
 * FilterBar Component
 * Filter controls for execution history
 */

import { useState } from 'react';
import { Search, Filter, X, Calendar, ChevronDown } from 'lucide-react';
import { cn } from '@/utils';
import type { TestPlanStatus } from '@/types';

export interface FilterState {
  /** Search query */
  search: string;
  /** Status filter */
  status: TestPlanStatus | 'all';
  /** Date range - from */
  fromDate: string;
  /** Date range - to */
  toDate: string;
}

export interface FilterBarProps {
  /** Current filter state */
  filters: FilterState;
  /** Callback when filters change */
  onFilterChange: (filters: FilterState) => void;
  /** Callback for refresh */
  onRefresh: () => void;
  /** Is loading */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const statusOptions: Array<{ value: TestPlanStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All Statuses' },
  { value: 'completed', label: 'Passed' },
  { value: 'failed', label: 'Failed' },
  { value: 'running', label: 'Running' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function FilterBar({
  filters,
  onFilterChange,
  onRefresh,
  isLoading = false,
  className,
}: FilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSearchChange = (value: string) => {
    onFilterChange({ ...filters, search: value });
  };

  const handleStatusChange = (status: TestPlanStatus | 'all') => {
    onFilterChange({ ...filters, status });
  };

  const handleDateChange = (field: 'fromDate' | 'toDate', value: string) => {
    onFilterChange({ ...filters, [field]: value });
  };

  const clearFilters = () => {
    onFilterChange({
      search: '',
      status: 'all',
      fromDate: '',
      toDate: '',
    });
  };

  const hasActiveFilters =
    filters.search || filters.status !== 'all' || filters.fromDate || filters.toDate;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Main Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {filters.search && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={cn(
              'inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
              showAdvanced
                ? 'border-primary bg-primary/10 text-primary'
                : 'bg-card text-foreground hover:bg-muted'
            )}
          >
            <Filter className="h-4 w-4" />
            Filters
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                showAdvanced && 'rotate-180'
              )}
            />
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-md border border-dashed px-3 py-2 text-sm font-medium text-muted-foreground hover:border-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          )}

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className={cn(
              'inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50',
              isLoading && 'cursor-wait'
            )}
          >
            <svg
              className={cn('h-4 w-4', isLoading && 'animate-spin')}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Status Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleStatusChange(option.value)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              filters.status === option.value
                ? 'bg-primary text-primary-foreground'
                : 'border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="rounded-lg border bg-card p-4">
          <h4 className="mb-4 text-sm font-medium text-foreground">Advanced Filters</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Date Range - From */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                From Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => handleDateChange('fromDate', e.target.value)}
                  className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Date Range - To */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                To Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => handleDateChange('toDate', e.target.value)}
                  className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FilterBar;
