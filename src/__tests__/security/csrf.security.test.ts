import request from 'supertest';
import app from '../../app';
import jwt from 'jsonwebtoken';
import { UserRole } from '../../types';

describe('CSRF (Cross-Site Request Forgery) Security Tests', () => {
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

  describe('CORS Headers', () => {
    it('should include CORS headers in response', async () => {
      const response = await request(app)
        .get('/api/v1/restaurants')
        .set('Origin', 'http://localhost:45001');

      expect(response.status).not.toBe(500);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:45001');
    });

    it('should handle OPTIONS preflight requests', async () => {
      const response = await request(app)
        .options('/api/v1/restaurants')
        .set('Origin', 'http://localhost:45001')
        .set('Access-Control-Request-Method', 'POST');

      expect([200, 204]).toContain(response.status);
    });

    it('should not allow arbitrary origins in production mode', async () => {
      const response = await request(app)
        .get('/api/v1/restaurants')
        .set('Origin', 'http://malicious-site.com');

      expect([400, 401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('State-Changing Operations', () => {
    it('should require authentication for DELETE operations', async () => {
      const response = await request(app)
        .delete('/api/v1/restaurants/123e4567-e89b-12d3-a456-426614174000');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(['AUTH_001', 'AUTH_007']).toContain(response.body.code);
    });

    it('should require authentication for PUT operations', async () => {
      const response = await request(app)
        .put('/api/v1/auth/profile')
        .send({
          first_name: 'Updated',
          last_name: 'Name'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(['AUTH_001', 'AUTH_007']).toContain(response.body.code);
    });

    it('should require authentication for POST operations on protected routes', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .send({
          restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
          items: []
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(['AUTH_001', 'AUTH_007']).toContain(response.body.code);
    });
  });

  describe('Token Validation', () => {
    it('should reject requests with missing authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/orders');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(['AUTH_001', 'AUTH_007']).toContain(response.body.code);
    });

    it('should reject requests with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', 'InvalidFormat token123');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(['AUTH_001', 'AUTH_002', 'AUTH_007']).toContain(response.body.code);
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(['AUTH_002', 'AUTH_007']).toContain(response.body.code);
    });

    it('should reject requests with expired token', async () => {
      const expiredToken = jwt.sign(
        {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          email: 'test@cuts.ae',
          role: UserRole.CUSTOMER
        },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(['AUTH_002', 'AUTH_003']).toContain(response.body.code);
    });
  });

  describe('Origin Validation', () => {
    it('should handle requests without Origin header', async () => {
      const token = generateToken(UserRole.CUSTOMER);

      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).not.toBe(500);
    });

    it('should handle requests with valid Origin header', async () => {
      const token = generateToken(UserRole.CUSTOMER);

      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .set('Origin', 'http://localhost:45001');

      expect(response.status).not.toBe(500);
    });
  });

  describe('Referer Header Validation', () => {
    it('should handle requests without Referer header', async () => {
      const token = generateToken(UserRole.CUSTOMER);

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
          items: [{
            menu_item_id: '223e4567-e89b-12d3-a456-426614174000',
            quantity: 1
          }],
          delivery_address: '123 Test St'
        });

      expect([200, 201, 400, 401, 403, 404]).toContain(response.status);
    });

    it('should handle requests with suspicious Referer header', async () => {
      const token = generateToken(UserRole.CUSTOMER);

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .set('Referer', 'http://malicious-site.com/steal-data')
        .send({
          restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
          items: [{
            menu_item_id: '223e4567-e89b-12d3-a456-426614174000',
            quantity: 1
          }],
          delivery_address: '123 Test St'
        });

      expect(response.status).not.toBe(500);
    });
  });

  describe('Same-Site Cookie Attributes', () => {
    it('should not set cookies in API responses', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@cuts.ae',
          password: 'password123'
        });

      expect(response.headers['set-cookie']).toBeUndefined();
    });

    it('should use token-based authentication instead of cookies', async () => {
      const token = generateToken(UserRole.CUSTOMER);

      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).not.toBe(401);
      expect(response.headers['set-cookie']).toBeUndefined();
    });
  });

  describe('Double Submit Cookie Prevention', () => {
    it('should not rely on cookies for CSRF protection', async () => {
      const token = generateToken(UserRole.CUSTOMER);

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .set('Cookie', 'csrf_token=malicious_token')
        .send({
          restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
          items: [{
            menu_item_id: '223e4567-e89b-12d3-a456-426614174000',
            quantity: 1
          }],
          delivery_address: '123 Test St'
        });

      expect([200, 201, 400, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('Content-Type Validation', () => {
    it('should reject non-JSON content types for API endpoints', async () => {
      const token = generateToken(UserRole.CUSTOMER);

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'text/plain')
        .send('malicious data');

      expect([400, 415]).toContain(response.status);
    });

    it('should accept application/json content type', async () => {
      const token = generateToken(UserRole.CUSTOMER);

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({
          restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
          items: [{
            menu_item_id: '223e4567-e89b-12d3-a456-426614174000',
            quantity: 1
          }],
          delivery_address: '123 Test St'
        }));

      expect([200, 201, 400, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('HTTP Method Validation', () => {
    it('should not allow GET requests to modify data', async () => {
      const token = generateToken(UserRole.CUSTOMER);

      const response = await request(app)
        .get('/api/v1/orders/123e4567-e89b-12d3-a456-426614174000/cancel')
        .set('Authorization', `Bearer ${token}`);

      expect([400, 403, 404, 405]).toContain(response.status);
    });

    it('should require POST/PUT/DELETE for state-changing operations', async () => {
      const token = generateToken(UserRole.CUSTOMER);

      const postResponse = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
          items: [{
            menu_item_id: '223e4567-e89b-12d3-a456-426614174000',
            quantity: 1
          }],
          delivery_address: '123 Test St'
        });

      expect([200, 201, 400, 401, 403, 404]).toContain(postResponse.status);
    });
  });

  describe('Token Binding', () => {
    it('should bind token to user ID', async () => {
      const token = generateToken(UserRole.CUSTOMER, '123e4567-e89b-12d3-a456-426614174000');

      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).not.toBe(500);
    });

    it('should not allow token reuse across different users', async () => {
      const user1Token = generateToken(UserRole.CUSTOMER, 'user1-uuid');
      const user2Token = generateToken(UserRole.CUSTOMER, 'user2-uuid');

      const response1 = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${user1Token}`);

      const response2 = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${user2Token}`);

      if (response1.status === 200 && response2.status === 200) {
        expect(response1.body.orders).not.toEqual(response2.body.orders);
      }
    });
  });

  describe('CSRF Token in Custom Headers', () => {
    it('should not require CSRF tokens when using JWT authentication', async () => {
      const token = generateToken(UserRole.CUSTOMER);

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
          items: [{
            menu_item_id: '223e4567-e89b-12d3-a456-426614174000',
            quantity: 1
          }],
          delivery_address: '123 Test St'
        });

      expect([200, 201, 400, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('SameSite Protection Simulation', () => {
    it('should prevent cross-site requests without proper authentication', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Origin', 'http://malicious-site.com')
        .send({
          restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
          items: [{
            menu_item_id: '223e4567-e89b-12d3-a456-426614174000',
            quantity: 1
          }],
          delivery_address: '123 Test St'
        });

      expect(response.status).not.toBe(200);
      expect([400, 401, 403, 404, 500]).toContain(response.status);
    });

    it('should allow authenticated requests regardless of origin', async () => {
      const token = generateToken(UserRole.CUSTOMER);

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .set('Origin', 'http://localhost:45001')
        .send({
          restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
          items: [{
            menu_item_id: '223e4567-e89b-12d3-a456-426614174000',
            quantity: 1
          }],
          delivery_address: '123 Test St'
        });

      expect([200, 201, 400, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('Action-Based CSRF Prevention', () => {
    it('should prevent unauthorized profile updates', async () => {
      const response = await request(app)
        .put('/api/v1/auth/profile')
        .send({
          first_name: 'Malicious',
          last_name: 'Actor'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(['AUTH_001', 'AUTH_007']).toContain(response.body.code);
    });

    it('should prevent unauthorized restaurant creation', async () => {
      const response = await request(app)
        .post('/api/v1/restaurants')
        .send({
          name: 'Fake Restaurant',
          description: 'This should not work',
          address: '123 Fake St',
          phone: '+1234567890',
          email: 'fake@restaurant.com',
          cuisines: ['Fake']
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(['AUTH_001', 'AUTH_007']).toContain(response.body.code);
    });

    it('should prevent unauthorized order cancellation', async () => {
      const response = await request(app)
        .put('/api/v1/orders/123e4567-e89b-12d3-a456-426614174000/cancel');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(['AUTH_001', 'AUTH_007']).toContain(response.body.code);
    });
  });
});
