/**
 * Execution Routes
 * API routes for test execution endpoints
 */

import { Router } from 'express';
import {
  createExecutionHandler,
  startExecutionHandler,
  getExecutionStatusHandler,
  getExecutionHandler,
  cancelExecutionHandler,
  retryStepHandler,
  listExecutionsHandler,
  getArtifactsHandler,
  listArtifactFilesHandler,
  downloadArtifactHandler,
  deleteExecutionHandler,
  getRunningExecutionsHandler,
} from '../controllers/execution.controller';
import {
  createExecutionValidator,
  startExecutionValidator,
  getExecutionStatusValidator,
  getExecutionValidator,
  cancelExecutionValidator,
  retryStepValidator,
  listExecutionsValidator,
  getArtifactsValidator,
  downloadArtifactValidator,
  deleteExecutionValidator,
} from '../validators/execution.validator';

const router = Router();

/**
 * @route   POST /api/execution/run
 * @desc    Create and start a new test execution
 * @access  Public
 */
router.post('/run', createExecutionValidator, createExecutionHandler);

/**
 * @route   GET /api/execution/list
 * @desc    List all executions with optional filters
 * @access  Public
 */
router.get('/list', listExecutionsValidator, listExecutionsHandler);

/**
 * @route   GET /api/execution/running
 * @desc    Get all currently running executions
 * @access  Public
 */
router.get('/running', getRunningExecutionsHandler);

/**
 * @route   GET /api/execution/:id
 * @desc    Get full execution details
 * @access  Public
 */
router.get('/:id', getExecutionValidator, getExecutionHandler);

/**
 * @route   GET /api/execution/:id/status
 * @desc    Get execution status (lightweight)
 * @access  Public
 */
router.get('/:id/status', getExecutionStatusValidator, getExecutionStatusHandler);

/**
 * @route   POST /api/execution/:id/start
 * @desc    Start or resume a test execution
 * @access  Public
 */
router.post('/:id/start', startExecutionValidator, startExecutionHandler);

/**
 * @route   POST /api/execution/:id/cancel
 * @desc    Cancel a running execution
 * @access  Public
 */
router.post('/:id/cancel', cancelExecutionValidator, cancelExecutionHandler);

/**
 * @route   POST /api/execution/:id/retry/:itemId
 * @desc    Retry a failed scenario
 * @access  Public
 */
router.post('/:id/retry/:itemId', retryStepValidator, retryStepHandler);

/**
 * @route   GET /api/execution/:id/artifacts
 * @desc    Get artifacts for an execution
 * @access  Public
 */
router.get('/:id/artifacts', getArtifactsValidator, getArtifactsHandler);

/**
 * @route   GET /api/execution/:id/artifacts/files
 * @desc    List artifact files directly from disk
 * @access  Public
 */
router.get('/:id/artifacts/files', getArtifactsValidator, listArtifactFilesHandler);

/**
 * @route   GET /api/execution/:id/artifacts/:artifactId
 * @desc    Download a specific artifact
 * @access  Public
 */
router.get('/:id/artifacts/:artifactId', downloadArtifactValidator, downloadArtifactHandler);

/**
 * @route   DELETE /api/execution/:id
 * @desc    Delete an execution and its artifacts
 * @access  Public
 */
router.delete('/:id', deleteExecutionValidator, deleteExecutionHandler);

export const executionRoutes = router;
