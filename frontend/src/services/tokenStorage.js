/**
 * Client token storage helper for KaamSetu AI.
 * Safely persists and retrieves authentication tokens in local storage.
 */

export const TOKEN_STORAGE_KEY = 'kaamsetu_auth_token';
export const LEGACY_STORAGE_KEY = 'token';

let memoryToken = null;

export const getStoredToken = () => {
  try {
    if (typeof window !== 'undefined') {
      const token =
        window.localStorage?.getItem(TOKEN_STORAGE_KEY) ||
        window.localStorage?.getItem(LEGACY_STORAGE_KEY) ||
        window.sessionStorage?.getItem(TOKEN_STORAGE_KEY) ||
        window.sessionStorage?.getItem(LEGACY_STORAGE_KEY);
      if (token) return token;
    }
  } catch (_e) {
    // Storage access blocked or restricted (e.g. strict private mode)
  }
  return memoryToken;
};

export const setStoredToken = (token) => {
  memoryToken = token || null;
  try {
    if (typeof window !== 'undefined') {
      if (token) {
        window.localStorage?.setItem(TOKEN_STORAGE_KEY, token);
        window.localStorage?.setItem(LEGACY_STORAGE_KEY, token);
      } else {
        window.localStorage?.removeItem(TOKEN_STORAGE_KEY);
        window.localStorage?.removeItem(LEGACY_STORAGE_KEY);
        window.sessionStorage?.removeItem(TOKEN_STORAGE_KEY);
        window.sessionStorage?.removeItem(LEGACY_STORAGE_KEY);
      }
    }
  } catch (_e) {
    // Storage access blocked
  }
};

export const clearStoredToken = () => {
  memoryToken = null;
  try {
    if (typeof window !== 'undefined') {
      window.localStorage?.removeItem(TOKEN_STORAGE_KEY);
      window.localStorage?.removeItem(LEGACY_STORAGE_KEY);
      window.sessionStorage?.removeItem(TOKEN_STORAGE_KEY);
      window.sessionStorage?.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch (_e) {
    // Storage access blocked
  }
};
