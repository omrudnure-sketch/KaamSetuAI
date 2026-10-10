// Supabase-backed Project Model
import createModel from './supabaseModel.js';

const Project = createModel('projects', {
  jobId: null,
  employerId: null,
  createdFromHiringAgreement: null,
  hiringAgreementId: null,
  name: '',
  description: '',
  projectType: 'fixed_duration',
  location: { city: '', area: '', address: '', coordinates: { type: 'Point', coordinates: [0, 0] } },
  durationType: 'single_day',
  startDate: new Date().toISOString(),
  originalEstimatedEndDate: null,
  currentExpectedEndDate: null,
  workingHours: { start: '09:00', end: '18:00', description: '' },
  paymentType: 'daily',
  paymentAmount: 0,
  workersRequired: 1,
  progressPercentage: 0,
  status: 'confirmed',
  completedAt: null,
});

export default Project;
