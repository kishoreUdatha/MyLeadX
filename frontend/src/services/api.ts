/**
 * API Service
 *
 * Axios instance with automatic token management and refresh
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { tokenService } from './token.service';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Skip token for auth endpoints
    const isAuthEndpoint =
      config.url?.includes('/auth/login') ||
      config.url?.includes('/auth/register') ||
      config.url?.includes('/auth/refresh-token') ||
      config.url?.includes('/auth/forgot-password') ||
      config.url?.includes('/auth/reset-password');

    if (!isAuthEndpoint) {
      // Get valid token (will refresh if needed)
      const token = await tokenService.getValidToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Skip retry for auth endpoints or if already retried
    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/refresh-token');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        const newToken = await tokenService.refreshAccessToken();

        if (newToken) {
          // Update the request header and retry
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Token refresh failed, redirect to login
        console.error('[API] Token refresh failed:', refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
