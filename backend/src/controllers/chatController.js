import * as chatService from '../services/chatService.js';
import {
  validateConversationInput,
  validateSendChatRequestInput,
  validateRespondChatRequestInput,
  validateSendMessageInput,
} from '../validators/chatValidator.js';

export const createConversation = async (req, res) => {
  try {
    const validation = validateConversationInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: validation.error });
    }

    const conversation = await chatService.createConversation(req.user, validation.data);
    return res.status(201).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create conversation',
    });
  }
};

export const sendChatRequest = async (req, res) => {
  try {
    const validation = validateSendChatRequestInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: validation.error });
    }

    const conversation = await chatService.sendChatRequest(req.user, validation.data);
    return res.status(201).json({
      success: true,
      message: 'Chat request sent successfully',
      data: conversation,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to send chat request',
    });
  }
};

export const respondToChatRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const validation = validateRespondChatRequestInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: validation.error });
    }

    const conversation = await chatService.respondToChatRequest(req.user, id, validation.data.action);
    return res.status(200).json({
      success: true,
      message: `Chat request ${validation.data.action}ed successfully`,
      data: conversation,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to respond to chat request',
    });
  }
};

export const getPendingChatRequests = async (req, res) => {
  try {
    const requests = await chatService.getPendingChatRequests(req.user);
    return res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch chat requests',
    });
  }
};

export const getMyConversations = async (req, res) => {
  try {
    const conversations = await chatService.getUserConversations(req.user);
    return res.status(200).json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch conversations',
    });
  }
};

export const getConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const conversation = await chatService.getConversation(req.user, id);
    return res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch conversation',
    });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { id } = req.params; // conversationId
    const validation = validateSendMessageInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: validation.error });
    }

    const message = await chatService.sendMessage(req.user, id, validation.data);
    return res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to send message',
    });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id } = req.params; // conversationId
    const messages = await chatService.getMessages(req.user, id);
    return res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch messages',
    });
  }
};

export const markMessageRead = async (req, res) => {
  try {
    const { id } = req.params; // messageId
    const message = await chatService.markMessageRead(req.user, id);
    return res.status(200).json({
      success: true,
      data: message,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to mark message as read',
    });
  }
};

// Upload chat image attachment
export const uploadChatImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }

    const fileUrl = `/uploads/chat/images/${req.file.filename}`;
    return res.status(200).json({
      success: true,
      data: {
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload image',
    });
  }
};

// Upload chat audio recording
export const uploadChatAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No audio file uploaded' });
    }

    const fileUrl = `/uploads/chat/audio/${req.file.filename}`;
    const duration = parseInt(req.body.duration, 10) || 0;

    return res.status(200).json({
      success: true,
      data: {
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        duration,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload audio',
    });
  }
};
