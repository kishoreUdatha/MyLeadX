/**
 * Template Service
 * Frontend API service for managing message templates (Email, SMS, WhatsApp)
 */

import api from './api';

export type TemplateType = 'EMAIL' | 'SMS' | 'WHATSAPP';

export interface TemplateVariable {
  key: string;
  label: string;
  description: string;
  example: string;
}

export interface TemplateButton {
  type: 'URL' | 'CALL' | 'QUICK_REPLY';
  text: string;
  url?: string;
  phoneNumber?: string;
}

export interface MessageTemplate {
  id: string;
  organizationId: string;
  name: string;
  type: TemplateType;
  category?: string;
  subject?: string;
  content: string;
  htmlContent?: string;
  variables?: string[];
  sampleValues?: Record<string, string>;
  headerType?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  headerContent?: string;
  footerContent?: string;
  buttons?: TemplateButton[];
  whatsappTemplateId?: string;
  whatsappStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  whatsappLanguage?: string;
  isActive: boolean;
  isDefault: boolean;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateInput {
  name: string;
  type: TemplateType;
  category?: string;
  subject?: string;
  content: string;
  htmlContent?: string;
  variables?: string[];
  sampleValues?: Record<string, string>;
  headerType?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  headerContent?: string;
  footerContent?: string;
  buttons?: TemplateButton[];
  whatsappLanguage?: string;
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {
  isActive?: boolean;
  isDefault?: boolean;
}

export interface TemplateListParams {
  type?: TemplateType;
  category?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TemplateValidation {
  valid: boolean;
  errors: string[];
  warnings?: string[];
  variables?: string[];
}

export interface SmsInfo {
  characterCount: number;
  smsCount: number;
  encoding: 'GSM' | 'UNICODE';
  remainingInCurrentSms: number;
}

export const templateService = {
  async getTemplates(params?: TemplateListParams): Promise<{ templates: MessageTemplate[]; total: number }> {
    const response = await api.get('/templates', { params });
    return { templates: response.data.data || [], total: response.data.total || 0 };
  },

  async getById(id: string): Promise<MessageTemplate> {
    const response = await api.get(`/templates/${id}`);
    return response.data.data;
  },

  async create(data: CreateTemplateInput): Promise<MessageTemplate> {
    const response = await api.post('/templates', data);
    return response.data.data;
  },

  async update(id: string, data: UpdateTemplateInput): Promise<MessageTemplate> {
    const response = await api.put(`/templates/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/templates/${id}`);
  },

  async duplicate(id: string, name?: string): Promise<MessageTemplate> {
    const response = await api.post(`/templates/${id}/duplicate`, { name });
    return response.data.data;
  },

  async preview(id: string): Promise<{ subject?: string; content: string; htmlContent?: string }> {
    const response = await api.get(`/templates/${id}/preview`);
    return response.data.data;
  },

  async render(id: string, variables: Record<string, string>): Promise<{ subject?: string; content: string; htmlContent?: string }> {
    const response = await api.post(`/templates/${id}/render`, { variables });
    return response.data.data;
  },

  async validate(content: string, type: TemplateType): Promise<TemplateValidation & { smsInfo?: SmsInfo }> {
    const response = await api.post('/templates/validate', { content, type });
    return response.data.data;
  },

  async getVariables(): Promise<TemplateVariable[]> {
    const response = await api.get('/templates/variables');
    return response.data.data;
  },

  async getCategories(): Promise<string[]> {
    const response = await api.get('/templates/categories');
    return response.data.data;
  },

  async getSmsInfo(content: string): Promise<SmsInfo> {
    const response = await api.post('/templates/sms-info', { content });
    return response.data.data;
  },
};

// Predefined template variables
export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { key: 'firstName', label: 'First Name', description: "Lead's first name", example: 'John' },
  { key: 'lastName', label: 'Last Name', description: "Lead's last name", example: 'Doe' },
  { key: 'fullName', label: 'Full Name', description: "Lead's full name", example: 'John Doe' },
  { key: 'email', label: 'Email', description: "Lead's email address", example: 'john@example.com' },
  { key: 'phone', label: 'Phone', description: "Lead's phone number", example: '+91 98765 43210' },
  { key: 'orgName', label: 'Organization', description: 'Your organization name', example: 'Acme Corp' },
  { key: 'agentName', label: 'Agent Name', description: 'Assigned agent name', example: 'Jane Smith' },
  { key: 'courseName', label: 'Course Name', description: 'Interested course (education)', example: 'MBA' },
  { key: 'amount', label: 'Amount', description: 'Payment or fee amount', example: '₹50,000' },
  { key: 'dueDate', label: 'Due Date', description: 'Payment due date', example: '15 Jan 2025' },
  { key: 'followUpDate', label: 'Follow-up Date', description: 'Next follow-up date', example: '20 Jan 2025' },
  { key: 'link', label: 'Link', description: 'Custom link or URL', example: 'https://example.com' },
];
