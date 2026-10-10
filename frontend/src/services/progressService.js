import { authApiClient } from './authApi.js';

export const createOrUpdateProgress = async (projectId, data) => {
  const response = await authApiClient.post(`/progress/projects/${projectId}`, data);
  return response.data;
};

export const getProjectProgress = async (projectId) => {
  const response = await authApiClient.get(`/progress/projects/${projectId}`);
  return response.data;
};

export const getWorkerProgress = async () => {
  const response = await authApiClient.get('/progress/my');
  return response.data;
};
