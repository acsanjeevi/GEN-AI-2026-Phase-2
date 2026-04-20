/**
 * MCP Controller
 * Handles HTTP requests for MCP tool execution
 */

import { Request, Response } from 'express';
import { PlaywrightMcpClient } from '../../infrastructure/mcp/playwright/PlaywrightMcpClient';
import { RealPlaywrightMcpClient } from '../../infrastructure/mcp/playwright/RealPlaywrightMcpClient';
import { 
  ExecutionContextService, 
  getExecutionContext,
  DEFAULT_EXECUTION_CONFIG 
} from '../../application/execution/execution-context.service';
import { ExecuteActionUseCase } from '../../application/mcp/execute-action.usecase';
import { NavigateUseCase } from '../../application/mcp/navigate.usecase';
import { SnapshotUseCase } from '../../application/mcp/snapshot.usecase';
import { UIAction, UIActionType } from '../../domain/models/MappedStep';
import {
  CreateSessionBody,
  NavigateBody,
  HistoryNavigateBody,
  CaptureSnapshotBody,
  SearchSnapshotBody,
  ExecuteActionBody,
  ExecuteActionsBody,
  UIActionInput,
} from '../validators/mcp.validator';
import {
  CreateSessionResponse,
  SessionInfoResponse,
  NavigateResponse,
  CaptureSnapshotResponse,
  SearchSnapshotResponse,
  ExecuteActionResponse,
  ExecuteActionsResponse,
  ExecutionHistoryResponse,
  ExecutionRecordDto,
  UIActionDto,
} from '../dto/mcp.dto';
import { createLogger, ILogger } from '../../infrastructure/logging';

// Initialize logger
const logger: ILogger = createLogger({ level: 'info', format: 'json' });

// Initialize services
let mcpClient: PlaywrightMcpClient | RealPlaywrightMcpClient | null = null;
let executeActionUseCase: ExecuteActionUseCase | null = null;
let navigateUseCase: NavigateUseCase | null = null;
let snapshotUseCase: SnapshotUseCase | null = null;

// Use real MCP client (set to true to connect to actual Playwright MCP)
const USE_REAL_MCP = process.env.USE_REAL_MCP === 'true';

/**
 * Get or initialize MCP client and use cases
 */
function getMcpClient(): PlaywrightMcpClient | RealPlaywrightMcpClient {
  if (!mcpClient) {
    if (USE_REAL_MCP) {
      mcpClient = new RealPlaywrightMcpClient({
        serverName: 'playwright',
        serverType: 'playwright',
        connectionTimeout: 30000,
        requestTimeout: 30000,
        autoReconnect: true,
        maxReconnectAttempts: 3,
      });
    } else {
      mcpClient = new PlaywrightMcpClient({
        serverName: 'playwright',
        serverType: 'playwright',
        connectionTimeout: 30000,
        requestTimeout: 30000,
        autoReconnect: true,
        maxReconnectAttempts: 3,
      });
    }
  }
  return mcpClient;
}

function getExecuteActionUseCase(): ExecuteActionUseCase {
  if (!executeActionUseCase) {
    // Cast to PlaywrightMcpClient - both clients implement IMcpClient interface
    executeActionUseCase = new ExecuteActionUseCase(getMcpClient() as PlaywrightMcpClient);
  }
  return executeActionUseCase;
}

function getNavigateUseCase(): NavigateUseCase {
  if (!navigateUseCase) {
    // Cast to PlaywrightMcpClient - both clients implement IMcpClient interface
    navigateUseCase = new NavigateUseCase(getMcpClient() as PlaywrightMcpClient);
  }
  return navigateUseCase;
}

function getSnapshotUseCase(): SnapshotUseCase {
  if (!snapshotUseCase) {
    // Cast to PlaywrightMcpClient - both clients implement IMcpClient interface
    snapshotUseCase = new SnapshotUseCase(getMcpClient() as PlaywrightMcpClient);
  }
  return snapshotUseCase;
}

