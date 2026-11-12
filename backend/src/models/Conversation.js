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
  status: 'accepted',
  initiatedBy: null,
  requestMessage: '',
  acceptedAt: null,
  rejectedAt: null,
});

export default Conversation;
