import api from './api';

// Types
export interface IndustryTemplate {
  id: string;
  name: string;
  slug: string;
  description?: string;
  industry: IndustryType;
  icon?: string;
  thumbnail?: string;
  defaultLabels: Record<string, { singular: string; plural: string; icon?: string }>;
  defaultPipeline: Array<{ name: string; order: number; color: string; probability?: number }>;
  defaultFields: Array<{ name: string; label: string; type: string; options?: string[]; required?: boolean }>;
  defaultRoles: Array<{ name: string; description?: string; permissions: string[] }>;
  defaultWorkflows?: any;
  defaultAIScripts?: any;
  enabledFeatures?: string[];
  isSystem: boolean;
  isPopular: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export type IndustryType =
  | 'EDUCATION'
  | 'REAL_ESTATE'
  | 'HEALTHCARE'
  | 'INSURANCE'
  | 'AUTOMOTIVE'
  | 'FINANCE'
  | 'TRAVEL'
  | 'HOSPITALITY'
  | 'RETAIL'
  | 'MANUFACTURING'
  | 'IT_SERVICES'
  | 'LEGAL'
  | 'CONSULTING'
  | 'FITNESS'
  | 'RECRUITMENT'
  | 'EVENTS'
  | 'CUSTOM';

export interface PipelinePreset {
  id: string;
  industry: IndustryType;
  name: string;
  description?: string;
  stages: Array<{ name: string; order: number; color: string; probability?: number; daysToStay?: number }>;
  isDefault: boolean;
}

export interface FieldPreset {
  id: string;
  industry: IndustryType;
  name: string;
  description?: string;
  fields: Array<{ name: string; label: string; type: string; options?: string[]; required?: boolean }>;
  isDefault: boolean;
}

export interface AIScriptTemplate {
  id: string;
  industry: IndustryType;
  name: string;
  description?: string;
  purpose: string;
  greeting: string;
  questions: any[];
  objectionHandling?: any;
  closingScript?: string;
  voiceId?: string;
  language: string;
  isDefault: boolean;
}

export interface RoleTemplate {
  id: string;
  industry: IndustryType;
  roleName: string;
  description?: string;
  permissions: string[];
  isDefault: boolean;
}

// Industry display info
export const INDUSTRY_INFO: Record<IndustryType, { name: string; icon: string; color: string; description: string }> = {
  EDUCATION: {
    name: 'Education',
    icon: 'AcademicCapIcon',
    color: 'bg-blue-500',
    description: 'Schools, colleges, coaching centers, and edtech',
  },
  REAL_ESTATE: {
    name: 'Real Estate',
    icon: 'BuildingOfficeIcon',
    color: 'bg-emerald-500',
    description: 'Property sales, brokers, and developers',
  },
  HEALTHCARE: {
    name: 'Healthcare',
    icon: 'HeartIcon',
    color: 'bg-red-500',
    description: 'Hospitals, clinics, and healthcare providers',
  },
  INSURANCE: {
    name: 'Insurance',
    icon: 'ShieldCheckIcon',
    color: 'bg-indigo-500',
    description: 'Life, health, motor, and general insurance',
  },
  AUTOMOTIVE: {
    name: 'Automotive',
    icon: 'TruckIcon',
    color: 'bg-orange-500',
    description: 'Car dealerships and showrooms',
  },
  FINANCE: {
    name: 'Finance',
    icon: 'BanknotesIcon',
    color: 'bg-green-500',
    description: 'Banks, NBFCs, and financial services',
  },
  TRAVEL: {
    name: 'Travel',
    icon: 'GlobeAltIcon',
    color: 'bg-cyan-500',
    description: 'Travel agencies and tour operators',
  },
  HOSPITALITY: {
    name: 'Hospitality',
    icon: 'BuildingStorefrontIcon',
    color: 'bg-amber-500',
    description: 'Hotels, restaurants, and resorts',
  },
  RETAIL: {
    name: 'Retail',
    icon: 'ShoppingBagIcon',
    color: 'bg-pink-500',
    description: 'Retail stores and e-commerce',
  },
  MANUFACTURING: {
    name: 'Manufacturing',
    icon: 'WrenchIcon',
    color: 'bg-slate-500',
    description: 'Manufacturing and industrial',
  },
  IT_SERVICES: {
    name: 'IT Services',
    icon: 'ComputerDesktopIcon',
    color: 'bg-violet-500',
    description: 'Software development and IT consulting',
  },
  LEGAL: {
    name: 'Legal',
    icon: 'ScaleIcon',
    color: 'bg-gray-600',
    description: 'Law firms and legal services',
  },
  CONSULTING: {
    name: 'Consulting',
    icon: 'LightBulbIcon',
    color: 'bg-yellow-500',
    description: 'Business and management consulting',
  },
  FITNESS: {
    name: 'Fitness',
    icon: 'HeartIcon',
    color: 'bg-rose-500',
    description: 'Gyms, yoga centers, and fitness studios',
  },
  RECRUITMENT: {
    name: 'Recruitment',
    icon: 'UsersIcon',
    color: 'bg-teal-500',
    description: 'Staffing and recruitment agencies',
  },
  EVENTS: {
    name: 'Events',
    icon: 'CalendarIcon',
    color: 'bg-purple-500',
    description: 'Event management and planners',
  },
  CUSTOM: {
    name: 'Custom',
    icon: 'Cog6ToothIcon',
    color: 'bg-gray-500',
    description: 'Custom CRM configuration',
  },
};

// ==================== API CALLS ====================

// Get all templates
export const getAllTemplates = async (): Promise<IndustryTemplate[]> => {
  const response = await api.get('/industry-templates/templates');
  return response.data;
};

// Get template by ID
export const getTemplateById = async (id: string): Promise<IndustryTemplate> => {
  const response = await api.get(`/industry-templates/templates/${id}`);
  return response.data;
};

// Get template by slug
export const getTemplateBySlug = async (slug: string): Promise<IndustryTemplate> => {
  const response = await api.get(`/industry-templates/templates/slug/${slug}`);
  return response.data;
};

// Get templates by industry
export const getTemplatesByIndustry = async (industry: IndustryType): Promise<IndustryTemplate[]> => {
  const response = await api.get(`/industry-templates/templates/industry/${industry}`);
  return response.data;
};

// Apply template to organization
export const applyTemplate = async (templateId: string): Promise<{ message: string; config: any }> => {
  const response = await api.post(`/industry-templates/apply/${templateId}`);
  return response.data;
};

// Get pipeline presets for industry
export const getPipelinePresets = async (industry: IndustryType): Promise<PipelinePreset[]> => {
  const response = await api.get(`/industry-templates/presets/pipeline/${industry}`);
  return response.data;
};

// Get field presets for industry
export const getFieldPresets = async (industry: IndustryType): Promise<FieldPreset[]> => {
  const response = await api.get(`/industry-templates/presets/fields/${industry}`);
  return response.data;
};

// Get AI script templates for industry
export const getAIScriptTemplates = async (industry: IndustryType, purpose?: string): Promise<AIScriptTemplate[]> => {
  const params = purpose ? { purpose } : {};
  const response = await api.get(`/industry-templates/presets/ai-scripts/${industry}`, { params });
  return response.data;
};

// Get role templates for industry
export const getRoleTemplates = async (industry: IndustryType): Promise<RoleTemplate[]> => {
  const response = await api.get(`/industry-templates/presets/roles/${industry}`);
  return response.data;
};

// Seed default templates (admin only)
export const seedDefaultTemplates = async (): Promise<{ message: string }> => {
  const response = await api.post('/industry-templates/seed');
  return response.data;
};

export const industryTemplateService = {
  getAllTemplates,
  getTemplateById,
  getTemplateBySlug,
  getTemplatesByIndustry,
  applyTemplate,
  getPipelinePresets,
  getFieldPresets,
  getAIScriptTemplates,
  getRoleTemplates,
  seedDefaultTemplates,
  INDUSTRY_INFO,
};
