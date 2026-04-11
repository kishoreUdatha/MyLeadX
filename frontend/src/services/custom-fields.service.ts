/**
 * Custom Fields Service
 * Frontend API service for managing custom field definitions
 */

import api from './api';

export type FieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'EMAIL'
  | 'PHONE'
  | 'DATE'
  | 'DATETIME'
  | 'SELECT'
  | 'MULTISELECT'
  | 'CHECKBOX'
  | 'RADIO'
  | 'FILE';

export interface FieldOption {
  value: string;
  label: string;
}

export interface CustomField {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  fieldType: FieldType;
  options: FieldOption[];
  isRequired: boolean;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // System field support
  isSystemField?: boolean;
  columnName?: string;
  category?: string; // 'personal', 'family', 'contact', 'work', 'custom'
}

export interface CreateCustomFieldInput {
  name: string;
  slug?: string;
  fieldType: FieldType;
  options?: FieldOption[];
  isRequired?: boolean;
  order?: number;
}

export interface UpdateCustomFieldInput extends Partial<CreateCustomFieldInput> {
  isActive?: boolean;
}

export interface FieldUsageStats {
  fieldId: string;
  fieldName: string;
  totalLeadsWithField: number;
  valueDistribution: Record<string, number>;
}

export const customFieldsService = {
  async getAll(includeInactive = false): Promise<CustomField[]> {
    const response = await api.get('/custom-fields', {
      params: { includeInactive },
    });
    return response.data.data.fields;
  },

  async getById(id: string): Promise<CustomField> {
    const response = await api.get(`/custom-fields/${id}`);
    return response.data.data.field;
  },

  async create(data: CreateCustomFieldInput): Promise<CustomField> {
    const response = await api.post('/custom-fields', data);
    return response.data.data.field;
  },

  async update(id: string, data: UpdateCustomFieldInput): Promise<CustomField> {
    const response = await api.put(`/custom-fields/${id}`, data);
    return response.data.data.field;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/custom-fields/${id}`);
  },

  async reorder(fieldIds: string[]): Promise<CustomField[]> {
    const response = await api.post('/custom-fields/reorder', { fieldIds });
    return response.data.data.fields;
  },

  async toggleActive(id: string): Promise<CustomField> {
    const response = await api.post(`/custom-fields/${id}/toggle`);
    return response.data.data.field;
  },

  async duplicate(id: string): Promise<CustomField> {
    const response = await api.post(`/custom-fields/${id}/duplicate`);
    return response.data.data.field;
  },

  async getUsage(id: string): Promise<FieldUsageStats> {
    const response = await api.get(`/custom-fields/${id}/usage`);
    return response.data.data;
  },
};

export const FIELD_TYPE_OPTIONS: { value: FieldType; label: string; icon: string }[] = [
  { value: 'TEXT', label: 'Text', icon: 'Type' },
  { value: 'TEXTAREA', label: 'Long Text', icon: 'AlignLeft' },
  { value: 'NUMBER', label: 'Number', icon: 'Hash' },
  { value: 'EMAIL', label: 'Email', icon: 'Mail' },
  { value: 'PHONE', label: 'Phone', icon: 'Phone' },
  { value: 'DATE', label: 'Date', icon: 'Calendar' },
  { value: 'DATETIME', label: 'Date & Time', icon: 'Clock' },
  { value: 'SELECT', label: 'Dropdown', icon: 'ChevronDown' },
  { value: 'MULTISELECT', label: 'Multi-Select', icon: 'CheckSquare' },
  { value: 'CHECKBOX', label: 'Checkbox', icon: 'Check' },
  { value: 'RADIO', label: 'Radio Buttons', icon: 'Circle' },
  { value: 'FILE', label: 'File Upload', icon: 'Upload' },
];
