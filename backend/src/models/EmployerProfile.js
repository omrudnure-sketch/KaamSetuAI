// Supabase-backed EmployerProfile Model
import createModel from './supabaseModel.js';

const EmployerProfile = createModel('employer_profiles', {
  userId: null,
  name: '',
  businessName: '',
  businessType: 'other',
  profilePhoto: null,
  description: '',
  phone: '',
  location: { city: '', area: '', coordinates: { type: 'Point', coordinates: [0, 0] } },
  verificationStatus: 'pending',
  rating: 0,
  totalReviews: 0,
  completedProjects: 0,
});

export default EmployerProfile;
