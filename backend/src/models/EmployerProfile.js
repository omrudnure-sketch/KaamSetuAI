// Supabase-backed EmployerProfile Model
import createModel from './supabaseModel.js';

const EmployerProfile = createModel('employer_profiles', {
  userId: null,
  companyName: '',
  contactPerson: '',
  businessType: 'other',
  location: '',
  city: '',
  profileCompletion: 30,
  rating: 0,
  reviewCount: 0,
});

export default EmployerProfile;
