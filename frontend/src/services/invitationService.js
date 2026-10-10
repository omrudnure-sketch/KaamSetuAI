import { authApiClient } from './authApi.js';

export const inviteWorker = async (data) => {
  const response = await authApiClient.post('/invitations', data);
  return response.data;
};

export const getWorkerInvitations = async (params = {}) => {
  const response = await authApiClient.get('/invitations/my', { params });
  return response.data;
};

export const getEmployerInvitations = async (params = {}) => {
  const response = await authApiClient.get('/invitations/employer', { params });
  return response.data;
};

export const acceptInvitation = async (id) => {
  const response = await authApiClient.patch(`/invitations/${id}/accept`);
  return response.data;
};

export const rejectInvitation = async (id) => {
  const response = await authApiClient.patch(`/invitations/${id}/reject`);
  return response.data;
};

export const cancelInvitation = async (id) => {
  const response = await authApiClient.patch(`/invitations/${id}/cancel`);
  return response.data;
};
