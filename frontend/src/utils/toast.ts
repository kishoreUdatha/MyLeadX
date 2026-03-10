import toast from 'react-hot-toast';
import i18n from '../i18n';

/**
 * i18n-aware toast notification helpers
 * Uses translation keys from the 'notifications' namespace
 */
export const showToast = {
  /**
   * Show a success toast with a translated message
   * @param key - Translation key (e.g., 'success.saved' or 'leads.created')
   * @param options - Optional interpolation values
   */
  success: (key: string, options?: Record<string, unknown>) => {
    const message = i18n.t(`notifications:${key}`, options);
    return toast.success(message);
  },

  /**
   * Show an error toast with a translated message
   * @param key - Translation key (e.g., 'error.save' or 'leads.bulkUploadFailed')
   * @param options - Optional interpolation values
   */
  error: (key: string, options?: Record<string, unknown>) => {
    const message = i18n.t(`notifications:${key}`, options);
    return toast.error(message);
  },

  /**
   * Show a loading toast with a translated message
   * @param key - Translation key (e.g., 'info.processing')
   * @param options - Optional interpolation values
   */
  loading: (key: string, options?: Record<string, unknown>) => {
    const message = i18n.t(`notifications:${key}`, options);
    return toast.loading(message);
  },

  /**
   * Dismiss a toast by ID
   */
  dismiss: (toastId?: string) => {
    return toast.dismiss(toastId);
  },

  /**
   * Show a custom toast with raw message (not translated)
   * Use this for dynamic error messages from API
   */
  custom: {
    success: (message: string) => toast.success(message),
    error: (message: string) => toast.error(message),
    loading: (message: string) => toast.loading(message),
  },

  /**
   * Promise-based toast that shows loading, success, or error states
   * @param promise - The promise to track
   * @param keys - Translation keys for each state
   */
  promise: <T>(
    promise: Promise<T>,
    keys: {
      loading: string;
      success: string;
      error: string;
    },
    options?: Record<string, unknown>
  ) => {
    return toast.promise(promise, {
      loading: i18n.t(`notifications:${keys.loading}`, options),
      success: i18n.t(`notifications:${keys.success}`, options),
      error: i18n.t(`notifications:${keys.error}`, options),
    });
  },
};

export default showToast;
