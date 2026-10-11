import axios from 'axios';
import { getApiBaseUrl } from './api.js';
import {
  TOKEN_STORAGE_KEY,
  getStoredToken,
  setStoredToken,
  clearStoredToken,
} from './tokenStorage.js';

export {
  TOKEN_STORAGE_KEY,
  getStoredToken,
  setStoredToken,
  clearStoredToken,
};

export const authApiClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Automatically inject Bearer token on all protected requests
authApiClient.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Catch 401 and broadcast session expiration
authApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthRoute =
        error.config?.url?.includes('/auth/login') ||
        error.config?.url?.includes('/auth/register');

      if (!isAuthRoute) {
        clearStoredToken();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('kaamsetu:session-expired', {
              detail: {
                message:
                  error.response?.data?.error?.message ||
                  'Your session has expired. Please log in again.',
              },
            })
          );
        }
      }
    }
    return Promise.reject(error);
  }
);


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
