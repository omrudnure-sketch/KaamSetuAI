import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  fetchCurrentUser,
  loginUser,
  registerUser,
  logoutUser,
  getStoredToken,
  setStoredToken,
  clearStoredToken,
} from '../services/authApi.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = getStoredToken();
        // If there's an existing token in storage, verify and hydrate the active session
        if (storedToken) {
          try {
            const res = await fetchCurrentUser();
            if (res.success && res.data) {
              setUser(res.data);
            } else {
              clearStoredToken();
              setUser(null);
            }
          } catch (_err) {
            clearStoredToken();
            setUser(null);
          }
        } else {
          // Fresh browser / unauthenticated guest: no stored token
          // Do not invoke protected endpoints, ensuring clean visitor state with zero errors
          setUser(null);
        }
      } catch (_err) {
        clearStoredToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Listen for session expiration events dispatched by API interceptors
  useEffect(() => {
    const handleSessionExpired = (event) => {
      clearStoredToken();
      setUser(null);
      setError(
        event.detail?.message || 'Your session has expired. Please log in again.'
      );
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('kaamsetu:session-expired', handleSessionExpired);
      return () => {
        window.removeEventListener('kaamsetu:session-expired', handleSessionExpired);
      };
    }
  }, []);

  const login = async (credentials) => {
    setError(null);
    try {
      const res = await loginUser(credentials);
      if (res.success && res.data?.user) {
        if (res.data.token) {
          setStoredToken(res.data.token);
        }
        setUser(res.data.user);
        return { success: true, user: res.data.user };
      }
    } catch (err) {
      let message = err.response?.data?.error?.message;
      if (!message) {
        if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
          message = 'Unable to connect to KaamSetu server. The server may be waking up or offline. Please try again.';
        } else {
          message = err.message || 'Login failed';
        }
      }
      setError(message);
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    setError(null);
    try {
      const res = await registerUser(userData);
      if (res.success && res.data?.user) {
        if (res.data.token) {
          setStoredToken(res.data.token);
        }
        setUser(res.data.user);
        return { success: true, user: res.data.user };
      }
    } catch (err) {
      let message = err.response?.data?.error?.message;
      if (!message) {
        if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
          message = 'Unable to connect to KaamSetu server. The server may be waking up or offline. Please try again.';
        } else {
          message = err.message || 'Registration failed';
        }
      }
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (_err) {
      // Ignore logout errors
    } finally {
      clearStoredToken();
      setUser(null);
      setError(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        setError,
        login,
        register,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

