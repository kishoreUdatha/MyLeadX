import api, { getErrorMessage } from './index';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LoginCredentials,
  AuthResponse,
  User,
  STORAGE_KEYS,
  ApiResponse,
} from '../types';

export const authApi = {
  /**
   * Login with email and password
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', {
        email: credentials.email,
        password: credentials.password,
      });

      const { user, token, refreshToken } = response.data.data;

      // Store tokens
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));

      if (credentials.rememberMe) {
        await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
      }

      return { user, token, refreshToken };
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Logout - clear all stored data
   */
  logout: async (): Promise<void> => {
    try {
      // Optionally call backend logout endpoint
      await api.post('/auth/logout').catch(() => {});

      // Clear all stored data
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.REMEMBER_ME,
      ]);
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local storage even if API call fails
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_DATA,
      ]);
    }
  },

  /**
   * Refresh access token
   */
  refreshToken: async (): Promise<string | null> => {
    try {
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

      if (!refreshToken) {
        return null;
      }

      const response = await api.post<ApiResponse<{ token: string; refreshToken: string }>>(
        '/auth/refresh',
        { refreshToken }
      );

      const { token, refreshToken: newRefreshToken } = response.data.data;

      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);

      return token;
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  },

  /**
   * Get current user from storage
   */
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: async (): Promise<boolean> => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      return !!token;
    } catch (error) {
      return false;
    }
  },

  /**
   * Get stored auth token
   */
  getToken: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    } catch (error) {
      return null;
    }
  },

  /**
   * Update user profile
   */
  updateProfile: async (data: Partial<User>): Promise<User> => {
    try {
      const response = await api.put<ApiResponse<User>>('/auth/profile', data);
      const user = response.data.data;

      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));

      return user;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Change password
   */
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get telecaller stats
   */
  getStats: async (): Promise<any> => {
    try {
      const response = await api.get<ApiResponse<any>>('/telecaller/stats');
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};

export default authApi;
