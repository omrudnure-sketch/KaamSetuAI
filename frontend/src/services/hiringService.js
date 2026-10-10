import { authApiClient } from './authApi.js';

export const createHiringAgreement = async (data) => {
  const response = await authApiClient.post('/hiring-agreements', data);
  return response.data;
};

export const getHiringAgreement = async (id) => {
  const response = await authApiClient.get(`/hiring-agreements/${id}`);
  return response.data;
};

export const getWorkerHiringAgreements = async () => {
  const response = await authApiClient.get('/hiring-agreements/my');
  return response.data;
};

export const getEmployerHiringAgreements = async () => {
  const response = await authApiClient.get('/hiring-agreements/employer');
  return response.data;
};

export const acceptHiringAgreement = async (id) => {
  const response = await authApiClient.patch(`/hiring-agreements/${id}/accept`);
  return response.data;
};

export const rejectHiringAgreement = async (id) => {
  const response = await authApiClient.patch(`/hiring-agreements/${id}/reject`);
  return response.data;
};

export const counterOffer = async (id, data) => {
  const response = await authApiClient.patch(`/hiring-agreements/${id}/counter`, data);
  return response.data;
};

export const cancelHiringAgreement = async (id) => {
  const response = await authApiClient.patch(`/hiring-agreements/${id}/cancel`);
  return response.data;
};
