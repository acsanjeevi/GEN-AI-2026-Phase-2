/**
 * SpecWriter - Infrastructure component for managing Playwright spec file generation
 * 
 * Handles incremental writing of test steps to spec files during execution.
 * When steps execute successfully, their generated code is written to a spec file
 * that can be reused in subsequent executions.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { createLogger, ILogger } from '../logging';

/**
 * Spec file metadata
 */
export interface SpecFileMetadata {
  /** Unique script ID */
  scriptId: string;
  /** Feature name */
  featureName: string;
  /** Base URL for the application */
  baseUrl: string;
  /** When the spec was created */
  createdAt: Date;
  /** When the spec was last updated */
  updatedAt: Date;
  /** Number of scenarios in the spec */
  scenarioCount: number;
  /** Total number of steps */
  stepCount: number;
  /** Whether the spec is complete (all steps passed) */
  isComplete: boolean;
}

/**
 * Step code entry for a spec file
 */
export interface StepCodeEntry {
  /** Scenario name */
  scenarioName: string;
  /** Step keyword (Given, When, Then, And, But) */
  keyword: string;
  /** Step text */
  stepText: string;
  /** Generated Playwright code */
  code: string;
  /** Step execution status */
  status: 'passed' | 'failed' | 'pending';
  /** Timestamp when code was generated */
  generatedAt: Date;
}

/**
 * Scenario entry in a spec file
 */
export interface ScenarioEntry {
  /** Scenario ID */
  id: string;
  /** Scenario name */
  name: string;
  /** Scenario tags */
  tags: string[];
  /** Steps in this scenario */
  steps: StepCodeEntry[];
  /** Whether this scenario is complete */
  isComplete: boolean;
}

/**
 * In-memory spec file state
 */
interface SpecFileState {
  metadata: SpecFileMetadata;
  scenarios: Map<string, ScenarioEntry>;
  imports: Set<string>;
}

/**
 * Options for initializing a spec file
 */
export interface InitSpecOptions {
  /** Unique script ID */
  scriptId: string;
  /** Feature name */
  featureName: string;
  /** Base URL */
  baseUrl: string;
  /** Artifacts directory (where spec will be saved) */
  artifactsDir: string;
  /** Whether to overwrite existing spec */
  overwrite?: boolean;
}

/**
 * Options for appending step code
 */
export interface AppendStepCodeOptions {
  /** Script ID */
  scriptId: string;
  /** Scenario ID */
  scenarioId: string;
  /** Scenario name */
  scenarioName: string;
  /** Scenario tags */
  scenarioTags?: string[];
  /** Step keyword */
  keyword: string;
  /** Step text */
  stepText: string;
  /** Generated code */
  code: string;
  /** Step status */
  status: 'passed' | 'failed';
  /** Required imports */
  imports?: string[];
}

/**
 * Result of spec file operations
 */
export interface SpecWriterResult {
  /** Whether operation was successful */
  success: boolean;
  /** Path to spec file */
  specPath?: string;
  /** Error message if failed */
  error?: string;
  /** Spec file metadata */
  metadata?: SpecFileMetadata;
}

/**
 * SpecWriter class
 * Manages incremental writing of Playwright spec files during test execution
 */
export class SpecWriter {
  private readonly logger: ILogger;
  private readonly specs: Map<string, SpecFileState> = new Map();
  private readonly specPaths: Map<string, string> = new Map();

  constructor() {
    this.logger = createLogger({ level: 'info', format: 'json' });
  }

