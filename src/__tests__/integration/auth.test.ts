import request from 'supertest';
import express, { Application } from 'express';
import authRoutes from '../../routes/auth.routes';
import { errorHandler } from '../../middleware/errorHandler';
import pool from "../../config/database";
import { UserRole } from '../../types';

// Create test app
const createTestApp = (): Application => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/auth', authRoutes);
  app.use(errorHandler);
  return app;
};

describe('Authentication Endpoints', () => {
  let app: Application;
  const testEmail = `test-${Date.now()}@cuts.ae`;
  let authToken: string;
  let userId: string;

  beforeAll(() => {
    app = createTestApp();
  });

  afterAll(async () => {
    // Cleanup: Delete test user
    if (userId) {
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    }
    // Close pool connection
    await pool.end();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should successfully register a new customer', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: 'TestPassword123!',
          first_name: 'Test',
          last_name: 'User',
          phone: '+971501234567',
          role: UserRole.CUSTOMER
        })
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testEmail);
      expect(response.body.user.role).toBe(UserRole.CUSTOMER);
      expect(response.body.user).not.toHaveProperty('password_hash');

      // Save for later tests
      authToken = response.body.token;
      userId = response.body.user.id;
    });

    it('should successfully register a restaurant owner', async () => {
      const ownerEmail = `owner-${Date.now()}@cuts.ae`;
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: ownerEmail,
          password: 'OwnerPassword123!',
          first_name: 'Restaurant',
          last_name: 'Owner',
          phone: '+971509876543',
          role: UserRole.RESTAURANT_OWNER
        })
        .expect(201);

      expect(response.body.user.role).toBe(UserRole.RESTAURANT_OWNER);

      // Cleanup
      await pool.query('DELETE FROM users WHERE id = $1', [response.body.user.id]);
    });

    it('should fail with duplicate email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail, // Already registered
          password: 'TestPassword123!',
          first_name: 'Duplicate',
          last_name: 'User',
          phone: '+971501234568',
          role: UserRole.CUSTOMER
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });

    it('should fail with invalid email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'TestPassword123!',
          first_name: 'Test',
          last_name: 'User',
          phone: '+971501234569',
          role: UserRole.CUSTOMER
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail with weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `weak-${Date.now()}@cuts.ae`,
          password: '123', // Too short
          first_name: 'Test',
          last_name: 'User',
          phone: '+971501234570',
          role: UserRole.CUSTOMER
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `missing-${Date.now()}@cuts.ae`,
          password: 'TestPassword123!'
          // Missing first_name, last_name, phone, role
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail with invalid phone format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `phone-${Date.now()}@cuts.ae`,
          password: 'TestPassword123!',
          first_name: 'Test',
          last_name: 'User',
          phone: '123', // Invalid format
          role: UserRole.CUSTOMER
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail with invalid role', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `role-${Date.now()}@cuts.ae`,
          password: 'TestPassword123!',
          first_name: 'Test',
          last_name: 'User',
          phone: '+971501234571',
          role: 'INVALID_ROLE'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should successfully login with correct credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'TestPassword123!'
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testEmail);
      expect(response.body.user).not.toHaveProperty('password_hash');
    });

    it('should fail with non-existent email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@cuts.ae',
          password: 'TestPassword123!'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should fail with incorrect password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should fail with missing email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          password: 'TestPassword123!'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail with missing password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail with invalid email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid-email',
          password: 'TestPassword123!'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testEmail);
      expect(response.body.user.id).toBe(userId);
      expect(response.body.user).not.toHaveProperty('password_hash');
    });

    it('should fail without authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('No token provided');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail with expired token', async () => {
      // Create an expired token (this is a mock - in real scenario you'd use jwt.sign with past exp)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJleHAiOjF9.invalid';

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Token validation', () => {
    it('should include correct user information in token', async () => {
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'TestPassword123!'
        })
        .expect(200);

      const meResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .expect(200);

      expect(meResponse.body.user.id).toBe(loginResponse.body.user.id);
      expect(meResponse.body.user.email).toBe(loginResponse.body.user.email);
      expect(meResponse.body.user.role).toBe(loginResponse.body.user.role);
    });
  });

  describe('Password security', () => {
    it('should never return password_hash in responses', async () => {
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `security-${Date.now()}@cuts.ae`,
          password: 'TestPassword123!',
          first_name: 'Security',
          last_name: 'Test',
          phone: '+971501234572',
          role: UserRole.CUSTOMER
        })
        .expect(201);

      expect(registerResponse.body.user).not.toHaveProperty('password_hash');

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: registerResponse.body.user.email,
          password: 'TestPassword123!'
        })
        .expect(200);

      expect(loginResponse.body.user).not.toHaveProperty('password_hash');

      const meResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .expect(200);

      expect(meResponse.body.user).not.toHaveProperty('password_hash');

      // Cleanup
      await pool.query('DELETE FROM users WHERE id = $1', [registerResponse.body.user.id]);
    });
  });
});
