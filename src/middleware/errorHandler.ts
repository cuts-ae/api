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
import { ErrorCodeKey, ERROR_CODES, createErrorResponse } from '../errors/error-codes';

/**
 * Custom Application Error class
 * Used for operational errors that are expected and should be handled gracefully
 *
 * @class AppError
 * @extends Error
 *
 * @property {string} code - Error code (e.g., "AUTH_001")
 * @property {number} statusCode - HTTP status code
 * @property {string} suggestedAction - What user should do
 * @property {boolean} isOperational - Flag to distinguish operational errors
 * @property {any} details - Additional error details
 *
 * @example
 * throw new AppError('AUTH_001');
 */
export class AppError extends Error {
  code: string;
  statusCode: number;
  suggestedAction: string;
  isOperational: boolean;
  details?: any;
  internalMessage: string;

  /**
   * Creates an AppError instance using error codes
   *
   * @param {ErrorCodeKey} errorCode - Error code from ERROR_CODES
   * @param {any} details - Optional additional error details
   */
  constructor(errorCode: ErrorCodeKey, details?: any) {
    const errorDef = ERROR_CODES[errorCode];
    super(errorDef.message);

    this.code = errorDef.code;
    this.statusCode = errorDef.httpStatus;
    this.suggestedAction = errorDef.suggestedAction;
    this.internalMessage = errorDef.internalMessage;
    this.isOperational = true;
    this.details = details;
    this.name = 'AppError';

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Legacy constructor for backwards compatibility
   * DEPRECATED: Use error codes instead
   */
  static createLegacy(message: string, statusCode: number, details?: any): AppError {
    const error = new AppError('SYS_001', details);
    error.message = message;
    error.statusCode = statusCode;
    error.suggestedAction = 'Please try again or contact support';
    return error;
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
  constructor(details?: any) {
    super('VAL_001', details);
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
  constructor(errorCode: ErrorCodeKey = 'AUTH_002', details?: any) {
    super(errorCode, details);
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
  constructor(errorCode: ErrorCodeKey = 'PERM_001', details?: any) {
    super(errorCode, details);
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
  constructor(errorCode: ErrorCodeKey = 'SYS_004', details?: any) {
    super(errorCode, details);
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
  constructor(errorCode: ErrorCodeKey = 'USER_002', details?: any) {
    super(errorCode, details);
    this.name = 'ConflictError';
  }
}

/**
 * Rate Limit Error class
 * For rate limiting errors
 *
 * @class RateLimitError
 * @extends AppError
 */
export class RateLimitError extends AppError {
  constructor(errorCode: ErrorCodeKey = 'RATE_001', details?: any) {
    super(errorCode, details);
    this.name = 'RateLimitError';
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
  let errorCode = 'SYS_001';
  let statusCode = 500;
  let message = 'Internal server error';
  let suggestedAction = 'An unexpected error occurred. Please try again later';
  let details = null;
  let internalMessage = 'Unexpected error occurred';

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
    errorCode = err.code;
    statusCode = err.statusCode;
    message = err.message;
    suggestedAction = err.suggestedAction;
    internalMessage = err.internalMessage;
    details = err.details;

    // Log operational errors at appropriate level
    if (statusCode >= 500) {
      requestLogger.error('Operational error (5xx)', { ...errorContext, errorCode, internalMessage });
    } else if (statusCode >= 400) {
      requestLogger.warn('Client error (4xx)', { ...errorContext, errorCode, internalMessage });
    }
  } else if (err instanceof DatabaseError) {
    // Database errors - serious but may be recoverable
    errorCode = 'DB_002';
    statusCode = 500;
    const dbError = ERROR_CODES.DB_002;
    message = dbError.message;
    suggestedAction = dbError.suggestedAction;
    internalMessage = dbError.internalMessage;
    requestLogger.error('Database error', {
      ...errorContext,
      errorCode,
      query: err.query,
      params: err.params,
    });
  } else if (err.name === 'ZodError') {
    // Zod validation errors
    errorCode = 'VAL_001';
    statusCode = 400;
    const valError = ERROR_CODES.VAL_001;
    message = valError.message;
    suggestedAction = valError.suggestedAction;
    internalMessage = valError.internalMessage;
    details = (err as any).errors;
    requestLogger.warn('Validation error', { ...errorContext, errorCode, details });
  } else if (err.name === 'JsonWebTokenError') {
    // JWT errors
    errorCode = 'AUTH_002';
    statusCode = 401;
    const authError = ERROR_CODES.AUTH_002;
    message = authError.message;
    suggestedAction = authError.suggestedAction;
    internalMessage = authError.internalMessage;
    requestLogger.securityEvent('Invalid JWT token', { ...errorContext, errorCode });
  } else if (err.name === 'TokenExpiredError') {
    // JWT expiration
    errorCode = 'AUTH_003';
    statusCode = 401;
    const authError = ERROR_CODES.AUTH_003;
    message = authError.message;
    suggestedAction = authError.suggestedAction;
    internalMessage = authError.internalMessage;
    requestLogger.warn('JWT token expired', { ...errorContext, errorCode });
  } else if (err.name === 'MulterError') {
    // File upload errors
    const multerErr = err as any;
    if (multerErr.code === 'LIMIT_FILE_SIZE') {
      errorCode = 'VAL_009';
      const valError = ERROR_CODES.VAL_009;
      statusCode = valError.httpStatus;
      message = valError.message;
      suggestedAction = valError.suggestedAction;
      internalMessage = valError.internalMessage;
    } else if (multerErr.code === 'LIMIT_UNEXPECTED_FILE') {
      errorCode = 'VAL_008';
      const valError = ERROR_CODES.VAL_008;
      statusCode = valError.httpStatus;
      message = valError.message;
      suggestedAction = valError.suggestedAction;
      internalMessage = valError.internalMessage;
    } else {
      errorCode = 'VAL_001';
      statusCode = 400;
      const valError = ERROR_CODES.VAL_001;
      message = valError.message;
      suggestedAction = valError.suggestedAction;
      internalMessage = 'File upload error: ' + err.message;
    }
    details = { error: err.message };
    requestLogger.warn('File upload error', { ...errorContext, errorCode });
  } else {
    // Unexpected programming errors - critical
    errorCode = 'SYS_001';
    statusCode = 500;
    const sysError = ERROR_CODES.SYS_001;
    message = sysError.message;
    suggestedAction = sysError.suggestedAction;
    internalMessage = sysError.internalMessage;
    requestLogger.error('UNEXPECTED ERROR - Programming bug detected', { ...errorContext, errorCode });

    // In production, you might want to trigger alerts here
    // e.g., send to error tracking service (Sentry, Rollbar, etc.)
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service
      // notifyErrorTrackingService(err, errorContext);
    }
  }

  // Prepare response with error codes
  const errorResponse: any = {
    success: false,
    error: message,
    code: errorCode,
    message: message,
    suggestedAction: suggestedAction,
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
      errorResponse.internalMessage = internalMessage;
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
  const error = new NotFoundError('SYS_005');
  next(error);
};
