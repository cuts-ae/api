import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import chatService from '../services/chat.service';
import { UserRole } from '../types/chat.types';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: UserRole;
  userName?: string;
}

interface SocketUser {
  socketId: string;
  userId: string;
  role: UserRole;
  name: string;
  connectedAt: Date;
}

export class ChatSocketServer {
  private io: SocketIOServer;
  private connectedUsers: Map<string, SocketUser[]> = new Map();
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: [
          'http://localhost:45001',
          'http://localhost:45002',
          'http://localhost:45003',
          'http://localhost:45004',
          'http://84.8.146.121:45001',
          'https://restaurant.trylassen.com',
        ],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    this.startTypingCleanup();
  }

  private setupMiddleware(): void {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
          return next(new Error('Server configuration error'));
        }

        const decoded = jwt.verify(token, secret) as {
          userId: string;
          role: UserRole;
          firstName: string;
          lastName: string;
        };

        socket.userId = decoded.userId;
        socket.userRole = decoded.role;
        socket.userName = `${decoded.firstName} ${decoded.lastName}`;

        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User connected: ${socket.userId} (${socket.userRole})`);

      this.handleJoinSession(socket);
      this.handleLeaveSession(socket);
      this.handleSendMessage(socket);
      this.handleTyping(socket);
      this.handleStopTyping(socket);
      this.handleMarkAsRead(socket);
      this.handleAcceptChat(socket);
      this.handleCloseChat(socket);
      this.handleDisconnect(socket);
    });
  }

  private handleJoinSession(socket: AuthenticatedSocket): void {
    socket.on('join_session', async (data: { session_id: string }) => {
      try {
        const { session_id } = data;

        const session = await chatService.getChatSession(session_id);

        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        const canJoin =
          socket.userId === session.customer_id ||
          socket.userId === session.agent_id ||
          socket.userRole === 'admin' ||
          socket.userRole === 'support';

        if (!canJoin) {
          socket.emit('error', { message: 'Unauthorized to join this session' });
          return;
        }

        socket.join(session_id);

        const userList = this.connectedUsers.get(session_id) || [];
        userList.push({
          socketId: socket.id,
          userId: socket.userId!,
          role: socket.userRole!,
          name: socket.userName!,
          connectedAt: new Date(),
        });
        this.connectedUsers.set(session_id, userList);

        const messages = await chatService.getSessionMessages(session_id, 50, 0);

        socket.emit('session_joined', {
          session,
          messages: messages.reverse(),
          participants: this.getSessionParticipants(session_id),
        });

        this.io.to(session_id).emit('user_joined', {
          user_id: socket.userId,
          role: socket.userRole,
          name: socket.userName,
        });

        await chatService.markSessionMessagesAsRead(session_id, socket.userId!);
        this.io.to(session_id).emit('messages_read', {
          session_id,
          user_id: socket.userId,
        });
      } catch (error) {
        console.error('Error joining session:', error);
        socket.emit('error', { message: 'Failed to join session' });
      }
    });
  }

  private handleLeaveSession(socket: AuthenticatedSocket): void {
    socket.on('leave_session', (data: { session_id: string }) => {
      const { session_id } = data;
      socket.leave(session_id);

      const userList = this.connectedUsers.get(session_id) || [];
      const updatedList = userList.filter(u => u.socketId !== socket.id);

      if (updatedList.length === 0) {
        this.connectedUsers.delete(session_id);
      } else {
        this.connectedUsers.set(session_id, updatedList);
      }

      this.io.to(session_id).emit('user_left', {
        user_id: socket.userId,
        role: socket.userRole,
      });
    });
  }

  private handleSendMessage(socket: AuthenticatedSocket): void {
    socket.on('send_message', async (data: {
      session_id: string;
      content: string;
      message_type?: 'text' | 'image' | 'file';
    }) => {
      try {
        const { session_id, content, message_type = 'text' } = data;

        const session = await chatService.getChatSession(session_id);

        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        const message = await chatService.sendMessage(
          session_id,
          socket.userId!,
          socket.userRole!,
          content,
          message_type,
          false
        );

        await chatService.removeTypingIndicator(session_id, socket.userId!);

        this.io.to(session_id).emit('new_message', {
          message: {
            ...message,
            sender_name: socket.userName,
          },
        });

        this.io.to(session_id).emit('typing_stopped', {
          session_id,
          user_id: socket.userId,
        });

        socket.emit('message_sent', {
          message_id: message.id,
          temp_id: data['temp_id'],
          sent_at: message.created_at,
        });
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
  }

  private handleTyping(socket: AuthenticatedSocket): void {
    socket.on('typing', async (data: { session_id: string }) => {
      try {
        const { session_id } = data;

        await chatService.setTypingIndicator(session_id, socket.userId!);

        socket.to(session_id).emit('user_typing', {
          session_id,
          user_id: socket.userId,
          user_name: socket.userName,
        });

        const timeoutKey = `${session_id}:${socket.userId}`;
        if (this.typingTimeouts.has(timeoutKey)) {
          clearTimeout(this.typingTimeouts.get(timeoutKey)!);
        }

        const timeout = setTimeout(async () => {
          await chatService.removeTypingIndicator(session_id, socket.userId!);
          socket.to(session_id).emit('typing_stopped', {
            session_id,
            user_id: socket.userId,
          });
          this.typingTimeouts.delete(timeoutKey);
        }, 10000);

        this.typingTimeouts.set(timeoutKey, timeout);
      } catch (error) {
        console.error('Error setting typing indicator:', error);
      }
    });
  }

  private handleStopTyping(socket: AuthenticatedSocket): void {
    socket.on('stop_typing', async (data: { session_id: string }) => {
      try {
        const { session_id } = data;

        await chatService.removeTypingIndicator(session_id, socket.userId!);

        const timeoutKey = `${session_id}:${socket.userId}`;
        if (this.typingTimeouts.has(timeoutKey)) {
          clearTimeout(this.typingTimeouts.get(timeoutKey)!);
          this.typingTimeouts.delete(timeoutKey);
        }

        socket.to(session_id).emit('typing_stopped', {
          session_id,
          user_id: socket.userId,
        });
      } catch (error) {
        console.error('Error removing typing indicator:', error);
      }
    });
  }

  private handleMarkAsRead(socket: AuthenticatedSocket): void {
    socket.on('mark_as_read', async (data: { session_id: string; message_ids?: string[] }) => {
      try {
        const { session_id, message_ids } = data;

        if (message_ids && message_ids.length > 0) {
          for (const messageId of message_ids) {
            await chatService.markMessageAsRead(messageId, socket.userId!);
          }
        } else {
          await chatService.markSessionMessagesAsRead(session_id, socket.userId!);
        }

        this.io.to(session_id).emit('messages_read', {
          session_id,
          user_id: socket.userId,
          message_ids,
        });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });
  }

  private handleAcceptChat(socket: AuthenticatedSocket): void {
    socket.on('accept_chat', async (data: { session_id: string }) => {
      try {
        const { session_id } = data;

        if (socket.userRole !== 'support' && socket.userRole !== 'admin') {
          socket.emit('error', { message: 'Only support agents can accept chats' });
          return;
        }

        const session = await chatService.getChatSession(session_id);

        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        if (session.status !== 'waiting') {
          socket.emit('error', { message: 'Chat already accepted' });
          return;
        }

        const updatedSession = await chatService.assignAgent(session_id, socket.userId!);

        this.io.to(session_id).emit('chat_accepted', {
          session: updatedSession,
          agent_id: socket.userId,
          agent_name: socket.userName,
        });

        this.io.emit('session_status_changed', {
          session_id,
          status: 'active',
          agent_id: socket.userId,
        });
      } catch (error) {
        console.error('Error accepting chat:', error);
        socket.emit('error', { message: 'Failed to accept chat' });
      }
    });
  }

  private handleCloseChat(socket: AuthenticatedSocket): void {
    socket.on('close_chat', async (data: { session_id: string }) => {
      try {
        const { session_id } = data;

        const session = await chatService.getChatSession(session_id);

        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        const canClose =
          socket.userId === session.agent_id ||
          socket.userRole === 'admin' ||
          socket.userRole === 'support';

        if (!canClose) {
          socket.emit('error', { message: 'Unauthorized to close this chat' });
          return;
        }

        const updatedSession = await chatService.updateSessionStatus(session_id, 'closed');

        this.io.to(session_id).emit('chat_closed', {
          session: updatedSession,
          closed_by: socket.userId,
        });

        this.io.emit('session_status_changed', {
          session_id,
          status: 'closed',
        });
      } catch (error) {
        console.error('Error closing chat:', error);
        socket.emit('error', { message: 'Failed to close chat' });
      }
    });
  }

  private handleDisconnect(socket: AuthenticatedSocket): void {
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);

      this.connectedUsers.forEach((userList, sessionId) => {
        const updatedList = userList.filter(u => u.socketId !== socket.id);

        if (updatedList.length === 0) {
          this.connectedUsers.delete(sessionId);
        } else {
          this.connectedUsers.set(sessionId, updatedList);
        }

        if (userList.some(u => u.socketId === socket.id)) {
          this.io.to(sessionId).emit('user_left', {
            user_id: socket.userId,
            role: socket.userRole,
          });
        }
      });

      this.typingTimeouts.forEach((timeout, key) => {
        if (key.endsWith(`:${socket.userId}`)) {
          clearTimeout(timeout);
          this.typingTimeouts.delete(key);
        }
      });
    });
  }

  private getSessionParticipants(sessionId: string) {
    const userList = this.connectedUsers.get(sessionId) || [];
    return userList.map(u => ({
      user_id: u.userId,
      role: u.role,
      name: u.name,
      online: true,
    }));
  }

  private startTypingCleanup(): void {
    setInterval(async () => {
      try {
        await chatService.cleanupExpiredTypingIndicators();
      } catch (error) {
        console.error('Error cleaning up typing indicators:', error);
      }
    }, 30000);
  }

  public getIO(): SocketIOServer {
    return this.io;
  }
}
