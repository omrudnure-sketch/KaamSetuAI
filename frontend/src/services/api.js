import axios from 'axios';

/**
 * Normalizes and resolves the API base URL for KaamSetu AI.
 * Handles trailing slashes, missing '/api' path suffixes, and production fallbacks.
 */
export const getApiBaseUrl = () => {
  const rawUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (!rawUrl) {
    return import.meta.env.DEV
      ? 'http://localhost:5000/api'
      : 'https://kaamsetuai.onrender.com/api';
  }
  const cleanUrl = rawUrl.replace(/\/+$/, '');
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
};

export const getSocketBaseUrl = () => {
  const rawUrl = (import.meta.env.VITE_SOCKET_URL || '').trim();
  if (rawUrl) {
    return rawUrl.replace(/\/+$/, '').replace(/\/api\/?$/, '');
  }
  const apiUrl = getApiBaseUrl();
  return apiUrl.replace(/\/api\/?$/, '');
};

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

import { getStoredToken, clearStoredToken } from './tokenStorage.js';

// Request Interceptor: Automatically inject Bearer token on requests
apiClient.interceptors.request.use(
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

// Response Interceptor: Catch 401 on protected requests and dispatch session-expired
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthRoute =
        url.includes('/auth/login') ||
        url.includes('/auth/register');

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

export const fetchHealthCheck = async () => {
  const response = await apiClient.get('/health');
  return response.data;
};

