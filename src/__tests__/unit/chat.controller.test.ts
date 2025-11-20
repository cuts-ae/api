import { Request, Response } from 'express';
import * as chatController from '../../controllers/chat.controller';
import chatService from '../../services/chat.service';
import {
  ChatSession,
  ChatMessage,
  ChatSessionWithDetails,
  CreateChatSessionRequest,
} from '../../types/chat.types';

jest.mock('../../services/chat.service');

describe('ChatController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: undefined,
      files: undefined,
    } as any;

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('createChatSession', () => {
    const mockUserId = 'user-123';
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
      customer_id: mockUserId,
      status: 'waiting',
      created_at: new Date(),
      updated_at: new Date(),
    };

    beforeEach(() => {
      (mockRequest as any).user = { userId: mockUserId };
      mockRequest.body = mockSessionData;
    });

    it('should create a chat session successfully with all fields', async () => {
      (chatService.createChatSession as jest.Mock).mockResolvedValue(mockCreatedSession);

      await chatController.createChatSession(mockRequest as Request, mockResponse as Response);

      expect(consoleLogSpy).toHaveBeenCalledWith('=== API RECEIVED CREATE CHAT SESSION REQUEST ===');
      expect(consoleLogSpy).toHaveBeenCalledWith('Request body:', JSON.stringify(mockRequest.body, null, 2));
      expect(consoleLogSpy).toHaveBeenCalledWith('restaurant_id received:', mockSessionData.restaurant_id);
      expect(consoleLogSpy).toHaveBeenCalledWith('restaurant_id type:', 'string');

      expect(chatService.createChatSession).toHaveBeenCalledWith(mockSessionData, mockUserId);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockCreatedSession,
      });
    });

    it('should create a chat session without optional fields', async () => {
      const minimalData: CreateChatSessionRequest = {
        subject: 'Minimal Subject',
      };
      mockRequest.body = minimalData;

      const minimalSession: ChatSession = {
        id: 'session-456',
        subject: 'Minimal Subject',
        category: 'general',
        priority: 'medium',
        status: 'waiting',
        created_at: new Date(),
        updated_at: new Date(),
      };

      (chatService.createChatSession as jest.Mock).mockResolvedValue(minimalSession);

      await chatController.createChatSession(mockRequest as Request, mockResponse as Response);

      expect(chatService.createChatSession).toHaveBeenCalledWith(minimalData, mockUserId);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: minimalSession,
      });
    });

    it('should return 400 if subject is missing', async () => {
      mockRequest.body = { category: 'general' };

      await chatController.createChatSession(mockRequest as Request, mockResponse as Response);

      expect(chatService.createChatSession).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Subject is required',
      });
    });

    it('should return 400 if subject is empty string', async () => {
      mockRequest.body = { subject: '' };

      await chatController.createChatSession(mockRequest as Request, mockResponse as Response);

      expect(chatService.createChatSession).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Subject is required',
      });
    });

    it('should handle service errors gracefully', async () => {
      const error = new Error('Database connection failed');
      (chatService.createChatSession as jest.Mock).mockRejectedValue(error);

      await chatController.createChatSession(mockRequest as Request, mockResponse as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error creating chat session:', error);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to create chat session',
      });
    });

    it('should work without user context', async () => {
      (mockRequest as any).user = undefined;

      (chatService.createChatSession as jest.Mock).mockResolvedValue(mockCreatedSession);

      await chatController.createChatSession(mockRequest as Request, mockResponse as Response);

      expect(chatService.createChatSession).toHaveBeenCalledWith(mockSessionData, undefined);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should log restaurant_id as different types', async () => {
      mockRequest.body = { ...mockSessionData, restaurant_id: 123 };

      (chatService.createChatSession as jest.Mock).mockResolvedValue(mockCreatedSession);

      await chatController.createChatSession(mockRequest as Request, mockResponse as Response);

      expect(consoleLogSpy).toHaveBeenCalledWith('restaurant_id received:', 123);
      expect(consoleLogSpy).toHaveBeenCalledWith('restaurant_id type:', 'number');
    });
  });

  describe('getChatSession', () => {
    const mockSessionId = 'session-123';
    const mockSession: ChatSessionWithDetails = {
      id: mockSessionId,
      subject: 'Test Session',
      category: 'general',
      priority: 'medium',
      status: 'active',
      unread_count: 5,
      created_at: new Date(),
      updated_at: new Date(),
    };

    beforeEach(() => {
      mockRequest.params = { sessionId: mockSessionId };
    });

    it('should retrieve a chat session successfully', async () => {
      (chatService.getChatSession as jest.Mock).mockResolvedValue(mockSession);

      await chatController.getChatSession(mockRequest as Request, mockResponse as Response);

      expect(chatService.getChatSession).toHaveBeenCalledWith(mockSessionId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSession,
      });
    });

    it('should return 404 if session not found', async () => {
      (chatService.getChatSession as jest.Mock).mockResolvedValue(null);

      await chatController.getChatSession(mockRequest as Request, mockResponse as Response);

      expect(chatService.getChatSession).toHaveBeenCalledWith(mockSessionId);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Session not found',
      });
    });

    it('should handle service errors gracefully', async () => {
      const error = new Error('Database error');
      (chatService.getChatSession as jest.Mock).mockRejectedValue(error);

      await chatController.getChatSession(mockRequest as Request, mockResponse as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error getting chat session:', error);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get chat session',
      });
    });
  });

  describe('getSessionMessages', () => {
    const mockSessionId = 'session-123';
    const mockMessages: ChatMessage[] = [
      {
        id: 'msg-1',
        session_id: mockSessionId,
        sender_id: 'user-1',
        sender_role: 'customer',
        content: 'Hello',
        message_type: 'text',
        is_system_message: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'msg-2',
        session_id: mockSessionId,
        sender_id: 'user-2',
        sender_role: 'support',
        content: 'Hi, how can I help?',
        message_type: 'text',
        is_system_message: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    beforeEach(() => {
      mockRequest.params = { sessionId: mockSessionId };
    });

    it('should retrieve messages with default pagination', async () => {
      (chatService.getSessionMessages as jest.Mock).mockResolvedValue(mockMessages);

      await chatController.getSessionMessages(mockRequest as Request, mockResponse as Response);

      expect(chatService.getSessionMessages).toHaveBeenCalledWith(mockSessionId, 50, 0);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockMessages,
      });
    });

    it('should retrieve messages with custom limit', async () => {
      mockRequest.query = { limit: '100' };
      (chatService.getSessionMessages as jest.Mock).mockResolvedValue(mockMessages);

      await chatController.getSessionMessages(mockRequest as Request, mockResponse as Response);

      expect(chatService.getSessionMessages).toHaveBeenCalledWith(mockSessionId, 100, 0);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should retrieve messages with custom offset', async () => {
      mockRequest.query = { offset: '20' };
      (chatService.getSessionMessages as jest.Mock).mockResolvedValue(mockMessages);

      await chatController.getSessionMessages(mockRequest as Request, mockResponse as Response);

      expect(chatService.getSessionMessages).toHaveBeenCalledWith(mockSessionId, 50, 20);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should retrieve messages with both limit and offset', async () => {
      mockRequest.query = { limit: '25', offset: '10' };
      (chatService.getSessionMessages as jest.Mock).mockResolvedValue(mockMessages);

      await chatController.getSessionMessages(mockRequest as Request, mockResponse as Response);

      expect(chatService.getSessionMessages).toHaveBeenCalledWith(mockSessionId, 25, 10);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle invalid limit gracefully', async () => {
      mockRequest.query = { limit: 'invalid' };
      (chatService.getSessionMessages as jest.Mock).mockResolvedValue(mockMessages);

      await chatController.getSessionMessages(mockRequest as Request, mockResponse as Response);

      expect(chatService.getSessionMessages).toHaveBeenCalledWith(mockSessionId, 50, 0);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle invalid offset gracefully', async () => {
      mockRequest.query = { offset: 'invalid' };
      (chatService.getSessionMessages as jest.Mock).mockResolvedValue(mockMessages);

      await chatController.getSessionMessages(mockRequest as Request, mockResponse as Response);

      expect(chatService.getSessionMessages).toHaveBeenCalledWith(mockSessionId, 50, 0);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return empty array when no messages exist', async () => {
      (chatService.getSessionMessages as jest.Mock).mockResolvedValue([]);

      await chatController.getSessionMessages(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [],
      });
    });

    it('should handle service errors gracefully', async () => {
      const error = new Error('Database error');
      (chatService.getSessionMessages as jest.Mock).mockRejectedValue(error);

      await chatController.getSessionMessages(mockRequest as Request, mockResponse as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error getting session messages:', error);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get messages',
      });
    });
  });

  describe('sendMessageWithAttachment', () => {
    const mockSessionId = 'session-123';
    const mockUserId = 'user-123';
    const mockUserRole = 'customer';
    const mockSession: ChatSessionWithDetails = {
      id: mockSessionId,
      subject: 'Test',
      category: 'general',
      priority: 'medium',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    };

    const mockMessage: ChatMessage = {
      id: 'msg-123',
      session_id: mockSessionId,
      sender_id: mockUserId,
      sender_role: 'customer',
      content: 'Test message',
      message_type: 'text',
      is_system_message: false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    beforeEach(() => {
      mockRequest.params = { sessionId: mockSessionId };
      (mockRequest as any).user = { userId: mockUserId, role: mockUserRole };
    });

    it('should send a text message without attachments', async () => {
      mockRequest.body = { content: 'Test message', message_type: 'text' };
      mockRequest.files = undefined;

      (chatService.getChatSession as jest.Mock).mockResolvedValue(mockSession);
      (chatService.sendMessage as jest.Mock).mockResolvedValue(mockMessage);
      (chatService.getSessionMessages as jest.Mock).mockResolvedValue([mockMessage]);

      await chatController.sendMessageWithAttachment(mockRequest as Request, mockResponse as Response);

      expect(chatService.getChatSession).toHaveBeenCalledWith(mockSessionId);
      expect(chatService.sendMessage).toHaveBeenCalledWith(
        mockSessionId,
        mockUserId,
        mockUserRole,
        'Test message',
        'text',
        false
      );
      expect(chatService.addAttachment).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockMessage,
      });
    });

    it('should send a message with default message_type', async () => {
      mockRequest.body = { content: 'Test message' };

      (chatService.getChatSession as jest.Mock).mockResolvedValue(mockSession);
      (chatService.sendMessage as jest.Mock).mockResolvedValue(mockMessage);
      (chatService.getSessionMessages as jest.Mock).mockResolvedValue([mockMessage]);

      await chatController.sendMessageWithAttachment(mockRequest as Request, mockResponse as Response);

      expect(chatService.sendMessage).toHaveBeenCalledWith(
        mockSessionId,
        mockUserId,
        mockUserRole,
        'Test message',
        'text',
        false
      );
    });

    it('should send a message with null content', async () => {
      mockRequest.body = { message_type: 'file' };

      (chatService.getChatSession as jest.Mock).mockResolvedValue(mockSession);
      (chatService.sendMessage as jest.Mock).mockResolvedValue(mockMessage);
      (chatService.getSessionMessages as jest.Mock).mockResolvedValue([mockMessage]);

      await chatController.sendMessageWithAttachment(mockRequest as Request, mockResponse as Response);

      expect(chatService.sendMessage).toHaveBeenCalledWith(
        mockSessionId,
        mockUserId,
        mockUserRole,
        null,
        'file',
        false
      );
    });

    it('should send a message with a single attachment', async () => {
      mockRequest.body = { content: 'Check this file', message_type: 'file' };
      const mockFile = {
        filename: 'test-file-123.pdf',
        originalname: 'document.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      } as Express.Multer.File;
      mockRequest.files = [mockFile] as Express.Multer.File[];

      const mockAttachment = {
        id: 'attach-123',
        message_id: 'msg-123',
        file_name: 'document.pdf',
        file_type: 'application/pdf',
        file_size: 1024,
        file_url: '/uploads/chat-attachments/test-file-123.pdf',
        created_at: new Date(),
      };

      (chatService.getChatSession as jest.Mock).mockResolvedValue(mockSession);
      (chatService.sendMessage as jest.Mock).mockResolvedValue(mockMessage);
      (chatService.addAttachment as jest.Mock).mockResolvedValue(mockAttachment);
      (chatService.getSessionMessages as jest.Mock).mockResolvedValue([{ ...mockMessage, attachments: [mockAttachment] }]);

      await chatController.sendMessageWithAttachment(mockRequest as Request, mockResponse as Response);

      expect(chatService.sendMessage).toHaveBeenCalledWith(
        mockSessionId,
        mockUserId,
        mockUserRole,
        'Check this file',
        'file',
        false
      );
      expect(chatService.addAttachment).toHaveBeenCalledWith(
        'msg-123',
        'document.pdf',
        'application/pdf',
        1024,
        '/uploads/chat-attachments/test-file-123.pdf'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should send a message with multiple attachments', async () => {
      mockRequest.body = { content: 'Multiple files' };
      const mockFiles = [
        {
          filename: 'file1-123.jpg',
          originalname: 'image1.jpg',
          mimetype: 'image/jpeg',
          size: 2048,
        },
        {
          filename: 'file2-456.png',
          originalname: 'image2.png',
          mimetype: 'image/png',
          size: 3072,
        },
      ] as Express.Multer.File[];
      mockRequest.files = mockFiles;

      (chatService.getChatSession as jest.Mock).mockResolvedValue(mockSession);
      (chatService.sendMessage as jest.Mock).mockResolvedValue(mockMessage);
      (chatService.addAttachment as jest.Mock).mockResolvedValue({});
      (chatService.getSessionMessages as jest.Mock).mockResolvedValue([mockMessage]);

      await chatController.sendMessageWithAttachment(mockRequest as Request, mockResponse as Response);

      expect(chatService.addAttachment).toHaveBeenCalledTimes(2);
      expect(chatService.addAttachment).toHaveBeenNthCalledWith(
        1,
        'msg-123',
        'image1.jpg',
        'image/jpeg',
        2048,
        '/uploads/chat-attachments/file1-123.jpg'
      );
      expect(chatService.addAttachment).toHaveBeenNthCalledWith(
        2,
        'msg-123',
        'image2.png',
        'image/png',
        3072,
        '/uploads/chat-attachments/file2-456.png'
      );
    });

    it('should return 404 if session not found', async () => {
      mockRequest.body = { content: 'Test' };
      (chatService.getChatSession as jest.Mock).mockResolvedValue(null);

      await chatController.sendMessageWithAttachment(mockRequest as Request, mockResponse as Response);

      expect(chatService.sendMessage).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Session not found',
      });
    });

    it('should handle empty files array', async () => {
      mockRequest.body = { content: 'Test' };
      mockRequest.files = [] as Express.Multer.File[];

      (chatService.getChatSession as jest.Mock).mockResolvedValue(mockSession);
      (chatService.sendMessage as jest.Mock).mockResolvedValue(mockMessage);
      (chatService.getSessionMessages as jest.Mock).mockResolvedValue([mockMessage]);

      await chatController.sendMessageWithAttachment(mockRequest as Request, mockResponse as Response);

      expect(chatService.addAttachment).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should handle service errors gracefully', async () => {
      mockRequest.body = { content: 'Test' };
      const error = new Error('Database error');
      (chatService.getChatSession as jest.Mock).mockRejectedValue(error);

      await chatController.sendMessageWithAttachment(mockRequest as Request, mockResponse as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error sending message with attachment:', error);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to send message',
      });
    });

    it('should handle error during attachment upload', async () => {
      mockRequest.body = { content: 'Test' };
      const mockFile = {
        filename: 'test.pdf',
        originalname: 'doc.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      } as Express.Multer.File;
      mockRequest.files = [mockFile] as Express.Multer.File[];

      (chatService.getChatSession as jest.Mock).mockResolvedValue(mockSession);
      (chatService.sendMessage as jest.Mock).mockResolvedValue(mockMessage);
      (chatService.addAttachment as jest.Mock).mockRejectedValue(new Error('Upload failed'));

      await chatController.sendMessageWithAttachment(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to send message',
      });
    });
  });

  describe('uploadAttachment', () => {
    it('should upload a single file successfully', async () => {
      const mockFile = {
        filename: 'upload-123.pdf',
        originalname: 'document.pdf',
        mimetype: 'application/pdf',
        size: 2048,
      } as Express.Multer.File;
      mockRequest.files = [mockFile] as Express.Multer.File[];

      await chatController.uploadAttachment(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [
          {
            file_name: 'document.pdf',
            file_type: 'application/pdf',
            file_size: 2048,
            file_url: '/uploads/chat-attachments/upload-123.pdf',
          },
        ],
      });
    });

    it('should upload multiple files successfully', async () => {
      const mockFiles = [
        {
          filename: 'upload1-123.jpg',
          originalname: 'photo1.jpg',
          mimetype: 'image/jpeg',
          size: 1024,
        },
        {
          filename: 'upload2-456.png',
          originalname: 'photo2.png',
          mimetype: 'image/png',
          size: 2048,
        },
      ] as Express.Multer.File[];
      mockRequest.files = mockFiles;

      await chatController.uploadAttachment(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [
          {
            file_name: 'photo1.jpg',
            file_type: 'image/jpeg',
            file_size: 1024,
            file_url: '/uploads/chat-attachments/upload1-123.jpg',
          },
          {
            file_name: 'photo2.png',
            file_type: 'image/png',
            file_size: 2048,
            file_url: '/uploads/chat-attachments/upload2-456.png',
          },
        ],
      });
    });

    it('should return 400 if no files uploaded', async () => {
      mockRequest.files = undefined;

      await chatController.uploadAttachment(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'No files uploaded',
      });
    });

    it('should return 400 if files array is empty', async () => {
      mockRequest.files = [] as Express.Multer.File[];

      await chatController.uploadAttachment(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'No files uploaded',
      });
    });

    it('should handle service errors gracefully', async () => {
      const mockFile = {
        filename: 'test.pdf',
        originalname: 'doc.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      } as Express.Multer.File;
      mockRequest.files = [mockFile] as Express.Multer.File[];

      const error = new Error('Processing error');
      jest.spyOn(Array.prototype, 'map').mockImplementationOnce(() => {
        throw error;
      });

      await chatController.uploadAttachment(mockRequest as Request, mockResponse as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error uploading attachment:', error);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to upload attachment',
      });
    });
  });

  describe('markMessagesAsRead', () => {
    const mockSessionId = 'session-123';
    const mockUserId = 'user-123';

    beforeEach(() => {
      mockRequest.params = { sessionId: mockSessionId };
      (mockRequest as any).user = { userId: mockUserId };
    });

    it('should mark specific messages as read', async () => {
      const messageIds = ['msg-1', 'msg-2', 'msg-3'];
      mockRequest.body = { message_ids: messageIds };

      (chatService.markMessageAsRead as jest.Mock).mockResolvedValue({});

      await chatController.markMessagesAsRead(mockRequest as Request, mockResponse as Response);

      expect(chatService.markMessageAsRead).toHaveBeenCalledTimes(3);
      expect(chatService.markMessageAsRead).toHaveBeenNthCalledWith(1, 'msg-1', mockUserId);
      expect(chatService.markMessageAsRead).toHaveBeenNthCalledWith(2, 'msg-2', mockUserId);
      expect(chatService.markMessageAsRead).toHaveBeenNthCalledWith(3, 'msg-3', mockUserId);
      expect(chatService.markSessionMessagesAsRead).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Messages marked as read',
      });
    });

    it('should mark all session messages as read when no message_ids provided', async () => {
      mockRequest.body = {};

      (chatService.markSessionMessagesAsRead as jest.Mock).mockResolvedValue(undefined);

      await chatController.markMessagesAsRead(mockRequest as Request, mockResponse as Response);

      expect(chatService.markMessageAsRead).not.toHaveBeenCalled();
      expect(chatService.markSessionMessagesAsRead).toHaveBeenCalledWith(mockSessionId, mockUserId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Messages marked as read',
      });
    });

    it('should mark all session messages as read when message_ids is not an array', async () => {
      mockRequest.body = { message_ids: 'not-an-array' };

      (chatService.markSessionMessagesAsRead as jest.Mock).mockResolvedValue(undefined);

      await chatController.markMessagesAsRead(mockRequest as Request, mockResponse as Response);

      expect(chatService.markMessageAsRead).not.toHaveBeenCalled();
      expect(chatService.markSessionMessagesAsRead).toHaveBeenCalledWith(mockSessionId, mockUserId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle empty message_ids array', async () => {
      mockRequest.body = { message_ids: [] };

      await chatController.markMessagesAsRead(mockRequest as Request, mockResponse as Response);

      expect(chatService.markMessageAsRead).not.toHaveBeenCalled();
      expect(chatService.markSessionMessagesAsRead).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle service errors gracefully', async () => {
      mockRequest.body = { message_ids: ['msg-1'] };
      const error = new Error('Database error');
      (chatService.markMessageAsRead as jest.Mock).mockRejectedValue(error);

      await chatController.markMessagesAsRead(mockRequest as Request, mockResponse as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error marking messages as read:', error);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to mark messages as read',
      });
    });
  });

  describe('assignAgentToSession', () => {
    const mockSessionId = 'session-123';
    const mockAgentId = 'agent-123';
    const mockSession: ChatSessionWithDetails = {
      id: mockSessionId,
      subject: 'Test',
      category: 'general',
      priority: 'medium',
      status: 'waiting',
      created_at: new Date(),
      updated_at: new Date(),
    };

    const mockUpdatedSession: ChatSession = {
      ...mockSession,
      agent_id: mockAgentId,
      status: 'active',
      agent_accepted_at: new Date(),
    };

    beforeEach(() => {
      mockRequest.params = { sessionId: mockSessionId };
    });

    it('should assign support agent to session successfully', async () => {
      (mockRequest as any).user = { userId: mockAgentId, role: 'support' };
      (chatService.getChatSession as jest.Mock).mockResolvedValue(mockSession);
      (chatService.assignAgent as jest.Mock).mockResolvedValue(mockUpdatedSession);

      await chatController.assignAgentToSession(mockRequest as Request, mockResponse as Response);

      expect(chatService.getChatSession).toHaveBeenCalledWith(mockSessionId);
      expect(chatService.assignAgent).toHaveBeenCalledWith(mockSessionId, mockAgentId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedSession,
      });
    });

    it('should assign admin to session successfully', async () => {
      (mockRequest as any).user = { userId: mockAgentId, role: 'admin' };
      (chatService.getChatSession as jest.Mock).mockResolvedValue(mockSession);
      (chatService.assignAgent as jest.Mock).mockResolvedValue(mockUpdatedSession);

      await chatController.assignAgentToSession(mockRequest as Request, mockResponse as Response);

      expect(chatService.assignAgent).toHaveBeenCalledWith(mockSessionId, mockAgentId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 403 if user is not support or admin', async () => {
      (mockRequest as any).user = { userId: 'user-123', role: 'customer' };

      await chatController.assignAgentToSession(mockRequest as Request, mockResponse as Response);

      expect(chatService.getChatSession).not.toHaveBeenCalled();
      expect(chatService.assignAgent).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Only support agents can accept chats',
      });
    });

    it('should return 403 if user is restaurant_owner', async () => {
      (mockRequest as any).user = { userId: 'user-123', role: 'restaurant_owner' };

      await chatController.assignAgentToSession(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should return 403 if user is driver', async () => {
      (mockRequest as any).user = { userId: 'user-123', role: 'driver' };

      await chatController.assignAgentToSession(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should return 404 if session not found', async () => {
      (mockRequest as any).user = { userId: mockAgentId, role: 'support' };
      (chatService.getChatSession as jest.Mock).mockResolvedValue(null);

      await chatController.assignAgentToSession(mockRequest as Request, mockResponse as Response);

      expect(chatService.assignAgent).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Session not found',
      });
    });

    it('should return 400 if chat already accepted (status active)', async () => {
      (mockRequest as any).user = { userId: mockAgentId, role: 'support' };
      const activeSession = { ...mockSession, status: 'active' as const };
      (chatService.getChatSession as jest.Mock).mockResolvedValue(activeSession);

      await chatController.assignAgentToSession(mockRequest as Request, mockResponse as Response);

      expect(chatService.assignAgent).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Chat already accepted',
      });
    });

    it('should return 400 if chat already accepted (status resolved)', async () => {
      (mockRequest as any).user = { userId: mockAgentId, role: 'support' };
      const resolvedSession = { ...mockSession, status: 'resolved' as const };
      (chatService.getChatSession as jest.Mock).mockResolvedValue(resolvedSession);

      await chatController.assignAgentToSession(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if chat already accepted (status closed)', async () => {
      (mockRequest as any).user = { userId: mockAgentId, role: 'support' };
      const closedSession = { ...mockSession, status: 'closed' as const };
      (chatService.getChatSession as jest.Mock).mockResolvedValue(closedSession);

      await chatController.assignAgentToSession(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should handle service errors gracefully', async () => {
      (mockRequest as any).user = { userId: mockAgentId, role: 'support' };
      const error = new Error('Database error');
      (chatService.getChatSession as jest.Mock).mockRejectedValue(error);

      await chatController.assignAgentToSession(mockRequest as Request, mockResponse as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error assigning agent:', error);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to assign agent',
      });
    });
  });

  describe('updateSessionStatus', () => {
    const mockSessionId = 'session-123';
    const mockUserId = 'user-123';
    const mockUpdatedSession: ChatSession = {
      id: mockSessionId,
      subject: 'Test',
      category: 'general',
      priority: 'medium',
      status: 'resolved',
      created_at: new Date(),
      updated_at: new Date(),
    };

    beforeEach(() => {
      mockRequest.params = { sessionId: mockSessionId };
      (mockRequest as any).user = { userId: mockUserId };
    });

    it('should update session status to resolved', async () => {
      mockRequest.body = { status: 'resolved' };
      (chatService.updateSessionStatus as jest.Mock).mockResolvedValue(mockUpdatedSession);

      await chatController.updateSessionStatus(mockRequest as Request, mockResponse as Response);

      expect(chatService.updateSessionStatus).toHaveBeenCalledWith(mockSessionId, 'resolved', mockUserId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedSession,
      });
    });

    it('should update session status to closed', async () => {
      mockRequest.body = { status: 'closed' };
      const closedSession = { ...mockUpdatedSession, status: 'closed' as const };
      (chatService.updateSessionStatus as jest.Mock).mockResolvedValue(closedSession);

      await chatController.updateSessionStatus(mockRequest as Request, mockResponse as Response);

      expect(chatService.updateSessionStatus).toHaveBeenCalledWith(mockSessionId, 'closed', mockUserId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should update session status to active', async () => {
      mockRequest.body = { status: 'active' };
      const activeSession = { ...mockUpdatedSession, status: 'active' as const };
      (chatService.updateSessionStatus as jest.Mock).mockResolvedValue(activeSession);

      await chatController.updateSessionStatus(mockRequest as Request, mockResponse as Response);

      expect(chatService.updateSessionStatus).toHaveBeenCalledWith(mockSessionId, 'active', mockUserId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should update session status to waiting', async () => {
      mockRequest.body = { status: 'waiting' };
      const waitingSession = { ...mockUpdatedSession, status: 'waiting' as const };
      (chatService.updateSessionStatus as jest.Mock).mockResolvedValue(waitingSession);

      await chatController.updateSessionStatus(mockRequest as Request, mockResponse as Response);

      expect(chatService.updateSessionStatus).toHaveBeenCalledWith(mockSessionId, 'waiting', mockUserId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if status is missing', async () => {
      mockRequest.body = {};

      await chatController.updateSessionStatus(mockRequest as Request, mockResponse as Response);

      expect(chatService.updateSessionStatus).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Status is required',
      });
    });

    it('should return 400 if status is empty string', async () => {
      mockRequest.body = { status: '' };

      await chatController.updateSessionStatus(mockRequest as Request, mockResponse as Response);

      expect(chatService.updateSessionStatus).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if status is null', async () => {
      mockRequest.body = { status: null };

      await chatController.updateSessionStatus(mockRequest as Request, mockResponse as Response);

      expect(chatService.updateSessionStatus).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should handle service errors gracefully', async () => {
      mockRequest.body = { status: 'resolved' };
      const error = new Error('Database error');
      (chatService.updateSessionStatus as jest.Mock).mockRejectedValue(error);

      await chatController.updateSessionStatus(mockRequest as Request, mockResponse as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error updating session status:', error);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to update session status',
      });
    });
  });

  describe('getActiveSessions', () => {
    const mockUserId = 'user-123';
    const mockSessions: ChatSessionWithDetails[] = [
      {
        id: 'session-1',
        subject: 'Session 1',
        category: 'general',
        priority: 'high',
        status: 'active',
        unread_count: 3,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'session-2',
        subject: 'Session 2',
        category: 'technical',
        priority: 'medium',
        status: 'waiting',
        unread_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    beforeEach(() => {
      (mockRequest as any).user = { userId: mockUserId };
    });

    it('should get active sessions for support agent', async () => {
      (mockRequest as any).user = { userId: mockUserId, role: 'support' };
      (chatService.getActiveSessions as jest.Mock).mockResolvedValue(mockSessions);

      await chatController.getActiveSessions(mockRequest as Request, mockResponse as Response);

      expect(chatService.getActiveSessions).toHaveBeenCalledWith(mockUserId);
      expect(chatService.getSessionsByCustomer).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSessions,
      });
    });

    it('should get active sessions for admin', async () => {
      (mockRequest as any).user = { userId: mockUserId, role: 'admin' };
      (chatService.getActiveSessions as jest.Mock).mockResolvedValue(mockSessions);

      await chatController.getActiveSessions(mockRequest as Request, mockResponse as Response);

      expect(chatService.getActiveSessions).toHaveBeenCalledWith(mockUserId);
      expect(chatService.getSessionsByCustomer).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should get sessions by customer for customer role', async () => {
      (mockRequest as any).user = { userId: mockUserId, role: 'customer' };
      (chatService.getSessionsByCustomer as jest.Mock).mockResolvedValue(mockSessions);

      await chatController.getActiveSessions(mockRequest as Request, mockResponse as Response);

      expect(chatService.getSessionsByCustomer).toHaveBeenCalledWith(mockUserId);
      expect(chatService.getActiveSessions).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSessions,
      });
    });

    it('should get sessions by customer for restaurant_owner role', async () => {
      (mockRequest as any).user = { userId: mockUserId, role: 'restaurant_owner' };
      (chatService.getSessionsByCustomer as jest.Mock).mockResolvedValue(mockSessions);

      await chatController.getActiveSessions(mockRequest as Request, mockResponse as Response);

      expect(chatService.getSessionsByCustomer).toHaveBeenCalledWith(mockUserId);
      expect(chatService.getActiveSessions).not.toHaveBeenCalled();
    });

    it('should get sessions by customer for driver role', async () => {
      (mockRequest as any).user = { userId: mockUserId, role: 'driver' };
      (chatService.getSessionsByCustomer as jest.Mock).mockResolvedValue(mockSessions);

      await chatController.getActiveSessions(mockRequest as Request, mockResponse as Response);

      expect(chatService.getSessionsByCustomer).toHaveBeenCalledWith(mockUserId);
      expect(chatService.getActiveSessions).not.toHaveBeenCalled();
    });

    it('should return empty array when no sessions exist', async () => {
      (mockRequest as any).user = { userId: mockUserId, role: 'support' };
      (chatService.getActiveSessions as jest.Mock).mockResolvedValue([]);

      await chatController.getActiveSessions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [],
      });
    });

    it('should handle service errors gracefully', async () => {
      (mockRequest as any).user = { userId: mockUserId, role: 'support' };
      const error = new Error('Database error');
      (chatService.getActiveSessions as jest.Mock).mockRejectedValue(error);

      await chatController.getActiveSessions(mockRequest as Request, mockResponse as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error getting active sessions:', error);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get sessions',
      });
    });
  });

  describe('getUserSessions', () => {
    const mockUserId = 'user-123';
    const mockSessions: ChatSessionWithDetails[] = [
      {
        id: 'session-1',
        subject: 'User Session 1',
        category: 'general',
        priority: 'medium',
        status: 'active',
        customer_id: mockUserId,
        unread_count: 2,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'session-2',
        subject: 'User Session 2',
        category: 'billing',
        priority: 'low',
        status: 'closed',
        customer_id: mockUserId,
        unread_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    beforeEach(() => {
      (mockRequest as any).user = { userId: mockUserId };
    });

    it('should get all sessions for a user', async () => {
      (chatService.getSessionsByCustomer as jest.Mock).mockResolvedValue(mockSessions);

      await chatController.getUserSessions(mockRequest as Request, mockResponse as Response);

      expect(chatService.getSessionsByCustomer).toHaveBeenCalledWith(mockUserId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSessions,
      });
    });

    it('should return empty array when user has no sessions', async () => {
      (chatService.getSessionsByCustomer as jest.Mock).mockResolvedValue([]);

      await chatController.getUserSessions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [],
      });
    });

    it('should work with different user IDs', async () => {
      const differentUserId = 'user-456';
      (mockRequest as any).user = { userId: differentUserId };
      (chatService.getSessionsByCustomer as jest.Mock).mockResolvedValue([]);

      await chatController.getUserSessions(mockRequest as Request, mockResponse as Response);

      expect(chatService.getSessionsByCustomer).toHaveBeenCalledWith(differentUserId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle service errors gracefully', async () => {
      const error = new Error('Database error');
      (chatService.getSessionsByCustomer as jest.Mock).mockRejectedValue(error);

      await chatController.getUserSessions(mockRequest as Request, mockResponse as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error getting user sessions:', error);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get sessions',
      });
    });

    it('should handle undefined user gracefully', async () => {
      (mockRequest as any).user = undefined;
      (chatService.getSessionsByCustomer as jest.Mock).mockResolvedValue([]);

      await chatController.getUserSessions(mockRequest as Request, mockResponse as Response);

      expect(chatService.getSessionsByCustomer).toHaveBeenCalledWith(undefined);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });
});
