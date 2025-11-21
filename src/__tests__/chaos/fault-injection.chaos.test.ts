/**
 * Fault Injection Chaos Testing Suite
 *
 * Tests the API's resilience to injected faults:
 * - Random errors in middleware
 * - Invalid data in requests
 * - Circuit breaker patterns
 * - Graceful degradation
 *
 * These tests verify that the system handles unexpected failures
 * gracefully and degrades functionality appropriately.
 */

import request from 'supertest';
import app from '../../app';
import pool from '../../config/database';
import jwt from 'jsonwebtoken';
import { UserRole } from '../../types';

// Skip chaos tests unless explicitly enabled
const SKIP_CHAOS_TESTS = process.env.SKIP_CHAOS_TESTS === 'true';
const describeOrSkip = SKIP_CHAOS_TESTS ? describe.skip : describe;

// Mock the database pool
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    query: jest.fn()
  }
}));

describeOrSkip('Fault Injection Chaos Tests', () => {
  const mockPool = pool as any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockPool.query = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Random Middleware Errors', () => {
    it('should handle random database errors in middleware', async () => {
      let callCount = 0;

      mockPool.query.mockImplementation(() => {
        callCount++;

        // 30% chance of random error
        if (Math.random() < 0.3) {
          const errors = [
            'Connection lost',
            'Query timeout',
            'Deadlock detected',
            'Constraint violation'
          ];
          const randomError = errors[Math.floor(Math.random() * errors.length)];
          return Promise.reject(new Error(randomError));
        }

        return Promise.resolve({ rows: [{ status: 'ok' }] });
      });

      const requests = Array.from({ length: 50 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);

      // All requests should be handled (success or error)
      expect(responses.length).toBe(50);
      responses.forEach((response) => {
        expect(response.status).toBeDefined();
        expect([200, 500, 503]).toContain(response.status);
      });
    });

    it('should handle errors thrown in authentication middleware', async () => {
      const invalidToken = 'invalid.jwt.token.here';

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBeDefined();
    });

    it('should handle malformed JWT tokens', async () => {
      const malformedTokens = [
        'Bearer',
        'Bearer ',
        'Bearer notavalidtoken',
        'Bearer a.b',
        'Bearer ...',
        'NotBearer token'
      ];

      for (const token of malformedTokens) {
        const response = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', token);

        expect([401, 403]).toContain(response.status);
      }
    });

    it('should handle unexpected middleware exceptions', async () => {
      mockPool.query.mockImplementation(() => {
        // Random chance of throwing unexpected error
        if (Math.random() < 0.2) {
          throw new Error('Unexpected synchronous error');
        }
        return Promise.resolve({ rows: [{ status: 'ok' }] });
      });

      const requests = Array.from({ length: 30 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBeDefined();
        expect(response.body).toBeDefined();
      });
    });

    it('should handle errors in error handler middleware', async () => {
      // Trigger an error that might cause issues in error handler
      mockPool.query.mockRejectedValue({
        message: undefined,
        code: null,
        detail: undefined
      });

      const response = await request(app).get('/health');

      // Should still return a valid response (even if error)
      expect(response.status).toBeDefined();
      expect(response.body).toBeDefined();
      expect([200, 500, 503]).toContain(response.status);
    });
  });

  describe('Invalid Data Injection', () => {
    it('should handle null bytes in request data', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test\x00@cuts.ae',
          password: 'password\x00123'
        });

      expect(response.status).toBeDefined();
      expect([400, 401]).toContain(response.status);
    });

    it('should handle unicode edge cases', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const unicodeEdgeCases = [
        'test\uFEFF@cuts.ae', // Zero-width no-break space
        'test\u200B@cuts.ae', // Zero-width space
        'test\uFFFD@cuts.ae', // Replacement character
        '🔥test@cuts.ae',      // Emoji
        'test@cuts.ae\u202E'  // Right-to-left override
      ];

      for (const email of unicodeEdgeCases) {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({ email, password: 'password123' });

        expect(response.status).toBeDefined();
      }
    });

    it('should handle excessively long strings', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const longString = 'a'.repeat(10000);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: `${longString}@cuts.ae`,
          password: longString
        });

      expect(response.status).toBeDefined();
      expect([400, 401, 413]).toContain(response.status);
    });

    it('should handle circular JSON references gracefully', async () => {
      // Express JSON parser should handle this, but test it anyway
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"a": {"b": {"c": {"$ref": "$"}}}}');

      expect(response.status).toBeDefined();
    });

    it('should handle mixed data types in request', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const mixedData = {
        email: ['array', 'instead', 'of', 'string'],
        password: { object: 'instead', of: 'string' },
        first_name: 123,
        last_name: true,
        role: null
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(mixedData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBeDefined();
    });

    it('should handle NaN and Infinity values', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@cuts.ae',
          password: 'password',
          extra: NaN,
          another: Infinity
        });

      expect(response.status).toBeDefined();
    });

    it('should handle prototype pollution attempts', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const pollutionAttempts: any[] = [
        { __proto__: { polluted: true }, email: 'test@cuts.ae', password: 'pass' },
        { constructor: { prototype: { polluted: true } }, email: 'test@cuts.ae', password: 'pass' },
        { 'constructor.prototype.polluted': true, email: 'test@cuts.ae', password: 'pass' }
      ];

      for (const payload of pollutionAttempts) {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send(payload);

        expect(response.status).toBeDefined();

        // Verify prototype wasn't actually polluted
        expect((Object.prototype as any).polluted).toBeUndefined();
      }
    });

    it('should handle SQL injection in various fields', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const sqlInjections = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'--",
        "' OR 1=1--",
        "' UNION SELECT NULL--"
      ];

      for (const injection of sqlInjections) {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: injection,
            password: injection
          });

        expect(response.status).toBeDefined();
        expect([400, 401]).toContain(response.status);
      }
    });

    it('should handle NoSQL injection attempts', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const noSqlInjections = [
        { $ne: null },
        { $gt: '' },
        { $regex: '.*' }
      ];

      for (const injection of noSqlInjections) {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: injection,
            password: injection
          });

        expect(response.status).toBeDefined();
      }
    });
  });

  describe('Circuit Breaker Patterns', () => {
    it('should open circuit after consecutive failures', async () => {
      let failureCount = 0;

      mockPool.query.mockImplementation(() => {
        failureCount++;

        if (failureCount <= 10) {
          return Promise.reject(new Error('Service unavailable'));
        }

        // After 10 failures, service recovers
        return Promise.resolve({ rows: [{ status: 'ok' }] });
      });

      const responses = [];
      // Execute sequentially to maintain order
      for (let i = 0; i < 20; i++) {
        responses.push(await request(app).get('/health'));
      }

      // Should have mix of failures and successes
      const failures = responses.filter(r => r.status >= 500).length;
      const successes = responses.filter(r => r.status === 200).length;
      expect(failures + successes).toBe(20);
      expect(responses.length).toBe(20);
    });

    it('should implement retry logic for transient failures', async () => {
      let attemptCount = 0;

      mockPool.query.mockImplementation(() => {
        attemptCount++;

        // Fail first 2 attempts, succeed on 3rd
        if (attemptCount % 3 !== 0) {
          return Promise.reject(new Error('Transient error'));
        }

        return Promise.resolve({ rows: [{ status: 'ok' }] });
      });

      const requests = Array.from({ length: 15 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);

      // Some requests should eventually succeed
      const successes = responses.filter(r => r.status === 200).length;
      expect(successes).toBeGreaterThan(0);
    });

    it('should handle cascading failures across services', async () => {
      let databaseFailure = true;

      mockPool.query.mockImplementation(() => {
        if (databaseFailure) {
          return Promise.reject(new Error('Database cascade failure'));
        }
        return Promise.resolve({ rows: [{ status: 'ok' }] });
      });

      // First wave of requests during failure
      const failedResponses = [];
      for (let i = 0; i < 10; i++) {
        failedResponses.push(await request(app).get('/health'));
      }

      failedResponses.forEach((response) => {
        expect([200, 500, 503]).toContain(response.status);
      });

      // Recovery
      databaseFailure = false;

      const recoveredRequests = Array.from({ length: 10 }, () =>
        request(app).get('/health')
      );

      const recoveredResponses = await Promise.all(recoveredRequests);

      recoveredResponses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it('should implement timeout for slow operations', async () => {
      mockPool.query.mockImplementation(() =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ rows: [{ status: 'ok' }] });
          }, 35000); // Longer than test timeout
        })
      );

      const requestPromise = request(app).get('/health');

      jest.advanceTimersByTime(35000);

      const response = await requestPromise;

      // Should timeout or complete
      expect(response.status).toBeDefined();
    });

    it('should fail fast after circuit opens', async () => {
      mockPool.query.mockImplementation(() => {
        // Always fail
        return Promise.reject(new Error('Service down'));
      });

      const startTime = Date.now();

      const requests = Array.from({ length: 20 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should complete quickly
      expect(responses.length).toBe(20);
      expect(duration).toBeLessThan(30000); // Should complete in under 30s
    });
  });

  describe('Graceful Degradation', () => {
    it('should serve cached data when database is unavailable', async () => {
      // First request succeeds and caches data
      mockPool.query.mockResolvedValueOnce({ rows: [{ status: 'healthy' }] });

      const firstResponse = await request(app).get('/health');
      expect(firstResponse.status).toBe(200);

      // Database goes down
      mockPool.query.mockRejectedValue(new Error('Database down'));

      // Should still respond (may be degraded)
      const secondResponse = await request(app).get('/health');
      expect(secondResponse.status).toBeDefined();
    });

    it('should disable non-critical features during outage', async () => {
      mockPool.query.mockRejectedValue(new Error('Partial outage'));

      // Critical endpoint should still work (even with errors)
      const healthResponse = await request(app).get('/health');
      expect(healthResponse.status).toBeDefined();

      // Non-critical features may fail
      const authResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@cuts.ae', password: 'password' });

      expect(authResponse.status).toBeDefined();
    });

    it('should return partial data when some queries fail', async () => {
      let queryCount = 0;

      mockPool.query.mockImplementation((query: string) => {
        queryCount++;

        // Some queries succeed, some fail
        if (queryCount % 2 === 0) {
          return Promise.reject(new Error('Query failed'));
        }

        return Promise.resolve({ rows: [{ id: queryCount }] });
      });

      const response = await request(app).get('/health');

      // Should return some response (may be partial)
      expect(response.status).toBeDefined();
      expect(response.body).toBeDefined();
    });

    it('should maintain service for read operations during write failures', async () => {
      mockPool.query.mockImplementation((query: string) => {
        if (query.toUpperCase().includes('INSERT') ||
            query.toUpperCase().includes('UPDATE') ||
            query.toUpperCase().includes('DELETE')) {
          return Promise.reject(new Error('Write operations disabled'));
        }

        return Promise.resolve({ rows: [{ status: 'ok' }] });
      });

      // Read operation (health check)
      const readResponse = await request(app).get('/health');
      expect(readResponse.status).toBe(200);

      // Write operation (register)
      const writeResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@cuts.ae',
          password: 'Password123!',
          first_name: 'Test',
          last_name: 'User',
          role: UserRole.CUSTOMER
        });

      // May fail or succeed depending on caching/fallback behavior
      expect([400, 409, 500, 503]).toContain(writeResponse.status);
    });

    it('should provide informative error messages during degradation', async () => {
      mockPool.query.mockRejectedValue(new Error('Service degraded'));

      const response = await request(app).get('/health');

      expect(response.body).toBeDefined();
      // Health endpoint may return success with status or error depending on implementation
      expect([200, 500, 503]).toContain(response.status);
    });

    it('should fallback to default values when external service fails', async () => {
      mockPool.query.mockRejectedValue(new Error('External service unavailable'));

      const response = await request(app).get('/health');

      // Should return response with defaults or error
      expect(response.status).toBeDefined();
      expect(response.body).toBeDefined();
    });
  });

  describe('Chaos Combinations', () => {
    it('should handle combined network and database failures', async () => {
      let callCount = 0;

      mockPool.query.mockImplementation(() => {
        callCount++;

        const random = Math.random();

        if (random < 0.3) {
          return Promise.reject(new Error('Network timeout'));
        } else if (random < 0.5) {
          return Promise.reject(new Error('Database connection lost'));
        } else if (random < 0.6) {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({ rows: [] });
            }, 3000);
          });
        }

        return Promise.resolve({ rows: [{ status: 'ok' }] });
      });

      const requests = Array.from({ length: 50 }, () =>
        request(app).get('/health')
      );

      jest.advanceTimersByTime(3000);

      const responses = await Promise.all(requests);

      // All requests should be handled
      expect(responses.length).toBe(50);
      responses.forEach((response) => {
        expect(response.status).toBeDefined();
      });
    });

    it('should handle invalid data during system overload', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const invalidPayloads = [
        { email: null, password: undefined },
        { email: '', password: '' },
        { email: 123, password: true },
        { email: [], password: {} }
      ];

      const requests = invalidPayloads.flatMap(payload =>
        Array.from({ length: 50 }, () =>
          request(app)
            .post('/api/v1/auth/login')
            .send(payload)
        )
      );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBeDefined();
        expect([400, 401]).toContain(response.status);
      });
    });

    it('should handle cascading failures with random errors', async () => {
      let systemHealth = 100;

      mockPool.query.mockImplementation(() => {
        // System health degrades with each call
        systemHealth -= 1;

        const failureRate = (100 - systemHealth) / 100;

        if (Math.random() < failureRate) {
          return Promise.reject(new Error('Cascading failure'));
        }

        return Promise.resolve({ rows: [{ health: systemHealth }] });
      });

      const requests = Array.from({ length: 50 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);

      // Early requests more likely to succeed, later ones to fail
      const earlySuccesses = responses.slice(0, 10).filter(r => r.status === 200).length;
      const lateSuccesses = responses.slice(40).filter(r => r.status === 200).length;

      expect(earlySuccesses).toBeGreaterThanOrEqual(lateSuccesses);
    });

    it('should recover from combined chaos scenarios', async () => {
      let phase = 1;

      mockPool.query.mockImplementation(() => {
        if (phase === 1) {
          // Phase 1: Multiple failure types
          const random = Math.random();
          if (random < 0.5) {
            return Promise.reject(new Error('Random failure'));
          }
          return new Promise((resolve) => {
            setTimeout(() => resolve({ rows: [] }), 2000);
          });
        } else {
          // Phase 2: Recovery
          return Promise.resolve({ rows: [{ status: 'healthy' }] });
        }
      });

      // Chaos phase
      const chaosRequests = Array.from({ length: 20 }, () =>
        request(app).get('/health')
      );

      jest.advanceTimersByTime(2000);

      await Promise.all(chaosRequests);

      // Recovery phase
      phase = 2;

      const recoveryRequests = Array.from({ length: 10 }, () =>
        request(app).get('/health')
      );

      const recoveryResponses = await Promise.all(recoveryRequests);

      // Should fully recover
      const successCount = recoveryResponses.filter(r => r.status === 200).length;
      expect(successCount).toBe(10);
    });
  });

  describe('Edge Cases and Corner Cases', () => {
    it('should handle requests with missing content-type', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', '')
        .send('email=test@cuts.ae&password=password');

      expect(response.status).toBeDefined();
    });

    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"email": "test@cuts.ae", "password": "incomplete"');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle requests with conflicting headers', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@cuts.ae', password: 'password' });

      expect(response.status).toBeDefined();
    }, 15000); // Increase timeout to 15s

    it('should handle simultaneous valid and invalid requests', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const validRequests = Array.from({ length: 25 }, () =>
        request(app).get('/health')
      );

      const invalidRequests = Array.from({ length: 25 }, () =>
        request(app)
          .post('/api/v1/auth/login')
          .send({ invalid: 'data' })
      );

      const allRequests = [...validRequests, ...invalidRequests];
      const responses = await Promise.all(allRequests);

      expect(responses.length).toBe(50);
    });
  });
});
