// Supabase-backed WorkerProfile Model
import createModel from './supabaseModel.js';

const WorkerProfile = createModel('worker_profiles', {
  userId: null,
  fullName: '',
  bio: '',
  primarySkill: '',
  skills: [],
  experienceYears: 0,
  dailyWage: null,
  hourlyRate: null,
  languages: ['en'],
  preferredWorkType: 'both',
  availability: 'available',
  isAvailableForWork: true,
  availabilityUpdatedAt: null,
  serviceRadiusKm: 10,
  profilePhoto: '',
  documents: [],
  location: '',
  city: '',
  area: '',
  address: '',
  pincode: '',
  latitude: null,
  longitude: null,
  profileCompletion: 20,
  rating: 0,
  reviewCount: 0,
  completedProjects: 0,
});

export default WorkerProfile;
