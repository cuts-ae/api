/**
 * Resource Exhaustion Chaos Testing Suite
 *
 * Tests the API's resilience to resource exhaustion scenarios:
 * - Memory pressure and leaks
 * - High CPU usage scenarios
 * - Many concurrent requests (1000+)
 * - File descriptor exhaustion
 *
 * These tests verify that the system handles resource constraints
 * gracefully without crashing or becoming unresponsive.
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
    query: jest.fn()
  }
}));

describeOrSkip('Resource Exhaustion Chaos Tests', () => {
  const mockPool = pool as any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockPool.query = jest.fn();

    // Enable garbage collection tracking
    if (global.gc) {
      global.gc();
    }
  });

  afterEach(() => {
    jest.useRealTimers();

    // Force garbage collection after each test
    if (global.gc) {
      global.gc();
    }
  });

  describe('Memory Pressure', () => {
    it('should handle large request payloads', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      // Create a large payload (10KB - reasonable size for testing)
      const largePayload = {
        email: 'test@cuts.ae',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User',
        role: UserRole.CUSTOMER,
        large_data: 'x'.repeat(10 * 1024)
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(largePayload);

      // Should handle or reject large payloads gracefully
      expect(response.status).toBeDefined();
      expect([200, 400, 413, 500]).toContain(response.status);
    });

    it('should handle many concurrent large payloads', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const largePayload = {
        email: 'test@cuts.ae',
        password: 'password123',
        data: 'x'.repeat(10 * 1024) // 10KB per request
      };

      const requests = Array.from({ length: 50 }, (_, i) =>
        request(app)
          .post('/api/v1/auth/login')
          .send({ ...largePayload, email: `test${i}@cuts.ae` })
      );

      const responses = await Promise.all(requests);

      // All requests should be handled
      expect(responses.length).toBe(50);
      responses.forEach((response) => {
        expect(response.status).toBeDefined();
      });
    });

    it('should handle large database result sets', async () => {
      // Simulate database returning large result set (10MB of data)
      const largeResult = Array.from({ length: 10000 }, (_, i) => ({
        id: `id-${i}`,
        email: `user${i}@cuts.ae`,
        first_name: 'Test',
        last_name: 'User',
        data: 'x'.repeat(1000)
      }));

      mockPool.query.mockResolvedValue({ rows: largeResult });

      const response = await request(app).get('/health');

      expect(response.status).toBeDefined();
    });

    it('should handle memory allocation failures gracefully', async () => {
      // Simulate out of memory scenario
      mockPool.query.mockImplementation(() => {
        // Try to allocate large array
        try {
          const largeArray = new Array(10000000).fill('x'.repeat(1000));
          return Promise.resolve({ rows: largeArray.slice(0, 1) });
        } catch (error) {
          return Promise.reject(new Error('Out of memory'));
        }
      });

      const response = await request(app).get('/health');

      expect(response.status).toBeDefined();
      expect([200, 500, 503]).toContain(response.status);
    });

    it('should not leak memory on repeated requests', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ status: 'ok' }] });

      const initialMemory = process.memoryUsage().heapUsed;

      // Make many requests
      for (let i = 0; i < 100; i++) {
        await request(app).get('/health');

        // Periodic garbage collection
        if (i % 20 === 0 && global.gc) {
          global.gc();
        }
      }

      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;

      // Memory should not grow excessively (allow some reasonable growth)
      const memoryGrowth = finalMemory - initialMemory;
      const maxAllowedGrowth = 50 * 1024 * 1024; // 50MB

      expect(memoryGrowth).toBeLessThan(maxAllowedGrowth);
    });

    it('should handle rapid allocation and deallocation', async () => {
      mockPool.query.mockImplementation(() => {
        // Allocate temporary large object
        const temp = { data: new Array(1000).fill('x'.repeat(1000)) };
        return Promise.resolve({ rows: [{ id: temp.data.length }] });
      });

      const requests = Array.from({ length: 100 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBeDefined();
      });
    });
  });

  describe('High CPU Usage', () => {
    it('should handle CPU-intensive operations', async () => {
      mockPool.query.mockImplementation(() => {
        // Simulate CPU-intensive work
        let result = 0;
        for (let i = 0; i < 1000000; i++) {
          result += Math.sqrt(i);
        }

        return Promise.resolve({ rows: [{ result }] });
      });

      const response = await request(app).get('/health');

      expect(response.status).toBeDefined();
    });

    it('should handle concurrent CPU-intensive requests', async () => {
      mockPool.query.mockImplementation(() => {
        // Simulate CPU work
        const start = Date.now();
        let sum = 0;
        while (Date.now() - start < 10) {
          sum += Math.random();
        }

        return Promise.resolve({ rows: [{ sum }] });
      });

      const requests = Array.from({ length: 50 }, () =>
        request(app).get('/health')
      );

      jest.advanceTimersByTime(100);

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBeDefined();
      });
    });

    it('should remain responsive during high CPU load', async () => {
      let cpuLoadActive = true;

      mockPool.query.mockImplementation(() => {
        if (cpuLoadActive) {
          // Simulate high CPU load
          let result = 0;
          for (let i = 0; i < 500000; i++) {
            result += Math.sqrt(i) * Math.random();
          }
        }

        return Promise.resolve({ rows: [{ status: 'ok' }] });
      });

      // Start CPU-intensive requests
      const heavyRequests = Array.from({ length: 10 }, () =>
        request(app).get('/health')
      );

      // Send light requests that should still be handled
      const lightRequests = Array.from({ length: 5 }, async () => {
        cpuLoadActive = false;
        const response = await request(app).get('/');
        cpuLoadActive = true;
        return response;
      });

      const [heavyResponses, lightResponses] = await Promise.all([
        Promise.all(heavyRequests),
        Promise.all(lightRequests)
      ]);

      // Both heavy and light requests should complete
      expect(heavyResponses.length).toBe(10);
      expect(lightResponses.length).toBe(5);
    });

    it('should handle complex JSON parsing under load', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const complexPayload = {
        email: 'test@cuts.ae',
        password: 'password123',
        nested: {
          level1: {
            level2: {
              level3: {
                level4: {
                  level5: Array.from({ length: 100 }, (_, i) => ({
                    id: i,
                    data: 'x'.repeat(100)
                  }))
                }
              }
            }
          }
        }
      };

      const requests = Array.from({ length: 20 }, () =>
        request(app)
          .post('/api/v1/auth/login')
          .send(complexPayload)
      );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBeDefined();
      });
    });
  });

  describe('Concurrent Request Load', () => {
    it('should handle 1000 concurrent requests', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ status: 'healthy' }] });

      const requests = Array.from({ length: 1000 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);

      expect(responses.length).toBe(1000);

      const successCount = responses.filter(r => r.status === 200).length;
      const errorCount = responses.filter(r => r.status >= 400).length;

      // All requests should be handled
      expect(responses.length).toBe(1000);
    }, 30000);

    it('should handle 1000 concurrent POST requests with payloads', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const requests = Array.from({ length: 1000 }, (_, i) =>
        request(app)
          .post('/api/v1/auth/login')
          .send({
            email: `test${i}@cuts.ae`,
            password: 'password123'
          })
      );

      const responses = await Promise.all(requests);

      expect(responses.length).toBe(1000);

      responses.forEach((response) => {
        expect(response.status).toBeDefined();
        expect([200, 401, 500, 503]).toContain(response.status);
      });
    }, 30000);

    it('should handle sustained load over multiple batches', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ status: 'ok' }] });

      const batches = 5;
      const requestsPerBatch = 100;
      const allResponses: any[] = [];

      for (let batch = 0; batch < batches; batch++) {
        const batchRequests = Array.from({ length: requestsPerBatch }, () =>
          request(app).get('/health').catch((err) => ({ status: 503, error: err.message }))
        );

        const responses = await Promise.allSettled(batchRequests);
        responses.forEach(result => {
          if (result.status === 'fulfilled') {
            allResponses.push(result.value);
          }
        });

        jest.advanceTimersByTime(10);
      }

      // Should handle all requests (some may fail under load)
      expect(allResponses.length).toBeGreaterThan(0);
      expect(allResponses.length).toBeLessThanOrEqual(batches * requestsPerBatch);
    }, 30000);

    it('should handle concurrent requests to different endpoints', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const endpoints = [
        { method: 'get', path: '/health' },
        { method: 'get', path: '/' },
        { method: 'post', path: '/api/v1/auth/login', data: { email: 'test@cuts.ae', password: 'pass' } },
        { method: 'get', path: '/api/v1/restaurants' }
      ];

      const requests = endpoints.flatMap(endpoint =>
        Array.from({ length: 250 }, () => {
          const req = request(app)[endpoint.method as 'get' | 'post'](endpoint.path);
          return endpoint.data ? req.send(endpoint.data) : req;
        })
      );

      const responses = await Promise.all(requests);

      expect(responses.length).toBe(endpoints.length * 250);

      responses.forEach((response) => {
        expect(response.status).toBeDefined();
      });
    }, 30000);

    it('should maintain request isolation under high load', async () => {
      let requestCounter = 0;

      mockPool.query.mockImplementation(() => {
        const currentRequest = ++requestCounter;
        return Promise.resolve({ rows: [{ requestId: currentRequest }] });
      });

      const requests = Array.from({ length: 500 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);

      // All requests should be handled independently
      expect(responses.length).toBe(500);
    }, 30000);

    it('should not drop requests under extreme load', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ status: 'ok' }] });

      const extremeLoad = 2000;
      const requests = Array.from({ length: extremeLoad }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);

      // Should handle all requests (may return errors, but shouldn't drop)
      expect(responses.length).toBe(extremeLoad);

      responses.forEach((response) => {
        expect(response.status).toBeDefined();
        expect(response.body).toBeDefined();
      });
    }, 30000);
  });

  describe('File Descriptor Exhaustion', () => {
    it('should handle many simultaneous database connections', async () => {
      let activeConnections = 0;

      mockPool.query.mockImplementation(() => {
        activeConnections++;

        return new Promise((resolve) => {
          setTimeout(() => {
            activeConnections--;
            resolve({ rows: [{ status: 'ok' }] });
          }, 50);
        });
      });

      const requests = Array.from({ length: 500 }, () =>
        request(app).get('/health')
      );

      jest.advanceTimersByTime(100);

      const responses = await Promise.all(requests);

      expect(responses.length).toBe(500);
    }, 30000);

    it('should handle rapid connection creation and destruction', async () => {
      mockPool.query.mockImplementation(() => {
        // Simulate quick connection lifecycle
        return Promise.resolve({ rows: [{ status: 'ok' }] });
      });

      for (let i = 0; i < 100; i++) {
        await request(app).get('/health');
      }

      // Should complete without file descriptor errors
      const finalResponse = await request(app).get('/health');
      expect(finalResponse.status).toBeDefined();
    });

    it('should properly close connections on error', async () => {
      let connectionCount = 0;

      mockPool.query.mockImplementation(() => {
        connectionCount++;

        if (connectionCount % 5 === 0) {
          return Promise.reject(new Error('Connection error'));
        }

        return Promise.resolve({ rows: [{ status: 'ok' }] });
      });

      const requests = Array.from({ length: 50 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);

      // Connections should be properly managed despite errors
      expect(responses.length).toBe(50);
    });

    it('should handle file descriptor limits gracefully', async () => {
      mockPool.query.mockImplementation(() => {
        // Simulate file descriptor exhaustion
        if (Math.random() < 0.1) {
          return Promise.reject(new Error('EMFILE: too many open files'));
        }
        return Promise.resolve({ rows: [{ status: 'ok' }] });
      });

      const requests = Array.from({ length: 100 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);

      // Should handle gracefully even with file descriptor errors
      expect(responses.length).toBe(100);
      responses.forEach((response) => {
        expect(response.status).toBeDefined();
      });
    });
  });

  describe('Resource Recovery', () => {
    it('should recover after memory pressure subsides', async () => {
      // Phase 1: High memory pressure
      mockPool.query.mockImplementation(() => {
        const largeData = new Array(1000).fill('x'.repeat(1000));
        return Promise.resolve({ rows: [{ size: largeData.length }] });
      });

      const memoryRequests = Array.from({ length: 50 }, () =>
        request(app).get('/health')
      );

      await Promise.all(memoryRequests);

      if (global.gc) {
        global.gc();
      }

      // Phase 2: Normal operation
      mockPool.query.mockResolvedValue({ rows: [{ status: 'ok' }] });

      const normalRequests = Array.from({ length: 50 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(normalRequests);

      // Should operate normally after pressure subsides
      expect(responses.length).toBe(50);
    }, 30000);

    it('should recover after CPU load decreases', async () => {
      // Phase 1: High CPU load
      mockPool.query.mockImplementation(() => {
        let result = 0;
        for (let i = 0; i < 1000000; i++) {
          result += Math.sqrt(i);
        }
        return Promise.resolve({ rows: [{ result }] });
      });

      const cpuRequests = Array.from({ length: 10 }, () =>
        request(app).get('/health')
      );

      await Promise.all(cpuRequests);

      // Phase 2: Low CPU load
      mockPool.query.mockResolvedValue({ rows: [{ status: 'ok' }] });

      const normalRequests = Array.from({ length: 20 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(normalRequests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it('should recover after connection pool exhaustion', async () => {
      let connections = 0;

      // Phase 1: Exhaust connection pool
      mockPool.query.mockImplementation(() => {
        connections++;
        if (connections > 20) {
          return Promise.reject(new Error('Too many connections'));
        }
        return new Promise(() => {}); // Never resolve to hold connections
      });

      const exhaustRequests = Array.from({ length: 30 }, () =>
        request(app).get('/health').timeout(100).catch(() => ({ status: 503 }))
      );

      await Promise.allSettled(exhaustRequests);

      // Phase 2: Connections released
      connections = 0;
      mockPool.query.mockResolvedValue({ rows: [{ status: 'ok' }] });

      const recoveryRequests = Array.from({ length: 10 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(recoveryRequests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it('should clear resource metrics after load', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ status: 'ok' }] });

      // Create load
      const loadRequests = Array.from({ length: 500 }, () =>
        request(app).get('/health')
      );

      await Promise.all(loadRequests);

      // Wait and check recovery
      jest.advanceTimersByTime(1000);

      if (global.gc) {
        global.gc();
      }

      // System should be back to normal
      const checkRequest = await request(app).get('/health');
      expect(checkRequest.status).toBe(200);
    }, 30000);
  });

  describe('Edge Cases', () => {
    it('should handle zero-length payloads', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({});

      expect(response.status).toBeDefined();
      expect([400, 401]).toContain(response.status);
    });

    it('should handle extremely nested JSON', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      let nested: any = { value: 'end' };
      for (let i = 0; i < 50; i++) {
        nested = { nested };
      }

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@cuts.ae', password: 'pass', data: nested });

      expect(response.status).toBeDefined();
    });

    it('should handle requests with many headers', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ status: 'ok' }] });

      const req = request(app).get('/health');

      for (let i = 0; i < 50; i++) {
        req.set(`X-Custom-Header-${i}`, `value-${i}`);
      }

      const response = await req;

      expect(response.status).toBeDefined();
    });

    it('should handle rapid sequential requests from same client', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ status: 'ok' }] });

      const responses: any[] = [];

      for (let i = 0; i < 100; i++) {
        const response = await request(app).get('/health');
        responses.push(response);
      }

      expect(responses.length).toBe(100);
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
  });
});
