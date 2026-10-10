// Supabase-backed Job Model
import createModel from './supabaseModel.js';

const Job = createModel('jobs', {
  employerId: null,
  title: '',
  description: '',
  translations: {},
  skillRequired: '',
  additionalSkills: [],
  workersRequired: 1,
  location: { city: '', area: '', address: '', coordinates: { type: 'Point', coordinates: [0, 0] } },
  wageType: 'daily',
  wageAmount: 0,
  durationType: 'single_day',
  startDate: new Date().toISOString(),
  estimatedEndDate: null,
  workingHours: { start: '09:00', end: '18:00', description: '' },
  requirements: [],
  status: 'open',
});

export default Job;
