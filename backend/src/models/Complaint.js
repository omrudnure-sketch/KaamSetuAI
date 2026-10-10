// Supabase-backed Complaint Model
import createModel from './supabaseModel.js';

const Complaint = createModel('complaints', {
  reporterId: null,
  targetUserId: null,
  projectId: null,
  jobId: null,
  category: 'other',
  priority: 'medium',
  description: '',
  evidence: [],
  status: 'new',
  assignedAdminId: null,
  resolution: '',
  resolvedAt: null,
});

export default Complaint;
