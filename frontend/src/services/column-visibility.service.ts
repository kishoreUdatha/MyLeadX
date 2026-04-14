import api from './api';

export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  order: number;
  width?: number;
}

export interface ColumnVisibility {
  tableName: string;
  columns: ColumnConfig[];
  sortColumn: string | null;
  sortDirection: string;
}

// Get all column visibility settings
export const getAllColumnVisibility = async (): Promise<Record<string, ColumnVisibility>> => {
  const response = await api.get('/settings/columns');
  return response.data.data;
};

// Get column visibility for specific table
export const getColumnVisibility = async (tableName: string): Promise<ColumnVisibility> => {
  const response = await api.get(`/settings/columns/${tableName}`);
  return response.data.data;
};

// Update column visibility for table
export const updateColumnVisibility = async (
  tableName: string,
  data: {
    columns?: ColumnConfig[];
    sortColumn?: string;
    sortDirection?: string;
  }
): Promise<ColumnVisibility> => {
  const response = await api.put(`/settings/columns/${tableName}`, data);
  return response.data.data;
};

// Toggle single column visibility
export const toggleColumnVisibility = async (
  tableName: string,
  columnKey: string,
  visible: boolean
): Promise<ColumnVisibility> => {
  const response = await api.patch(`/settings/columns/${tableName}/toggle`, {
    columnKey,
    visible,
  });
  return response.data.data;
};

// Reorder columns
export const reorderColumns = async (
  tableName: string,
  columnOrders: Array<{ key: string; order: number }>
): Promise<ColumnVisibility> => {
  const response = await api.patch(`/settings/columns/${tableName}/reorder`, {
    columnOrders,
  });
  return response.data.data;
};

// Reset column visibility to defaults
export const resetColumnVisibility = async (tableName: string): Promise<ColumnVisibility> => {
  const response = await api.post(`/settings/columns/${tableName}/reset`);
  return response.data.data;
};

// Reset all column visibility to defaults
export const resetAllColumnVisibility = async (): Promise<Record<string, ColumnVisibility>> => {
  const response = await api.post('/settings/columns/reset-all');
  return response.data.data;
};

// Get default column configurations
export const getDefaultColumns = async (): Promise<Record<string, ColumnConfig[]>> => {
  const response = await api.get('/settings/columns/defaults');
  return response.data.data;
};

export const columnVisibilityService = {
  getAllColumnVisibility,
  getColumnVisibility,
  updateColumnVisibility,
  toggleColumnVisibility,
  reorderColumns,
  resetColumnVisibility,
  resetAllColumnVisibility,
  getDefaultColumns,
};
