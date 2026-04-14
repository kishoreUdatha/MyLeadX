/**
 * Follow-up Configuration Service
 * Manages follow-up settings and rules for organizations
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Default follow-up configurations
const DEFAULT_FOLLOW_UP_CONFIGS = [
  {
    name: 'Hot Lead - Same Day',
    slug: 'hot_lead_same_day',
    description: 'For urgent hot leads, follow up within hours',
    color: '#EF4444',
    defaultIntervalHours: 4,
    maxAttempts: 3,
    escalationAfterHours: 8,
    reminderEnabled: true,
    reminderBeforeMinutes: 15,
    priorityAfterAttempts: 2,
    isDefault: false,
    order: 1,
  },
  {
    name: 'Standard Follow-up',
    slug: 'standard',
    description: 'Default follow-up schedule for most leads',
    color: '#3B82F6',
    defaultIntervalHours: 24,
    maxAttempts: 5,
    escalationAfterHours: 72,
    reminderEnabled: true,
    reminderBeforeMinutes: 30,
    priorityAfterAttempts: 3,
    isDefault: true,
    order: 2,
  },
  {
    name: 'Weekly Check-in',
    slug: 'weekly',
    description: 'For nurturing leads that need periodic contact',
    color: '#10B981',
    defaultIntervalHours: 168, // 7 days
    maxAttempts: 8,
    escalationAfterHours: 336, // 14 days
    reminderEnabled: true,
    reminderBeforeMinutes: 60,
    priorityAfterAttempts: null,
    isDefault: false,
    order: 3,
  },
  {
    name: 'Re-engagement',
    slug: 're_engagement',
    description: 'For cold leads that need re-engagement',
    color: '#F59E0B',
    defaultIntervalHours: 720, // 30 days
    maxAttempts: 3,
    escalationAfterHours: null,
    reminderEnabled: true,
    reminderBeforeMinutes: 60,
    priorityAfterAttempts: null,
    isDefault: false,
    order: 4,
  },
];

interface CreateFollowUpConfigInput {
  name: string;
  slug?: string;
  description?: string;
  color?: string;
  defaultIntervalHours?: number;
  maxAttempts?: number;
  escalationAfterHours?: number | null;
  reminderEnabled?: boolean;
  reminderBeforeMinutes?: number;
  autoMoveToStageId?: string | null;
  autoAssignToManagerId?: string | null;
  priorityAfterAttempts?: number | null;
  isDefault?: boolean;
  order?: number;
}

interface UpdateFollowUpConfigInput {
  name?: string;
  description?: string;
  color?: string;
  defaultIntervalHours?: number;
  maxAttempts?: number;
  escalationAfterHours?: number | null;
  reminderEnabled?: boolean;
  reminderBeforeMinutes?: number;
  autoMoveToStageId?: string | null;
  autoAssignToManagerId?: string | null;
  priorityAfterAttempts?: number | null;
  isActive?: boolean;
  isDefault?: boolean;
  order?: number;
}

export const followUpConfigService = {
  /**
   * Initialize default follow-up configs for an organization
   */
  async initializeDefaults(organizationId: string) {
    const existing = await prisma.followUpConfig.findMany({
      where: { organizationId },
    });

    if (existing.length > 0) {
      return existing;
    }

    await prisma.followUpConfig.createMany({
      data: DEFAULT_FOLLOW_UP_CONFIGS.map((config) => ({
        organizationId,
        ...config,
      })),
    });

    return prisma.followUpConfig.findMany({
      where: { organizationId },
      orderBy: { order: 'asc' },
    });
  },

  /**
   * Get all follow-up configs for an organization
   */
  async getAll(organizationId: string, includeInactive = false) {
    // Initialize defaults if none exist
    const count = await prisma.followUpConfig.count({
      where: { organizationId },
    });

    if (count === 0) {
      await this.initializeDefaults(organizationId);
    }

    return prisma.followUpConfig.findMany({
      where: {
        organizationId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { order: 'asc' },
    });
  },

  /**
   * Get default follow-up config
   */
  async getDefault(organizationId: string) {
    // Ensure defaults exist
    await this.getAll(organizationId);

    return prisma.followUpConfig.findFirst({
      where: { organizationId, isDefault: true, isActive: true },
    });
  },

  /**
   * Get a single follow-up config
   */
  async getById(id: string, organizationId: string) {
    return prisma.followUpConfig.findFirst({
      where: { id, organizationId },
    });
  },

  /**
   * Create a follow-up config
   */
  async create(organizationId: string, input: CreateFollowUpConfigInput) {
    const slug = input.slug || input.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    // Check for duplicate slug
    const existing = await prisma.followUpConfig.findFirst({
      where: { organizationId, slug },
    });

    if (existing) {
      throw new Error(`A follow-up config with slug "${slug}" already exists`);
    }

    // If setting as default, unset other defaults
    if (input.isDefault) {
      await prisma.followUpConfig.updateMany({
        where: { organizationId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Get max order
    const maxOrder = await prisma.followUpConfig.aggregate({
      where: { organizationId },
      _max: { order: true },
    });

    return prisma.followUpConfig.create({
      data: {
        organizationId,
        name: input.name,
        slug,
        description: input.description,
        color: input.color || '#F59E0B',
        defaultIntervalHours: input.defaultIntervalHours ?? 24,
        maxAttempts: input.maxAttempts ?? 5,
        escalationAfterHours: input.escalationAfterHours,
        reminderEnabled: input.reminderEnabled ?? true,
        reminderBeforeMinutes: input.reminderBeforeMinutes ?? 30,
        autoMoveToStageId: input.autoMoveToStageId,
        autoAssignToManagerId: input.autoAssignToManagerId,
        priorityAfterAttempts: input.priorityAfterAttempts,
        isDefault: input.isDefault ?? false,
        order: input.order ?? (maxOrder._max.order || 0) + 1,
      },
    });
  },

  /**
   * Update a follow-up config
   */
  async update(id: string, organizationId: string, input: UpdateFollowUpConfigInput) {
    const config = await prisma.followUpConfig.findFirst({
      where: { id, organizationId },
    });

    if (!config) {
      throw new Error('Follow-up config not found');
    }

    // If setting as default, unset other defaults
    if (input.isDefault) {
      await prisma.followUpConfig.updateMany({
        where: { organizationId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return prisma.followUpConfig.update({
      where: { id },
      data: input,
    });
  },

  /**
   * Delete a follow-up config (soft delete)
   */
  async delete(id: string, organizationId: string) {
    const config = await prisma.followUpConfig.findFirst({
      where: { id, organizationId },
    });

    if (!config) {
      throw new Error('Follow-up config not found');
    }

    if (config.isDefault) {
      throw new Error('Cannot delete the default follow-up configuration');
    }

    return prisma.followUpConfig.update({
      where: { id },
      data: { isActive: false },
    });
  },

  /**
   * Set a config as default
   */
  async setDefault(id: string, organizationId: string) {
    const config = await prisma.followUpConfig.findFirst({
      where: { id, organizationId },
    });

    if (!config) {
      throw new Error('Follow-up config not found');
    }

    // Unset current default
    await prisma.followUpConfig.updateMany({
      where: { organizationId, isDefault: true },
      data: { isDefault: false },
    });

    // Set new default
    return prisma.followUpConfig.update({
      where: { id },
      data: { isDefault: true },
    });
  },

  /**
   * Get available managers for escalation
   */
  async getAvailableManagers(organizationId: string) {
    return prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        role: {
          slug: { in: ['admin', 'manager', 'team_lead'] },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: { select: { name: true, slug: true } },
      },
    });
  },

  /**
   * Get available stages for auto-move
   */
  async getAvailableStages(organizationId: string) {
    return prisma.leadStage.findMany({
      where: { organizationId, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        color: true,
      },
      orderBy: { order: 'asc' },
    });
  },
};
