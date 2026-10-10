// Supabase-backed Dispute Model
import createModel from './supabaseModel.js';

const Dispute = createModel('disputes', {
  projectId: null,
  initiatedBy: null,
  againstUserId: null,
  type: 'other',
  amount: 0,
  description: '',
  evidence: [],
  status: 'open',
  resolution: '',
  resolvedBy: null,
  resolvedAt: null,
});

export default Dispute;
