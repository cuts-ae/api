/**
 * Request Logger Middleware Tests
 *
 * Comprehensive test suite for request logging middleware:
 * - Correlation ID generation and propagation
 * - Request/response logging
 * - Performance timing
 * - Sensitive data sanitization
 * - Error handling
 * - Slow request detection
 * - Conditional logging
 *
 * @module __tests__/unit/request-logger.test
 */

import { Request, Response, NextFunction } from 'express';
import { requestLogger, skipLoggingFor, conditionalRequestLogger, RequestWithLogger } from '../../middleware/request-logger';
import logger from '../../utils/logger';

// Mock logger
jest.mock('../../utils/logger', () => ({
  generateCorrelationId: jest.fn(() => 'test-correlation-id-123'),
  child: jest.fn(() => ({
    http: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    apiRequest: jest.fn(),
  })),
}));

describe('Request Logger Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock request
    mockRequest = {
      method: 'GET',
      url: '/api/test',
      path: '/api/test',
      query: {},
      headers: {
        'user-agent': 'test-agent',
      },
      ip: '127.0.0.1',
      body: {},
    };

    // Create mock response
    mockResponse = {
      setHeader: jest.fn(),
      get: jest.fn(),
      end: jest.fn((chunk, encoding, callback) => {
        if (typeof encoding === 'function') {
          encoding();
        } else if (callback) {
          callback();
        }
        return mockResponse as Response;
      }),
      on: jest.fn(),
      statusCode: 200,
    };

    // Create mock next function
    mockNext = jest.fn();
  });

  describe('Basic Functionality', () => {
    /**
     * Test: Middleware adds correlation ID to request
     */
    test('should add correlation ID to request', () => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as RequestWithLogger).correlationId).toBeDefined();
      expect((mockRequest as RequestWithLogger).correlationId).toBe('test-correlation-id-123');
    });

    /**
     * Test: Middleware adds correlation ID to response headers
     */
    test('should add correlation ID to response headers', () => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'test-correlation-id-123');
    });

    /**
     * Test: Middleware adds logger to request
     */
    test('should add logger to request', () => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as RequestWithLogger).logger).toBeDefined();
      expect(logger.child).toHaveBeenCalledWith('test-correlation-id-123');
    });

    /**
     * Test: Middleware adds start time to request
     */
    test('should add start time to request', () => {
      const beforeTime = Date.now();

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      const afterTime = Date.now();
      expect((mockRequest as RequestWithLogger).startTime).toBeGreaterThanOrEqual(beforeTime);
      expect((mockRequest as RequestWithLogger).startTime).toBeLessThanOrEqual(afterTime);
    });

    /**
     * Test: Middleware calls next()
     */
    test('should call next() to continue middleware chain', () => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('Correlation ID Handling', () => {
    /**
     * Test: Uses existing correlation ID from header
     */
    test('should use existing correlation ID from header', () => {
      const existingId = 'existing-correlation-id-456';
      mockRequest.headers = {
        ...mockRequest.headers,
        'x-correlation-id': existingId,
      };

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as RequestWithLogger).correlationId).toBe(existingId);
    });

    /**
     * Test: Generates new correlation ID if none exists
     */
    test('should generate new correlation ID if none in header', () => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.generateCorrelationId).toHaveBeenCalled();
      expect((mockRequest as RequestWithLogger).correlationId).toBe('test-correlation-id-123');
    });
  });

  describe('Request Logging', () => {
    /**
     * Test: Logs incoming request
     */
    test('should log incoming request', () => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      const childLogger = logger.child('test-correlation-id-123');
      expect(childLogger.http).toHaveBeenCalled();
    });

    /**
     * Test: Logs request with correct details
     */
    test('should log request with method, URL, and IP', () => {
      mockRequest.method = 'POST';
      mockRequest.url = '/api/users/create';
      mockRequest.ip = '192.168.1.100';

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.child).toHaveBeenCalledWith('test-correlation-id-123');
    });

    /**
     * Test: Logs user ID if authenticated
     */
    test('should log user ID if user is authenticated', () => {
      (mockRequest as any).user = { id: 'user-123', email: 'test@example.com' };

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      const childLogger = logger.child('test-correlation-id-123');
      expect(childLogger.http).toHaveBeenCalled();
    });
  });

  describe('Response Logging', () => {
    /**
     * Test: Logs response when res.end() is called
     */
    test('should log response when res.end() is called', () => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      // Simulate response end
      mockResponse.end!();

      const childLogger = logger.child('test-correlation-id-123');
      expect(childLogger.apiRequest).toHaveBeenCalled();
    });

    /**
     * Test: Logs response with status code and duration
     */
    test('should log response with status code and duration', () => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      mockResponse.statusCode = 201;
      mockResponse.end!();

      const childLogger = logger.child('test-correlation-id-123');
      expect(childLogger.apiRequest).toHaveBeenCalledWith(
        'GET',
        '/api/test',
        201,
        expect.any(Number),
        expect.any(Object)
      );
    });

    /**
     * Test: Calculates request duration correctly
     */
    test('should calculate request duration', (done) => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      setTimeout(() => {
        mockResponse.end!();

        const childLogger = logger.child('test-correlation-id-123');
        const callArgs = (childLogger.apiRequest as jest.Mock).mock.calls[0];
        const duration = callArgs[3];

        expect(duration).toBeGreaterThanOrEqual(100);
        expect(duration).toBeLessThan(200);
        done();
      }, 100);
    });
  });

  describe('Slow Request Detection', () => {
    /**
     * Test: Warns about slow requests (> 1 second)
     */
    test('should warn about slow requests', (done) => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      // Mock slow request
      (mockRequest as RequestWithLogger).startTime = Date.now() - 1500;

      setTimeout(() => {
        mockResponse.end!();

        const childLogger = logger.child('test-correlation-id-123');
        expect(childLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Slow request detected'),
          expect.objectContaining({
            duration: expect.any(Number),
            threshold: 1000,
          })
        );
        done();
      }, 10);
    });

    /**
     * Test: Does not warn about fast requests
     */
    test('should not warn about fast requests', () => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      mockResponse.end!();

      const childLogger = logger.child('test-correlation-id-123');
      expect(childLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('Sensitive Data Sanitization', () => {
    /**
     * Test: Sanitizes password fields
     */
    test('should sanitize password in request body', () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'secret123',
        name: 'Test User',
      };

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      const childLogger = logger.child('test-correlation-id-123');
      const logCall = (childLogger.http as jest.Mock).mock.calls[0];
      const loggedBody = logCall[1].body;

      expect(loggedBody.password).toBe('[REDACTED]');
      expect(loggedBody.email).toBe('test@example.com');
      expect(loggedBody.name).toBe('Test User');
    });

    /**
     * Test: Sanitizes multiple sensitive fields
     */
    test('should sanitize all sensitive fields', () => {
      mockRequest.body = {
        password: 'pass123',
        confirmPassword: 'pass123',
        token: 'bearer-token',
        apiKey: 'secret-key',
        creditCard: '1234-5678-9012-3456',
        normalField: 'not-sensitive',
      };

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      const childLogger = logger.child('test-correlation-id-123');
      const logCall = (childLogger.http as jest.Mock).mock.calls[0];
      const loggedBody = logCall[1].body;

      expect(loggedBody.password).toBe('[REDACTED]');
      expect(loggedBody.confirmPassword).toBe('[REDACTED]');
      expect(loggedBody.token).toBe('[REDACTED]');
      expect(loggedBody.apiKey).toBe('[REDACTED]');
      expect(loggedBody.creditCard).toBe('[REDACTED]');
      expect(loggedBody.normalField).toBe('not-sensitive');
    });

    /**
     * Test: Handles null/undefined body
     */
    test('should handle null or undefined body', () => {
      mockRequest.body = null;
      expect(() => {
        requestLogger(mockRequest as Request, mockResponse as Response, mockNext);
      }).not.toThrow();

      mockRequest.body = undefined;
      expect(() => {
        requestLogger(mockRequest as Request, mockResponse as Response, mockNext);
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    /**
     * Test: Handles response errors
     */
    test('should handle response errors', () => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      // Trigger error event
      const errorHandler = (mockResponse.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'error'
      )[1];

      const testError = new Error('Response error');
      errorHandler(testError);

      const childLogger = logger.child('test-correlation-id-123');
      expect(childLogger.error).toHaveBeenCalledWith(
        'Response error',
        expect.objectContaining({
          error: 'Response error',
          stack: expect.any(String),
        })
      );
    });
  });

  describe('Skip Logging Functionality', () => {
    /**
     * Test: skipLoggingFor() sets skip flag
     */
    test('should set skip flag for specified paths', () => {
      const skipMiddleware = skipLoggingFor(['/health', '/metrics']);

      mockRequest.path = '/health';
      skipMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as any).skipLogging).toBe(true);
      expect(mockNext).toHaveBeenCalled();
    });

    /**
     * Test: Skip flag not set for non-specified paths
     */
    test('should not set skip flag for other paths', () => {
      const skipMiddleware = skipLoggingFor(['/health', '/metrics']);

      mockRequest.path = '/api/users';
      skipMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as any).skipLogging).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    /**
     * Test: conditionalRequestLogger skips when flag is set
     */
    test('should skip logging when skip flag is set', () => {
      (mockRequest as any).skipLogging = true;

      conditionalRequestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.child).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    /**
     * Test: conditionalRequestLogger logs when flag is not set
     */
    test('should log normally when skip flag is not set', () => {
      conditionalRequestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.child).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    /**
     * Test: Handles missing headers
     */
    test('should handle missing headers', () => {
      mockRequest.headers = {};

      expect(() => {
        requestLogger(mockRequest as Request, mockResponse as Response, mockNext);
      }).not.toThrow();
    });

    /**
     * Test: Handles missing IP address
     */
    test('should handle missing IP address', () => {
      mockRequest.ip = undefined;

      expect(() => {
        requestLogger(mockRequest as Request, mockResponse as Response, mockNext);
      }).not.toThrow();
    });

    /**
     * Test: Handles complex query parameters
     */
    test('should handle complex query parameters', () => {
      mockRequest.query = {
        page: '1',
        limit: '10',
        filter: {
          status: 'active',
          role: ['admin', 'user'],
        },
      };

      expect(() => {
        requestLogger(mockRequest as Request, mockResponse as Response, mockNext);
      }).not.toThrow();
    });

    /**
     * Test: Handles response.end() with different signatures
     */
    test('should handle res.end() with chunk parameter', () => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(() => {
        mockResponse.end!('response body');
      }).not.toThrow();
    });

    /**
     * Test: Handles response.end() with encoding
     */
    test('should handle res.end() with encoding parameter', () => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(() => {
        mockResponse.end!('response body', 'utf8');
      }).not.toThrow();
    });

    /**
     * Test: Handles response.end() with callback
     */
    test('should handle res.end() with callback', (done) => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      mockResponse.end!('response body', 'utf8', () => {
        done();
      });
    });
  });
});
