/**
 * Lead Detail Page Utilities
 * Helper functions for formatting and data manipulation
 */

export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '--';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '--';
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export const getCustomField = (customFields: Record<string, any> | null | undefined, key: string): string => {
  if (!customFields) return '--';
  const value = customFields[key];
  return value !== undefined && value !== null && value !== '' ? String(value) : '--';
};
