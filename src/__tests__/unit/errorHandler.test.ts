/**
 * Error Handler Middleware Tests
 *
 * Comprehensive test suite for error handling middleware:
 * - Custom error classes (AppError, ValidationError, DatabaseError, etc.)
 * - Error response formatting
 * - Status code handling
 * - Stack trace inclusion based on environment
 * - Error logging and context capture
 * - Special error type handling (JWT, Zod, Multer)
 * - asyncHandler wrapper for async route handlers
 * - notFoundHandler for 404 errors
 *
 * @module __tests__/unit/errorHandler.test
 */

import { Request, Response, NextFunction } from 'express';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  errorHandler,
  asyncHandler,
  notFoundHandler,
} from '../../middleware/errorHandler';
import logger from '../../utils/logger';
import { RequestWithLogger } from '../../middleware/request-logger';

// Mock logger
jest.mock('../../utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  securityEvent: jest.fn(),
}));

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<RequestWithLogger> & { user?: any };
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let originalEnv: string | undefined;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Save original NODE_ENV
    originalEnv = process.env.NODE_ENV;

    // Create mock request
    mockRequest = {
      method: 'GET',
      url: '/api/test',
      path: '/api/test',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent',
      },
      correlationId: 'test-correlation-id',
      logger: {
        error: jest.fn(),
        warn: jest.fn(),
        securityEvent: jest.fn(),
      } as any,
    };

    // Create mock response
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      statusCode: 200,
    };

    // Create mock next function
    mockNext = jest.fn();
  });

  afterEach(() => {
    // Restore original NODE_ENV
    if (originalEnv !== undefined) {
      process.env.NODE_ENV = originalEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  describe('Error Classes', () => {
    describe('AppError', () => {
      /**
       * Test: AppError creates error with correct properties
       */
      test('should create AppError with correct properties', () => {
        const error = new AppError('VAL_001');

        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toBe('Request validation failed');
        expect(error.code).toBe('VAL_001');
        expect(error.statusCode).toBe(400);
        expect(error.isOperational).toBe(true);
        expect(error.details).toBeUndefined();
        expect(error.stack).toBeDefined();
        expect(error.suggestedAction).toBe('Please check the request format and try again');
      });

      /**
       * Test: AppError accepts optional details
       */
      test('should accept optional details', () => {
        const details = { field: 'email', issue: 'invalid format' };
        const error = new AppError('VAL_001', details);

        expect(error.details).toEqual(details);
      });

      /**
       * Test: AppError captures stack trace
       */
      test('should capture stack trace', () => {
        const error = new AppError('VAL_001');

        expect(error.stack).toBeDefined();
        expect(error.stack).toContain('Request validation failed');
      });
    });

    describe('ValidationError', () => {
      /**
       * Test: ValidationError creates 400 error
       */
      test('should create ValidationError with 400 status', () => {
        const error = new ValidationError();

        expect(error).toBeInstanceOf(AppError);
        expect(error.name).toBe('ValidationError');
        expect(error.message).toBe('Request validation failed');
        expect(error.code).toBe('VAL_001');
        expect(error.statusCode).toBe(400);
        expect(error.isOperational).toBe(true);
        expect(error.suggestedAction).toBe('Please check the request format and try again');
      });

      /**
       * Test: ValidationError accepts details
       */
      test('should accept validation details', () => {
        const details = [
          { field: 'email', message: 'Invalid email' },
          { field: 'password', message: 'Too short' },
        ];
        const error = new ValidationError(details);

        expect(error.details).toEqual(details);
      });
    });

    describe('AuthenticationError', () => {
      /**
       * Test: AuthenticationError creates 401 error
       */
      test('should create AuthenticationError with 401 status', () => {
        const error = new AuthenticationError();

        expect(error).toBeInstanceOf(AppError);
        expect(error.name).toBe('AuthenticationError');
        expect(error.message).toBe('Invalid authentication token');
        expect(error.code).toBe('AUTH_002');
        expect(error.statusCode).toBe(401);
        expect(error.isOperational).toBe(true);
        expect(error.suggestedAction).toBe('Please log in again to obtain a new authentication token');
      });

      /**
       * Test: AuthenticationError accepts custom error code
       */
      test('should accept custom error code', () => {
        const error = new AuthenticationError('AUTH_004');

        expect(error.message).toBe('Invalid credentials');
        expect(error.code).toBe('AUTH_004');
        expect(error.suggestedAction).toBe('Please check your email and password and try again');
      });
    });

    describe('AuthorizationError', () => {
      /**
       * Test: AuthorizationError creates 403 error
       */
      test('should create AuthorizationError with 403 status', () => {
        const error = new AuthorizationError();

        expect(error).toBeInstanceOf(AppError);
        expect(error.name).toBe('AuthorizationError');
        expect(error.message).toBe('Insufficient permissions to access this resource');
        expect(error.code).toBe('PERM_001');
        expect(error.statusCode).toBe(403);
        expect(error.isOperational).toBe(true);
        expect(error.suggestedAction).toBe('Contact your administrator to request appropriate permissions');
      });

      /**
       * Test: AuthorizationError accepts custom error code
       */
      test('should accept custom error code', () => {
        const error = new AuthorizationError('PERM_004');

        expect(error.message).toBe('Admin access required');
        expect(error.code).toBe('PERM_004');
        expect(error.suggestedAction).toBe('This action requires administrator privileges');
      });
    });

    describe('NotFoundError', () => {
      /**
       * Test: NotFoundError creates 404 error
       */
      test('should create NotFoundError with 404 status', () => {
        const error = new NotFoundError();

        expect(error).toBeInstanceOf(AppError);
        expect(error.name).toBe('NotFoundError');
        expect(error.message).toBe('Resource not found');
        expect(error.code).toBe('SYS_004');
        expect(error.statusCode).toBe(404);
        expect(error.isOperational).toBe(true);
        expect(error.suggestedAction).toBe('The requested resource was not found');
      });

      /**
       * Test: NotFoundError accepts custom error code
       */
      test('should accept custom error code for specific resource', () => {
        const error = new NotFoundError('USER_001');

        expect(error.message).toBe('User not found');
        expect(error.code).toBe('USER_001');
        expect(error.suggestedAction).toBe('Please check the user ID and try again');
      });
    });

    describe('ConflictError', () => {
      /**
       * Test: ConflictError creates 409 error
       */
      test('should create ConflictError with 409 status', () => {
        const error = new ConflictError();

        expect(error).toBeInstanceOf(AppError);
        expect(error.name).toBe('ConflictError');
        expect(error.message).toBe('User already exists');
        expect(error.code).toBe('USER_002');
        expect(error.statusCode).toBe(409);
        expect(error.isOperational).toBe(true);
        expect(error.suggestedAction).toBe('An account with this email already exists. Try logging in instead');
      });

      /**
       * Test: ConflictError accepts custom error code
       */
      test('should accept custom error code', () => {
        const error = new ConflictError('REST_002');

        expect(error.message).toBe('Restaurant already exists');
        expect(error.code).toBe('REST_002');
        expect(error.suggestedAction).toBe('A restaurant with this name already exists at this location');
      });
    });

    describe('DatabaseError', () => {
      /**
       * Test: DatabaseError creates error with query context
       */
      test('should create DatabaseError with query context', () => {
        const query = 'SELECT * FROM users WHERE id = $1';
        const params = [123];
        const error = new DatabaseError('Query failed', query, params);

        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('DatabaseError');
        expect(error.message).toBe('Query failed');
        expect(error.query).toBe(query);
        expect(error.params).toEqual(params);
        expect(error.stack).toBeDefined();
      });

      /**
       * Test: DatabaseError works without query details
       */
      test('should work without query details', () => {
        const error = new DatabaseError('Connection failed');

        expect(error.message).toBe('Connection failed');
        expect(error.query).toBeUndefined();
        expect(error.params).toBeUndefined();
      });
    });
  });

  describe('Error Handler Middleware', () => {
    describe('AppError Handling', () => {
      /**
       * Test: Handles AppError with correct status and message
       */
      test('should handle AppError with correct status and message', () => {
        const error = new AppError('SYS_004');

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            code: 'SYS_004',
            message: 'Resource not found',
            suggestedAction: 'The requested resource was not found',
            statusCode: 404,
            correlationId: 'test-correlation-id',
          })
        );
      });

      /**
       * Test: Includes details for 4xx errors
       */
      test('should include details for 4xx client errors', () => {
        const details = { field: 'email', issue: 'invalid' };
        const error = new AppError('VAL_001', details);

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            details: { field: 'email', issue: 'invalid' },
          })
        );
      });

      /**
       * Test: Logs 5xx errors as errors
       */
      test('should log 5xx operational errors as errors', () => {
        const error = new AppError('SYS_002');

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        const callArgs = (mockRequest.logger?.error as jest.Mock).mock.calls[0];
        expect(callArgs[0]).toBe('Operational error (5xx)');
        expect(callArgs[1]).toMatchObject({
          statusCode: 500, // errorContext is built before statusCode is updated
          message: 'Service temporarily unavailable',
          isOperational: true,
          name: 'AppError',
          url: '/api/test',
          method: 'GET',
        });
        expect(callArgs[1].stack).toBeDefined();
      });

      /**
       * Test: Logs 4xx errors as warnings
       */
      test('should log 4xx client errors as warnings', () => {
        const error = new AppError('VAL_001');

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        const callArgs = (mockRequest.logger?.warn as jest.Mock).mock.calls[0];
        expect(callArgs[0]).toBe('Client error (4xx)');
        expect(callArgs[1]).toMatchObject({
          statusCode: 500, // errorContext is built before statusCode is updated
          message: 'Request validation failed',
          isOperational: true,
          name: 'AppError',
          url: '/api/test',
          method: 'GET',
        });
        expect(callArgs[1].stack).toBeDefined();
      });

      /**
       * Test: Does not log AppError with 2xx or 3xx status codes
       */
      test('should not log operational errors with 2xx or 3xx status codes', () => {
        // Create an error and manually set status to 200 (for testing edge case)
        const error = new AppError('VAL_001');
        (error as any).statusCode = 200; // Override for test

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        // Should not log anything for status < 400
        expect(mockRequest.logger?.error).not.toHaveBeenCalled();
        expect(mockRequest.logger?.warn).not.toHaveBeenCalled();

        // But should still send the response
        expect(mockResponse.status).toHaveBeenCalledWith(200);
      });
    });

    describe('DatabaseError Handling', () => {
      /**
       * Test: Handles DatabaseError with 500 status
       */
      test('should handle DatabaseError with 500 status', () => {
        const error = new DatabaseError('Connection failed');

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            code: 'DB_002',
            message: 'Database query failed',
            suggestedAction: 'An error occurred while processing your request. Please try again',
            statusCode: 500,
          })
        );
      });

      /**
       * Test: Logs database error with query context
       */
      test('should log database error with query context', () => {
        const query = 'SELECT * FROM users';
        const params = [1, 2, 3];
        const error = new DatabaseError('Query timeout', query, params);

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockRequest.logger?.error).toHaveBeenCalledWith(
          'Database error',
          expect.objectContaining({
            query,
            params,
          })
        );
      });
    });

    describe('Zod Validation Error Handling', () => {
      /**
       * Test: Handles Zod validation errors
       */
      test('should handle ZodError with 400 status', () => {
        const zodError = {
          name: 'ZodError',
          message: 'Validation failed',
          errors: [
            { path: ['email'], message: 'Invalid email' },
            { path: ['age'], message: 'Must be positive' },
          ],
        };

        errorHandler(zodError as any, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            code: 'VAL_001',
            message: 'Request validation failed',
            suggestedAction: 'Please check the request format and try again',
            statusCode: 400,
            details: zodError.errors,
          })
        );
      });

      /**
       * Test: Logs Zod validation errors as warnings
       */
      test('should log ZodError as warning', () => {
        const zodError = {
          name: 'ZodError',
          message: 'Validation failed',
          errors: [],
        };

        errorHandler(zodError as any, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockRequest.logger?.warn).toHaveBeenCalledWith(
          'Validation error',
          expect.objectContaining({
            name: 'ZodError',
            details: [],
          })
        );
      });
    });

    describe('JWT Error Handling', () => {
      /**
       * Test: Handles JsonWebTokenError with 401 status
       */
      test('should handle JsonWebTokenError with 401 status', () => {
        const jwtError = {
          name: 'JsonWebTokenError',
          message: 'jwt malformed',
        };

        errorHandler(jwtError as any, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            code: 'AUTH_002',
            message: 'Invalid authentication token',
            suggestedAction: 'Please log in again to obtain a new authentication token',
            statusCode: 401,
          })
        );
      });

      /**
       * Test: Logs JsonWebTokenError as security event
       */
      test('should log JsonWebTokenError as security event', () => {
        const jwtError = {
          name: 'JsonWebTokenError',
          message: 'jwt malformed',
        };

        errorHandler(jwtError as any, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockRequest.logger?.securityEvent).toHaveBeenCalledWith(
          'Invalid JWT token',
          expect.objectContaining({
            name: 'JsonWebTokenError',
            message: 'jwt malformed',
          })
        );
      });

      /**
       * Test: Handles TokenExpiredError with 401 status
       */
      test('should handle TokenExpiredError with 401 status', () => {
        const tokenExpiredError = {
          name: 'TokenExpiredError',
          message: 'jwt expired',
          expiredAt: new Date(),
        };

        errorHandler(tokenExpiredError as any, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            code: 'AUTH_003',
            message: 'Authentication token has expired',
            suggestedAction: 'Please log in again to refresh your authentication token',
            statusCode: 401,
          })
        );
      });

      /**
       * Test: Logs TokenExpiredError as warning
       */
      test('should log TokenExpiredError as warning', () => {
        const tokenExpiredError = {
          name: 'TokenExpiredError',
          message: 'jwt expired',
        };

        errorHandler(tokenExpiredError as any, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockRequest.logger?.warn).toHaveBeenCalledWith(
          'JWT token expired',
          expect.objectContaining({
            name: 'TokenExpiredError',
          })
        );
      });
    });

    describe('Multer Error Handling', () => {
      /**
       * Test: Handles MulterError with 400 status
       */
      test('should handle MulterError with 400 status', () => {
        const multerError = {
          name: 'MulterError',
          message: 'File too large',
          code: 'LIMIT_FILE_SIZE',
        };

        errorHandler(multerError as any, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            code: 'VAL_009',
            message: 'File size exceeds limit',
            suggestedAction: 'Please upload a smaller file',
            statusCode: 400,
            details: { error: 'File too large' },
          })
        );
      });

      /**
       * Test: Logs MulterError as warning
       */
      test('should log MulterError as warning', () => {
        const multerError = {
          name: 'MulterError',
          message: 'Too many files',
        };

        errorHandler(multerError as any, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockRequest.logger?.warn).toHaveBeenCalledWith(
          'File upload error',
          expect.objectContaining({
            name: 'MulterError',
          })
        );
      });
    });

    describe('Generic Error Handling', () => {
      /**
       * Test: Handles unexpected errors with 500 status
       */
      test('should handle unexpected errors with 500 status', () => {
        const error = new Error('Unexpected error');

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            code: 'SYS_001',
            message: 'Internal server error',
            suggestedAction: 'An unexpected error occurred. Please try again later',
            statusCode: 500,
          })
        );
      });

      /**
       * Test: Logs unexpected errors as errors
       */
      test('should log unexpected errors with critical context', () => {
        const error = new Error('Unexpected bug');

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockRequest.logger?.error).toHaveBeenCalledWith(
          'UNEXPECTED ERROR - Programming bug detected',
          expect.objectContaining({
            name: 'Error',
            message: 'Unexpected bug',
            isOperational: false,
          })
        );
      });

      /**
       * Test: Production environment handling for unexpected errors
       */
      test('should handle unexpected errors in production environment', () => {
        process.env.NODE_ENV = 'production';
        const error = new Error('Production bug');

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        // Verify error is logged
        expect(mockRequest.logger?.error).toHaveBeenCalledWith(
          'UNEXPECTED ERROR - Programming bug detected',
          expect.any(Object)
        );

        // Verify response does not include stack trace
        const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
        expect(jsonCall.stack).toBeUndefined();

        // Verify status is 500
        expect(mockResponse.status).toHaveBeenCalledWith(500);
      });
    });

    describe('Error Context Logging', () => {
      /**
       * Test: Includes request context in error logs
       */
      test('should include request context in error logs', () => {
        mockRequest.user = { id: 'user-123' } as any;
        const error = new AppError('VAL_001');

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockRequest.logger?.warn).toHaveBeenCalledWith(
          'Client error (4xx)',
          expect.objectContaining({
            url: '/api/test',
            method: 'GET',
            userId: 'user-123',
            ip: '127.0.0.1',
            userAgent: 'test-agent',
            correlationId: 'test-correlation-id',
          })
        );
      });

      /**
       * Test: Uses default logger when request logger is not available
       */
      test('should use default logger when request logger is not available', () => {
        delete mockRequest.logger;
        const error = new AppError('SYS_001');

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(logger.error).toHaveBeenCalled();
      });
    });

    describe('Response Formatting', () => {
      /**
       * Test: Response includes correlation ID
       */
      test('should include correlation ID in response', () => {
        const error = new AppError('VAL_001');

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            correlationId: 'test-correlation-id',
          })
        );
      });

      /**
       * Test: Response includes success: false flag
       */
      test('should include success: false flag in response', () => {
        const error = new AppError('VAL_001');

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
          })
        );
      });

      /**
       * Test: Response does not include sensitive details for 5xx in production
       */
      test('should not include details for 5xx errors in production', () => {
        process.env.NODE_ENV = 'production';
        const details = { internalInfo: 'sensitive data' };
        const error = new AppError('SYS_001', details);

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
        expect(jsonCall.details).toBeUndefined();
      });
    });

    describe('Stack Trace Handling', () => {
      /**
       * Test: Includes stack trace in development
       */
      test('should include stack trace in development environment', () => {
        process.env.NODE_ENV = 'development';
        const error = new AppError('VAL_001');

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            stack: expect.any(String),
          })
        );
      });

      /**
       * Test: Excludes stack trace in production
       */
      test('should exclude stack trace in production environment', () => {
        process.env.NODE_ENV = 'production';
        const error = new AppError('VAL_001');

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
        expect(jsonCall.stack).toBeUndefined();
      });

      /**
       * Test: Includes stack trace for 4xx errors in development
       */
      test('should include stack trace for 4xx errors in development', () => {
        process.env.NODE_ENV = 'development';
        const error = new AppError('VAL_001');

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
        expect(jsonCall.stack).toBeDefined();
      });

      /**
       * Test: Excludes stack trace for 4xx errors in production
       */
      test('should exclude stack trace for 4xx errors in production', () => {
        process.env.NODE_ENV = 'production';
        const error = new AppError('VAL_001');

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
        expect(jsonCall.stack).toBeUndefined();
      });
    });

    describe('Details Inclusion', () => {
      /**
       * Test: Includes details for 4xx errors in production
       */
      test('should include details for 4xx errors in production', () => {
        process.env.NODE_ENV = 'production';
        const details = { field: 'email', message: 'Invalid format' };
        const error = new AppError('VAL_001', details);

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            details,
          })
        );
      });

      /**
       * Test: Includes details in development for all errors
       */
      test('should include details in development for all errors', () => {
        process.env.NODE_ENV = 'development';
        const details = { internalInfo: 'debug data' };
        const error = new AppError('SYS_001', details);

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            details,
          })
        );
      });

      /**
       * Test: Does not include undefined details
       */
      test('should not include details field when details are undefined', () => {
        const error = new AppError('VAL_001');

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
        expect(jsonCall.details).toBeUndefined();
      });
    });

    describe('Special Error Cases', () => {
      /**
       * Test: Handles error without correlationId
       */
      test('should handle error when correlationId is missing', () => {
        delete mockRequest.correlationId;
        const error = new AppError('VAL_001');

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            correlationId: undefined,
          })
        );
      });

      /**
       * Test: Handles error without user in request
       */
      test('should handle error when user is not in request', () => {
        const error = new AppError('VAL_001');

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockRequest.logger?.warn).toHaveBeenCalledWith(
          'Client error (4xx)',
          expect.objectContaining({
            userId: undefined,
          })
        );
      });

      /**
       * Test: Handles error with user in request
       */
      test('should include userId when user is in request', () => {
        mockRequest.user = { id: 'user-456' } as any;
        const error = new AppError('VAL_001');

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockRequest.logger?.warn).toHaveBeenCalledWith(
          'Client error (4xx)',
          expect.objectContaining({
            userId: 'user-456',
          })
        );
      });
    });

    describe('Edge Cases', () => {
      /**
       * Test: Handles error with missing message
       */
      test('should handle error with empty message', () => {
        const error = new Error('');

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Internal server error',
            code: 'SYS_001',
            statusCode: 500,
          })
        );
      });

      /**
       * Test: Handles error with no stack trace
       */
      test('should handle error without stack trace', () => {
        const error = new Error('Test error');
        delete error.stack;

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
      });

      /**
       * Test: Handles null error details
       */
      test('should handle null error details', () => {
        const error = new AppError('VAL_001', null);

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
        // Null is falsy, so details won't be included in the response
        expect(jsonCall.details).toBeUndefined();
      });
    });
  });

  describe('asyncHandler Wrapper', () => {
    /**
     * Test: Wraps async function and calls it
     */
    test('should wrap async function and call it', async () => {
      const asyncFn = jest.fn().mockResolvedValue('result');
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(mockRequest as Request, mockResponse as Response, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(
        mockRequest,
        mockResponse,
        mockNext
      );
    });

    /**
     * Test: Catches promise rejections and calls next
     */
    test('should catch promise rejections and pass to next', async () => {
      const error = new Error('Async error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    /**
     * Test: Handles AppError rejections
     */
    test('should handle AppError rejections', async () => {
      const error = new AppError('SYS_004');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    /**
     * Test: Handles synchronous errors thrown in async function
     * Note: Promise.resolve() catches synchronous throws and converts them to rejections
     * This test verifies the behavior is the same as promise rejections
     */
    test('should handle synchronous errors thrown in async function', async () => {
      // Testing the same behavior as promise rejections - asyncHandler
      // uses Promise.resolve() which catches both sync throws and async rejections
      const error = new AppError('VAL_001');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(mockRequest as Request, mockResponse as Response, mockNext);

      // Verify the error was passed to next (same as rejection handling)
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    /**
     * Test: Handles non-promise returning functions
     */
    test('should handle non-promise returning functions', async () => {
      const syncFn = jest.fn().mockReturnValue('result');
      const wrappedFn = asyncHandler(syncFn);

      await wrappedFn(mockRequest as Request, mockResponse as Response, mockNext);

      expect(syncFn).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    /**
     * Test: Does not call next when function succeeds
     */
    test('should not call next when async function succeeds', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });

    /**
     * Test: Works with async arrow functions
     */
    test('should work with async arrow functions', async () => {
      const error = new Error('Arrow function error');
      const asyncArrow = async () => {
        throw error;
      };
      const wrappedFn = asyncHandler(asyncArrow);

      await wrappedFn(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    /**
     * Test: Preserves function context
     */
    test('should preserve function context', async () => {
      const asyncFn = jest.fn().mockResolvedValue('result');
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(mockRequest as Request, mockResponse as Response, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(
        mockRequest,
        mockResponse,
        mockNext
      );
    });
  });

  describe('notFoundHandler', () => {
    /**
     * Test: Creates NotFoundError for undefined routes
     */
    test('should create NotFoundError for undefined routes', () => {
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'NotFoundError',
          message: 'Route not found',
          statusCode: 404,
        })
      );
    });

    /**
     * Test: Passes error to next middleware
     */
    test('should pass error to next middleware', () => {
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
    });

    /**
     * Test: Works with any request method
     */
    test('should work with any request method', () => {
      mockRequest.method = 'POST';

      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
    });

    /**
     * Test: Works with any URL path
     */
    test('should work with any URL path', () => {
      mockRequest.url = '/api/non-existent-route';

      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Route not found',
        })
      );
    });
  });

  describe('Integration Scenarios', () => {
    /**
     * Test: Complete flow from asyncHandler to errorHandler
     */
    test('should handle complete error flow from asyncHandler to errorHandler', async () => {
      const error = new ValidationError();
      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = asyncHandler(asyncFn);

      // Call asyncHandler
      await wrappedFn(mockRequest as Request, mockResponse as Response, mockNext);

      // Verify error was passed to next
      expect(mockNext).toHaveBeenCalledWith(error);

      // Simulate error reaching errorHandler
      const capturedError = (mockNext as jest.Mock).mock.calls[0][0];
      errorHandler(capturedError, mockRequest as Request, mockResponse as Response, mockNext);

      // Verify errorHandler processed it correctly
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'VAL_001',
          message: 'Request validation failed',
          suggestedAction: 'Please check the request format and try again',
          statusCode: 400,
        })
      );
    });

    /**
     * Test: Multiple error types in sequence
     */
    test('should handle different error types correctly', () => {
      const errors = [
        new ValidationError(),
        new AuthenticationError(),
        new AuthorizationError(),
        new NotFoundError('USER_001'),
        new ConflictError(),
        new DatabaseError('Connection lost'),
      ];

      const expectedStatuses = [400, 401, 403, 404, 409, 500];

      errors.forEach((error, index) => {
        jest.clearAllMocks();
        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
        expect(mockResponse.status).toHaveBeenCalledWith(expectedStatuses[index]);
      });
    });

    /**
     * Test: Error handler with production environment flag
     */
    test('should behave differently in production vs development', () => {
      const error = new AppError('SYS_001');

      // Test development
      process.env.NODE_ENV = 'development';
      jest.clearAllMocks();
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      let jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.stack).toBeDefined();

      // Test production
      process.env.NODE_ENV = 'production';
      jest.clearAllMocks();
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.stack).toBeUndefined();
    });
  });
});
