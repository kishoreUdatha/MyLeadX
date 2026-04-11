/**
 * Lead Tags Service
 * Handles lead tagging, categorization, and bulk tag operations
 */

import { prisma } from '../config/database';
import { LeadTag, LeadTagAssignment, Prisma } from '@prisma/client';

interface TagWithCount extends LeadTag {
  _count?: {
    leadAssignments: number;
  };
}

export class LeadTagsService {
  /**
   * Generate slug from tag name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // ==================== Tag CRUD Operations ====================

  /**
   * Create a new tag
   */
  async createTag(
    organizationId: string,
    data: {
      name: string;
      color?: string;
      description?: string;
      isSystem?: boolean;
    }
  ): Promise<LeadTag> {
    const slug = this.generateSlug(data.name);

    return prisma.leadTag.create({
      data: {
        organizationId,
        name: data.name,
        slug,
        color: data.color || '#6B7280',
        description: data.description,
        isSystem: data.isSystem || false,
      },
    });
  }

  /**
   * Update a tag
   */
  async updateTag(
    tagId: string,
    organizationId: string,
    data: Partial<{
      name: string;
      color: string;
      description: string;
    }>
  ): Promise<LeadTag> {
    const updateData: any = { ...data };

    // Generate new slug if name is being updated
    if (data.name) {
      updateData.slug = this.generateSlug(data.name);
    }

    return prisma.leadTag.update({
      where: { id: tagId, organizationId },
      data: updateData,
    });
  }

  /**
   * Delete a tag
   */
  async deleteTag(tagId: string, organizationId: string): Promise<void> {
    const tag = await prisma.leadTag.findFirst({
      where: { id: tagId, organizationId },
    });

    if (!tag) {
      throw new Error('Tag not found');
    }

    if (tag.isSystem) {
      throw new Error('System tags cannot be deleted');
    }

    await prisma.leadTag.delete({
      where: { id: tagId },
    });
  }

