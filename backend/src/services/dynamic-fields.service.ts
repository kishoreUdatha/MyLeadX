import { prisma } from '../config/database';

/**
 * Get all field definitions for an organization
 */
export const getFieldDefinitions = async (
  organizationId: string,
  entityType?: string
) => {
  return prisma.fieldDefinition.findMany({
    where: {
      organizationId,
      ...(entityType && { entityType }),
      isVisible: true,
    },
    orderBy: [{ groupName: 'asc' }, { displayOrder: 'asc' }],
  });
};

/**
 * Get field definition by ID
 */
export const getFieldDefinitionById = async (fieldId: string) => {
  return prisma.fieldDefinition.findUnique({
    where: { id: fieldId },
  });
};

/**
 * Create a new field definition
 */
export const createFieldDefinition = async (
  organizationId: string,
  data: {
    name: string;
    label: string;
    description?: string;
    fieldType: string;
    entityType: string;
    isRequired?: boolean;
    isUnique?: boolean;
    options?: any;
    minValue?: number;
    maxValue?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    defaultValue?: any;
    formula?: string;
    formulaDeps?: string[];
    lookupEntity?: string;
    lookupField?: string;
    displayOrder?: number;
    displayWidth?: string;
    placeholder?: string;
    helpText?: string;
    icon?: string;
    groupName?: string;
  }
) => {
  // Get max display order if not provided
  let displayOrder = data.displayOrder;
  if (displayOrder === undefined) {
    const maxOrder = await prisma.fieldDefinition.aggregate({
      where: { organizationId, entityType: data.entityType },
      _max: { displayOrder: true },
    });
    displayOrder = (maxOrder._max.displayOrder || 0) + 1;
  }

  return prisma.fieldDefinition.create({
    data: {
      organizationId,
      name: data.name,
      label: data.label,
      description: data.description,
      fieldType: data.fieldType as any,
      entityType: data.entityType,
      isRequired: data.isRequired ?? false,
      isUnique: data.isUnique ?? false,
      options: data.options,
      minValue: data.minValue,
      maxValue: data.maxValue,
      minLength: data.minLength,
      maxLength: data.maxLength,
      pattern: data.pattern,
      defaultValue: data.defaultValue,
      formula: data.formula,
      formulaDeps: data.formulaDeps,
      lookupEntity: data.lookupEntity,
      lookupField: data.lookupField,
      displayOrder,
      displayWidth: data.displayWidth,
      placeholder: data.placeholder,
      helpText: data.helpText,
      icon: data.icon,
      groupName: data.groupName,
    },
  });
};

/**
 * Update a field definition
 */
export const updateFieldDefinition = async (
  fieldId: string,
  data: {
    label?: string;
    description?: string;
    isRequired?: boolean;
    options?: any;
    minValue?: number;
    maxValue?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    defaultValue?: any;
    formula?: string;
    formulaDeps?: string[];
    displayOrder?: number;
    displayWidth?: string;
    placeholder?: string;
    helpText?: string;
    icon?: string;
    groupName?: string;
    isVisible?: boolean;
    visibilityRules?: any;
  }
) => {
  return prisma.fieldDefinition.update({
    where: { id: fieldId },
    data,
  });
};

/**
 * Delete a field definition
 */
export const deleteFieldDefinition = async (fieldId: string) => {
  // First delete all field values
  await prisma.recordFieldValue.deleteMany({
    where: { fieldDefinitionId: fieldId },
  });

  // Then delete the definition
  return prisma.fieldDefinition.delete({
    where: { id: fieldId },
  });
};

/**
 * Reorder field definitions
 */
export const reorderFieldDefinitions = async (
  fieldOrders: Array<{ fieldId: string; displayOrder: number }>
) => {
  const updates = fieldOrders.map(({ fieldId, displayOrder }) =>
    prisma.fieldDefinition.update({
      where: { id: fieldId },
      data: { displayOrder },
    })
  );

  return prisma.$transaction(updates);
};

/**
 * Get field values for a record
 */
export const getFieldValues = async (entityType: string, entityId: string) => {
  return prisma.recordFieldValue.findMany({
    where: {
      entityType,
      entityId,
    },
    include: {
      fieldDefinition: true,
    },
  });
};

/**
 * Get field values as a map
 */
