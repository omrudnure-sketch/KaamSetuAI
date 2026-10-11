// Supabase-backed User Model
import createModel from './supabaseModel.js';

const User = createModel('users', {
  name: '',
  email: null,
  phone: null,
  role: 'worker',
  adminRole: null,
  permissions: [],
  preferredLanguage: 'en',
  status: 'active',
  isVerified: false,
  passwordHash: '',
  lastLoginAt: null,
});

export default User;
