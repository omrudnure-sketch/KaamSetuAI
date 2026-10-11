// Supabase-backed WorkerProfile Model
import createModel from './supabaseModel.js';

const WorkerProfile = createModel('worker_profiles', {
  userId: null,
  bio: '',
  skills: [],
  experienceYears: 0,
  dailyWage: null,
  hourlyRate: null,
  availability: 'available',
  location: '',
  city: '',
  latitude: null,
  longitude: null,
  profileCompletion: 20,
  rating: 0,
  reviewCount: 0,
  completedProjects: 0,
});

export default WorkerProfile;
