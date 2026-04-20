/**
 * MCP Routes
 * API routes for MCP tool execution
 */

import { Router } from 'express';
import { validateRequest } from '../../core/middlewares/validateRequest';
import {
  createSessionValidator,
  getSessionValidator,
  deleteSessionValidator,
  navigateValidator,
  historyNavigateValidator,
  captureSnapshotValidator,
  searchSnapshotValidator,
  getCachedSnapshotValidator,
  executeActionValidator,
  executeActionsValidator,
  getExecutionHistoryValidator,
} from '../validators/mcp.validator';
import {
  createSession,
  getSession,
  deleteSession,
  listSessions,
  navigate,
  navigateHistory,
  captureSnapshot,
  getCachedSnapshot,
  searchSnapshot,
  executeAction,
  executeActions,
  getExecutionHistory,
} from '../controllers/mcp.controller';
import * as PlaywrightController from '../controllers/mcp/playwright.controller';

const router = Router();

// ============================================================================
// Session Routes
// ============================================================================

/**
 * @route   POST /api/mcp/sessions
 * @desc    Create a new execution session
 * @body    { name?, featureId?, scenarioId?, config? }
 */
router.post(
  '/sessions',
  validateRequest(createSessionValidator),
  createSession
);

/**
 * @route   GET /api/mcp/sessions
 * @desc    List all sessions
 */
router.get('/sessions', listSessions);

/**
 * @route   GET /api/mcp/sessions/:sessionId
 * @desc    Get session information
 * @params  sessionId - Session UUID
 */
router.get(
  '/sessions/:sessionId',
  validateRequest(getSessionValidator),
  getSession
);

/**
 * @route   DELETE /api/mcp/sessions/:sessionId
 * @desc    Delete a session
 * @params  sessionId - Session UUID
 */
router.delete(
  '/sessions/:sessionId',
  validateRequest(deleteSessionValidator),
  deleteSession
);

// ============================================================================
// Navigation Routes (legacy - kept for backward compatibility)
// ============================================================================

/**
 * @route   POST /api/mcp/navigate
 * @desc    Navigate to a URL
 * @body    { sessionId, url, waitUntil?, timeout?, captureSnapshot? }
 */
router.post(
  '/navigate',
  validateRequest(navigateValidator),
  navigate
);

/**
 * @route   POST /api/mcp/navigate/history
 * @desc    Navigate back or forward in history
 * @body    { sessionId, direction: 'back' | 'forward', captureSnapshot? }
 */
router.post(
  '/navigate/history',
  validateRequest(historyNavigateValidator),
  navigateHistory
);

// ============================================================================
// Snapshot Routes
// ============================================================================

/**
 * @route   POST /api/mcp/snapshot
 * @desc    Capture page snapshot
 * @body    { sessionId, includeHidden?, captureScreenshot?, screenshotOptions? }
 */
router.post(
  '/snapshot',
  validateRequest(captureSnapshotValidator),
  captureSnapshot
);

/**
 * @route   GET /api/mcp/snapshot/:sessionId
 * @desc    Get cached snapshot for session
 * @params  sessionId - Session UUID
 */
router.get(
  '/snapshot/:sessionId',
  validateRequest(getCachedSnapshotValidator),
  getCachedSnapshot
);

/**
 * @route   POST /api/mcp/snapshot/search
 * @desc    Search elements in snapshot
 * @body    { sessionId, query, role?, minConfidence?, maxResults? }
 */
router.post(
  '/snapshot/search',
  validateRequest(searchSnapshotValidator),
  searchSnapshot
);

// ============================================================================
// Action Execution Routes (legacy)
// ============================================================================

/**
 * @route   POST /api/mcp/execute
 * @desc    Execute a single action
 * @body    { sessionId, action, mappedStepId?, refreshSnapshot? }
 */
router.post(
  '/execute',
  validateRequest(executeActionValidator),
  executeAction
);

/**
 * @route   POST /api/mcp/execute/batch
 * @desc    Execute multiple actions
 * @body    { sessionId, actions[], stopOnFailure? }
 */
router.post(
  '/execute/batch',
  validateRequest(executeActionsValidator),
  executeActions
);

// ============================================================================
// Execution History Routes
// ============================================================================

/**
 * @route   GET /api/mcp/sessions/:sessionId/history
 * @desc    Get execution history for a session
 * @params  sessionId - Session UUID
 * @query   limit?, status?
 */
router.get(
  '/sessions/:sessionId/history',
  validateRequest(getExecutionHistoryValidator),
  getExecutionHistory
);

// ============================================================================
// Playwright Individual Tool Routes
// ============================================================================

// Navigation
router.post('/playwright/navigate', PlaywrightController.navigateHandler);
router.post('/playwright/navigate-back', PlaywrightController.navigateBackHandler);
router.post('/playwright/navigate-forward', PlaywrightController.navigateForwardHandler);

// Interactions
router.post('/playwright/click', PlaywrightController.clickHandler);
router.post('/playwright/type', PlaywrightController.typeHandler);
router.post('/playwright/press-key', PlaywrightController.pressKeyHandler);
router.post('/playwright/select-option', PlaywrightController.selectOptionHandler);
router.post('/playwright/hover', PlaywrightController.hoverHandler);
router.post('/playwright/drag', PlaywrightController.dragHandler);
router.post('/playwright/file-upload', PlaywrightController.fileUploadHandler);
router.post('/playwright/handle-dialog', PlaywrightController.handleDialogHandler);

// Browser Management
router.post('/playwright/close', PlaywrightController.closeHandler);
router.post('/playwright/resize', PlaywrightController.resizeHandler);

// Content & Information Retrieval
router.post('/playwright/take-screenshot', PlaywrightController.takeScreenshotHandler);
router.post('/playwright/snapshot', PlaywrightController.snapshotHandler);
router.post('/playwright/console-messages', PlaywrightController.consoleMessagesHandler);
router.post('/playwright/network-requests', PlaywrightController.networkRequestsHandler);
router.post('/playwright/wait-for', PlaywrightController.waitForHandler);

// Tab Management
router.post('/playwright/tab-list', PlaywrightController.tabListHandler);
router.post('/playwright/tab-new', PlaywrightController.tabNewHandler);
router.post('/playwright/tab-select', PlaywrightController.tabSelectHandler);
router.post('/playwright/tab-close', PlaywrightController.tabCloseHandler);

export default router;
