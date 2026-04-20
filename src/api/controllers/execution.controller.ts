/**
 * Execution Controller
 * Thin controller for test execution API endpoints
 * 
 * Following clean architecture: controllers only handle HTTP concerns,
 * all business logic is delegated to use cases
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

import { ValidationError, NotFoundError } from '../../core/errors';
import { getConfig } from '../../core/config';
import { LlmClientFactory, LlmClientConfig } from '../../infrastructure/llm/LlmClientFactory';
import { ILlmClient, LlmProvider } from '../../infrastructure/llm/LlmClient.interface';

// Services
import {
  getPlaywrightTestRunner,
  PlaywrightTestRunner,
  TestRunConfig,
  TestRunResult,
} from '../../infrastructure/playwright/PlaywrightTestRunner';
import {
  getArtifactsService,
  ArtifactsService,
} from '../../infrastructure/persistence/artifacts/ArtifactsService';

// DTOs
import {
  CreateExecutionRequest,
  ExecutionResponse,
  ExecutionStatusResponse,
  CreateExecutionResponse,
  StartExecutionResponse,
  CancelExecutionResponse,
  RetryStepResponse,
  ListExecutionsResponse,
  GetArtifactsResponse,
  ExecutionItemSummary,
  EndToEndFlowRequest,
  EndToEndFlowResponse,
} from '../dto/execution.dto';
import { TestPlan, TestPlanStatus, TestExecutionItem, getProgress } from '../../domain/models/TestPlan';

// End-to-End Flow Use Case
import { EndToEndFlowUseCase, createEndToEndFlow } from '../../application/execution/end-to-end-flow.usecase';

// Singleton instances
let testRunner: PlaywrightTestRunner | null = null;
let artifactsService: ArtifactsService | null = null;

/**
 * Get or create LLM client
 */
function getLlmClient(): ILlmClient | null {
  try {
    const appConfig = getConfig();
    const llmConfig = appConfig.llm;
    
    if (!llmConfig?.provider || !llmConfig?.apiKey) {
      return null;
    }

    const clientConfig: LlmClientConfig = {
      provider: llmConfig.provider as LlmProvider,
      apiKey: llmConfig.apiKey,
      model: llmConfig.model,
      baseUrl: llmConfig.baseUrl,
      apiVersion: llmConfig.apiVersion,
      deploymentName: llmConfig.deploymentName,
      defaultMaxTokens: llmConfig.maxTokens,
      defaultTemperature: llmConfig.temperature,
    };

    return LlmClientFactory.create(clientConfig);
  } catch {
    return null;
  }
}

/**
 * Get test runner instance
 */
function getTestRunner(): PlaywrightTestRunner {
  if (!testRunner) {
    const llmClient = getLlmClient() ?? undefined;
    testRunner = getPlaywrightTestRunner(llmClient);
  }
  return testRunner;
}

/**
 * Get artifacts service instance
 */
function getArtifacts(): ArtifactsService {
  if (!artifactsService) {
    artifactsService = getArtifactsService();
  }
  return artifactsService;
}

/**
 * Validate request and throw if errors
 */
function validateRequest(req: Request): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(
      'Validation failed',
      errors.array().map(err => ({
        field: 'field' in err ? String(err.field) : 'unknown',
        message: String(err.msg),
      }))
    );
  }
}

/**
 * Convert TestPlan to ExecutionResponse DTO
 */