  /**
   * Initialize a new spec file or load existing one
   */
  async initSpec(options: InitSpecOptions): Promise<SpecWriterResult> {
    const { scriptId, featureName, baseUrl, artifactsDir, overwrite } = options;

    try {
      // Create specs directory
      const specsDir = path.join(artifactsDir, 'specs');
      await fs.mkdir(specsDir, { recursive: true });

      const specPath = path.join(specsDir, `${scriptId}.spec.ts`);
      this.specPaths.set(scriptId, specPath);

      // Check if spec file already exists
      const exists = await this.specExists(scriptId);

      if (exists && !overwrite) {
        // Load existing spec
        this.logger.info('Loading existing spec file', { scriptId, specPath });
        return await this.loadExistingSpec(scriptId, specPath);
      }

      // Create new spec state
      const now = new Date();
      const state: SpecFileState = {
        metadata: {
          scriptId,
          featureName,
          baseUrl,
          createdAt: now,
          updatedAt: now,
          scenarioCount: 0,
          stepCount: 0,
          isComplete: false,
        },
        scenarios: new Map(),
        imports: new Set(['test', 'expect', 'Page']),
      };

      this.specs.set(scriptId, state);

      // Write initial spec file
      await this.writeSpecFile(scriptId);

      this.logger.info('Spec file initialized', { scriptId, specPath });

      return {
        success: true,
        specPath,
        metadata: state.metadata,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to initialize spec file', { scriptId, error: errorMsg });
      return {
        success: false,
        error: `Failed to initialize spec: ${errorMsg}`,
      };
    }
  }

  /**
   * Check if a spec file exists for the given script ID
   */
  async specExists(scriptId: string): Promise<boolean> {
    const specPath = this.specPaths.get(scriptId);
    if (!specPath) return false;

    try {
      await fs.access(specPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the spec file path for a script ID
   */
  getSpecPath(scriptId: string): string | undefined {
    return this.specPaths.get(scriptId);
  }

  /**
   * Load an existing spec file
   */
  private async loadExistingSpec(scriptId: string, specPath: string): Promise<SpecWriterResult> {
    try {
      const content = await fs.readFile(specPath, 'utf-8');
      
      // Parse metadata from comment header
      const metadataMatch = content.match(/\/\*\*\s*SPEC_METADATA\s*([\s\S]*?)\s*\*\//);
      let metadata: SpecFileMetadata;

      if (metadataMatch) {
        try {
          metadata = JSON.parse(metadataMatch[1]);
        } catch {
          // Default metadata if parsing fails
          metadata = {
            scriptId,
            featureName: 'Unknown',
            baseUrl: '',
            createdAt: new Date(),
            updatedAt: new Date(),
            scenarioCount: 0,
            stepCount: 0,
            isComplete: false,
          };
        }
      } else {
        metadata = {
          scriptId,
          featureName: 'Unknown',
          baseUrl: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          scenarioCount: 0,
          stepCount: 0,
          isComplete: false,
        };
      }

      // Create state with loaded metadata
      const state: SpecFileState = {
        metadata,
        scenarios: new Map(),
        imports: new Set(['test', 'expect', 'Page']),
      };

      this.specs.set(scriptId, state);

      return {
        success: true,
        specPath,
        metadata,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to load existing spec: ${errorMsg}`,
      };
    }
  }

  /**
   * Append step code to the spec file
   */
  async appendStepCode(options: AppendStepCodeOptions): Promise<SpecWriterResult> {
    const {
      scriptId,
      scenarioId,
      scenarioName,
      scenarioTags = [],
      keyword,
      stepText,
      code,
      status,
      imports = [],
    } = options;

    try {
      const state = this.specs.get(scriptId);
      if (!state) {
        return {
          success: false,
          error: `Spec not initialized for scriptId: ${scriptId}`,
        };
      }

      // Add imports
      imports.forEach(imp => state.imports.add(imp));

      // Get or create scenario entry
      let scenario = state.scenarios.get(scenarioId);
      if (!scenario) {
        scenario = {
          id: scenarioId,
          name: scenarioName,
          tags: scenarioTags,
          steps: [],
          isComplete: false,
        };
        state.scenarios.set(scenarioId, scenario);
        state.metadata.scenarioCount++;
      }

      // Add step entry
      const stepEntry: StepCodeEntry = {
        scenarioName,
        keyword,
        stepText,
        code,
        status,
        generatedAt: new Date(),
      };

      scenario.steps.push(stepEntry);
      state.metadata.stepCount++;
      state.metadata.updatedAt = new Date();

      // Write updated spec file
      await this.writeSpecFile(scriptId);

      this.logger.debug('Step code appended', {
        scriptId,
        scenarioId,
        keyword,
        stepText,
        status,
      });

      return {
        success: true,
        specPath: this.specPaths.get(scriptId),
        metadata: state.metadata,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to append step code', {
        scriptId,
        scenarioId,
        error: errorMsg,
      });
      return {
        success: false,
        error: `Failed to append step code: ${errorMsg}`,
      };
    }
  }

  /**
   * Mark a scenario as complete
   */
  async markScenarioComplete(scriptId: string, scenarioId: string): Promise<SpecWriterResult> {
    try {
      const state = this.specs.get(scriptId);
      if (!state) {
        return {
          success: false,
          error: `Spec not initialized for scriptId: ${scriptId}`,
        };
      }

      const scenario = state.scenarios.get(scenarioId);
      if (scenario) {
        scenario.isComplete = true;
      }

      // Check if all scenarios are complete
      const allComplete = Array.from(state.scenarios.values()).every(s => s.isComplete);
      state.metadata.isComplete = allComplete;
      state.metadata.updatedAt = new Date();

      await this.writeSpecFile(scriptId);

      return {
        success: true,
        specPath: this.specPaths.get(scriptId),
        metadata: state.metadata,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to mark scenario complete: ${errorMsg}`,
      };
    }
  }

  /**
   * Finalize the spec file
   */
  async finalizeSpec(scriptId: string): Promise<SpecWriterResult> {
    try {
      const state = this.specs.get(scriptId);
      if (!state) {
        return {
          success: false,
          error: `Spec not initialized for scriptId: ${scriptId}`,
        };
      }

      state.metadata.updatedAt = new Date();

      // Write final spec file
      await this.writeSpecFile(scriptId);

      this.logger.info('Spec file finalized', {
        scriptId,
        scenarioCount: state.metadata.scenarioCount,
        stepCount: state.metadata.stepCount,
        isComplete: state.metadata.isComplete,
      });

      return {
        success: true,
        specPath: this.specPaths.get(scriptId),
        metadata: state.metadata,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to finalize spec: ${errorMsg}`,
      };
    }
  }

  /**
   * Get the generated code for a specific script
   */
  getGeneratedCode(scriptId: string): string | undefined {
    const state = this.specs.get(scriptId);
    if (!state) return undefined;

    return this.generateSpecContent(state);
  }

  /**
   * Get metadata for a script
   */
  getMetadata(scriptId: string): SpecFileMetadata | undefined {
    return this.specs.get(scriptId)?.metadata;
  }

  /**
   * Write spec file to disk
   */
  private async writeSpecFile(scriptId: string): Promise<void> {
    const state = this.specs.get(scriptId);
    const specPath = this.specPaths.get(scriptId);

    if (!state || !specPath) {
      throw new Error(`Spec state or path not found for scriptId: ${scriptId}`);
    }

    const content = this.generateSpecContent(state);
    await fs.writeFile(specPath, content, 'utf-8');
  }

  /**
   * Generate spec file content from state
   */
  private generateSpecContent(state: SpecFileState): string {
    const lines: string[] = [];
    const { metadata, scenarios, imports } = state;

    // Metadata comment block
    lines.push('/**');
    lines.push(' * Auto-generated Playwright test spec');
    lines.push(` * Script ID: ${metadata.scriptId}`);
    lines.push(` * Feature: ${metadata.featureName}`);
    lines.push(` * Generated: ${metadata.createdAt.toISOString()}`);
    lines.push(` * Last Updated: ${metadata.updatedAt.toISOString()}`);
    lines.push(' *');
    lines.push(' * SPEC_METADATA');
    lines.push(` * ${JSON.stringify(metadata)}`);
    lines.push(' */');
    lines.push('');

    // Imports
    const importsList = Array.from(imports);
    lines.push(`import { ${importsList.join(', ')} } from '@playwright/test';`);
    lines.push('');

    // Test describe block
    lines.push(`test.describe('${this.escapeString(metadata.featureName)}', () => {`);

    // beforeEach hook with base URL
    if (metadata.baseUrl) {
      lines.push('  test.beforeEach(async ({ page }) => {');
      lines.push(`    await page.goto('${this.escapeString(metadata.baseUrl)}');`);
      lines.push('  });');
      lines.push('');
    }

    // Each scenario as a test
    for (const scenario of scenarios.values()) {
      // Add tags as test annotations
      if (scenario.tags.length > 0) {
        const tagsStr = scenario.tags.map(t => `'${t}'`).join(', ');
        lines.push(`  // Tags: ${tagsStr}`);
      }

      lines.push(`  test('${this.escapeString(scenario.name)}', async ({ page }) => {`);

      // Add steps
      for (const step of scenario.steps) {
        lines.push(`    // ${step.keyword} ${step.stepText}`);
        
        // Handle step status
        if (step.status === 'failed') {
          lines.push(`    // ⚠️ Step failed - code may need manual review`);
          lines.push(`    // ${step.code.replace(/\n/g, '\n    // ')}`);
        } else {
          // Indent the code properly
          const codeLines = step.code.split('\n');
          codeLines.forEach(codeLine => {
            if (codeLine.trim()) {
              lines.push(`    ${codeLine}`);
            }
          });
        }
        lines.push('');
      }

      // Mark incomplete scenarios
      if (!scenario.isComplete) {
        lines.push('    // TODO: Scenario execution incomplete');
      }

      lines.push('  });');
      lines.push('');
    }

    lines.push('});');

    return lines.join('\n');
  }

  /**
   * Escape string for JavaScript
   */
  private escapeString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  }

  /**
   * Cleanup spec state (call when done with a script)
   */
  cleanup(scriptId: string): void {
    this.specs.delete(scriptId);
    // Keep specPath for future reference
  }
}

// Singleton instance
let specWriterInstance: SpecWriter | null = null;

/**
 * Get singleton SpecWriter instance
 */
export function getSpecWriter(): SpecWriter {
  if (!specWriterInstance) {
    specWriterInstance = new SpecWriter();
  }
  return specWriterInstance;
}
