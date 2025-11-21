import request from 'supertest';
import app from '../../app';
import jwt from 'jsonwebtoken';
import { UserRole } from '../../types';
import pool from '../../config/database';

describe('SQL Injection Security Tests', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

  const generateToken = (role: UserRole = UserRole.CUSTOMER, userId: string = '123e4567-e89b-12d3-a456-426614174000') => {
    return jwt.sign(
      {
        userId,
        email: 'test@cuts.ae',
        role
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  };

  describe('Authentication Endpoints SQL Injection', () => {
    const sqlInjectionPayloads = [
      "' OR '1'='1",
      "' OR 1=1--",
      "' OR 1=1#",
      "' OR 1=1/*",
      "admin'--",
      "admin' #",
      "admin'/*",
      "' or 1=1--",
      "' or 1=1#",
      "' or 1=1/*",
      "') or '1'='1--",
      "') or ('1'='1--",
      "' UNION SELECT NULL--",
      "' UNION SELECT NULL, NULL--",
      "1' AND '1' = '1",
      "1' AND 1=1--",
      "'; DROP TABLE users--",
      "1'; DROP TABLE users--",
      "' OR 'x'='x",
      "1' OR '1'='1",
      "' OR username IS NOT NULL--",
      "' UNION ALL SELECT NULL--",
      "' UNION SELECT password FROM users--",
      "admin' OR 1=1 LIMIT 1--"
    ];

    sqlInjectionPayloads.forEach((payload, index) => {
      it(`should prevent SQL injection payload ${index + 1} in login email`, async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: payload,
            password: 'test123'
          });

        expect(response.status).not.toBe(200);
        expect([400, 403, 429]).toContain(response.status);

        if (response.body.message || response.body.code) {
          const errorMessage = response.body.message || response.body.code;
          expect(errorMessage).not.toMatch(/syntax error/i);
          expect(errorMessage).not.toMatch(/SQL/i);
        }
      });
    });

    it('should prevent SQL injection in registration email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: "admin'--@test.com",
          password: 'Password123!',
          first_name: 'Test',
          last_name: 'User',
          role: UserRole.CUSTOMER
        });

      expect([400, 401, 403, 429]).toContain(response.status);
    });

    it('should prevent UNION-based SQL injection in login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: "' UNION SELECT NULL, 'admin', 'password'--",
          password: 'anything'
        });

      expect([400, 403, 429]).toContain(response.status);
    });
  });

  describe('Search/Filter SQL Injection', () => {
    it('should prevent SQL injection in restaurant search', async () => {
      const response = await request(app)
        .get('/api/restaurants/search')
        .query({ query: "' OR '1'='1" });

      expect(response.status).not.toBe(500);

      if (response.status === 200) {
        expect(Array.isArray(response.body.restaurants)).toBe(true);
      }
    });

    it('should prevent SQL injection in cuisine filter', async () => {
      const response = await request(app)
        .get('/api/restaurants')
        .query({ cuisine: "' OR 1=1--" });

      expect(response.status).not.toBe(500);
    });

    it('should prevent SQL injection in menu item search', async () => {
      const response = await request(app)
        .get('/api/menu-items')
        .query({ search: "'; DROP TABLE menu_items--" });

      expect(response.status).not.toBe(500);
    });
  });

  describe('ID Parameter SQL Injection', () => {
    it('should prevent SQL injection in restaurant ID', async () => {
      const response = await request(app)
        .get("/api/restaurants/1' OR '1'='1");

      expect([400, 403, 404, 429]).toContain(response.status);
    });

    it('should prevent SQL injection in order ID', async () => {
      const token = generateToken(UserRole.CUSTOMER);

      const response = await request(app)
        .get("/api/orders/1' UNION SELECT NULL--")
        .set('Authorization', `Bearer ${token}`);

      expect([400, 404, 401, 403]).toContain(response.status);
    });

    it('should prevent SQL injection in menu item ID', async () => {
      const response = await request(app)
        .get("/api/menu-items/1'; DELETE FROM menu_items--");

      expect([400, 403, 404, 429]).toContain(response.status);
    });
  });

  describe('Update Operation SQL Injection', () => {
    it('should prevent SQL injection in profile update', async () => {
      const token = generateToken(UserRole.CUSTOMER);

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          first_name: "'; UPDATE users SET role='admin'--",
          last_name: 'User'
        });

      expect([400, 401, 403, 404]).toContain(response.status);
    });

    it('should prevent SQL injection in restaurant update', async () => {
      const token = generateToken(UserRole.RESTAURANT_OWNER);

      const response = await request(app)
        .put('/api/restaurants/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: "'; DROP TABLE restaurants--",
          description: 'Test'
        });

      expect([400, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('Parameterized Query Validation', () => {
    it('should use parameterized queries (no SQL syntax errors)', async () => {
      const maliciousEmail = "test'; SELECT * FROM users WHERE '1'='1@test.com";

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: maliciousEmail,
          password: 'test'
        });

      expect([400, 403, 429]).toContain(response.status);

      if (response.body.message || response.body.code) {
        const errorMessage = response.body.message || response.body.code;
        expect(errorMessage).not.toMatch(/SQL syntax/i);
        expect(errorMessage).not.toMatch(/pg_query/i);
      }
    });

    it('should handle apostrophes in legitimate input', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: 'Password123!',
          first_name: "O'Brien",
          last_name: "D'Angelo",
          role: UserRole.CUSTOMER
        });

      expect([200, 201, 400, 403, 409, 429]).toContain(response.status);

      if (response.body.message || response.body.code) {
        const errorMessage = response.body.message || response.body.code;
        expect(errorMessage).not.toMatch(/syntax/i);
      }
    });
  });

  describe('Boolean-based Blind SQL Injection', () => {
    it('should prevent boolean-based injection in login', async () => {
      const response1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: "admin@test.com' AND '1'='1",
          password: 'test'
        });

      const response2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: "admin@test.com' AND '1'='2",
          password: 'test'
        });

      expect([400, 403, 429]).toContain(response1.status);
      expect([400, 403, 429]).toContain(response2.status);

      expect(response1.body).toEqual(response2.body);
    });
  });

  describe('Time-based Blind SQL Injection', () => {
    it('should prevent time-based injection attempts', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: "admin@test.com'; WAITFOR DELAY '00:00:05'--",
          password: 'test'
        });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect([400, 403, 429]).toContain(response.status);
      expect(duration).toBeLessThan(2000);
    });

    it('should prevent PostgreSQL pg_sleep injection', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: "admin@test.com'; SELECT pg_sleep(5)--",
          password: 'test'
        });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect([400, 403, 429]).toContain(response.status);
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Stacked Queries SQL Injection', () => {
    it('should prevent stacked query injection', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: "admin@test.com'; DELETE FROM users; --",
          password: 'test'
        });

      expect([400, 403, 429]).toContain(response.status);
    });

    it('should prevent multiple statement injection', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: "admin@test.com'; UPDATE users SET role='admin'; --",
          password: 'test'
        });

      expect([400, 403, 429]).toContain(response.status);
    });
  });

  describe('Error-based SQL Injection', () => {
    it('should not expose database errors to clients', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: "admin@test.com' AND 1=CONVERT(int, (SELECT @@version))--",
          password: 'test'
        });

      expect(response.status).not.toBe(500);

      if (response.body.message || response.body.code) {
        const errorMessage = response.body.message || response.body.code;
        expect(errorMessage).not.toMatch(/column/i);
        expect(errorMessage).not.toMatch(/table/i);
        expect(errorMessage).not.toMatch(/database/i);
        expect(errorMessage).not.toMatch(/PostgreSQL/i);
      }
    });

    it('should not leak table structure in errors', async () => {
      const response = await request(app)
        .get('/api/restaurants/999999999');

      if (response.body.message || response.body.code) {
        const errorMessage = response.body.message || response.body.code;
        expect(errorMessage).not.toMatch(/users/i);
        expect(errorMessage).not.toMatch(/restaurants/i);
        expect(errorMessage).not.toMatch(/FROM/i);
        expect(errorMessage).not.toMatch(/WHERE/i);
      }
    });
  });

  describe('UNION-based SQL Injection', () => {
    it('should prevent UNION SELECT injection', async () => {
      const token = generateToken(UserRole.CUSTOMER);

      const response = await request(app)
        .get('/api/orders')
        .query({ status: "completed' UNION SELECT id, email, password FROM users--" })
        .set('Authorization', `Bearer ${token}`);

      expect([400, 403, 404, 429]).toContain(response.status);
    });

    it('should prevent column count discovery via UNION', async () => {
      const response = await request(app)
        .get('/api/restaurants/search')
        .query({ query: "' UNION SELECT NULL, NULL, NULL--" });

      expect(response.status).not.toBe(500);
    });
  });

  describe('Comment-based SQL Injection', () => {
    it('should prevent double-dash comment injection', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: "admin@test.com'--",
          password: ''
        });

      expect([400, 403, 429]).toContain(response.status);
    });

    it('should prevent hash comment injection', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: "admin@test.com'#",
          password: ''
        });

      expect([400, 403, 429]).toContain(response.status);
    });

    it('should prevent C-style comment injection', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: "admin@test.com'/*",
          password: ''
        });

      expect([400, 403, 429]).toContain(response.status);
    });
  });

  describe('Second-order SQL Injection', () => {
    it('should sanitize stored data when retrieved', async () => {
      const maliciousName = "'; DROP TABLE restaurants--";
      const token = generateToken(UserRole.RESTAURANT_OWNER);

      const createResponse = await request(app)
        .post('/api/restaurants')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: maliciousName,
          description: 'Test',
          address: '123 Test St',
          phone: '+1234567890',
          email: 'test@test.com',
          cuisines: ['Italian']
        });

      if (createResponse.status === 201) {
        const getResponse = await request(app)
          .get(`/api/restaurants/${createResponse.body.restaurant.id}`);

        if (getResponse.status === 200) {
          expect(typeof getResponse.body.restaurant.name).toBe('string');
        }
      }
    });
  });

  describe('NoSQL Injection Prevention', () => {
    it('should prevent object injection in filters', async () => {
      const response = await request(app)
        .get('/api/restaurants')
        .query({ cuisine: { $ne: null } });

      expect(response.status).not.toBe(500);
    });
  });
});
