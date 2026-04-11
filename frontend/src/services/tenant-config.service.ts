import api from './api';
import { IndustryType } from './industry-template.service';

// Types
export interface TenantConfiguration {
  id: string;
  organizationId: string;
  industry: IndustryType;
  templateId?: string;
  isConfigured: boolean;
  configuredAt?: string;
  enabledModules: string[];
  accentColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  createdAt: string;
  updatedAt: string;
  labels: TenantLabel[];
  template?: any;
}

export interface TenantLabel {
  id?: string;
  entityKey: string;
  singularLabel: string;
  pluralLabel: string;
  icon?: string;
  isDefault?: boolean;
}

// Default labels for reference
export const DEFAULT_LABELS: Record<string, TenantLabel> = {
  lead: { entityKey: 'lead', singularLabel: 'Lead', pluralLabel: 'Leads', icon: 'UserGroupIcon' },
  deal: { entityKey: 'deal', singularLabel: 'Deal', pluralLabel: 'Deals', icon: 'BriefcaseIcon' },
  followUp: { entityKey: 'followUp', singularLabel: 'Follow-up', pluralLabel: 'Follow-ups', icon: 'PhoneIcon' },
  payment: { entityKey: 'payment', singularLabel: 'Payment', pluralLabel: 'Payments', icon: 'CurrencyRupeeIcon' },
  agent: { entityKey: 'agent', singularLabel: 'Agent', pluralLabel: 'Agents', icon: 'UserIcon' },
  call: { entityKey: 'call', singularLabel: 'Call', pluralLabel: 'Calls', icon: 'PhoneIcon' },
  appointment: { entityKey: 'appointment', singularLabel: 'Appointment', pluralLabel: 'Appointments', icon: 'CalendarIcon' },
  task: { entityKey: 'task', singularLabel: 'Task', pluralLabel: 'Tasks', icon: 'ClipboardIcon' },
  campaign: { entityKey: 'campaign', singularLabel: 'Campaign', pluralLabel: 'Campaigns', icon: 'MegaphoneIcon' },
  report: { entityKey: 'report', singularLabel: 'Report', pluralLabel: 'Reports', icon: 'ChartBarIcon' },
};

// Available modules
export const AVAILABLE_MODULES = [
  { key: 'leads', name: 'Leads', description: 'Manage leads and contacts' },
  { key: 'calls', name: 'Calls', description: 'Voice calls and recordings' },
  { key: 'followups', name: 'Follow-ups', description: 'Schedule and track follow-ups' },
  { key: 'payments', name: 'Payments', description: 'Payment tracking and invoicing' },
  { key: 'admissions', name: 'Admissions', description: 'Education admission management' },
  { key: 'visits', name: 'Site Visits', description: 'Track site/campus visits' },
  { key: 'appointments', name: 'Appointments', description: 'Schedule appointments' },
  { key: 'ai_voice', name: 'AI Voice', description: 'AI voice agents and automation' },
  { key: 'whatsapp', name: 'WhatsApp', description: 'WhatsApp messaging' },
  { key: 'email', name: 'Email', description: 'Email campaigns and sequences' },
  { key: 'sms', name: 'SMS', description: 'SMS messaging' },
  { key: 'reports', name: 'Reports', description: 'Analytics and reporting' },
  { key: 'team', name: 'Team Management', description: 'Team and performance tracking' },
  { key: 'approvals', name: 'Approvals', description: 'Multi-level approval workflows' },
  { key: 'commissions', name: 'Commissions', description: 'Commission tracking' },
];

// ==================== API CALLS ====================

// Get tenant configuration
export const getTenantConfig = async (): Promise<TenantConfiguration> => {
  const response = await api.get('/tenant-config/config');
  return response.data;
};

// Update tenant configuration
export const updateTenantConfig = async (data: Partial<TenantConfiguration>): Promise<TenantConfiguration> => {
  const response = await api.put('/tenant-config/config', data);
  return response.data;
};

// Get all labels
export const getTenantLabels = async (): Promise<TenantLabel[]> => {
  const response = await api.get('/tenant-config/labels');
  return response.data;
};

// Get a specific label
export const getLabel = async (entityKey: string): Promise<TenantLabel> => {
  const response = await api.get(`/tenant-config/labels/${entityKey}`);
  return response.data;
};

// Update or create a label
export const upsertLabel = async (entityKey: string, data: Omit<TenantLabel, 'entityKey'>): Promise<TenantLabel> => {
  const response = await api.put(`/tenant-config/labels/${entityKey}`, data);
  return response.data;
};

// Bulk update labels
export const bulkUpdateLabels = async (labels: TenantLabel[]): Promise<{ message: string; count: number }> => {
  const response = await api.put('/tenant-config/labels', { labels });
  return response.data;
};

// Reset a label to default
export const resetLabel = async (entityKey: string): Promise<{ message: string }> => {
  const response = await api.delete(`/tenant-config/labels/${entityKey}`);
  return response.data;
};

// Reset all labels to defaults
export const resetAllLabels = async (): Promise<{ message: string }> => {
  const response = await api.delete('/tenant-config/labels');
  return response.data;
};

// Get enabled modules
export const getEnabledModules = async (): Promise<string[]> => {
  const response = await api.get('/tenant-config/modules');
  return response.data;
};

// Update enabled modules
export const updateEnabledModules = async (modules: string[]): Promise<TenantConfiguration> => {
  const response = await api.put('/tenant-config/modules', { modules });
  return response.data;
};

// Get industry-specific default labels
export const getIndustryLabels = async (industry: IndustryType): Promise<Record<string, TenantLabel>> => {
  const response = await api.get(`/tenant-config/industry-labels/${industry}`);
  return response.data;
};

// Get default labels
export const getDefaultLabels = async (): Promise<Record<string, TenantLabel>> => {
  const response = await api.get('/tenant-config/default-labels');
  return response.data;
};

// ==================== HELPER FUNCTIONS ====================

// Create a labels map for easy access
export const createLabelsMap = (labels: TenantLabel[]): Record<string, TenantLabel> => {
  return labels.reduce((acc, label) => {
    acc[label.entityKey] = label;
    return acc;
  }, {} as Record<string, TenantLabel>);
};

// Get label with fallback to default
export const getLabelWithFallback = (
  labels: Record<string, TenantLabel> | TenantLabel[],
  entityKey: string,
  variant: 'singular' | 'plural' = 'singular'
): string => {
  const labelMap = Array.isArray(labels) ? createLabelsMap(labels) : labels;
  const label = labelMap[entityKey];

  if (label) {
    return variant === 'singular' ? label.singularLabel : label.pluralLabel;
  }

  const defaultLabel = DEFAULT_LABELS[entityKey];
  if (defaultLabel) {
    return variant === 'singular' ? defaultLabel.singularLabel : defaultLabel.pluralLabel;
  }

  // Fallback to entity key with capitalization
  return entityKey.charAt(0).toUpperCase() + entityKey.slice(1);
};

export const tenantConfigService = {
  getTenantConfig,
  updateTenantConfig,
  getTenantLabels,
  getLabel,
  upsertLabel,
  bulkUpdateLabels,
  resetLabel,
  resetAllLabels,
  getEnabledModules,
  updateEnabledModules,
  getIndustryLabels,
  getDefaultLabels,
  createLabelsMap,
  getLabelWithFallback,
  DEFAULT_LABELS,
  AVAILABLE_MODULES,
};
