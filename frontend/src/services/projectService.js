import { authApiClient } from './authApi.js';

export const createProjectFromAgreement = async (agreementId, data = {}) => {
  const response = await authApiClient.post(`/projects/from-agreement/${agreementId}`, data);
  return response.data;
};

export const getWorkerProjects = async () => {
  const response = await authApiClient.get('/projects/worker');
  return response.data;
};

export const getEmployerProjects = async () => {
  const response = await authApiClient.get('/projects/employer');
  return response.data;
};

export const getProjectById = async (id) => {
  const response = await authApiClient.get(`/projects/${id}`);
  return response.data;
};

export const startProject = async (id) => {
  const response = await authApiClient.patch(`/projects/${id}/start`);
  return response.data;
};

export const requestCompletion = async (id) => {
  const response = await authApiClient.patch(`/projects/${id}/request-completion`);
  return response.data;
};

export const completeProject = async (id) => {
  const response = await authApiClient.patch(`/projects/${id}/complete`);
  return response.data;
};

export const cancelProject = async (id) => {
  const response = await authApiClient.patch(`/projects/${id}/cancel`);
  return response.data;
};
