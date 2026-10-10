// Supabase-backed Message Model
import createModel from './supabaseModel.js';

const Message = createModel('messages', {
  conversationId: null,
  senderId: null,
  receiverId: null,
  messageType: 'text',
  content: '',
  attachments: [],
  translatedContent: '',
  translationLanguage: '',
  translations: {},
  isTranslated: false,
  isRead: false,
  readAt: null,
});

export default Message;
