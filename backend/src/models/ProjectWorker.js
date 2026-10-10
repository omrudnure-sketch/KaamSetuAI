// Supabase-backed ProjectWorker Model
import createModel from './supabaseModel.js';

const ProjectWorker = createModel('project_workers', {
  projectId: null,
  workerId: null,
  hiringAgreementId: null,
  agreedWage: 0,
  wageType: 'daily',
  startDate: new Date().toISOString(),
  expectedEndDate: null,
  role: 'worker',
  status: 'confirmed',
  workerAccepted: true,
  employerAccepted: true,
});

export default ProjectWorker;
