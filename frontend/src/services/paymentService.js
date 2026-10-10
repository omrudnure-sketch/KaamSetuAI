import { authApiClient } from './authApi.js';

export const recordPayment = async (projectId, data) => {
  const response = await authApiClient.post(`/projects/${projectId}/payments`, data);
  return response.data;
};

export const getProjectPayments = async (projectId) => {
  const response = await authApiClient.get(`/projects/${projectId}/payments`);
  return response.data;
};

export const getWorkerPayments = async () => {
  const response = await authApiClient.get('/payments/my');
  return response.data;
};

export const getEmployerPayments = async () => {
  const response = await authApiClient.get('/payments/employer');
  return response.data;
};

export const getWorkerEarningsSummary = async () => {
  const response = await authApiClient.get('/earnings/my');
  return response.data;
};
