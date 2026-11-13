// Supabase-backed ProjectExtension Model
import createModel from './supabaseModel.js';

const ProjectExtension = createModel('project_extensions', {
  projectId: null,
  projectWorkerId: null,
  requestedBy: null,
  requestType: 'duration_extension',
  previousEndDate: null,
  originalEndDate: null,
  requestedEndDate: null,
  newEndDate: null,
  additionalDays: 1,
  previousWage: null,
  proposedWage: null,
  reason: '',
  workerApproval: 'pending',
  employerApproval: 'pending',
  status: 'pending',
  effectiveAt: null,
  version: 1,
});

export default ProjectExtension;
