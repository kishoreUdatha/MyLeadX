/**
 * Token Management Service
 *
 * Handles token storage, refresh, and expiration checking.
 * Used by both axios API and Socket.IO connections.
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Token refresh state management
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

// Add subscriber to wait for token refresh
const subscribeTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

// Notify all subscribers with new token
const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

// Decode JWT to check expiration (without verification)
const decodeToken = (token: string): { exp?: number; userId?: string } | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

class TokenService {
  private tokenRefreshBuffer = 60; // Refresh token 60 seconds before expiry

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  isTokenExpired(token: string | null): boolean {
    if (!token) return true;

    const decoded = decodeToken(token);
    if (!decoded?.exp) return true;

    // Check if token expires within the buffer time
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime + this.tokenRefreshBuffer;
  }

  isTokenValid(): boolean {
    const token = this.getAccessToken();
    return !this.isTokenExpired(token);
  }

  /**
   * Get a valid access token, refreshing if necessary
   * Returns null if refresh fails (user needs to re-login)
   */
  async getValidToken(): Promise<string | null> {
    const accessToken = this.getAccessToken();

    // If token is still valid, return it
    if (!this.isTokenExpired(accessToken)) {
      return accessToken;
    }

    // Token is expired or about to expire, need to refresh
    return this.refreshAccessToken();
  }

  /**
   * Refresh the access token using the refresh token
   */
  async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      console.warn('[TokenService] No refresh token available');
      this.clearTokens();
      return null;
    }

    // If already refreshing, wait for it to complete
    if (isRefreshing) {
      return new Promise((resolve) => {
        subscribeTokenRefresh((token) => {
          resolve(token);
        });
      });
    }

    isRefreshing = true;
    console.log('[TokenService] Refreshing access token...');

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
        refreshToken,
      });

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;

      this.setTokens(newAccessToken, newRefreshToken);
      console.log('[TokenService] Token refreshed successfully');

      // Notify all waiting subscribers
      onTokenRefreshed(newAccessToken);

      return newAccessToken;
    } catch (error) {
      console.error('[TokenService] Token refresh failed:', error);
      this.clearTokens();

      // Redirect to login
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }

      return null;
    } finally {
      isRefreshing = false;
    }
  }

  /**
   * Check if we should attempt to refresh (has refresh token)
   */
  canRefresh(): boolean {
    return !!this.getRefreshToken();
  }

  /**
   * Get user ID from token without verification
   */
  getUserIdFromToken(): string | null {
    const token = this.getAccessToken();
    if (!token) return null;

    const decoded = decodeToken(token);
    return decoded?.userId || null;
  }
}

export const tokenService = new TokenService();
