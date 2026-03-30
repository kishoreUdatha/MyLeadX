/**
 * Templates Types
 */

export interface Template {
  id: string;
  name: string;
  type: 'SMS' | 'EMAIL' | 'WHATSAPP';
  category: string | null;
  subject: string | null;
  content: string;
  htmlContent: string | null;
  variables: string[];
  sampleValues: Record<string, string>;
  whatsappStatus: string;
  isActive: boolean;
  isDefault: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface Variable {
  key: string;
  variable: string;
  description: string;
}

export interface TemplateFormData {
  name: string;
  type: 'SMS' | 'EMAIL' | 'WHATSAPP';
  category: string;
  subject: string;
  content: string;
  htmlContent: string;
  sampleValues: Record<string, string>;
}

export interface PreviewData {
  original: {
    subject?: string;
    content: string;
  };
  rendered: {
    subject?: string;
    content: string;
  };
  variables: string[];
  sampleValues: Record<string, string>;
}

export interface SmsInfo {
  length: number;
  segments: number;
  encoding: string;
}

export const initialFormData: TemplateFormData = {
  name: '',
  type: 'SMS',
  category: '',
  subject: '',
  content: '',
  htmlContent: '',
  sampleValues: {},
};
