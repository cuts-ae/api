import { Router } from 'express';
import {
  createChatSession,
  getChatSession,
  getSessionMessages,
  sendMessageWithAttachment,
  uploadAttachment,
  markMessagesAsRead,
  assignAgentToSession,
  updateSessionStatus,
  getActiveSessions,
  getUserSessions,
} from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth';
import { uploadChatAttachments } from '../middleware/upload';

const router = Router();

router.use(authenticate);

router.post('/sessions', createChatSession);

router.get('/sessions', getActiveSessions);

router.get('/sessions/my', getUserSessions);

router.get('/sessions/:sessionId', getChatSession);

router.get('/sessions/:sessionId/messages', getSessionMessages);

router.post('/sessions/:sessionId/messages', uploadChatAttachments, sendMessageWithAttachment);

router.post('/upload', uploadChatAttachments, uploadAttachment);

router.post('/sessions/:sessionId/read', markMessagesAsRead);

router.post('/sessions/:sessionId/assign', assignAgentToSession);

router.patch('/sessions/:sessionId/status', updateSessionStatus);

export default router;
