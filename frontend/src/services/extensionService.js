import { authApiClient } from './authApi.js';

export const requestExtension = async (projectId, data) => {
  const response = await authApiClient.post(`/projects/${projectId}/extensions`, data);
  return response.data;
};

export const getProjectExtensions = async (projectId) => {
  const response = await authApiClient.get(`/projects/${projectId}/extensions`);
  return response.data;
};

export const getMyExtensionRequests = async () => {
  const response = await authApiClient.get('/extensions/my');
  return response.data;
};

export const approveExtension = async (id) => {
  const response = await authApiClient.patch(`/extensions/${id}/approve`);
  return response.data;
};

export const rejectExtension = async (id) => {
  const response = await authApiClient.patch(`/extensions/${id}/reject`);
  return response.data;
};

export const cancelExtension = async (id) => {
  const response = await authApiClient.patch(`/extensions/${id}/cancel`);
  return response.data;
};
