/**
 * Domain models index
 * Re-exports all domain models
 */

// Feature model
export {
  Feature,
  FeatureTag,
  FeatureMetadata,
  createFeature,
  hasScenarios,
  getAllTags,
  getScenariosByTag,
  countTotalSteps,
} from './Feature';

// Scenario model
export {
  Scenario,
  ScenarioTag,
  ScenarioType,
  ScenarioStatus,
  ExampleTable,
  createScenario,
  isScenarioOutline,
  getIterationCount,
  calculateScenarioStatus,
  updateScenarioStatus,
  getFailedSteps,
  hasTags,
  hasTag,
  calculateTotalDuration,
} from './Scenario';

// Step model
export {
  Step,
  StepKeyword,
  StepStatus,
  DataTable,
  DocString,
  StepArgument,
  createStep,
  getFullStepText,
  hasDataTable,
  hasDocString,
  hasArgument,
  markStepPassed,
  markStepFailed,
  markStepSkipped,
  isDataTable,
  isDocString,
} from './Step';

// Locator model
export {
  Locator,
  LocatorStrategy,
  LocatorConfidence,
  LocatorSource,
  createLocator,
  createCssLocator,
  createXPathLocator,
  createRoleLocator,
  createTestIdLocator,
  toPlaywrightLocator,
  recordSuccess,
  recordFailure,
  calculateReliabilityScore,
  shouldHeal,
} from './Locator';

// MappedStep model
export {
  MappedStep,
  UIAction,
  UIActionType,
  AssertionType,
  MappingConfidence,
  ResolvedElement,
  StepGeneratedCode,
  createMappedStep,
  createNavigateAction,
  createClickAction,
  createTypeAction,
  createAssertAction,
  createWaitAction,
  hasLocatorActions,
  getAllLocators,
  isReliableMapping,
  markForReview,
  updateLocator,
} from './MappedStep';

// TestPlan model
export {
  TestPlan,
  TestPlanStatus,
  ExecutionMode,
  BrowserConfig,
  TestExecutionItem,
  ExecutionSummary,
  DEFAULT_BROWSER_CONFIG,
  createTestPlan,
  createExecutionItem,
  markReady,
  markRunning,
  markCompleted,
  markCancelled,
  calculateSummary,
  getPendingItems,
  getRetriableItems,
  updateExecutionItem,
  canExecute,
  getProgress,
} from './TestPlan';
