/**
 * API Service
 *
 * Axios instance with automatic token management, refresh, and CSRF protection
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Get CSRF token from cookie
 */
function getCsrfToken(): string | null {
  const name = 'csrf-token=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookies = decodedCookie.split(';');
  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.indexOf(name) === 0) {
      return cookie.substring(name.length);
    }
  }
  return null;
}

// Track if we're currently fetching CSRF token to avoid multiple requests
let csrfFetchPromise: Promise<void> | null = null;

/**
 * Ensure CSRF token is available
 * Fetches from server if not in cookie
 */
async function ensureCsrfToken(): Promise<string | null> {
  let token = getCsrfToken();
  if (token) return token;

  // Avoid multiple concurrent fetches
  if (!csrfFetchPromise) {
    csrfFetchPromise = axios.get(`${API_BASE_URL}/csrf-token`, { withCredentials: true })
      .then(() => {
        csrfFetchPromise = null;
      })
      .catch(() => {
        csrfFetchPromise = null;
      });
  }

  await csrfFetchPromise;
  return getCsrfToken();
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with requests (httpOnly auth + CSRF)
});

/**
 * Get selected branch ID from localStorage (for admin branch filtering)
 */
function getSelectedBranchId(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('selectedBranchId');
  }
  return null;
}

// Request interceptor - add CSRF token and branch header
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Add CSRF token for non-GET requests
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (config.method && !safeMethods.includes(config.method.toUpperCase())) {
      // Ensure CSRF token is available before making state-changing requests
      const csrfToken = await ensureCsrfToken();
      if (csrfToken && config.headers) {
        config.headers['x-csrf-token'] = csrfToken;
      }
    }

    // Add branch ID header for admin branch filtering
    const selectedBranchId = getSelectedBranchId();
    if (selectedBranchId && config.headers) {
      config.headers['x-branch-id'] = selectedBranchId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh on 401 and CSRF retry on 403
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _csrfRetry?: boolean };

    // Skip retry for auth endpoints or if already retried
    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/refresh-token');

    // Handle CSRF token errors (403 with CSRF error code)
    const responseData = error.response?.data as { code?: string } | undefined;
    if (error.response?.status === 403 &&
        responseData?.code?.startsWith('CSRF_') &&
        !originalRequest._csrfRetry) {
      originalRequest._csrfRetry = true;

      try {
        // Fetch fresh CSRF token
        await axios.get(`${API_BASE_URL}/csrf-token`, { withCredentials: true });

        // Update the header with new token
        const newToken = getCsrfToken();
        if (newToken && originalRequest.headers) {
          originalRequest.headers['x-csrf-token'] = newToken;
        }

        // Retry the original request
        return api(originalRequest);
      } catch (csrfError) {
        console.error('[API] CSRF token refresh failed:', csrfError);
      }
    }

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token via cookie-based endpoint
        // The refresh token is sent automatically via httpOnly cookie
        await api.post('/auth/refresh-token');

        // Retry the original request (new access token is now in cookie)
        return api(originalRequest);
      } catch (refreshError) {
        // Token refresh failed, redirect to login
        console.error('[API] Token refresh failed:', refreshError);

        // Clear any local state and redirect (except for public pages)
        const publicPaths = ['/login', '/register', '/forgot-password', '/pricing', '/docs', '/realtime-test', '/'];
        const currentPath = window.location.pathname;
        const isPublicPage = publicPaths.some(path => currentPath === path || currentPath.startsWith(path + '/'));

        if (typeof window !== 'undefined' && !isPublicPage) {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