/**
 * Convert UIActionInput to UIAction
 */
function toUIAction(input: UIActionInput): UIAction {
  return {
    type: input.type as UIActionType,
    value: input.value,
    description: input.target || input.description,
    timeout: input.timeout,
    options: input.options,
  };
}

// ============================================================================
// Session Handlers
// ============================================================================

/**
 * Create a new execution session
 */
export async function createSession(
  req: Request<unknown, unknown, CreateSessionBody>,
  res: Response<CreateSessionResponse>
): Promise<void> {
  const { name, featureId, scenarioId, config } = req.body;

  logger.info('Creating new execution session', { name, featureId, scenarioId });

  const executionContext = getExecutionContext();
  const session = executionContext.createSession({
    name,
    featureId,
    scenarioId,
    config: config ? {
      ...DEFAULT_EXECUTION_CONFIG,
      ...config,
    } : undefined,
  });

  // Connect MCP client if not connected
  const client = getMcpClient();
  if (!client.isConnected()) {
    await client.connect();
  }

  res.status(201).json({
    sessionId: session.id,
    status: session.status,
    createdAt: session.createdAt.toISOString(),
  });
}

/**
 * Get session information
 */
export async function getSession(
  req: Request<{ sessionId: string }>,
  res: Response<SessionInfoResponse | { error: string }>
): Promise<void> {
  const { sessionId } = req.params;

  const executionContext = getExecutionContext();
  const session = executionContext.getSession(sessionId);

  if (!session) {
    res.status(404).json({ error: `Session ${sessionId} not found` });
    return;
  }

  const summary = executionContext.getSessionSummary(sessionId);

  res.json({
    sessionId: session.id,
    name: session.name,
    status: session.status,
    featureId: session.featureId,
    scenarioId: session.scenarioId,
    createdAt: session.createdAt.toISOString(),
    lastActivityAt: session.lastActivityAt.toISOString(),
    currentUrl: session.currentPageState?.url,
    currentTitle: session.currentPageState?.title,
    summary: {
      totalSteps: summary?.totalSteps || 0,
      successCount: summary?.successCount || 0,
      failedCount: summary?.failedCount || 0,
      pendingCount: summary?.pendingCount || 0,
    },
  });
}

/**
 * Delete a session
 */
export async function deleteSession(
  req: Request<{ sessionId: string }>,
  res: Response<{ success: boolean } | { error: string }>
): Promise<void> {
  const { sessionId } = req.params;

  const executionContext = getExecutionContext();
  const deleted = executionContext.deleteSession(sessionId);

  if (!deleted) {
    res.status(404).json({ error: `Session ${sessionId} not found` });
    return;
  }

  logger.info('Deleted execution session', { sessionId });
  res.json({ success: true });
}

/**
 * List all sessions
 */
export async function listSessions(
  _req: Request,
  res: Response<{ sessions: SessionInfoResponse[] }>
): Promise<void> {
  const executionContext = getExecutionContext();
  const sessions = executionContext.listSessions();

  const response = sessions.map(session => {
    const summary = executionContext.getSessionSummary(session.id);
    return {
      sessionId: session.id,
      name: session.name,
      status: session.status,
      featureId: session.featureId,
      scenarioId: session.scenarioId,
      createdAt: session.createdAt.toISOString(),
      lastActivityAt: session.lastActivityAt.toISOString(),
      currentUrl: session.currentPageState?.url,
      currentTitle: session.currentPageState?.title,
      summary: {
        totalSteps: summary?.totalSteps || 0,
        successCount: summary?.successCount || 0,
        failedCount: summary?.failedCount || 0,
        pendingCount: summary?.pendingCount || 0,
      },
    };
  });

  res.json({ sessions: response });
}

// ============================================================================
// Navigation Handlers
// ============================================================================

/**
 * Navigate to a URL
 */
