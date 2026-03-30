/**
 * CRM Integration Constants
 */

import { FieldMapping } from './crm-integration.types';

export const CRM_LOGOS: Record<string, string> = {
  SALESFORCE: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Salesforce.com_logo.svg/2560px-Salesforce.com_logo.svg.png',
  HUBSPOT: 'https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png',
  ZOHO: 'https://www.zohowebstatic.com/sites/default/files/zoho_logo_color.svg',
  CUSTOM: '',
};

export const CRM_DESCRIPTIONS: Record<string, string> = {
  SALESFORCE: 'Connect to Salesforce to sync leads and contacts automatically',
  HUBSPOT: 'Integrate with HubSpot CRM for seamless lead management',
  ZOHO: 'Sync your leads with Zoho CRM in real-time',
  CUSTOM: 'Set up a custom webhook to any CRM or system',
};

export const DEFAULT_FIELD_MAPPINGS: FieldMapping[] = [
  { sourceField: 'name', targetField: 'Name' },
  { sourceField: 'email', targetField: 'Email' },
  { sourceField: 'phone', targetField: 'Phone' },
  { sourceField: 'company', targetField: 'Company' },
  { sourceField: 'source', targetField: 'LeadSource' },
  { sourceField: 'notes', targetField: 'Description' },
];

export const WEBHOOK_PLACEHOLDERS: Record<string, string> = {
  SALESFORCE: 'https://yourinstance.salesforce.com/services/apexrest/leads',
  HUBSPOT: 'https://api.hubapi.com/crm/v3/objects/contacts',
  ZOHO: 'https://www.zohoapis.com/crm/v2/Leads',
  CUSTOM: 'https://your-webhook-url.com/endpoint',
};

export function formatCRMName(type: string): string {
  return type === 'CUSTOM' ? 'Custom Webhook' : type.charAt(0) + type.slice(1).toLowerCase();
}
