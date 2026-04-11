import { prisma } from '../config/database';
import dynamicFieldsService from './dynamic-fields.service';

/**
 * Lead Dynamic Fields Service
 * Helper functions for working with dynamic fields on leads
 */

/**
 * Get a lead with all its dynamic fields
 */
export const getLeadWithFields = async (leadId: string) => {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      organization: true,
      stage: true,
      subStage: true,
      assignments: {
        where: { isActive: true },
        include: { assignedTo: true },
      },
    },
  });

  if (!lead) {
    return null;
  }

  // Get dynamic field values
  const dynamicFields = await dynamicFieldsService.getFieldValuesMap('lead', leadId);

  // Merge dynamic fields into lead object
  return {
    ...lead,
    dynamicFields,
    // Provide a flat view for backward compatibility
    ...dynamicFields,
  };
};

/**
 * Get multiple leads with their dynamic fields
 */
export const getLeadsWithFields = async (leadIds: string[]) => {
  const leads = await prisma.lead.findMany({
    where: { id: { in: leadIds } },
    include: {
      stage: true,
      subStage: true,
      assignments: {
        where: { isActive: true },
        include: { assignedTo: true },
      },
    },
  });

  // Get dynamic fields for all leads
  const leadsWithFields = await Promise.all(
    leads.map(async (lead) => {
      const dynamicFields = await dynamicFieldsService.getFieldValuesMap('lead', lead.id);
      return {
        ...lead,
        dynamicFields,
        ...dynamicFields,
      };
    })
  );

  return leadsWithFields;
};

/**
 * Update lead with dynamic fields
 */
export const updateLeadWithFields = async (
  leadId: string,
  data: {
    // Core lead fields
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    stageId?: string;
    priority?: string;
    // ... other core fields

    // Dynamic fields (any other fields)
    [key: string]: any;
  },
  userId?: string
) => {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { organization: true },
  });

  if (!lead) {
    throw new Error('Lead not found');
  }

  // Separate core fields from dynamic fields
  const coreFields = [
    'firstName', 'lastName', 'email', 'phone', 'alternatePhone', 'alternateEmail',
    'source', 'sourceDetails', 'channelId', 'stageId', 'subStageId', 'priority',
    'gender', 'dateOfBirth', 'address', 'city', 'state', 'country', 'pincode',
    'expectedValue', 'actualValue', 'interests', 'phoneVerified', 'isReEnquiry',
    'isConverted', 'convertedAt', 'isDoNotCall',
  ];

  const coreData: any = {};
  const dynamicData: any = {};

  for (const [key, value] of Object.entries(data)) {
    if (coreFields.includes(key)) {
      coreData[key] = value;
    } else if (key !== 'dynamicFields') {
      dynamicData[key] = value;
    }
  }

  // Handle nested dynamicFields object if provided
  if (data.dynamicFields && typeof data.dynamicFields === 'object') {
    Object.assign(dynamicData, data.dynamicFields);
  }

  // Update core fields
  const updatedLead = await prisma.lead.update({
    where: { id: leadId },
    data: coreData,
  });

  // Update dynamic fields
  if (Object.keys(dynamicData).length > 0) {
    await dynamicFieldsService.setFieldValues(
      lead.organizationId,
      'lead',
      leadId,
      dynamicData,
      userId
    );
  }

  // Return lead with updated dynamic fields
  return getLeadWithFields(leadId);
};

/**
 * Create lead with dynamic fields
 */
export const createLeadWithFields = async (
  organizationId: string,
  data: {
    firstName: string;
    phone: string;
    [key: string]: any;
  },
  userId?: string
) => {
  // Separate core fields from dynamic fields
  const coreFields = [
    'firstName', 'lastName', 'email', 'phone', 'alternatePhone', 'alternateEmail',
    'source', 'sourceDetails', 'channelId', 'stageId', 'subStageId', 'priority',
    'gender', 'dateOfBirth', 'address', 'city', 'state', 'country', 'pincode',
    'expectedValue', 'actualValue', 'interests', 'phoneVerified', 'isReEnquiry',
    'orgBranchId',
  ];

  const coreData: any = { organizationId };
  const dynamicData: any = {};

  for (const [key, value] of Object.entries(data)) {
    if (coreFields.includes(key)) {
      coreData[key] = value;
    } else if (key !== 'dynamicFields') {
      dynamicData[key] = value;
    }
  }

  // Handle nested dynamicFields object
  if (data.dynamicFields && typeof data.dynamicFields === 'object') {
    Object.assign(dynamicData, data.dynamicFields);
  }

  // Create the lead
  const lead = await prisma.lead.create({
    data: coreData,
  });

  // Set dynamic fields
  if (Object.keys(dynamicData).length > 0) {
    await dynamicFieldsService.setFieldValues(
      organizationId,
      'lead',
      lead.id,
      dynamicData,
      userId
    );
  }

  // Return lead with dynamic fields
  return getLeadWithFields(lead.id);
};