  /**
   * Get all tags for an organization
   */
  async getTags(organizationId: string, includeCount = false): Promise<TagWithCount[]> {
    return prisma.leadTag.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
      include: includeCount
        ? {
            _count: {
              select: { leadAssignments: true },
            },
          }
        : undefined,
    });
  }

  /**
   * Get a single tag by ID
   */
  async getTag(tagId: string, organizationId: string): Promise<LeadTag | null> {
    return prisma.leadTag.findFirst({
      where: { id: tagId, organizationId },
      include: {
        _count: {
          select: { leadAssignments: true },
        },
      },
    });
  }

  /**
   * Get tag by slug
   */
  async getTagBySlug(slug: string, organizationId: string): Promise<LeadTag | null> {
    return prisma.leadTag.findFirst({
      where: { slug, organizationId },
    });
  }

  // ==================== Lead Tag Assignment Operations ====================

  /**
   * Assign tags to a lead
   */
  async assignTagsToLead(
    leadId: string,
    tagIds: string[],
    organizationId: string,
    userId?: string
  ): Promise<LeadTagAssignment[]> {
    // Verify lead belongs to organization
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Verify all tags belong to organization and get their names
    const tags = await prisma.leadTag.findMany({
      where: {
        id: { in: tagIds },
        organizationId,
      },
    });

    if (tags.length !== tagIds.length) {
      throw new Error('One or more tags not found');
    }

    // Create assignments (upsert to avoid duplicates)
    const assignments: LeadTagAssignment[] = [];

    for (const tagId of tagIds) {
      const assignment = await prisma.leadTagAssignment.upsert({
        where: {
          leadId_tagId: {
            leadId,
            tagId,
          },
        },
        create: {
          leadId,
          tagId,
        },
        update: {},
      });
      assignments.push(assignment);
    }

    // Get tag names for activity description
    const tagNames = tags.map(t => t.name).join(', ');

    // Create activity log with user info
    await prisma.leadActivity.create({
      data: {
        leadId,
        userId,
        type: 'CUSTOM',
        title: 'Tag Added',
        description: `Added tag${tags.length > 1 ? 's' : ''}: ${tagNames}`,
        metadata: {
          action: 'tags_assigned',
          tagIds,
          tagNames: tags.map(t => ({ id: t.id, name: t.name, color: t.color })),
        },
      },
    });

    return assignments;
  }

  /**
   * Remove tags from a lead
   */
  async removeTagsFromLead(
    leadId: string,
    tagIds: string[],
    organizationId: string,
    userId?: string
  ): Promise<void> {
    // Verify lead belongs to organization
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Get tag names before deleting for activity log
    const tags = await prisma.leadTag.findMany({
      where: {
        id: { in: tagIds },
        organizationId,
      },
    });

    await prisma.leadTagAssignment.deleteMany({
      where: {
        leadId,
        tagId: { in: tagIds },
      },
    });

    // Get tag names for activity description
    const tagNames = tags.map(t => t.name).join(', ');

    // Create activity log with user info
    await prisma.leadActivity.create({
      data: {
        leadId,
        userId,
        type: 'CUSTOM',
        title: 'Tag Removed',
        description: `Removed tag${tags.length > 1 ? 's' : ''}: ${tagNames}`,
        metadata: {
          action: 'tags_removed',
          tagIds,
          tagNames: tags.map(t => ({ id: t.id, name: t.name, color: t.color })),
        },
      },
    });
  }

  /**
   * Get tags for a lead
   */
  async getLeadTags(leadId: string, organizationId?: string): Promise<LeadTag[]> {
    // If organizationId provided, verify lead belongs to organization
    if (organizationId) {
      const lead = await prisma.lead.findFirst({
        where: { id: leadId, organizationId },
      });

      if (!lead) {
        throw new Error('Lead not found');
      }
    }

    const assignments = await prisma.leadTagAssignment.findMany({
      where: { leadId },
      include: { tag: true },
    });

    return assignments.map((a) => a.tag);
  }

  /**
   * Get leads by tag
   */
  async getLeadsByTag(
    tagId: string,
    organizationId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{ leads: any[]; total: number }> {
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where: {
          organizationId,
          tagAssignments: {
            some: { tagId },
          },
        },
        include: {
          stage: true,
          tagAssignments: {
            include: { tag: true },
          },
        },
        take: options?.limit || 50,
        skip: options?.offset || 0,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.lead.count({
        where: {
          organizationId,
          tagAssignments: {
            some: { tagId },
          },
        },
      }),
    ]);

    return { leads, total };
  }

  /**
   * Get leads by multiple tags (AND/OR logic)
   */
  async getLeadsByTags(
    tagIds: string[],
    organizationId: string,
    logic: 'AND' | 'OR' = 'OR',
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{ leads: any[]; total: number }> {
    let whereClause: Prisma.LeadWhereInput;

    if (logic === 'AND') {
      // Lead must have ALL specified tags
      whereClause = {
        organizationId,
        AND: tagIds.map((tagId) => ({
          tagAssignments: {
            some: { tagId },
          },
        })),
      };
    } else {
      // Lead must have ANY of the specified tags
      whereClause = {
        organizationId,
        tagAssignments: {
          some: { tagId: { in: tagIds } },
        },
      };
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where: whereClause,
        include: {
          stage: true,
          tagAssignments: {
            include: { tag: true },
          },
        },
        take: options?.limit || 50,
        skip: options?.offset || 0,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.lead.count({ where: whereClause }),
    ]);

    return { leads, total };
  }

  // ==================== Bulk Operations ====================

  /**
   * Bulk assign tag to multiple leads
   */
  async bulkAssignTag(
    tagId: string,
    leadIds: string[],
    organizationId: string
  ): Promise<{ successCount: number; failedCount: number }> {
    // Verify tag exists
    const tag = await prisma.leadTag.findFirst({
      where: { id: tagId, organizationId },
    });

    if (!tag) {
      throw new Error('Tag not found');
    }

    // Verify all leads belong to organization
    const leads = await prisma.lead.findMany({
      where: {
        id: { in: leadIds },
        organizationId,
      },
      select: { id: true },
    });

    const validLeadIds = leads.map((l) => l.id);
    let successCount = 0;
    let failedCount = leadIds.length - validLeadIds.length;

    // Create assignments in batch
    for (const leadId of validLeadIds) {
      try {
        await prisma.leadTagAssignment.upsert({
          where: {
            leadId_tagId: { leadId, tagId },
          },
          create: { leadId, tagId },
          update: {},
        });
        successCount++;
      } catch (error) {
        failedCount++;
      }
    }

    return { successCount, failedCount };
  }

  /**
   * Bulk remove tag from multiple leads
   */
  async bulkRemoveTag(
    tagId: string,
    leadIds: string[],
    organizationId: string
  ): Promise<{ removedCount: number }> {
    // Verify tag exists
    const tag = await prisma.leadTag.findFirst({
      where: { id: tagId, organizationId },
    });

    if (!tag) {
      throw new Error('Tag not found');
    }

    const result = await prisma.leadTagAssignment.deleteMany({
      where: {
        tagId,
        leadId: { in: leadIds },
        lead: { organizationId },
      },
    });

    return { removedCount: result.count };
  }

  /**
   * Replace all tags on a lead
   */
  async replaceLeadTags(
    leadId: string,
    tagIds: string[],
    organizationId: string
  ): Promise<LeadTag[]> {
    // Verify lead belongs to organization
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Delete all existing tag assignments
    await prisma.leadTagAssignment.deleteMany({
      where: { leadId },
    });

    // Create new assignments
    if (tagIds.length > 0) {
      await prisma.leadTagAssignment.createMany({
        data: tagIds.map((tagId) => ({
          leadId,
          tagId,
        })),
      });
    }

    // Get and return the new tags
    return this.getLeadTags(leadId);
  }

  // ==================== System Tags ====================

  /**
   * Industry-specific tag templates
   */
  private getIndustryTags(industry?: string): Array<{ name: string; color: string; description: string }> {
    // Common tags for all industries
    const commonTags = [
      { name: 'Hot Lead', color: '#EF4444', description: 'High priority lead ready to convert' },
      { name: 'VIP', color: '#8B5CF6', description: 'Very important contact' },
      { name: 'Follow Up', color: '#F59E0B', description: 'Needs follow-up' },
      { name: 'Not Interested', color: '#6B7280', description: 'Lead declined offer' },
      { name: 'Callback', color: '#3B82F6', description: 'Requested callback' },
    ];

    // Industry-specific tags
    const industryTags: Record<string, Array<{ name: string; color: string; description: string }>> = {
      EDUCATION: [
        { name: 'Scholarship Required', color: '#10B981', description: 'Needs financial aid' },
        { name: 'Hostel Needed', color: '#06B6D4', description: 'Requires accommodation' },
        { name: 'Parent Follow-up', color: '#EC4899', description: 'Need to contact parents' },
        { name: 'Campus Visit Done', color: '#22C55E', description: 'Completed campus tour' },
        { name: 'Documents Pending', color: '#F97316', description: 'Waiting for documents' },
        { name: 'Fee Negotiation', color: '#EAB308', description: 'Discussing fee structure' },
      ],
      REAL_ESTATE: [
        { name: 'Site Visit Done', color: '#22C55E', description: 'Property visit completed' },
        { name: 'Site Visit Scheduled', color: '#06B6D4', description: 'Property visit planned' },
        { name: 'Loan Required', color: '#F97316', description: 'Needs home loan' },
        { name: 'NRI Buyer', color: '#8B5CF6', description: 'Non-resident buyer' },
        { name: 'Ready to Move', color: '#10B981', description: 'Wants immediate possession' },
        { name: 'Price Negotiation', color: '#EAB308', description: 'Discussing price' },
      ],
      HEALTHCARE: [
        { name: 'Insurance Patient', color: '#3B82F6', description: 'Has health insurance' },
        { name: 'Emergency', color: '#EF4444', description: 'Urgent medical need' },
        { name: 'Second Opinion', color: '#F59E0B', description: 'Seeking second opinion' },
        { name: 'Surgery Required', color: '#EC4899', description: 'Needs surgical procedure' },
        { name: 'Follow-up Care', color: '#10B981', description: 'Post-treatment follow-up' },
        { name: 'Reports Pending', color: '#F97316', description: 'Waiting for test results' },
      ],
      INSURANCE: [
        { name: 'Policy Renewal', color: '#3B82F6', description: 'Existing policy renewal' },
        { name: 'Claim Pending', color: '#F97316', description: 'Has pending claim' },
        { name: 'High Coverage', color: '#8B5CF6', description: 'Needs high sum assured' },
        { name: 'Family Floater', color: '#EC4899', description: 'Wants family coverage' },
        { name: 'Documents Pending', color: '#EAB308', description: 'KYC documents awaited' },
        { name: 'Medical Done', color: '#22C55E', description: 'Medical tests completed' },
      ],
      FINANCE: [
        { name: 'High Net Worth', color: '#8B5CF6', description: 'HNI client' },
        { name: 'Loan Approved', color: '#22C55E', description: 'Loan sanctioned' },
        { name: 'KYC Pending', color: '#F97316', description: 'KYC verification pending' },
        { name: 'CIBIL Issue', color: '#EF4444', description: 'Credit score concern' },
        { name: 'Documents Pending', color: '#EAB308', description: 'Waiting for documents' },
        { name: 'Disbursement Ready', color: '#10B981', description: 'Ready for disbursement' },
      ],
      IT_RECRUITMENT: [
        { name: 'Immediate Joiner', color: '#22C55E', description: 'Can join immediately' },
        { name: 'Notice Period', color: '#F59E0B', description: 'Currently serving notice' },
        { name: 'Remote Preferred', color: '#3B82F6', description: 'Prefers remote work' },
        { name: 'Salary Negotiation', color: '#EAB308', description: 'Discussing compensation' },
        { name: 'Interview Scheduled', color: '#06B6D4', description: 'Interview planned' },
        { name: 'Offer Released', color: '#8B5CF6', description: 'Offer letter sent' },
      ],
      ECOMMERCE: [
        { name: 'Repeat Customer', color: '#8B5CF6', description: 'Previous buyer' },
        { name: 'Cart Abandoned', color: '#EF4444', description: 'Left items in cart' },
        { name: 'Bulk Order', color: '#10B981', description: 'Interested in bulk purchase' },
        { name: 'COD Preferred', color: '#F97316', description: 'Cash on delivery' },
        { name: 'Return Request', color: '#EAB308', description: 'Wants to return product' },
        { name: 'Loyalty Member', color: '#EC4899', description: 'Loyalty program member' },
      ],
      GENERAL: [
        { name: 'Documents Pending', color: '#EC4899', description: 'Waiting for documents' },
        { name: 'Payment Pending', color: '#10B981', description: 'Payment awaited' },
        { name: 'Meeting Scheduled', color: '#06B6D4', description: 'Meeting planned' },
        { name: 'Proposal Sent', color: '#3B82F6', description: 'Proposal shared' },
        { name: 'Decision Maker', color: '#8B5CF6', description: 'Key decision maker' },
        { name: 'Budget Constraint', color: '#EAB308', description: 'Budget limitations' },
      ],
    };

    const normalizedIndustry = industry?.toUpperCase() || 'GENERAL';
    const specificTags = industryTags[normalizedIndustry] || industryTags.GENERAL;

    return [...commonTags, ...specificTags];
  }

  /**
   * Create default system tags for an organization based on industry
   */
  async createDefaultTags(organizationId: string, industry?: string): Promise<LeadTag[]> {
    // If industry not provided, try to get from organization
    let orgIndustry = industry;
    if (!orgIndustry) {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { industry: true },
      });
      orgIndustry = org?.industry || 'GENERAL';
    }

    const defaultTags = this.getIndustryTags(orgIndustry);

    const createdTags: LeadTag[] = [];

    for (const tag of defaultTags) {
      const slug = this.generateSlug(tag.name);

      const created = await prisma.leadTag.upsert({
        where: {
          organizationId_slug: { organizationId, slug },
        },
        create: {
          organizationId,
          name: tag.name,
          slug,
          color: tag.color,
          description: tag.description,
          isSystem: true,
        },
        update: {},
      });

      createdTags.push(created);
    }

    return createdTags;
  }

  /**
   * Get tag usage statistics
   */
  async getTagStats(organizationId: string): Promise<{
    totalTags: number;
    mostUsedTags: { tag: LeadTag; count: number }[];
    unusedTags: LeadTag[];
  }> {
    const tags = await prisma.leadTag.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { leadAssignments: true },
        },
      },
    });

    const sortedByUsage = [...tags].sort(
      (a, b) => (b._count?.leadAssignments || 0) - (a._count?.leadAssignments || 0)
    );

    return {
      totalTags: tags.length,
      mostUsedTags: sortedByUsage.slice(0, 10).map((t) => ({
        tag: t,
        count: t._count?.leadAssignments || 0,
      })),
      unusedTags: tags.filter((t) => (t._count?.leadAssignments || 0) === 0),
    };
  }
}

export const leadTagsService = new LeadTagsService();
