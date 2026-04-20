/**
 * API routes index
 * Aggregates all route modules
 */

import { Router } from 'express';
import featureRoutes from './feature.routes';
import mappingRoutes from './mapping.routes';
import mcpRoutes from './mcp.routes';
import llmRoutes from './llm.routes';
import { executionRoutes } from './execution.routes';

const router = Router();

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Feature parsing routes
 * /api/feature/*
 */
router.use('/feature', featureRoutes);

/**
 * Step mapping routes
 * /api/mapping/*
 */
router.use('/mapping', mappingRoutes);

/**
 * MCP tool execution routes
 * /api/mcp/*
 */
router.use('/mcp', mcpRoutes);

/**
 * LLM integration routes
 * /api/llm/*
 */
router.use('/llm', llmRoutes);

/**
 * Test execution routes
 * /api/execution/*
 */
router.use('/execution', executionRoutes);

export default router;