function toExecutionResponse(testPlan: TestPlan): ExecutionResponse {
  return {
    id: testPlan.id,
    name: testPlan.name,
    description: testPlan.description,
    featureName: testPlan.feature.name,
    featureId: testPlan.feature.id,
    scriptId: testPlan.scriptId,
    specPath: testPlan.specPath,
    hasExistingSpec: testPlan.hasExistingSpec,
    status: testPlan.status,
    executionMode: testPlan.executionMode,
    browserConfig: testPlan.browserConfig,
    items: testPlan.items.map(item => {
      // Calculate completed steps based on item status
      let completedSteps = 0;
      if (item.status === 'passed') {
        completedSteps = item.mappedSteps.length;
      } else if (item.status === 'failed') {
        // All steps except the last one passed
        completedSteps = Math.max(0, item.mappedSteps.length - 1);
      }
      // For running/pending, completedSteps stays 0
      
      // Build step details from mapped steps
      // Find the index of the first failed step based on errorMessage match or fallback to last
      const failedStepIdx = item.status === 'failed'
        ? (() => {
            // Try to match error to a specific step text
            if (item.errorMessage) {
              const idx = item.mappedSteps.findIndex(
                (ms) => item.errorMessage && (
                  item.errorMessage.includes(ms.originalStep.text) ||
                  ms.originalStep.text.includes('contain') ||
                  ms.originalStep.text.includes('display') ||
                  ms.originalStep.text.includes('badge') ||
                  ms.originalStep.text.includes('should') && ms.originalStep.text.includes('item')
                )
              );
              // If the errorMessage mentions 'undefined' target, it's likely an unmapped assertion
              if (item.errorMessage.includes('"undefined"')) {
                const assertIdx = item.mappedSteps.findIndex(
                  (ms) => ms.actions && ms.actions.some(a => a.type === 'assert' && !a.locator)
                );
                if (assertIdx >= 0) return assertIdx;
              }
            }
            return item.mappedSteps.length - 1; // fallback to last step
          })()
        : -1;

      const steps = item.mappedSteps.map((mappedStep, stepIndex) => {
        let stepStatus: 'pending' | 'running' | 'passed' | 'failed' | 'skipped' = 'pending';
        
        if (item.status === 'passed') {
          stepStatus = 'passed';
        } else if (item.status === 'failed') {
          if (stepIndex < failedStepIdx) {
            stepStatus = 'passed';
          } else if (stepIndex === failedStepIdx) {
            stepStatus = 'failed';
          } else {
            stepStatus = 'skipped';
          }
        } else if (item.status === 'running') {
          stepStatus = 'pending';
        } else if (item.status === 'skipped') {
          stepStatus = 'skipped';
        }
        
        return {
          keyword: mappedStep.originalStep.keyword,
          text: mappedStep.originalStep.text,
          status: stepStatus,
          error: stepIndex === failedStepIdx && item.status === 'failed' 
            ? item.errorMessage 
            : undefined,
        };
      });
      
      return {
        id: item.id,
        scenarioName: item.scenario.name,
        tags: (item.scenario.tags || []).map(t => typeof t === 'string' ? t : t.name),
        status: item.status,
        stepCount: item.mappedSteps.length,
        completedSteps,
        steps,
        errorMessage: item.errorMessage,
        duration: item.duration,
        retryCount: item.retryCount,
        hasScreenshots: item.screenshots.length > 0,
        hasVideo: !!item.videoPath,
        generatedCode: item.generatedCode,
      };
    }),
    progress: getProgress(testPlan),
    summary: testPlan.summary,
    createdAt: testPlan.createdAt,
    startedAt: testPlan.startedAt,
    completedAt: testPlan.completedAt,
    createdBy: testPlan.createdBy,
    artifactsPath: testPlan.artifactsPath,
  };
}

/**
 * POST /execution/run
 * Create and start a new test execution
 */
export async function createExecutionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    validateRequest(req);
    
    const body = req.body as CreateExecutionRequest;
    const runner = getTestRunner();
    
    // Normalize request: handle aliases
    const featureContent = body.feature || body.featureContent;
    const browserConfig = body.browserConfig || body.browser;
    const options = body.options || {};
    const maxRetries = body.maxRetries ?? options.maxRetries;
    const timeout = browserConfig?.defaultTimeout ?? options.timeout;
    const screenshotOnFailure = browserConfig?.screenshotOnFailure ?? options.screenshotOnFailure;
    const recordVideo = browserConfig?.recordVideo ?? options.recordVideo;
    const traceEnabled = browserConfig?.traceEnabled ?? options.traceEnabled;
    
    // Build test run config
    const config: TestRunConfig = {
      featureContent: featureContent!,
      baseUrl: body.baseUrl,
      name: body.name,
      description: body.description,
      scriptId: body.scriptId,
      browser: browserConfig ? {
        type: (browserConfig as any).type || browserConfig.browser,
        headless: browserConfig.headless,
        viewportWidth: browserConfig.viewportWidth,
        viewportHeight: browserConfig.viewportHeight,
      } : undefined,
      options: {
        tags: body.tags,
        maxRetries,
        timeout,
        screenshotOnFailure,
        recordVideo,
        traceEnabled,
      },
      llm: {
        enableHealing: true,
        generateCode: true,
      },
      createdBy: body.createdBy,
    };

    // Start the run
    const result = await runner.startRun(config);

    // Get the full test plan for response
    const testPlan = runner.getRun(result.id);
    
    const response: CreateExecutionResponse = {
      execution: testPlan ? toExecutionResponse(testPlan) : {
        id: result.id,
        name: result.name,
        featureName: '',
        status: result.status,
        executionMode: 'sequential',
        browserConfig: config.browser as any || {},
        items: [],
        progress: result.progress,
        summary: result.summary,
        createdAt: new Date(),
      } as ExecutionResponse,
      message: result.success 
        ? `Test execution "${result.name}" started successfully`
        : `Failed to start test execution: ${result.error}`,
      started: result.status === 'running',
    };

    res.status(result.success ? 201 : 400).json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /execution/:id/start
 * Start or resume a test execution
 */
