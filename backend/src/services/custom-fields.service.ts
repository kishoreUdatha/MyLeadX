/**
 * Custom Fields Service
 * Manages organization-specific custom field definitions
 */

import { prisma } from '../config/database';
import { FieldType, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors';

export interface CreateCustomFieldInput {
  name: string;
  slug?: string;
  fieldType: FieldType;
  options?: Array<{ value: string; label: string }>;
  isRequired?: boolean;
  order?: number;
  placeholder?: string;
  helpText?: string;
  defaultValue?: any;
  validationRules?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  visibleInForms?: boolean;
  visibleInList?: boolean;
}

export interface UpdateCustomFieldInput extends Partial<CreateCustomFieldInput> {
  isActive?: boolean;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

class CustomFieldsService {
  /**
   * Get all custom fields for an organization
   */
  async getAll(organizationId: string, includeInactive = false) {
    const where: Prisma.CustomFieldWhereInput = {
      organizationId,
    };

    if (!includeInactive) {
      where.isActive = true;
    }

    return prisma.customField.findMany({
      where,
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Get a single custom field by ID
   */
  async getById(id: string, organizationId: string) {
    const field = await prisma.customField.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!field) {
      throw new NotFoundError('Custom field not found');
    }

    return field;
  }

  /**
   * Create a new custom field
   */
  async create(organizationId: string, input: CreateCustomFieldInput) {
    const slug = input.slug || generateSlug(input.name);

    // Check for duplicate slug
    const existing = await prisma.customField.findFirst({
      where: {
        organizationId,
        slug,
      },
    });

    if (existing) {
      throw new ValidationError(`A field with slug "${slug}" already exists`);
    }

    // Get the highest order number
    const maxOrder = await prisma.customField.aggregate({
      where: { organizationId },
      _max: { order: true },
    });

    const order = input.order ?? (maxOrder._max.order ?? 0) + 1;

    // Build options JSON
    const options = input.options || [];

    return prisma.customField.create({
      data: {
        organizationId,
        name: input.name,
        slug,
        fieldType: input.fieldType,
        options: options as Prisma.InputJsonValue,
        isRequired: input.isRequired ?? false,
        order,
      },
    });
  }

  /**
   * Update a custom field
   */
  async update(id: string, organizationId: string, input: UpdateCustomFieldInput) {
    const field = await this.getById(id, organizationId);

    // If updating slug, check for duplicates
    if (input.slug && input.slug !== field.slug) {
      const existing = await prisma.customField.findFirst({
        where: {
          organizationId,
          slug: input.slug,
          id: { not: id },
        },
      });

      if (existing) {
        throw new ValidationError(`A field with slug "${input.slug}" already exists`);
      }
    }

    const updateData: Prisma.CustomFieldUpdateInput = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.slug !== undefined) updateData.slug = input.slug;
    if (input.fieldType !== undefined) updateData.fieldType = input.fieldType;
    if (input.options !== undefined) updateData.options = input.options as Prisma.InputJsonValue;
    if (input.isRequired !== undefined) updateData.isRequired = input.isRequired;
    if (input.order !== undefined) updateData.order = input.order;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    return prisma.customField.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Delete a custom field
   */
  async delete(id: string, organizationId: string) {
    const field = await this.getById(id, organizationId);

    // Prevent deletion of system fields
    if (field.isSystemField) {
      throw new ValidationError('System fields cannot be deleted. You can disable them instead.');
    }

    return prisma.customField.delete({
      where: { id },
    });
  }

  /**
   * Reorder custom fields
   */
  async reorder(organizationId: string, fieldIds: string[]) {
    const updates = fieldIds.map((id, index) =>
      prisma.customField.updateMany({
        where: {
          id,
          organizationId,
        },
        data: {
          order: index + 1,
        },
      })
    );

    await prisma.$transaction(updates);

    return this.getAll(organizationId);
  }

  /**
   * Toggle field active status
   */
  async toggleActive(id: string, organizationId: string) {
    const field = await this.getById(id, organizationId);

    return prisma.customField.update({
      where: { id },
      data: {
        isActive: !field.isActive,
      },
    });
  }

  /**
   * Duplicate a custom field
   */
  async duplicate(id: string, organizationId: string) {
    const field = await this.getById(id, organizationId);

    // Generate a new unique slug
    let newSlug = `${field.slug}_copy`;
    let counter = 1;

    while (true) {
      const existing = await prisma.customField.findFirst({
        where: {
          organizationId,
          slug: newSlug,
        },
      });

      if (!existing) break;

      counter++;
      newSlug = `${field.slug}_copy_${counter}`;
    }

    return this.create(organizationId, {
      name: `${field.name} (Copy)`,
      slug: newSlug,
      fieldType: field.fieldType,
      options: field.options as Array<{ value: string; label: string }>,
      isRequired: field.isRequired,
    });
  }

  /**
   * Get field usage statistics
   */
  async getFieldUsage(id: string, organizationId: string) {
    const field = await this.getById(id, organizationId);

    // Count leads that have this field populated
    const leads = await prisma.lead.findMany({
      where: {
        organizationId,
        customFields: {
          path: [field.slug],
          not: Prisma.AnyNull,
        },
      },
      select: { id: true, customFields: true },
    });

    // Count value distribution for select/multiselect fields
    let valueDistribution: Record<string, number> = {};

    if (field.fieldType === 'SELECT' || field.fieldType === 'MULTISELECT') {
      for (const lead of leads) {
        const customFields = lead.customFields as Record<string, any>;
        const value = customFields?.[field.slug];

        if (value) {
          if (Array.isArray(value)) {
            for (const v of value) {
              valueDistribution[v] = (valueDistribution[v] || 0) + 1;
            }
          } else {
            valueDistribution[value] = (valueDistribution[value] || 0) + 1;
          }
        }
      }
    }

    return {
      fieldId: id,
      fieldName: field.name,
      totalLeadsWithField: leads.length,
      valueDistribution,
    };
  }
}

export const customFieldsService = new CustomFieldsService();
