/**
 * Auth Context - KavachForWork
 * Global auth state: user, token, login/logout
 * Token is validated against the server on every app mount.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount — validate token with server to avoid stale state
  useEffect(() => {
    const token = localStorage.getItem('kfw_token');
    const savedUser = localStorage.getItem('kfw_user');

    if (!token) {
      setLoading(false);
      return;
    }

    // Optimistically set user from cache so UI loads immediately
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        // corrupted cache — clear it
        localStorage.removeItem('kfw_user');
      }
    }

    // Then silently validate with server and refresh user data
    authAPI.me()
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem('kfw_user', JSON.stringify(data.user));
      })
      .catch(() => {
        // Token expired or invalid — force logout
        localStorage.removeItem('kfw_token');
        localStorage.removeItem('kfw_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback((token, userData) => {
    localStorage.setItem('kfw_token', token);
    localStorage.setItem('kfw_user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('kfw_token');
    localStorage.removeItem('kfw_user');
    setUser(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('kfw_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await authAPI.me();
      setUser(data.user);
      localStorage.setItem('kfw_user', JSON.stringify(data.user));
    } catch {
      logout();
    }
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
