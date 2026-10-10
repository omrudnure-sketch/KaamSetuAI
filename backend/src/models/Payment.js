// Supabase-backed Payment Model
import createModel from './supabaseModel.js';

const Payment = createModel('payments', {
  projectId: null,
  projectWorkerId: null,
  workerId: null,
  employerId: null,
  type: 'daily',
  amount: 0,
  paymentDate: new Date().toISOString(),
  status: 'recorded',
  method: 'cash',
  reference: '',
  notes: '',
  createdBy: null,
});

export default Payment;
