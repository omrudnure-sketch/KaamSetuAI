import { authApiClient } from './authApi.js';

export const checkIn = async (data) => {
  const response = await authApiClient.post('/attendance/check-in', data);
  return response.data;
};

export const checkOut = async (data) => {
  const response = await authApiClient.post('/attendance/check-out', data);
  return response.data;
};

export const getWorkerAttendance = async (params = {}) => {
  const response = await authApiClient.get('/attendance/my', { params });
  return response.data;
};

export const getProjectAttendance = async (projectId) => {
  const response = await authApiClient.get(`/attendance/project/${projectId}`);
  return response.data;
};
