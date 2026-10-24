/**
 * @file AuthContext.js
 * @description React Context managing authentication state, token persistence,
 * automatic session restoration on app relaunch, and account deletion.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest, TokenManager } from '../services/api.js';
import { logger } from '../services/eventLogger.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Auto-login on launch with smooth minimum presentation time
  useEffect(() => {
    async function restoreSession() {
      const startTimestamp = Date.now();
      try {
        const token = await TokenManager.getAccessToken();
        if (token) {
          const res = await apiRequest('/auth/me');
          if (res && res.user) {
            setUser(res.user);
          }
        }
      } catch (err) {
        console.log('[Auth] Session restore skipped/expired:', err.message);
        await TokenManager.clearTokens();
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  async function login(email, password) {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, sessionId: logger.sessionId })
    });

    if (res.user && res.accessToken) {
      await TokenManager.saveTokens(res.accessToken, res.refreshToken);
      setUser(res.user);
      logger.logAction({
        module: 'auth',
        action: 'login_success',
        screen: 'LoginScreen',
        resultSummary: { role: res.user.role }
      });
    }

    return res;
  }

  async function signup(payload) {
    const res = await apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ ...payload, sessionId: logger.sessionId })
    });

    if (res.user && res.accessToken) {
      await TokenManager.saveTokens(res.accessToken, res.refreshToken);
      setUser(res.user);
      logger.logAction({
        module: 'auth',
        action: 'signup_success',
        screen: 'SignUpScreen',
        resultSummary: { role: res.user.role }
      });
    }

    return res;
  }

  async function logout() {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ sessionId: logger.sessionId })
      });
    } catch {
      // Ignore network errors on logout
    }

    await TokenManager.clearTokens();
    setUser(null);
  }

  async function deleteAccount() {
    const res = await apiRequest('/users/me', { method: 'DELETE' });
    await TokenManager.clearTokens();
    setUser(null);
    return res;
  }

  const value = {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    isAdmin: user && user.role === 'admin',
    login,
    signup,
    logout,
    deleteAccount
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