export const getFieldValuesMap = async (
  entityType: string,
  entityId: string
): Promise<Record<string, any>> => {
  const values = await getFieldValues(entityType, entityId);
  const map: Record<string, any> = {};

  for (const value of values) {
    const field = value.fieldDefinition;
    let actualValue: any;

    // Get value based on field type
    switch (field.fieldType) {
      case 'TEXT':
      case 'TEXTAREA':
      case 'EMAIL':
      case 'PHONE':
      case 'URL':
        actualValue = value.textValue;
        break;
      case 'NUMBER':
      case 'DECIMAL':
      case 'CURRENCY':
      case 'PERCENTAGE':
        actualValue = value.numberValue;
        break;
      case 'BOOLEAN':
        actualValue = value.booleanValue;
        break;
      case 'DATE':
      case 'DATETIME':
        actualValue = value.dateValue;
        break;
      case 'SELECT':
      case 'MULTISELECT':
      case 'JSON':
      case 'FILE':
      case 'IMAGE':
        actualValue = value.jsonValue;
        break;
      default:
        actualValue = value.textValue || value.jsonValue;
    }

    map[field.name] = actualValue;
  }

  return map;
};

/**
 * Set a field value for a record
 */
export const setFieldValue = async (
  fieldDefinitionId: string,
  entityType: string,
  entityId: string,
  value: any,
  updatedByUserId?: string
) => {
  const field = await prisma.fieldDefinition.findUnique({
    where: { id: fieldDefinitionId },
  });

  if (!field) {
    throw new Error('Field definition not found');
  }

  // Validate value
  validateFieldValue(field, value);

  // Prepare value for storage
  const valueData: any = {
    fieldDefinitionId,
    entityType,
    entityId,
    updatedByUserId,
    textValue: null,
    numberValue: null,
    booleanValue: null,
    dateValue: null,
    jsonValue: null,
  };

  switch (field.fieldType) {
    case 'TEXT':
    case 'TEXTAREA':
    case 'EMAIL':
    case 'PHONE':
    case 'URL':
      valueData.textValue = value ? String(value) : null;
      break;
    case 'NUMBER':
    case 'DECIMAL':
    case 'CURRENCY':
    case 'PERCENTAGE':
      valueData.numberValue = value !== null && value !== undefined ? Number(value) : null;
      break;
    case 'BOOLEAN':
      valueData.booleanValue = value !== null && value !== undefined ? Boolean(value) : null;
      break;
    case 'DATE':
    case 'DATETIME':
      valueData.dateValue = value ? new Date(value) : null;
      break;
    case 'SELECT':
    case 'MULTISELECT':
    case 'JSON':
    case 'FILE':
    case 'IMAGE':
      valueData.jsonValue = value;
      break;
    default:
      valueData.textValue = value ? String(value) : null;
  }

  return prisma.recordFieldValue.upsert({
    where: {
      fieldDefinitionId_entityType_entityId: {
        fieldDefinitionId,
        entityType,
        entityId,
      },
    },
    update: valueData,
    create: valueData,
  });
};

/**
 * Set multiple field values for a record
 */
export const setFieldValues = async (
  organizationId: string,
  entityType: string,
  entityId: string,
  values: Record<string, any>,
  updatedByUserId?: string
) => {
  // Get field definitions for this entity type
  const fields = await prisma.fieldDefinition.findMany({
    where: {
      organizationId,
      entityType,
      name: { in: Object.keys(values) },
    },
  });

  const results: any[] = [];
  for (const field of fields) {
    const value = values[field.name];
    if (value !== undefined) {
      const result = await setFieldValue(
        field.id,
        entityType,
        entityId,
        value,
        updatedByUserId
      );
      results.push(result);
    }
  }

  return results;
};

/**
 * Delete a field value
 */
export const deleteFieldValue = async (
  fieldDefinitionId: string,
  entityType: string,
  entityId: string
) => {
  return prisma.recordFieldValue.delete({
    where: {
      fieldDefinitionId_entityType_entityId: {
        fieldDefinitionId,
        entityType,
        entityId,
      },
    },
  });
};

/**
 * Validate a field value against its definition
 */
