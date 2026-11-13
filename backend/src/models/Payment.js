// Supabase-backed Payment Model
import createModel from './supabaseModel.js';

const Payment = createModel('payments', {
  projectId: null,
  projectWorkerId: null,
  workerId: null,
  payeeId: null,
  employerId: null,
  payerId: null,
  type: 'daily',
  wageType: 'daily',
  amount: 0,
  paymentDate: new Date().toISOString(),
  status: 'recorded',
  method: 'cash',
  reference: '',
  transactionRef: '',
  notes: '',
  createdBy: null,
});

export default Payment;
