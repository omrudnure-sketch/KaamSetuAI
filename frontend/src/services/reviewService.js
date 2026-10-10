import { authApiClient } from './authApi.js';

export const createReview = async (projectId, data) => {
  const response = await authApiClient.post(`/projects/${projectId}/reviews`, data);
  return response.data;
};

export const getProjectReviews = async (projectId) => {
  const response = await authApiClient.get(`/projects/${projectId}/reviews`);
  return response.data;
};

export const getWorkerReviews = async (workerId) => {
  const response = await authApiClient.get(`/workers/${workerId}/reviews`);
  return response.data;
};

export const getEmployerReviews = async (employerId) => {
  const response = await authApiClient.get(`/employers/${employerId}/reviews`);
  return response.data;
};

export const getMyReviews = async () => {
  const response = await authApiClient.get('/reviews/my');
  return response.data;
};
