import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginApi, registerApi, fetchMe } from '../api/auth';
import { getToken, setToken, deleteToken, setLogoutCallback } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    await deleteToken('access_token');
    await deleteToken('refresh_token');
    setUser(null);
  }, []);

  // Register logout callback for the axios interceptor
  useEffect(() => {
    setLogoutCallback(logout);
    return () => setLogoutCallback(null);
  }, [logout]);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await getToken('access_token');
        if (token) {
          const userData = await fetchMe();
          setUser(userData);
        }
      } catch {
        await deleteToken('access_token');
        await deleteToken('refresh_token');
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = useCallback(async (email, password) => {
    const tokens = await loginApi({ email, password });
    await setToken('access_token', tokens.access_token);
    await setToken('refresh_token', tokens.refresh_token);
    const userData = await fetchMe();
    setUser(userData);
  }, []);

  const register = useCallback(async (email, full_name, password) => {
    // Register the user, then login to get tokens
    await registerApi({ email, full_name, password });
    const tokens = await loginApi({ email, password });
    await setToken('access_token', tokens.access_token);
    await setToken('refresh_token', tokens.refresh_token);
    const userData = await fetchMe();
    setUser(userData);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await fetchMe();
      setUser(userData);
    } catch {
      // ignore
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
