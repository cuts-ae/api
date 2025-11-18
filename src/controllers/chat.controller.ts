import { Request, Response } from 'express';
import chatService from '../services/chat.service';
import { CreateChatSessionRequest } from '../types/chat.types';

export const createChatSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const data: CreateChatSessionRequest = req.body;

    console.log('=== API RECEIVED CREATE CHAT SESSION REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('restaurant_id received:', data.restaurant_id);
    console.log('restaurant_id type:', typeof data.restaurant_id);

    if (!data.subject) {
      res.status(400).json({
        success: false,
        error: 'Subject is required',
      });
      return;
    }

    const session = await chatService.createChatSession(data, userId);

    res.status(201).json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Error creating chat session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create chat session',
    });
  }
};

export const getChatSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    const session = await chatService.getChatSession(sessionId);

    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Session not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Error getting chat session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get chat session',
    });
  }
};

export const getSessionMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const messages = await chatService.getSessionMessages(sessionId, limit, offset);

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('Error getting session messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get messages',
    });
  }
};

export const sendMessageWithAttachment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { content, message_type = 'text' } = req.body;
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;
    const files = req.files as Express.Multer.File[];

    const session = await chatService.getChatSession(sessionId);

    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Session not found',
      });
      return;
    }

    const message = await chatService.sendMessage(
      sessionId,
      userId,
      userRole,
      content || null,
      message_type,
      false
    );

    if (files && files.length > 0) {
      for (const file of files) {
        const fileUrl = `/uploads/chat-attachments/${file.filename}`;
        await chatService.addAttachment(
          message.id,
          file.originalname,
          file.mimetype,
          file.size,
          fileUrl
        );
      }
    }

    const messageWithAttachments = await chatService.getSessionMessages(sessionId, 1, 0);

    res.status(201).json({
      success: true,
      data: messageWithAttachments[0],
    });
  } catch (error) {
    console.error('Error sending message with attachment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
    });
  }
};

export const uploadAttachment = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No files uploaded',
      });
      return;
    }

    const uploadedFiles = files.map(file => ({
      file_name: file.originalname,
      file_type: file.mimetype,
      file_size: file.size,
      file_url: `/uploads/chat-attachments/${file.filename}`,
    }));

    res.status(200).json({
      success: true,
      data: uploadedFiles,
    });
  } catch (error) {
    console.error('Error uploading attachment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload attachment',
    });
  }
};

export const markMessagesAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { message_ids } = req.body;
    const userId = (req as any).user?.userId;

    if (message_ids && Array.isArray(message_ids)) {
      for (const messageId of message_ids) {
        await chatService.markMessageAsRead(messageId, userId);
      }
    } else {
      await chatService.markSessionMessagesAsRead(sessionId, userId);
    }

    res.status(200).json({
      success: true,
      message: 'Messages marked as read',
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark messages as read',
    });
  }
};

export const assignAgentToSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    if (userRole !== 'support' && userRole !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Only support agents can accept chats',
      });
      return;
    }

    const session = await chatService.getChatSession(sessionId);

    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Session not found',
      });
      return;
    }

    if (session.status !== 'waiting') {
      res.status(400).json({
        success: false,
        error: 'Chat already accepted',
      });
      return;
    }

    const updatedSession = await chatService.assignAgent(sessionId, userId);

    res.status(200).json({
      success: true,
      data: updatedSession,
    });
  } catch (error) {
    console.error('Error assigning agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign agent',
    });
  }
};

export const updateSessionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { status } = req.body;
    const userId = (req as any).user?.userId;

    if (!status) {
      res.status(400).json({
        success: false,
        error: 'Status is required',
      });
      return;
    }

    const updatedSession = await chatService.updateSessionStatus(sessionId, status, userId);

    res.status(200).json({
      success: true,
      data: updatedSession,
    });
  } catch (error) {
    console.error('Error updating session status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update session status',
    });
  }
};

export const getActiveSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    let sessions;

    if (userRole === 'support' || userRole === 'admin') {
      sessions = await chatService.getActiveSessions(userId);
    } else {
      sessions = await chatService.getSessionsByCustomer(userId);
    }

    res.status(200).json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error('Error getting active sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sessions',
    });
  }
};

export const getUserSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;

    const sessions = await chatService.getSessionsByCustomer(userId);

    res.status(200).json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error('Error getting user sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sessions',
    });
  }
};
