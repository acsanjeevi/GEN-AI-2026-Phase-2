/**
 * History Page
 * Browse and manage past test executions with filtering, sorting, and pagination
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/layout';
import { LoadingSpinner, EmptyState, ConfirmDialog } from '@/components/common';
import { executionService } from '@/services/execution.service';
import type { ExecutionResponse, TestPlanStatus, ListExecutionsRequest } from '@/types';
import {
  FilterBar,
  ExecutionTable,
  Pagination,
  BulkActions,
  type FilterState,
  type SortField,
  type SortOrder,
} from './components';

// Default filter state
const defaultFilters: FilterState = {
  search: '',
  status: 'all',
  fromDate: '',
  toDate: '',
};

export function History() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Data state
  const [executions, setExecutions] = useState<ExecutionResponse[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & sort state - initialize from URL params
  const [filters, setFilters] = useState<FilterState>(() => ({
    search: searchParams.get('search') || defaultFilters.search,
    status: (searchParams.get('status') as TestPlanStatus | 'all') || defaultFilters.status,
    fromDate: searchParams.get('fromDate') || defaultFilters.fromDate,
    toDate: searchParams.get('toDate') || defaultFilters.toDate,
  }));
  const [sortField, setSortField] = useState<SortField>(
    (searchParams.get('sortBy') as SortField) || 'createdAt'
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>(
    (searchParams.get('sortOrder') as SortOrder) || 'desc'
  );

  // Pagination state
  const [currentPage, setCurrentPage] = useState(
    Number(searchParams.get('page')) || 1
  );
  const [pageSize, setPageSize] = useState(
    Number(searchParams.get('limit')) || 20
  );
  const totalPages = Math.ceil(totalItems / pageSize);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Build request params from state
  const buildRequestParams = useCallback((): ListExecutionsRequest => {
    const params: ListExecutionsRequest = {
      page: currentPage,
      limit: pageSize,
      sortBy: sortField === 'duration' ? 'completedAt' : sortField,
      sortOrder,
    };

    // Add status filter
    if (filters.status !== 'all') {
      params.status = filters.status;
    }

    // Add date filters
    if (filters.fromDate) {
      params.fromDate = filters.fromDate;
    }
    if (filters.toDate) {
      params.toDate = filters.toDate;
    }

    return params;
  }, [currentPage, pageSize, sortField, sortOrder, filters]);

  // Fetch executions
  const fetchExecutions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = buildRequestParams();
      const response = await executionService.list(params);
      
      // Apply client-side search filter
      let filtered = response.executions || [];
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(
          (e) =>
            e.name?.toLowerCase().includes(searchLower) ||
            e.id.toLowerCase().includes(searchLower) ||
            e.featureName?.toLowerCase().includes(searchLower)
        );
      }

      setExecutions(filtered);
      setTotalItems(response.total);
    } catch (err) {
      console.error('Failed to fetch executions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load executions');
    } finally {
      setIsLoading(false);
    }
  }, [buildRequestParams, filters.search]);

  // Sync URL params with state
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (filters.search) params.set('search', filters.search);
    if (filters.status !== 'all') params.set('status', filters.status);
    if (filters.fromDate) params.set('fromDate', filters.fromDate);
    if (filters.toDate) params.set('toDate', filters.toDate);
    if (sortField !== 'createdAt') params.set('sortBy', sortField);
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);
    if (currentPage !== 1) params.set('page', String(currentPage));
    if (pageSize !== 20) params.set('limit', String(pageSize));

    setSearchParams(params, { replace: true });
  }, [filters, sortField, sortOrder, currentPage, pageSize, setSearchParams]);

  // Fetch on mount and when params change
  useEffect(() => {
    fetchExecutions();
  }, [fetchExecutions]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortField, sortOrder, pageSize]);

  // Clear selection when data changes
  useEffect(() => {
    setSelectedIds([]);
  }, [executions]);

  // Handle filter change
  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  // Handle sort change
  const handleSortChange = (field: SortField, order: SortOrder) => {
    setSortField(field);
    setSortOrder(order);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle page size change
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Handle view
  const handleView = (id: string) => {
    navigate(`/results/${id}`);
  };

  // Handle re-run
  const handleRerun = async (id: string) => {
    // Navigate to editor or start new execution
    // For now, just navigate to results
    navigate(`/results/${id}`);
  };

  // Handle delete
  const handleDelete = (id: string) => {
    setDeleteTarget(id);
  };

  // Confirm single delete
  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await executionService.delete(deleteTarget);
      setDeleteTarget(null);
      fetchExecutions();
    } catch (err) {
      console.error('Failed to delete execution:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete execution');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    setShowBulkDeleteConfirm(true);
  };

  // Confirm bulk delete
  const confirmBulkDelete = async () => {
    setIsDeleting(true);
    try {
      await Promise.all(selectedIds.map((id) => executionService.delete(id)));
      setShowBulkDeleteConfirm(false);
      setSelectedIds([]);
      fetchExecutions();
    } catch (err) {
      console.error('Failed to delete executions:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete executions');
    } finally {
      setIsDeleting(false);
    }
  };

  // Sorted executions (client-side sort for status and duration)
  const sortedExecutions = useMemo(() => {
    const sorted = [...executions];
    
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        case 'duration':
          comparison = (a.summary?.duration || 0) - (b.summary?.duration || 0);
          break;
        case 'createdAt':
        default:
          comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [executions, sortField, sortOrder]);

  // Render content
  const renderContent = () => {
    if (isLoading && executions.length === 0) {
      return (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size="lg" label="Loading executions..." />
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-lg border bg-red-50 p-8 text-center dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={fetchExecutions}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      );
    }

    if (executions.length === 0) {
      const hasFilters = 
        filters.search || 
        filters.status !== 'all' || 
        filters.fromDate || 
        filters.toDate;

      if (hasFilters) {
        return (
          <EmptyState
            icon="search"
            title="No matching executions"
            description="Try adjusting your filters or search query"
            action={{
              label: 'Clear Filters',
              onClick: () => setFilters(defaultFilters),
            }}
          />
        );
      }

      return (
        <EmptyState
          icon="file"
          title="No executions yet"
          description="Create your first test to see execution history here"
          action={{
            label: 'Create Test',
            onClick: () => navigate('/editor'),
          }}
        />
      );
    }

    return (
      <>
        {/* Bulk Actions */}
        <BulkActions
          selectedCount={selectedIds.length}
          totalCount={executions.length}
          onClearSelection={() => setSelectedIds([])}
          onDeleteSelected={handleBulkDelete}
          isDeleting={isDeleting}
          className="mb-4"
        />

        {/* Table */}
        <ExecutionTable
          executions={sortedExecutions}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          sortField={sortField}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          onView={handleView}
          onRerun={handleRerun}
          onDelete={handleDelete}
          isLoading={isLoading}
        />

        {/* Pagination */}
        {totalItems > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            className="mt-4"
          />
        )}
      </>
    );
  };

  return (
    <PageContainer
      title="Execution History"
      description="Browse and manage past test executions"
    >
      {/* Filters */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onRefresh={fetchExecutions}
        isLoading={isLoading}
        className="mb-6"
      />

      {/* Content */}
      {renderContent()}

      {/* Single Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Execution"
        message="Are you sure you want to delete this execution? This will also delete all associated artifacts (videos, screenshots, traces). This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
        title="Delete Selected Executions"
        message={`Are you sure you want to delete ${selectedIds.length} execution(s)? This will also delete all associated artifacts. This action cannot be undone.`}
        confirmLabel={`Delete ${selectedIds.length} Execution(s)`}
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </PageContainer>
  );
}

export default History;
