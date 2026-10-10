import { authApiClient } from './authApi.js';

export const createDispute = async (data) => {
  const response = await authApiClient.post('/disputes', data);
  return response.data;
};

export const getMyDisputes = async () => {
  const response = await authApiClient.get('/disputes/my');
  return response.data;
};

export const getDisputeById = async (id) => {
  const response = await authApiClient.get(`/disputes/${id}`);
  return response.data;
};

export const cancelDispute = async (id) => {
  const response = await authApiClient.patch(`/disputes/${id}/cancel`);
  return response.data;
};