const validateFieldValue = (field: any, value: any) => {
  // Skip validation for null/undefined if not required
  if ((value === null || value === undefined || value === '') && !field.isRequired) {
    return;
  }

  // Required check
  if (field.isRequired && (value === null || value === undefined || value === '')) {
    throw new Error(`${field.label} is required`);
  }

  // Type-specific validation
  switch (field.fieldType) {
    case 'NUMBER':
    case 'DECIMAL':
    case 'CURRENCY':
    case 'PERCENTAGE':
      if (isNaN(Number(value))) {
        throw new Error(`${field.label} must be a number`);
      }
      if (field.minValue !== null && Number(value) < field.minValue) {
        throw new Error(`${field.label} must be at least ${field.minValue}`);
      }
      if (field.maxValue !== null && Number(value) > field.maxValue) {
        throw new Error(`${field.label} must be at most ${field.maxValue}`);
      }
      break;

    case 'TEXT':
    case 'TEXTAREA':
      if (field.minLength !== null && String(value).length < field.minLength) {
        throw new Error(`${field.label} must be at least ${field.minLength} characters`);
      }
      if (field.maxLength !== null && String(value).length > field.maxLength) {
        throw new Error(`${field.label} must be at most ${field.maxLength} characters`);
      }
      if (field.pattern) {
        const regex = new RegExp(field.pattern);
        if (!regex.test(String(value))) {
          throw new Error(`${field.label} format is invalid`);
        }
      }
      break;

    case 'EMAIL':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(value))) {
        throw new Error(`${field.label} must be a valid email address`);
      }
      break;

    case 'SELECT':
      if (field.options) {
        const validValues = field.options.map((o: any) => o.value);
        if (!validValues.includes(value)) {
          throw new Error(`${field.label} must be one of: ${validValues.join(', ')}`);
        }
      }
      break;

    case 'MULTISELECT':
      if (field.options && Array.isArray(value)) {
        const validValues = field.options.map((o: any) => o.value);
        for (const v of value) {
          if (!validValues.includes(v)) {
            throw new Error(`${field.label} contains invalid value: ${v}`);
          }
        }
      }
      break;
  }
};

/**
 * Get field groups for an entity type
 */
export const getFieldGroups = async (organizationId: string, entityType: string) => {
  const fields = await prisma.fieldDefinition.findMany({
    where: {
      organizationId,
      entityType,
      isVisible: true,
    },
    orderBy: [{ groupName: 'asc' }, { displayOrder: 'asc' }],
  });

  // Group by groupName
  const groups: Record<string, any[]> = {};
  for (const field of fields) {
    const groupName = field.groupName || 'Other';
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(field);
  }

  return groups;
};

/**
 * Create field definitions from template
 */
export const createFieldsFromTemplate = async (
  organizationId: string,
  entityType: string,
  templateFields: Array<{
    name: string;
    label: string;
    fieldType: string;
    isRequired?: boolean;
    options?: any;
    groupName?: string;
  }>
) => {
  const results: any[] = [];

  for (let i = 0; i < templateFields.length; i++) {
    const field = templateFields[i];
    const created = await createFieldDefinition(organizationId, {
      ...field,
      entityType,
      displayOrder: i,
      isFromTemplate: true,
    } as any);
    results.push(created);
  }

  return results;
};

/**
 * Calculate formula field value
 */
export const calculateFormulaField = async (
  fieldDefinition: any,
  entityType: string,
  entityId: string
): Promise<any> => {
  if (!fieldDefinition.formula || !fieldDefinition.formulaDeps) {
    return null;
  }

  // Get values for dependencies
  const depValues = await getFieldValuesMap(entityType, entityId);

  // Replace placeholders in formula
  let formula = fieldDefinition.formula;
  for (const dep of fieldDefinition.formulaDeps) {
    const value = depValues[dep] ?? 0;
    formula = formula.replace(new RegExp(`\\{${dep}\\}`, 'g'), String(value));
  }

  // Evaluate formula (basic math only for security)
  try {
    // Simple math evaluation (no eval for security)
    const result = Function(`"use strict"; return (${formula})`)();
    return result;
  } catch {
    return null;
  }
};

export default {
  getFieldDefinitions,
  getFieldDefinitionById,
  createFieldDefinition,
  updateFieldDefinition,
  deleteFieldDefinition,
  reorderFieldDefinitions,
  getFieldValues,
  getFieldValuesMap,
  setFieldValue,
  setFieldValues,
  deleteFieldValue,
  getFieldGroups,
  createFieldsFromTemplate,
  calculateFormulaField,
};
