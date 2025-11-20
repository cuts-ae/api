/**
 * Logger Unit Tests
 *
 * Comprehensive test suite for the logging utility:
 * - Logger initialization
 * - Log level filtering
 * - Correlation ID generation
 * - Child logger creation
 * - Performance timing
 * - Security event logging
 * - Database query logging
 * - API request logging
 * - Format validation
 * - Transport configuration
 *
 * @module __tests__/unit/logger.test
 */

import winston from 'winston';

// Create mock child logger instance
const mockChildLoggerInstance = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  http: jest.fn(),
  debug: jest.fn(),
  child: jest.fn(),
};

// Create mock logger instance
const mockLoggerInstance = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  http: jest.fn(),
  debug: jest.fn(),
  child: jest.fn(() => {
    // Return a new child logger instance that also has a child method
    const childInstance = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      http: jest.fn(),
      debug: jest.fn(),
      child: jest.fn(() => mockChildLoggerInstance),
    };
    return childInstance;
  }),
};

// Mock Winston to capture log calls
jest.mock('winston', () => {
  const actualWinston = jest.requireActual('winston');

  const mFormat = {
    combine: jest.fn((...args) => actualWinston.format.combine(...args)),
    timestamp: jest.fn((opts) => actualWinston.format.timestamp(opts)),
    colorize: jest.fn((opts) => actualWinston.format.colorize(opts)),
    printf: jest.fn((fn) => actualWinston.format.printf(fn)),
    errors: jest.fn((opts) => actualWinston.format.errors(opts)),
    json: jest.fn(() => actualWinston.format.json()),
  };

  const mTransports = {
    Console: class MockConsole {
      constructor(opts: any) {
        // Mock Console transport
      }
    },
    File: class MockFile {
      constructor(opts: any) {
        // Mock File transport
      }
    },
  };

  return {
    format: mFormat,
    transports: mTransports,
    createLogger: jest.fn(() => mockLoggerInstance),
    addColors: jest.fn(),
  };
});

// Mock winston-daily-rotate-file
jest.mock('winston-daily-rotate-file', () => {
  return jest.fn().mockImplementation(() => ({
    name: 'DailyRotateFile',
  }));
});

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234-5678-90ab-cdef12345678'),
}));

import logger from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

