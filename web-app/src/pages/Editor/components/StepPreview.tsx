/**
 * StepPreview Component
 * Shows mapped steps preview from parsed feature
 */

import { useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  HelpCircle,
  Lightbulb,
  MousePointer2,
  Navigation,
  Type,
  XCircle,
  Loader2,
} from 'lucide-react';
import type { Step, Scenario, CheckStepResponse, StepKeyword } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface StepMapping {
  step: Step;
  mapping: CheckStepResponse | null;
  isLoading: boolean;
  error?: string;
}

export interface StepPreviewProps {
  /** Parsed scenarios with steps */
  scenarios: Scenario[];
  /** Step mappings (step ID -> mapping result) */
  stepMappings: Map<string, StepMapping>;
  /** Whether mappings are loading */
  isLoading?: boolean;
  /** Callback when clicking a step */
  onStepClick?: (step: Step) => void;
  /** Additional CSS class */
  className?: string;
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Get icon for step keyword
 */
function getStepKeywordIcon(keyword: StepKeyword) {
  switch (keyword) {
    case 'Given':
      return <Navigation className="h-4 w-4 text-purple-500" />;
    case 'When':
      return <MousePointer2 className="h-4 w-4 text-blue-500" />;
    case 'Then':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'And':
    case 'But':
      return <Type className="h-4 w-4 text-gray-500" />;
    default:
      return <Code2 className="h-4 w-4 text-gray-500" />;
  }
}

/**
 * Get badge color based on mapping confidence
 */
function getConfidenceBadge(confidence: number) {
  if (confidence >= 80) {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
        High
      </span>
    );
  } else if (confidence >= 50) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        Medium
      </span>
    );
  } else if (confidence > 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
        Low
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-400">
      Unknown
    </span>
  );
}

interface StepItemProps {
  step: Step;
  mapping?: StepMapping;
  onClick?: (step: Step) => void;
}

function StepItem({ step, mapping, onClick }: StepItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isLoading = mapping?.isLoading ?? false;
  const mappingResult = mapping?.mapping;
  const hasError = !!mapping?.error;
  const canMap = mappingResult?.canMap ?? false;

  return (
    <div className="rounded-md border bg-card">
      {/* Step Header */}
      <button
        onClick={() => {
          setIsExpanded(!isExpanded);
          onClick?.(step);
        }}
        className="flex w-full items-center gap-2 p-3 text-left transition-colors hover:bg-muted/30"
      >
        {/* Expand/Collapse */}
        {mappingResult ? (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )
        ) : (
          <div className="w-4" />
        )}

        {/* Keyword Icon */}
        {getStepKeywordIcon(step.keyword)}

        {/* Step Text */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-primary">{step.keyword}</span>
            <span className="truncate text-sm text-foreground">{step.text}</span>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {hasError && <XCircle className="h-4 w-4 text-red-500" />}
          {mappingResult && !isLoading && (
            <>
              {canMap ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <HelpCircle className="h-4 w-4 text-amber-500" />
              )}
              {getConfidenceBadge(mappingResult.confidence)}
            </>
          )}
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && mappingResult && (
        <div className="border-t bg-muted/20 p-3">
          <div className="space-y-3 text-sm">
            {/* Action Type */}
            {mappingResult.actionType && (
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Action:</span>
                <span className="font-mono text-foreground">
                  {mappingResult.actionType}
                </span>
              </div>
            )}

            {/* Extracted Values */}
            {Object.entries(mappingResult.extractedValues || {}).length > 0 && (
              <div>
                <p className="mb-1 text-muted-foreground">Extracted Values:</p>
                <div className="ml-6 space-y-1">
                  {mappingResult.extractedValues.target && (
                    <p>
                      <span className="text-muted-foreground">Target:</span>{' '}
                      <span className="font-mono text-foreground">
                        {mappingResult.extractedValues.target}
                      </span>
                    </p>
                  )}
                  {mappingResult.extractedValues.value && (
                    <p>
                      <span className="text-muted-foreground">Value:</span>{' '}
                      <span className="font-mono text-foreground">
                        {mappingResult.extractedValues.value}
                      </span>
                    </p>
                  )}
                  {mappingResult.extractedValues.expectedValue && (
                    <p>
                      <span className="text-muted-foreground">Expected:</span>{' '}
                      <span className="font-mono text-foreground">
                        {mappingResult.extractedValues.expectedValue}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Reason */}
            {mappingResult.reason && (
              <div className="flex items-start gap-2">
                <Lightbulb className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <p className="text-muted-foreground">{mappingResult.reason}</p>
              </div>
            )}

            {/* Suggestions */}
            {mappingResult.suggestions && mappingResult.suggestions.length > 0 && (
              <div>
                <p className="mb-1 text-muted-foreground">Suggestions:</p>
                <ul className="ml-6 list-disc space-y-0.5 text-muted-foreground">
                  {mappingResult.suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* LLM Fallback Notice */}
            {mappingResult.needsLlmFallback && (
              <p className="text-xs italic text-amber-600 dark:text-amber-400">
                This step will use LLM for code generation
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface ScenarioSectionProps {
  scenario: Scenario;
  stepMappings: Map<string, StepMapping>;
  onStepClick?: (step: Step) => void;
}

function ScenarioSection({ scenario, stepMappings, onStepClick }: ScenarioSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="rounded-lg border bg-card">
      {/* Scenario Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 p-3 text-left transition-colors hover:bg-muted/30"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="font-medium text-foreground">{scenario.name}</span>
        <span className="text-sm text-muted-foreground">
          ({scenario.steps.length} steps)
        </span>
      </button>

      {/* Steps */}
      {isExpanded && (
        <div className="space-y-2 border-t p-3">
          {scenario.steps.map((step) => (
            <StepItem
              key={step.id}
              step={step}
              mapping={stepMappings.get(step.id)}
              onClick={onStepClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function StepPreview({
  scenarios,
  stepMappings,
  isLoading = false,
  onStepClick,
  className = '',
}: StepPreviewProps) {
  // Handle empty state
  if (scenarios.length === 0) {
    return (
      <div className={`rounded-lg border bg-card p-8 text-center ${className}`}>
        <Code2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h3 className="mb-1 font-medium text-foreground">No Scenarios</h3>
        <p className="text-sm text-muted-foreground">
          Write some Gherkin scenarios to see step mappings
        </p>
      </div>
    );
  }

  // Handle loading state
  if (isLoading) {
    return (
      <div className={`rounded-lg border bg-card p-8 text-center ${className}`}>
        <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Analyzing steps...</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="flex items-center gap-2 font-medium text-foreground">
        <Code2 className="h-5 w-5" />
        Step Mappings
      </h3>

      <div className="space-y-3">
        {scenarios.map((scenario) => (
          <ScenarioSection
            key={scenario.id}
            scenario={scenario}
            stepMappings={stepMappings}
            onStepClick={onStepClick}
          />
        ))}
      </div>
    </div>
  );
}

export default StepPreview;
