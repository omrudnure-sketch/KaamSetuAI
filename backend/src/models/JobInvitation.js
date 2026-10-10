// Supabase-backed JobInvitation Model
import createModel from './supabaseModel.js';

const JobInvitation = createModel('job_invitations', {
  jobId: null,
  workerId: null,
  employerId: null,
  message: '',
  proposedWage: 0,
  status: 'pending',
  expiresAt: null,
});

export default JobInvitation;
