import { authApiClient } from './authApi.js';

export const fetchWorkerProfile = async () => {
  const response = await authApiClient.get('/workers/profile');
  return response.data;
};

export const createWorkerProfile = async (profileData) => {
  const response = await authApiClient.post('/workers/profile', profileData);
  return response.data;
};

export const updateWorkerProfile = async (profileData) => {
  const response = await authApiClient.put('/workers/profile', profileData);
  return response.data;
};

export const fetchEmployerProfile = async () => {
  const response = await authApiClient.get('/employers/profile');
  return response.data;
};

export const createEmployerProfile = async (profileData) => {
  const response = await authApiClient.post('/employers/profile', profileData);
  return response.data;
};

export const updateEmployerProfile = async (profileData) => {
  const response = await authApiClient.put('/employers/profile', profileData);
  return response.data;
};

export const updateWorkerAvailability = async (availabilityData) => {
  const response = await authApiClient.patch('/workers/availability', availabilityData);
  return response.data;
};

export const fetchWorkersForEmployer = async (params = {}) => {
  const response = await authApiClient.get('/workers', { params });
  return response.data;
};

