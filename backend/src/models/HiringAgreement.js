// Supabase-backed HiringAgreement Model
import createModel from './supabaseModel.js';

const HiringAgreement = createModel('hiring_agreements', {
  jobId: null,
  employerId: null,
  workerId: null,
  applicationId: null,
  currentOffer: null,
  offerHistory: [],
  agreedTerms: null,
  status: 'pending_worker',
  agreedWage: null,
  wageType: 'daily',
  startDate: new Date().toISOString(),
  expectedEndDate: null,
  terms: '',
  confirmedAt: null,
});

export default HiringAgreement;
