import request from 'supertest';
import app from '../../index';
import pool from '../../config/database';
import jwt from 'jsonwebtoken';
import { UserRole } from '../../types';

describe('RBAC Middleware', () => {
  let adminToken: string;
  let customerToken: string;
  let restaurantOwnerToken: string;
  let driverToken: string;
  let supportToken: string;

  beforeAll(() => {
    const secret = process.env.JWT_SECRET || 'test-secret';

    adminToken = jwt.sign(
      { userId: 'admin-1', email: 'admin@test.com', role: UserRole.ADMIN },
      secret
    );

    customerToken = jwt.sign(
      { userId: 'customer-1', email: 'customer@test.com', role: UserRole.CUSTOMER },
      secret
    );

    restaurantOwnerToken = jwt.sign(
      { userId: 'owner-1', email: 'owner@test.com', role: UserRole.RESTAURANT_OWNER },
      secret
    );

    driverToken = jwt.sign(
      { userId: 'driver-1', email: 'driver@test.com', role: UserRole.DRIVER },
      secret
    );

    supportToken = jwt.sign(
      { userId: 'support-1', email: 'support@test.com', role: UserRole.SUPPORT },
      secret
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('Public Endpoints', () => {
    it('should allow access to health endpoint without auth', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
    });

    it('should allow access to root endpoint without auth', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
    });

    it('should allow POST to /api/v1/auth/register without auth', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({});
      expect(response.status).not.toBe(403);
    });

    it('should allow POST to /api/v1/auth/login without auth', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({});
      expect(response.status).not.toBe(403);
    });
  });

  describe('Admin-Only Endpoints', () => {
    it('should allow admin to access admin analytics', async () => {
      const response = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).not.toBe(403);
    });

    it('should deny customer access to admin analytics', async () => {
      const response = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });

    it('should deny restaurant owner access to admin users', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${restaurantOwnerToken}`);
      expect(response.status).toBe(403);
    });

    it('should deny driver access to admin invoices', async () => {
      const response = await request(app)
        .get('/api/v1/admin/invoices')
        .set('Authorization', `Bearer ${driverToken}`);
      expect(response.status).toBe(403);
    });
  });

  describe('Restaurant Owner Endpoints', () => {
    it('should allow restaurant owner to access their restaurants', async () => {
      const response = await request(app)
        .get('/api/v1/restaurants/my/restaurants')
        .set('Authorization', `Bearer ${restaurantOwnerToken}`);
      expect(response.status).not.toBe(403);
    });

    it('should allow admin to access restaurant owner endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/restaurants/my/restaurants')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).not.toBe(403);
    });

    it('should deny customer access to restaurant creation', async () => {
      const response = await request(app)
        .post('/api/v1/restaurants')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});
      expect(response.status).toBe(403);
    });
  });

  describe('Customer Endpoints', () => {
    it('should allow customer to create orders', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});
      expect(response.status).not.toBe(403);
    });

    it('should deny driver from creating orders', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({});
      expect(response.status).toBe(403);
    });

    it('should allow customer to cancel orders', async () => {
      const response = await request(app)
        .post('/api/v1/orders/123/cancel')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});
      expect(response.status).not.toBe(403);
    });
  });

  describe('Support Endpoints', () => {
    it('should allow support to update ticket status', async () => {
      const response = await request(app)
        .patch('/api/v1/support/tickets/123/status')
        .set('Authorization', `Bearer ${supportToken}`)
        .send({});
      expect(response.status).not.toBe(403);
    });

    it('should deny customer from updating ticket status', async () => {
      const response = await request(app)
        .patch('/api/v1/support/tickets/123/status')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});
      expect(response.status).toBe(403);
    });

    it('should allow admin to update ticket priority', async () => {
      const response = await request(app)
        .patch('/api/v1/support/tickets/123/priority')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(response.status).not.toBe(403);
    });
  });

  describe('Multi-Role Endpoints', () => {
    it('should allow all authenticated users to view orders', async () => {
      const roles = [adminToken, customerToken, restaurantOwnerToken, driverToken];

      for (const token of roles) {
        const response = await request(app)
          .get('/api/v1/orders')
          .set('Authorization', `Bearer ${token}`);
        expect(response.status).not.toBe(403);
      }
    });

    it('should deny support from viewing orders', async () => {
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${supportToken}`);
      expect(response.status).toBe(403);
    });
  });

  describe('Chat Endpoints', () => {
    it('should allow customer to create chat session', async () => {
      const response = await request(app)
        .post('/api/v1/chat/sessions')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});
      expect(response.status).not.toBe(403);
    });

    it('should allow support to view all active sessions', async () => {
      const response = await request(app)
        .get('/api/v1/chat/sessions')
        .set('Authorization', `Bearer ${supportToken}`);
      expect(response.status).not.toBe(403);
    });

    it('should deny customer from viewing all active sessions', async () => {
      const response = await request(app)
        .get('/api/v1/chat/sessions')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(response.status).toBe(403);
    });

    it('should allow support to assign agent to session', async () => {
      const response = await request(app)
        .post('/api/v1/chat/sessions/123/assign')
        .set('Authorization', `Bearer ${supportToken}`)
        .send({});
      expect(response.status).not.toBe(403);
    });

    it('should deny restaurant owner from assigning agents', async () => {
      const response = await request(app)
        .post('/api/v1/chat/sessions/123/assign')
        .set('Authorization', `Bearer ${restaurantOwnerToken}`)
        .send({});
      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated Access', () => {
    it('should deny access to protected endpoint without token', async () => {
      const response = await request(app).get('/api/v1/orders');
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should deny access to admin endpoint without token', async () => {
      const response = await request(app).get('/api/v1/admin/analytics');
      expect(response.status).toBe(401);
    });
  });

  describe('Dynamic Route Handling', () => {
    it('should handle dynamic restaurant ID routes', async () => {
      const response = await request(app)
        .get('/api/v1/restaurants/rest-123/analytics')
        .set('Authorization', `Bearer ${restaurantOwnerToken}`);
      expect(response.status).not.toBe(403);
    });

    it('should handle dynamic order ID routes', async () => {
      const response = await request(app)
        .get('/api/v1/orders/order-456')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(response.status).not.toBe(403);
    });

    it('should handle dynamic menu item routes', async () => {
      const response = await request(app)
        .patch('/api/v1/menu-items/item-789/availability')
        .set('Authorization', `Bearer ${restaurantOwnerToken}`)
        .send({});
      expect(response.status).not.toBe(403);
    });
  });

  describe('Menu Item Endpoints', () => {
    it('should allow public access to view menu items', async () => {
      const response = await request(app)
        .get('/api/v1/restaurants/rest-123/menu-items');
      expect(response.status).not.toBe(403);
    });

    it('should allow restaurant owner to create menu item', async () => {
      const response = await request(app)
        .post('/api/v1/restaurants/rest-123/menu-items')
        .set('Authorization', `Bearer ${restaurantOwnerToken}`)
        .send({});
      expect(response.status).not.toBe(403);
    });

    it('should deny customer from creating menu items', async () => {
      const response = await request(app)
        .post('/api/v1/restaurants/rest-123/menu-items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});
      expect(response.status).toBe(403);
    });

    it('should allow restaurant owner to update menu item', async () => {
      const response = await request(app)
        .put('/api/v1/menu-items/item-123')
        .set('Authorization', `Bearer ${restaurantOwnerToken}`)
        .send({});
      expect(response.status).not.toBe(403);
    });

    it('should allow restaurant owner to delete menu item', async () => {
      const response = await request(app)
        .delete('/api/v1/menu-items/item-123')
        .set('Authorization', `Bearer ${restaurantOwnerToken}`);
      expect(response.status).not.toBe(403);
    });

    it('should deny driver from deleting menu items', async () => {
      const response = await request(app)
        .delete('/api/v1/menu-items/item-123')
        .set('Authorization', `Bearer ${driverToken}`);
      expect(response.status).toBe(403);
    });

    it('should allow restaurant owner to add nutrition info', async () => {
      const response = await request(app)
        .post('/api/v1/menu-items/item-123/nutrition')
        .set('Authorization', `Bearer ${restaurantOwnerToken}`)
        .send({});
      expect(response.status).not.toBe(403);
    });
  });

  describe('Order Status Updates', () => {
    it('should allow driver to update order status', async () => {
      const response = await request(app)
        .patch('/api/v1/orders/order-123/status')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({});
      expect(response.status).not.toBe(403);
    });

    it('should allow restaurant owner to update order status', async () => {
      const response = await request(app)
        .patch('/api/v1/orders/order-123/status')
        .set('Authorization', `Bearer ${restaurantOwnerToken}`)
        .send({});
      expect(response.status).not.toBe(403);
    });

    it('should deny customer from updating order status', async () => {
      const response = await request(app)
        .patch('/api/v1/orders/order-123/status')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});
      expect(response.status).toBe(403);
    });

    it('should deny support from updating order status', async () => {
      const response = await request(app)
        .patch('/api/v1/orders/order-123/status')
        .set('Authorization', `Bearer ${supportToken}`)
        .send({});
      expect(response.status).toBe(403);
    });
  });

  describe('Support Ticket Creation from Chat', () => {
    it('should allow support to convert ticket to chat', async () => {
      const response = await request(app)
        .post('/api/v1/support/tickets/ticket-123/chat')
        .set('Authorization', `Bearer ${supportToken}`)
        .send({});
      expect(response.status).not.toBe(403);
    });

    it('should allow admin to convert ticket to chat', async () => {
      const response = await request(app)
        .post('/api/v1/support/tickets/ticket-123/chat')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(response.status).not.toBe(403);
    });

    it('should deny customer from converting ticket to chat', async () => {
      const response = await request(app)
        .post('/api/v1/support/tickets/ticket-123/chat')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});
      expect(response.status).toBe(403);
    });

    it('should deny restaurant owner from converting ticket to chat', async () => {
      const response = await request(app)
        .post('/api/v1/support/tickets/ticket-123/chat')
        .set('Authorization', `Bearer ${restaurantOwnerToken}`)
        .send({});
      expect(response.status).toBe(403);
    });
  });

  describe('Driver Endpoints', () => {
    it('should allow driver to view orders', async () => {
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${driverToken}`);
      expect(response.status).not.toBe(403);
    });

    it('should allow driver to view specific order', async () => {
      const response = await request(app)
        .get('/api/v1/orders/order-123')
        .set('Authorization', `Bearer ${driverToken}`);
      expect(response.status).not.toBe(403);
    });

    it('should allow driver to create chat session', async () => {
      const response = await request(app)
        .post('/api/v1/chat/sessions')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({});
      expect(response.status).not.toBe(403);
    });

    it('should allow driver to reply to support tickets', async () => {
      const response = await request(app)
        .post('/api/v1/support/tickets/ticket-123/replies')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({});
      expect(response.status).not.toBe(403);
    });
  });

  describe('Restaurant Public Endpoints', () => {
    it('should allow public access to restaurant list', async () => {
      const response = await request(app).get('/api/v1/restaurants');
      expect(response.status).not.toBe(403);
    });

    it('should allow public access to restaurant details', async () => {
      const response = await request(app).get('/api/v1/restaurants/rest-123');
      expect(response.status).not.toBe(403);
    });
  });

  describe('Admin Restaurant Management', () => {
    it('should allow admin to approve restaurant', async () => {
      const response = await request(app)
        .post('/api/v1/admin/restaurants/rest-123/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(response.status).not.toBe(403);
    });

    it('should deny restaurant owner from approving restaurants', async () => {
      const response = await request(app)
        .post('/api/v1/admin/restaurants/rest-123/approve')
        .set('Authorization', `Bearer ${restaurantOwnerToken}`)
        .send({});
      expect(response.status).toBe(403);
    });

    it('should allow admin to view all restaurants', async () => {
      const response = await request(app)
        .get('/api/v1/admin/restaurants')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).not.toBe(403);
    });

    it('should allow admin to approve drivers', async () => {
      const response = await request(app)
        .post('/api/v1/admin/drivers/driver-123/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(response.status).not.toBe(403);
    });

    it('should deny support from approving drivers', async () => {
      const response = await request(app)
        .post('/api/v1/admin/drivers/driver-123/approve')
        .set('Authorization', `Bearer ${supportToken}`)
        .send({});
      expect(response.status).toBe(403);
    });
  });

  describe('Invoice Management', () => {
    it('should allow admin to view invoices', async () => {
      const response = await request(app)
        .get('/api/v1/admin/invoices')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).not.toBe(403);
    });

    it('should allow admin to view invoice details', async () => {
      const response = await request(app)
        .get('/api/v1/admin/invoices/invoice-123')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).not.toBe(403);
    });

    it('should allow admin to generate invoices', async () => {
      const response = await request(app)
        .post('/api/v1/admin/invoices/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(response.status).not.toBe(403);
    });

    it('should deny customer from viewing invoices', async () => {
      const response = await request(app)
        .get('/api/v1/admin/invoices')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(response.status).toBe(403);
    });
  });

  describe('Chat File Uploads', () => {
    it('should allow all authenticated users to upload files', async () => {
      const roles = [adminToken, customerToken, restaurantOwnerToken, driverToken, supportToken];

      for (const token of roles) {
        const response = await request(app)
          .post('/api/v1/chat/upload')
          .set('Authorization', `Bearer ${token}`);
        expect(response.status).not.toBe(403);
      }
    });

    it('should deny unauthenticated users from uploading files', async () => {
      const response = await request(app).post('/api/v1/chat/upload');
      expect(response.status).toBe(401);
    });
  });

  describe('User Profile Endpoint', () => {
    it('should allow all authenticated users to access their profile', async () => {
      const roles = [adminToken, customerToken, restaurantOwnerToken, driverToken, supportToken];

      for (const token of roles) {
        const response = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${token}`);
        expect(response.status).not.toBe(403);
      }
    });

    it('should deny unauthenticated access to profile', async () => {
      const response = await request(app).get('/api/v1/auth/me');
      expect(response.status).toBe(401);
    });
  });

  describe('Edge Cases and Security', () => {
    it('should return 403 for undefined endpoint permissions', async () => {
      const response = await request(app)
        .get('/api/v1/undefined-endpoint')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(403);
    });

    it('should handle malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', 'InvalidFormat');
      expect(response.status).toBe(401);
    });

    it('should handle expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: 'user-1', email: 'user@test.com', role: UserRole.CUSTOMER },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(response.status).toBe(401);
    });

    it('should handle invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', 'Bearer invalid-token-here');
      expect(response.status).toBe(401);
    });
  });

  describe('All Roles Permission Matrix', () => {
    it('should verify admin has access to all endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/api/v1/admin/analytics' },
        { method: 'get', path: '/api/v1/admin/users' },
        { method: 'get', path: '/api/v1/admin/orders' },
        { method: 'get', path: '/api/v1/restaurants/my/restaurants' },
        { method: 'post', path: '/api/v1/orders' },
        { method: 'get', path: '/api/v1/orders' },
        { method: 'patch', path: '/api/v1/support/tickets/123/status' },
        { method: 'post', path: '/api/v1/chat/sessions' },
      ];

      for (const endpoint of endpoints) {
        const response = await (request(app) as any)[endpoint.method](endpoint.path)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({});
        expect(response.status).not.toBe(403);
      }
    });

    it('should verify customer limited to customer endpoints', async () => {
      const allowedEndpoints = [
        { method: 'post', path: '/api/v1/orders' },
        { method: 'get', path: '/api/v1/orders' },
        { method: 'post', path: '/api/v1/orders/123/cancel' },
        { method: 'post', path: '/api/v1/chat/sessions' },
      ];

      for (const endpoint of allowedEndpoints) {
        const response = await (request(app) as any)[endpoint.method](endpoint.path)
          .set('Authorization', `Bearer ${customerToken}`)
          .send({});
        expect(response.status).not.toBe(403);
      }

      const deniedEndpoints = [
        { method: 'get', path: '/api/v1/admin/analytics' },
        { method: 'post', path: '/api/v1/restaurants' },
        { method: 'patch', path: '/api/v1/orders/123/status' },
      ];

      for (const endpoint of deniedEndpoints) {
        const response = await (request(app) as any)[endpoint.method](endpoint.path)
          .set('Authorization', `Bearer ${customerToken}`)
          .send({});
        expect(response.status).toBe(403);
      }
    });
  });
});
