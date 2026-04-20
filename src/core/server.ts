/**
 * Server bootstrap and startup
 * Handles application initialization and graceful shutdown
 */

import { createApp, AppDependencies } from './app';
import { loadConfig, getConfig } from './config';
import { createLogger, ILogger } from '../infrastructure/logging';

/**
 * Initializes all application dependencies
 * @returns Application dependencies object
 */
function initializeDependencies(): AppDependencies {
  const config = loadConfig();
  
  const logger = createLogger({
    level: config.logging.level as 'error' | 'warn' | 'info' | 'debug',
    format: config.logging.format as 'json' | 'pretty',
    serviceName: 'no-code-automation',
  });

  return { config, logger };
}

/**
 * Starts the HTTP server
 * @param dependencies - Application dependencies
 */
async function startServer(dependencies: AppDependencies): Promise<void> {
  const { config, logger } = dependencies;
  const app = createApp(dependencies);

  const server = app.listen(config.server.port, () => {
    logger.info(`🚀 Server started`, {
      port: config.server.port,
      environment: config.env.NODE_ENV,
      host: config.server.host,
    });
  });

  // Graceful shutdown handlers
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, starting graceful shutdown...`);
    
    server.close((err) => {
      if (err) {
        logger.error('Error during server shutdown', { error: err.message });
        process.exit(1);
      }
      
      logger.info('Server closed successfully');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught exception', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Unhandled rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
    });
  });
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    const dependencies = initializeDependencies();
    await startServer(dependencies);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
main();
