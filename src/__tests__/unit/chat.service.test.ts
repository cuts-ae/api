import { Pool } from 'pg';
import { ChatService } from '../../services/chat.service';
import {
  ChatSession,
  ChatMessage,
  MessageAttachment,
  MessageReadReceipt,
  CreateChatSessionRequest,
  ChatSessionWithDetails,
  UserRole,
  MessageType,
} from '../../types/chat.types';

jest.mock('../../config/database', () => ({
  query: jest.fn(),
}));

describe('ChatService', () => {
  let chatService: ChatService;
  let mockPool: any;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    };

    chatService = new ChatService();
    (chatService as any).pool = mockPool;

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createChatSession', () => {
    const mockSessionData: CreateChatSessionRequest = {
      subject: 'Test Subject',
      category: 'general',
      priority: 'medium',
      restaurant_id: 'restaurant-123',
      initial_message: 'Hello, I need help',
    };

    const mockCreatedSession: ChatSession = {
      id: 'session-123',
      subject: 'Test Subject',
      category: 'general',
      priority: 'medium',
      restaurant_id: 'restaurant-123',
      customer_id: 'customer-123',
      status: 'waiting',
      created_at: new Date(),
      updated_at: new Date(),
    };

    const mockMessage: ChatMessage = {
      id: 'message-123',
      session_id: 'session-123',
      sender_id: 'customer-123',
      sender_role: 'customer',
      content: 'Hello, I need help',
      message_type: 'text',
      is_system_message: false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should create a chat session with all fields', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockCreatedSession] } as any)
        .mockResolvedValueOnce({ rows: [mockMessage] } as any);

      const result = await chatService.createChatSession(mockSessionData, 'customer-123');

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(mockPool.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('INSERT INTO chat_sessions'),
        ['Test Subject', 'general', 'medium', 'restaurant-123', 'customer-123']
      );
      expect(mockPool.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO chat_messages'),
        ['session-123', 'customer-123', 'customer', 'Hello, I need help', 'text', false]
      );
      expect(result).toEqual(mockCreatedSession);
    });

    it('should create a chat session with default category and priority', async () => {
      const minimalData: CreateChatSessionRequest = {
        subject: 'Minimal Subject',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ ...mockCreatedSession, category: 'general', priority: 'medium' }],
      } as any);

      const result = await chatService.createChatSession(minimalData, 'customer-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO chat_sessions'),
        ['Minimal Subject', 'general', 'medium', null, 'customer-123']
      );
      expect(result.category).toBe('general');
      expect(result.priority).toBe('medium');
    });

    it('should create a chat session without customer_id', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ ...mockCreatedSession, customer_id: null }],
        } as any)
        .mockResolvedValueOnce({ rows: [mockMessage] } as any);

      const result = await chatService.createChatSession(mockSessionData);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO chat_sessions'),
        ['Test Subject', 'general', 'medium', 'restaurant-123', null]
      );
      expect(result.customer_id).toBeNull();
    });

    it('should create a chat session without initial message', async () => {
      const dataWithoutMessage = {
        subject: 'No Message',
        category: 'technical',
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockCreatedSession] } as any);

      const result = await chatService.createChatSession(dataWithoutMessage, 'customer-123');

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockCreatedSession);
    });

    it('should handle database errors during session creation', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        chatService.createChatSession(mockSessionData, 'customer-123')
      ).rejects.toThrow('Database error');
    });

    it('should handle errors during initial message creation', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockCreatedSession] } as any)
        .mockRejectedValueOnce(new Error('Message creation failed'));

      await expect(
        chatService.createChatSession(mockSessionData, 'customer-123')
      ).rejects.toThrow('Message creation failed');
    });
  });

  describe('getChatSession', () => {
    const mockSessionWithDetails: ChatSessionWithDetails = {
      id: 'session-123',
      subject: 'Test Subject',
      category: 'general',
      priority: 'medium',
      status: 'waiting',
      unread_count: 5,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const mockLastMessage: ChatMessage = {
      id: 'message-123',
      session_id: 'session-123',
      sender_role: 'customer',
      content: 'Last message',
      message_type: 'text',
      is_system_message: false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should get a chat session with details and last message', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockSessionWithDetails] } as any)
        .mockResolvedValueOnce({ rows: [mockLastMessage] } as any);

      const result = await chatService.getChatSession('session-123');

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(mockPool.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('SELECT cs.*'),
        ['session-123']
      );
      expect(mockPool.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('SELECT * FROM chat_messages'),
        ['session-123']
      );
      expect(result).toEqual({
        ...mockSessionWithDetails,
        last_message: mockLastMessage,
      });
    });

    it('should get a chat session without last message', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockSessionWithDetails] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const result = await chatService.getChatSession('session-123');

      expect(result).toEqual({
        ...mockSessionWithDetails,
        last_message: null,
      });
    });

    it('should return null when session not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await chatService.getChatSession('non-existent-session');

      expect(result).toBeNull();
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(chatService.getChatSession('session-123')).rejects.toThrow('Database error');
    });

    it('should calculate unread count correctly', async () => {
      const sessionWithUnread = { ...mockSessionWithDetails, unread_count: 3 };
      mockPool.query
        .mockResolvedValueOnce({ rows: [sessionWithUnread] } as any)
        .mockResolvedValueOnce({ rows: [mockLastMessage] } as any);

      const result = await chatService.getChatSession('session-123');

      expect(result?.unread_count).toBe(3);
    });
  });

  describe('getSessionMessages', () => {
    const mockMessages: ChatMessage[] = [
      {
        id: 'message-1',
        session_id: 'session-123',
        sender_role: 'customer',
        content: 'Message 1',
        message_type: 'text',
        is_system_message: false,
        attachments: [],
        read_by: [],
        created_at: new Date('2024-01-01T10:00:00Z'),
        updated_at: new Date('2024-01-01T10:00:00Z'),
      },
      {
        id: 'message-2',
        session_id: 'session-123',
        sender_role: 'support',
        content: 'Message 2',
        message_type: 'text',
        is_system_message: false,
        attachments: [
          {
            id: 'attachment-1',
            message_id: 'message-2',
            file_name: 'test.pdf',
            file_type: 'application/pdf',
            file_size: 1024,
            file_url: 'https://example.com/test.pdf',
            created_at: new Date(),
          },
        ],
        read_by: [
          {
            id: 'receipt-1',
            message_id: 'message-2',
            user_id: 'user-123',
            read_at: new Date(),
          },
        ],
        created_at: new Date('2024-01-01T11:00:00Z'),
        updated_at: new Date('2024-01-01T11:00:00Z'),
      },
    ];

    it('should get session messages with default limit and offset', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: mockMessages } as any);

      const result = await chatService.getSessionMessages('session-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM chat_messages cm'),
        ['session-123', 50, 0]
      );
      expect(result).toEqual(mockMessages);
      expect(result).toHaveLength(2);
    });

    it('should get session messages with custom limit and offset', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockMessages[0]] } as any);

      const result = await chatService.getSessionMessages('session-123', 10, 5);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM chat_messages cm'),
        ['session-123', 10, 5]
      );
      expect(result).toHaveLength(1);
    });

    it('should include attachments in messages', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockMessages[1]] } as any);

      const result = await chatService.getSessionMessages('session-123');

      expect(result[0].attachments).toBeDefined();
      expect(result[0].attachments).toHaveLength(1);
      expect(result[0].attachments![0].file_name).toBe('test.pdf');
    });

    it('should include read receipts in messages', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockMessages[1]] } as any);

      const result = await chatService.getSessionMessages('session-123');

      expect(result[0].read_by).toBeDefined();
      expect(result[0].read_by).toHaveLength(1);
      expect(result[0].read_by![0].user_id).toBe('user-123');
    });

    it('should return empty array when no messages exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await chatService.getSessionMessages('session-123');

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(chatService.getSessionMessages('session-123')).rejects.toThrow(
        'Database error'
      );
    });

    it('should order messages by created_at DESC', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: mockMessages } as any);

      await chatService.getSessionMessages('session-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY cm.created_at DESC'),
        expect.any(Array)
      );
    });
  });

  describe('sendMessage', () => {
    const mockMessage: ChatMessage = {
      id: 'message-123',
      session_id: 'session-123',
      sender_id: 'user-123',
      sender_role: 'customer',
      content: 'Test message',
      message_type: 'text',
      is_system_message: false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should send a text message', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockMessage] } as any);

      const result = await chatService.sendMessage(
        'session-123',
        'user-123',
        'customer',
        'Test message'
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO chat_messages'),
        ['session-123', 'user-123', 'customer', 'Test message', 'text', false]
      );
      expect(result).toEqual(mockMessage);
    });

    it('should send a message with custom message type', async () => {
      const imageMessage = { ...mockMessage, message_type: 'image' as MessageType };
      mockPool.query.mockResolvedValueOnce({ rows: [imageMessage] } as any);

      const result = await chatService.sendMessage(
        'session-123',
        'user-123',
        'customer',
        null,
        'image'
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO chat_messages'),
        ['session-123', 'user-123', 'customer', null, 'image', false]
      );
      expect(result.message_type).toBe('image');
    });

    it('should send a system message', async () => {
      const systemMessage = { ...mockMessage, is_system_message: true, message_type: 'system' as MessageType };
      mockPool.query.mockResolvedValueOnce({ rows: [systemMessage] } as any);

      const result = await chatService.sendMessage(
        'session-123',
        null,
        'support',
        'System notification',
        'system',
        true
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO chat_messages'),
        ['session-123', null, 'support', 'System notification', 'system', true]
      );
      expect(result.is_system_message).toBe(true);
    });

    it('should send a message with null sender_id', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ ...mockMessage, sender_id: null }] } as any);

      const result = await chatService.sendMessage(
        'session-123',
        null,
        'support',
        'Test message'
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO chat_messages'),
        ['session-123', null, 'support', 'Test message', 'text', false]
      );
      expect(result.sender_id).toBeNull();
    });

    it('should send a message with null content', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ ...mockMessage, content: null }] } as any);

      const result = await chatService.sendMessage(
        'session-123',
        'user-123',
        'customer',
        null
      );

      expect(result.content).toBeNull();
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        chatService.sendMessage('session-123', 'user-123', 'customer', 'Test message')
      ).rejects.toThrow('Database error');
    });

    it('should send messages with different sender roles', async () => {
      const roles: UserRole[] = ['customer', 'restaurant_owner', 'driver', 'admin', 'support'];

      for (const role of roles) {
        mockPool.query.mockResolvedValueOnce({
          rows: [{ ...mockMessage, sender_role: role }],
        } as any);

        const result = await chatService.sendMessage('session-123', 'user-123', role, 'Test');

        expect(result.sender_role).toBe(role);
      }
    });
  });

  describe('addAttachment', () => {
    const mockAttachment: MessageAttachment = {
      id: 'attachment-123',
      message_id: 'message-123',
      file_name: 'test.pdf',
      file_type: 'application/pdf',
      file_size: 1024,
      file_url: 'https://example.com/test.pdf',
      thumbnail_url: 'https://example.com/thumb.jpg',
      created_at: new Date(),
    };

    it('should add an attachment with thumbnail', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockAttachment] } as any);

      const result = await chatService.addAttachment(
        'message-123',
        'test.pdf',
        'application/pdf',
        1024,
        'https://example.com/test.pdf',
        'https://example.com/thumb.jpg'
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO message_attachments'),
        [
          'message-123',
          'test.pdf',
          'application/pdf',
          1024,
          'https://example.com/test.pdf',
          'https://example.com/thumb.jpg',
        ]
      );
      expect(result).toEqual(mockAttachment);
    });

    it('should add an attachment without thumbnail', async () => {
      const attachmentWithoutThumb = { ...mockAttachment, thumbnail_url: undefined };
      mockPool.query.mockResolvedValueOnce({ rows: [attachmentWithoutThumb] } as any);

      const result = await chatService.addAttachment(
        'message-123',
        'test.pdf',
        'application/pdf',
        1024,
        'https://example.com/test.pdf'
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO message_attachments'),
        ['message-123', 'test.pdf', 'application/pdf', 1024, 'https://example.com/test.pdf', undefined]
      );
      expect(result.thumbnail_url).toBeUndefined();
    });

    it('should handle different file types', async () => {
      const fileTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'];

      for (const fileType of fileTypes) {
        mockPool.query.mockResolvedValueOnce({
          rows: [{ ...mockAttachment, file_type: fileType }],
        } as any);

        const result = await chatService.addAttachment(
          'message-123',
          'test-file',
          fileType,
          1024,
          'https://example.com/file'
        );

        expect(result.file_type).toBe(fileType);
      }
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        chatService.addAttachment(
          'message-123',
          'test.pdf',
          'application/pdf',
          1024,
          'https://example.com/test.pdf'
        )
      ).rejects.toThrow('Database error');
    });
  });

  describe('markMessageAsRead', () => {
    const mockReceipt: MessageReadReceipt = {
      id: 'receipt-123',
      message_id: 'message-123',
      user_id: 'user-123',
      read_at: new Date(),
    };

    it('should mark a message as read', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockReceipt] } as any);

      const result = await chatService.markMessageAsRead('message-123', 'user-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO message_read_receipts'),
        ['message-123', 'user-123']
      );
      expect(result).toEqual(mockReceipt);
    });

    it('should update existing read receipt on conflict', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockReceipt] } as any);

      const result = await chatService.markMessageAsRead('message-123', 'user-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (message_id, user_id) DO UPDATE'),
        ['message-123', 'user-123']
      );
      expect(result).toEqual(mockReceipt);
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        chatService.markMessageAsRead('message-123', 'user-123')
      ).rejects.toThrow('Database error');
    });
  });

  describe('markSessionMessagesAsRead', () => {
    it('should mark all session messages as read for a user', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await chatService.markSessionMessagesAsRead('session-123', 'user-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO message_read_receipts'),
        ['session-123', 'user-123']
      );
    });

    it('should exclude messages sent by the user', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await chatService.markSessionMessagesAsRead('session-123', 'user-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE session_id = $1 AND sender_id != $2'),
        ['session-123', 'user-123']
      );
    });

    it('should update existing receipts on conflict', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await chatService.markSessionMessagesAsRead('session-123', 'user-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (message_id, user_id) DO UPDATE'),
        ['session-123', 'user-123']
      );
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        chatService.markSessionMessagesAsRead('session-123', 'user-123')
      ).rejects.toThrow('Database error');
    });

    it('should not return any value', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await chatService.markSessionMessagesAsRead('session-123', 'user-123');

      expect(result).toBeUndefined();
    });
  });

  describe('assignAgent', () => {
    const mockSession: ChatSession = {
      id: 'session-123',
      subject: 'Test Subject',
      category: 'general',
      priority: 'medium',
      status: 'active',
      agent_id: 'agent-123',
      agent_accepted_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };

    const mockSystemMessage: ChatMessage = {
      id: 'message-123',
      session_id: 'session-123',
      sender_role: 'support',
      content: 'Support agent has joined the conversation',
      message_type: 'system',
      is_system_message: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should assign an agent to a session', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockSession] } as any)
        .mockResolvedValueOnce({ rows: [mockSystemMessage] } as any);

      const result = await chatService.assignAgent('session-123', 'agent-123');

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(mockPool.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('UPDATE chat_sessions'),
        ['agent-123', 'session-123']
      );
      expect(result).toEqual(mockSession);
      expect(result.status).toBe('active');
      expect(result.agent_id).toBe('agent-123');
    });

    it('should update session status to active', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockSession] } as any)
        .mockResolvedValueOnce({ rows: [mockSystemMessage] } as any);

      const result = await chatService.assignAgent('session-123', 'agent-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'active'"),
        ['agent-123', 'session-123']
      );
      expect(result.status).toBe('active');
    });

    it('should send a system message about agent joining', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockSession] } as any)
        .mockResolvedValueOnce({ rows: [mockSystemMessage] } as any);

      await chatService.assignAgent('session-123', 'agent-123');

      expect(mockPool.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO chat_messages'),
        ['session-123', null, 'support', 'Support agent has joined the conversation', 'system', true]
      );
    });

    it('should set agent_accepted_at timestamp', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockSession] } as any)
        .mockResolvedValueOnce({ rows: [mockSystemMessage] } as any);

      await chatService.assignAgent('session-123', 'agent-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('agent_accepted_at = NOW()'),
        ['agent-123', 'session-123']
      );
    });

    it('should handle database errors during update', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(chatService.assignAgent('session-123', 'agent-123')).rejects.toThrow(
        'Database error'
      );
    });

    it('should handle errors during system message creation', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockSession] } as any)
        .mockRejectedValueOnce(new Error('Message creation failed'));

      await expect(chatService.assignAgent('session-123', 'agent-123')).rejects.toThrow(
        'Message creation failed'
      );
    });
  });

  describe('updateSessionStatus', () => {
    const mockSession: ChatSession = {
      id: 'session-123',
      subject: 'Test Subject',
      category: 'general',
      priority: 'medium',
      status: 'closed',
      closed_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };

    const mockSystemMessage: ChatMessage = {
      id: 'message-123',
      session_id: 'session-123',
      sender_role: 'support',
      content: 'Chat session has been closed',
      message_type: 'system',
      is_system_message: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should update session status to closed and send system message', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockSession] } as any)
        .mockResolvedValueOnce({ rows: [mockSystemMessage] } as any);

      const result = await chatService.updateSessionStatus('session-123', 'closed');

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(mockPool.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('UPDATE chat_sessions'),
        ['closed', 'session-123']
      );
      expect(mockPool.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO chat_messages'),
        ['session-123', null, 'support', 'Chat session has been closed', 'system', true]
      );
      expect(result.status).toBe('closed');
    });

    it('should set closed_at timestamp when status is closed', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockSession] } as any);
      mockPool.query.mockResolvedValueOnce({ rows: [mockSystemMessage] } as any);

      await chatService.updateSessionStatus('session-123', 'closed');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('closed_at = NOW()'),
        ['closed', 'session-123']
      );
    });

    it('should not set closed_at when status is not closed', async () => {
      const activeSession = { ...mockSession, status: 'active', closed_at: undefined };
      mockPool.query.mockResolvedValueOnce({ rows: [activeSession] } as any);

      const result = await chatService.updateSessionStatus('session-123', 'active');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('closed_at = closed_at'),
        ['active', 'session-123']
      );
      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('active');
    });

    it('should not send system message when status is not closed', async () => {
      const activeSession = { ...mockSession, status: 'active' };
      mockPool.query.mockResolvedValueOnce({ rows: [activeSession] } as any);

      await chatService.updateSessionStatus('session-123', 'active');

      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should update to waiting status', async () => {
      const waitingSession = { ...mockSession, status: 'waiting' };
      mockPool.query.mockResolvedValueOnce({ rows: [waitingSession] } as any);

      const result = await chatService.updateSessionStatus('session-123', 'waiting');

      expect(result.status).toBe('waiting');
    });

    it('should update to resolved status', async () => {
      const resolvedSession = { ...mockSession, status: 'resolved' };
      mockPool.query.mockResolvedValueOnce({ rows: [resolvedSession] } as any);

      const result = await chatService.updateSessionStatus('session-123', 'resolved');

      expect(result.status).toBe('resolved');
    });

    it('should handle database errors during update', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(chatService.updateSessionStatus('session-123', 'closed')).rejects.toThrow(
        'Database error'
      );
    });

    it('should handle errors during system message creation', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockSession] } as any)
        .mockRejectedValueOnce(new Error('Message creation failed'));

      await expect(chatService.updateSessionStatus('session-123', 'closed')).rejects.toThrow(
        'Message creation failed'
      );
    });

    it('should handle agentId parameter (optional)', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockSession] } as any);
      mockPool.query.mockResolvedValueOnce({ rows: [mockSystemMessage] } as any);

      const result = await chatService.updateSessionStatus('session-123', 'closed', 'agent-123');

      expect(result).toEqual(mockSession);
    });
  });

  describe('getActiveSessions', () => {
    const mockActiveSessions: ChatSessionWithDetails[] = [
      {
        id: 'session-1',
        subject: 'Session 1',
        category: 'general',
        priority: 'high',
        status: 'active',
        agent_id: 'agent-123',
        unread_count: 2,
        created_at: new Date('2024-01-01T10:00:00Z'),
        updated_at: new Date('2024-01-01T10:00:00Z'),
      },
      {
        id: 'session-2',
        subject: 'Session 2',
        category: 'technical',
        priority: 'medium',
        status: 'waiting',
        unread_count: 5,
        created_at: new Date('2024-01-01T11:00:00Z'),
        updated_at: new Date('2024-01-01T11:00:00Z'),
      },
    ];

    it('should get all active sessions without agent filter', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: mockActiveSessions } as any);

      const result = await chatService.getActiveSessions();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE cs.status IN ('waiting', 'active')"),
        []
      );
      expect(result).toEqual(mockActiveSessions);
      expect(result).toHaveLength(2);
    });

    it('should get active sessions for a specific agent', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockActiveSessions[0]] } as any);

      const result = await chatService.getActiveSessions('agent-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("AND (cs.agent_id = $1 OR cs.status = 'waiting')"),
        ['agent-123']
      );
      expect(result).toHaveLength(1);
    });

    it('should include unread count in results', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: mockActiveSessions } as any);

      const result = await chatService.getActiveSessions();

      expect(result[0].unread_count).toBe(2);
      expect(result[1].unread_count).toBe(5);
    });

    it('should include customer_name and restaurant_name from joins', async () => {
      const sessionsWithNames = mockActiveSessions.map((session) => ({
        ...session,
        customer_name: 'John Doe',
        restaurant_name: 'Test Restaurant',
      }));
      mockPool.query.mockResolvedValueOnce({ rows: sessionsWithNames } as any);

      const result = await chatService.getActiveSessions();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN users u ON cs.customer_id = u.id'),
        []
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN restaurants r ON cs.restaurant_id = r.id'),
        []
      );
    });

    it('should order results by created_at DESC', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: mockActiveSessions } as any);

      await chatService.getActiveSessions();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY cs.created_at DESC'),
        []
      );
    });

    it('should return empty array when no active sessions exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await chatService.getActiveSessions();

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(chatService.getActiveSessions()).rejects.toThrow('Database error');
    });

    it('should filter for both waiting and active statuses', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: mockActiveSessions } as any);

      await chatService.getActiveSessions();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE cs.status IN ('waiting', 'active')"),
        []
      );
    });
  });

  describe('getSessionsByCustomer', () => {
    const mockCustomerSessions: ChatSessionWithDetails[] = [
      {
        id: 'session-1',
        subject: 'Session 1',
        category: 'general',
        priority: 'high',
        status: 'active',
        customer_id: 'customer-123',
        unread_count: 3,
        last_message_at: new Date('2024-01-02T10:00:00Z'),
        created_at: new Date('2024-01-01T10:00:00Z'),
        updated_at: new Date('2024-01-02T10:00:00Z'),
      },
      {
        id: 'session-2',
        subject: 'Session 2',
        category: 'technical',
        priority: 'medium',
        status: 'closed',
        customer_id: 'customer-123',
        unread_count: 0,
        created_at: new Date('2024-01-01T09:00:00Z'),
        updated_at: new Date('2024-01-01T09:00:00Z'),
      },
    ];

    it('should get all sessions for a customer', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: mockCustomerSessions } as any);

      const result = await chatService.getSessionsByCustomer('customer-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE cs.customer_id = $1'),
        ['customer-123']
      );
      expect(result).toEqual(mockCustomerSessions);
      expect(result).toHaveLength(2);
    });

    it('should include unread count for each session', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: mockCustomerSessions } as any);

      const result = await chatService.getSessionsByCustomer('customer-123');

      expect(result[0].unread_count).toBe(3);
      expect(result[1].unread_count).toBe(0);
    });

    it('should exclude messages sent by the customer from unread count', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: mockCustomerSessions } as any);

      await chatService.getSessionsByCustomer('customer-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND cm.sender_id != $1'),
        ['customer-123']
      );
    });

    it('should order by last_message_at DESC with NULLS LAST', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: mockCustomerSessions } as any);

      await chatService.getSessionsByCustomer('customer-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY cs.last_message_at DESC NULLS LAST, cs.created_at DESC'),
        ['customer-123']
      );
    });

    it('should return empty array when customer has no sessions', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await chatService.getSessionsByCustomer('customer-123');

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(chatService.getSessionsByCustomer('customer-123')).rejects.toThrow(
        'Database error'
      );
    });

    it('should handle sessions with null last_message_at', async () => {
      const sessionsWithNullLastMessage = [
        { ...mockCustomerSessions[0], last_message_at: null },
        mockCustomerSessions[1],
      ];
      mockPool.query.mockResolvedValueOnce({ rows: sessionsWithNullLastMessage } as any);

      const result = await chatService.getSessionsByCustomer('customer-123');

      expect(result[0].last_message_at).toBeNull();
    });
  });

  describe('setTypingIndicator', () => {
    it('should set a typing indicator', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await chatService.setTypingIndicator('session-123', 'user-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO typing_indicators'),
        ['session-123', 'user-123']
      );
    });

    it('should set expiration to 10 seconds', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await chatService.setTypingIndicator('session-123', 'user-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("NOW() + INTERVAL '10 seconds'"),
        ['session-123', 'user-123']
      );
    });

    it('should update existing indicator on conflict', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await chatService.setTypingIndicator('session-123', 'user-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (session_id, user_id)'),
        ['session-123', 'user-123']
      );
    });

    it('should update started_at and expires_at on conflict', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await chatService.setTypingIndicator('session-123', 'user-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DO UPDATE SET started_at = NOW(), expires_at = NOW()'),
        ['session-123', 'user-123']
      );
    });

    it('should not return any value', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await chatService.setTypingIndicator('session-123', 'user-123');

      expect(result).toBeUndefined();
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        chatService.setTypingIndicator('session-123', 'user-123')
      ).rejects.toThrow('Database error');
    });
  });

  describe('removeTypingIndicator', () => {
    it('should remove a typing indicator', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await chatService.removeTypingIndicator('session-123', 'user-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM typing_indicators'),
        ['session-123', 'user-123']
      );
    });

    it('should filter by session_id and user_id', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await chatService.removeTypingIndicator('session-123', 'user-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE session_id = $1 AND user_id = $2'),
        ['session-123', 'user-123']
      );
    });

    it('should not return any value', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await chatService.removeTypingIndicator('session-123', 'user-123');

      expect(result).toBeUndefined();
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        chatService.removeTypingIndicator('session-123', 'user-123')
      ).rejects.toThrow('Database error');
    });

    it('should handle non-existent indicator gracefully', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(
        chatService.removeTypingIndicator('session-123', 'user-123')
      ).resolves.not.toThrow();
    });
  });

  describe('getTypingUsers', () => {
    it('should get typing users for a session', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ user_id: 'user-1' }, { user_id: 'user-2' }],
      } as any);

      const result = await chatService.getTypingUsers('session-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT user_id FROM typing_indicators'),
        ['session-123']
      );
      expect(result).toEqual(['user-1', 'user-2']);
    });

    it('should only return non-expired indicators', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ user_id: 'user-1' }],
      } as any);

      await chatService.getTypingUsers('session-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE session_id = $1 AND expires_at > NOW()'),
        ['session-123']
      );
    });

    it('should return empty array when no users are typing', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await chatService.getTypingUsers('session-123');

      expect(result).toEqual([]);
    });

    it('should return array of user IDs', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ user_id: 'user-1' }, { user_id: 'user-2' }, { user_id: 'user-3' }],
      } as any);

      const result = await chatService.getTypingUsers('session-123');

      expect(result).toHaveLength(3);
      expect(result).toContain('user-1');
      expect(result).toContain('user-2');
      expect(result).toContain('user-3');
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(chatService.getTypingUsers('session-123')).rejects.toThrow('Database error');
    });
  });

  describe('cleanupExpiredTypingIndicators', () => {
    it('should delete expired typing indicators', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await chatService.cleanupExpiredTypingIndicators();

      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM typing_indicators WHERE expires_at < NOW()'
      );
    });

    it('should not return any value', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await chatService.cleanupExpiredTypingIndicators();

      expect(result).toBeUndefined();
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(chatService.cleanupExpiredTypingIndicators()).rejects.toThrow('Database error');
    });

    it('should work when no expired indicators exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(chatService.cleanupExpiredTypingIndicators()).resolves.not.toThrow();
    });
  });

  describe('ChatService constructor', () => {
    it('should initialize with pool from config', () => {
      const service = new ChatService();
      expect(service).toBeDefined();
      expect((service as any).pool).toBeDefined();
    });
  });

  describe('Edge cases and additional coverage', () => {
    it('should handle empty session responses correctly', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await chatService.getChatSession('non-existent-id');

      expect(result).toBeNull();
    });

    it('should handle various message types', async () => {
      const messageTypes: MessageType[] = ['text', 'image', 'file', 'system'];

      for (const type of messageTypes) {
        const mockMessage = {
          id: `message-${type}`,
          session_id: 'session-123',
          sender_role: 'customer',
          message_type: type,
          is_system_message: false,
          created_at: new Date(),
          updated_at: new Date(),
        };

        mockPool.query.mockResolvedValueOnce({ rows: [mockMessage] } as any);

        const result = await chatService.sendMessage(
          'session-123',
          'user-123',
          'customer',
          'Test',
          type
        );

        expect(result.message_type).toBe(type);
      }
    });

    it('should handle large file sizes in attachments', async () => {
      const largeFileSize = 104857600; // 100MB
      const attachment: MessageAttachment = {
        id: 'attachment-large',
        message_id: 'message-123',
        file_name: 'large-file.zip',
        file_type: 'application/zip',
        file_size: largeFileSize,
        file_url: 'https://example.com/large-file.zip',
        created_at: new Date(),
      };

      mockPool.query.mockResolvedValueOnce({ rows: [attachment] } as any);

      const result = await chatService.addAttachment(
        'message-123',
        'large-file.zip',
        'application/zip',
        largeFileSize,
        'https://example.com/large-file.zip'
      );

      expect(result.file_size).toBe(largeFileSize);
    });

    it('should handle sessions with various priorities', async () => {
      const priorities = ['low', 'medium', 'high', 'urgent'];

      for (const priority of priorities) {
        const sessionData: CreateChatSessionRequest = {
          subject: 'Test',
          priority,
        };

        const session: ChatSession = {
          id: `session-${priority}`,
          subject: 'Test',
          category: 'general',
          priority,
          status: 'waiting',
          created_at: new Date(),
          updated_at: new Date(),
        };

        mockPool.query.mockResolvedValueOnce({ rows: [session] } as any);

        const result = await chatService.createChatSession(sessionData);

        expect(result.priority).toBe(priority);
      }
    });

    it('should handle sessions with various categories', async () => {
      const categories = ['general', 'technical', 'billing', 'complaint'];

      for (const category of categories) {
        const sessionData: CreateChatSessionRequest = {
          subject: 'Test',
          category,
        };

        const session: ChatSession = {
          id: `session-${category}`,
          subject: 'Test',
          category,
          priority: 'medium',
          status: 'waiting',
          created_at: new Date(),
          updated_at: new Date(),
        };

        mockPool.query.mockResolvedValueOnce({ rows: [session] } as any);

        const result = await chatService.createChatSession(sessionData);

        expect(result.category).toBe(category);
      }
    });
  });
});
