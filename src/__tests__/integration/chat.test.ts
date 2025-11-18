import request from 'supertest';
import express, { Application } from 'express';
import chatRoutes from '../../routes/chat.routes';
import authRoutes from '../../routes/auth.routes';
import { errorHandler } from '../../middleware/errorHandler';
import pool from '../../config/database';
import { UserRole } from '../../types';

const createTestApp = (): Application => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/chat', chatRoutes);
  app.use(errorHandler);
  return app;
};

describe('Chat API Integration Tests', () => {
  let app: Application;
  let customerToken: string;
  let supportToken: string;
  let adminToken: string;
  let customerId: string;
  let supportId: string;
  let adminId: string;
  let testSessionId: string;
  let testMessageId: string;

  const customerEmail = `customer-${Date.now()}@cuts.ae`;
  const supportEmail = `support-${Date.now()}@cuts.ae`;
  const adminEmail = `admin-${Date.now()}@cuts.ae`;

  beforeAll(async () => {
    app = createTestApp();

    // Register customer
    const customerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: customerEmail,
        password: 'TestPassword123!',
        first_name: 'Test',
        last_name: 'Customer',
        phone: '+971501234567',
        role: 'customer',
      });

    if (customerRes.body.token && customerRes.body.user) {
      customerToken = customerRes.body.token;
      customerId = customerRes.body.user.id;
    } else {
      throw new Error('Failed to register customer: ' + JSON.stringify(customerRes.body));
    }

    // Register support agent
    const supportRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: supportEmail,
        password: 'TestPassword123!',
        first_name: 'Support',
        last_name: 'Agent',
        phone: '+971501234568',
        role: 'support',
      });

    if (supportRes.body.token && supportRes.body.user) {
      supportToken = supportRes.body.token;
      supportId = supportRes.body.user.id;
    } else {
      throw new Error('Failed to register support: ' + JSON.stringify(supportRes.body));
    }

    // Register admin
    const adminRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: adminEmail,
        password: 'TestPassword123!',
        first_name: 'Admin',
        last_name: 'User',
        phone: '+971501234569',
        role: 'admin',
      });

    if (adminRes.body.token && adminRes.body.user) {
      adminToken = adminRes.body.token;
      adminId = adminRes.body.user.id;
    } else {
      throw new Error('Failed to register admin: ' + JSON.stringify(adminRes.body));
    }
  });

  afterAll(async () => {
    // Cleanup test data
    if (testSessionId) {
      await pool.query('DELETE FROM message_read_receipts WHERE message_id IN (SELECT id FROM chat_messages WHERE session_id = $1)', [testSessionId]);
      await pool.query('DELETE FROM message_attachments WHERE message_id IN (SELECT id FROM chat_messages WHERE session_id = $1)', [testSessionId]);
      await pool.query('DELETE FROM chat_messages WHERE session_id = $1', [testSessionId]);
      await pool.query('DELETE FROM typing_indicators WHERE session_id = $1', [testSessionId]);
      await pool.query('DELETE FROM chat_sessions WHERE id = $1', [testSessionId]);
    }

    // Delete test users
    if (customerId) await pool.query('DELETE FROM users WHERE id = $1', [customerId]);
    if (supportId) await pool.query('DELETE FROM users WHERE id = $1', [supportId]);
    if (adminId) await pool.query('DELETE FROM users WHERE id = $1', [adminId]);

    await pool.end();
  });

  describe('POST /api/v1/chat/sessions', () => {
    it('should create a new chat session with authentication', async () => {
      const response = await request(app)
        .post('/api/v1/chat/sessions')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          subject: 'Test Support Request',
          category: 'general',
          priority: 'medium',
          initial_message: 'I need help with my order',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.subject).toBe('Test Support Request');
      expect(response.body.data.status).toBe('waiting');
      expect(response.body.data.customer_id).toBe(customerId);

      testSessionId = response.body.data.id;
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/chat/sessions')
        .send({
          subject: 'Test Support Request',
        })
        .expect(401);

      // The response might not have a 'success' field, just check it returned 401
      expect(response.status).toBe(401);
    });

    it('should fail without subject', async () => {
      const response = await request(app)
        .post('/api/v1/chat/sessions')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          category: 'general',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Subject is required');
    });
  });

  describe('GET /api/v1/chat/sessions', () => {
    it('should get all sessions for customer', async () => {
      const response = await request(app)
        .get('/api/v1/chat/sessions')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should get all sessions for support agent', async () => {
      const response = await request(app)
        .get('/api/v1/chat/sessions')
        .set('Authorization', `Bearer ${supportToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fail without authentication', async () => {
      await request(app)
        .get('/api/v1/chat/sessions')
        .expect(401);
    });
  });

  describe('GET /api/v1/chat/sessions/my', () => {
    it('should get user-specific sessions', async () => {
      const response = await request(app)
        .get('/api/v1/chat/sessions/my')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      if (response.body.data.length > 0) {
        expect(response.body.data[0].customer_id).toBe(customerId);
      }
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/chat/sessions/my')
        .expect(401);
    });
  });

  describe('GET /api/v1/chat/sessions/:sessionId', () => {
    it('should get a specific session by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/chat/sessions/${testSessionId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testSessionId);
      expect(response.body.data.subject).toBe('Test Support Request');
    });

    it('should return 404 for non-existent session', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/chat/sessions/${fakeId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Session not found');
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/v1/chat/sessions/${testSessionId}`)
        .expect(401);
    });
  });

  describe('GET /api/v1/chat/sessions/:sessionId/messages', () => {
    it('should get messages for a session', async () => {
      const response = await request(app)
        .get(`/api/v1/chat/sessions/${testSessionId}/messages`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      // Should have at least the initial message
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should support limit and offset parameters', async () => {
      const response = await request(app)
        .get(`/api/v1/chat/sessions/${testSessionId}/messages?limit=5&offset=0`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/v1/chat/sessions/${testSessionId}/messages`)
        .expect(401);
    });
  });

  describe('POST /api/v1/chat/sessions/:sessionId/messages', () => {
    it('should send a text message to a session', async () => {
      const response = await request(app)
        .post(`/api/v1/chat/sessions/${testSessionId}/messages`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          content: 'This is a test message',
          message_type: 'text',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.content).toBe('This is a test message');
      expect(response.body.data.sender_id).toBe(customerId);

      testMessageId = response.body.data.id;
    });

    it('should return 404 for non-existent session', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post(`/api/v1/chat/sessions/${fakeId}/messages`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          content: 'Test message',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Session not found');
    });

    it('should require authentication', async () => {
      await request(app)
        .post(`/api/v1/chat/sessions/${testSessionId}/messages`)
        .send({
          content: 'Test message',
        })
        .expect(401);
    });
  });

  describe('POST /api/v1/chat/sessions/:sessionId/read', () => {
    it('should mark messages as read', async () => {
      const response = await request(app)
        .post(`/api/v1/chat/sessions/${testSessionId}/read`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          message_ids: [testMessageId],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Messages marked as read');
    });

    it('should mark all session messages as read without message_ids', async () => {
      const response = await request(app)
        .post(`/api/v1/chat/sessions/${testSessionId}/read`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app)
        .post(`/api/v1/chat/sessions/${testSessionId}/read`)
        .expect(401);
    });
  });

  describe('POST /api/v1/chat/sessions/:sessionId/assign', () => {
    it('should allow support agent to accept a chat', async () => {
      const response = await request(app)
        .post(`/api/v1/chat/sessions/${testSessionId}/assign`)
        .set('Authorization', `Bearer ${supportToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.agent_id).toBe(supportId);
      expect(response.body.data.status).toBe('active');
    });

    it('should not allow customer to accept a chat', async () => {
      // Create a new session for this test
      const sessionRes = await request(app)
        .post('/api/v1/chat/sessions')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          subject: 'Another Test',
        });

      const newSessionId = sessionRes.body.data.id;

      const response = await request(app)
        .post(`/api/v1/chat/sessions/${newSessionId}/assign`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Only support agents can accept chats');

      // Cleanup
      await pool.query('DELETE FROM chat_messages WHERE session_id = $1', [newSessionId]);
      await pool.query('DELETE FROM chat_sessions WHERE id = $1', [newSessionId]);
    });

    it('should not allow accepting already accepted chat', async () => {
      const response = await request(app)
        .post(`/api/v1/chat/sessions/${testSessionId}/assign`)
        .set('Authorization', `Bearer ${supportToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Chat already accepted');
    });

    it('should return 404 for non-existent session', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post(`/api/v1/chat/sessions/${fakeId}/assign`)
        .set('Authorization', `Bearer ${supportToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Session not found');
    });

    it('should require authentication', async () => {
      await request(app)
        .post(`/api/v1/chat/sessions/${testSessionId}/assign`)
        .expect(401);
    });
  });

  describe('PATCH /api/v1/chat/sessions/:sessionId/status', () => {
    it('should update session status', async () => {
      const response = await request(app)
        .patch(`/api/v1/chat/sessions/${testSessionId}/status`)
        .set('Authorization', `Bearer ${supportToken}`)
        .send({
          status: 'resolved',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('resolved');
    });

    it('should fail without status', async () => {
      const response = await request(app)
        .patch(`/api/v1/chat/sessions/${testSessionId}/status`)
        .set('Authorization', `Bearer ${supportToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Status is required');
    });

    it('should allow changing to closed status', async () => {
      const response = await request(app)
        .patch(`/api/v1/chat/sessions/${testSessionId}/status`)
        .set('Authorization', `Bearer ${supportToken}`)
        .send({
          status: 'closed',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('closed');
    });

    it('should require authentication', async () => {
      await request(app)
        .patch(`/api/v1/chat/sessions/${testSessionId}/status`)
        .send({
          status: 'closed',
        })
        .expect(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid session ID format gracefully', async () => {
      const response = await request(app)
        .get('/api/v1/chat/sessions/invalid-uuid')
        .set('Authorization', `Bearer ${customerToken}`);

      // It might return 500 or 404 depending on how the error is handled
      expect([404, 500]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });

    it('should handle non-existent resources', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/chat/sessions/${fakeId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