/**
 * Get field definitions for leads in an organization
 */
export const getLeadFieldDefinitions = async (organizationId: string) => {
  return dynamicFieldsService.getFieldDefinitions(organizationId, 'lead');
};

/**
 * Get field definitions grouped by group name
 */
export const getLeadFieldGroups = async (organizationId: string) => {
  return dynamicFieldsService.getFieldGroups(organizationId, 'lead');
};

/**
 * Search leads by dynamic field values
 */
export const searchLeadsByField = async (
  organizationId: string,
  fieldName: string,
  value: any
) => {
  // Get the field definition
  const field = await prisma.fieldDefinition.findFirst({
    where: {
      organizationId,
      entityType: 'lead',
      name: fieldName,
    },
  });

  if (!field) {
    return [];
  }

  // Search for matching values
  const matchingValues = await prisma.recordFieldValue.findMany({
    where: {
      fieldDefinitionId: field.id,
      entityType: 'lead',
      OR: [
        { textValue: { contains: String(value) } },
        { numberValue: Number(value) || undefined },
      ],
    },
    select: {
      entityId: true,
    },
  });

  const leadIds = matchingValues.map(v => v.entityId);

  if (leadIds.length === 0) {
    return [];
  }

  // Get the leads
  return getLeadsWithFields(leadIds);
};

/**
 * Bulk update dynamic fields for multiple leads
 */
export const bulkUpdateLeadFields = async (
  organizationId: string,
  leadIds: string[],
  fieldValues: Record<string, any>,
  userId?: string
) => {
  const results = [];

  for (const leadId of leadIds) {
    try {
      await dynamicFieldsService.setFieldValues(
        organizationId,
        'lead',
        leadId,
        fieldValues,
        userId
      );
      results.push({ leadId, success: true });
    } catch (error: any) {
      results.push({ leadId, success: false, error: error.message });
    }
  }

  return results;
};

/**
 * Export leads with dynamic fields
 */
export const exportLeadsWithFields = async (
  organizationId: string,
  filters?: any
) => {
  // Get leads
  const leads = await prisma.lead.findMany({
    where: {
      organizationId,
      ...filters,
    },
    include: {
      stage: true,
      assignments: {
        where: { isActive: true },
        include: { assignedTo: true },
      },
    },
  });

  // Get field definitions for column headers
  const fieldDefs = await getLeadFieldDefinitions(organizationId);

  // Get all leads with dynamic fields
  const leadsWithFields = await getLeadsWithFields(leads.map(l => l.id));

  // Prepare export data with all fields
  return {
    fields: fieldDefs,
    leads: leadsWithFields,
  };
};

/**
 * Import leads with dynamic fields
 */
export const importLeadWithFields = async (
  organizationId: string,
  rowData: Record<string, any>,
  fieldMapping: Record<string, string>, // CSV column -> field name
  userId?: string
) => {
  const leadData: Record<string, any> = {};

  // Map CSV columns to field names
  for (const [csvColumn, fieldName] of Object.entries(fieldMapping)) {
    if (rowData[csvColumn] !== undefined && rowData[csvColumn] !== '') {
      leadData[fieldName] = rowData[csvColumn];
    }
  }

  // Create the lead with all fields
  return createLeadWithFields(organizationId, leadData as any, userId);
};

/**
 * Get lead form schema (field definitions formatted for form rendering)
 */
export const getLeadFormSchema = async (organizationId: string) => {
  const fieldGroups = await getLeadFieldGroups(organizationId);

  // Format for form rendering
  const schema = {
    groups: Object.entries(fieldGroups).map(([groupName, fields]) => ({
      name: groupName,
      label: groupName,
      fields: (fields as any[]).map(field => ({
        name: field.name,
        label: field.label,
        type: field.fieldType.toLowerCase(),
        required: field.isRequired,
        options: field.options,
        placeholder: field.placeholder,
        helpText: field.helpText,
        width: field.displayWidth,
        validation: {
          minLength: field.minLength,
          maxLength: field.maxLength,
          minValue: field.minValue,
          maxValue: field.maxValue,
          pattern: field.pattern,
        },
      })),
    })),
  };

  return schema;
};

export default {
  getLeadWithFields,
  getLeadsWithFields,
  updateLeadWithFields,
  createLeadWithFields,
  getLeadFieldDefinitions,
  getLeadFieldGroups,
  searchLeadsByField,
  bulkUpdateLeadFields,
  exportLeadsWithFields,
  importLeadWithFields,
  getLeadFormSchema,
};
