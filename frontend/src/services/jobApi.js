import { authApiClient } from './authApi.js';

// EMPLOYER APIs
export const createJob = async (jobData) => {
  const response = await authApiClient.post('/jobs', jobData);
  return response.data;
};

export const getEmployerJobs = async () => {
  const response = await authApiClient.get('/jobs/my-jobs');
  return response.data;
};

export const getEmployerJobById = async (id) => {
  const response = await authApiClient.get(`/jobs/my-jobs/${id}`);
  return response.data;
};

export const updateJob = async (id, jobData) => {
  const response = await authApiClient.put(`/jobs/${id}`, jobData);
  return response.data;
};

export const closeJob = async (id) => {
  const response = await authApiClient.patch(`/jobs/${id}/close`);
  return response.data;
};

// WORKER APIs
export const getAvailableJobs = async (params = {}) => {
  const response = await authApiClient.get('/jobs', { params });
  return response.data;
};

export const getJobById = async (id) => {
  const response = await authApiClient.get(`/jobs/${id}`);
  return response.data;
};
