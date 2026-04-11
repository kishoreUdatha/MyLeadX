/**
 * Follow-up Configuration Service
 * Frontend API service for managing follow-up settings
 */

import api from './api';

export interface FollowUpConfig {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  defaultIntervalHours: number;
  maxAttempts: number;
  escalationAfterHours?: number | null;
  reminderEnabled: boolean;
  reminderBeforeMinutes: number;
  autoMoveToStageId?: string | null;
  autoAssignToManagerId?: string | null;
  priorityAfterAttempts?: number | null;
  isActive: boolean;
  isDefault: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Manager {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: { name: string; slug: string };
}

export interface Stage {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export interface CreateFollowUpConfigInput {
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

export interface UpdateFollowUpConfigInput extends Partial<CreateFollowUpConfigInput> {
  isActive?: boolean;
}

export const followUpConfigService = {
  async getAll(includeInactive = false): Promise<FollowUpConfig[]> {
    const response = await api.get('/follow-up-config', {
      params: { includeInactive },
    });
    return response.data.data.configs;
  },

  async getDefault(): Promise<FollowUpConfig | null> {
    const response = await api.get('/follow-up-config/default');
    return response.data.data.config;
  },

  async getById(id: string): Promise<FollowUpConfig> {
    const response = await api.get(`/follow-up-config/${id}`);
    return response.data.data.config;
  },

  async create(data: CreateFollowUpConfigInput): Promise<FollowUpConfig> {
    const response = await api.post('/follow-up-config', data);
    return response.data.data.config;
  },

  async update(id: string, data: UpdateFollowUpConfigInput): Promise<FollowUpConfig> {
    const response = await api.put(`/follow-up-config/${id}`, data);
    return response.data.data.config;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/follow-up-config/${id}`);
  },

  async setDefault(id: string): Promise<FollowUpConfig> {
    const response = await api.post(`/follow-up-config/${id}/set-default`);
    return response.data.data.config;
  },

  async initialize(): Promise<FollowUpConfig[]> {
    const response = await api.post('/follow-up-config/initialize');
    return response.data.data.configs;
  },

  async getAvailableManagers(): Promise<Manager[]> {
    const response = await api.get('/follow-up-config/managers');
    return response.data.data.managers;
  },

  async getAvailableStages(): Promise<Stage[]> {
    const response = await api.get('/follow-up-config/stages');
    return response.data.data.stages;
  },
};