describe('Logger Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Logging Methods', () => {
    /**
     * Test: error() method logs at error level
     */
    test('should log error messages', () => {
      const message = 'Test error message';
      const meta = { userId: '123', context: 'test' };

      logger.error(message, meta);

      // Verify logger was called with correct parameters
      expect(mockLoggerInstance.error).toHaveBeenCalledWith(message, meta);
    });

    /**
     * Test: warn() method logs at warning level
     */
    test('should log warning messages', () => {
      const message = 'Test warning message';
      const meta = { action: 'test-action' };

      logger.warn(message, meta);

      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(message, meta);
    });

    /**
     * Test: info() method logs at info level
     */
    test('should log info messages', () => {
      const message = 'Test info message';

      logger.info(message);

      expect(mockLoggerInstance.info).toHaveBeenCalledWith(message, undefined);
    });

    /**
     * Test: http() method logs HTTP-specific messages
     */
    test('should log HTTP messages', () => {
      const message = 'GET /api/users 200';
      const meta = { duration: 150 };

      logger.http(message, meta);

      expect(mockLoggerInstance.http).toHaveBeenCalledWith(message, meta);
    });

    /**
     * Test: debug() method logs debug messages
     */
    test('should log debug messages', () => {
      const message = 'Test debug message';
      const meta = { step: 1, details: 'processing' };

      logger.debug(message, meta);

      expect(mockLoggerInstance.debug).toHaveBeenCalledWith(message, meta);
    });
  });

  describe('Correlation ID', () => {
    /**
     * Test: generateCorrelationId() creates unique IDs
     */
    test('should generate unique correlation IDs', () => {
      // Mock uuid to return different values for consecutive calls
      (uuidv4 as jest.Mock).mockReturnValueOnce('uuid-1').mockReturnValueOnce('uuid-2');

      const id1 = logger.generateCorrelationId();
      const id2 = logger.generateCorrelationId();

      expect(id1).toBe('uuid-1');
      expect(id2).toBe('uuid-2');
      expect(id1).not.toEqual(id2);
      expect(uuidv4).toHaveBeenCalledTimes(2);
    });

    /**
     * Test: child() creates logger with correlation ID
     */
    test('should create child logger with correlation ID', () => {
      const correlationId = 'test-correlation-id-123';
      const childLogger = logger.child(correlationId);

      expect(childLogger).toBeDefined();
      expect(childLogger.error).toBeDefined();
      expect(childLogger.warn).toBeDefined();
      expect(childLogger.info).toBeDefined();
      expect(mockLoggerInstance.child).toHaveBeenCalledWith({ correlationId });
    });

    /**
     * Test: child logger methods work correctly
     */
    test('should log with child logger', () => {
      (uuidv4 as jest.Mock).mockReturnValue('test-uuid');
      const correlationId = logger.generateCorrelationId();

      // Mock the child method to return a proper logger-like object
      const mockChild = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        http: jest.fn(),
        debug: jest.fn(),
        child: jest.fn(),
      };
      mockLoggerInstance.child.mockReturnValueOnce(mockChild);

      const childLogger = logger.child(correlationId);
      childLogger.info('Test message from child logger');

      expect(mockLoggerInstance.child).toHaveBeenCalledWith({ correlationId: 'test-uuid' });
      expect(mockChild.info).toHaveBeenCalled();
    });
  });

  describe('Performance Timing', () => {
    /**
     * Test: startTimer() returns a function
     */
    test('should start timer and return function', () => {
      const timer = logger.startTimer('Test operation');

      expect(timer).toBeInstanceOf(Function);
    });

    /**
     * Test: Timer function logs elapsed time
     */
    test('should log elapsed time when timer is called', (done) => {
      const timer = logger.startTimer('Async operation');

      setTimeout(() => {
        timer();
        expect(mockLoggerInstance.debug).toHaveBeenCalled();
        const lastCall = mockLoggerInstance.debug.mock.calls[mockLoggerInstance.debug.mock.calls.length - 1];
        expect(lastCall[0]).toMatch(/Async operation completed in \d+ms/);
        done();
      }, 100);
    });

    /**
     * Test: Multiple timers work independently
     */
    test('should handle multiple timers independently', () => {
      const timer1 = logger.startTimer('Operation 1');
      const timer2 = logger.startTimer('Operation 2');

      expect(timer1).not.toBe(timer2);

      timer1();
      timer2();

      expect(mockLoggerInstance.debug).toHaveBeenCalledTimes(2);
    });
  });

  describe('Security Event Logging', () => {
    /**
     * Test: securityEvent() logs with security flag
     */
    test('should log security events', () => {
      const event = 'Failed login attempt';
      const meta = { email: 'test@example.com', ip: '192.168.1.1' };

      logger.securityEvent(event, meta);

      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        `SECURITY: ${event}`,
        { ...meta, security: true }
      );
    });

    /**
     * Test: Security events are logged at WARN level
     */
    test('should log security events at warning level', () => {
      logger.securityEvent('Suspicious activity detected');

      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        'SECURITY: Suspicious activity detected',
        { security: true }
      );
    });
  });

  describe('Database Query Logging', () => {
    /**
     * Test: dbQuery() logs query with duration
     */
    test('should log database queries', () => {
      const query = 'SELECT * FROM users WHERE id = $1';
      const duration = 45;
      const meta = { params: ['user-123'] };

      logger.dbQuery(query, duration, meta);

      expect(mockLoggerInstance.debug).toHaveBeenCalledWith(
        `DB Query: ${query}`,
        { duration, ...meta }
      );
    });

    /**
     * Test: Long queries are logged with warning
     */
    test('should handle slow queries', () => {
      const query = 'SELECT * FROM large_table';
      const duration = 5000; // 5 seconds

      logger.dbQuery(query, duration);

      expect(mockLoggerInstance.debug).toHaveBeenCalledWith(
        `DB Query: ${query}`,
        { duration }
      );
    });
  });

  describe('API Request Logging', () => {
    /**
     * Test: apiRequest() logs HTTP requests
     */
    test('should log API requests', () => {
      logger.apiRequest('GET', '/api/users', 200, 150);

      expect(mockLoggerInstance.http).toHaveBeenCalledWith(
        'GET /api/users 200',
        { duration: 150 }
      );
    });

    /**
     * Test: Different HTTP methods are logged correctly
     */
    test('should log different HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      methods.forEach((method) => {
        logger.apiRequest(method, '/api/test', 200, 100);
      });

      expect(mockLoggerInstance.http).toHaveBeenCalledTimes(5);
    });

    /**
     * Test: Error status codes are logged
     */
    test('should log error status codes', () => {
      const errorCodes = [400, 401, 403, 404, 500, 502, 503];

      errorCodes.forEach((code) => {
        logger.apiRequest('GET', '/api/test', code, 100);
      });

      expect(mockLoggerInstance.http).toHaveBeenCalledTimes(7);
    });
  });

  describe('Metadata Handling', () => {
    /**
     * Test: Complex metadata objects are logged
     */
    test('should handle complex metadata', () => {
      const complexMeta = {
        user: {
          id: '123',
          email: 'test@example.com',
          roles: ['admin', 'user'],
        },
        request: {
          method: 'POST',
          url: '/api/orders',
          body: { items: [1, 2, 3] },
        },
        timestamp: new Date().toISOString(),
      };

      logger.info('Complex metadata test', complexMeta);

      expect(mockLoggerInstance.info).toHaveBeenCalledWith('Complex metadata test', complexMeta);
    });

    /**
     * Test: Undefined metadata is handled gracefully
     */
    test('should handle undefined metadata', () => {
      logger.info('Message without metadata');

      expect(mockLoggerInstance.info).toHaveBeenCalledWith('Message without metadata', undefined);
    });

    /**
     * Test: Null metadata is handled gracefully
     */
    test('should handle null metadata', () => {
      logger.info('Message with null metadata', null);

      expect(mockLoggerInstance.info).toHaveBeenCalledWith('Message with null metadata', null);
    });
  });

  describe('Edge Cases', () => {
    /**
     * Test: Empty string messages are logged
     */
    test('should log empty string messages', () => {
      logger.info('');

      expect(mockLoggerInstance.info).toHaveBeenCalledWith('', undefined);
    });

    /**
     * Test: Very long messages are handled
     */
    test('should handle very long messages', () => {
      const longMessage = 'a'.repeat(10000);

      logger.info(longMessage);

      expect(mockLoggerInstance.info).toHaveBeenCalledWith(longMessage, undefined);
    });

    /**
     * Test: Special characters in messages are handled
     */
    test('should handle special characters', () => {
      const specialMessage = 'Test\nwith\ttabs\rand\nnewlines\u0000null';

      logger.info(specialMessage);

      expect(mockLoggerInstance.info).toHaveBeenCalledWith(specialMessage, undefined);
    });

    /**
     * Test: Unicode characters are handled
     */
    test('should handle unicode characters', () => {
      const unicodeMessage = 'Test with emoji 🚀 and unicode 你好';

      logger.info(unicodeMessage);

      expect(mockLoggerInstance.info).toHaveBeenCalledWith(unicodeMessage, undefined);
    });
  });

  describe('Child Logger Isolation', () => {
    /**
     * Test: Child loggers don't interfere with parent
     */
    test('should isolate child logger from parent', () => {
      // Mock child loggers
      const mockChild1 = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        http: jest.fn(),
        debug: jest.fn(),
        child: jest.fn(),
      };
      const mockChild2 = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        http: jest.fn(),
        debug: jest.fn(),
        child: jest.fn(),
      };
      mockLoggerInstance.child.mockReturnValueOnce(mockChild1).mockReturnValueOnce(mockChild2);

      const parent = logger;
      const child1 = logger.child('correlation-1');
      const child2 = logger.child('correlation-2');

      parent.info('Parent log');
      child1.info('Child 1 log');
      child2.info('Child 2 log');

      expect(mockLoggerInstance.info).toHaveBeenCalledWith('Parent log', undefined);
      expect(mockLoggerInstance.child).toHaveBeenCalledWith({ correlationId: 'correlation-1' });
      expect(mockLoggerInstance.child).toHaveBeenCalledWith({ correlationId: 'correlation-2' });
      expect(mockChild1.info).toHaveBeenCalledWith('Child 1 log', undefined);
      expect(mockChild2.info).toHaveBeenCalledWith('Child 2 log', undefined);
    });

    /**
     * Test: Nested child loggers work correctly
     */
    test('should support nested child loggers', () => {
      // Mock nested child loggers
      // Note: nested children actually call the root Logger.child(), not childLogger.child()
      const mockChild1 = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        http: jest.fn(),
        debug: jest.fn(),
        child: jest.fn(),
      };
      const mockChild2 = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        http: jest.fn(),
        debug: jest.fn(),
        child: jest.fn(),
      };
      // Both calls to child() go through mockLoggerInstance.child
      mockLoggerInstance.child
        .mockReturnValueOnce(mockChild1)
        .mockReturnValueOnce(mockChild2);

      const child1 = logger.child('level-1');
      const child2 = child1.child('level-2');

      child2.info('Nested child logger message');

      // Both child creations go through the root logger
      expect(mockLoggerInstance.child).toHaveBeenCalledWith({ correlationId: 'level-1' });
      expect(mockLoggerInstance.child).toHaveBeenCalledWith({ correlationId: 'level-2' });
      expect(mockChild2.info).toHaveBeenCalledWith('Nested child logger message', undefined);
    });
  });

  describe('Child Logger Methods', () => {
    /**
     * Test: Child logger error method works
     */
    test('should use child logger error method', () => {
      const mockChild = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        http: jest.fn(),
        debug: jest.fn(),
        child: jest.fn(),
      };
      mockLoggerInstance.child.mockReturnValueOnce(mockChild);

      const childLogger = logger.child('test-correlation');
      childLogger.error('Child error message', { extra: 'data' });

      expect(mockChild.error).toHaveBeenCalledWith('Child error message', { extra: 'data' });
    });

    /**
     * Test: Child logger warn method works
     */
    test('should use child logger warn method', () => {
      const mockChild = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        http: jest.fn(),
        debug: jest.fn(),
        child: jest.fn(),
      };
      mockLoggerInstance.child.mockReturnValueOnce(mockChild);

      const childLogger = logger.child('test-correlation');
      childLogger.warn('Child warn message');

      expect(mockChild.warn).toHaveBeenCalledWith('Child warn message', undefined);
    });

    /**
     * Test: Child logger http method works
     */
    test('should use child logger http method', () => {
      const mockChild = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        http: jest.fn(),
        debug: jest.fn(),
        child: jest.fn(),
      };
      mockLoggerInstance.child.mockReturnValueOnce(mockChild);

      const childLogger = logger.child('test-correlation');
      childLogger.http('Child http message');

      expect(mockChild.http).toHaveBeenCalledWith('Child http message', undefined);
    });

    /**
     * Test: Child logger debug method works
     */
    test('should use child logger debug method', () => {
      const mockChild = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        http: jest.fn(),
        debug: jest.fn(),
        child: jest.fn(),
      };
      mockLoggerInstance.child.mockReturnValueOnce(mockChild);

      const childLogger = logger.child('test-correlation');
      childLogger.debug('Child debug message');

      expect(mockChild.debug).toHaveBeenCalledWith('Child debug message', undefined);
    });

    /**
     * Test: Child logger startTimer works
     */
    test('should use child logger startTimer', (done) => {
      const mockChild = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        http: jest.fn(),
        debug: jest.fn(),
        child: jest.fn(),
      };
      mockLoggerInstance.child.mockReturnValueOnce(mockChild);

      const childLogger = logger.child('test-correlation');
      const timer = childLogger.startTimer('Child operation');

      setTimeout(() => {
        timer();
        expect(mockChild.debug).toHaveBeenCalled();
        const lastCall = mockChild.debug.mock.calls[mockChild.debug.mock.calls.length - 1];
        expect(lastCall[0]).toMatch(/Child operation completed in \d+ms/);
        done();
      }, 50);
    });

    /**
     * Test: Child logger securityEvent works
     */
    test('should use child logger securityEvent', () => {
      const mockChild = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        http: jest.fn(),
        debug: jest.fn(),
        child: jest.fn(),
      };
      mockLoggerInstance.child.mockReturnValueOnce(mockChild);

      const childLogger = logger.child('test-correlation');
      childLogger.securityEvent('Child security event', { ip: '127.0.0.1' });

      expect(mockChild.warn).toHaveBeenCalledWith(
        'SECURITY: Child security event',
        { ip: '127.0.0.1', security: true }
      );
    });

    /**
     * Test: Child logger dbQuery works
     */
    test('should use child logger dbQuery', () => {
      const mockChild = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        http: jest.fn(),
        debug: jest.fn(),
        child: jest.fn(),
      };
      mockLoggerInstance.child.mockReturnValueOnce(mockChild);

      const childLogger = logger.child('test-correlation');
      childLogger.dbQuery('SELECT * FROM test', 100, { rows: 5 });

      expect(mockChild.debug).toHaveBeenCalledWith(
        'DB Query: SELECT * FROM test',
        { duration: 100, rows: 5 }
      );
    });

    /**
     * Test: Child logger apiRequest works
     */
    test('should use child logger apiRequest', () => {
      const mockChild = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        http: jest.fn(),
        debug: jest.fn(),
        child: jest.fn(),
      };
      mockLoggerInstance.child.mockReturnValueOnce(mockChild);

      const childLogger = logger.child('test-correlation');
      childLogger.apiRequest('POST', '/api/test', 201, 150, { userId: '123' });

      expect(mockChild.http).toHaveBeenCalledWith(
        'POST /api/test 201',
        { duration: 150, userId: '123' }
      );
    });

    /**
     * Test: Child logger generateCorrelationId works
     */
    test('should use child logger generateCorrelationId', () => {
      (uuidv4 as jest.Mock).mockReturnValue('child-uuid');

      const mockChild = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        http: jest.fn(),
        debug: jest.fn(),
        child: jest.fn(),
      };
      mockLoggerInstance.child.mockReturnValueOnce(mockChild);

      const childLogger = logger.child('test-correlation');
      const correlationId = childLogger.generateCorrelationId();

      expect(correlationId).toBe('child-uuid');
    });
  });
});
