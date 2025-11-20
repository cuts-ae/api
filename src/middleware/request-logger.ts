/**
 * Request Logging Middleware
 *
 * Provides comprehensive HTTP request/response logging with:
 * - Correlation ID generation for request tracing
 * - Request details (method, URL, headers, body)
 * - Response details (status code, duration)
 * - Performance metrics
 * - User information (if authenticated)
 * - Error tracking
 *
 * This middleware attaches a correlation ID to each request which can be used
 * to trace the request through the entire application stack.
 *
 * @module middleware/request-logger
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Extended Express Request interface with correlation ID and request logger
 * This allows us to use the correlation ID throughout the request lifecycle
 */
export interface RequestWithLogger extends Request {
  correlationId: string;
  logger: typeof logger;
  startTime: number;
}

/**
 * Request logging middleware
 *
 * This middleware:
 * 1. Generates a unique correlation ID for the request
 * 2. Creates a child logger with the correlation ID
 * 3. Logs the incoming request details
 * 4. Tracks request duration
 * 5. Logs the response details
 * 6. Handles errors gracefully
 *
 * The correlation ID is also sent in the response headers as 'X-Correlation-ID'
 * for client-side tracking and debugging.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 *
 * @example
 * app.use(requestLogger);
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Generate correlation ID (use existing from header or create new)
  const correlationId =
    (req.headers['x-correlation-id'] as string) ||
    logger.generateCorrelationId();

  // Attach correlation ID and logger to request object
  const extReq = req as RequestWithLogger;
  extReq.correlationId = correlationId;
  extReq.logger = logger.child(correlationId);
  extReq.startTime = Date.now();

  // Add correlation ID to response headers
  res.setHeader('X-Correlation-ID', correlationId);

  // Log incoming request
  extReq.logger.http('Incoming request', {
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    // Log user ID if authenticated (added by auth middleware)
    userId: (req as any).user?.id,
    // Don't log sensitive data like passwords
    body: sanitizeBody(req.body),
  });

  // Capture the original res.end function
  const originalEnd = res.end;

  // Override res.end to log response
  res.end = function (chunk?: any, encoding?: any, callback?: any): Response {
    // Calculate request duration
    const duration = Date.now() - extReq.startTime;

    // Log response
    extReq.logger.apiRequest(
      req.method,
      req.url,
      res.statusCode,
      duration,
      {
        userId: (req as any).user?.id,
        contentLength: res.get('content-length'),
      }
    );

    // Performance warning for slow requests (> 1 second)
    if (duration > 1000) {
      extReq.logger.warn(`Slow request detected: ${req.method} ${req.url}`, {
        duration,
        threshold: 1000,
      });
    }

    // Call original res.end
    return originalEnd.call(this, chunk, encoding, callback);
  };

  // Handle errors in the request pipeline
  res.on('error', (error) => {
    extReq.logger.error('Response error', {
      error: error.message,
      stack: error.stack,
      method: req.method,
      url: req.url,
    });
  });

  next();
};

/**
 * Sanitize request body to remove sensitive information
 * Prevents logging of passwords, tokens, and other sensitive data
 *
 * @param {any} body - Request body object
 * @returns {any} Sanitized body object
 *
 * @example
 * const sanitized = sanitizeBody({ email: 'user@example.com', password: '12345' });
 * // Returns: { email: 'user@example.com', password: '[REDACTED]' }
 */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  // List of sensitive field names to redact
  const sensitiveFields = [
    'password',
    'confirmPassword',
    'token',
    'accessToken',
    'refreshToken',
    'apiKey',
    'secret',
    'creditCard',
    'ssn',
    'cvv',
  ];

  // Create a shallow copy to avoid modifying original
  const sanitized = { ...body };

  // Redact sensitive fields
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Skip logging for specific routes
 * Useful for health checks and other high-frequency, low-value endpoints
 *
 * @param {string[]} paths - Array of paths to skip logging
 * @returns {Function} Middleware function
 *
 * @example
 * app.use(skipLoggingFor(['/health', '/metrics']));
 * app.use(requestLogger);
 */
export const skipLoggingFor = (paths: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (paths.includes(req.path)) {
      // Skip logging by setting a flag
      (req as any).skipLogging = true;
    }
    next();
  };
};

/**
 * Conditional request logger that respects skip flag
 * Use this if you want to selectively skip logging for certain routes
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export const conditionalRequestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if ((req as any).skipLogging) {
    return next();
  }
  return requestLogger(req, res, next);
};

export default requestLogger;
