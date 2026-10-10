// Supabase-backed JobApplication Model
import createModel from './supabaseModel.js';

const JobApplication = createModel('job_applications', {
  jobId: null,
  workerId: null,
  employerId: null,
  message: '',
  proposedWage: 0,
  status: 'pending',
});

export default JobApplication;
