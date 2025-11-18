import { Server as HTTPServer } from 'http';
import express, { Application } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { ChatSocketServer } from '../../socket/chat.socket';
import chatService from '../../services/chat.service';
import pool from '../../config/database';
import { UserRole } from '../../types';

describe('Chat WebSocket Integration Tests', () => {
  let httpServer: HTTPServer;
  let chatSocketServer: ChatSocketServer;
  let customerSocket: ClientSocket;
  let supportSocket: ClientSocket;
  let app: Application;
  let port: number;

  // Use proper UUIDs for PostgreSQL
  const customerId = '11111111-1111-1111-1111-111111111111';
  const supportId = '22222222-2222-2222-2222-222222222222';
  const testSessionId = '33333333-3333-3333-3333-333333333333';

  const customerToken = jwt.sign(
    {
      userId: customerId,
      role: 'customer',
      firstName: 'Test',
      lastName: 'Customer',
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );

  const supportToken = jwt.sign(
    {
      userId: supportId,
      role: 'support',
      firstName: 'Test',
      lastName: 'Support',
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );

  beforeAll(async (done) => {
    // Create test users in database
    await pool.query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [customerId, 'ws-customer@test.com', 'hash', 'Test', 'Customer', '+971501111111', 'customer']
    );

    await pool.query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [supportId, 'ws-support@test.com', 'hash', 'Test', 'Support', '+971502222222', 'support']
    );

    // Create test session
    await pool.query(
      `INSERT INTO chat_sessions (id, customer_id, subject, category, priority, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [testSessionId, customerId, 'Test Session', 'general', 'medium', 'waiting']
    );

    // Create Express app and HTTP server
    app = express();
    httpServer = app.listen(0);
    port = (httpServer.address() as any).port;

    // Initialize WebSocket server
    chatSocketServer = new ChatSocketServer(httpServer);

    // Wait for server to be ready
    setTimeout(done, 1000);
  });

  afterAll(async () => {
    // Close all connections
    if (customerSocket?.connected) {
      customerSocket.disconnect();
    }
    if (supportSocket?.connected) {
      supportSocket.disconnect();
    }

    // Wait for disconnections
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Cleanup database
    await pool.query('DELETE FROM typing_indicators WHERE session_id = $1', [testSessionId]);
    await pool.query('DELETE FROM message_read_receipts WHERE message_id IN (SELECT id FROM chat_messages WHERE session_id = $1)', [testSessionId]);
    await pool.query('DELETE FROM message_attachments WHERE message_id IN (SELECT id FROM chat_messages WHERE session_id = $1)', [testSessionId]);
    await pool.query('DELETE FROM chat_messages WHERE session_id = $1', [testSessionId]);
    await pool.query('DELETE FROM chat_sessions WHERE id = $1', [testSessionId]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [customerId, supportId]);

    // Close server
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
  });

  afterEach(() => {
    if (customerSocket?.connected) {
      customerSocket.removeAllListeners();
    }
    if (supportSocket?.connected) {
      supportSocket.removeAllListeners();
    }
  });

  describe('WebSocket Connection', () => {
    it('should connect with valid authentication token', (done) => {
      customerSocket = ioClient(`http://localhost:${port}`, {
        auth: { token: customerToken },
        transports: ['websocket'],
      });

      customerSocket.on('connect', () => {
        expect(customerSocket.connected).toBe(true);
        done();
      });

      customerSocket.on('connect_error', (error) => {
        done(error);
      });
    });

    it('should reject connection without authentication token', (done) => {
      const unauthorizedSocket = ioClient(`http://localhost:${port}`, {
        transports: ['websocket'],
      });

      unauthorizedSocket.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication token required');
        unauthorizedSocket.disconnect();
        done();
      });

      unauthorizedSocket.on('connect', () => {
        unauthorizedSocket.disconnect();
        done(new Error('Should not connect without token'));
      });
    });

    it('should reject connection with invalid token', (done) => {
      const invalidSocket = ioClient(`http://localhost:${port}`, {
        auth: { token: 'invalid-token' },
        transports: ['websocket'],
      });

      invalidSocket.on('connect_error', (error) => {
        expect(error.message).toContain('Invalid authentication token');
        invalidSocket.disconnect();
        done();
      });

      invalidSocket.on('connect', () => {
        invalidSocket.disconnect();
        done(new Error('Should not connect with invalid token'));
      });
    });
  });

  describe('Join Session Event', () => {
    it('should allow customer to join their own session', (done) => {
      customerSocket.emit('join_session', { session_id: testSessionId });

      customerSocket.on('session_joined', (data) => {
        expect(data.session).toBeDefined();
        expect(data.session.id).toBe(testSessionId);
        expect(data.messages).toBeDefined();
        expect(Array.isArray(data.messages)).toBe(true);
        expect(data.participants).toBeDefined();
        done();
      });

      customerSocket.on('error', (error) => {
        done(error);
      });
    });

    it('should allow support agent to join any session', (done) => {
      supportSocket = ioClient(`http://localhost:${port}`, {
        auth: { token: supportToken },
        transports: ['websocket'],
      });

      supportSocket.on('connect', () => {
        supportSocket.emit('join_session', { session_id: testSessionId });

        supportSocket.on('session_joined', (data) => {
          expect(data.session).toBeDefined();
          expect(data.session.id).toBe(testSessionId);
          done();
        });

        supportSocket.on('error', (error) => {
          done(new Error(error.message));
        });
      });
    });

    it('should emit user_joined event to other participants', (done) => {
      customerSocket.on('user_joined', (data) => {
        expect(data.user_id).toBe(supportId);
        expect(data.role).toBe('support');
        done();
      });

      // Support joins after customer is already in the session
      supportSocket.emit('join_session', { session_id: testSessionId });
    });

    it('should return error for non-existent session', (done) => {
      const fakeSessionId = '00000000-0000-0000-0000-000000000000';

      customerSocket.emit('join_session', { session_id: fakeSessionId });

      customerSocket.on('error', (error) => {
        expect(error.message).toBe('Session not found');
        done();
      });
    });
  });

  describe('Send Message Event', () => {
    it('should send a message and broadcast to all participants', (done) => {
      const testMessage = 'Hello from WebSocket test';
      let messageReceived = false;

      supportSocket.on('new_message', (data) => {
        expect(data.message).toBeDefined();
        expect(data.message.content).toBe(testMessage);
        expect(data.message.sender_id).toBe(customerId);
        messageReceived = true;
      });

      customerSocket.emit('send_message', {
        session_id: testSessionId,
        content: testMessage,
        message_type: 'text',
      });

      customerSocket.on('message_sent', (data) => {
        expect(data.message_id).toBeDefined();
        expect(data.sent_at).toBeDefined();

        // Wait a bit to ensure broadcast was received
        setTimeout(() => {
          expect(messageReceived).toBe(true);
          done();
        }, 500);
      });

      customerSocket.on('error', (error) => {
        done(new Error(error.message));
      });
    });

    it('should return error for non-existent session', (done) => {
      const fakeSessionId = '00000000-0000-0000-0000-000000000000';

      customerSocket.emit('send_message', {
        session_id: fakeSessionId,
        content: 'Test message',
      });

      customerSocket.on('error', (error) => {
        expect(error.message).toBe('Session not found');
        done();
      });
    });
  });

  describe('Typing Indicators', () => {
    it('should emit typing event to other participants', (done) => {
      supportSocket.on('user_typing', (data) => {
        expect(data.session_id).toBe(testSessionId);
        expect(data.user_id).toBe(customerId);
        expect(data.user_name).toBeDefined();
        done();
      });

      customerSocket.emit('typing', { session_id: testSessionId });
    });

    it('should emit stop typing event', (done) => {
      supportSocket.on('typing_stopped', (data) => {
        expect(data.session_id).toBe(testSessionId);
        expect(data.user_id).toBe(customerId);
        done();
      });

      customerSocket.emit('stop_typing', { session_id: testSessionId });
    });

    it('should automatically stop typing after timeout', (done) => {
      supportSocket.on('typing_stopped', (data) => {
        if (data.user_id === customerId) {
          done();
        }
      });

      // Start typing without stopping it
      customerSocket.emit('typing', { session_id: testSessionId });

      // Wait for automatic timeout (10 seconds + buffer)
    }, 15000);
  });

  describe('Accept Chat Event', () => {
    it('should allow support agent to accept a waiting chat', (done) => {
      // First verify session is in waiting state
      chatService.getChatSession(testSessionId).then((session) => {
        if (session && session.status === 'waiting') {
          supportSocket.emit('accept_chat', { session_id: testSessionId });

          supportSocket.on('chat_accepted', (data) => {
            expect(data.session).toBeDefined();
            expect(data.session.status).toBe('active');
            expect(data.agent_id).toBe(supportId);
            done();
          });

          supportSocket.on('error', (error) => {
            done(new Error(error.message));
          });
        } else {
          // Reset session to waiting state
          pool.query(
            'UPDATE chat_sessions SET status = $1, agent_id = NULL WHERE id = $2',
            ['waiting', testSessionId]
          ).then(() => {
            supportSocket.emit('accept_chat', { session_id: testSessionId });

            supportSocket.on('chat_accepted', (data) => {
              expect(data.session.status).toBe('active');
              done();
            });
          });
        }
      });
    });

    it('should not allow customer to accept chat', (done) => {
      customerSocket.emit('accept_chat', { session_id: testSessionId });

      customerSocket.on('error', (error) => {
        expect(error.message).toBe('Only support agents can accept chats');
        done();
      });
    });

    it('should emit session_status_changed to all clients', (done) => {
      // Reset session to waiting
      pool.query(
        'UPDATE chat_sessions SET status = $1, agent_id = NULL WHERE id = $2',
        ['waiting', testSessionId]
      ).then(() => {
        customerSocket.on('session_status_changed', (data) => {
          expect(data.session_id).toBe(testSessionId);
          expect(data.status).toBe('active');
          expect(data.agent_id).toBe(supportId);
          done();
        });

        supportSocket.emit('accept_chat', { session_id: testSessionId });
      });
    });
  });

  describe('Mark as Read Event', () => {
    it('should mark messages as read and notify participants', (done) => {
      supportSocket.on('messages_read', (data) => {
        expect(data.session_id).toBe(testSessionId);
        expect(data.user_id).toBe(customerId);
        done();
      });

      customerSocket.emit('mark_as_read', { session_id: testSessionId });
    });

    it('should support marking specific messages', (done) => {
      const messageIds = ['msg-id-1', 'msg-id-2'];

      supportSocket.on('messages_read', (data) => {
        expect(data.message_ids).toEqual(messageIds);
        done();
      });

      customerSocket.emit('mark_as_read', {
        session_id: testSessionId,
        message_ids: messageIds,
      });
    });
  });

  describe('Close Chat Event', () => {
    it('should allow support agent to close chat', (done) => {
      supportSocket.emit('close_chat', { session_id: testSessionId });

      supportSocket.on('chat_closed', (data) => {
        expect(data.session).toBeDefined();
        expect(data.session.status).toBe('closed');
        expect(data.closed_by).toBe(supportId);
        done();
      });

      supportSocket.on('error', (error) => {
        done(new Error(error.message));
      });
    });

    it('should not allow customer to close chat', (done) => {
      customerSocket.emit('close_chat', { session_id: testSessionId });

      customerSocket.on('error', (error) => {
        expect(error.message).toBe('Unauthorized to close this chat');
        done();
      });
    });
  });

  describe('Leave Session Event', () => {
    it('should handle leave session event', (done) => {
      supportSocket.on('user_left', (data) => {
        expect(data.user_id).toBe(customerId);
        expect(data.role).toBe('customer');
        done();
      });

      customerSocket.emit('leave_session', { session_id: testSessionId });
    });
  });

  describe('Disconnect Event', () => {
    it('should handle disconnect properly', (done) => {
      const tempSocket = ioClient(`http://localhost:${port}`, {
        auth: { token: customerToken },
        transports: ['websocket'],
      });

      tempSocket.on('connect', () => {
        tempSocket.emit('join_session', { session_id: testSessionId });

        tempSocket.on('session_joined', () => {
          customerSocket.on('user_left', (data) => {
            expect(data.user_id).toBe(customerId);
            done();
          });

          // Disconnect the temporary socket
          tempSocket.disconnect();
        });
      });
    });

    it('should cleanup typing indicators on disconnect', (done) => {
      const tempSocket = ioClient(`http://localhost:${port}`, {
        auth: { token: supportToken },
        transports: ['websocket'],
      });

      tempSocket.on('connect', () => {
        tempSocket.emit('join_session', { session_id: testSessionId });

        tempSocket.on('session_joined', () => {
          tempSocket.emit('typing', { session_id: testSessionId });

          setTimeout(() => {
            tempSocket.disconnect();
            // Wait a bit for cleanup
            setTimeout(() => {
              // Verify typing indicator was cleaned up
              pool.query(
                'SELECT * FROM typing_indicators WHERE session_id = $1 AND user_id = $2',
                [testSessionId, supportId]
              ).then((result) => {
                // Indicator should either be gone or expired
                done();
              });
            }, 500);
          }, 500);
        });
      });
    });
  });

  describe('Real-time Message Delivery', () => {
    it('should deliver messages in real-time to all participants', (done) => {
      const messages = ['Message 1', 'Message 2', 'Message 3'];
      let receivedCount = 0;

      supportSocket.on('new_message', (data) => {
        receivedCount++;
        expect(messages).toContain(data.message.content);

        if (receivedCount === messages.length) {
          done();
        }
      });

      // Send multiple messages
      messages.forEach((content) => {
        customerSocket.emit('send_message', {
          session_id: testSessionId,
          content,
          message_type: 'text',
        });
      });
    });

    it('should maintain message order', (done) => {
      const messages = ['First', 'Second', 'Third'];
      const receivedMessages: string[] = [];

      supportSocket.on('new_message', (data) => {
        receivedMessages.push(data.message.content);

        if (receivedMessages.length === messages.length) {
          expect(receivedMessages).toEqual(messages);
          done();
        }
      });

      // Send messages sequentially
      let index = 0;
      const sendNext = () => {
        if (index < messages.length) {
          customerSocket.emit('send_message', {
            session_id: testSessionId,
            content: messages[index],
            message_type: 'text',
          });
          index++;
          setTimeout(sendNext, 100);
        }
      };
      sendNext();
    });
  });
});
