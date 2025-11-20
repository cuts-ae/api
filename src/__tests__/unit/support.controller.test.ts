import { Request, Response } from 'express';
import * as supportController from '../../controllers/support.controller';
import pool from '../../config/database';
import chatService from '../../services/chat.service';

// Mock the database pool
jest.mock('../../config/database');

// Mock the chat service
jest.mock('../../services/chat.service');

const mockQuery = pool.query as jest.Mock;
const mockChatService = chatService as jest.Mocked<typeof chatService>;

interface MockRequest extends Partial<Request> {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

describe('Support Controller', () => {
  let mockRequest: MockRequest;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: {
        id: 'support-user-123',
        email: 'support@cuts.ae',
        role: 'support'
      }
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('getTickets', () => {
    const mockTickets = [
      {
        id: 'ticket-1',
        ticket_number: 'TICK-ABC123',
        subject: 'Order issue',
        status: 'open',
        priority: 'high',
        category: 'order',
        created_by: 'user-1',
        created_by_name: 'John Doe',
        created_by_email: 'john@example.com',
        reply_count: '3',
        last_reply_at: '2024-01-15T12:00:00Z',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T12:00:00Z'
      },
      {
        id: 'ticket-2',
        ticket_number: 'TICK-DEF456',
        subject: 'Payment problem',
        status: 'in_progress',
        priority: 'urgent',
        category: 'payment',
        created_by: 'user-2',
        created_by_name: 'Jane Smith',
        created_by_email: 'jane@example.com',
        reply_count: '1',
        last_reply_at: '2024-01-15T11:30:00Z',
        created_at: '2024-01-15T11:00:00Z',
        updated_at: '2024-01-15T11:30:00Z'
      }
    ];

    it('should fetch all tickets successfully without filters', async () => {
      mockQuery.mockResolvedValueOnce({ rows: mockTickets });

      await supportController.getTickets(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        []
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockTickets,
        total: mockTickets.length
      });
    });

    it('should fetch tickets filtered by status', async () => {
      mockRequest.query = { status: 'open' };
      const filteredTickets = [mockTickets[0]];
      mockQuery.mockResolvedValueOnce({ rows: filteredTickets });

      await supportController.getTickets(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND t.status = $1'),
        ['open']
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: filteredTickets,
        total: filteredTickets.length
      });
    });

    it('should fetch tickets filtered by priority', async () => {
      mockRequest.query = { priority: 'urgent' };
      const filteredTickets = [mockTickets[1]];
      mockQuery.mockResolvedValueOnce({ rows: filteredTickets });

      await supportController.getTickets(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND t.priority = $1'),
        ['urgent']
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: filteredTickets,
        total: filteredTickets.length
      });
    });

    it('should fetch tickets filtered by order_id', async () => {
      mockRequest.query = { order_id: 'order-123' };
      mockQuery.mockResolvedValueOnce({ rows: [mockTickets[0]] });

      await supportController.getTickets(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND t.order_id = $1'),
        ['order-123']
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [mockTickets[0]],
        total: 1
      });
    });

    it('should fetch tickets with multiple filters', async () => {
      mockRequest.query = {
        status: 'open',
        priority: 'high',
        order_id: 'order-123'
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockTickets[0]] });

