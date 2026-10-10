// Supabase-backed AuditLog Model
import createModel from './supabaseModel.js';

export const AuditLog = createModel('audit_logs', {
  adminId: null,
  action: '',
  targetType: 'System',
  targetId: null,
  details: {},
  ipAddress: '',
});

export default AuditLog;
