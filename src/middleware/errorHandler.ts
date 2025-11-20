/**
 * Error Handling Middleware
 *
 * Provides centralized error handling with:
 * - Comprehensive error logging
 * - Error classification (operational vs programming errors)
 * - Structured error responses
 * - Stack trace logging
 * - Error context capture
 * - Security-safe error messages
 *
 * This module distinguishes between:
 * - Operational errors: Expected errors (validation, not found, etc.)
 * - Programming errors: Unexpected bugs that need immediate attention
 *
 * @module middleware/errorHandler
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { RequestWithLogger } from './request-logger';

/**
 * Custom Application Error class
 * Used for operational errors that are expected and should be handled gracefully
 *
 * @class AppError
 * @extends Error
 *
 * @property {number} statusCode - HTTP status code
 * @property {boolean} isOperational - Flag to distinguish operational errors
 * @property {any} details - Additional error details
 *
 * @example
 * throw new AppError('User not found', 404);
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  details?: any;

  /**
   * Creates an AppError instance
   *
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {any} details - Optional additional error details
   */
  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error class
 * Specifically for input validation errors
 *
 * @class ValidationError
 * @extends AppError
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication Error class
 * For authentication-related errors
 *
 * @class AuthenticationError
 * @extends AppError
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization Error class
 * For authorization/permission errors
 *
 * @class AuthorizationError
 * @extends AppError
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not Found Error class
 * For resource not found errors
 *
 * @class NotFoundError
 * @extends AppError
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict Error class
 * For resource conflict errors (e.g., duplicate entries)
 *
 * @class ConflictError
 * @extends AppError
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * Database Error class
 * For database-related errors
 *
 * @class DatabaseError
 * @extends Error
 */
export class DatabaseError extends Error {
  query?: string;
  params?: any;

  constructor(message: string, query?: string, params?: any) {
    super(message);
    this.name = 'DatabaseError';
    this.query = query;
    this.params = params;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Main error handling middleware
 *
 * This middleware:
 * 1. Logs the error with full context
 * 2. Determines error type and appropriate response
 * 3. Sends structured error response to client
 * 4. Protects sensitive information in production
 * 5. Alerts for critical/unexpected errors
 *
 * @param {Error | AppError} err - Error object
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 *
 * @example
 * app.use(errorHandler); // Must be last middleware
 */
export const errorHandler = (
  err: Error | AppError | DatabaseError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Get logger from request (with correlation ID) or use default
  const requestLogger = (req as RequestWithLogger).logger || logger;

  // Determine if this is an operational error
  const isOperational = err instanceof AppError && err.isOperational;

  // Default error values
  let statusCode = 500;
  let message = 'Internal server error';
  let details = null;

  // Build error context for logging
  const errorContext = {
    name: err.name,
    message: err.message,
    stack: err.stack,
    statusCode,
    isOperational,
    url: req.url,
    method: req.method,
    userId: (req as any).user?.id,
    ip: req.ip,
    userAgent: req.headers ? req.headers['user-agent'] : undefined,
    correlationId: (req as RequestWithLogger).correlationId,
  };

  // Handle specific error types
  if (err instanceof AppError) {
    // Operational errors - expected and handled
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;

    // Log operational errors at appropriate level
    if (statusCode >= 500) {
      requestLogger.error('Operational error (5xx)', errorContext);
    } else if (statusCode >= 400) {
      requestLogger.warn('Client error (4xx)', errorContext);
    }
  } else if (err instanceof DatabaseError) {
    // Database errors - serious but may be recoverable
    statusCode = 500;
    message = 'Database operation failed';
    requestLogger.error('Database error', {
      ...errorContext,
      query: err.query,
      params: err.params,
    });
  } else if (err.name === 'ZodError') {
    // Zod validation errors
    statusCode = 400;
    message = 'Validation error';
    details = (err as any).errors;
    requestLogger.warn('Validation error', { ...errorContext, details });
  } else if (err.name === 'JsonWebTokenError') {
    // JWT errors
    statusCode = 401;
    message = 'Invalid authentication token';
    requestLogger.securityEvent('Invalid JWT token', errorContext);
  } else if (err.name === 'TokenExpiredError') {
    // JWT expiration
    statusCode = 401;
    message = 'Authentication token expired';
    requestLogger.warn('JWT token expired', errorContext);
  } else if (err.name === 'MulterError') {
    // File upload errors
    statusCode = 400;
    message = 'File upload error';
    details = { error: err.message };
    requestLogger.warn('File upload error', errorContext);
  } else {
    // Unexpected programming errors - critical
    statusCode = 500;
    message = 'Internal server error';
    requestLogger.error('UNEXPECTED ERROR - Programming bug detected', errorContext);

    // In production, you might want to trigger alerts here
    // e.g., send to error tracking service (Sentry, Rollbar, etc.)
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service
      // notifyErrorTrackingService(err, errorContext);
    }
  }

  // Prepare response
  const errorResponse: any = {
    success: false,
    error: message,
    statusCode,
    correlationId: (req as RequestWithLogger).correlationId,
  };

  // Include details in development or for client errors
  if (process.env.NODE_ENV === 'development' || (statusCode >= 400 && statusCode < 500)) {
    if (details) {
      errorResponse.details = details;
    }
    // Include stack trace only in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = err.stack;
    }
  }

  // Send response
  res.status(statusCode).json(errorResponse);
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch promise rejections
 *
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 *
 * @example
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await getUsers();
 *   res.json(users);
 * }));
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Not Found handler
 * Handles 404 errors for undefined routes
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const error = new NotFoundError('Route');
  next(error);
};