export async function navigate(
  req: Request<unknown, unknown, NavigateBody>,
  res: Response<NavigateResponse>
): Promise<void> {
  const { sessionId, url, waitUntil, timeout, captureSnapshot } = req.body;

  logger.info('Navigating to URL', { sessionId, url });

  const useCase = getNavigateUseCase();
  const result = await useCase.execute({
    sessionId,
    url,
    waitUntil,
    timeout,
    captureSnapshot,
  });

  res.json({
    success: result.success,
    url: result.url,
    title: result.title,
    error: result.error,
    durationMs: result.durationMs,
    snapshotCaptured: !!result.pageState?.snapshot,
  });
}

/**
 * Navigate back or forward
 */
export async function navigateHistory(
  req: Request<unknown, unknown, HistoryNavigateBody>,
  res: Response<NavigateResponse>
): Promise<void> {
  const { sessionId, direction, captureSnapshot } = req.body;

  logger.info('Navigating history', { sessionId, direction });

  const useCase = getNavigateUseCase();
  const result = await useCase.navigateHistory({
    sessionId,
    direction,
    captureSnapshot,
  });

  res.json({
    success: result.success,
    url: result.url,
    title: result.title,
    error: result.error,
    durationMs: result.durationMs,
    snapshotCaptured: !!result.pageState?.snapshot,
  });
}

// ============================================================================
// Snapshot Handlers
// ============================================================================

/**
 * Capture page snapshot
 */
export async function captureSnapshot(
  req: Request<unknown, unknown, CaptureSnapshotBody>,
  res: Response<CaptureSnapshotResponse>
): Promise<void> {
  const { sessionId, includeHidden, captureScreenshot, screenshotOptions } = req.body;

  logger.info('Capturing snapshot', { sessionId, captureScreenshot });

  const useCase = getSnapshotUseCase();
  const result = await useCase.capture({
    sessionId,
    includeHidden,
    captureScreenshot,
    screenshotOptions,
  });

  res.json({
    success: result.success,
    url: result.url,
    title: result.title,
    rawSnapshot: result.rawSnapshot,
    error: result.error,
    durationMs: result.durationMs,
    stats: result.stats,
    screenshotCaptured: !!result.screenshot,
  });
}

/**
 * Get cached snapshot
 */
export async function getCachedSnapshot(
  req: Request<{ sessionId: string }>,
  res: Response<CaptureSnapshotResponse>
): Promise<void> {
  const { sessionId } = req.params;

  const useCase = getSnapshotUseCase();
  const result = useCase.getCached(sessionId);

  res.json({
    success: result.success,
    url: result.url,
    title: result.title,
    rawSnapshot: result.rawSnapshot,
    error: result.error,
    durationMs: result.durationMs,
    stats: result.stats,
    screenshotCaptured: !!result.screenshot,
  });
}

/**
 * Search elements in snapshot
 */
export async function searchSnapshot(
  req: Request<unknown, unknown, SearchSnapshotBody>,
  res: Response<SearchSnapshotResponse>
): Promise<void> {
  const { sessionId, query, role, minConfidence, maxResults } = req.body;

  logger.debug('Searching snapshot', { sessionId, query, role });

  const useCase = getSnapshotUseCase();
  const result = useCase.search({
    sessionId,
    query,
    role,
    minConfidence,
    maxResults,
  });

  res.json({
    success: result.success,
    results: result.results,
    totalResults: result.results.length,
    error: result.error,
  });
}

// ============================================================================
// Action Execution Handlers
// ============================================================================

/**
 * Execute a single action
 */
