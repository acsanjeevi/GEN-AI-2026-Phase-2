/**
 * Repository interfaces index
 * Re-exports all repository interfaces
 */

export {
  IFeatureRepository,
  FindFeaturesOptions,
  PaginatedResult,
} from './IFeatureRepository';

export {
  ITestPlanRepository,
  FindTestPlansOptions,
} from './ITestPlanRepository';

export {
  IExecutionResultRepository,
  ExecutionResult,
  FindExecutionResultsOptions,
  PaginatedExecutionResults,
  ExecutionStatistics,
} from './IExecutionResultRepository';

export {
  ILocatorRepository,
  FindLocatorsOptions,
  LocatorHealingRecord,
} from './ILocatorRepository';
