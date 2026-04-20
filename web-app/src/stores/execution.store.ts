/**
 * Execution Store
 * Manages current test execution state
 */

import { create } from 'zustand';
import type {
  ExecutionResponse,
  ExecutionStatusResponse,
  TestPlanStatus,
  ExecutionItemSummary,
  CurrentStepInfo,
  ExecutionSummary,
} from '@/types';

// ============================================================================
// Types
// ============================================================================

interface ExecutionState {
  /** Current execution data */
  currentExecution: ExecutionResponse | null;
  /** Whether an execution is currently running */
  isRunning: boolean;
  /** Current progress percentage (0-100) */
  progress: number;
  /** Current step being executed */
  currentStep: CurrentStepInfo | null;
  /** Execution history for this session */
  recentExecutionIds: string[];
  /** Error message if execution failed */
  error: string | null;
  /** Whether polling is active */
  isPolling: boolean;
}

interface ExecutionActions {
  /** Set the current execution */
  setExecution: (execution: ExecutionResponse) => void;
  /** Update execution status from polling */
  updateStatus: (status: ExecutionStatusResponse) => void;
  /** Update a specific execution item */
  updateItem: (itemId: string, updates: Partial<ExecutionItemSummary>) => void;
  /** Set execution as running */
  startExecution: (execution: ExecutionResponse) => void;
  /** Mark execution as complete */
  completeExecution: (summary?: ExecutionSummary) => void;
  /** Set error state */
  setError: (error: string | null) => void;
  /** Set polling state */
  setPolling: (isPolling: boolean) => void;
  /** Add execution ID to recent list */
  addToRecent: (executionId: string) => void;
  /** Reset store to initial state */
  reset: () => void;
}

type ExecutionStore = ExecutionState & ExecutionActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: ExecutionState = {
  currentExecution: null,
  isRunning: false,
  progress: 0,
  currentStep: null,
  recentExecutionIds: [],
  error: null,
  isPolling: false,
};

// ============================================================================
// Store
// ============================================================================

export const useExecutionStore = create<ExecutionStore>((set, get) => ({
  ...initialState,

  setExecution: (execution) => {
    const isRunning = execution.status === 'running';
    set({
      currentExecution: execution,
      isRunning,
      progress: execution.progress,
      currentStep: execution.currentStep || null,
      error: null,
    });
  },

  updateStatus: (status) => {
    const { currentExecution } = get();
    if (!currentExecution) return;

    const isRunning = status.status === 'running';
    const isComplete = ['completed', 'failed', 'cancelled'].includes(status.status);

    set({
      currentExecution: {
        ...currentExecution,
        status: status.status,
        progress: status.progress,
        summary: status.summary || currentExecution.summary,
      },
      isRunning,
      progress: status.progress,
      currentStep: status.currentStep || null,
      isPolling: isComplete ? false : get().isPolling,
      error: status.error?.message || null,
    });
  },

  updateItem: (itemId, updates) => {
    const { currentExecution } = get();
    if (!currentExecution) return;

    set({
      currentExecution: {
        ...currentExecution,
        items: currentExecution.items.map((item: ExecutionItemSummary) =>
          item.id === itemId ? { ...item, ...updates } : item
        ),
      },
    });
  },

  startExecution: (execution) => {
    set({
      currentExecution: execution,
      isRunning: true,
      progress: 0,
      currentStep: null,
      error: null,
      isPolling: true,
    });
    get().addToRecent(execution.id);
  },

  completeExecution: (summary) => {
    const { currentExecution } = get();
    if (!currentExecution) return;

    set({
      currentExecution: {
        ...currentExecution,
        summary: summary || currentExecution.summary,
        status: summary ? (summary.failed > 0 ? 'failed' : 'completed') : currentExecution.status,
      },
      isRunning: false,
      progress: 100,
      currentStep: null,
      isPolling: false,
    });
  },

  setError: (error) => {
    set({ error, isRunning: false, isPolling: false });
  },

  setPolling: (isPolling) => {
    set({ isPolling });
  },

  addToRecent: (executionId) => {
    const { recentExecutionIds } = get();
    const updated = [executionId, ...recentExecutionIds.filter((id) => id !== executionId)].slice(
      0,
      10
    );
    set({ recentExecutionIds: updated });
  },

  reset: () => {
    set(initialState);
  },
}));

// ============================================================================
// Selectors
// ============================================================================

/**
 * Get whether execution can be cancelled
 */
export const selectCanCancel = (state: ExecutionStore): boolean => {
  return state.isRunning && state.currentExecution?.status === 'running';
};

/**
 * Get execution pass rate
 */
export const selectPassRate = (state: ExecutionStore): number | null => {
  const summary = state.currentExecution?.summary;
  if (!summary || summary.total === 0) return null;
  return summary.passRate;
};

/**
 * Get current status
 */
export const selectStatus = (state: ExecutionStore): TestPlanStatus | null => {
  return state.currentExecution?.status || null;
};

export default useExecutionStore;
