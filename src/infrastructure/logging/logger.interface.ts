/**
 * Logger interface
 * Defines the contract for logging implementations
 */

export interface ILogger {
  /**
   * Log an error message
   * @param message - The error message
   * @param meta - Additional metadata
   */
  error(message: string, meta?: Record<string, unknown>): void;

  /**
   * Log a warning message
   * @param message - The warning message
   * @param meta - Additional metadata
   */
  warn(message: string, meta?: Record<string, unknown>): void;

  /**
   * Log an info message
   * @param message - The info message
   * @param meta - Additional metadata
   */
  info(message: string, meta?: Record<string, unknown>): void;

  /**
   * Log a debug message
   * @param message - The debug message
   * @param meta - Additional metadata
   */
  debug(message: string, meta?: Record<string, unknown>): void;

  /**
   * Create a child logger with additional context
   * @param context - Additional context to include in all log messages
   */
  child(context: Record<string, unknown>): ILogger;
}

/**
 * Log levels supported by the logger
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  level: LogLevel;
  format: 'json' | 'pretty';
  serviceName?: string;
}
