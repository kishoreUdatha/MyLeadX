/**
 * Contacts Service
 * Manages contacts and groups for standalone messaging portal
 */

import { prisma } from '../../config/database';
import { MessagingContactUploadStatus } from '@prisma/client';
import { parse as csvParse } from 'csv-parse/sync';

export interface CreateContactParams {
  organizationId: string;
  phone: string;
  name?: string;
  email?: string;
  customFields?: Record<string, string>;
  groupIds?: string[];
}

export interface UpdateContactParams {
  name?: string;
  email?: string;
  customFields?: Record<string, string>;
  groupIds?: string[];
  smsOptOut?: boolean;
  whatsappOptOut?: boolean;
  rcsOptOut?: boolean;
}

export interface ContactFilters {
  search?: string;
  groupId?: string;
  isActive?: boolean;
  optedOut?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateGroupParams {
  organizationId: string;
  name: string;
  description?: string;
  color?: string;
}

export interface UploadCsvParams {
  organizationId: string;
  userId: string;
  fileName: string;
  fileSize: number;
  originalName: string;
  content: string;
  columnMapping: Record<string, string>;
  targetGroupId?: string;
}

class ContactsService {
  /**
   * Create a new contact
   */
  async createContact(params: CreateContactParams) {
    const { organizationId, phone, name, email, customFields, groupIds } = params;

    // Normalize phone number
    const normalizedPhone = this.normalizePhone(phone);

    // Check for duplicate
    const existing = await prisma.messagingContact.findUnique({
      where: {
        organizationId_phone: {
          organizationId,
          phone: normalizedPhone,
        },
      },
    });

    if (existing) {
      throw new Error('Contact with this phone number already exists');
    }

    // Create contact with group memberships
    const contact = await prisma.messagingContact.create({
      data: {
        organizationId,
        phone: normalizedPhone,
        name,
        email,
        customFields: customFields || {},
        source: 'MANUAL',
        groups: groupIds
          ? {
              create: groupIds.map((groupId) => ({
                groupId,
              })),
            }
          : undefined,
      },
      include: {
        groups: {
          include: {
            group: true,
          },
        },
      },
    });

    // Update group contact counts
    if (groupIds) {
      await prisma.messagingContactGroup.updateMany({
        where: { id: { in: groupIds } },
        data: { contactCount: { increment: 1 } },
      });
    }

    return contact;
  }

  /**
   * Get a contact by ID
   */
  async getContact(id: string) {
    return prisma.messagingContact.findUnique({
      where: { id },
      include: {
        groups: {
          include: {
            group: true,
          },
        },
      },
    });
  }

  /**
   * Update a contact
   */
  async updateContact(id: string, params: UpdateContactParams) {
    const { name, email, customFields, groupIds, smsOptOut, whatsappOptOut, rcsOptOut } = params;

    // Get current contact
    const current = await prisma.messagingContact.findUnique({
      where: { id },
      include: { groups: true },
    });

    if (!current) {
      throw new Error('Contact not found');
    }

    // Update group memberships if provided
    if (groupIds !== undefined) {
      const currentGroupIds = current.groups.map((g) => g.groupId);
      const toAdd = groupIds.filter((gid) => !currentGroupIds.includes(gid));
      const toRemove = currentGroupIds.filter((gid) => !groupIds.includes(gid));

      // Remove from old groups
      if (toRemove.length > 0) {
        await prisma.messagingContactGroupMember.deleteMany({
          where: {
            contactId: id,
            groupId: { in: toRemove },
          },
        });

        await prisma.messagingContactGroup.updateMany({
          where: { id: { in: toRemove } },
          data: { contactCount: { decrement: 1 } },
        });
      }

      // Add to new groups
      if (toAdd.length > 0) {
        await prisma.messagingContactGroupMember.createMany({
          data: toAdd.map((groupId) => ({
            contactId: id,
            groupId,
          })),
        });

        await prisma.messagingContactGroup.updateMany({
          where: { id: { in: toAdd } },
          data: { contactCount: { increment: 1 } },
        });
      }
    }

    // Update contact
    return prisma.messagingContact.update({
      where: { id },
      data: {
        name,
        email,
        customFields: customFields ? { ...(current.customFields as object), ...customFields } : undefined,
        smsOptOut,
        whatsappOptOut,
        rcsOptOut,
        optOutAt:
          (smsOptOut || whatsappOptOut || rcsOptOut) && !current.optOutAt ? new Date() : undefined,
      },
      include: {
        groups: {
          include: {
            group: true,
          },
        },
      },
    });
  }

