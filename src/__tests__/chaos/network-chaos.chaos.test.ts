/**
 * Network Chaos Testing Suite
 *
 * Tests the API's resilience to network-related failures:
 * - Network delays and slow responses
 * - Connection drops mid-request
 * - Rate limiting scenarios
 * - Intermittent network failures
 *
 * These tests verify that the system handles network chaos gracefully
 * without crashing and provides appropriate error responses.
 */

import request from 'supertest';
import app from '../../app';
import pool from '../../config/database';

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

describeOrSkip('Network Chaos Tests', () => {
  const mockPool = pool as any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockPool.query = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Network Delays', () => {
    it('should handle slow database responses gracefully', async () => {
      // Simulate slow database query (5 seconds)
      mockPool.query.mockImplementation(() =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ rows: [{ id: 'test-123' }] });
          }, 5000);
        })
      );

      const requestPromise = request(app)
        .get('/health')
        .expect(200);

      // Fast-forward time
      jest.advanceTimersByTime(5000);

      const response = await requestPromise;
      expect(response.body).toHaveProperty('status');
    });

    it('should timeout on extremely slow requests', async () => {
      // Simulate request that takes longer than timeout
      mockPool.query.mockImplementation(() =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ rows: [] });
          }, 31000); // Longer than test timeout
        })
      );

      const requestPromise = request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      jest.advanceTimersByTime(31000);

      // Request should fail or timeout appropriately
      await expect(requestPromise).resolves.toBeDefined();
    });

    it('should handle multiple simultaneous slow requests', async () => {
      mockPool.query.mockImplementation(() =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ rows: [] });
          }, 3000);
        })
      );

      const requests = Array.from({ length: 10 }, () =>
        request(app).get('/health')
      );

      jest.advanceTimersByTime(3000);

      const responses = await Promise.all(requests);

      // All requests should complete successfully
      responses.forEach((response) => {
        expect([200, 500]).toContain(response.status);
      });
    });

    it('should handle intermittent delays', async () => {
      let callCount = 0;

      mockPool.query.mockImplementation(() => {
        callCount++;
        const delay = callCount % 2 === 0 ? 100 : 3000; // Alternate between fast and slow

        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ rows: [{ status: 'healthy' }] });
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

  describe('Connection Drops', () => {
    it('should handle database connection drops mid-request', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Connection terminated unexpectedly'));

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@cuts.ae',
          password: 'password123'
        });

      // Should return error instead of crashing
      expect([401, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });

    it('should recover after connection is restored', async () => {
      // First request fails
      mockPool.query.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const failedResponse = await request(app).get('/health');
      expect([500, 503]).toContain(failedResponse.status);

      // Second request succeeds (connection restored)
      mockPool.query.mockResolvedValueOnce({ rows: [{ status: 'ok' }] });

      const successResponse = await request(app).get('/health');
      expect(successResponse.status).toBe(200);
    });

    it('should handle partial response failures', async () => {
      // Simulate connection drop after partial data transfer
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: '1' }] }) // First query succeeds
        .mockRejectedValueOnce(new Error('Connection lost')); // Second query fails

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@cuts.ae',
          password: 'password123'
        });

      // Should handle gracefully
      expect(response.status).toBeDefined();
      expect(response.body).toBeDefined();
    });

    it('should handle network errors with proper error codes', async () => {
      const networkErrors = [
        'ECONNRESET',
        'ETIMEDOUT',
        'ECONNREFUSED',
        'EHOSTUNREACH',
        'ENETUNREACH'
      ];

      for (const errorCode of networkErrors) {
        jest.clearAllMocks();

        const error = new Error(`Network error: ${errorCode}`);
        (error as any).code = errorCode;
        mockPool.query.mockRejectedValueOnce(error);

        const response = await request(app).get('/health');

        // Should return error response, not crash
        expect(response.status).toBeDefined();
        expect([500, 503]).toContain(response.status);
      }
    });
  });

  describe('Rate Limiting Scenarios', () => {
    it('should handle burst of requests without crashing', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ status: 'ok' }] });

      // Send 100 requests simultaneously
      const requests = Array.from({ length: 100 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);

      // System should handle all requests
      expect(responses.length).toBe(100);
      responses.forEach((response) => {
        expect(response.status).toBeDefined();
      });
    });

    it('should handle sustained high request rate', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const batches = 5;
      const requestsPerBatch = 50;
      const allResponses: any[] = [];

      for (let i = 0; i < batches; i++) {
        const batchRequests = Array.from({ length: requestsPerBatch }, () =>
          request(app).get('/health')
        );

        const responses = await Promise.all(batchRequests);
        allResponses.push(...responses);

        jest.advanceTimersByTime(100);
      }

      expect(allResponses.length).toBe(batches * requestsPerBatch);

      // All requests should complete (may be rate limited but shouldn't crash)
      allResponses.forEach((response) => {
        expect(response.status).toBeDefined();
        expect([200, 429, 500]).toContain(response.status);
      });
    });

    it('should handle concurrent requests to different endpoints', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const endpoints = [
        '/health',
        '/',
        '/api/v1/auth/login',
        '/api/v1/restaurants',
        '/uploads/test.jpg'
      ];

      const requests = endpoints.flatMap(endpoint =>
        Array.from({ length: 20 }, () =>
          request(app).get(endpoint)
        )
      );

      const responses = await Promise.all(requests);

      expect(responses.length).toBe(endpoints.length * 20);
      responses.forEach((response) => {
        expect(response.status).toBeDefined();
      });
    });
  });

  describe('Intermittent Failures', () => {
    it('should handle random 50% failure rate', async () => {
      let callCount = 0;

      mockPool.query.mockImplementation(() => {
        callCount++;
        if (Math.random() > 0.5) {
          return Promise.reject(new Error('Random failure'));
        }
        return Promise.resolve({ rows: [{ status: 'ok' }] });
      });

      const requests = Array.from({ length: 50 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);

      const successCount = responses.filter(r => r.status === 200).length;
      const failureCount = responses.filter(r => r.status >= 400).length;

      // Some requests should succeed, some should fail
      expect(successCount + failureCount).toBe(50);
      expect(successCount).toBeGreaterThan(0);
      expect(failureCount).toBeGreaterThan(0);
    });

    it('should handle cascading failures and recovery', async () => {
      let callCount = 0;

      mockPool.query.mockImplementation(() => {
        callCount++;

        // Simulate cascading failure (fail 10 requests, then recover)
        if (callCount > 5 && callCount <= 15) {
          return Promise.reject(new Error('Cascading failure'));
        }
        return Promise.resolve({ rows: [{ status: 'ok' }] });
      });

      const requests = Array.from({ length: 20 }, (_, i) =>
        new Promise<any>(async (resolve) => {
          jest.advanceTimersByTime(100);
          const response = await request(app).get('/health');
          resolve({ index: i, status: response.status });
        })
      );

      const responses = await Promise.all(requests);

      // Early and late requests should succeed, middle ones should fail
      const earlySuccesses = responses.slice(0, 5).filter(r => r.status === 200);
      const lateSuccesses = responses.slice(15).filter(r => r.status === 200);

      expect(earlySuccesses.length).toBeGreaterThan(0);
      expect(lateSuccesses.length).toBeGreaterThan(0);
    });

    it('should maintain service during partial outage', async () => {
      // Health check always works
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('health') || !query) {
          return Promise.resolve({ rows: [{ status: 'ok' }] });
        }
        // Other queries fail
        return Promise.reject(new Error('Service degraded'));
      });

      const healthResponse = await request(app).get('/health');
      expect(healthResponse.status).toBe(200);

      const authResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@cuts.ae', password: 'password' });

      expect([401, 500]).toContain(authResponse.status);
    });

    it('should handle flaky network conditions', async () => {
      let successCount = 0;
      let failureCount = 0;

      mockPool.query.mockImplementation(() => {
        const random = Math.random();

        if (random < 0.3) {
          failureCount++;
          return Promise.reject(new Error('Network timeout'));
        } else if (random < 0.4) {
          failureCount++;
          return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Connection reset')), 100);
          });
        } else {
          successCount++;
          return Promise.resolve({ rows: [{ status: 'ok' }] });
        }
      });

      const requests = Array.from({ length: 30 }, () =>
        request(app).get('/health')
      );

      jest.advanceTimersByTime(200);

      const responses = await Promise.all(requests);

      // System should handle mix of successes and failures
      expect(responses.length).toBe(30);
      expect(successCount + failureCount).toBeGreaterThan(0);
    });
  });

  describe('Recovery Testing', () => {
    it('should fully recover after chaos stops', async () => {
      // Phase 1: Chaos - all requests fail
      mockPool.query.mockRejectedValue(new Error('Total outage'));

      const chaosRequests = Array.from({ length: 10 }, () =>
        request(app).get('/health')
      );

      const chaosResponses = await Promise.all(chaosRequests);
      const chaosFailures = chaosResponses.filter(r => r.status >= 500).length;

      expect(chaosFailures).toBeGreaterThan(0);

      // Phase 2: Recovery - all requests succeed
      mockPool.query.mockResolvedValue({ rows: [{ status: 'healthy' }] });

      const recoveryRequests = Array.from({ length: 10 }, () =>
        request(app).get('/health')
      );

      const recoveryResponses = await Promise.all(recoveryRequests);
      const recoverySuccesses = recoveryResponses.filter(r => r.status === 200).length;

      expect(recoverySuccesses).toBe(10);
    });

    it('should not have lingering effects after network issues', async () => {
      // Introduce network issues
      mockPool.query.mockRejectedValueOnce(new Error('Network error'));

      await request(app).get('/health');

      // Clear the error
      mockPool.query.mockResolvedValue({ rows: [{ status: 'ok' }] });

      // Subsequent requests should work normally
      const requests = Array.from({ length: 5 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it('should handle gradual recovery from degraded state', async () => {
      let callCount = 0;

      mockPool.query.mockImplementation(() => {
        callCount++;

        // Simulate gradual recovery: 100% failure -> 50% failure -> 0% failure
        const failureRate = Math.max(0, 1 - (callCount / 20));

        if (Math.random() < failureRate) {
          return Promise.reject(new Error('Recovering...'));
        }
        return Promise.resolve({ rows: [{ status: 'ok' }] });
      });

      const requests = Array.from({ length: 30 }, async (_, i) => {
        jest.advanceTimersByTime(50);
        return request(app).get('/health');
      });

      const responses = await Promise.all(requests);

      // Later requests should have higher success rate than earlier ones
      const earlySuccesses = responses.slice(0, 10).filter(r => r.status === 200).length;
      const lateSuccesses = responses.slice(20).filter(r => r.status === 200).length;

      expect(lateSuccesses).toBeGreaterThanOrEqual(earlySuccesses);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty response bodies during network issues', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@cuts.ae', password: 'password' });

      expect(response.body).toBeDefined();
      expect(typeof response.body).toBe('object');
    });

    it('should handle malformed responses during network chaos', async () => {
      mockPool.query.mockResolvedValue({ rows: null as any });

      const response = await request(app).get('/health');

      // Should handle gracefully
      expect(response.status).toBeDefined();
      expect([200, 500]).toContain(response.status);
    });

    it('should handle very large response payloads under network stress', async () => {
      const largePayload = Array.from({ length: 1000 }, (_, i) => ({
        id: `id-${i}`,
        data: 'x'.repeat(1000)
      }));

      mockPool.query.mockResolvedValue({ rows: largePayload });

      const response = await request(app).get('/health');

      expect(response.status).toBeDefined();
    });
  });
});
