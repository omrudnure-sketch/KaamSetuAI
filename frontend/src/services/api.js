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

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchHealthCheck = async () => {
  const response = await apiClient.get('/health');
  return response.data;
};

