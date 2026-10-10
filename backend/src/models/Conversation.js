// Supabase-backed Conversation Model
import createModel from './supabaseModel.js';

const Conversation = createModel('conversations', {
  participants: [],
  participantA: null,
  participantB: null,
  projectId: null,
  jobId: null,
  conversationType: 'project',
  lastMessage: '',
  lastMessageAt: new Date().toISOString(),
  status: 'active',
});

export default Conversation;