export async function executeAction(
  req: Request<unknown, unknown, ExecuteActionBody>,
  res: Response<ExecuteActionResponse>
): Promise<void> {
  const { sessionId, action, mappedStepId, refreshSnapshot } = req.body;

  logger.info('Executing action', { 
    sessionId, 
    actionType: action.type, 
    target: action.target 
  });

  const useCase = getExecuteActionUseCase();
  const result = await useCase.execute({
    sessionId,
    action: toUIAction(action),
    mappedStepId,
    refreshSnapshot,
    resolvedRef: action.ref,
    timeout: action.timeout,
  });

  const executionContext = getExecutionContext();
  const session = executionContext.getSession(sessionId);

  res.json({
    success: result.success,
    executionId: result.executionId,
    error: result.error,
    durationMs: result.durationMs,
    locatorResolution: result.locatorResolution ? {
      resolved: result.locatorResolution.resolved,
      ref: result.locatorResolution.ref,
      confidence: result.locatorResolution.confidence,
      element: result.locatorResolution.element,
      alternatives: result.locatorResolution.alternatives,
      failureReason: result.locatorResolution.failureReason,
    } : undefined,
    currentUrl: session?.currentPageState?.url,
  });
}

/**
 * Execute multiple actions
 */
export async function executeActions(
  req: Request<unknown, unknown, ExecuteActionsBody>,
  res: Response<ExecuteActionsResponse>
): Promise<void> {
  const { sessionId, actions, stopOnFailure } = req.body;

  logger.info('Executing multiple actions', { 
    sessionId, 
    actionCount: actions.length,
    stopOnFailure 
  });

  const useCase = getExecuteActionUseCase();
  const results: ExecuteActionsResponse['results'] = [];
  const startTime = Date.now();
  let successCount = 0;
  let failedCount = 0;
  let lastSuccess = true;

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    
    const result = await useCase.execute({
      sessionId,
      action: toUIAction(action),
      refreshSnapshot: i === 0 || !lastSuccess, // Refresh on first or after failure
      resolvedRef: action.ref,
      timeout: action.timeout,
    });

    lastSuccess = result.success;

    results.push({
      index: i,
      success: result.success,
      executionId: result.executionId,
      error: result.error,
      durationMs: result.durationMs,
    });

    if (result.success) {
      successCount++;
    } else {
      failedCount++;
      if (stopOnFailure) {
        break;
      }
    }
  }

  res.json({
    success: failedCount === 0,
    totalActions: actions.length,
    successCount,
    failedCount,
    results,
    totalDurationMs: Date.now() - startTime,
  });
}

// ============================================================================
// Execution History Handlers
// ============================================================================

/**
 * Get execution history for a session
 */
export async function getExecutionHistory(
  req: Request<{ sessionId: string }, unknown, unknown, { limit?: string; status?: string }>,
  res: Response<ExecutionHistoryResponse | { error: string }>
): Promise<void> {
  const { sessionId } = req.params;
  const { limit = '100', status } = req.query;

  const executionContext = getExecutionContext();
  const session = executionContext.getSession(sessionId);

  if (!session) {
    res.status(404).json({ error: `Session ${sessionId} not found` });
    return;
  }

  let records = executionContext.getExecutionHistory(sessionId);

  // Filter by status if provided
  if (status) {
    records = records.filter(r => r.status === status);
  }

  // Limit results
  records = records.slice(-parseInt(limit, 10));

  const summary = executionContext.getSessionSummary(sessionId);

  // Map to DTOs
  const recordDtos: ExecutionRecordDto[] = records.map(r => ({
    id: r.id,
    mappedStepId: r.mappedStepId,
    action: {
      type: r.action.type,
      value: r.action.value,
      description: r.action.description,
    } as UIActionDto,
    status: r.status,
    error: r.error,
    durationMs: r.durationMs,
    timestamp: r.timestamp.toISOString(),
    beforeUrl: r.beforeState?.url,
    afterUrl: r.afterState?.url,
  }));

  res.json({
    sessionId,
    records: recordDtos,
    totalRecords: records.length,
    summary: {
      totalSteps: summary?.totalSteps || 0,
      successCount: summary?.successCount || 0,
      failedCount: summary?.failedCount || 0,
      pendingCount: summary?.pendingCount || 0,
      executingCount: summary?.executingCount || 0,
      skippedCount: summary?.skippedCount || 0,
      totalDurationMs: summary?.totalDurationMs || 0,
    },
  });
}
