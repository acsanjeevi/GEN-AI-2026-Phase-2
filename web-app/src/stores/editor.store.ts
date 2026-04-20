/**
 * Editor Store
 * Manages Gherkin editor content and validation state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ValidationResult, ParseError, Feature } from '@/types';
import { sampleFeature } from '@/config';

// ============================================================================
// Types
// ============================================================================

interface EditorState {
  /** Current editor content */
  content: string;
  /** Original content (for dirty check) */
  originalContent: string;
  /** Validation result from API */
  validationResult: ValidationResult | null;
  /** Parsed feature data */
  parsedFeature: Feature | null;
  /** Whether content has unsaved changes */
  isDirty: boolean;
  /** Whether validation is in progress */
  isValidating: boolean;
  /** Last saved timestamp */
  lastSavedAt: number | null;
  /** Saved feature files */
  savedFeatures: Array<{
    id: string;
    name: string;
    content: string;
    savedAt: number;
  }>;
  /** Currently loaded feature ID */
  currentFeatureId: string | null;
}

interface EditorActions {
  /** Set editor content */
  setContent: (content: string) => void;
  /** Set validation result */
  setValidation: (result: ValidationResult | null) => void;
  /** Set parsed feature */
  setParsedFeature: (feature: Feature | null) => void;
  /** Set validating state */
  setValidating: (isValidating: boolean) => void;
  /** Mark content as saved */
  markSaved: () => void;
  /** Save current content as a feature */
  saveFeature: (name: string) => string;
  /** Load a saved feature */
  loadFeature: (id: string) => boolean;
  /** Delete a saved feature */
  deleteFeature: (id: string) => void;
  /** Create new feature (reset to sample) */
  newFeature: () => void;
  /** Reset to initial state */
  reset: () => void;
}

type EditorStore = EditorState & EditorActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: EditorState = {
  content: sampleFeature,
  originalContent: sampleFeature,
  validationResult: null,
  parsedFeature: null,
  isDirty: false,
  isValidating: false,
  lastSavedAt: null,
  savedFeatures: [],
  currentFeatureId: null,
};

// ============================================================================
// Store
// ============================================================================

export const useEditorStore = create<EditorStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setContent: (content) => {
        const { originalContent } = get();
        set({
          content,
          isDirty: content !== originalContent,
          validationResult: null, // Clear validation on content change
        });
      },

      setValidation: (result) => {
        set({
          validationResult: result,
          isValidating: false,
        });
      },

      setParsedFeature: (feature) => {
        set({ parsedFeature: feature });
      },

      setValidating: (isValidating) => {
        set({ isValidating });
      },

      markSaved: () => {
        const { content } = get();
        set({
          originalContent: content,
          isDirty: false,
          lastSavedAt: Date.now(),
        });
      },

      saveFeature: (name) => {
        const { content, savedFeatures, currentFeatureId } = get();
        const id = currentFeatureId || `feature-${Date.now()}`;
        const existingIndex = savedFeatures.findIndex((f) => f.id === id);

        const feature = {
          id,
          name,
          content,
          savedAt: Date.now(),
        };

        const updatedFeatures =
          existingIndex >= 0
            ? savedFeatures.map((f, i) => (i === existingIndex ? feature : f))
            : [...savedFeatures, feature];

        set({
          savedFeatures: updatedFeatures,
          currentFeatureId: id,
          originalContent: content,
          isDirty: false,
          lastSavedAt: Date.now(),
        });

        return id;
      },

      loadFeature: (id) => {
        const { savedFeatures } = get();
        const feature = savedFeatures.find((f) => f.id === id);
        
        if (!feature) return false;

        set({
          content: feature.content,
          originalContent: feature.content,
          currentFeatureId: id,
          isDirty: false,
          validationResult: null,
          parsedFeature: null,
        });

        return true;
      },

      deleteFeature: (id) => {
        const { savedFeatures, currentFeatureId } = get();
        set({
          savedFeatures: savedFeatures.filter((f) => f.id !== id),
          currentFeatureId: currentFeatureId === id ? null : currentFeatureId,
        });
      },

      newFeature: () => {
        set({
          content: sampleFeature,
          originalContent: sampleFeature,
          currentFeatureId: null,
          isDirty: false,
          validationResult: null,
          parsedFeature: null,
        });
      },

      reset: () => {
        set({
          ...initialState,
          savedFeatures: get().savedFeatures, // Keep saved features
        });
      },
    }),
    {
      name: 'editor-storage',
      partialize: (state) => ({
        content: state.content,
        savedFeatures: state.savedFeatures,
        currentFeatureId: state.currentFeatureId,
      }),
    }
  )
);

// ============================================================================
// Selectors
// ============================================================================

/**
 * Get validation errors
 */
export const selectErrors = (state: EditorStore): ParseError[] => {
  return state.validationResult?.errors || [];
};

/**
 * Get whether content is valid
 */
export const selectIsValid = (state: EditorStore): boolean => {
  return state.validationResult?.valid ?? false;
};

/**
 * Get scenario names from validation
 */
export const selectScenarioNames = (state: EditorStore): string[] => {
  return state.validationResult?.scenarioNames || [];
};

/**
 * Get saved feature count
 */
export const selectSavedFeatureCount = (state: EditorStore): number => {
  return state.savedFeatures.length;
};

export default useEditorStore;
