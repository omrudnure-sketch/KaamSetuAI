// Supabase-backed RiskFlag Model
import createModel from './supabaseModel.js';

export const RiskFlag = createModel('risk_flags', {
  subjectUserId: null,
  relatedResourceType: 'user',
  relatedResourceId: null,
  riskCategory: 'account_anomaly',
  riskLevel: 'low',
  score: 0,
  indicators: [],
  evidenceReferences: [],
  status: 'new',
  assignedAdminId: null,
  reviewNotes: [],
  resolution: '',
  resolvedAt: null,
});

export default RiskFlag;
