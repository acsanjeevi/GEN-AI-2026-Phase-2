/**
 * Express application setup
 * Configures middleware, routes, and error handling
 */

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { ILogger } from '../infrastructure/logging';
import { AppConfig } from './config';
import { errorHandler } from './middlewares/errorHandler';
import { requestLogger } from './middlewares/requestLogger';
import { ApiResponse, HealthCheckResponse } from './types';
import apiRoutes from '../api/routes';

/**
 * Application dependencies interface
 */
export interface AppDependencies {
  config: AppConfig;
  logger: ILogger;
}

/**
 * Creates and configures the Express application
 * @param dependencies - Application dependencies
 * @returns Configured Express application
 */
export function createApp(dependencies: AppDependencies): Application {
  const { config, logger } = dependencies;
  const app = express();

  // CORS - Allow requests from frontend dev server (Vite uses 517x ports)
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      
      // Allow any localhost port starting with 517x
      if (/^http:\/\/(localhost|127\.0\.0\.1):517\d+$/.test(origin)) {
        return callback(null, true);
      }
      
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }));

  // Basic middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use(requestLogger(logger));

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    const response: ApiResponse<HealthCheckResponse> = {
      success: true,
      data: {
        status: 'healthy',
        version: '1.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        services: [
          { name: 'api', status: 'up' },
          { name: 'mcp-playwright', status: config.mcp.playwright.enabled ? 'up' : 'down' },
        ],
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
    res.json(response);
  });

  // Root endpoint
  app.get('/', (_req: Request, res: Response) => {
    const response: ApiResponse<{ message: string; documentation: string }> = {
      success: true,
      data: {
        message: 'No-Code UI Automation Platform API',
        documentation: '/api/docs',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
    res.json(response);
  });

  // Serve artifacts statically
  const artifactsPath = path.resolve(process.cwd(), 'artifacts');
  app.use('/artifacts', express.static(artifactsPath, {
    setHeaders: (res, filePath) => {
      // Set appropriate content types
      if (filePath.endsWith('.webm')) {
        res.setHeader('Content-Type', 'video/webm');
      } else if (filePath.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
      } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
        res.setHeader('Content-Type', 'image/jpeg');
      }
    },
  }));

  // API routes
  app.use('/api', apiRoutes);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
    res.status(404).json(response);
  });

  // Error handling middleware (must be last)
  app.use(errorHandler(logger));

  logger.info('Express application configured', {
    environment: config.env.NODE_ENV,
  });

  return app;
}
