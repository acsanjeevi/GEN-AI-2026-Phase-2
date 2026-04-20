/**
 * Winston logger implementation
 * Provides structured logging with file and console transports
 */

import winston from 'winston';
import path from 'path';
import { ILogger, LoggerConfig, LogLevel } from './logger.interface';

/**
 * Custom format for pretty-printing logs in development
 */
const prettyFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

/**
 * JSON format for production logs
 */
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Winston logger wrapper implementing ILogger interface
 */
export class WinstonLogger implements ILogger {
  private logger: winston.Logger;
  private context: Record<string, unknown>;

  constructor(config: LoggerConfig, context: Record<string, unknown> = {}) {
    this.context = context;
    const logsDir = path.resolve(__dirname, '../../../logs');

    const format = config.format === 'pretty' ? prettyFormat : jsonFormat;

    this.logger = winston.createLogger({
      level: config.level,
      format,
      defaultMeta: {
        service: config.serviceName || 'no-code-automation',
        ...context,
      },
      transports: [
        // Console transport
        new winston.transports.Console(),
        // Error log file
        new winston.transports.File({
          filename: path.join(logsDir, 'error.log'),
          level: 'error',
        }),
        // Combined log file
        new winston.transports.File({
          filename: path.join(logsDir, 'combined.log'),
        }),
        // App-specific log file
        new winston.transports.File({
          filename: path.join(logsDir, 'app.log'),
        }),
      ],
    });
  }

  /**
   * Log an error message
   */
  error(message: string, meta?: Record<string, unknown>): void {
    this.logger.error(message, meta);
  }

  /**
   * Log a warning message
   */
  warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(message, meta);
  }

  /**
   * Log an info message
   */
  info(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(message, meta);
  }

  /**
   * Log a debug message
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(message, meta);
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Record<string, unknown>): ILogger {
    const childLogger = new WinstonLogger(
      {
        level: this.logger.level as LogLevel,
        format: 'json',
        serviceName: (this.context.service as string) || 'no-code-automation',
      },
      { ...this.context, ...context }
    );
    return childLogger;
  }
}

/**
 * Creates a configured logger instance
 * @param config - Logger configuration
 * @returns Configured ILogger instance
 */
export function createLogger(config: LoggerConfig): ILogger {
  return new WinstonLogger(config);
}
