/**
 * Lead Source Service
 * Frontend API service for managing custom lead sources
 */

import api from './api';

export interface LeadSource {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon?: string;
  description?: string;
  isActive: boolean;
  isSystem: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadSourceInput {
  name: string;
  slug?: string;
  color?: string;
  icon?: string;
  description?: string;
  order?: number;
}

export interface UpdateLeadSourceInput {
  name?: string;
  color?: string;
  icon?: string;
  description?: string;
  isActive?: boolean;
  order?: number;
}

export const leadSourceService = {
  async getAll(includeInactive = false): Promise<LeadSource[]> {
    const response = await api.get('/lead-sources', {
      params: { includeInactive },
    });
    return response.data.data.sources;
  },

  async getById(id: string): Promise<LeadSource> {
    const response = await api.get(`/lead-sources/${id}`);
    return response.data.data.source;
  },

  async create(data: CreateLeadSourceInput): Promise<LeadSource> {
    const response = await api.post('/lead-sources', data);
    return response.data.data.source;
  },

  async update(id: string, data: UpdateLeadSourceInput): Promise<LeadSource> {
    const response = await api.put(`/lead-sources/${id}`, data);
    return response.data.data.source;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/lead-sources/${id}`);
  },

  async reorder(sourceIds: string[]): Promise<LeadSource[]> {
    const response = await api.post('/lead-sources/reorder', { sourceIds });
    return response.data.data.sources;
  },

  async initialize(): Promise<LeadSource[]> {
    const response = await api.post('/lead-sources/initialize');
    return response.data.data.sources;
  },
};