export async function startExecutionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    validateRequest(req);
    
    const { id } = req.params;
    const runner = getTestRunner();
    
    const testPlan = runner.getRun(id);
    if (!testPlan) {
      throw new NotFoundError(`Test execution ${id} not found`);
    }

    // For now, just return status (actual start would be done on creation)
    const response: StartExecutionResponse = {
      id: testPlan.id,
      status: testPlan.status,
      message: `Test execution is currently ${testPlan.status}`,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /execution/:id/status
 * Get execution status
 */
export async function getExecutionStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    validateRequest(req);
    
    const { id } = req.params;
    const runner = getTestRunner();
    
    const result = runner.getRunStatus(id);
    if (!result) {
      throw new NotFoundError(`Test execution ${id} not found`);
    }

    const testPlan = runner.getRun(id);
    const currentStep = testPlan?.items.find(i => i.status === 'running');

    const response: ExecutionStatusResponse = {
      id,
      name: result.name,
      status: result.status,
      progress: result.progress,
      summary: result.summary,
      currentStep: currentStep ? {
        itemId: currentStep.id,
        stepIndex: currentStep.mappedSteps.findIndex((_, i, arr) => 
          i === arr.length - 1 || currentStep.status !== 'passed'
        ),
        stepText: currentStep.mappedSteps[0]?.originalStep.text || '',
      } : undefined,
      lastActivity: new Date(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /execution/:id
 * Get full execution details
 */
export async function getExecutionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    validateRequest(req);
    
    const { id } = req.params;
    const runner = getTestRunner();
    
    const testPlan = runner.getRun(id);
    if (!testPlan) {
      throw new NotFoundError(`Test execution ${id} not found`);
    }

    res.json(toExecutionResponse(testPlan));
  } catch (error) {
    next(error);
  }
}

/**
 * POST /execution/:id/cancel
 * Cancel a running execution
 */
export async function cancelExecutionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    validateRequest(req);
    
    const { id } = req.params;
    const body = req.body as { reason?: string };
    const runner = getTestRunner();
    
    const result = runner.cancelRun(id);
    
    if (!result) {
      throw new NotFoundError('Execution', id);
    }
    
    const response: CancelExecutionResponse = {
      id,
      status: result.status,
      message: result.success 
        ? 'Execution cancelled successfully'
        : `Failed to cancel: ${result.error}`,
      summary: result.summary,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /execution/:id/retry/:itemId
 * Retry a failed scenario
 */
export async function retryStepHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    validateRequest(req);
    
    const { id, itemId } = req.params;
    const body = req.body as { useHealing?: boolean; alternativeLocator?: { type: string; value: string } };
    const runner = getTestRunner();
    
    const result = await runner.retryScenario(id, itemId);

    const testPlan = runner.getRun(id);
    const item = testPlan?.items.find((i: TestExecutionItem) => i.id === itemId);
    
    if (!result) {
      throw new NotFoundError('Execution', id);
    }
    
    // Map status, excluding 'skipped' which isn't valid for retry response
    let itemStatus: 'pending' | 'running' | 'passed' | 'failed' = 'failed';
    if (item?.status && ['pending', 'running', 'passed', 'failed'].includes(item.status)) {
      itemStatus = item.status as 'pending' | 'running' | 'passed' | 'failed';
    }

    const response: RetryStepResponse = {
      testPlanId: id,
      itemId,
      status: itemStatus,
      retryCount: item?.retryCount || 0,
      message: result.success 
        ? 'Retry completed successfully'
        : `Retry failed: ${result.error}`,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /execution/list
 * List executions with filters
 */
export async function listExecutionsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    validateRequest(req);
    
    const { status, featureId, createdBy, page = '1', limit = '20', sortBy, sortOrder } = req.query;
    const runner = getTestRunner();
    
    // Parse status filter - convert to array format expected by orchestrator
    let statusFilter: TestPlanStatus[] | undefined;
    if (status) {
      const statuses = String(status).split(',').map(s => s.trim()) as TestPlanStatus[];
      statusFilter = statuses;
    }

    // Get all matching test plans
    const listResult = runner.listRuns({
      status: statusFilter,
    });
    let testPlansArr = listResult.testPlans;

    // Filter by feature ID if provided
    if (featureId) {
      testPlansArr = testPlansArr.filter((p: TestPlan) => p.feature.id === featureId);
    }

    // Sort
    const sortField = (sortBy as string) || 'createdAt';
    const sortDir = (sortOrder as string) || 'desc';
    testPlansArr.sort((a: TestPlan, b: TestPlan) => {
      const aVal = a[sortField as keyof TestPlan];
      const bVal = b[sortField as keyof TestPlan];
      if (aVal instanceof Date && bVal instanceof Date) {
        return sortDir === 'asc' 
          ? aVal.getTime() - bVal.getTime()
          : bVal.getTime() - aVal.getTime();
      }
      return 0;
    });

    // Paginate
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const startIdx = (pageNum - 1) * limitNum;
    const paginatedPlans = testPlansArr.slice(startIdx, startIdx + limitNum);

    const response: ListExecutionsResponse = {
      executions: paginatedPlans.map(toExecutionResponse),
      total: testPlansArr.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(testPlansArr.length / limitNum),
      hasMore: startIdx + limitNum < testPlansArr.length,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /execution/:id/artifacts
 * Get artifacts for an execution
 */
export async function getArtifactsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    validateRequest(req);
    
    const { id } = req.params;
    const { type, itemId } = req.query;
    const artifacts = getArtifacts();
    
    const artifactsList = await artifacts.listArtifacts({
      testPlanId: id,
      type: type as any,
      itemId: itemId as string,
    });

    const totalSize = await artifacts.getTotalSize(id);

    const response: GetArtifactsResponse = {
      testPlanId: id,
      artifacts: artifactsList.map(a => artifacts.toArtifactInfo(a)),
      total: artifactsList.length,
      totalSize,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /execution/:id/artifacts/files
 * List artifact files directly from disk (videos, screenshots, traces)
 * Groups artifacts by attempt number based on timestamp ordering
 */
export async function listArtifactFilesHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    validateRequest(req);
    
    const { id } = req.params;
    const { type } = req.query;
    
    const fs = await import('fs').then(m => m.promises);
    const path = await import('path');
    
    const artifactsBasePath = path.resolve(process.cwd(), 'artifacts', id);
    
    // Check if directory exists
    try {
      await fs.access(artifactsBasePath);
    } catch {
      res.json({ files: [], videos: [], screenshots: [], traces: [], scripts: [], totalAttempts: 1 });
      return;
    }
    
    // Helper to extract timestamp from filename (e.g., page-2025-12-03T09-57-23-591Z.webm)
    const extractTimestamp = (filename: string): number => {
      // Try to extract ISO timestamp from filename
      const match = filename.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)/);
      if (match) {
        // Convert to standard ISO format (replace dashes in time with colons)
        const isoStr = match[1].replace(/-(\d{2})-(\d{2})-(\d{3})Z$/, ':$1:$2.$3Z');
        return new Date(isoStr).getTime();
      }
      // Fallback to trace timestamp format (trace-1764756133447.trace)
      const traceMatch = filename.match(/trace-(\d+)/);
      if (traceMatch) {
        return parseInt(traceMatch[1], 10);
      }
      return 0;
    };
    
    // Helper to sort files by timestamp
    const sortByTimestamp = (files: string[]): string[] => {
      return [...files].sort((a, b) => extractTimestamp(a) - extractTimestamp(b));
    };
    
    // Artifact with attempt info
    interface ArtifactWithAttempt {
      name: string;
      path: string;
      url: string;
      attempt: number;
      timestamp: number;
    }
    
    // Script artifact (no attempt info needed)
    interface ScriptArtifact {
      name: string;
      path: string;
      url: string;
    }
    
    const result: {
      videos: ArtifactWithAttempt[];
      screenshots: ArtifactWithAttempt[];
      traces: ArtifactWithAttempt[];
      scripts: ScriptArtifact[];
      totalAttempts: number;
    } = {
      videos: [],
      screenshots: [],
      traces: [],
      scripts: [],
      totalAttempts: 1,
    };
    
    // Scan videos folder
    if (!type || type === 'video') {
      const videosPath = path.join(artifactsBasePath, 'videos');
      try {
        const videoFiles = await fs.readdir(videosPath);
        const filteredVideos = videoFiles.filter(f => f.endsWith('.webm') || f.endsWith('.mp4'));
        const sortedVideos = sortByTimestamp(filteredVideos);
        
        result.videos = sortedVideos.map((f, index) => ({
          name: f,
          path: `videos/${f}`,
          url: `/artifacts/${id}/videos/${f}`,
          attempt: index + 1, // Will be recalculated after grouping
          timestamp: extractTimestamp(f),
        }));
      } catch {
        // Videos folder doesn't exist
      }
    }
    
    // Scan screenshots folder
    if (!type || type === 'screenshot') {
      const screenshotsPath = path.join(artifactsBasePath, 'screenshots');
      try {
        const screenshotFiles = await fs.readdir(screenshotsPath);
        const filteredScreenshots = screenshotFiles.filter(f => 
          f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')
        );
        const sortedScreenshots = sortByTimestamp(filteredScreenshots);
        
        result.screenshots = sortedScreenshots.map((f, index) => ({
          name: f,
          path: `screenshots/${f}`,
          url: `/artifacts/${id}/screenshots/${f}`,
          attempt: index + 1, // Will be recalculated after grouping
          timestamp: extractTimestamp(f),
        }));
      } catch {
        // Screenshots folder doesn't exist
      }
    }
    
    // Scan traces folder
    if (!type || type === 'trace') {
      const tracesPath = path.join(artifactsBasePath, 'traces');
      try {
        const traceFiles = await fs.readdir(tracesPath);
        const filteredTraces = traceFiles.filter(f => f.endsWith('.trace') || f.endsWith('.zip'));
        const sortedTraces = sortByTimestamp(filteredTraces);
        
        result.traces = sortedTraces.map((f, index) => ({
          name: f,
          path: `traces/${f}`,
          url: `/artifacts/${id}/traces/${f}`,
          attempt: index + 1,
          timestamp: extractTimestamp(f),
        }));
      } catch {
        // Traces folder doesn't exist
      }
    }
    
    // Scan scripts folder (check both 'scripts' and 'specs' directories)
    if (!type || type === 'script') {
      // First check 'specs' folder (where SpecWriter saves files)
      const specsPath = path.join(artifactsBasePath, 'specs');
      try {
        const specFiles = await fs.readdir(specsPath);
        const filteredSpecs = specFiles.filter(f => 
          f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.spec.ts')
        );
        
        result.scripts = filteredSpecs.map(f => ({
          name: f,
          path: `specs/${f}`,
          url: `/artifacts/${id}/specs/${f}`,
        }));
      } catch {
        // Specs folder doesn't exist, try scripts folder
      }
      
      // Also check 'scripts' folder as fallback
      if (result.scripts.length === 0) {
        const scriptsPath = path.join(artifactsBasePath, 'scripts');
        try {
          const scriptFiles = await fs.readdir(scriptsPath);
          const filteredScripts = scriptFiles.filter(f => 
            f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.spec.ts')
          );
          
          result.scripts = filteredScripts.map(f => ({
            name: f,
            path: `scripts/${f}`,
            url: `/artifacts/${id}/scripts/${f}`,
          }));
        } catch {
          // Scripts folder doesn't exist
        }
      }
    }
    
    // Determine total attempts by matching video and screenshot counts
    // Each attempt generates 1 video + 1 screenshot (typically)
    const videoCount = result.videos.length;
    const screenshotCount = result.screenshots.length;
    result.totalAttempts = Math.max(videoCount, screenshotCount, 1);
    
    // Assign attempt numbers based on artifact order
    // Each video/screenshot pair represents one attempt
    // Since Playwright creates artifacts in order, we can assign attempts sequentially
    if (result.totalAttempts > 1) {
      // Assign attempt numbers to videos (1, 2, 3, ...)
      result.videos.forEach((v, index) => {
        v.attempt = index + 1;
      });
      
      // Assign attempt numbers to screenshots by matching to nearest video timestamp
      // or if equal counts, assign sequentially
      if (screenshotCount === videoCount) {
        result.screenshots.forEach((s, index) => {
          s.attempt = index + 1;
        });
      } else {
        // Match screenshots to videos by timestamp proximity
        result.screenshots.forEach(s => {
          let bestMatch = 1;
          let smallestDiff = Infinity;
          for (const v of result.videos) {
            const diff = Math.abs(s.timestamp - v.timestamp);
            if (diff < smallestDiff) {
              smallestDiff = diff;
              bestMatch = v.attempt;
            }
          }
          s.attempt = bestMatch;
        });
      }
      
      // For traces, match to the nearest video timestamp
      result.traces.forEach(t => {
        if (t.timestamp === 0) {
          // traces.zip without timestamp goes to attempt 1
          t.attempt = 1;
          return;
        }
        let bestMatch = 1;
        let smallestDiff = Infinity;
        for (const v of result.videos) {
          const diff = Math.abs(t.timestamp - v.timestamp);
          if (diff < smallestDiff) {
            smallestDiff = diff;
            bestMatch = v.attempt;
          }
        }
        t.attempt = bestMatch;
      });
    } else {
      // Single attempt - assign all to attempt 1
      result.videos.forEach(v => { v.attempt = 1; });
      result.screenshots.forEach(s => { s.attempt = 1; });
      result.traces.forEach(t => { t.attempt = 1; });
    }
    
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /execution/:id/artifacts/:artifactId
 * Download a specific artifact
 */
export async function downloadArtifactHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    validateRequest(req);
    
    const { id, artifactId } = req.params;
    const artifacts = getArtifacts();
    
    const metadata = await artifacts.getArtifact(artifactId);
    if (!metadata || metadata.testPlanId !== id) {
      throw new NotFoundError(`Artifact ${artifactId} not found`);
    }

    const content = await artifacts.getArtifactContent(artifactId);
    if (!content) {
      throw new NotFoundError(`Artifact content not found`);
    }

    res.setHeader('Content-Type', metadata.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${metadata.fileName}"`);
    res.setHeader('Content-Length', metadata.size);
    res.send(content);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /execution/:id
 * Delete an execution and its artifacts
 */
export async function deleteExecutionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    validateRequest(req);
    
    const { id } = req.params;
    const runner = getTestRunner();
    const artifacts = getArtifacts();
    
    // Delete artifacts first
    await artifacts.deleteTestPlanArtifacts(id);
    
    // Delete the test run
    const deleted = await runner.deleteRun(id);
    
    if (!deleted) {
      throw new NotFoundError(`Test execution ${id} not found`);
    }

    res.json({
      message: `Test execution ${id} deleted successfully`,
      id,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /execution/running
 * Get all currently running executions
 */
export async function getRunningExecutionsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const runner = getTestRunner();
    const runningIds = runner.getRunningTests();
    
    const runningPlans = runningIds
      .map(id => runner.getRun(id))
      .filter((p): p is TestPlan => p !== undefined);

    res.json({
      count: runningPlans.length,
      executions: runningPlans.map(toExecutionResponse),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /execution/e2e
 * Execute end-to-end flow: Parse → Map → Prepare for Execution
 * Phase 9 implementation
 */
export async function endToEndFlowHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    validateRequest(req);
    
    const body = req.body as EndToEndFlowRequest;
    const llmClient = getLlmClient();
    
    // Create end-to-end flow use case
    const flowUseCase = createEndToEndFlow(llmClient);
    
    // Execute the flow
    const result = await flowUseCase.execute({
      featureContent: body.featureContent,
      baseUrl: body.baseUrl,
      browserConfig: body.browserConfig,
      maxHealingAttempts: body.maxHealingAttempts,
      enableHealing: body.enableHealing,
      tags: body.tags,
      timeout: body.timeout,
    });
    
    // Build response
    const response: EndToEndFlowResponse = {
      success: result.success,
      flowId: result.testPlan?.id || 'unknown',
      featureName: result.feature?.name,
      testPlanId: result.testPlan?.id,
      summary: result.summary,
      healingEvents: result.healingEvents.map(e => ({
        stepId: e.stepId,
        stepText: e.stepText,
        originalLocator: e.originalLocator,
        healedLocator: e.healedLocator,
        attemptNumber: e.attemptNumber,
        success: e.success,
        analysis: e.analysis,
        timestamp: e.timestamp,
      })),
      errors: result.errors,
      durationMs: result.durationMs,
    };
    
    // If test plan was created, register it with the runner for execution
    if (result.testPlan) {
      const runner = getTestRunner();
      // Store the test plan for later execution
      runner.registerTestPlan(result.testPlan);
    }
    
    res.status(result.success ? 200 : 400).json(response);
  } catch (error) {
    next(error);
  }
}
