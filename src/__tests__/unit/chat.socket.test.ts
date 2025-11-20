import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { ChatSocketServer } from '../../socket/chat.socket';
import chatService from '../../services/chat.service';
import { ChatSession, ChatMessage, UserRole } from '../../types/chat.types';

jest.mock('../../services/chat.service');
jest.mock('jsonwebtoken');

describe('ChatSocketServer', () => {
  let httpServer: HTTPServer;
  let chatSocketServer: ChatSocketServer;
  let io: SocketIOServer;
  let clientSocket: ClientSocket;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  const mockPort = 45099;
  const mockToken = 'valid-jwt-token';
  const mockUserId = 'user-123';
  const mockUserRole: UserRole = 'customer';
  const mockUserName = 'John Doe';

  const mockDecodedToken = {
    userId: mockUserId,
    role: mockUserRole,
    firstName: 'John',
    lastName: 'Doe',
  };

  const mockSession: ChatSession = {
    id: 'session-123',
    subject: 'Test Session',
    category: 'general',
    priority: 'medium',
    status: 'active',
    customer_id: mockUserId,
    agent_id: 'agent-123',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockMessage: ChatMessage = {
    id: 'msg-123',
    session_id: 'session-123',
    sender_id: mockUserId,
    sender_role: mockUserRole,
    content: 'Test message',
    message_type: 'text',
    is_system_message: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  beforeEach((done) => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    httpServer = require('http').createServer();
    httpServer.listen(mockPort, () => {
      chatSocketServer = new ChatSocketServer(httpServer);
      io = chatSocketServer.getIO();
      done();
    });
  });

  afterEach((done) => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
    if (io) {
      io.close();
    }
    if (httpServer) {
      httpServer.close(() => {
        done();
      });
    } else {
      done();
    }
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
  });

  describe('Constructor and Initialization', () => {
    it('should initialize ChatSocketServer with correct CORS settings', () => {
      expect(chatSocketServer).toBeDefined();
      expect(io).toBeDefined();
      expect(chatSocketServer.getIO()).toBe(io);
    });

    it('should start typing cleanup interval on initialization', () => {
      jest.useFakeTimers();
      const cleanupSpy = jest.spyOn(chatService, 'cleanupExpiredTypingIndicators').mockResolvedValue(undefined);

      const newHttpServer = require('http').createServer();
      const newChatServer = new ChatSocketServer(newHttpServer);

      jest.advanceTimersByTime(30000);

      expect(cleanupSpy).toHaveBeenCalled();

      newHttpServer.close();
      jest.useRealTimers();
    });

    it('should handle typing cleanup errors gracefully', async () => {
      jest.useFakeTimers();
      const error = new Error('Cleanup failed');
      const cleanupSpy = jest.spyOn(chatService, 'cleanupExpiredTypingIndicators').mockRejectedValue(error);

      const newHttpServer = require('http').createServer();
      const newChatServer = new ChatSocketServer(newHttpServer);

      jest.advanceTimersByTime(30000);
      await Promise.resolve();

      expect(cleanupSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error cleaning up typing indicators:', error);

      newHttpServer.close();
      jest.useRealTimers();
    });
  });

  describe('Authentication Middleware', () => {
    it('should authenticate socket connection with valid token in auth', (done) => {
      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);

      clientSocket = ioClient(`http://localhost:${mockPort}`, {
        auth: { token: mockToken },
      });

      clientSocket.on('connect', () => {
        expect(jwt.verify).toHaveBeenCalledWith(mockToken, 'test-secret');
        expect(consoleLogSpy).toHaveBeenCalledWith(
          `User connected: ${mockUserId} (${mockUserRole})`
        );
        done();
      });

      clientSocket.on('connect_error', (error) => {
        done(error);
      });
    });

    it('should authenticate socket connection with valid token in authorization header', (done) => {
      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);

      clientSocket = ioClient(`http://localhost:${mockPort}`, {
        extraHeaders: {
          authorization: `Bearer ${mockToken}`,
        },
      });

      clientSocket.on('connect', () => {
        expect(jwt.verify).toHaveBeenCalledWith(mockToken, 'test-secret');
        done();
      });

      clientSocket.on('connect_error', (error) => {
        done(error);
      });
    });

    it('should reject connection without token', (done) => {
      clientSocket = ioClient(`http://localhost:${mockPort}`, {
        auth: {},
      });

      clientSocket.on('connect', () => {
        done(new Error('Should not connect without token'));
      });

      clientSocket.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication token required');
        done();
      });
    });

    it('should reject connection with invalid token', (done) => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      clientSocket = ioClient(`http://localhost:${mockPort}`, {
        auth: { token: 'invalid-token' },
      });

      clientSocket.on('connect', () => {
        done(new Error('Should not connect with invalid token'));
      });

      clientSocket.on('connect_error', (error) => {
        expect(error.message).toContain('Invalid authentication token');
        done();
      });
    });

    it('should reject connection when JWT_SECRET is not set', (done) => {
      delete process.env.JWT_SECRET;

      const newHttpServer = require('http').createServer();
      newHttpServer.listen(45098, () => {
        const newChatServer = new ChatSocketServer(newHttpServer);

        const testClient = ioClient(`http://localhost:45098`, {
          auth: { token: mockToken },
        });

        testClient.on('connect', () => {
          testClient.disconnect();
          newHttpServer.close();
          process.env.JWT_SECRET = 'test-secret';
          done(new Error('Should not connect without JWT_SECRET'));
        });

        testClient.on('connect_error', (error) => {
          expect(error.message).toContain('Server configuration error');
          testClient.disconnect();
          newHttpServer.close();
          process.env.JWT_SECRET = 'test-secret';
          done();
        });
      });
    });
  });

  describe('join_session Event', () => {
    beforeEach((done) => {
      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);
      clientSocket = ioClient(`http://localhost:${mockPort}`, {
        auth: { token: mockToken },
      });
      clientSocket.on('connect', () => done());
    });

    it('should join session successfully as customer', (done) => {
      const mockMessages = [mockMessage];
      (chatService.getChatSession as jest.Mock).mockResolvedValue(mockSession);
      (chatService.getSessionMessages as jest.Mock).mockResolvedValue(mockMessages);
      (chatService.markSessionMessagesAsRead as jest.Mock).mockResolvedValue(undefined);

      clientSocket.emit('join_session', { session_id: 'session-123' });

      clientSocket.on('session_joined', (data) => {
        expect(data.session).toEqual(mockSession);
        expect(data.messages).toEqual(mockMessages);
        expect(data.participants).toBeDefined();
        expect(chatService.getChatSession).toHaveBeenCalledWith('session-123');
        expect(chatService.getSessionMessages).toHaveBeenCalledWith('session-123', 50, 0);
        expect(chatService.markSessionMessagesAsRead).toHaveBeenCalledWith('session-123', mockUserId);
        done();
      });
    });

    it('should join session successfully as agent', (done) => {
      const agentToken = {
        userId: 'agent-123',
        role: 'support' as UserRole,
        firstName: 'Agent',
        lastName: 'Smith',
      };
      (jwt.verify as jest.Mock).mockReturnValue(agentToken);

      const agentClient = ioClient(`http://localhost:${mockPort}`, {
        auth: { token: mockToken },
      });

      agentClient.on('connect', () => {
        const agentSession = { ...mockSession, agent_id: 'agent-123' };
        (chatService.getChatSession as jest.Mock).mockResolvedValue(agentSession);
        (chatService.getSessionMessages as jest.Mock).mockResolvedValue([]);
        (chatService.markSessionMessagesAsRead as jest.Mock).mockResolvedValue(undefined);

        agentClient.emit('join_session', { session_id: 'session-123' });

        agentClient.on('session_joined', (data) => {
          expect(data.session).toEqual(agentSession);
          agentClient.disconnect();
          done();
        });
      });
    });

    it('should join session successfully as admin', (done) => {
      const adminToken = {
        userId: 'admin-123',
        role: 'admin' as UserRole,
        firstName: 'Admin',
        lastName: 'User',
      };
      (jwt.verify as jest.Mock).mockReturnValue(adminToken);

      const adminClient = ioClient(`http://localhost:${mockPort}`, {
        auth: { token: mockToken },
      });

      adminClient.on('connect', () => {
        (chatService.getChatSession as jest.Mock).mockResolvedValue(mockSession);
        (chatService.getSessionMessages as jest.Mock).mockResolvedValue([]);
        (chatService.markSessionMessagesAsRead as jest.Mock).mockResolvedValue(undefined);

        adminClient.emit('join_session', { session_id: 'session-123' });

        adminClient.on('session_joined', (data) => {
          expect(data.session).toEqual(mockSession);
          adminClient.disconnect();
          done();
        });
      });
    });

    it('should emit user_joined to other participants', (done) => {
      (chatService.getChatSession as jest.Mock).mockResolvedValue(mockSession);
      (chatService.getSessionMessages as jest.Mock).mockResolvedValue([]);
      (chatService.markSessionMessagesAsRead as jest.Mock).mockResolvedValue(undefined);

      const client2Token = {
        userId: 'user-456',
        role: 'support' as UserRole,
        firstName: 'Jane',
        lastName: 'Smith',
      };
      (jwt.verify as jest.Mock).mockReturnValue(client2Token);

      const client2 = ioClient(`http://localhost:${mockPort}`, {
        auth: { token: mockToken },
      });

      client2.on('connect', () => {
        const agentSession = { ...mockSession, agent_id: 'user-456' };
        (chatService.getChatSession as jest.Mock).mockResolvedValue(agentSession);

        client2.emit('join_session', { session_id: 'session-123' });

        client2.on('session_joined', () => {
          (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);

          const client3 = ioClient(`http://localhost:${mockPort}`, {
            auth: { token: mockToken },
          });

          client3.on('connect', () => {
            (chatService.getChatSession as jest.Mock).mockResolvedValue(mockSession);
            client3.emit('join_session', { session_id: 'session-123' });
          });

          client2.on('user_joined', (data) => {
            expect(data.user_id).toBe(mockUserId);
            expect(data.role).toBe(mockUserRole);
            expect(data.name).toBe(mockUserName);
            client2.disconnect();
            client3.disconnect();
            done();
          });
        });
      });
    });

    it('should return error when session not found', (done) => {
      (chatService.getChatSession as jest.Mock).mockResolvedValue(null);

      clientSocket.emit('join_session', { session_id: 'nonexistent' });

      clientSocket.on('error', (data) => {
        expect(data.message).toBe('Session not found');
        done();
      });
    });

    it('should return error when unauthorized to join session', (done) => {
      const unauthorizedSession = {
        ...mockSession,
        customer_id: 'other-user',
        agent_id: 'other-agent',
      };
      (chatService.getChatSession as jest.Mock).mockResolvedValue(unauthorizedSession);

      clientSocket.emit('join_session', { session_id: 'session-123' });

      clientSocket.on('error', (data) => {
        expect(data.message).toBe('Unauthorized to join this session');
        done();
      });
    });

    it('should handle errors during join gracefully', (done) => {
      const error = new Error('Database error');
      (chatService.getChatSession as jest.Mock).mockRejectedValue(error);

      clientSocket.emit('join_session', { session_id: 'session-123' });

      clientSocket.on('error', (data) => {
        expect(data.message).toBe('Failed to join session');
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error joining session:', error);
        done();
      });
    });

    it('should emit messages_read event after joining', (done) => {
      (chatService.getChatSession as jest.Mock).mockResolvedValue(mockSession);
      (chatService.getSessionMessages as jest.Mock).mockResolvedValue([]);
      (chatService.markSessionMessagesAsRead as jest.Mock).mockResolvedValue(undefined);

      clientSocket.emit('join_session', { session_id: 'session-123' });

      clientSocket.on('messages_read', (data) => {
        expect(data.session_id).toBe('session-123');
        expect(data.user_id).toBe(mockUserId);
        done();
      });
    });
  });

  describe('leave_session Event', () => {
    beforeEach((done) => {
      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);
      clientSocket = ioClient(`http://localhost:${mockPort}`, {
        auth: { token: mockToken },
      });
      clientSocket.on('connect', () => {
        (chatService.getChatSession as jest.Mock).mockResolvedValue(mockSession);
        (chatService.getSessionMessages as jest.Mock).mockResolvedValue([]);
        (chatService.markSessionMessagesAsRead as jest.Mock).mockResolvedValue(undefined);
        clientSocket.emit('join_session', { session_id: 'session-123' });
        clientSocket.once('session_joined', () => done());
      });
    });

    it('should leave session successfully', (done) => {
      clientSocket.emit('leave_session', { session_id: 'session-123' });

      setTimeout(() => {
        done();
      }, 100);
    });

    it('should emit user_left to other participants', (done) => {
      const client2Token = {
        userId: 'user-456',
        role: 'support' as UserRole,
        firstName: 'Jane',
        lastName: 'Smith',
      };
      (jwt.verify as jest.Mock).mockReturnValue(client2Token);

      const client2 = ioClient(`http://localhost:${mockPort}`, {
        auth: { token: mockToken },
      });

      client2.on('connect', () => {
        const agentSession = { ...mockSession, agent_id: 'user-456' };
        (chatService.getChatSession as jest.Mock).mockResolvedValue(agentSession);
        client2.emit('join_session', { session_id: 'session-123' });

        client2.once('session_joined', () => {
          (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);
          clientSocket.emit('leave_session', { session_id: 'session-123' });
        });

        client2.on('user_left', (data) => {
          expect(data.user_id).toBe(mockUserId);
          expect(data.role).toBe(mockUserRole);
          client2.disconnect();
          done();
        });
      });
    });

    it('should remove user from connected users list', (done) => {
      clientSocket.emit('leave_session', { session_id: 'session-123' });

      setTimeout(() => {
        done();
      }, 100);
    });
  });

  describe('send_message Event', () => {
    beforeEach((done) => {
      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);
      clientSocket = ioClient(`http://localhost:${mockPort}`, {
        auth: { token: mockToken },
      });
      clientSocket.on('connect', () => {
        (chatService.getChatSession as jest.Mock).mockResolvedValue(mockSession);
        (chatService.getSessionMessages as jest.Mock).mockResolvedValue([]);
        (chatService.markSessionMessagesAsRead as jest.Mock).mockResolvedValue(undefined);
        clientSocket.emit('join_session', { session_id: 'session-123' });
        clientSocket.once('session_joined', () => done());
      });
    });

    it('should send text message successfully', (done) => {
      (chatService.sendMessage as jest.Mock).mockResolvedValue(mockMessage);
      (chatService.removeTypingIndicator as jest.Mock).mockResolvedValue(undefined);

      clientSocket.emit('send_message', {
        session_id: 'session-123',
        content: 'Test message',
        message_type: 'text',
      });

      clientSocket.on('new_message', (data) => {
        expect(data.message.content).toBe('Test message');
        expect(data.message.sender_name).toBe(mockUserName);
        expect(chatService.sendMessage).toHaveBeenCalledWith(
          'session-123',
          mockUserId,
          mockUserRole,
          'Test message',
          'text',
          false
        );
        done();
      });
    });

    it('should send message with default message_type', (done) => {
      (chatService.sendMessage as jest.Mock).mockResolvedValue(mockMessage);
      (chatService.removeTypingIndicator as jest.Mock).mockResolvedValue(undefined);

      clientSocket.emit('send_message', {
        session_id: 'session-123',
        content: 'Test message',
      });

      clientSocket.on('new_message', (data) => {
        expect(chatService.sendMessage).toHaveBeenCalledWith(
          'session-123',
          mockUserId,
          mockUserRole,
          'Test message',
          'text',
          false
        );
        done();
      });
    });

    it('should send image message', (done) => {
      const imageMessage = { ...mockMessage, message_type: 'image' as const };
      (chatService.sendMessage as jest.Mock).mockResolvedValue(imageMessage);
      (chatService.removeTypingIndicator as jest.Mock).mockResolvedValue(undefined);

      clientSocket.emit('send_message', {
        session_id: 'session-123',
        content: 'image.jpg',
        message_type: 'image',
      });

      clientSocket.on('new_message', (data) => {
        expect(chatService.sendMessage).toHaveBeenCalledWith(
          'session-123',
          mockUserId,
          mockUserRole,
          'image.jpg',
          'image',
          false
        );
        done();
      });
    });

    it('should send file message', (done) => {
      const fileMessage = { ...mockMessage, message_type: 'file' as const };
      (chatService.sendMessage as jest.Mock).mockResolvedValue(fileMessage);
      (chatService.removeTypingIndicator as jest.Mock).mockResolvedValue(undefined);

      clientSocket.emit('send_message', {
        session_id: 'session-123',
        content: 'document.pdf',
        message_type: 'file',
      });

      clientSocket.on('new_message', (data) => {
        expect(chatService.sendMessage).toHaveBeenCalledWith(
          'session-123',
          mockUserId,
          mockUserRole,
          'document.pdf',
          'file',
          false
        );
        done();
      });
    });

    it('should emit message_sent confirmation', (done) => {
      (chatService.sendMessage as jest.Mock).mockResolvedValue(mockMessage);
      (chatService.removeTypingIndicator as jest.Mock).mockResolvedValue(undefined);

      clientSocket.emit('send_message', {
        session_id: 'session-123',
        content: 'Test message',
        temp_id: 'temp-123',
      });

      clientSocket.on('message_sent', (data) => {
        expect(data.message_id).toBe('msg-123');
        expect(data.temp_id).toBe('temp-123');
        expect(data.sent_at).toBeDefined();
        done();
      });
    });

    it('should remove typing indicator after sending message', (done) => {
      (chatService.sendMessage as jest.Mock).mockResolvedValue(mockMessage);
      (chatService.removeTypingIndicator as jest.Mock).mockResolvedValue(undefined);

      clientSocket.emit('send_message', {
        session_id: 'session-123',
        content: 'Test message',
      });

      clientSocket.on('typing_stopped', (data) => {
        expect(data.session_id).toBe('session-123');
        expect(data.user_id).toBe(mockUserId);
        expect(chatService.removeTypingIndicator).toHaveBeenCalledWith('session-123', mockUserId);
        done();
      });
    });

    it('should return error when session not found', (done) => {
      (chatService.getChatSession as jest.Mock).mockResolvedValue(null);

      clientSocket.emit('send_message', {
        session_id: 'nonexistent',
        content: 'Test',
      });

      clientSocket.on('error', (data) => {
        expect(data.message).toBe('Session not found');
        done();
      });
    });

    it('should handle errors during send gracefully', (done) => {
      const error = new Error('Send failed');
      (chatService.sendMessage as jest.Mock).mockRejectedValue(error);

      clientSocket.emit('send_message', {
        session_id: 'session-123',
        content: 'Test',
      });

      clientSocket.on('error', (data) => {
        expect(data.message).toBe('Failed to send message');
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error sending message:', error);
        done();
      });
    });
  });

  describe('typing Event', () => {
    beforeEach((done) => {
      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);
      clientSocket = ioClient(`http://localhost:${mockPort}`, {
        auth: { token: mockToken },
      });
      clientSocket.on('connect', () => {
        (chatService.getChatSession as jest.Mock).mockResolvedValue(mockSession);
        (chatService.getSessionMessages as jest.Mock).mockResolvedValue([]);
        (chatService.markSessionMessagesAsRead as jest.Mock).mockResolvedValue(undefined);
        clientSocket.emit('join_session', { session_id: 'session-123' });
        clientSocket.once('session_joined', () => done());
      });
    });

    it('should broadcast typing indicator to other users', (done) => {
      (chatService.setTypingIndicator as jest.Mock).mockResolvedValue(undefined);

      const client2Token = {
        userId: 'user-456',
        role: 'support' as UserRole,
        firstName: 'Jane',
        lastName: 'Smith',
      };
      (jwt.verify as jest.Mock).mockReturnValue(client2Token);

      const client2 = ioClient(`http://localhost:${mockPort}`, {
        auth: { token: mockToken },
      });

      client2.on('connect', () => {
        const agentSession = { ...mockSession, agent_id: 'user-456' };
        (chatService.getChatSession as jest.Mock).mockResolvedValue(agentSession);
        client2.emit('join_session', { session_id: 'session-123' });

        client2.once('session_joined', () => {
          (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);
          clientSocket.emit('typing', { session_id: 'session-123' });
        });

        client2.on('user_typing', (data) => {
          expect(data.session_id).toBe('session-123');
          expect(data.user_id).toBe(mockUserId);
          expect(data.user_name).toBe(mockUserName);
          expect(chatService.setTypingIndicator).toHaveBeenCalledWith('session-123', mockUserId);
          client2.disconnect();
          done();
        });
      });
    });

    it('should set typing indicator in service', (done) => {
      (chatService.setTypingIndicator as jest.Mock).mockResolvedValue(undefined);

      clientSocket.emit('typing', { session_id: 'session-123' });

      setTimeout(() => {
        expect(chatService.setTypingIndicator).toHaveBeenCalledWith('session-123', mockUserId);
        done();
      }, 100);
    });

    it('should auto-stop typing after timeout', (done) => {
      jest.useFakeTimers();
      (chatService.setTypingIndicator as jest.Mock).mockResolvedValue(undefined);
      (chatService.removeTypingIndicator as jest.Mock).mockResolvedValue(undefined);

      clientSocket.emit('typing', { session_id: 'session-123' });

      clientSocket.on('typing_stopped', (data) => {
        expect(data.session_id).toBe('session-123');
        expect(data.user_id).toBe(mockUserId);
        jest.useRealTimers();
        done();
      });

      jest.advanceTimersByTime(10000);
    });

    it('should clear previous timeout when typing again', (done) => {
      jest.useFakeTimers();
      (chatService.setTypingIndicator as jest.Mock).mockResolvedValue(undefined);
      (chatService.removeTypingIndicator as jest.Mock).mockResolvedValue(undefined);

      clientSocket.emit('typing', { session_id: 'session-123' });
      jest.advanceTimersByTime(5000);
      clientSocket.emit('typing', { session_id: 'session-123' });
      jest.advanceTimersByTime(5000);

      expect(chatService.setTypingIndicator).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(5000);

      setTimeout(() => {
        jest.useRealTimers();
        done();
      }, 100);
    });

    it('should handle errors during typing gracefully', (done) => {
      const error = new Error('Typing error');
      (chatService.setTypingIndicator as jest.Mock).mockRejectedValue(error);

      clientSocket.emit('typing', { session_id: 'session-123' });

      setTimeout(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error setting typing indicator:', error);
        done();
      }, 100);
    });
  });

  describe('stop_typing Event', () => {
    beforeEach((done) => {
      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);
      clientSocket = ioClient(`http://localhost:${mockPort}`, {
        auth: { token: mockToken },
      });
      clientSocket.on('connect', () => {
        (chatService.getChatSession as jest.Mock).mockResolvedValue(mockSession);
        (chatService.getSessionMessages as jest.Mock).mockResolvedValue([]);
        (chatService.markSessionMessagesAsRead as jest.Mock).mockResolvedValue(undefined);
        clientSocket.emit('join_session', { session_id: 'session-123' });
        clientSocket.once('session_joined', () => done());
      });
    });

    it('should broadcast stop typing to other users', (done) => {
      (chatService.removeTypingIndicator as jest.Mock).mockResolvedValue(undefined);

      const client2Token = {
        userId: 'user-456',
        role: 'support' as UserRole,
        firstName: 'Jane',
        lastName: 'Smith',
      };
      (jwt.verify as jest.Mock).mockReturnValue(client2Token);

      const client2 = ioClient(`http://localhost:${mockPort}`, {
        auth: { token: mockToken },
      });

      client2.on('connect', () => {
        const agentSession = { ...mockSession, agent_id: 'user-456' };
        (chatService.getChatSession as jest.Mock).mockResolvedValue(agentSession);
        client2.emit('join_session', { session_id: 'session-123' });

        client2.once('session_joined', () => {
          (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);
          clientSocket.emit('stop_typing', { session_id: 'session-123' });
        });

        client2.on('typing_stopped', (data) => {
          expect(data.session_id).toBe('session-123');
          expect(data.user_id).toBe(mockUserId);
          expect(chatService.removeTypingIndicator).toHaveBeenCalledWith('session-123', mockUserId);
          client2.disconnect();
          done();
        });
      });
    });

    it('should remove typing indicator from service', (done) => {
      (chatService.removeTypingIndicator as jest.Mock).mockResolvedValue(undefined);

      clientSocket.emit('stop_typing', { session_id: 'session-123' });

      setTimeout(() => {
        expect(chatService.removeTypingIndicator).toHaveBeenCalledWith('session-123', mockUserId);
        done();
      }, 100);
    });

    it('should clear typing timeout if exists', (done) => {
      jest.useFakeTimers();
      (chatService.setTypingIndicator as jest.Mock).mockResolvedValue(undefined);
      (chatService.removeTypingIndicator as jest.Mock).mockResolvedValue(undefined);

      clientSocket.emit('typing', { session_id: 'session-123' });
      clientSocket.emit('stop_typing', { session_id: 'session-123' });

      jest.advanceTimersByTime(10000);

      setTimeout(() => {
        expect(chatService.removeTypingIndicator).toHaveBeenCalledWith('session-123', mockUserId);
        jest.useRealTimers();
        done();
      }, 100);
    });

    it('should handle errors during stop typing gracefully', (done) => {
      const error = new Error('Stop typing error');
      (chatService.removeTypingIndicator as jest.Mock).mockRejectedValue(error);

      clientSocket.emit('stop_typing', { session_id: 'session-123' });

      setTimeout(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error removing typing indicator:', error);
        done();
      }, 100);
    });
  });

  describe('mark_as_read Event', () => {
    beforeEach((done) => {
      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);
      clientSocket = ioClient(`http://localhost:${mockPort}`, {
        auth: { token: mockToken },
      });
      clientSocket.on('connect', () => {
        (chatService.getChatSession as jest.Mock).mockResolvedValue(mockSession);
        (chatService.getSessionMessages as jest.Mock).mockResolvedValue([]);
        (chatService.markSessionMessagesAsRead as jest.Mock).mockResolvedValue(undefined);
        clientSocket.emit('join_session', { session_id: 'session-123' });
        clientSocket.once('session_joined', () => done());
      });
    });

    it('should mark specific messages as read', (done) => {
      (chatService.markMessageAsRead as jest.Mock).mockResolvedValue(undefined);

      const messageIds = ['msg-1', 'msg-2', 'msg-3'];
      clientSocket.emit('mark_as_read', {
        session_id: 'session-123',
        message_ids: messageIds,
      });

      clientSocket.on('messages_read', (data) => {
        expect(data.session_id).toBe('session-123');
        expect(data.user_id).toBe(mockUserId);
        expect(data.message_ids).toEqual(messageIds);
        expect(chatService.markMessageAsRead).toHaveBeenCalledTimes(3);
        done();
      });
    });

    it('should mark all session messages as read when no message_ids provided', (done) => {
      (chatService.markSessionMessagesAsRead as jest.Mock).mockResolvedValue(undefined);

      clientSocket.emit('mark_as_read', { session_id: 'session-123' });

      clientSocket.on('messages_read', (data) => {
        expect(data.session_id).toBe('session-123');
        expect(data.user_id).toBe(mockUserId);
        expect(chatService.markSessionMessagesAsRead).toHaveBeenCalledWith('session-123', mockUserId);
        done();
      });
    });

    it('should handle empty message_ids array', (done) => {
      (chatService.markSessionMessagesAsRead as jest.Mock).mockResolvedValue(undefined);

      clientSocket.emit('mark_as_read', {
        session_id: 'session-123',
        message_ids: [],
      });

      clientSocket.on('messages_read', (data) => {
        expect(data.session_id).toBe('session-123');
        expect(chatService.markSessionMessagesAsRead).toHaveBeenCalledWith('session-123', mockUserId);
        done();
      });
    });

    it('should handle errors during mark as read gracefully', (done) => {
      const error = new Error('Mark as read error');
      (chatService.markMessageAsRead as jest.Mock).mockRejectedValue(error);

      clientSocket.emit('mark_as_read', {
        session_id: 'session-123',
        message_ids: ['msg-1'],
      });

      setTimeout(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error marking messages as read:', error);
        done();
      }, 100);
    });
  });

  describe('accept_chat Event', () => {
    beforeEach((done) => {
      const supportToken = {
        userId: 'agent-123',
        role: 'support' as UserRole,
        firstName: 'Agent',
        lastName: 'Smith',
      };
      (jwt.verify as jest.Mock).mockReturnValue(supportToken);
      clientSocket = ioClient(`http://localhost:${mockPort}`, {
        auth: { token: mockToken },
      });
      clientSocket.on('connect', () => {
        const agentSession = { ...mockSession, agent_id: 'agent-123', status: 'waiting' as const };
        (chatService.getChatSession as jest.Mock).mockResolvedValue(agentSession);
        (chatService.getSessionMessages as jest.Mock).mockResolvedValue([]);
        (chatService.markSessionMessagesAsRead as jest.Mock).mockResolvedValue(undefined);
        clientSocket.emit('join_session', { session_id: 'session-123' });
        clientSocket.once('session_joined', () => done());
      });
    });

    it('should accept chat successfully as support agent', (done) => {
      const waitingSession = { ...mockSession, status: 'waiting' as const };
      const activeSession = { ...mockSession, status: 'active' as const, agent_id: 'agent-123' };
      (chatService.getChatSession as jest.Mock).mockResolvedValue(waitingSession);
      (chatService.assignAgent as jest.Mock).mockResolvedValue(activeSession);

      clientSocket.emit('accept_chat', { session_id: 'session-123' });

      clientSocket.on('chat_accepted', (data) => {
        expect(data.session).toEqual(activeSession);
        expect(data.agent_id).toBe('agent-123');
        expect(data.agent_name).toBe('Agent Smith');
        expect(chatService.assignAgent).toHaveBeenCalledWith('session-123', 'agent-123');
        done();
      });
    });

    it('should accept chat successfully as admin', (done) => {
      const adminToken = {
        userId: 'admin-123',
        role: 'admin' as UserRole,
        firstName: 'Admin',
        lastName: 'User',
      };
      (jwt.verify as jest.Mock).mockReturnValue(adminToken);

      const adminClient = ioClient(`http://localhost:${mockPort}`, {
        auth: { token: mockToken },
      });

      adminClient.on('connect', () => {
        const waitingSession = { ...mockSession, status: 'waiting' as const };
        const activeSession = { ...mockSession, status: 'active' as const, agent_id: 'admin-123' };
        (chatService.getChatSession as jest.Mock).mockResolvedValue(waitingSession);
        (chatService.getSessionMessages as jest.Mock).mockResolvedValue([]);
        (chatService.markSessionMessagesAsRead as jest.Mock).mockResolvedValue(undefined);
        (chatService.assignAgent as jest.Mock).mockResolvedValue(activeSession);

        adminClient.emit('join_session', { session_id: 'session-123' });

        adminClient.once('session_joined', () => {
          adminClient.emit('accept_chat', { session_id: 'session-123' });

          adminClient.on('chat_accepted', (data) => {
            expect(data.agent_id).toBe('admin-123');
            adminClient.disconnect();
            done();
          });
        });
      });
    });

    it('should emit session_status_changed globally', (done) => {
      const waitingSession = { ...mockSession, status: 'waiting' as const };
      const activeSession = { ...mockSession, status: 'active' as const, agent_id: 'agent-123' };
      (chatService.getChatSession as jest.Mock).mockResolvedValue(waitingSession);
      (chatService.assignAgent as jest.Mock).mockResolvedValue(activeSession);

      clientSocket.emit('accept_chat', { session_id: 'session-123' });

      clientSocket.on('session_status_changed', (data) => {
        expect(data.session_id).toBe('session-123');
        expect(data.status).toBe('active');
        expect(data.agent_id).toBe('agent-123');
        done();
      });
    });

    it('should return error when non-support user tries to accept', (done) => {
      const customerToken = {
        userId: 'customer-123',
        role: 'customer' as UserRole,
        firstName: 'Customer',
        lastName: 'User',
      };
      (jwt.verify as jest.Mock).mockReturnValue(customerToken);

      const customerClient = ioClient(`http://localhost:${mockPort}`, {
        auth: { token: mockToken },
      });

      customerClient.on('connect', () => {
        customerClient.emit('accept_chat', { session_id: 'session-123' });

        customerClient.on('error', (data) => {
          expect(data.message).toBe('Only support agents can accept chats');
          customerClient.disconnect();
          done();
        });
      });
    });

    it('should return error when session not found', (done) => {
      (chatService.getChatSession as jest.Mock).mockResolvedValue(null);

      clientSocket.emit('accept_chat', { session_id: 'nonexistent' });

      clientSocket.on('error', (data) => {
        expect(data.message).toBe('Session not found');
        done();
      });
    });

    it('should return error when chat already accepted', (done) => {
      const activeSession = { ...mockSession, status: 'active' as const };
      (chatService.getChatSession as jest.Mock).mockResolvedValue(activeSession);

      clientSocket.emit('accept_chat', { session_id: 'session-123' });

      clientSocket.on('error', (data) => {
        expect(data.message).toBe('Chat already accepted');
        done();
      });
    });

    it('should handle errors during accept gracefully', (done) => {
      const waitingSession = { ...mockSession, status: 'waiting' as const };
      const error = new Error('Accept error');
      (chatService.getChatSession as jest.Mock).mockResolvedValue(waitingSession);
      (chatService.assignAgent as jest.Mock).mockRejectedValue(error);

      clientSocket.emit('accept_chat', { session_id: 'session-123' });

      clientSocket.on('error', (data) => {
        expect(data.message).toBe('Failed to accept chat');
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error accepting chat:', error);
        done();
      });
    });
  });

  describe('close_chat Event', () => {
    beforeEach((done) => {
      const supportToken = {
        userId: 'agent-123',
        role: 'support' as UserRole,
        firstName: 'Agent',
        lastName: 'Smith',
      };
      (jwt.verify as jest.Mock).mockReturnValue(supportToken);
      clientSocket = ioClient(`http://localhost:${mockPort}`, {
        auth: { token: mockToken },
      });
      clientSocket.on('connect', () => {
        const agentSession = { ...mockSession, agent_id: 'agent-123' };
        (chatService.getChatSession as jest.Mock).mockResolvedValue(agentSession);
        (chatService.getSessionMessages as jest.Mock).mockResolvedValue([]);
        (chatService.markSessionMessagesAsRead as jest.Mock).mockResolvedValue(undefined);
        clientSocket.emit('join_session', { session_id: 'session-123' });
        clientSocket.once('session_joined', () => done());
      });
    });

    it('should close chat successfully as agent', (done) => {
      const agentSession = { ...mockSession, agent_id: 'agent-123' };
      const closedSession = { ...mockSession, status: 'closed' as const };
      (chatService.getChatSession as jest.Mock).mockResolvedValue(agentSession);
      (chatService.updateSessionStatus as jest.Mock).mockResolvedValue(closedSession);

      clientSocket.emit('close_chat', { session_id: 'session-123' });

      clientSocket.on('chat_closed', (data) => {
        expect(data.session).toEqual(closedSession);
        expect(data.closed_by).toBe('agent-123');
        expect(chatService.updateSessionStatus).toHaveBeenCalledWith('session-123', 'closed');
        done();
      });
    });

    it('should close chat successfully as admin', (done) => {
      const adminToken = {
        userId: 'admin-123',
        role: 'admin' as UserRole,
        firstName: 'Admin',
        lastName: 'User',
      };
      (jwt.verify as jest.Mock).mockReturnValue(adminToken);

      const adminClient = ioClient(`http://localhost:${mockPort}`, {
        auth: { token: mockToken },
      });

      adminClient.on('connect', () => {
        const closedSession = { ...mockSession, status: 'closed' as const };
        (chatService.getChatSession as jest.Mock).mockResolvedValue(mockSession);
        (chatService.getSessionMessages as jest.Mock).mockResolvedValue([]);
        (chatService.markSessionMessagesAsRead as jest.Mock).mockResolvedValue(undefined);
        (chatService.updateSessionStatus as jest.Mock).mockResolvedValue(closedSession);

        adminClient.emit('join_session', { session_id: 'session-123' });

        adminClient.once('session_joined', () => {
          adminClient.emit('close_chat', { session_id: 'session-123' });

          adminClient.on('chat_closed', (data) => {
            expect(data.closed_by).toBe('admin-123');
            adminClient.disconnect();
            done();
          });
        });
      });
    });

    it('should emit session_status_changed globally', (done) => {
      const agentSession = { ...mockSession, agent_id: 'agent-123' };
      const closedSession = { ...mockSession, status: 'closed' as const };
      (chatService.getChatSession as jest.Mock).mockResolvedValue(agentSession);
      (chatService.updateSessionStatus as jest.Mock).mockResolvedValue(closedSession);

      clientSocket.emit('close_chat', { session_id: 'session-123' });

      clientSocket.on('session_status_changed', (data) => {
        expect(data.session_id).toBe('session-123');
        expect(data.status).toBe('closed');
        done();
      });
    });

    it('should return error when session not found', (done) => {
      (chatService.getChatSession as jest.Mock).mockResolvedValue(null);

      clientSocket.emit('close_chat', { session_id: 'nonexistent' });

      clientSocket.on('error', (data) => {
        expect(data.message).toBe('Session not found');
        done();
      });
    });

    it('should return error when unauthorized to close', (done) => {
      const customerToken = {
        userId: 'customer-123',
        role: 'customer' as UserRole,
        firstName: 'Customer',
        lastName: 'User',
      };
      (jwt.verify as jest.Mock).mockReturnValue(customerToken);

      const customerClient = ioClient(`http://localhost:${mockPort}`, {
        auth: { token: mockToken },
      });

      customerClient.on('connect', () => {
        (chatService.getChatSession as jest.Mock).mockResolvedValue(mockSession);
        customerClient.emit('close_chat', { session_id: 'session-123' });

        customerClient.on('error', (data) => {
          expect(data.message).toBe('Unauthorized to close this chat');
          customerClient.disconnect();
          done();
        });
      });
    });

    it('should handle errors during close gracefully', (done) => {
      const agentSession = { ...mockSession, agent_id: 'agent-123' };
      const error = new Error('Close error');
      (chatService.getChatSession as jest.Mock).mockResolvedValue(agentSession);
      (chatService.updateSessionStatus as jest.Mock).mockRejectedValue(error);

      clientSocket.emit('close_chat', { session_id: 'session-123' });

      clientSocket.on('error', (data) => {
        expect(data.message).toBe('Failed to close chat');
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error closing chat:', error);
        done();
      });
    });
  });

  describe('disconnect Event', () => {
    beforeEach((done) => {
      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);
      clientSocket = ioClient(`http://localhost:${mockPort}`, {
        auth: { token: mockToken },
      });
      clientSocket.on('connect', () => {
        (chatService.getChatSession as jest.Mock).mockResolvedValue(mockSession);
        (chatService.getSessionMessages as jest.Mock).mockResolvedValue([]);
        (chatService.markSessionMessagesAsRead as jest.Mock).mockResolvedValue(undefined);
        clientSocket.emit('join_session', { session_id: 'session-123' });
        clientSocket.once('session_joined', () => done());
      });
    });

    it('should handle disconnect and emit user_left', (done) => {
      const client2Token = {
        userId: 'user-456',
        role: 'support' as UserRole,
        firstName: 'Jane',
        lastName: 'Smith',
      };
      (jwt.verify as jest.Mock).mockReturnValue(client2Token);

      const client2 = ioClient(`http://localhost:${mockPort}`, {
        auth: { token: mockToken },
      });

      client2.on('connect', () => {
        const agentSession = { ...mockSession, agent_id: 'user-456' };
        (chatService.getChatSession as jest.Mock).mockResolvedValue(agentSession);
        client2.emit('join_session', { session_id: 'session-123' });

        client2.once('session_joined', () => {
          (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);

          client2.on('user_left', (data) => {
            expect(data.user_id).toBe(mockUserId);
            expect(data.role).toBe(mockUserRole);
            client2.disconnect();
            done();
          });

          clientSocket.disconnect();
        });
      });
    });

    it('should remove user from connected users on disconnect', (done) => {
      clientSocket.disconnect();

      setTimeout(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(`User disconnected: ${mockUserId}`);
        done();
      }, 100);
    });

    it('should clear typing timeouts on disconnect', (done) => {
      jest.useFakeTimers();
      (chatService.setTypingIndicator as jest.Mock).mockResolvedValue(undefined);

      clientSocket.emit('typing', { session_id: 'session-123' });

      setTimeout(() => {
        clientSocket.disconnect();

        setTimeout(() => {
          jest.useRealTimers();
          done();
        }, 100);
      }, 100);
    });

    it('should remove user from all sessions on disconnect', (done) => {
      const session2 = { ...mockSession, id: 'session-456' };
      (chatService.getChatSession as jest.Mock).mockResolvedValue(session2);
      (chatService.getSessionMessages as jest.Mock).mockResolvedValue([]);
      (chatService.markSessionMessagesAsRead as jest.Mock).mockResolvedValue(undefined);

      clientSocket.emit('join_session', { session_id: 'session-456' });

      clientSocket.once('session_joined', () => {
        clientSocket.disconnect();

        setTimeout(() => {
          expect(consoleLogSpy).toHaveBeenCalledWith(`User disconnected: ${mockUserId}`);
          done();
        }, 100);
      });
    });
  });

  describe('getSessionParticipants', () => {
    beforeEach((done) => {
      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);
      clientSocket = ioClient(`http://localhost:${mockPort}`, {
        auth: { token: mockToken },
      });
      clientSocket.on('connect', () => {
        (chatService.getChatSession as jest.Mock).mockResolvedValue(mockSession);
        (chatService.getSessionMessages as jest.Mock).mockResolvedValue([]);
        (chatService.markSessionMessagesAsRead as jest.Mock).mockResolvedValue(undefined);
        clientSocket.emit('join_session', { session_id: 'session-123' });
        clientSocket.once('session_joined', () => done());
      });
    });

    it('should include participants in session_joined event', (done) => {
      const client2Token = {
        userId: 'user-456',
        role: 'support' as UserRole,
        firstName: 'Jane',
        lastName: 'Smith',
      };
      (jwt.verify as jest.Mock).mockReturnValue(client2Token);

      const client2 = ioClient(`http://localhost:${mockPort}`, {
        auth: { token: mockToken },
      });

      client2.on('connect', () => {
        const agentSession = { ...mockSession, agent_id: 'user-456' };
        (chatService.getChatSession as jest.Mock).mockResolvedValue(agentSession);
        client2.emit('join_session', { session_id: 'session-123' });

        client2.once('session_joined', (data) => {
          expect(data.participants).toBeDefined();
          expect(Array.isArray(data.participants)).toBe(true);
          expect(data.participants.length).toBeGreaterThan(0);
          expect(data.participants[0]).toHaveProperty('user_id');
          expect(data.participants[0]).toHaveProperty('role');
          expect(data.participants[0]).toHaveProperty('name');
          expect(data.participants[0]).toHaveProperty('online');
          client2.disconnect();
          done();
        });
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle multiple simultaneous connections from same user', (done) => {
      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);

      const client1 = ioClient(`http://localhost:${mockPort}`, {
        auth: { token: mockToken },
      });

      const client2 = ioClient(`http://localhost:${mockPort}`, {
        auth: { token: mockToken },
      });

      let connectedCount = 0;

      const checkBothConnected = () => {
        connectedCount++;
        if (connectedCount === 2) {
          expect(consoleLogSpy).toHaveBeenCalledWith(
            `User connected: ${mockUserId} (${mockUserRole})`
          );
          client1.disconnect();
          client2.disconnect();
          done();
        }
      };

      client1.on('connect', checkBothConnected);
      client2.on('connect', checkBothConnected);
    });

    it('should handle rapid connect/disconnect cycles', (done) => {
      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);

      const client1 = ioClient(`http://localhost:${mockPort}`, {
        auth: { token: mockToken },
      });

      client1.on('connect', () => {
        client1.disconnect();

        setTimeout(() => {
          const client2 = ioClient(`http://localhost:${mockPort}`, {
            auth: { token: mockToken },
          });

          client2.on('connect', () => {
            client2.disconnect();
            done();
          });
        }, 100);
      });
    });

    it('should handle empty session_id in events', (done) => {
      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);
      clientSocket = ioClient(`http://localhost:${mockPort}`, {
        auth: { token: mockToken },
      });

      clientSocket.on('connect', () => {
        (chatService.getChatSession as jest.Mock).mockResolvedValue(null);
        clientSocket.emit('join_session', { session_id: '' });

        clientSocket.on('error', (data) => {
          expect(data.message).toBe('Session not found');
          done();
        });
      });
    });
  });
});
