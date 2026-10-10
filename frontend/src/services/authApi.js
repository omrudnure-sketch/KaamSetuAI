import axios from 'axios';
import { getApiBaseUrl } from './api.js';

export const authApiClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});


export const registerUser = async (userData) => {
  const response = await authApiClient.post('/auth/register', userData);
  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await authApiClient.post('/auth/login', credentials);
  return response.data;
};

export const fetchCurrentUser = async () => {
  const response = await authApiClient.get('/auth/me');
  return response.data;
};

export const logoutUser = async () => {
  const response = await authApiClient.post('/auth/logout');
  return response.data;
};
