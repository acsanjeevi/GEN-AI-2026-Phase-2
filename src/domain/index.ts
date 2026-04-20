/**
 * Domain layer index
 * Re-exports all domain models and repository interfaces
 * 
 * The domain layer is the core of the application.
 * It has ZERO external dependencies and contains only:
 * - Domain models (pure TypeScript interfaces and types)
 * - Repository interfaces (contracts for persistence)
 * - Pure functions that operate on domain models
 */

// Models
export * from './models';

// Repository interfaces
export * from './repositories';
