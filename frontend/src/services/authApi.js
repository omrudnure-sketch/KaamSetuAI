import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const authApiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
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
