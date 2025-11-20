/**
 * Professional-grade logging utility using Winston
 *
 * This module provides structured logging capabilities for the application with:
 * - Multiple log levels (error, warn, info, http, debug)
 * - Correlation IDs for request tracing
 * - Daily rotating file logs
 * - Separate error log files
 * - JSON structured logging for production
 * - Colored console output for development
 * - Performance metrics
 * - Security event tracking
 *
 * @module utils/logger
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Log levels used throughout the application
 * - error: Critical errors that need immediate attention
 * - warn: Warning messages for potentially harmful situations
 * - info: Informational messages about application state
 * - http: HTTP request/response logging
 * - debug: Detailed debug information
 */
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

/**
 * Color mapping for console output
 * Makes logs easier to read during development
 */
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Register colors with Winston
winston.addColors(colors);

/**
 * Determine current log level based on environment
 * - Development: debug (show all logs)
 * - Production: info (hide debug logs)
 */
const level = (): string => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

/**
 * Custom format for development console output
 * Includes timestamp, log level, and message with colors
 */
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${info.correlationId ? ` [${info.correlationId}]` : ''}`
  )
);

/**
 * Custom format for production JSON logging
 * Structured format for log aggregation services (ELK, Datadog, etc.)
 */
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Daily rotating file transport for all logs
 * - Rotates daily at midnight
 * - Keeps logs for 14 days
 * - Compresses old logs
 * - Maximum 20MB per file
 */
const fileRotateTransport: DailyRotateFile = new DailyRotateFile({
  filename: path.join('logs', 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: prodFormat,
  level: 'info',
});

/**
 * Daily rotating file transport for error logs only
 * Separate file for easy error monitoring
 */
const errorFileRotateTransport: DailyRotateFile = new DailyRotateFile({
  filename: path.join('logs', 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  format: prodFormat,
  level: 'error',
});

/**
 * Transport configuration based on environment
 * - Development: Console only with colors
 * - Production: File rotation + console
 */
const transports = (): winston.transport[] => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';

  if (isDevelopment) {
    return [
      new winston.transports.Console({
        format: devFormat,
      }),
    ];
  }

  return [
    new winston.transports.Console({
      format: prodFormat,
    }),
    fileRotateTransport,
    errorFileRotateTransport,
  ];
};

/**
 * Main Winston logger instance
 * Configured with custom levels, formats, and transports
 */
const Logger = winston.createLogger({
  level: level(),
  levels,
  transports: transports(),
  // Don't exit on error
  exitOnError: false,
  // Silent during testing
  silent: process.env.NODE_ENV === 'test',
});

/**
 * Enhanced logger interface with additional utility methods
 */
export interface ILogger {
  error(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  http(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;

  // Performance tracking
  startTimer(label: string): () => void;

  // Security events
  securityEvent(event: string, meta?: any): void;

  // Database operations
  dbQuery(query: string, duration: number, meta?: any): void;

  // API requests
  apiRequest(method: string, url: string, statusCode: number, duration: number, meta?: any): void;

  // Generate correlation ID
  generateCorrelationId(): string;

  // Child logger with correlation ID
  child(correlationId: string): ILogger;
}

/**
 * Creates a child logger with correlation ID for request tracing
 *
 * @param {string} correlationId - Unique identifier for the request
 * @returns {ILogger} Logger instance with correlation ID attached
 *
 * @example
 * const requestLogger = logger.child(req.correlationId);
 * requestLogger.info('Processing order', { orderId: '123' });
 */
const createChildLogger = (correlationId: string): ILogger => {
  const childLogger = Logger.child({ correlationId });

  return {
    error: (message: string, meta?: any) => childLogger.error(message, meta),
    warn: (message: string, meta?: any) => childLogger.warn(message, meta),
    info: (message: string, meta?: any) => childLogger.info(message, meta),
    http: (message: string, meta?: any) => childLogger.http(message, meta),
    debug: (message: string, meta?: any) => childLogger.debug(message, meta),

    startTimer: (label: string) => {
      const start = Date.now();
      return () => {
        const duration = Date.now() - start;
        childLogger.debug(`${label} completed in ${duration}ms`);
      };
    },

    securityEvent: (event: string, meta?: any) => {
      childLogger.warn(`SECURITY: ${event}`, { ...meta, security: true });
    },

    dbQuery: (query: string, duration: number, meta?: any) => {
      childLogger.debug(`DB Query: ${query}`, { duration, ...meta });
    },

    apiRequest: (method: string, url: string, statusCode: number, duration: number, meta?: any) => {
      childLogger.http(`${method} ${url} ${statusCode}`, { duration, ...meta });
    },

    generateCorrelationId: () => uuidv4(),

    child: (newCorrelationId: string) => createChildLogger(newCorrelationId),
  };
};

/**
 * Main logger export with all utility methods
 */
const logger: ILogger = {
  error: (message: string, meta?: any) => Logger.error(message, meta),
  warn: (message: string, meta?: any) => Logger.warn(message, meta),
  info: (message: string, meta?: any) => Logger.info(message, meta),
  http: (message: string, meta?: any) => Logger.http(message, meta),
  debug: (message: string, meta?: any) => Logger.debug(message, meta),

  /**
   * Start a performance timer
   * Returns a function that logs the elapsed time when called
   *
   * @param {string} label - Label for the operation being timed
   * @returns {Function} Function to call when operation completes
   *
   * @example
   * const timer = logger.startTimer('Database query');
   * // ... perform operation ...
   * timer(); // Logs "Database query completed in Xms"
   */
  startTimer: (label: string) => {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      Logger.debug(`${label} completed in ${duration}ms`);
    };
  },

  /**
   * Log security-related events
   * These are logged at WARN level for visibility
   *
   * @param {string} event - Description of the security event
   * @param {any} meta - Additional metadata about the event
   *
   * @example
   * logger.securityEvent('Failed login attempt', {
   *   email: 'user@example.com',
   *   ip: req.ip
   * });
   */
  securityEvent: (event: string, meta?: any) => {
    Logger.warn(`SECURITY: ${event}`, { ...meta, security: true });
  },

  /**
   * Log database query operations
   * Includes query and execution time
   *
   * @param {string} query - SQL query or description
   * @param {number} duration - Query execution time in milliseconds
   * @param {any} meta - Additional metadata
   */
  dbQuery: (query: string, duration: number, meta?: any) => {
    Logger.debug(`DB Query: ${query}`, { duration, ...meta });
  },

  /**
   * Log API request/response
   *
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {number} statusCode - Response status code
   * @param {number} duration - Request duration in milliseconds
   * @param {any} meta - Additional metadata
   */
  apiRequest: (method: string, url: string, statusCode: number, duration: number, meta?: any) => {
    Logger.http(`${method} ${url} ${statusCode}`, { duration, ...meta });
  },

  /**
   * Generate a unique correlation ID for request tracing
   *
   * @returns {string} UUID v4 correlation ID
   */
  generateCorrelationId: () => uuidv4(),

  /**
   * Create a child logger with correlation ID
   * All logs from this child will include the correlation ID
   *
   * @param {string} correlationId - Unique identifier for correlation
   * @returns {ILogger} Child logger instance
   */
  child: (correlationId: string) => createChildLogger(correlationId),
};

export default logger;
