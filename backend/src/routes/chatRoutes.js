import { Router } from 'express';
import {
  createConversation,
  sendChatRequest,
  respondToChatRequest,
  getPendingChatRequests,
  getMyConversations,
  getConversation,
  getMessages,
  sendMessage,
  markMessageRead,
  uploadChatImage,
  uploadChatAudio,
} from '../controllers/chatController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { chatImageUpload, chatAudioUpload } from '../middleware/chatUpload.js';

const router = Router();

router.use(requireAuth);

// Chat Request & Pre-Agreement communication routes (defined before :id)
router.post('/conversations/request', sendChatRequest);
router.get('/conversations/requests', getPendingChatRequests);

// General conversation routes
router.post('/conversations', createConversation);
router.get('/conversations', getMyConversations);

// Specific conversation operations
router.get('/conversations/:id', getConversation);
router.post('/conversations/:id/respond', respondToChatRequest);
router.get('/conversations/:id/messages', getMessages);
router.post('/conversations/:id/messages', sendMessage);

// Media attachment uploads
router.post('/conversations/:id/upload-image', chatImageUpload.single('image'), uploadChatImage);
router.post('/conversations/:id/upload-audio', chatAudioUpload.single('audio'), uploadChatAudio);

// Message operations
router.patch('/messages/:id/read', markMessageRead);

export default router;
