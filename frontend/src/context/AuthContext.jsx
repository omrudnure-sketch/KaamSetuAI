import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  fetchCurrentUser,
  loginUser,
  registerUser,
  logoutUser,
  getStoredToken,
  setStoredToken,
  clearStoredToken,
  getStoredUser,
  setStoredUser,
} from '../services/authApi.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Hydrate user immediately from localStorage for persistent instant login
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(() => !getStoredUser());
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = getStoredToken();
        const cachedUser = getStoredUser();

        if (storedToken) {
          if (cachedUser) {
            setUser(cachedUser);
            setLoading(false);
          }
          try {
            const res = await fetchCurrentUser();
            if (res.success && res.data) {
              setUser(res.data);
              setStoredUser(res.data);
            } else if (!cachedUser) {
              clearStoredToken();
              setUser(null);
            }
          } catch (err) {
            // Only force logout if server explicitly returns 401 Unauthorized
            if (err.response?.status === 401) {
              clearStoredToken();
              setUser(null);
            }
            // For network errors or temporary glitches, preserve active user session
          }
        } else {
          setUser(null);
        }
      } catch (_err) {
        // Safe fallback
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
        setStoredUser(res.data.user);
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
        setStoredUser(res.data.user);
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
      // Ignore network errors during logout
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
        login,
        register,
        logout,
        setError,
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
