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
  timeout: 60000,
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

// Response Interceptor: Catch 401 and broadcast session expiration ONLY for previously authenticated sessions
authApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthRoute =
        url.includes('/auth/login') ||
        url.includes('/auth/register');

      // Only dispatch session expiration if the client actually had an active stored token
      const hadToken = Boolean(getStoredToken());
      if (!isAuthRoute && hadToken) {
        clearStoredToken();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('kaamsetu:session-expired', {
              detail: {
                message: 'Your session has expired. Please log in again.',
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
