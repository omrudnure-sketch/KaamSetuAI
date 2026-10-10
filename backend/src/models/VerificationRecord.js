// Supabase-backed VerificationRecord Model
import createModel from './supabaseModel.js';

export const VerificationRecord = createModel('verification_records', {
  userId: null,
  verificationType: 'identity',
  documents: [],
  status: 'pending',
  reviewedBy: null,
  reviewedAt: null,
  rejectionReason: '',
  notes: '',
});

export default VerificationRecord;
