// Supabase-backed WorkerProfile Model
import createModel from './supabaseModel.js';

const WorkerProfile = createModel('worker_profiles', {
  userId: null,
  fullName: '',
  profilePhoto: null,
  primarySkill: '',
  skills: [],
  experienceYears: 0,
  dailyWage: null,
  languages: ['en'],
  bio: '',
  location: { city: '', area: '', coordinates: { type: 'Point', coordinates: [0, 0] } },
  availability: 'available',
  preferredWorkType: 'both',
  verificationStatus: 'pending',
  rating: 0,
  totalReviews: 0,
  completedProjects: 0,
});

export default WorkerProfile;
