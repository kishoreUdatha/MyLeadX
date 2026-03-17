/**
 * CRM Integration Types
 */

export type CRMType = 'SALESFORCE' | 'HUBSPOT' | 'ZOHO' | 'CUSTOM';

export interface FieldMapping {
  sourceField: string;
  targetField: string;
}

export interface CRMConfig {
  id: string;
  name: string;
  type: CRMType;
  webhookUrl: string;
  apiKey?: string;
  isActive: boolean;
  lastSyncAt?: string;
  lastSyncError?: string;
  fieldMappings: FieldMapping[];
}

export interface CRMFormData {
  name: string;
  webhookUrl: string;
  apiKey: string;
  fieldMappings: FieldMapping[];
}
