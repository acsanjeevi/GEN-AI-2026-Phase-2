/**
 * useExecutionPolling Hook
 * Polls execution status at regular intervals until completion
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { executionService } from '@/services';
import { useExecutionStore } from '@/stores';
import type { ExecutionStatusResponse } from '@/types';

// ============================================================================
// Types
// ============================================================================

interface UseExecutionPollingOptions {
  /** Polling interval in ms (default: 2000) */
  interval?: number;
  /** Whether polling is enabled */
  enabled?: boolean;
  /** Callback when status changes */
  onStatusChange?: (status: ExecutionStatusResponse) => void;
  /** Callback when execution completes */
  onComplete?: (status: ExecutionStatusResponse) => void;
  /** Callback when execution fails */
  onError?: (error: Error) => void;
}

interface UseExecutionPollingResult {
  /** Current execution status */
  status: ExecutionStatusResponse | null;
  /** Whether currently polling */
  isPolling: boolean;
  /** Last error that occurred */
  error: Error | null;
  /** Start polling for an execution */
  startPolling: (executionId: string) => void;
  /** Stop polling */
  stopPolling: () => void;
  /** Manually refresh status */
  refresh: () => Promise<void>;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_POLLING_INTERVAL = 2000; // 2 seconds
const TERMINAL_STATUSES = ['completed', 'failed', 'cancelled'];

// ============================================================================
// Hook
// ============================================================================

export function useExecutionPolling(
  executionId?: string | null,
  options: UseExecutionPollingOptions = {}
): UseExecutionPollingResult {
  const {
    interval = DEFAULT_POLLING_INTERVAL,
    enabled = true,
    onStatusChange,
    onComplete,
    onError,
  } = options;

  // State
  const [status, setStatus] = useState<ExecutionStatusResponse | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Refs for tracking
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  // Stores
  const updateExecutionStatus = useExecutionStore((state) => state.updateStatus);
  const setExecutionPolling = useExecutionStore((state) => state.setPolling);

  /**
   * Fetch status for current execution
   */
  const fetchStatus = useCallback(async () => {
    if (!currentIdRef.current || !isMountedRef.current) return;

    try {
      const response = await executionService.getStatus(currentIdRef.current);
      
      if (!isMountedRef.current) return;

      setStatus(response);
      setError(null);
      updateExecutionStatus(response);
      onStatusChange?.(response);

      // Check if execution has completed
      if (TERMINAL_STATUSES.includes(response.status)) {
        setIsPolling(false);
        setExecutionPolling(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        onComplete?.(response);
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      const error = err instanceof Error ? err : new Error('Failed to fetch status');
      setError(error);
      onError?.(error);
      
      // Don't spam notifications, just log
      console.error('Polling error:', error);
    }
  }, [updateExecutionStatus, setExecutionPolling, onStatusChange, onComplete, onError]);

  /**
   * Start polling for an execution
   */
  const startPolling = useCallback(
    (id: string) => {
      // Stop any existing polling
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      currentIdRef.current = id;
      setIsPolling(true);
      setExecutionPolling(true);
      setError(null);

      // Fetch immediately
      fetchStatus();

      // Set up interval
      intervalRef.current = setInterval(fetchStatus, interval);
    },
    [fetchStatus, interval, setExecutionPolling]
  );

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
    setExecutionPolling(false);
    currentIdRef.current = null;
  }, [setExecutionPolling]);

  /**
   * Manually refresh status
   */
  const refresh = useCallback(async () => {
    if (currentIdRef.current) {
      await fetchStatus();
    }
  }, [fetchStatus]);

  // Auto-start polling when executionId changes
  useEffect(() => {
    if (executionId && enabled) {
      startPolling(executionId);
    } else {
      stopPolling();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [executionId, enabled, startPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    status,
    isPolling,
    error,
    startPolling,
    stopPolling,
    refresh,
  };
}

// ============================================================================
// Additional Hooks
// ============================================================================

/**
 * Hook to track elapsed time during execution
 */
export function useElapsedTime(startTime?: string | null, isRunning?: boolean): number {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (startTime && isRunning) {
      startRef.current = new Date(startTime).getTime();
      
      const updateElapsed = () => {
        if (startRef.current) {
          setElapsed(Date.now() - startRef.current);
        }
      };

      updateElapsed();
      intervalRef.current = setInterval(updateElapsed, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [startTime, isRunning]);

  return elapsed;
}

/**
 * Hook to estimate remaining time based on progress
 */
export function useEstimatedTime(
  elapsed: number,
  progress: number
): number | null {
  if (progress <= 0 || progress >= 100) return null;
  
  // Calculate rate and estimate remaining time
  const rate = elapsed / progress; // ms per percent
  const remaining = rate * (100 - progress);
  
  return Math.round(remaining);
}

export default useExecutionPolling;