  /**
   * Delete a contact
   */
  async deleteContact(id: string) {
    const contact = await prisma.messagingContact.findUnique({
      where: { id },
      include: { groups: true },
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    // Update group counts
    const groupIds = contact.groups.map((g) => g.groupId);
    if (groupIds.length > 0) {
      await prisma.messagingContactGroup.updateMany({
        where: { id: { in: groupIds } },
        data: { contactCount: { decrement: 1 } },
      });
    }

    // Delete contact (cascade deletes group memberships)
    await prisma.messagingContact.delete({
      where: { id },
    });

    return { success: true };
  }

  /**
   * List contacts with filters
   */
  async listContacts(organizationId: string, filters: ContactFilters = {}) {
    const { search, groupId, isActive, optedOut, page = 1, limit = 50 } = filters;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { organizationId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (groupId) {
      where.groups = { some: { groupId } };
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (optedOut) {
      where.OR = [{ smsOptOut: true }, { whatsappOptOut: true }, { rcsOptOut: true }];
    }

    const [contacts, total] = await Promise.all([
      prisma.messagingContact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          groups: {
            include: {
              group: true,
            },
          },
        },
      }),
      prisma.messagingContact.count({ where }),
    ]);

    return {
      contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a contact group
   */
  async createGroup(params: CreateGroupParams) {
    const { organizationId, name, description, color } = params;

    // Check for duplicate name
    const existing = await prisma.messagingContactGroup.findUnique({
      where: {
        organizationId_name: {
          organizationId,
          name,
        },
      },
    });

    if (existing) {
      throw new Error('Group with this name already exists');
    }

    return prisma.messagingContactGroup.create({
      data: {
        organizationId,
        name,
        description,
        color,
      },
    });
  }

  /**
   * Get a group by ID
   */
  async getGroup(id: string) {
    return prisma.messagingContactGroup.findUnique({
      where: { id },
    });
  }

  /**
   * Update a group
   */
  async updateGroup(id: string, data: { name?: string; description?: string; color?: string }) {
    return prisma.messagingContactGroup.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a group
   */
  async deleteGroup(id: string) {
    // Delete group (cascade deletes memberships)
    await prisma.messagingContactGroup.delete({
      where: { id },
    });

    return { success: true };
  }

  /**
   * List groups for an organization
   */
  async listGroups(organizationId: string) {
    return prisma.messagingContactGroup.findMany({
      where: { organizationId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Add contacts to a group
   */
  async addContactsToGroup(groupId: string, contactIds: string[]) {
    // Get existing memberships
    const existing = await prisma.messagingContactGroupMember.findMany({
      where: { groupId, contactId: { in: contactIds } },
    });

    const existingContactIds = existing.map((e) => e.contactId);
    const toAdd = contactIds.filter((id) => !existingContactIds.includes(id));

    if (toAdd.length === 0) {
      return { added: 0 };
    }

    // Add new memberships
    await prisma.messagingContactGroupMember.createMany({
      data: toAdd.map((contactId) => ({
        contactId,
        groupId,
      })),
    });

    // Update group count
    await prisma.messagingContactGroup.update({
      where: { id: groupId },
      data: { contactCount: { increment: toAdd.length } },
    });

    return { added: toAdd.length };
  }

  /**
   * Remove contacts from a group
   */
  async removeContactsFromGroup(groupId: string, contactIds: string[]) {
    const result = await prisma.messagingContactGroupMember.deleteMany({
      where: {
        groupId,
        contactId: { in: contactIds },
      },
    });

    // Update group count
    await prisma.messagingContactGroup.update({
      where: { id: groupId },
      data: { contactCount: { decrement: result.count } },
    });

    return { removed: result.count };
  }

  /**
   * Get contacts in a group
   */
  async getGroupContacts(
    groupId: string,
    options: { page?: number; limit?: number; search?: string } = {}
  ) {
    const { page = 1, limit = 50, search } = options;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      groups: { some: { groupId } },
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [contacts, total] = await Promise.all([
      prisma.messagingContact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.messagingContact.count({ where }),
    ]);

    return {
      contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Upload contacts from CSV
   */
  async uploadCsv(params: UploadCsvParams) {
    const { organizationId, userId, fileName, fileSize, originalName, content, columnMapping, targetGroupId } =
      params;

    // Create upload record
    const upload = await prisma.messagingContactUpload.create({
      data: {
        organizationId,
        userId,
        fileName,
        fileSize,
        originalName,
        columnMapping,
        targetGroupId,
        status: MessagingContactUploadStatus.PENDING,
      },
    });

    // Process CSV in background
    this.processCsvUpload(upload.id, content, columnMapping, organizationId, targetGroupId).catch(
      console.error
    );

    return upload;
  }

  /**
   * Process CSV upload in background
   */
  private async processCsvUpload(
    uploadId: string,
    content: string,
    columnMapping: Record<string, string>,
    organizationId: string,
    targetGroupId?: string
  ): Promise<void> {
    try {
      // Update status to processing
      await prisma.messagingContactUpload.update({
        where: { id: uploadId },
        data: { status: MessagingContactUploadStatus.PROCESSING },
      });

      // Parse CSV
      const records = csvParse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      const totalRows = records.length;
      let successCount = 0;
      let failedCount = 0;
      let skippedCount = 0;
      const errors: { row: number; error: string }[] = [];

      // Process each row
      for (let i = 0; i < records.length; i++) {
        const row = records[i];

        try {
          // Extract phone using column mapping
          const phoneColumn = columnMapping.phone;
          const phone = row[phoneColumn];

          if (!phone) {
            errors.push({ row: i + 2, error: 'Missing phone number' });
            failedCount++;
            continue;
          }

          const normalizedPhone = this.normalizePhone(phone);

          // Check for existing contact
          const existing = await prisma.messagingContact.findUnique({
            where: {
              organizationId_phone: {
                organizationId,
                phone: normalizedPhone,
              },
            },
          });

          if (existing) {
            // Add to group if specified
            if (targetGroupId) {
              await this.addContactsToGroup(targetGroupId, [existing.id]);
            }
            skippedCount++;
            continue;
          }

          // Extract other fields
          const name = columnMapping.name ? row[columnMapping.name] : undefined;
          const email = columnMapping.email ? row[columnMapping.email] : undefined;

          // Extract custom fields
          const customFields: Record<string, string> = {};
          for (const [field, column] of Object.entries(columnMapping)) {
            if (!['phone', 'name', 'email'].includes(field) && row[column]) {
              customFields[field] = row[column];
            }
          }

          // Create contact
          await this.createContact({
            organizationId,
            phone: normalizedPhone,
            name,
            email,
            customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
            groupIds: targetGroupId ? [targetGroupId] : undefined,
          });

          successCount++;
        } catch (error: any) {
          errors.push({ row: i + 2, error: error.message });
          failedCount++;
        }
      }

      // Update upload record with results
      await prisma.messagingContactUpload.update({
        where: { id: uploadId },
        data: {
          status: MessagingContactUploadStatus.COMPLETED,
          totalRows,
          successCount,
          failedCount,
          skippedCount,
          errors: errors.slice(0, 100), // Limit errors to first 100
          processedAt: new Date(),
        },
      });
    } catch (error: any) {
      console.error('[Contacts] CSV processing error:', error);

      await prisma.messagingContactUpload.update({
        where: { id: uploadId },
        data: {
          status: MessagingContactUploadStatus.FAILED,
          errors: [{ row: 0, error: error.message }],
        },
      });
    }
  }

  /**
   * Get upload status
   */
  async getUploadStatus(uploadId: string) {
    return prisma.messagingContactUpload.findUnique({
      where: { id: uploadId },
    });
  }

  /**
   * List uploads for an organization
   */
  async listUploads(organizationId: string, options: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [uploads, total] = await Promise.all([
      prisma.messagingContactUpload.findMany({
        where: { organizationId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.messagingContactUpload.count({ where: { organizationId } }),
    ]);

    return {
      uploads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Normalize phone number
   */
  private normalizePhone(phone: string): string {
    let cleaned = phone.replace(/[^\d+]/g, '');
    cleaned = cleaned.replace(/^\+/, '');

    // If 10 digits, assume Indian number
    if (cleaned.length === 10 && !cleaned.startsWith('91')) {
      cleaned = '91' + cleaned;
    }

    // Remove leading 0
    if (cleaned.startsWith('0')) {
      cleaned = '91' + cleaned.substring(1);
    }

    return cleaned;
  }

  /**
   * Get contact count for organization
   */
  async getContactCount(organizationId: string): Promise<number> {
    return prisma.messagingContact.count({
      where: { organizationId, isActive: true },
    });
  }

  /**
   * Export contacts to CSV format
   */
  async exportContacts(organizationId: string, groupId?: string): Promise<string> {
    const where: Record<string, unknown> = { organizationId };
    if (groupId) {
      where.groups = { some: { groupId } };
    }

    const contacts = await prisma.messagingContact.findMany({
      where,
      include: {
        groups: {
          include: {
            group: true,
          },
        },
      },
    });

    // Build CSV content
    const headers = ['Phone', 'Name', 'Email', 'Groups', 'SMS Opt-Out', 'WhatsApp Opt-Out', 'RCS Opt-Out', 'Created At'];
    const rows = contacts.map((contact) => [
      contact.phone,
      contact.name || '',
      contact.email || '',
      contact.groups.map((g) => g.group.name).join('; '),
      contact.smsOptOut ? 'Yes' : 'No',
      contact.whatsappOptOut ? 'Yes' : 'No',
      contact.rcsOptOut ? 'Yes' : 'No',
      contact.createdAt.toISOString(),
    ]);

    return [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');
  }
}

export const contactsService = new ContactsService();