      await supportController.getTickets(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND t.status = $1'),
        ['open', 'high', 'order-123']
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [mockTickets[0]],
        total: 1
      });
    });

    it('should return empty array when no tickets match filters', async () => {
      mockRequest.query = { status: 'closed' };
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await supportController.getTickets(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        total: 0
      });
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      await supportController.getTickets(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch support tickets'
      });
    });

    it('should order tickets by priority and creation date', async () => {
      mockQuery.mockResolvedValueOnce({ rows: mockTickets });

      await supportController.getTickets(
        mockRequest as Request,
        mockResponse as Response
      );

      const queryCall = mockQuery.mock.calls[0][0];
      expect(queryCall).toContain("WHEN 'urgent' THEN 1");
      expect(queryCall).toContain("WHEN 'high' THEN 2");
      expect(queryCall).toContain("WHEN 'medium' THEN 3");
      expect(queryCall).toContain("WHEN 'low' THEN 4");
      expect(queryCall).toContain('ORDER BY');
    });
  });

  describe('getTicketById', () => {
    const mockTicket = {
      id: 'ticket-1',
      ticket_number: 'TICK-ABC123',
      subject: 'Order issue',
      status: 'open',
      priority: 'high',
      category: 'order',
      order_id: 'order-123',
      created_by: 'user-1',
      created_by_name: 'John Doe',
      created_by_email: 'john@example.com',
      created_by_phone: '+971501234567',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T12:00:00Z'
    };

    const mockMessages = [
      {
        id: 'msg-1',
        ticket_id: 'ticket-1',
        user_id: 'user-1',
        message: 'I have an issue with my order',
        is_internal: false,
        author_name: 'John Doe',
        author_email: 'john@example.com',
        created_at: '2024-01-15T10:05:00Z'
      },
      {
        id: 'msg-2',
        ticket_id: 'ticket-1',
        user_id: 'support-user-123',
        message: 'We are looking into this',
        is_internal: false,
        author_name: 'Support Agent',
        author_email: 'support@cuts.ae',
        created_at: '2024-01-15T10:15:00Z'
      },
      {
        id: 'msg-3',
        ticket_id: 'ticket-1',
        user_id: 'support-user-123',
        message: 'Internal note: contacted restaurant',
        is_internal: true,
        author_name: 'Support Agent',
        author_email: 'support@cuts.ae',
        created_at: '2024-01-15T10:20:00Z'
      }
    ];

    it('should fetch ticket by id successfully with messages', async () => {
      mockRequest.params = { id: 'ticket-1' };
      mockQuery
        .mockResolvedValueOnce({ rows: [mockTicket] })
        .mockResolvedValueOnce({ rows: mockMessages });

      await supportController.getTicketById(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('SELECT'),
        ['ticket-1']
      );
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('FROM support_messages'),
        ['ticket-1']
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          ...mockTicket,
          messages: mockMessages
        }
      });
    });

    it('should return 404 when ticket not found', async () => {
      mockRequest.params = { id: 'non-existent-ticket' };
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await supportController.getTicketById(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Ticket not found'
      });
    });

    it('should fetch ticket with empty messages array', async () => {
      mockRequest.params = { id: 'ticket-1' };
      mockQuery
        .mockResolvedValueOnce({ rows: [mockTicket] })
        .mockResolvedValueOnce({ rows: [] });

      await supportController.getTicketById(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          ...mockTicket,
          messages: []
        }
      });
    });

    it('should handle database errors gracefully', async () => {
      mockRequest.params = { id: 'ticket-1' };
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await supportController.getTicketById(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch ticket details'
      });
    });

    it('should order messages by creation date ascending', async () => {
      mockRequest.params = { id: 'ticket-1' };
      mockQuery
        .mockResolvedValueOnce({ rows: [mockTicket] })
        .mockResolvedValueOnce({ rows: mockMessages });

      await supportController.getTicketById(
        mockRequest as Request,
        mockResponse as Response
      );

      const messagesQuery = mockQuery.mock.calls[1][0];
      expect(messagesQuery).toContain('ORDER BY m.created_at ASC');
    });
  });

  describe('createTicket', () => {
    const mockTicket = {
      id: 'ticket-1',
      ticket_number: 'TICK-ABC123',
      subject: 'Order issue',
      status: 'open',
      priority: 'medium',
      category: 'other',
      order_id: null,
      created_by: 'user-1',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z'
    };

    it('should create ticket successfully with all fields', async () => {
      mockRequest.body = {
        subject: 'Order issue',
        message: 'My order is delayed',
        priority: 'high',
        category: 'order',
        order_id: 'order-123',
        created_by: 'user-1'
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ ...mockTicket, id: 'ticket-1' }] })
        .mockResolvedValueOnce({ rows: [] });

      await supportController.createTicket(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('INSERT INTO support_tickets'),
        expect.arrayContaining([
          expect.stringMatching(/TICK-[A-Z0-9]+/),
          'Order issue',
          'high',
          'open',
          'order',
          'order-123',
          'user-1'
        ])
      );
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO support_messages'),
        ['ticket-1', 'user-1', 'My order is delayed', false]
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ id: 'ticket-1' })
      });
    });

    it('should create ticket with minimal required fields', async () => {
      mockRequest.body = {
        subject: 'Simple issue'
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockTicket] });

      await supportController.createTicket(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO support_tickets'),
        expect.arrayContaining([
          expect.stringMatching(/TICK-[A-Z0-9]+/),
          'Simple issue',
          'medium',
          'open',
          'other',
          null,
          null
        ])
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should create ticket without message', async () => {
      mockRequest.body = {
        subject: 'Issue without message',
        created_by: 'user-1'
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockTicket] });

      await supportController.createTicket(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO support_messages'),
        expect.anything()
      );
    });

    it('should return 400 when subject is missing', async () => {
      mockRequest.body = {
        message: 'Message without subject'
      };

      await supportController.createTicket(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Subject is required'
      });
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should return 400 when subject is empty string', async () => {
      mockRequest.body = {
        subject: ''
      };

      await supportController.createTicket(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Subject is required'
      });
    });

    it('should generate unique ticket numbers', async () => {
      mockRequest.body = { subject: 'Test ticket' };
      mockQuery.mockResolvedValueOnce({ rows: [mockTicket] });

      await supportController.createTicket(
        mockRequest as Request,
        mockResponse as Response
      );

      const ticketNumber = mockQuery.mock.calls[0][1][0];
      expect(ticketNumber).toMatch(/^TICK-[A-Z0-9]{8}$/);
    });

    it('should use default values for priority and category', async () => {
      mockRequest.body = {
        subject: 'Test ticket'
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockTicket] });

      await supportController.createTicket(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining(['medium', 'other'])
      );
    });

    it('should handle database errors gracefully', async () => {
      mockRequest.body = {
        subject: 'Test ticket'
      };
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await supportController.createTicket(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to create support ticket'
      });
    });

    it('should handle message insertion failure gracefully', async () => {
      mockRequest.body = {
        subject: 'Test ticket',
        message: 'Test message',
        created_by: 'user-1'
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ ...mockTicket, id: 'ticket-1' }] })
        .mockRejectedValueOnce(new Error('Message insertion failed'));

      await supportController.createTicket(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to create support ticket'
      });
    });

    it('should set status as open for new tickets', async () => {
      mockRequest.body = {
        subject: 'Test ticket'
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockTicket] });

      await supportController.createTicket(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining(['open'])
      );
    });

    it('should handle created_by with message when both are provided', async () => {
      mockRequest.body = {
        subject: 'Test ticket',
        message: 'Test message',
        created_by: 'user-123'
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ ...mockTicket, id: 'ticket-1' }] })
        .mockResolvedValueOnce({ rows: [] });

      await supportController.createTicket(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO support_messages'),
        ['ticket-1', 'user-123', 'Test message', false]
      );
    });

    it('should handle message without created_by (null user)', async () => {
      mockRequest.body = {
        subject: 'Test ticket',
        message: 'Anonymous message'
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ ...mockTicket, id: 'ticket-1' }] })
        .mockResolvedValueOnce({ rows: [] });

      await supportController.createTicket(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO support_messages'),
        ['ticket-1', null, 'Anonymous message', false]
      );
    });
  });

  describe('addReply', () => {
    it('should add reply successfully', async () => {
      mockRequest.params = { id: 'ticket-1' };
      mockRequest.body = {
        message: 'This is a reply',
        is_internal: false
      };

      const mockReply = {
        id: 'reply-1',
        ticket_id: 'ticket-1',
        user_id: 'support-user-123',
        message: 'This is a reply',
        is_internal: false,
        created_at: '2024-01-15T12:00:00Z'
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 'ticket-1' }] })
        .mockResolvedValueOnce({ rows: [mockReply] })
        .mockResolvedValueOnce({ rows: [] });

      await supportController.addReply(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledTimes(3);
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        'SELECT id FROM support_tickets WHERE id = $1',
        ['ticket-1']
      );
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO ticket_replies'),
        ['ticket-1', 'support-user-123', 'This is a reply', false]
      );
      expect(mockQuery).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('UPDATE support_tickets'),
        ['ticket-1']
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockReply
      });
    });

    it('should add internal reply successfully', async () => {
      mockRequest.params = { id: 'ticket-1' };
      mockRequest.body = {
        message: 'Internal note',
        is_internal: true
      };

      const mockReply = {
        id: 'reply-1',
        ticket_id: 'ticket-1',
        user_id: 'support-user-123',
        message: 'Internal note',
        is_internal: true,
        created_at: '2024-01-15T12:00:00Z'
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 'ticket-1' }] })
        .mockResolvedValueOnce({ rows: [mockReply] })
        .mockResolvedValueOnce({ rows: [] });

      await supportController.addReply(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO ticket_replies'),
        ['ticket-1', 'support-user-123', 'Internal note', true]
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should default is_internal to false when not provided', async () => {
      mockRequest.params = { id: 'ticket-1' };
      mockRequest.body = {
        message: 'Reply without is_internal flag'
      };

      const mockReply = {
        id: 'reply-1',
        ticket_id: 'ticket-1',
        user_id: 'support-user-123',
        message: 'Reply without is_internal flag',
        is_internal: false,
        created_at: '2024-01-15T12:00:00Z'
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 'ticket-1' }] })
        .mockResolvedValueOnce({ rows: [mockReply] })
        .mockResolvedValueOnce({ rows: [] });

      await supportController.addReply(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO ticket_replies'),
        expect.arrayContaining([false])
      );
    });

    it('should return 400 when message is missing', async () => {
      mockRequest.params = { id: 'ticket-1' };
      mockRequest.body = {};

      await supportController.addReply(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Message is required'
      });
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should return 400 when message is empty string', async () => {
      mockRequest.params = { id: 'ticket-1' };
      mockRequest.body = { message: '' };

      await supportController.addReply(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Message is required'
      });
    });

    it('should return 404 when ticket not found', async () => {
      mockRequest.params = { id: 'non-existent-ticket' };
      mockRequest.body = { message: 'Reply to non-existent ticket' };
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await supportController.addReply(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Ticket not found'
      });
    });

    it('should update ticket timestamp after adding reply', async () => {
      mockRequest.params = { id: 'ticket-1' };
      mockRequest.body = { message: 'Test reply' };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 'ticket-1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'reply-1' }] })
        .mockResolvedValueOnce({ rows: [] });

      await supportController.addReply(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('SET updated_at = NOW()'),
        ['ticket-1']
      );
    });

    it('should reopen closed ticket when reply is added', async () => {
      mockRequest.params = { id: 'ticket-1' };
      mockRequest.body = { message: 'Reopening reply' };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 'ticket-1', status: 'closed' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'reply-1' }] })
        .mockResolvedValueOnce({ rows: [] });

      await supportController.addReply(
        mockRequest as Request,
        mockResponse as Response
      );

      const updateQuery = mockQuery.mock.calls[2][0];
      expect(updateQuery).toContain("CASE WHEN status = 'closed' THEN 'open'");
    });

    it('should handle database errors gracefully', async () => {
      mockRequest.params = { id: 'ticket-1' };
      mockRequest.body = { message: 'Test reply' };
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await supportController.addReply(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to add reply'
      });
    });

    it('should use authenticated user id for reply', async () => {
      mockRequest.params = { id: 'ticket-1' };
      mockRequest.body = { message: 'User reply' };
      mockRequest.user = { id: 'user-456', email: 'user@example.com', role: 'customer' };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 'ticket-1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'reply-1' }] })
        .mockResolvedValueOnce({ rows: [] });

      await supportController.addReply(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.anything(),
        expect.arrayContaining(['user-456'])
      );
    });
  });

  describe('updateTicketStatus', () => {
    const validStatuses = ['open', 'in_progress', 'closed', 'pending'];

    validStatuses.forEach((status) => {
      it(`should update ticket status to ${status} successfully`, async () => {
        mockRequest.params = { id: 'ticket-1' };
        mockRequest.body = { status };

        const mockTicket = {
          id: 'ticket-1',
          ticket_number: 'TICK-ABC123',
          status,
          updated_at: '2024-01-15T12:00:00Z'
        };

        mockQuery.mockResolvedValueOnce({ rows: [mockTicket] });

        await supportController.updateTicketStatus(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE support_tickets'),
          [status, 'ticket-1']
        );
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          data: mockTicket
        });
      });
    });

    it('should return 400 when status is missing', async () => {
      mockRequest.params = { id: 'ticket-1' };
      mockRequest.body = {};

      await supportController.updateTicketStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Valid status is required (open, in_progress, closed, pending)'
      });
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should return 400 when status is invalid', async () => {
      mockRequest.params = { id: 'ticket-1' };
      mockRequest.body = { status: 'invalid_status' };

      await supportController.updateTicketStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Valid status is required (open, in_progress, closed, pending)'
      });
    });

    it('should return 404 when ticket not found', async () => {
      mockRequest.params = { id: 'non-existent-ticket' };
      mockRequest.body = { status: 'open' };
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await supportController.updateTicketStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Ticket not found'
      });
    });

    it('should update ticket updated_at timestamp', async () => {
      mockRequest.params = { id: 'ticket-1' };
      mockRequest.body = { status: 'closed' };

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'ticket-1', status: 'closed' }]
      });

      await supportController.updateTicketStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      const updateQuery = mockQuery.mock.calls[0][0];
      expect(updateQuery).toContain('updated_at = NOW()');
    });

    it('should handle database errors gracefully', async () => {
      mockRequest.params = { id: 'ticket-1' };
      mockRequest.body = { status: 'closed' };
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await supportController.updateTicketStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to update ticket status'
      });
    });

    it('should reject empty status string', async () => {
      mockRequest.params = { id: 'ticket-1' };
      mockRequest.body = { status: '' };

      await supportController.updateTicketStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Valid status is required (open, in_progress, closed, pending)'
      });
    });

    it('should be case-sensitive for status values', async () => {
      mockRequest.params = { id: 'ticket-1' };
      mockRequest.body = { status: 'OPEN' };

      await supportController.updateTicketStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('updateTicketPriority', () => {
    const validPriorities = ['low', 'medium', 'high', 'urgent'];

    validPriorities.forEach((priority) => {
      it(`should update ticket priority to ${priority} successfully`, async () => {
        mockRequest.params = { id: 'ticket-1' };
        mockRequest.body = { priority };

        const mockTicket = {
          id: 'ticket-1',
          ticket_number: 'TICK-ABC123',
          priority,
          updated_at: '2024-01-15T12:00:00Z'
        };

        mockQuery.mockResolvedValueOnce({ rows: [mockTicket] });

        await supportController.updateTicketPriority(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE support_tickets'),
          [priority, 'ticket-1']
        );
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          data: mockTicket
        });
      });
    });

    it('should return 400 when priority is missing', async () => {
      mockRequest.params = { id: 'ticket-1' };
      mockRequest.body = {};

      await supportController.updateTicketPriority(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Valid priority is required (low, medium, high, urgent)'
      });
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should return 400 when priority is invalid', async () => {
      mockRequest.params = { id: 'ticket-1' };
      mockRequest.body = { priority: 'critical' };

      await supportController.updateTicketPriority(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Valid priority is required (low, medium, high, urgent)'
      });
    });

    it('should return 404 when ticket not found', async () => {
      mockRequest.params = { id: 'non-existent-ticket' };
      mockRequest.body = { priority: 'high' };
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await supportController.updateTicketPriority(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Ticket not found'
      });
    });

    it('should update ticket updated_at timestamp', async () => {
      mockRequest.params = { id: 'ticket-1' };
      mockRequest.body = { priority: 'urgent' };

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'ticket-1', priority: 'urgent' }]
      });

      await supportController.updateTicketPriority(
        mockRequest as Request,
        mockResponse as Response
      );

      const updateQuery = mockQuery.mock.calls[0][0];
      expect(updateQuery).toContain('updated_at = NOW()');
    });

    it('should handle database errors gracefully', async () => {
      mockRequest.params = { id: 'ticket-1' };
      mockRequest.body = { priority: 'high' };
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await supportController.updateTicketPriority(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to update ticket priority'
      });
    });

    it('should reject empty priority string', async () => {
      mockRequest.params = { id: 'ticket-1' };
      mockRequest.body = { priority: '' };

      await supportController.updateTicketPriority(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Valid priority is required (low, medium, high, urgent)'
      });
    });

    it('should be case-sensitive for priority values', async () => {
      mockRequest.params = { id: 'ticket-1' };
      mockRequest.body = { priority: 'HIGH' };

      await supportController.updateTicketPriority(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('createChatFromTicket', () => {
    const mockTicket = {
      id: 'ticket-1',
      ticket_number: 'TICK-ABC123',
      subject: 'Order issue',
      category: 'order',
      priority: 'high',
      restaurant_id: 'restaurant-1',
      restaurant_name: 'Test Restaurant',
      message: 'Initial ticket message'
    };

    const mockChatSession = {
      id: 'chat-session-1',
      subject: 'Order issue',
      category: 'order',
      priority: 'high',
      restaurant_id: 'restaurant-1',
      customer_id: 'support-user-123',
      status: 'waiting',
      created_at: '2024-01-15T12:00:00Z'
    };

    it('should create chat session from ticket successfully', async () => {
      mockRequest.params = { id: 'ticket-1' };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockTicket] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      mockChatService.createChatSession = jest.fn().mockResolvedValue(mockChatSession);

      await supportController.createChatFromTicket(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('FROM support_tickets t'),
        ['ticket-1']
      );
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('FROM chat_sessions WHERE ticket_id'),
        ['ticket-1']
      );
      expect(mockChatService.createChatSession).toHaveBeenCalledWith(
        {
          subject: mockTicket.subject,
          category: mockTicket.category,
          priority: mockTicket.priority,
          restaurant_id: mockTicket.restaurant_id,
          initial_message: mockTicket.message
        },
        'support-user-123'
      );
      expect(mockQuery).toHaveBeenNthCalledWith(
        3,
        'UPDATE chat_sessions SET ticket_id = $1 WHERE id = $2',
        ['ticket-1', 'chat-session-1']
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          session_id: 'chat-session-1',
          ticket_id: 'ticket-1'
        }
      });
    });

    it('should return 404 when ticket not found', async () => {
      mockRequest.params = { id: 'non-existent-ticket' };
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await supportController.createChatFromTicket(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Ticket not found'
      });
    });

    it('should return 400 when chat session already exists for ticket', async () => {
      mockRequest.params = { id: 'ticket-1' };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockTicket] })
        .mockResolvedValueOnce({ rows: [{ id: 'existing-session-1' }] });

      await supportController.createChatFromTicket(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Chat session already exists for this ticket',
        data: { session_id: 'existing-session-1' }
      });
      expect(mockChatService.createChatSession).not.toHaveBeenCalled();
    });

    it('should handle ticket without restaurant', async () => {
      mockRequest.params = { id: 'ticket-1' };

      const ticketWithoutRestaurant = {
        ...mockTicket,
        restaurant_id: null,
        restaurant_name: null
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [ticketWithoutRestaurant] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      mockChatService.createChatSession = jest.fn().mockResolvedValue(mockChatSession);

      await supportController.createChatFromTicket(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockChatService.createChatSession).toHaveBeenCalledWith(
        expect.objectContaining({
          restaurant_id: null
        }),
        'support-user-123'
      );
    });

    it('should use authenticated user id', async () => {
      mockRequest.params = { id: 'ticket-1' };
      mockRequest.user = { id: 'user-789', email: 'user@example.com', role: 'support' };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockTicket] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      mockChatService.createChatSession = jest.fn().mockResolvedValue(mockChatSession);

      await supportController.createChatFromTicket(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockChatService.createChatSession).toHaveBeenCalledWith(
        expect.anything(),
        'user-789'
      );
    });

    it('should handle database errors gracefully', async () => {
      mockRequest.params = { id: 'ticket-1' };
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await supportController.createChatFromTicket(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to create chat session from ticket'
      });
    });

    it('should handle chat service errors gracefully', async () => {
      mockRequest.params = { id: 'ticket-1' };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockTicket] })
        .mockResolvedValueOnce({ rows: [] });

      mockChatService.createChatSession = jest.fn().mockRejectedValue(
        new Error('Chat service error')
      );

      await supportController.createChatFromTicket(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to create chat session from ticket'
      });
    });

    it('should link chat session to ticket after creation', async () => {
      mockRequest.params = { id: 'ticket-1' };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockTicket] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      mockChatService.createChatSession = jest.fn().mockResolvedValue(mockChatSession);

      await supportController.createChatFromTicket(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE chat_sessions SET ticket_id = $1 WHERE id = $2',
        ['ticket-1', 'chat-session-1']
      );
    });

    it('should handle linking error gracefully', async () => {
      mockRequest.params = { id: 'ticket-1' };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockTicket] })
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('Update failed'));

      mockChatService.createChatSession = jest.fn().mockResolvedValue(mockChatSession);

      await supportController.createChatFromTicket(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to create chat session from ticket'
      });
    });

    it('should include restaurant name in ticket query', async () => {
      mockRequest.params = { id: 'ticket-1' };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockTicket] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      mockChatService.createChatSession = jest.fn().mockResolvedValue(mockChatSession);

      await supportController.createChatFromTicket(
        mockRequest as Request,
        mockResponse as Response
      );

      const ticketQuery = mockQuery.mock.calls[0][0];
      expect(ticketQuery).toContain('r.name as restaurant_name');
      expect(ticketQuery).toContain('LEFT JOIN restaurants r');
    });
  });

  describe('Edge cases and security', () => {
    it('should handle undefined user in request', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: 'ticket-1' };
      mockRequest.body = { message: 'Test message' };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 'ticket-1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'reply-1' }] })
        .mockResolvedValueOnce({ rows: [] });

      await supportController.addReply(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.anything(),
        expect.arrayContaining([undefined])
      );
    });

    it('should handle SQL injection attempts in ticket subject', async () => {
      mockRequest.body = {
        subject: "Test'; DROP TABLE support_tickets; --"
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'ticket-1',
          subject: "Test'; DROP TABLE support_tickets; --"
        }]
      });

      await supportController.createTicket(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO support_tickets'),
        expect.arrayContaining(["Test'; DROP TABLE support_tickets; --"])
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should handle very long subject strings', async () => {
      const longSubject = 'A'.repeat(1000);
      mockRequest.body = { subject: longSubject };

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'ticket-1', subject: longSubject }]
      });

      await supportController.createTicket(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should handle special characters in messages', async () => {
      mockRequest.params = { id: 'ticket-1' };
      mockRequest.body = {
        message: 'Test with special chars: <>&"\'\n\t'
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 'ticket-1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'reply-1' }] })
        .mockResolvedValueOnce({ rows: [] });

      await supportController.addReply(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should handle numeric ticket ids', async () => {
      mockRequest.params = { id: '12345' };

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await supportController.getTicketById(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.anything(),
        ['12345']
      );
    });

    it('should handle UUID ticket ids', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      mockRequest.params = { id: uuid };

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await supportController.getTicketById(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.anything(),
        [uuid]
      );
    });

    it('should handle null values in optional fields', async () => {
      mockRequest.body = {
        subject: 'Test',
        priority: null,
        category: null,
        order_id: null,
        created_by: null
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'ticket-1', subject: 'Test' }]
      });

      await supportController.createTicket(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should handle database connection timeout', async () => {
      mockRequest.body = { subject: 'Test' };
      mockQuery.mockRejectedValueOnce(new Error('Connection timeout'));

      await supportController.createTicket(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to create support ticket'
      });
    });

    it('should handle concurrent ticket creation', async () => {
      mockRequest.body = { subject: 'Test ticket 1' };
      const mockTicket1 = { id: 'ticket-1', ticket_number: 'TICK-ABC123' };

      mockQuery.mockResolvedValueOnce({ rows: [mockTicket1] });

      await supportController.createTicket(
        mockRequest as Request,
        mockResponse as Response
      );

      mockRequest.body = { subject: 'Test ticket 2' };
      const mockTicket2 = { id: 'ticket-2', ticket_number: 'TICK-XYZ789' };

      mockQuery.mockResolvedValueOnce({ rows: [mockTicket2] });

      await supportController.createTicket(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockQuery).toHaveBeenCalledTimes(2);
    });
  });
});
