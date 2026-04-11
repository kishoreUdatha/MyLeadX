/**
 * Payment Categories Service
 * Handles CRUD operations for tenant-configurable payment categories
 */

import { prisma } from '../config/database';
import { PaymentCategory, PaymentCategoryType, Prisma } from '@prisma/client';

interface CreatePaymentCategoryInput {
  name: string;
  code: string;
  description?: string;
  type?: PaymentCategoryType;
  defaultAmount?: number;
  taxRate?: number;
  taxInclusive?: boolean;
  isRefundable?: boolean;
  color?: string;
  rules?: any[];
}

interface UpdatePaymentCategoryInput {
  name?: string;
  code?: string;
  description?: string;
  type?: PaymentCategoryType;
  defaultAmount?: number;
  taxRate?: number;
  taxInclusive?: boolean;
  isRefundable?: boolean;
  isActive?: boolean;
  displayOrder?: number;
  color?: string;
  rules?: any[];
}

interface CategoryRule {
  id: string;
  condition: 'course' | 'branch' | 'student_type' | 'payment_mode';
  operator: 'equals' | 'not_equals' | 'contains';
  value: string;
  action: 'apply' | 'skip' | 'modify_amount';
  actionValue?: number;
}

class PaymentCategoriesService {
  /**
   * Get all payment categories for an organization
   */
  async getAll(organizationId: string, includeInactive = false): Promise<PaymentCategory[]> {
    const where: Prisma.PaymentCategoryWhereInput = { organizationId };

    if (!includeInactive) {
      where.isActive = true;
    }

    return prisma.paymentCategory.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
    });
  }

  /**
   * Get a single payment category by ID
   */
  async getById(id: string, organizationId: string): Promise<PaymentCategory | null> {
    return prisma.paymentCategory.findFirst({
      where: { id, organizationId },
    });
  }

  /**
   * Get a payment category by code
   */
  async getByCode(code: string, organizationId: string): Promise<PaymentCategory | null> {
    return prisma.paymentCategory.findFirst({
      where: { code, organizationId },
    });
  }

  /**
   * Create a new payment category
   */
  async create(organizationId: string, data: CreatePaymentCategoryInput): Promise<PaymentCategory> {
    // Get the max display order
    const maxOrder = await prisma.paymentCategory.aggregate({
      where: { organizationId },
      _max: { displayOrder: true },
    });

    return prisma.paymentCategory.create({
      data: {
        organizationId,
        name: data.name,
        code: data.code.toUpperCase(),
        description: data.description,
        type: data.type || 'FEE',
        defaultAmount: data.defaultAmount ? new Prisma.Decimal(data.defaultAmount) : null,
        taxRate: data.taxRate ? new Prisma.Decimal(data.taxRate) : null,
        taxInclusive: data.taxInclusive ?? false,
        isRefundable: data.isRefundable ?? true,
        color: data.color || '#3B82F6',
        displayOrder: (maxOrder._max.displayOrder || 0) + 1,
        rules: data.rules || [],
      },
    });
  }

  /**
   * Update a payment category
   */
  async update(
    id: string,
    organizationId: string,
    data: UpdatePaymentCategoryInput
  ): Promise<PaymentCategory> {
    const updateData: Prisma.PaymentCategoryUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.code !== undefined) updateData.code = data.code.toUpperCase();
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.defaultAmount !== undefined) {
      updateData.defaultAmount = data.defaultAmount ? new Prisma.Decimal(data.defaultAmount) : null;
    }
    if (data.taxRate !== undefined) {
      updateData.taxRate = data.taxRate ? new Prisma.Decimal(data.taxRate) : null;
    }
    if (data.taxInclusive !== undefined) updateData.taxInclusive = data.taxInclusive;
    if (data.isRefundable !== undefined) updateData.isRefundable = data.isRefundable;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.rules !== undefined) updateData.rules = data.rules;

    return prisma.paymentCategory.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Delete a payment category
   */
  async delete(id: string, organizationId: string): Promise<void> {
    await prisma.paymentCategory.delete({
      where: { id },
    });
  }

  /**
   * Toggle category active status
   */
  async toggleActive(id: string, organizationId: string): Promise<PaymentCategory> {
    const category = await this.getById(id, organizationId);
    if (!category) {
      throw new Error('Category not found');
    }

    return prisma.paymentCategory.update({
      where: { id },
      data: { isActive: !category.isActive },
    });
  }

  /**
   * Duplicate a payment category
   */
  async duplicate(id: string, organizationId: string): Promise<PaymentCategory> {
    const category = await this.getById(id, organizationId);
    if (!category) {
      throw new Error('Category not found');
    }

    // Generate a unique code
    let newCode = `${category.code}_COPY`;
    let suffix = 1;
    while (await this.getByCode(newCode, organizationId)) {
      newCode = `${category.code}_COPY_${suffix}`;
      suffix++;
    }

    return this.create(organizationId, {
      name: `${category.name} (Copy)`,
      code: newCode,
      description: category.description || undefined,
      type: category.type,
      defaultAmount: category.defaultAmount ? Number(category.defaultAmount) : undefined,
      taxRate: category.taxRate ? Number(category.taxRate) : undefined,
      taxInclusive: category.taxInclusive,
      isRefundable: category.isRefundable,
      color: category.color || undefined,
      rules: category.rules as any[] || [],
    });
  }

  /**
   * Reorder categories
   */
  async reorder(organizationId: string, categoryIds: string[]): Promise<void> {
    const updates = categoryIds.map((id, index) =>
      prisma.paymentCategory.update({
        where: { id },
        data: { displayOrder: index },
      })
    );

    await prisma.$transaction(updates);
  }

  /**
   * Update category rules
   */
  async updateRules(
    id: string,
    organizationId: string,
    rules: CategoryRule[]
  ): Promise<PaymentCategory> {
    return prisma.paymentCategory.update({
      where: { id },
      data: { rules },
    });
  }

  /**
   * Get categories by type
   */
  async getByType(
    organizationId: string,
    type: PaymentCategoryType
  ): Promise<PaymentCategory[]> {
    return prisma.paymentCategory.findMany({
      where: {
        organizationId,
        type,
        isActive: true,
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /**
   * Seed default categories for a new organization
   */
  async seedDefaults(organizationId: string): Promise<void> {
    const defaults: CreatePaymentCategoryInput[] = [
      {
        name: 'Tuition Fee',
        code: 'TUITION',
        description: 'Standard tuition fee for courses',
        type: 'FEE',
        defaultAmount: 50000,
        taxRate: 18,
        taxInclusive: false,
        isRefundable: true,
        color: '#3B82F6',
      },
      {
        name: 'Registration Fee',
        code: 'REGISTRATION',
        description: 'One-time registration fee',
        type: 'FEE',
        defaultAmount: 5000,
        taxRate: 0,
        taxInclusive: true,
        isRefundable: false,
        color: '#10B981',
      },
      {
        name: 'Security Deposit',
        code: 'DEPOSIT',
        description: 'Refundable security deposit',
        type: 'DEPOSIT',
        defaultAmount: 10000,
        taxRate: 0,
        taxInclusive: true,
        isRefundable: true,
        color: '#8B5CF6',
      },
      {
        name: 'GST',
        code: 'GST',
        description: 'Goods and Services Tax',
        type: 'TAX',
        taxRate: 18,
        taxInclusive: false,
        isRefundable: false,
        color: '#EF4444',
      },
    ];

    for (const category of defaults) {
      await this.create(organizationId, category);
    }
  }
}

export const paymentCategoriesService = new PaymentCategoriesService();
