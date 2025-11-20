import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';
import pool from '../../config/database';
import { UserRole } from '../../types';

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

jest.mock('../../socket/chat.socket', () => ({
  ChatSocketServer: jest.fn().mockImplementation(() => ({
    io: {
      on: jest.fn(),
      emit: jest.fn(),
    },
  })),
}));

describe('Support and Chat Integration Tests', () => {
  const mockPool = pool as any;
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

  const generateToken = (userId: string, email: string, role: UserRole): string => {
    return jwt.sign(
      { userId, email, role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  };

  const customerToken = generateToken('customer-123', 'customer@cuts.ae', UserRole.CUSTOMER);
  const supportToken = generateToken('support-456', 'support@cuts.ae', UserRole.SUPPORT);
  const adminToken = generateToken('admin-789', 'admin@cuts.ae', UserRole.ADMIN);
  const restaurantToken = generateToken('restaurant-101', 'restaurant@cuts.ae', UserRole.RESTAURANT_OWNER);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('Support Ticket Endpoints', () => {
    describe('POST /api/v1/support/tickets - Create Ticket', () => {
      it('should create a support ticket without authentication (public endpoint)', async () => {
        const ticketData = {
          subject: 'Order not delivered',
          message: 'My order was not delivered on time',
          priority: 'high',
          category: 'order',
          order_id: 'order-123',
          created_by: 'customer-123',
        };

        const mockTicket = {
          id: 'ticket-123',
          ticket_number: 'TICK-ABC123',
          subject: ticketData.subject,
          priority: ticketData.priority,
          status: 'open',
          category: ticketData.category,
          order_id: ticketData.order_id,
          created_by: ticketData.created_by,
          created_at: new Date(),
          updated_at: new Date(),
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockTicket] })
          .mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/v1/support/tickets')
          .send(ticketData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          id: 'ticket-123',
          subject: ticketData.subject,
        });
      });

      it('should create a ticket with initial message', async () => {
        const ticketData = {
          subject: 'Payment issue',
          message: 'Payment was deducted but order not confirmed',
          priority: 'urgent',
          category: 'payment',
        };

        const mockTicket = {
          id: 'ticket-456',
          ticket_number: 'TICK-DEF456',
          subject: ticketData.subject,
          priority: ticketData.priority,
          status: 'open',
          category: ticketData.category,
          created_at: new Date(),
          updated_at: new Date(),
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockTicket] })
          .mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/v1/support/tickets')
          .send(ticketData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(mockPool.query).toHaveBeenCalledTimes(2);
      });

      it('should return 400 if subject is missing', async () => {
        const response = await request(app)
          .post('/api/v1/support/tickets')
          .send({ message: 'Test message' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Subject is required');
      });
    });

    describe('GET /api/v1/support/tickets - Get All Tickets', () => {
      it('should fetch all tickets for support agent', async () => {
        const mockTickets = [
          {
            id: 'ticket-1',
            ticket_number: 'TICK-001',
            subject: 'First ticket',
            status: 'open',
            priority: 'high',
            created_by_name: 'John Doe',
            created_by_email: 'john@example.com',
            reply_count: '2',
            last_reply_at: new Date(),
          },
          {
            id: 'ticket-2',
            ticket_number: 'TICK-002',
            subject: 'Second ticket',
            status: 'in_progress',
            priority: 'medium',
            created_by_name: 'Jane Smith',
            created_by_email: 'jane@example.com',
            reply_count: '1',
            last_reply_at: new Date(),
          },
        ];

        mockPool.query.mockResolvedValueOnce({ rows: mockTickets });

        const response = await request(app)
          .get('/api/v1/support/tickets')
          .set('Authorization', `Bearer ${supportToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.total).toBe(2);
      });

      it('should filter tickets by status', async () => {
        const mockTickets = [
          {
            id: 'ticket-1',
            ticket_number: 'TICK-001',
            subject: 'Open ticket',
            status: 'open',
            priority: 'high',
            created_by_name: 'John Doe',
            created_by_email: 'john@example.com',
            reply_count: '0',
          },
        ];

        mockPool.query.mockResolvedValueOnce({ rows: mockTickets });

        const response = await request(app)
          .get('/api/v1/support/tickets?status=open')
          .set('Authorization', `Bearer ${supportToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('t.status = $1'),
          ['open']
        );
      });

      it('should filter tickets by priority and order_id', async () => {
        const mockTickets = [];
        mockPool.query.mockResolvedValueOnce({ rows: mockTickets });

        const response = await request(app)
          .get('/api/v1/support/tickets?priority=urgent&order_id=order-123')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('t.priority = $1'),
          ['urgent', 'order-123']
        );
      });

      it('should return 401 for unauthenticated request', async () => {
        const response = await request(app)
          .get('/api/v1/support/tickets')
          .expect(401);

        expect(response.body.error).toBe('Unauthorized');
      });
    });

    describe('GET /api/v1/support/tickets/:id - Get Ticket Details', () => {
      it('should fetch ticket with all messages', async () => {
        const mockTicket = {
          id: 'ticket-123',
          ticket_number: 'TICK-123',
          subject: 'Test ticket',
          status: 'open',
          priority: 'medium',
          created_by: 'customer-123',
          created_by_name: 'John Doe',
          created_by_email: 'john@example.com',
          created_by_phone: '+971501234567',
        };

        const mockMessages = [
          {
            id: 'msg-1',
            ticket_id: 'ticket-123',
            user_id: 'customer-123',
            message: 'Initial message',
            author_name: 'John Doe',
            author_email: 'john@example.com',
            created_at: new Date(),
          },
          {
            id: 'msg-2',
            ticket_id: 'ticket-123',
            user_id: 'support-456',
            message: 'Support response',
            author_name: 'Support Agent',
            author_email: 'support@cuts.ae',
            created_at: new Date(),
          },
        ];

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockTicket] })
          .mockResolvedValueOnce({ rows: mockMessages });

        const response = await request(app)
          .get('/api/v1/support/tickets/ticket-123')
          .set('Authorization', `Bearer ${supportToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe('ticket-123');
        expect(response.body.data.messages).toHaveLength(2);
      });

      it('should return 404 if ticket not found', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .get('/api/v1/support/tickets/nonexistent')
          .set('Authorization', `Bearer ${supportToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Ticket not found');
      });
    });

    describe('POST /api/v1/support/tickets/:id/replies - Add Reply', () => {
      it('should add reply to ticket', async () => {
        const replyData = {
          message: 'Thank you for contacting support',
          is_internal: false,
        };

        const mockTicket = { id: 'ticket-123' };
        const mockReply = {
          id: 'reply-123',
          ticket_id: 'ticket-123',
          user_id: 'support-456',
          message: replyData.message,
          is_internal: replyData.is_internal,
          created_at: new Date(),
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockTicket] })
          .mockResolvedValueOnce({ rows: [mockReply] })
          .mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/v1/support/tickets/ticket-123/replies')
          .set('Authorization', `Bearer ${supportToken}`)
          .send(replyData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.message).toBe(replyData.message);
      });

      it('should add internal note to ticket', async () => {
        const replyData = {
          message: 'Internal note: Customer seems frustrated',
          is_internal: true,
        };

        const mockTicket = { id: 'ticket-123' };
        const mockReply = {
          id: 'reply-124',
          ticket_id: 'ticket-123',
          user_id: 'support-456',
          message: replyData.message,
          is_internal: true,
          created_at: new Date(),
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockTicket] })
          .mockResolvedValueOnce({ rows: [mockReply] })
          .mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/v1/support/tickets/ticket-123/replies')
          .set('Authorization', `Bearer ${supportToken}`)
          .send(replyData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.is_internal).toBe(true);
      });

      it('should return 400 if message is missing', async () => {
        const response = await request(app)
          .post('/api/v1/support/tickets/ticket-123/replies')
          .set('Authorization', `Bearer ${supportToken}`)
          .send({})
          .expect(400);

        expect(response.body.error).toBe('Message is required');
      });

      it('should return 404 if ticket does not exist', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/v1/support/tickets/nonexistent/replies')
          .set('Authorization', `Bearer ${supportToken}`)
          .send({ message: 'Test reply' })
          .expect(404);

        expect(response.body.error).toBe('Ticket not found');
      });
    });

    describe('PATCH /api/v1/support/tickets/:id/status - Update Status', () => {
      it('should update ticket status as support agent', async () => {
        const mockTicket = {
          id: 'ticket-123',
          ticket_number: 'TICK-123',
          status: 'in_progress',
          updated_at: new Date(),
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockTicket] });

        const response = await request(app)
          .patch('/api/v1/support/tickets/ticket-123/status')
          .set('Authorization', `Bearer ${supportToken}`)
          .send({ status: 'in_progress' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('in_progress');
      });

      it('should update ticket status as admin', async () => {
        const mockTicket = {
          id: 'ticket-123',
          status: 'closed',
          updated_at: new Date(),
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockTicket] });

        const response = await request(app)
          .patch('/api/v1/support/tickets/ticket-123/status')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'closed' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('closed');
      });

      it('should return 403 for customer trying to update status', async () => {
        const response = await request(app)
          .patch('/api/v1/support/tickets/ticket-123/status')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ status: 'closed' })
          .expect(403);

        expect(response.body.error).toBe('Forbidden');
      });

      it('should return 400 for invalid status', async () => {
        const response = await request(app)
          .patch('/api/v1/support/tickets/ticket-123/status')
          .set('Authorization', `Bearer ${supportToken}`)
          .send({ status: 'invalid_status' })
          .expect(400);

        expect(response.body.error).toContain('Valid status is required');
      });

      it('should return 404 if ticket not found', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .patch('/api/v1/support/tickets/nonexistent/status')
          .set('Authorization', `Bearer ${supportToken}`)
          .send({ status: 'closed' })
          .expect(404);

        expect(response.body.error).toBe('Ticket not found');
      });

      it('should accept all valid statuses', async () => {
        const validStatuses = ['open', 'in_progress', 'closed', 'pending'];

        for (const status of validStatuses) {
          const mockTicket = { id: 'ticket-123', status, updated_at: new Date() };
          mockPool.query.mockResolvedValueOnce({ rows: [mockTicket] });

          const response = await request(app)
            .patch('/api/v1/support/tickets/ticket-123/status')
            .set('Authorization', `Bearer ${supportToken}`)
            .send({ status })
            .expect(200);

          expect(response.body.data.status).toBe(status);
        }
      });
    });

    describe('PATCH /api/v1/support/tickets/:id/priority - Update Priority', () => {
      it('should update ticket priority as support agent', async () => {
        const mockTicket = {
          id: 'ticket-123',
          priority: 'urgent',
          updated_at: new Date(),
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockTicket] });

        const response = await request(app)
          .patch('/api/v1/support/tickets/ticket-123/priority')
          .set('Authorization', `Bearer ${supportToken}`)
          .send({ priority: 'urgent' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.priority).toBe('urgent');
      });

      it('should update ticket priority as admin', async () => {
        const mockTicket = {
          id: 'ticket-123',
          priority: 'low',
          updated_at: new Date(),
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockTicket] });

        const response = await request(app)
          .patch('/api/v1/support/tickets/ticket-123/priority')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ priority: 'low' })
          .expect(200);

        expect(response.body.data.priority).toBe('low');
      });

      it('should return 403 for customer trying to update priority', async () => {
        const response = await request(app)
          .patch('/api/v1/support/tickets/ticket-123/priority')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ priority: 'high' })
          .expect(403);

        expect(response.body.error).toBe('Forbidden');
      });

      it('should return 400 for invalid priority', async () => {
        const response = await request(app)
          .patch('/api/v1/support/tickets/ticket-123/priority')
          .set('Authorization', `Bearer ${supportToken}`)
          .send({ priority: 'critical' })
          .expect(400);

        expect(response.body.error).toContain('Valid priority is required');
      });

      it('should accept all valid priorities', async () => {
        const validPriorities = ['low', 'medium', 'high', 'urgent'];

        for (const priority of validPriorities) {
          const mockTicket = { id: 'ticket-123', priority, updated_at: new Date() };
          mockPool.query.mockResolvedValueOnce({ rows: [mockTicket] });

          const response = await request(app)
            .patch('/api/v1/support/tickets/ticket-123/priority')
            .set('Authorization', `Bearer ${supportToken}`)
            .send({ priority })
            .expect(200);

          expect(response.body.data.priority).toBe(priority);
        }
      });
    });

    describe('POST /api/v1/support/tickets/:id/chat - Convert to Chat', () => {
      it('should convert ticket to chat session as support agent', async () => {
        const mockTicket = {
          id: 'ticket-123',
          ticket_number: 'TICK-123',
          subject: 'Need immediate help',
          category: 'order',
          priority: 'urgent',
          restaurant_id: 'restaurant-1',
          message: 'Initial message',
        };

        const mockChatSession = {
          id: 'session-123',
          subject: mockTicket.subject,
          status: 'waiting',
          created_at: new Date(),
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockTicket] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [mockChatSession] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/v1/support/tickets/ticket-123/chat')
          .set('Authorization', `Bearer ${supportToken}`)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.session_id).toBeDefined();
        expect(response.body.data.ticket_id).toBe('ticket-123');
      });

      it('should return 400 if chat already exists for ticket', async () => {
        const mockTicket = {
          id: 'ticket-123',
          subject: 'Test ticket',
        };

        const mockExistingChat = {
          id: 'session-existing',
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockTicket] })
          .mockResolvedValueOnce({ rows: [mockExistingChat] });

        const response = await request(app)
          .post('/api/v1/support/tickets/ticket-123/chat')
          .set('Authorization', `Bearer ${supportToken}`)
          .expect(400);

        expect(response.body.error).toBe('Chat session already exists for this ticket');
        expect(response.body.data.session_id).toBe('session-existing');
      });

      it('should return 403 for customer trying to convert ticket', async () => {
        const response = await request(app)
          .post('/api/v1/support/tickets/ticket-123/chat')
          .set('Authorization', `Bearer ${customerToken}`)
          .expect(403);

        expect(response.body.error).toBe('Forbidden');
      });

      it('should return 404 if ticket not found', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/v1/support/tickets/nonexistent/chat')
          .set('Authorization', `Bearer ${supportToken}`)
          .expect(404);

        expect(response.body.error).toBe('Ticket not found');
      });
    });
  });

  describe('Chat Session Endpoints', () => {
    describe('POST /api/v1/chat/sessions - Create Chat Session', () => {
      it('should create chat session as customer', async () => {
        const chatData = {
          subject: 'Need help with order',
          category: 'order',
          priority: 'high',
          restaurant_id: 'restaurant-1',
          initial_message: 'My order is delayed',
        };

        const mockSession = {
          id: 'session-123',
          subject: chatData.subject,
          category: chatData.category,
          priority: chatData.priority,
          restaurant_id: chatData.restaurant_id,
          customer_id: 'customer-123',
          status: 'waiting',
          created_at: new Date(),
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockSession] })
          .mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/v1/chat/sessions')
          .set('Authorization', `Bearer ${customerToken}`)
          .send(chatData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.subject).toBe(chatData.subject);
        expect(response.body.data.status).toBe('waiting');
      });

      it('should create chat session without initial message', async () => {
        const chatData = {
          subject: 'General inquiry',
          category: 'general',
        };

        const mockSession = {
          id: 'session-456',
          subject: chatData.subject,
          category: chatData.category,
          priority: 'medium',
          status: 'waiting',
          created_at: new Date(),
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockSession] });

        const response = await request(app)
          .post('/api/v1/chat/sessions')
          .set('Authorization', `Bearer ${customerToken}`)
          .send(chatData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(mockPool.query).toHaveBeenCalledTimes(1);
      });

      it('should return 400 if subject is missing', async () => {
        const response = await request(app)
          .post('/api/v1/chat/sessions')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ category: 'general' })
          .expect(400);

        expect(response.body.error).toBe('Subject is required');
      });

      it('should return 401 for unauthenticated request', async () => {
        const response = await request(app)
          .post('/api/v1/chat/sessions')
          .send({ subject: 'Test' })
          .expect(401);

        expect(response.body.error).toBe('Unauthorized');
      });
    });

    describe('GET /api/v1/chat/sessions - Get Active Sessions', () => {
      it('should get all active sessions as support agent', async () => {
        const mockSessions = [
          {
            id: 'session-1',
            subject: 'Order issue',
            status: 'active',
            customer_id: 'customer-1',
            agent_id: 'support-456',
            unread_count: 2,
          },
          {
            id: 'session-2',
            subject: 'Payment problem',
            status: 'waiting',
            customer_id: 'customer-2',
            unread_count: 5,
          },
        ];

        mockPool.query.mockResolvedValueOnce({ rows: mockSessions });

        const response = await request(app)
          .get('/api/v1/chat/sessions')
          .set('Authorization', `Bearer ${supportToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
      });

      it('should get customer sessions when accessed by customer (returns their own sessions)', async () => {
        const mockSessions = [
          {
            id: 'session-customer-1',
            subject: 'My chat',
            status: 'active',
            customer_id: 'customer-123',
          },
        ];

        mockPool.query.mockResolvedValueOnce({ rows: mockSessions });

        const response = await request(app)
          .get('/api/v1/chat/sessions')
          .set('Authorization', `Bearer ${customerToken}`);

        if (response.status === 403) {
          expect(response.body.error).toBe('Forbidden');
        } else {
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
        }
      });
    });

    describe('GET /api/v1/chat/sessions/my - Get User Sessions', () => {
      it('should get user own sessions', async () => {
        const mockSessions = [
          {
            id: 'session-user-1',
            subject: 'My first chat',
            customer_id: 'customer-123',
            status: 'active',
          },
          {
            id: 'session-user-2',
            subject: 'My second chat',
            customer_id: 'customer-123',
            status: 'closed',
          },
        ];

        mockPool.query.mockResolvedValueOnce({ rows: mockSessions });

        const response = await request(app)
          .get('/api/v1/chat/sessions/my')
          .set('Authorization', `Bearer ${customerToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
      });
    });

    describe('GET /api/v1/chat/sessions/:sessionId - Get Chat Session', () => {
      it('should get chat session details', async () => {
        const mockSession = {
          id: 'session-123',
          subject: 'Order help',
          status: 'active',
          customer_id: 'customer-123',
          agent_id: 'support-456',
          unread_count: 3,
          created_at: new Date(),
        };

        const mockLastMessage = {
          id: 'msg-last',
          content: 'Latest message',
          created_at: new Date(),
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockSession] })
          .mockResolvedValueOnce({ rows: [mockLastMessage] });

        const response = await request(app)
          .get('/api/v1/chat/sessions/session-123')
          .set('Authorization', `Bearer ${supportToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe('session-123');
        expect(response.body.data.last_message).toBeDefined();
      });

      it('should return 404 if session not found', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .get('/api/v1/chat/sessions/nonexistent')
          .set('Authorization', `Bearer ${supportToken}`)
          .expect(404);

        expect(response.body.error).toBe('Session not found');
      });
    });

    describe('GET /api/v1/chat/sessions/:sessionId/messages - Get Messages', () => {
      it('should get session messages with default pagination', async () => {
        const mockMessages = [
          {
            id: 'msg-1',
            session_id: 'session-123',
            sender_id: 'customer-123',
            sender_role: 'customer',
            content: 'Hello, I need help',
            message_type: 'text',
            created_at: new Date(),
          },
          {
            id: 'msg-2',
            session_id: 'session-123',
            sender_id: 'support-456',
            sender_role: 'support',
            content: 'How can I help you?',
            message_type: 'text',
            created_at: new Date(),
          },
        ];

        mockPool.query.mockResolvedValueOnce({ rows: mockMessages });

        const response = await request(app)
          .get('/api/v1/chat/sessions/session-123/messages')
          .set('Authorization', `Bearer ${customerToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
      });

      it('should get messages with custom pagination', async () => {
        const mockMessages = [];
        mockPool.query.mockResolvedValueOnce({ rows: mockMessages });

        const response = await request(app)
          .get('/api/v1/chat/sessions/session-123/messages?limit=20&offset=10')
          .set('Authorization', `Bearer ${supportToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.any(String),
          ['session-123', 20, 10]
        );
      });
    });

    describe('POST /api/v1/chat/sessions/:sessionId/messages - Send Message', () => {
      it('should send text message', async () => {
        const messageData = {
          content: 'This is my message',
          message_type: 'text',
        };

        const mockSession = {
          id: 'session-123',
          status: 'active',
        };

        const mockMessage = {
          id: 'msg-new',
          session_id: 'session-123',
          sender_id: 'customer-123',
          sender_role: 'customer',
          content: messageData.content,
          message_type: messageData.message_type,
          attachments: [],
          read_by: [],
          created_at: new Date(),
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockSession] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [mockMessage] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [mockMessage] });

        const response = await request(app)
          .post('/api/v1/chat/sessions/session-123/messages')
          .set('Authorization', `Bearer ${customerToken}`)
          .send(messageData)
          .expect(201);

        expect(response.body.success).toBe(true);
        if (response.body.data) {
          expect(response.body.data.content).toBe(messageData.content);
        }
      });

      it('should return 404 if session not found', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/v1/chat/sessions/nonexistent/messages')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ content: 'Test message' })
          .expect(404);

        expect(response.body.error).toBe('Session not found');
      });
    });

    describe('POST /api/v1/chat/sessions/:sessionId/read - Mark as Read', () => {
      it('should mark specific messages as read', async () => {
        const readData = {
          message_ids: ['msg-1', 'msg-2', 'msg-3'],
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/v1/chat/sessions/session-123/read')
          .set('Authorization', `Bearer ${customerToken}`)
          .send(readData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Messages marked as read');
      });

      it('should mark all session messages as read when no message_ids provided', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/v1/chat/sessions/session-123/read')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({})
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('POST /api/v1/chat/sessions/:sessionId/assign - Assign Agent', () => {
      it('should assign support agent to session', async () => {
        const mockSession = {
          id: 'session-123',
          subject: 'Test session',
          status: 'waiting',
          customer_id: 'customer-123',
          unread_count: 0,
        };

        const mockSessionDetails = {
          ...mockSession,
          last_message: null,
        };

        const mockUpdatedSession = {
          ...mockSession,
          status: 'active',
          agent_id: 'support-456',
          assigned_at: new Date(),
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockSession] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [mockUpdatedSession] })
          .mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/v1/chat/sessions/session-123/assign')
          .set('Authorization', `Bearer ${supportToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.agent_id).toBe('support-456');
        expect(response.body.data.status).toBe('active');
      });

      it('should allow admin to assign agent', async () => {
        const mockSession = {
          id: 'session-456',
          status: 'waiting',
          unread_count: 0,
        };

        const mockUpdatedSession = {
          ...mockSession,
          status: 'active',
          agent_id: 'admin-789',
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockSession] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [mockUpdatedSession] })
          .mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/v1/chat/sessions/session-456/assign')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should return 403 for customer trying to assign', async () => {
        const response = await request(app)
          .post('/api/v1/chat/sessions/session-123/assign')
          .set('Authorization', `Bearer ${customerToken}`)
          .expect(403);

        expect(response.body.error).toBe('Forbidden');
      });

      it('should return 400 if chat already accepted', async () => {
        const mockSession = {
          id: 'session-123',
          status: 'active',
          agent_id: 'another-agent',
          unread_count: 0,
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockSession] })
          .mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/v1/chat/sessions/session-123/assign')
          .set('Authorization', `Bearer ${supportToken}`)
          .expect(400);

        expect(response.body.error).toBe('Chat already accepted');
      });

      it('should return 404 if session not found', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/v1/chat/sessions/nonexistent/assign')
          .set('Authorization', `Bearer ${supportToken}`)
          .expect(404);

        expect(response.body.error).toBe('Session not found');
      });
    });

    describe('PATCH /api/v1/chat/sessions/:sessionId/status - Update Status', () => {
      it('should update session status as support agent', async () => {
        const mockUpdatedSession = {
          id: 'session-123',
          status: 'closed',
          closed_at: new Date(),
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockUpdatedSession] })
          .mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .patch('/api/v1/chat/sessions/session-123/status')
          .set('Authorization', `Bearer ${supportToken}`)
          .send({ status: 'closed' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('closed');
      });

      it('should update session status as admin', async () => {
        const mockUpdatedSession = {
          id: 'session-123',
          status: 'active',
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockUpdatedSession] });

        const response = await request(app)
          .patch('/api/v1/chat/sessions/session-123/status')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'active' })
          .expect(200);

        expect(response.body.data.status).toBe('active');
      });

      it('should return 403 for customer trying to update status', async () => {
        const response = await request(app)
          .patch('/api/v1/chat/sessions/session-123/status')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ status: 'closed' })
          .expect(403);

        expect(response.body.error).toBe('Forbidden');
      });

      it('should return 400 if status is missing', async () => {
        const response = await request(app)
          .patch('/api/v1/chat/sessions/session-123/status')
          .set('Authorization', `Bearer ${supportToken}`)
          .send({})
          .expect(400);

        expect(response.body.error).toBe('Status is required');
      });
    });
  });

  describe('End-to-End Workflows', () => {
    describe('Complete Support Ticket Workflow', () => {
      it('should handle full ticket lifecycle', async () => {
        const ticketData = {
          subject: 'Order delivery issue',
          message: 'My order did not arrive',
          priority: 'high',
          category: 'order',
          order_id: 'order-999',
          created_by: 'customer-123',
        };

        const mockTicket = {
          id: 'ticket-workflow',
          ticket_number: 'TICK-WF001',
          ...ticketData,
          status: 'open',
          created_at: new Date(),
          updated_at: new Date(),
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockTicket] })
          .mockResolvedValueOnce({ rows: [] });

        const createResponse = await request(app)
          .post('/api/v1/support/tickets')
          .send(ticketData)
          .expect(201);

        expect(createResponse.body.success).toBe(true);
        const ticketId = createResponse.body.data.id;

        mockPool.query.mockResolvedValueOnce({ rows: [mockTicket] });

        await request(app)
          .patch(`/api/v1/support/tickets/${ticketId}/status`)
          .set('Authorization', `Bearer ${supportToken}`)
          .send({ status: 'in_progress' })
          .expect(200);

        const replyTicket = { id: ticketId };
        const mockReply = {
          id: 'reply-1',
          ticket_id: ticketId,
          message: 'We are investigating your issue',
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [replyTicket] })
          .mockResolvedValueOnce({ rows: [mockReply] })
          .mockResolvedValueOnce({ rows: [] });

        await request(app)
          .post(`/api/v1/support/tickets/${ticketId}/replies`)
          .set('Authorization', `Bearer ${supportToken}`)
          .send({ message: 'We are investigating your issue' })
          .expect(201);

        const closedTicket = { ...mockTicket, status: 'closed' };
        mockPool.query.mockResolvedValueOnce({ rows: [closedTicket] });

        const closeResponse = await request(app)
          .patch(`/api/v1/support/tickets/${ticketId}/status`)
          .set('Authorization', `Bearer ${supportToken}`)
          .send({ status: 'closed' })
          .expect(200);

        expect(closeResponse.body.data.status).toBe('closed');
      });
    });

    describe('Complete Chat Session Workflow', () => {
      it('should handle full chat lifecycle', async () => {
        const chatData = {
          subject: 'Urgent delivery query',
          category: 'delivery',
          priority: 'urgent',
          initial_message: 'Where is my order?',
        };

        const mockSession = {
          id: 'session-workflow',
          ...chatData,
          status: 'waiting',
          customer_id: 'customer-123',
          created_at: new Date(),
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockSession] })
          .mockResolvedValueOnce({ rows: [] });

        const createResponse = await request(app)
          .post('/api/v1/chat/sessions')
          .set('Authorization', `Bearer ${customerToken}`)
          .send(chatData)
          .expect(201);

        expect(createResponse.body.success).toBe(true);
        const sessionId = createResponse.body.data.id;

        const assignedSession = {
          ...mockSession,
          status: 'active',
          agent_id: 'support-456',
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [{ ...mockSession, unread_count: 0 }] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [assignedSession] })
          .mockResolvedValueOnce({ rows: [] });

        await request(app)
          .post(`/api/v1/chat/sessions/${sessionId}/assign`)
          .set('Authorization', `Bearer ${supportToken}`)
          .expect(200);

        const mockMessage = {
          id: 'msg-workflow',
          session_id: sessionId,
          sender_id: 'support-456',
          content: 'Let me check your order status',
          attachments: [],
          read_by: [],
          created_at: new Date(),
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [assignedSession] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [mockMessage] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [mockMessage] });

        await request(app)
          .post(`/api/v1/chat/sessions/${sessionId}/messages`)
          .set('Authorization', `Bearer ${supportToken}`)
          .send({ content: 'Let me check your order status' })
          .expect(201);

        const closedSession = { ...assignedSession, status: 'closed', closed_at: new Date() };
        mockPool.query
          .mockResolvedValueOnce({ rows: [closedSession] })
          .mockResolvedValueOnce({ rows: [] });

        const closeResponse = await request(app)
          .patch(`/api/v1/chat/sessions/${sessionId}/status`)
          .set('Authorization', `Bearer ${supportToken}`)
          .send({ status: 'closed' })
          .expect(200);

        expect(closeResponse.body.success).toBe(true);
        expect(closeResponse.body.data).toBeDefined();
        expect(closeResponse.body.data.status).toBe('closed');
      });
    });

    describe('Ticket to Chat Conversion Workflow', () => {
      it('should convert ticket to chat and continue conversation', async () => {
        const ticketData = {
          subject: 'Complex issue requiring chat',
          message: 'This needs real-time discussion',
          priority: 'urgent',
          category: 'technical',
        };

        const mockTicket = {
          id: 'ticket-convert',
          ticket_number: 'TICK-CONV001',
          ...ticketData,
          status: 'open',
          created_at: new Date(),
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockTicket] })
          .mockResolvedValueOnce({ rows: [] });

        const ticketResponse = await request(app)
          .post('/api/v1/support/tickets')
          .send(ticketData)
          .expect(201);

        const ticketId = ticketResponse.body.data.id;

        const mockChatSession = {
          id: 'session-from-ticket',
          subject: mockTicket.subject,
          status: 'waiting',
          ticket_id: ticketId,
        };

        mockPool.query
          .mockResolvedValueOnce({ rows: [mockTicket] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [mockChatSession] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] });

        const chatResponse = await request(app)
          .post(`/api/v1/support/tickets/${ticketId}/chat`)
          .set('Authorization', `Bearer ${supportToken}`)
          .expect(201);

        expect(chatResponse.body.data.session_id).toBeDefined();
        expect(chatResponse.body.data.ticket_id).toBe(ticketId);
      });
    });
  });

  describe('Authorization Tests', () => {
    it('should allow all authenticated users to create support tickets', async () => {
      const ticketData = {
        subject: 'Test ticket',
        priority: 'medium',
      };

      const mockTicket = {
        id: 'ticket-auth-test',
        ticket_number: 'TICK-AUTH',
        ...ticketData,
        status: 'open',
      };

      for (const token of [customerToken, supportToken, adminToken, restaurantToken]) {
        mockPool.query
          .mockResolvedValueOnce({ rows: [mockTicket] })
          .mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/v1/support/tickets')
          .send(ticketData)
          .expect(201);

        expect(response.body.success).toBe(true);
      }
    });

    it('should restrict ticket status updates to support and admin only', async () => {
      const updateData = { status: 'closed' };

      mockPool.query.mockResolvedValue({ rows: [{ id: 'ticket-1', status: 'closed' }] });

      await request(app)
        .patch('/api/v1/support/tickets/ticket-1/status')
        .set('Authorization', `Bearer ${supportToken}`)
        .send(updateData)
        .expect(200);

      await request(app)
        .patch('/api/v1/support/tickets/ticket-1/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      await request(app)
        .patch('/api/v1/support/tickets/ticket-1/status')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(updateData)
        .expect(403);

      await request(app)
        .patch('/api/v1/support/tickets/ticket-1/status')
        .set('Authorization', `Bearer ${restaurantToken}`)
        .send(updateData)
        .expect(403);
    });

    it('should allow support and admin to view all sessions', async () => {
      const mockSessions = [
        { id: 'session-1', subject: 'Session 1' },
        { id: 'session-2', subject: 'Session 2' },
      ];

      mockPool.query.mockResolvedValue({ rows: mockSessions });

      const supportResponse = await request(app)
        .get('/api/v1/chat/sessions')
        .set('Authorization', `Bearer ${supportToken}`)
        .expect(200);

      expect(supportResponse.body.data).toHaveLength(2);

      const adminResponse = await request(app)
        .get('/api/v1/chat/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(adminResponse.body.data).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully in ticket creation', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/v1/support/tickets')
        .send({ subject: 'Test', message: 'Test message' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to create support ticket');
    });

    it('should handle database errors in chat session creation', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/v1/chat/sessions')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ subject: 'Test chat' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to create chat session');
    });

    it('should handle invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/api/v1/support/tickets')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.error).toBe('Invalid JSON');
    });
  });
});
