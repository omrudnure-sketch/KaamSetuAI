/**
 * Client token storage helper for KaamSetu AI.
 * Safely persists and retrieves authentication tokens in local storage.
 */

export const TOKEN_STORAGE_KEY = 'kaamsetu_auth_token';

export const getStoredToken = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(TOKEN_STORAGE_KEY) || null;
    }
  } catch (_e) {
    // Storage access restricted (e.g. sandboxed iframe or privacy mode)
  }
  return null;
};

export const setStoredToken = (token) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    }
  } catch (_e) {
    // Storage access blocked or quota exceeded
  }
};

export const clearStoredToken = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch (_e) {
    // Storage access blocked
  }
};
