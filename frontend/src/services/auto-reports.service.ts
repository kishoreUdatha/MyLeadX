import api from './api';

export interface ReportType {
  value: string;
  label: string;
  description: string;
}

export interface AutoReportSchedule {
  id: string;
  organizationId: string;
  createdById: string;
  name: string;
  reportType: string;
  isActive: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string;
  timezone: string;
  recipients: string[];
  format: 'pdf' | 'excel' | 'csv';
  filters?: Record<string, any>;
  lastSentAt?: string;
  nextSendAt?: string;
  sendCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CreateScheduleData {
  name: string;
  reportType: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string;
  timezone?: string;
  recipients: string[];
  format?: 'pdf' | 'excel' | 'csv';
  filters?: Record<string, any>;
}

// Get all auto report schedules
export const getAutoReportSchedules = async (): Promise<AutoReportSchedule[]> => {
  const response = await api.get('/settings/auto-reports');
  return response.data.data;
};

// Get available report types
export const getReportTypes = async (): Promise<ReportType[]> => {
  const response = await api.get('/settings/auto-reports/types');
  return response.data.data;
};

// Get single schedule
export const getAutoReportSchedule = async (id: string): Promise<AutoReportSchedule> => {
  const response = await api.get(`/settings/auto-reports/${id}`);
  return response.data.data;
};

// Create auto report schedule
export const createAutoReportSchedule = async (data: CreateScheduleData): Promise<AutoReportSchedule> => {
  const response = await api.post('/settings/auto-reports', data);
  return response.data.data;
};

// Update auto report schedule
export const updateAutoReportSchedule = async (
  id: string,
  data: Partial<CreateScheduleData & { isActive: boolean }>
): Promise<AutoReportSchedule> => {
  const response = await api.put(`/settings/auto-reports/${id}`, data);
  return response.data.data;
};

// Delete auto report schedule
export const deleteAutoReportSchedule = async (id: string): Promise<void> => {
  await api.delete(`/settings/auto-reports/${id}`);
};

// Toggle schedule active status
export const toggleAutoReportSchedule = async (id: string): Promise<AutoReportSchedule> => {
  const response = await api.patch(`/settings/auto-reports/${id}/toggle`);
  return response.data.data;
};

export const autoReportsService = {
  getAutoReportSchedules,
  getReportTypes,
  getAutoReportSchedule,
  createAutoReportSchedule,
  updateAutoReportSchedule,
  deleteAutoReportSchedule,
  toggleAutoReportSchedule,
};
