import { authApiClient } from './authApi.js';

export const applyToJob = async (jobId, data) => {
  const response = await authApiClient.post(`/applications/jobs/${jobId}`, data);
  return response.data;
};

export const getWorkerApplications = async (params = {}) => {
  const response = await authApiClient.get('/applications/my', { params });
  return response.data;
};

export const getEmployerApplications = async (params = {}) => {
  const response = await authApiClient.get('/applications/employer', { params });
  return response.data;
};

export const shortlistApplication = async (id) => {
  const response = await authApiClient.patch(`/applications/${id}/shortlist`);
  return response.data;
};

export const selectApplication = async (id) => {
  const response = await authApiClient.patch(`/applications/${id}/select`);
  return response.data;
};

export const rejectApplication = async (id) => {
  const response = await authApiClient.patch(`/applications/${id}/reject`);
  return response.data;
};

export const withdrawApplication = async (id) => {
  const response = await authApiClient.patch(`/applications/${id}/withdraw`);
  return response.data;
};
