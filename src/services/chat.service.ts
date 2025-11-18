import { Pool } from 'pg';
import pool from '../config/database';
import {
  ChatSession,
  ChatMessage,
  MessageAttachment,
  MessageReadReceipt,
  CreateChatSessionRequest,
  ChatSessionWithDetails,
  UserRole,
  MessageType,
} from '../types/chat.types';

export class ChatService {
  private pool: Pool;

  constructor() {
    this.pool = pool;
  }

  async createChatSession(
    data: CreateChatSessionRequest,
    customerId?: string
  ): Promise<ChatSession> {
    const query = `
      INSERT INTO chat_sessions (
        subject, category, priority, restaurant_id, customer_id, status
      )
      VALUES ($1, $2, $3, $4, $5, 'waiting')
      RETURNING *
    `;

    const values = [
      data.subject,
      data.category || 'general',
      data.priority || 'medium',
      data.restaurant_id || null,
      customerId || null,
    ];

    const result = await this.pool.query(query, values);
    const session = result.rows[0];

    if (data.initial_message) {
      await this.sendMessage(
        session.id,
        customerId || null,
        'customer',
        data.initial_message,
        'text',
        false
      );
    }

    return session;
  }

  async getChatSession(sessionId: string): Promise<ChatSessionWithDetails | null> {
    const query = `
      SELECT cs.*,
        COALESCE(
          (SELECT COUNT(*)::int FROM chat_messages cm
           WHERE cm.session_id = cs.id
           AND cm.id NOT IN (
             SELECT message_id FROM message_read_receipts
             WHERE user_id = cs.customer_id
           )
           AND cm.sender_id != cs.customer_id
          ), 0
        ) as unread_count
      FROM chat_sessions cs
      WHERE cs.id = $1
    `;

    const result = await this.pool.query(query, [sessionId]);

    if (result.rows.length === 0) {
      return null;
    }

    const session = result.rows[0];

    const lastMessageQuery = `
      SELECT * FROM chat_messages
      WHERE session_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const lastMessageResult = await this.pool.query(lastMessageQuery, [sessionId]);

    return {
      ...session,
      last_message: lastMessageResult.rows[0] || null,
    };
  }

  async getSessionMessages(
    sessionId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ChatMessage[]> {
    const query = `
      SELECT
        cm.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ma.id,
              'file_name', ma.file_name,
              'file_type', ma.file_type,
              'file_size', ma.file_size,
              'file_url', ma.file_url,
              'thumbnail_url', ma.thumbnail_url,
              'created_at', ma.created_at
            )
          ) FILTER (WHERE ma.id IS NOT NULL), '[]'
        ) as attachments,
        COALESCE(
          json_agg(
            json_build_object(
              'id', mrr.id,
              'user_id', mrr.user_id,
              'read_at', mrr.read_at
            )
          ) FILTER (WHERE mrr.id IS NOT NULL), '[]'
        ) as read_by
      FROM chat_messages cm
      LEFT JOIN message_attachments ma ON cm.id = ma.message_id
      LEFT JOIN message_read_receipts mrr ON cm.id = mrr.message_id
      WHERE cm.session_id = $1
      GROUP BY cm.id
      ORDER BY cm.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await this.pool.query(query, [sessionId, limit, offset]);
    return result.rows;
  }

  async sendMessage(
    sessionId: string,
    senderId: string | null,
    senderRole: UserRole,
    content: string | null,
    messageType: MessageType = 'text',
    isSystemMessage: boolean = false
  ): Promise<ChatMessage> {
    const query = `
      INSERT INTO chat_messages (
        session_id, sender_id, sender_role, content, message_type, is_system_message
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [sessionId, senderId, senderRole, content, messageType, isSystemMessage];
    const result = await this.pool.query(query, values);

    return result.rows[0];
  }

  async addAttachment(
    messageId: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    fileUrl: string,
    thumbnailUrl?: string
  ): Promise<MessageAttachment> {
    const query = `
      INSERT INTO message_attachments (
        message_id, file_name, file_type, file_size, file_url, thumbnail_url
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [messageId, fileName, fileType, fileSize, fileUrl, thumbnailUrl];
    const result = await this.pool.query(query, values);

    return result.rows[0];
  }

  async markMessageAsRead(messageId: string, userId: string): Promise<MessageReadReceipt> {
    const query = `
      INSERT INTO message_read_receipts (message_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (message_id, user_id) DO UPDATE
      SET read_at = NOW()
      RETURNING *
    `;

    const result = await this.pool.query(query, [messageId, userId]);
    return result.rows[0];
  }

  async markSessionMessagesAsRead(sessionId: string, userId: string): Promise<void> {
    const query = `
      INSERT INTO message_read_receipts (message_id, user_id)
      SELECT id, $2 FROM chat_messages
      WHERE session_id = $1 AND sender_id != $2
      ON CONFLICT (message_id, user_id) DO UPDATE
      SET read_at = NOW()
    `;

    await this.pool.query(query, [sessionId, userId]);
  }

  async assignAgent(sessionId: string, agentId: string): Promise<ChatSession> {
    const query = `
      UPDATE chat_sessions
      SET agent_id = $1, status = 'active', agent_accepted_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await this.pool.query(query, [agentId, sessionId]);

    await this.sendMessage(
      sessionId,
      null,
      'support',
      `Support agent has joined the conversation`,
      'system',
      true
    );

    return result.rows[0];
  }

  async updateSessionStatus(
    sessionId: string,
    status: string,
    agentId?: string
  ): Promise<ChatSession> {
    const closedAt = status === 'closed' ? 'NOW()' : 'closed_at';

    const query = `
      UPDATE chat_sessions
      SET status = $1, closed_at = ${closedAt}
      WHERE id = $2
      RETURNING *
    `;

    const result = await this.pool.query(query, [status, sessionId]);

    if (status === 'closed') {
      await this.sendMessage(
        sessionId,
        null,
        'support',
        `Chat session has been closed`,
        'system',
        true
      );
    }

    return result.rows[0];
  }

  async getActiveSessions(agentId?: string): Promise<ChatSessionWithDetails[]> {
    let query = `
      SELECT cs.*,
        COALESCE(
          (SELECT COUNT(*)::int FROM chat_messages cm
           WHERE cm.session_id = cs.id
           AND cm.id NOT IN (
             SELECT message_id FROM message_read_receipts
             WHERE user_id = cs.agent_id
           )
           AND cm.sender_id != cs.agent_id
          ), 0
        ) as unread_count,
        u.first_name || ' ' || u.last_name as customer_name,
        r.name as restaurant_name
      FROM chat_sessions cs
      LEFT JOIN users u ON cs.customer_id = u.id
      LEFT JOIN restaurants r ON cs.restaurant_id = r.id
      WHERE cs.status IN ('waiting', 'active')
    `;

    const params: any[] = [];

    if (agentId) {
      query += ` AND (cs.agent_id = $1 OR cs.status = 'waiting')`;
      params.push(agentId);
    }

    query += ` ORDER BY cs.created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getSessionsByCustomer(customerId: string): Promise<ChatSessionWithDetails[]> {
    const query = `
      SELECT cs.*,
        COALESCE(
          (SELECT COUNT(*)::int FROM chat_messages cm
           WHERE cm.session_id = cs.id
           AND cm.id NOT IN (
             SELECT message_id FROM message_read_receipts
             WHERE user_id = $1
           )
           AND cm.sender_id != $1
          ), 0
        ) as unread_count
      FROM chat_sessions cs
      WHERE cs.customer_id = $1
      ORDER BY cs.last_message_at DESC NULLS LAST, cs.created_at DESC
    `;

    const result = await this.pool.query(query, [customerId]);
    return result.rows;
  }

  async setTypingIndicator(sessionId: string, userId: string): Promise<void> {
    const query = `
      INSERT INTO typing_indicators (session_id, user_id, started_at, expires_at)
      VALUES ($1, $2, NOW(), NOW() + INTERVAL '10 seconds')
      ON CONFLICT (session_id, user_id)
      DO UPDATE SET started_at = NOW(), expires_at = NOW() + INTERVAL '10 seconds'
    `;

    await this.pool.query(query, [sessionId, userId]);
  }

  async removeTypingIndicator(sessionId: string, userId: string): Promise<void> {
    const query = `
      DELETE FROM typing_indicators
      WHERE session_id = $1 AND user_id = $2
    `;

    await this.pool.query(query, [sessionId, userId]);
  }

  async getTypingUsers(sessionId: string): Promise<string[]> {
    const query = `
      SELECT user_id FROM typing_indicators
      WHERE session_id = $1 AND expires_at > NOW()
    `;

    const result = await this.pool.query(query, [sessionId]);
    return result.rows.map(row => row.user_id);
  }

  async cleanupExpiredTypingIndicators(): Promise<void> {
    const query = `DELETE FROM typing_indicators WHERE expires_at < NOW()`;
    await this.pool.query(query);
  }
}

export default new ChatService();
