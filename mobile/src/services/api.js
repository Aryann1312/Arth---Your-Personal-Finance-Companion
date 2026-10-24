/**
 * @file api.js
 * @description Central API client with SecureStore token persistence,
 * parallel fastest-responder multi-host discovery (127.0.0.1 reverse bridge, 10.0.2.2, LAN IP),
 * and automatic token refresh interception.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform, NativeModules } from 'react-native';

const ACCESS_TOKEN_KEY = 'gold_calc_access_token';
const REFRESH_TOKEN_KEY = 'gold_calc_refresh_token';

// Candidate endpoints in priority order
export const getCandidateUrls = () => {
  const list = [];

  // When on Android emulator with adb reverse, 127.0.0.1 / localhost is the fastest & zero-latency
  if (Platform.OS === 'android') {
    list.push('http://127.0.0.1:5000/api');
    list.push('http://10.0.2.2:5000/api');
    list.push('http://localhost:5000/api');
  }

  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    list.push(process.env.EXPO_PUBLIC_API_BASE_URL.replace(/\/+$/, ''));
  }

  // Metro scriptURL IP (points to the machine running Metro)
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/https?:\/\/([^/:]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        list.push(`http://${match[1]}:5000/api`);
      }
    }
  } catch {
    // fallback
  }

  // Known host LAN IP
  list.push('http://192.168.1.7:5000/api');

  if (Platform.OS !== 'android') {
    list.push('http://localhost:5000/api');
    list.push('http://127.0.0.1:5000/api');
  }

  return [...new Set(list)];
};

let activeBaseUrl = null;
let discoveryPromise = null;

/**
 * Parallel fastest-responder discovery.
 * Pings /gold/live on candidate URLs simultaneously.
 * The fastest responder (<10ms via adb reverse) locks activeBaseUrl.
 */
export async function getOrDiscoverBaseUrl() {
  if (activeBaseUrl) return activeBaseUrl;

  if (discoveryPromise) return discoveryPromise;

  discoveryPromise = (async () => {
    const candidates = getCandidateUrls();

    try {
      const winner = await Promise.any(
        candidates.map(async (baseUrl) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          try {
            const res = await fetch(`${baseUrl}/gold/live`, {
              method: 'GET',
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (res.ok || res.status < 500) {
              return baseUrl;
            }
            throw new Error(`HTTP ${res.status}`);
          } catch (err) {
            clearTimeout(timeoutId);
            throw err;
          }
        })
      );

      activeBaseUrl = winner;
      return activeBaseUrl;
    } catch {
      activeBaseUrl = candidates[0] || 'http://127.0.0.1:5000/api';
      return activeBaseUrl;
    } finally {
      discoveryPromise = null;
    }
  })();

  return discoveryPromise;
}

// Warm up discovery in background on startup
getOrDiscoverBaseUrl().catch(() => { });

export const API_BASE_URL = 'http://127.0.0.1:5000/api';

/**
 * Token management using expo-secure-store
 */
export const TokenManager = {
  async getAccessToken() {
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },
  async getRefreshToken() {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },
  async saveTokens(accessToken, refreshToken) {
    try {
      if (accessToken) await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
      if (refreshToken) await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    } catch (err) {
      console.warn('[SecureStore] Failed to save tokens:', err.message);
    }
  },
  async clearTokens() {
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch (err) {
      console.warn('[SecureStore] Failed to clear tokens:', err.message);
    }
  }
};

/**
 * Core fetch wrapper with fast connection resolution and token refresh
 */
export async function apiRequest(endpoint, options = {}) {
  const token = await TokenManager.getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  const baseUrl = await getOrDiscoverBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    let response = await fetch(url, { ...config, signal: controller.signal });
    clearTimeout(timeoutId);

    // If 401 Unauthorized, attempt token refresh once
    if (response.status === 401 && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login')) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        const newToken = await TokenManager.getAccessToken();
        headers.Authorization = `Bearer ${newToken}`;
        response = await fetch(url, { ...config, headers });
      }
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.error || `HTTP ${response.status}: Request failed`;
      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);

    // If server answered with HTTP status code (400, 401, etc.), do not retry
    if (err.status) {
      throw err;
    }

    // Network connection failed on current host, invalidate and try first fallback
    activeBaseUrl = null;
    const candidates = getCandidateUrls().filter(c => c !== baseUrl);
    for (const fallbackHost of candidates) {
      try {
        const fallbackRes = await fetch(`${fallbackHost}${endpoint}`, config);
        const data = await fallbackRes.json().catch(() => ({}));
        if (fallbackRes.ok) {
          activeBaseUrl = fallbackHost;
          return data;
        }
        if (fallbackRes.status) {
          activeBaseUrl = fallbackHost;
          const error = new Error(data.error || `HTTP ${fallbackRes.status}: Request failed`);
          error.status = fallbackRes.status;
          throw error;
        }
      } catch (fallbackErr) {
        if (fallbackErr.status) throw fallbackErr;
      }
    }

    throw new Error(`Network connection error: ${err.message || 'Host unreachable'}`);
  }
}

/**
 * Attempts token refresh using stored refresh token
 */
async function attemptTokenRefresh() {
  const refreshToken = await TokenManager.getRefreshToken();
  if (!refreshToken) return false;

  const currentHost = activeBaseUrl || 'http://127.0.0.1:5000/api';

  try {
    const res = await fetch(`${currentHost}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.accessToken) {
        await TokenManager.saveTokens(data.accessToken, data.refreshToken || refreshToken);
        return true;
      }
    }
  } catch {
    // Refresh failed
  }

  await TokenManager.clearTokens();
  return false;
}
