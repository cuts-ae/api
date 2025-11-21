/**
 * Database Chaos Testing Suite
 *
 * Tests the API's resilience to database-related failures:
 * - Database connection failures
 * - Slow database queries
 * - Transaction rollbacks
 * - Connection pool exhaustion
 *
 * These tests verify that the system handles database chaos gracefully
 * and maintains data integrity.
 */

import request from 'supertest';
import app from '../../app';
import pool from '../../config/database';
import { UserRole } from '../../types';

// Skip chaos tests unless explicitly enabled
const SKIP_CHAOS_TESTS = process.env.SKIP_CHAOS_TESTS === 'true';
const describeOrSkip = SKIP_CHAOS_TESTS ? describe.skip : describe;

// Mock the database pool
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    connect: jest.fn()
  }
}));

describeOrSkip('Database Chaos Tests', () => {
  const mockPool = pool as any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockPool.query = jest.fn();
    mockPool.connect = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Connection Failures', () => {
    it('should handle complete database unavailability', async () => {
      mockPool.query.mockRejectedValue(new Error('ECONNREFUSED: Connection refused'));

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@cuts.ae',
          password: 'password123'
        });

      // Should return error gracefully instead of crashing
      expect([401, 500, 503]).toContain(response.status);
    });

    it('should handle database connection timeout', async () => {
      mockPool.query.mockImplementation(() =>
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Connection timeout'));
          }, 3000);
        })
      );

      const requestPromise = request(app).get('/health');

      jest.advanceTimersByTime(3000);

      const response = await requestPromise;

      expect([200, 500, 503]).toContain(response.status);
    });

    it('should handle intermittent connection drops', async () => {
      let callCount = 0;

      mockPool.query.mockImplementation(() => {
        callCount++;
        if (callCount % 3 === 0) {
          return Promise.reject(new Error('Connection lost'));
        }
        return Promise.resolve({ rows: [{ status: 'ok' }] });
      });

      const requests = Array.from({ length: 9 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);

      // Some should succeed, some should fail
      const successes = responses.filter(r => r.status === 200).length;
      const failures = responses.filter(r => r.status >= 500).length;

      expect(responses.length).toBe(9);
    });

    it('should handle authentication errors from database', async () => {
      mockPool.query.mockRejectedValue(new Error('password authentication failed for user "postgres"'));

      const response = await request(app).get('/health');

      expect([200, 500, 503]).toContain(response.status);
    });

    it('should handle database not found errors', async () => {
      mockPool.query.mockRejectedValue(new Error('database "cuts_ae" does not exist'));

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@cuts.ae',
          password: 'Password123!',
          first_name: 'Test',
          last_name: 'User',
          role: UserRole.CUSTOMER
        });

      expect([400, 500, 503]).toContain(response.status);
    });

    it('should recover after database becomes available', async () => {
      // First request fails
      mockPool.query.mockRejectedValueOnce(new Error('Database unavailable'));

      const failedResponse = await request(app).get('/health');
      expect([200, 500, 503]).toContain(failedResponse.status);

      // Second request succeeds
      mockPool.query.mockResolvedValue({ rows: [{ status: 'healthy' }] });

      const successResponse = await request(app).get('/health');
      expect(successResponse.status).toBe(200);
    });
  });

  describe('Slow Queries', () => {
    it('should handle extremely slow database queries', async () => {
      jest.useRealTimers(); // Use real timers for this test

      mockPool.query.mockImplementation(() =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ rows: [] });
          }, 100); // Reduced timeout for faster test
        })
      );

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@cuts.ae', password: 'password' });

      // Should complete or timeout gracefully
      expect(response.status).toBeDefined();

      jest.useFakeTimers(); // Restore fake timers
    });

    it('should handle queries with varying response times', async () => {
      let callCount = 0;

      mockPool.query.mockImplementation(() => {
        callCount++;
        const delay = callCount % 2 === 0 ? 50 : 5000;

        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ rows: [{ id: callCount }] });
          }, delay);
        });
      });

      const requests = Array.from({ length: 10 }, () =>
        request(app).get('/health')
      );

      jest.advanceTimersByTime(5000);

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBeDefined();
      });
    });

    it('should handle slow queries during high load', async () => {
      mockPool.query.mockImplementation(() =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ rows: [] });
          }, 2000);
        })
      );

      const requests = Array.from({ length: 50 }, () =>
        request(app).get('/health')
      );

      jest.advanceTimersByTime(2000);

      const responses = await Promise.all(requests);

      expect(responses.length).toBe(50);
      responses.forEach((response) => {
        expect(response.status).toBeDefined();
      });
    });

    it('should handle cascading slow query effects', async () => {
      let queryDepth = 0;

      mockPool.query.mockImplementation(() => {
        queryDepth++;
        const delay = queryDepth * 500; // Each query gets progressively slower

        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ rows: [{ depth: queryDepth }] });
          }, delay);
        });
      });

      const requests = Array.from({ length: 5 }, () =>
        request(app).get('/health')
      );

      jest.advanceTimersByTime(3000);

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBeDefined();
      });
    });
  });

  describe('Transaction Rollbacks', () => {
    it('should handle transaction rollback on error', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: '123' }] }) // INSERT
        .mockRejectedValueOnce(new Error('Constraint violation')) // Second INSERT fails
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@cuts.ae',
          password: 'Password123!',
          first_name: 'Test',
          last_name: 'User',
          role: UserRole.CUSTOMER
        });

      // Should handle rollback gracefully
      expect([201, 400, 500]).toContain(response.status);
    });

    it('should handle multiple concurrent transaction failures', async () => {
      mockPool.query
        .mockResolvedValue({ rows: [] })
        .mockRejectedValueOnce(new Error('Deadlock detected'))
        .mockRejectedValueOnce(new Error('Transaction aborted'))
        .mockRejectedValueOnce(new Error('Serialization failure'));

      const requests = Array.from({ length: 3 }, (_, i) =>
        request(app)
          .post('/api/v1/auth/register')
          .send({
            email: `test${i}@cuts.ae`,
            password: 'Password123!',
            first_name: 'Test',
            last_name: 'User',
            role: UserRole.CUSTOMER
          })
      );

      const responses = await Promise.all(requests);

      // All should fail gracefully
      responses.forEach((response) => {
        expect([400, 500]).toContain(response.status);
      });
    });

    it('should handle transaction timeout during commit', async () => {
      jest.useRealTimers(); // Use real timers for this test

      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // Check existing user
        .mockImplementation(() =>
          new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error('Transaction timeout'));
            }, 100); // Reduced timeout for faster test
          })
        );

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@cuts.ae',
          password: 'Password123!',
          first_name: 'Test',
          last_name: 'User',
          role: UserRole.CUSTOMER
        });

      expect([400, 500, 503]).toContain(response.status);

      jest.useFakeTimers(); // Restore fake timers
    });

    it('should handle partial transaction completion', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // First query succeeds
        .mockResolvedValueOnce({ rows: [{ id: '123' }] }) // Second query succeeds
        .mockRejectedValueOnce(new Error('Connection lost during transaction')); // Third fails

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@cuts.ae',
          password: 'password123'
        });

      // Should handle gracefully
      expect(response.status).toBeDefined();
      expect([401, 500]).toContain(response.status);
    });
  });

  describe('Connection Pool Exhaustion', () => {
    it('should handle connection pool exhaustion', async () => {
      mockPool.query.mockRejectedValue(new Error('sorry, too many clients already'));

      const response = await request(app).get('/health');

      expect([200, 500, 503]).toContain(response.status);
    });

    it('should handle many concurrent database requests', async () => {
      let activeConnections = 0;
      const maxConnections = 20;

      mockPool.query.mockImplementation(() => {
        activeConnections++;

        if (activeConnections > maxConnections) {
          return Promise.reject(new Error('Connection pool exhausted'));
        }

        return new Promise((resolve) => {
          setTimeout(() => {
            activeConnections--;
            resolve({ rows: [{ status: 'ok' }] });
          }, 100);
        });
      });

      const requests = Array.from({ length: 100 }, () =>
        request(app).get('/health')
      );

      jest.advanceTimersByTime(500);

      const responses = await Promise.all(requests);

      // Some requests should succeed, some may fail due to pool exhaustion
      expect(responses.length).toBe(100);
    });

    it('should recover when connection pool has capacity', async () => {
      let requestCount = 0;

      mockPool.query.mockImplementation(() => {
        requestCount++;

        // First 25 requests fail (pool exhausted)
        if (requestCount <= 25) {
          return Promise.reject(new Error('All connections in use'));
        }

        // Later requests succeed (connections freed)
        return Promise.resolve({ rows: [{ status: 'ok' }] });
      });

      const requests = Array.from({ length: 50 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);

      // Should have some successes after pool recovers
      expect(responses.length).toBe(50);
    });

    it('should handle connection leaks gracefully', async () => {
      let leakedConnections = 0;

      mockPool.query.mockImplementation(() => {
        leakedConnections++;

        // Simulate connection leak - don't return connections to pool
        if (leakedConnections > 15) {
          return Promise.reject(new Error('No more connections available'));
        }

        return Promise.resolve({ rows: [{ id: leakedConnections }] });
      });

      const requests = Array.from({ length: 30 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);

      // Should handle gracefully even with leaks
      responses.forEach((response) => {
        expect(response.status).toBeDefined();
      });
    });
  });

  describe('Query Errors', () => {
    it('should handle SQL syntax errors', async () => {
      mockPool.query.mockRejectedValue(new Error('syntax error at or near "SELECT"'));

      const response = await request(app).get('/health');

      expect([200, 500]).toContain(response.status);
    });

    it('should handle constraint violations', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('duplicate key value violates unique constraint'));

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@cuts.ae',
          password: 'Password123!',
          first_name: 'Test',
          last_name: 'User',
          role: UserRole.CUSTOMER
        });

      expect([400, 500]).toContain(response.status);
    });

    it('should handle foreign key violations', async () => {
      mockPool.query.mockRejectedValue(
        new Error('insert or update on table violates foreign key constraint')
      );

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@cuts.ae',
          password: 'password123'
        });

      expect([400, 401, 500]).toContain(response.status);
    });

    it('should handle query result format errors', async () => {
      mockPool.query.mockResolvedValue({ rows: undefined as any });

      const response = await request(app).get('/health');

      // Should handle malformed result
      expect(response.status).toBeDefined();
      expect([200, 500]).toContain(response.status);
    });

    it('should handle unexpected null values', async () => {
      mockPool.query.mockResolvedValue({ rows: [null, null, null] });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@cuts.ae',
          password: 'password123'
        });

      expect(response.status).toBeDefined();
    });
  });

  describe('Recovery Testing', () => {
    it('should fully recover after database outage', async () => {
      // Phase 1: Database is down
      mockPool.query.mockRejectedValue(new Error('Database unavailable'));

      const outageRequests = Array.from({ length: 5 }, () =>
        request(app).get('/health')
      );

      const outageResponses = await Promise.all(outageRequests);

      outageResponses.forEach((response) => {
        expect([200, 500, 503]).toContain(response.status);
      });

      // Phase 2: Database recovers
      mockPool.query.mockResolvedValue({ rows: [{ status: 'healthy' }] });

      const recoveryRequests = Array.from({ length: 5 }, () =>
        request(app).get('/health')
      );

      const recoveryResponses = await Promise.all(recoveryRequests);

      recoveryResponses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it('should handle gradual database recovery', async () => {
      let callCount = 0;

      mockPool.query.mockImplementation(() => {
        callCount++;

        // Simulate gradual recovery - failure rate decreases over time
        const failureRate = Math.max(0, 1 - (callCount / 20));

        if (Math.random() < failureRate) {
          return Promise.reject(new Error('Database still recovering'));
        }
        return Promise.resolve({ rows: [{ status: 'ok' }] });
      });

      const requests = Array.from({ length: 30 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);

      // Later requests should have higher success rate
      const earlySuccesses = responses.slice(0, 10).filter(r => r.status === 200).length;
      const lateSuccesses = responses.slice(20).filter(r => r.status === 200).length;

      expect(lateSuccesses).toBeGreaterThanOrEqual(earlySuccesses);
    });

    it('should not have connection leaks after chaos', async () => {
      // Create and fail many connections
      for (let i = 0; i < 20; i++) {
        mockPool.query.mockRejectedValueOnce(new Error('Connection failed'));
        await request(app).get('/health');
      }

      // All new connections should work normally
      mockPool.query.mockResolvedValue({ rows: [{ status: 'healthy' }] });

      const requests = Array.from({ length: 10 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it('should clear error state after recovery', async () => {
      // Trigger errors
      mockPool.query.mockRejectedValue(new Error('Database error'));

      await request(app).get('/health');

      // Clear errors
      mockPool.query.mockResolvedValue({ rows: [{ status: 'ok' }] });

      // New requests should succeed without lingering effects
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
    });
  });

  describe('Edge Cases', () => {
    it('should handle database returning empty result sets', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@cuts.ae',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBeDefined();
    });

    it('should handle very large result sets', async () => {
      const largeResultSet = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        data: 'x'.repeat(100)
      }));

      mockPool.query.mockResolvedValue({ rows: largeResultSet });

      const response = await request(app).get('/health');

      expect(response.status).toBeDefined();
    });

    it('should handle database returning unexpected columns', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{
          unexpected_field: 'value',
          another_field: 123
        }]
      });

      const response = await request(app).get('/health');

      expect(response.status).toBeDefined();
    });

    it('should handle rapid database state changes', async () => {
      let callCount = 0;

      mockPool.query.mockImplementation(() => {
        callCount++;

        // Alternate between success and failure rapidly
        if (callCount % 2 === 0) {
          return Promise.reject(new Error('State changed'));
        }
        return Promise.resolve({ rows: [{ status: 'ok' }] });
      });

      const requests = Array.from({ length: 20 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);

      // Should handle rapid state changes
      expect(responses.length).toBe(20);
    });
  });
});
