import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import {
  login,
  logout,
  checkAuth,
  clearError,
  resetAuth,
} from '../store/slices/authSlice';
import { resetLeads } from '../store/slices/leadsSlice';
import { resetCalls } from '../store/slices/callsSlice';
import { LoginCredentials } from '../types';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isLoading, error, token } = useAppSelector(
    (state) => state.auth
  );

  // Check authentication status on mount
  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  // Login handler
  const handleLogin = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        await dispatch(login(credentials)).unwrap();
        return true;
      } catch (err) {
        return false;
      }
    },
    [dispatch]
  );

  // Logout handler
  const handleLogout = useCallback(async () => {
    try {
      await dispatch(logout()).unwrap();
      // Reset all stores
      dispatch(resetLeads());
      dispatch(resetCalls());
      return true;
    } catch (err) {
      // Force reset even if API call fails
      dispatch(resetAuth());
      dispatch(resetLeads());
      dispatch(resetCalls());
      return true;
    }
  }, [dispatch]);

  // Clear error
  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Refresh auth check
  const refreshAuth = useCallback(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    token,
    login: handleLogin,
    logout: handleLogout,
    clearError: handleClearError,
    refreshAuth,
  };
};

export default useAuth;
