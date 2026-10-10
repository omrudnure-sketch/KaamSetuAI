import { authApiClient } from './authApi.js';

export const getDashboardAnalytics = async () => {
  const response = await authApiClient.get('/admin/analytics');
  return response.data;
};

export const getUsersList = async (params) => {
  const response = await authApiClient.get('/admin/users', { params });
  return response.data;
};

export const updateUserStatus = async (id, data) => {
  const response = await authApiClient.patch(`/admin/users/${id}/status`, data);
  return response.data;
};

export const getAllComplaints = async (params) => {
  const response = await authApiClient.get('/admin/complaints', { params });
  return response.data;
};

export const resolveComplaint = async (id, data) => {
  const response = await authApiClient.patch(`/admin/complaints/${id}/resolve`, data);
  return response.data;
};

export const getAllDisputes = async (params) => {
  const response = await authApiClient.get('/admin/disputes', { params });
  return response.data;
};

export const resolveDispute = async (id, data) => {
  const response = await authApiClient.patch(`/admin/disputes/${id}/resolve`, data);
  return response.data;
};

export const getAuditLogs = async (params) => {
  const response = await authApiClient.get('/admin/audit-logs', { params });
  return response.data;
};

export const getFlaggedUsers = async () => {
  const response = await authApiClient.get('/fraud/flagged-users');
  return response.data;
};

// Step 26: Admin AI Analytics Assistant APIs
export const queryAdminAiAssistant = async (question) => {
  const response = await authApiClient.post('/admin/ai-assistant/query', { question });
  return response.data;
};

export const getAdminAiHistory = async () => {
  const response = await authApiClient.get('/admin/ai-assistant/history');
  return response.data;
};

// Step 27: Fraud and Risk Detection APIs
export const getRiskFlags = async (params) => {
  const response = await authApiClient.get('/admin/risk-flags', { params });
  return response.data;
};

export const getRiskStats = async () => {
  const response = await authApiClient.get('/admin/risk-flags/stats');
  return response.data;
};

export const getRiskFlagById = async (id) => {
  const response = await authApiClient.get(`/admin/risk-flags/${id}`);
  return response.data;
};

export const scanRiskFlags = async (limit = 50) => {
  const response = await authApiClient.post('/admin/risk-flags/scan', { limit });
  return response.data;
};

export const updateRiskFlagStatus = async (id, data) => {
  const response = await authApiClient.patch(`/admin/risk-flags/${id}/status`, data);
  return response.data;
};

export const assignAdminToFlag = async (id, data) => {
  const response = await authApiClient.patch(`/admin/risk-flags/${id}/assign`, data);
  return response.data;
};

export const addRiskReviewNote = async (id, data) => {
  const response = await authApiClient.post(`/admin/risk-flags/${id}/notes`, data);
  return response.data;
};

