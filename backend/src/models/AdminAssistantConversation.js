// Supabase-backed AdminAssistantConversation Model
import createModel from './supabaseModel.js';

export const AdminAssistantConversation = createModel('admin_assistant_conversations', {
  adminId: null,
  question: '',
  intent: '',
  response: '',
  sources: [],
  metrics: {},
  records: [],
});

export default AdminAssistantConversation;
