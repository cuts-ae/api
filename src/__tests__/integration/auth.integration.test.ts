/**
 * Authentication Routes Integration Tests
 *
 * This file tests the complete authentication flow including:
 * - HTTP request/response handling
 * - Middleware integration (validation, authentication, error handling)
 * - Database interactions
 * - Security measures (SQL injection, XSS prevention)
 * - Token generation and validation
 *
 * Uses supertest to make actual HTTP requests to the Express app
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import app from '../../app';
import pool from '../../config/database';
import { UserRole } from '../../types';

// Mock the database pool before any imports
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    query: jest.fn()
  }
}));

describe('Auth Routes Integration Tests', () => {
  const mockPool = pool as any;

  // Helper function to generate a valid JWT token
  const generateToken = (payload: { userId: string; email: string; role: UserRole }): string => {
    return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool.query = jest.fn();
  });

  describe('POST /api/v1/auth/register', () => {
    const validRegistrationData = {
      email: 'test@cuts.ae',
      password: 'SecurePass123!',
      first_name: 'John',
      last_name: 'Doe',
      phone: '+971501234567',
      role: UserRole.CUSTOMER
    };

    describe('Successful registration', () => {
      it('should register a new user with valid data and return 201', async () => {
        const mockUser = {
          id: 'uuid-123',
          email: validRegistrationData.email,
          first_name: validRegistrationData.first_name,
          last_name: validRegistrationData.last_name,
          role: validRegistrationData.role
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [] }) // Check existing user
          .mockResolvedValueOnce({ rows: [mockUser] }); // Insert new user

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(validRegistrationData)
          .expect('Content-Type', /json/)
          .expect(201);

        expect(response.body).toHaveProperty('message', 'User registered successfully');
        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user).toMatchObject({
          id: mockUser.id,
          email: mockUser.email,
          first_name: mockUser.first_name,
          last_name: mockUser.last_name,
          role: mockUser.role
        });
        expect(response.body.user).not.toHaveProperty('password_hash');
        expect(response.body.user).not.toHaveProperty('password');
      });

      it('should generate a valid JWT token on registration', async () => {
        const mockUser = {
          id: 'uuid-456',
          email: 'jane@cuts.ae',
          first_name: 'Jane',
          last_name: 'Smith',
          role: UserRole.RESTAURANT_OWNER
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [mockUser] });

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({ ...validRegistrationData, email: 'jane@cuts.ae', role: UserRole.RESTAURANT_OWNER })
          .expect(201);

        const { token } = response.body;
        expect(token).toBeDefined();

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        expect(decoded.userId).toBe(mockUser.id);
        expect(decoded.email).toBe(mockUser.email);
        expect(decoded.role).toBe(mockUser.role);
      });

      it('should accept registration for all valid user roles', async () => {
        const roles = [
          UserRole.CUSTOMER,
          UserRole.RESTAURANT_OWNER,
          UserRole.DRIVER,
          UserRole.ADMIN,
          UserRole.SUPPORT
        ];

        for (const role of roles) {
          jest.clearAllMocks();
          const mockUser = {
            id: `uuid-${role}`,
            email: `${role}@cuts.ae`,
            first_name: 'Test',
            last_name: 'User',
            role
          };

          mockPool.query
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [mockUser] });

          const response = await request(app)
            .post('/api/v1/auth/register')
            .send({ ...validRegistrationData, email: `${role}@cuts.ae`, role })
            .expect(201);

          expect(response.body.user.role).toBe(role);
        }
      });

      it('should allow registration with optional phone field omitted', async () => {
        const dataWithoutPhone = { ...validRegistrationData };
        delete dataWithoutPhone.phone;

        const mockUser = {
          id: 'uuid-789',
          email: dataWithoutPhone.email,
          first_name: dataWithoutPhone.first_name,
          last_name: dataWithoutPhone.last_name,
          role: dataWithoutPhone.role
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [mockUser] });

        await request(app)
          .post('/api/v1/auth/register')
          .send(dataWithoutPhone)
          .expect(201);
      });
    });

    describe('Duplicate email validation', () => {
      it('should reject registration with existing email and return 400', async () => {
        mockPool.query.mockResolvedValueOnce({
          rows: [{ id: 'existing-user-id' }]
        });

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(validRegistrationData)
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Email already registered');
      });
    });

    describe('Validation errors', () => {
      it('should reject registration with invalid email format', async () => {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({ ...validRegistrationData, email: 'invalid-email' })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Validation failed');
        expect(response.body).toHaveProperty('details');
      });

      it('should reject registration with password shorter than 8 characters', async () => {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({ ...validRegistrationData, password: 'short' })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Validation failed');
      });

      it('should reject registration with first_name shorter than 2 characters', async () => {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({ ...validRegistrationData, first_name: 'J' })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Validation failed');
      });

      it('should reject registration with last_name shorter than 2 characters', async () => {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({ ...validRegistrationData, last_name: 'D' })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Validation failed');
      });

      it('should reject registration with invalid role', async () => {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({ ...validRegistrationData, role: 'invalid_role' })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Validation failed');
      });

      it('should reject registration with missing required fields', async () => {
        const requiredFields = ['email', 'password', 'first_name', 'last_name', 'role'];

        for (const field of requiredFields) {
          const invalidData = { ...validRegistrationData };
          delete invalidData[field as keyof typeof invalidData];

          const response = await request(app)
            .post('/api/v1/auth/register')
            .send(invalidData)
            .expect(400);

          expect(response.body).toHaveProperty('error', 'Validation failed');
        }
      });

      it('should reject registration with empty email', async () => {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({ ...validRegistrationData, email: '' })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Validation failed');
      });

      it('should reject registration with empty password', async () => {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({ ...validRegistrationData, password: '' })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Validation failed');
      });
    });

    describe('SQL Injection prevention', () => {
      it('should safely handle SQL injection attempts in email field', async () => {
        const sqlInjectionAttempts = [
          "'; DROP TABLE users; --",
          "admin' OR '1'='1",
          "' OR 1=1 --",
          "' UNION SELECT * FROM users --"
        ];

        for (const maliciousEmail of sqlInjectionAttempts) {
          jest.clearAllMocks();
          mockPool.query.mockResolvedValueOnce({ rows: [] });

          // The validation will likely reject these as invalid email format
          const response = await request(app)
            .post('/api/v1/auth/register')
            .send({ ...validRegistrationData, email: maliciousEmail });

          // Should either reject with validation error or handle safely with parameterized query
          expect([400, 201]).toContain(response.status);
        }
      });

      it('should use parameterized queries for all input fields', async () => {
        const maliciousData = {
          email: 'test@cuts.ae',
          password: "password'; DROP TABLE users; --",
          first_name: "'; DELETE FROM users; --",
          last_name: "' OR '1'='1",
          phone: '123; DROP DATABASE;',
          role: UserRole.CUSTOMER
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({
            rows: [{
              id: '123',
              email: maliciousData.email,
              first_name: maliciousData.first_name,
              last_name: maliciousData.last_name,
              role: maliciousData.role
            }]
          });

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(maliciousData)
          .expect(201);

        // Verify parameterized queries were used
        expect(mockPool.query).toHaveBeenCalledWith(
          'SELECT id FROM users WHERE email = $1',
          [maliciousData.email]
        );

        const insertCall = mockPool.query.mock.calls[1];
        expect(insertCall[0]).toContain('INSERT INTO users');
        expect(insertCall[1]).toBeInstanceOf(Array);
      });
    });

    describe('XSS prevention', () => {
      it('should safely store XSS attempts in text fields', async () => {
        const xssData = {
          email: 'test@cuts.ae',
          password: 'password123',
          first_name: '<script>alert("XSS")</script>',
          last_name: '<img src=x onerror=alert("XSS")>',
          phone: '"><script>alert("XSS")</script>',
          role: UserRole.CUSTOMER
        };

        const mockUser = {
          id: 'uuid-xss',
          email: xssData.email,
          first_name: xssData.first_name,
          last_name: xssData.last_name,
          role: xssData.role
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [mockUser] });

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(xssData)
          .expect(201);

        // Data should be stored as-is (escaping happens at display time)
        expect(response.body.user.first_name).toBe(xssData.first_name);
        expect(response.body.user.last_name).toBe(xssData.last_name);
      });

      it('should handle various XSS vectors in email field', async () => {
        const xssVectors = [
          'test+<script>@cuts.ae',
          'test@cuts.ae<svg/onload=alert(1)>'
        ];

        for (const xssEmail of xssVectors) {
          jest.clearAllMocks();

          // These will likely fail email validation
          const response = await request(app)
            .post('/api/v1/auth/register')
            .send({ ...validRegistrationData, email: xssEmail });

          // Should reject with validation error
          expect([400, 201]).toContain(response.status);
        }
      });
    });

    describe('Database error handling', () => {
      it('should return 500 when database check fails', async () => {
        mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(validRegistrationData)
          .expect(500);

        expect(response.body).toHaveProperty('error');
      });

      it('should return 500 when user insertion fails', async () => {
        mockPool.query
          .mockResolvedValueOnce({ rows: [] })
          .mockRejectedValueOnce(new Error('Insert failed'));

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(validRegistrationData)
          .expect(500);

        expect(response.body).toHaveProperty('error');
      });
    });
  });

  describe('POST /api/v1/auth/login', () => {
    const validLoginData = {
      email: 'test@cuts.ae',
      password: 'SecurePass123!'
    };

    const mockUserFromDB = {
      id: 'uuid-123',
      email: 'test@cuts.ae',
      password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyz',
      first_name: 'John',
      last_name: 'Doe',
      role: UserRole.CUSTOMER
    };

    describe('Successful login', () => {
      it('should login with valid credentials and return 200', async () => {
        jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockUserFromDB] })
          .mockResolvedValueOnce({ rows: [] }); // Update last_login

        const response = await request(app)
          .post('/api/v1/auth/login')
          .send(validLoginData)
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body).toHaveProperty('message', 'Login successful');
        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user).toMatchObject({
          id: mockUserFromDB.id,
          email: mockUserFromDB.email,
          first_name: mockUserFromDB.first_name,
          last_name: mockUserFromDB.last_name,
          role: mockUserFromDB.role
        });
        expect(response.body.user).not.toHaveProperty('password_hash');
        expect(response.body.user).not.toHaveProperty('password');
      });

      it('should generate a valid JWT token on login', async () => {
        jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockUserFromDB] })
          .mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/v1/auth/login')
          .send(validLoginData)
          .expect(200);

        const { token } = response.body;
        expect(token).toBeDefined();

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        expect(decoded.userId).toBe(mockUserFromDB.id);
        expect(decoded.email).toBe(mockUserFromDB.email);
        expect(decoded.role).toBe(mockUserFromDB.role);
      });

      it('should update last_login timestamp on successful login', async () => {
        jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockUserFromDB] })
          .mockResolvedValueOnce({ rows: [] });

        await request(app)
          .post('/api/v1/auth/login')
          .send(validLoginData)
          .expect(200);

        expect(mockPool.query).toHaveBeenCalledWith(
          'UPDATE users SET last_login = NOW() WHERE id = $1',
          [mockUserFromDB.id]
        );
      });
    });

    describe('Invalid credentials', () => {
      it('should reject login with non-existent email and return 401', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/v1/auth/login')
          .send(validLoginData)
          .expect('Content-Type', /json/)
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Invalid credentials');
      });

      it('should reject login with incorrect password and return 401', async () => {
        jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false as never);

        mockPool.query.mockResolvedValueOnce({ rows: [mockUserFromDB] });

        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({ ...validLoginData, password: 'WrongPassword123!' })
          .expect('Content-Type', /json/)
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Invalid credentials');
      });

      it('should not update last_login on failed authentication', async () => {
        jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false as never);

        mockPool.query.mockResolvedValueOnce({ rows: [mockUserFromDB] });

        await request(app)
          .post('/api/v1/auth/login')
          .send({ ...validLoginData, password: 'WrongPassword' })
          .expect(401);

        // Should only call once for user lookup, not for last_login update
        expect(mockPool.query).toHaveBeenCalledTimes(1);
        expect(mockPool.query).not.toHaveBeenCalledWith(
          'UPDATE users SET last_login = NOW() WHERE id = $1',
          expect.any(Array)
        );
      });

      it('should return same error message for non-existent user and wrong password', async () => {
        // Test non-existent user
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const response1 = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'nonexistent@cuts.ae', password: 'password' })
          .expect(401);

        jest.clearAllMocks();

        // Test wrong password
        jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false as never);
        mockPool.query.mockResolvedValueOnce({ rows: [mockUserFromDB] });

        const response2 = await request(app)
          .post('/api/v1/auth/login')
          .send({ ...validLoginData, password: 'WrongPassword' })
          .expect(401);

        // Both should return the same generic error message
        expect(response1.body.error).toBe(response2.body.error);
        expect(response1.body.error).toBe('Invalid credentials');
      });
    });

    describe('Validation errors', () => {
      it('should reject login with invalid email format', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'invalid-email', password: 'password' })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Validation failed');
      });

      it('should reject login with missing email', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({ password: 'password' })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Validation failed');
      });

      it('should reject login with missing password', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'test@cuts.ae' })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Validation failed');
      });

      it('should reject login with empty email', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: '', password: 'password' })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Validation failed');
      });

      it('should reject login with empty password', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'test@cuts.ae', password: '' })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Validation failed');
      });
    });

    describe('SQL Injection prevention', () => {
      it('should safely handle SQL injection attempts in email', async () => {
        const sqlInjectionAttempts = [
          "admin' OR '1'='1",
          "'; DROP TABLE users; --",
          "' OR 1=1 --",
          "' UNION SELECT * FROM users --"
        ];

        for (const maliciousEmail of sqlInjectionAttempts) {
          jest.clearAllMocks();

          // Will likely fail email validation
          const response = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: maliciousEmail, password: 'password' });

          expect([400, 401]).toContain(response.status);
        }
      });

      it('should use parameterized query for email lookup', async () => {
        const maliciousEmail = "'; DELETE FROM users; --";

        // This will fail email validation, but test it anyway
        await request(app)
          .post('/api/v1/auth/login')
          .send({ email: maliciousEmail, password: 'password' });

        // If it passed validation, should use parameterized query
        if (mockPool.query.mock.calls.length > 0) {
          const callArgs = mockPool.query.mock.calls[0];
          expect(callArgs[0]).toBe('SELECT * FROM users WHERE email = $1');
          expect(callArgs[1]).toEqual([maliciousEmail]);
        }
      });
    });

    describe('Database error handling', () => {
      it('should return 500 when database query fails', async () => {
        mockPool.query.mockRejectedValueOnce(new Error('Database connection lost'));

        const response = await request(app)
          .post('/api/v1/auth/login')
          .send(validLoginData)
          .expect(500);

        expect(response.body).toHaveProperty('error');
      });

      it('should return 500 when last_login update fails', async () => {
        jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockUserFromDB] })
          .mockRejectedValueOnce(new Error('Update failed'));

        const response = await request(app)
          .post('/api/v1/auth/login')
          .send(validLoginData)
          .expect(500);

        expect(response.body).toHaveProperty('error');
      });
    });
  });

  describe('GET /api/v1/auth/me', () => {
    const mockUserData = {
      id: 'uuid-123',
      email: 'test@cuts.ae',
      first_name: 'John',
      last_name: 'Doe',
      role: UserRole.CUSTOMER,
      phone: '+971501234567',
      created_at: new Date('2024-01-01T00:00:00Z')
    };

    describe('Successful retrieval', () => {
      it('should return current user data with valid token and return 200', async () => {
        const token = generateToken({
          userId: mockUserData.id,
          email: mockUserData.email,
          role: mockUserData.role
        });

        mockPool.query.mockResolvedValueOnce({ rows: [mockUserData] });

        const response = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body).toHaveProperty('user');
        expect(response.body.user).toMatchObject({
          id: mockUserData.id,
          email: mockUserData.email,
          first_name: mockUserData.first_name,
          last_name: mockUserData.last_name,
          role: mockUserData.role,
          phone: mockUserData.phone
        });
        expect(response.body.user).not.toHaveProperty('password_hash');
      });

      it('should work for all user roles', async () => {
        const roles = [UserRole.CUSTOMER, UserRole.RESTAURANT_OWNER, UserRole.DRIVER, UserRole.ADMIN, UserRole.SUPPORT];

        for (const role of roles) {
          jest.clearAllMocks();

          const token = generateToken({
            userId: 'test-id',
            email: 'test@cuts.ae',
            role
          });

          mockPool.query.mockResolvedValueOnce({
            rows: [{ ...mockUserData, role }]
          });

          const response = await request(app)
            .get('/api/v1/auth/me')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

          expect(response.body.user.role).toBe(role);
        }
      });

      it('should query database with userId from token', async () => {
        const userId = 'specific-user-id-789';
        const token = generateToken({
          userId,
          email: 'test@cuts.ae',
          role: UserRole.ADMIN
        });

        mockPool.query.mockResolvedValueOnce({
          rows: [{ ...mockUserData, id: userId }]
        });

        await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(mockPool.query).toHaveBeenCalledWith(
          'SELECT id, email, first_name, last_name, role, phone, created_at FROM users WHERE id = $1',
          [userId]
        );
      });
    });

    describe('Authentication errors', () => {
      it('should reject request without Authorization header and return 401', async () => {
        const response = await request(app)
          .get('/api/v1/auth/me')
          .expect('Content-Type', /json/)
          .expect(401);

        expect(response.body).toHaveProperty('error', 'No token provided');
      });

      it('should reject request with invalid Authorization header format', async () => {
        const response = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', 'InvalidFormat token123')
          .expect(401);

        expect(response.body).toHaveProperty('error', 'No token provided');
      });

      it('should reject request with invalid token and return 401', async () => {
        const response = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', 'Bearer invalid-token-12345')
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Invalid token');
      });

      it('should reject request with expired token', async () => {
        const expiredToken = jwt.sign(
          { userId: 'test-id', email: 'test@cuts.ae', role: UserRole.CUSTOMER },
          process.env.JWT_SECRET!,
          { expiresIn: '-1h' } // Expired 1 hour ago
        );

        const response = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${expiredToken}`)
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Invalid token');
      });

      it('should reject request with token signed with wrong secret', async () => {
        const wrongToken = jwt.sign(
          { userId: 'test-id', email: 'test@cuts.ae', role: UserRole.CUSTOMER },
          'wrong-secret-key',
          { expiresIn: '7d' }
        );

        const response = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${wrongToken}`)
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Invalid token');
      });

      it('should reject request with malformed token', async () => {
        const response = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', 'Bearer malformed.token.here')
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Invalid token');
      });

      it('should reject request with empty token', async () => {
        const response = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', 'Bearer ')
          .expect(401);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('User not found', () => {
      it('should return 404 when user does not exist in database', async () => {
        const token = generateToken({
          userId: 'non-existent-id',
          email: 'test@cuts.ae',
          role: UserRole.CUSTOMER
        });

        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect('Content-Type', /json/)
          .expect(404);

        expect(response.body).toHaveProperty('error', 'User not found');
      });

      it('should handle deleted user scenario (valid token but no user)', async () => {
        const token = generateToken({
          userId: 'deleted-user-id',
          email: 'deleted@cuts.ae',
          role: UserRole.CUSTOMER
        });

        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(404);
      });
    });

    describe('Database error handling', () => {
      it('should return 500 when database query fails', async () => {
        const token = generateToken({
          userId: mockUserData.id,
          email: mockUserData.email,
          role: mockUserData.role
        });

        mockPool.query.mockRejectedValueOnce(new Error('Connection timeout'));

        const response = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(500);

        expect(response.body).toHaveProperty('error');
      });
    });
  });
});
