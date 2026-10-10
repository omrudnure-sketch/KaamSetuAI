import { Router } from 'express';
import {
  createConversation,
  getMyConversations,
  getConversation,
  getMessages,
  sendMessage,
  markMessageRead,
} from '../controllers/chatController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.post('/conversations', createConversation);
router.get('/conversations', getMyConversations);
router.get('/conversations/:id', getConversation);
router.get('/conversations/:id/messages', getMessages);
router.post('/conversations/:id/messages', sendMessage);
router.patch('/messages/:id/read', markMessageRead);

export default router;
