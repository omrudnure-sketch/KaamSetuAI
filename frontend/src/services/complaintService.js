import { authApiClient } from './authApi.js';

export const createComplaint = async (data) => {
  const response = await authApiClient.post('/complaints', data);
  return response.data;
};

export const getMyComplaints = async () => {
  const response = await authApiClient.get('/complaints/my');
  return response.data;
};

export const getComplaintById = async (id) => {
  const response = await authApiClient.get(`/complaints/${id}`);
  return response.data;
};

export const cancelComplaint = async (id) => {
  const response = await authApiClient.patch(`/complaints/${id}/cancel`);
  return response.data;
};
