// Supabase-backed Conversation Model
import createModel from './supabaseModel.js';

const Conversation = createModel('conversations', {
  participants: [],
  participantA: null,
  participantB: null,
  projectId: null,
  jobId: null,
  conversationType: 'direct',
  lastMessage: '',
  lastMessageAt: new Date().toISOString(),
  status: 'pending',
  initiatedBy: null,
  requestMessage: '',
});

export default Conversation;
