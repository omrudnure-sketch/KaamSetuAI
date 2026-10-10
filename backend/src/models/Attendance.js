// Supabase-backed Attendance Model
import createModel from './supabaseModel.js';

const Attendance = createModel('attendances', {
  projectId: null,
  projectWorkerId: null,
  workerId: null,
  employerId: null,
  date: new Date().toISOString().split('T')[0],
  checkIn: null,
  checkOut: null,
  status: 'present',
  notes: '',
});

export default Attendance;
