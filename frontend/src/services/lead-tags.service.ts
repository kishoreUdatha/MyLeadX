/**
 * Lead Tags Service
 * API client for tag management and lead-tag assignments
 */

import api from './api';

export interface LeadTag {
  id: string;
  name: string;
  slug: string;
  color: string;
  description?: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    leadAssignments: number;
  };
}

export interface TagStats {
  totalTags: number;
  totalAssignments: number;
  topTags: Array<{ id: string; name: string; color: string; count: number }>;
  unusedTags: Array<{ id: string; name: string; color: string }>;
}

export interface CreateTagData {
  name: string;
  color?: string;
  description?: string;
}

export interface UpdateTagData {
  name?: string;
  color?: string;
  description?: string;
}

class LeadTagsService {
  // ==================== Tag CRUD ====================

  async getTags(includeCount = true): Promise<{ tags: LeadTag[]; total: number }> {
    const response = await api.get(`/lead-tags?includeCount=${includeCount}`);
    return response.data?.data || { tags: [], total: 0 };
  }

  async getTag(tagId: string): Promise<LeadTag> {
    const response = await api.get(`/lead-tags/${tagId}`);
    return response.data?.data;
  }

  async createTag(data: CreateTagData): Promise<LeadTag> {
    const response = await api.post('/lead-tags', data);
    return response.data?.data;
  }

  async updateTag(tagId: string, data: UpdateTagData): Promise<LeadTag> {
    const response = await api.put(`/lead-tags/${tagId}`, data);
    return response.data?.data;
  }

  async deleteTag(tagId: string): Promise<void> {
    await api.delete(`/lead-tags/${tagId}`);
  }

  async getTagStats(): Promise<TagStats> {
    const response = await api.get('/lead-tags/stats');
    return response.data?.data;
  }

  // ==================== Lead-Tag Assignments ====================

  async getLeadTags(leadId: string): Promise<LeadTag[]> {
    const response = await api.get(`/lead-tags/lead/${leadId}`);
    // API returns { tags: [], total: N }
    const data = response.data?.data;
    return data?.tags || [];
  }

  async assignTagsToLead(leadId: string, tagIds: string[]): Promise<void> {
    await api.post(`/lead-tags/lead/${leadId}/assign`, { tagIds });
  }

  async removeTagsFromLead(leadId: string, tagIds: string[]): Promise<void> {
    await api.post(`/lead-tags/lead/${leadId}/remove`, { tagIds });
  }

  async replaceLeadTags(leadId: string, tagIds: string[]): Promise<void> {
    await api.put(`/lead-tags/lead/${leadId}/replace`, { tagIds });
  }

  // ==================== Lead Filtering by Tags ====================

  async getLeadsByTag(tagId: string, page = 1, limit = 20): Promise<{ leads: any[]; total: number }> {
    const response = await api.get(`/lead-tags/${tagId}/leads?page=${page}&limit=${limit}`);
    return response.data?.data || { leads: [], total: 0 };
  }

  async getLeadsByTags(
    tagIds: string[],
    logic: 'AND' | 'OR' = 'OR',
    page = 1,
    limit = 20
  ): Promise<{ leads: any[]; total: number }> {
    const response = await api.post('/lead-tags/filter', { tagIds, logic, page, limit });
    return response.data?.data || { leads: [], total: 0 };
  }

  // ==================== Bulk Operations ====================

  async bulkAssignTag(tagId: string, leadIds: string[]): Promise<{ assigned: number }> {
    const response = await api.post(`/lead-tags/${tagId}/bulk-assign`, { leadIds });
    return response.data?.data;
  }

  async bulkRemoveTag(tagId: string, leadIds: string[]): Promise<{ removed: number }> {
    const response = await api.post(`/lead-tags/${tagId}/bulk-remove`, { leadIds });
    return response.data?.data;
  }

  // ==================== System Tags ====================

  async createDefaultTags(): Promise<LeadTag[]> {
    const response = await api.post('/lead-tags/create-defaults');
    return response.data?.data || [];
  }
}

export const leadTagsService = new LeadTagsService();
export default leadTagsService;
