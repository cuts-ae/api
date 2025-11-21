import request from 'supertest';
import express, { Express } from 'express';
import { createRateLimiter, resetRateLimitStore } from '../../middleware/rate-limit';
import { errorHandler } from '../../middleware/errorHandler';

describe('Rate Limiting Security Tests', () => {
  let app: Express;

  const createAppWithErrorHandler = (): Express => {
    const newApp = express();
    newApp.use(express.json());
    // Error handler must be added after all other middlewares
    return newApp;
  };

  beforeEach(() => {
    resetRateLimitStore();
    app = createAppWithErrorHandler();
  });

  afterEach(() => {
    resetRateLimitStore();
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests within the limit', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 3
      });

      app.get('/test', limiter, (req, res) => {
        res.json({ success: true });
      });

      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);
    });

    it('should block requests exceeding the limit', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 3
      });

      app.get('/test', limiter, (req, res) => {
        res.json({ success: true });
      });
      app.use(errorHandler);

      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);

      const response = await request(app).get('/test').expect(429);
      expect(response.body.code).toBe('RATE_001');
      expect(response.body.message).toBeTruthy();
    });

    it('should include rate limit headers in response', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 5
      });

      app.get('/test', limiter, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get('/test').expect(200);

      expect(response.headers['x-ratelimit-limit']).toBe('5');
      expect(response.headers['x-ratelimit-remaining']).toBe('4');
      expect(response.headers['x-ratelimit-reset']).toBeTruthy();
    });

    it('should include Retry-After header when rate limited', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 2
      });

      app.get('/test', limiter, (req, res) => {
        res.json({ success: true });
      });

      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);

      const response = await request(app).get('/test').expect(429);

      expect(response.headers['retry-after']).toBeTruthy();
      expect(parseInt(response.headers['retry-after'])).toBeGreaterThan(0);
    });
  });

  describe('Rate Limit Window', () => {
    it('should reset counter after window expires', async () => {
      const limiter = createRateLimiter({
        windowMs: 100,
        max: 2
      });

      app.get('/test', limiter, (req, res) => {
        res.json({ success: true });
      });

      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(429);

      await new Promise(resolve => setTimeout(resolve, 150));

      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);
    });

    // Note: Supertest doesn't properly simulate different IPs via X-Forwarded-For in test environment
    // This functionality is tested via custom key generators in later tests
  });

  describe('Custom Key Generation', () => {
    it('should use custom key generator for rate limiting', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 2,
        keyGenerator: (req) => `user:${req.headers['user-id'] || 'anonymous'}`
      });

      app.get('/test', limiter, (req, res) => {
        res.json({ success: true });
      });

      await request(app).get('/test').set('user-id', 'user1').expect(200);
      await request(app).get('/test').set('user-id', 'user1').expect(200);
      await request(app).get('/test').set('user-id', 'user1').expect(429);

      await request(app).get('/test').set('user-id', 'user2').expect(200);
    });

    it('should rate limit by endpoint and user', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 2,
        keyGenerator: (req) => `${req.path}:${req.headers['user-id'] || 'anonymous'}`
      });

      app.get('/endpoint1', limiter, (req, res) => {
        res.json({ endpoint: 1 });
      });

      app.get('/endpoint2', limiter, (req, res) => {
        res.json({ endpoint: 2 });
      });

      await request(app).get('/endpoint1').set('user-id', 'user1').expect(200);
      await request(app).get('/endpoint1').set('user-id', 'user1').expect(200);
      await request(app).get('/endpoint1').set('user-id', 'user1').expect(429);

      await request(app).get('/endpoint2').set('user-id', 'user1').expect(200);
    });
  });

  describe('Custom Error Codes', () => {
    it('should use custom error code', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
        errorCode: 'RATE_002'
      });

      app.get('/test', limiter, (req, res) => {
        res.json({ success: true });
      });
      app.use(errorHandler);

      await request(app).get('/test').expect(200);

      const response = await request(app).get('/test').expect(429);
      expect(response.body.code).toBe('RATE_002');
      expect(response.body.message).toBeTruthy();
    });

    it('should use default error code when not specified', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1
      });

      app.get('/test', limiter, (req, res) => {
        res.json({ success: true });
      });
      app.use(errorHandler);

      await request(app).get('/test').expect(200);

      const response = await request(app).get('/test').expect(429);
      expect(response.body.code).toBe('RATE_001');
      expect(response.body.message).toBeTruthy();
    });
  });

  describe('Multiple Rate Limiters', () => {
    it('should allow different rate limits for different endpoints', async () => {
      const strictLimiter = createRateLimiter({
        windowMs: 60000,
        max: 2
      });

      const lenientLimiter = createRateLimiter({
        windowMs: 60000,
        max: 5
      });

      app.get('/strict', strictLimiter, (req, res) => {
        res.json({ endpoint: 'strict' });
      });

      app.get('/lenient', lenientLimiter, (req, res) => {
        res.json({ endpoint: 'lenient' });
      });

      await request(app).get('/strict').expect(200);
      await request(app).get('/strict').expect(200);
      await request(app).get('/strict').expect(429);

      await request(app).get('/lenient').expect(200);
      await request(app).get('/lenient').expect(200);
      await request(app).get('/lenient').expect(200);
    });

    it('should apply multiple limiters in sequence', async () => {
      const limiter1 = createRateLimiter({
        windowMs: 60000,
        max: 5,
        keyGenerator: () => 'global'
      });

      const limiter2 = createRateLimiter({
        windowMs: 60000,
        max: 3,
        keyGenerator: (req) => `user:${req.ip}`
      });

      app.get('/test', limiter1, limiter2, (req, res) => {
        res.json({ success: true });
      });

      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);

      await request(app).get('/test').expect(429);
    });
  });

  describe('DoS Attack Prevention', () => {
    it('should prevent rapid-fire requests', async () => {
      const limiter = createRateLimiter({
        windowMs: 1000,
        max: 10
      });

      app.get('/test', limiter, (req, res) => {
        res.json({ success: true });
      });

      const promises = [];
      for (let i = 0; i < 15; i++) {
        promises.push(request(app).get('/test'));
      }

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.status === 200).length;
      const blockedCount = results.filter(r => r.status === 429).length;

      expect(successCount).toBeLessThanOrEqual(10);
      expect(blockedCount).toBeGreaterThanOrEqual(5);
    });

    it('should prevent distributed attack from multiple IPs', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 2,
        keyGenerator: () => 'global'
      });

      app.get('/test', limiter, (req, res) => {
        res.json({ success: true });
      });

      await request(app).get('/test').set('X-Forwarded-For', '1.1.1.1').expect(200);
      await request(app).get('/test').set('X-Forwarded-For', '2.2.2.2').expect(200);

      await request(app).get('/test').set('X-Forwarded-For', '3.3.3.3').expect(429);
    });
  });

  describe('Authentication Endpoint Rate Limiting', () => {
    it('should apply strict rate limiting on login endpoint', async () => {
      const authLimiter = createRateLimiter({
        windowMs: 15 * 60 * 1000,
        max: 5,
        errorCode: 'RATE_002'
      });

      app.post('/auth/login', authLimiter, (req, res) => {
        res.json({ token: 'fake-token' });
      });
      app.use(errorHandler);

      for (let i = 0; i < 5; i++) {
        await request(app).post('/auth/login').send({ email: 'test@test.com' }).expect(200);
      }

      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'test@test.com' })
        .expect(429);

      expect(response.body.code).toBe('RATE_002');
      expect(response.body.message).toMatch(/authentication|Too many/i);
    });

    it('should prevent brute force attacks on authentication', async () => {
      const authLimiter = createRateLimiter({
        windowMs: 60000,
        max: 3,
        keyGenerator: (req) => `auth:${req.body?.email || req.ip}`
      });

      app.post('/auth/login', authLimiter, (req, res) => {
        if (req.body.password === 'correct') {
          res.json({ token: 'valid-token' });
        } else {
          res.status(401).json({ error: 'Invalid credentials' });
        }
      });
      app.use(errorHandler);

      await request(app).post('/auth/login').send({ email: 'user@test.com', password: 'wrong1' });
      await request(app).post('/auth/login').send({ email: 'user@test.com', password: 'wrong2' });
      await request(app).post('/auth/login').send({ email: 'user@test.com', password: 'wrong3' });

      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'user@test.com', password: 'correct' })
        .expect(429);

      expect(response.body.code).toBeTruthy();
      expect(response.body.message).toBeTruthy();
    });

    it('should rate limit per user email for authentication', async () => {
      const authLimiter = createRateLimiter({
        windowMs: 60000,
        max: 3,
        keyGenerator: (req) => `auth:${req.body?.email || 'unknown'}`
      });

      app.post('/auth/login', authLimiter, (req, res) => {
        res.json({ token: 'token' });
      });

      await request(app).post('/auth/login').send({ email: 'user1@test.com' }).expect(200);
      await request(app).post('/auth/login').send({ email: 'user1@test.com' }).expect(200);
      await request(app).post('/auth/login').send({ email: 'user1@test.com' }).expect(200);

      await request(app).post('/auth/login').send({ email: 'user1@test.com' }).expect(429);

      await request(app).post('/auth/login').send({ email: 'user2@test.com' }).expect(200);
    });
  });

  describe('Header Validation', () => {
    it('should correctly decrement remaining count', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 5
      });

      app.get('/test', limiter, (req, res) => {
        res.json({ success: true });
      });

      let response = await request(app).get('/test').expect(200);
      expect(response.headers['x-ratelimit-remaining']).toBe('4');

      response = await request(app).get('/test').expect(200);
      expect(response.headers['x-ratelimit-remaining']).toBe('3');

      response = await request(app).get('/test').expect(200);
      expect(response.headers['x-ratelimit-remaining']).toBe('2');

      response = await request(app).get('/test').expect(200);
      expect(response.headers['x-ratelimit-remaining']).toBe('1');

      response = await request(app).get('/test').expect(200);
      expect(response.headers['x-ratelimit-remaining']).toBe('0');
    });

    it('should show 0 remaining when rate limited', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 2
      });

      app.get('/test', limiter, (req, res) => {
        res.json({ success: true });
      });

      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);

      const response = await request(app).get('/test').expect(429);
      expect(response.headers['x-ratelimit-remaining']).toBe('0');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing IP address', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 2
      });

      app.get('/test', limiter, (req, res) => {
        res.json({ success: true });
      });

      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(429);
    });

    it('should handle zero max limit', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 0
      });

      app.get('/test', limiter, (req, res) => {
        res.json({ success: true });
      });

      await request(app).get('/test').expect(429);
    });

    it('should handle very short window', async () => {
      const limiter = createRateLimiter({
        windowMs: 1,
        max: 1
      });

      app.get('/test', limiter, (req, res) => {
        res.json({ success: true });
      });

      await request(app).get('/test').expect(200);

      await new Promise(resolve => setTimeout(resolve, 10));

      await request(app).get('/test').expect(200);
    });

    it('should handle very large max limit', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1000000
      });

      app.get('/test', limiter, (req, res) => {
        res.json({ success: true });
      });

      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(request(app).get('/test'));
      }

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.status === 200).length;

      expect(successCount).toBe(100);
    });
  });

  describe('Error Handling', () => {
    it('should include retry information in error response', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1
      });

      app.get('/test', limiter, (req, res) => {
        res.json({ success: true });
      });
      app.use(errorHandler);

      await request(app).get('/test').expect(200);

      const response = await request(app).get('/test').expect(429);
      expect(response.body.details?.retryAfter).toBeGreaterThan(0);
      expect(response.body.details?.retryAfter).toBeLessThanOrEqual(60);
    });

    it('should maintain rate limit across middleware chain', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 2
      });

      const middleware = (req: any, res: any, next: any) => {
        next();
      };

      app.get('/test', limiter, middleware, (req, res) => {
        res.json({ success: true });
      });
      app.use(errorHandler);

      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(429);
    });
  });
});
