/**
 * Lead Pipeline Service
 * Frontend API client for unified lead pipeline system
 */

import api from './api';

export interface PipelineStage {
  id: string;
  name: string;
  color: string;
  order: number;
  stageType?: string;
  probability?: number;
  slaHours?: number;
}

export interface PipelineLead {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  pipelineStageId: string;
  pipelineEnteredAt?: string;
  pipelineDaysInStage?: number;
  pipelineStage?: PipelineStage;
  assignments?: {
    assignedTo: {
      id: string;
      firstName: string;
      lastName?: string;
    };
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface StageWithLeads extends PipelineStage {
  leads: PipelineLead[];
  count: number;
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  stages: PipelineStage[];
}

export interface KanbanData {
  pipeline: Pipeline | null;
  stages: StageWithLeads[];
  totalLeads: number;
}

export interface PipelineAnalytics {
  pipelineId: string;
  pipelineName: string;
  totalLeads: number;
  wonCount: number;
  lostCount: number;
  conversionRate: number;
  stageStats: {
    stageId: string;
    stageName: string;
    stageType?: string;
    color: string;
    count: number;
    probability?: number;
  }[];
}

export interface SLABreach {
  leadId: string;
  leadName: string;
  stageId: string;
  stageName: string;
  slaHours: number;
  hoursInStage: number;
  hoursOverdue: number;
}

export interface StageHistoryEntry {
  stageId: string;
  stageName: string;
  enteredAt: string;
  exitedAt?: string;
  durationMinutes?: number;
  changedByUserId?: string;
}

class LeadPipelineService {
  /**
   * Get pipeline stages for Kanban view
   */
  async getStages(): Promise<PipelineStage[]> {
    const response = await api.get('/lead-pipeline/stages');
    return response.data.data;
  }

  /**
   * Get leads grouped by pipeline stage (Kanban view)
   */
  async getKanbanData(filters?: {
    assignedTo?: string;
    source?: string;
    search?: string;
  }): Promise<KanbanData> {
    const params = new URLSearchParams();
    if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);
    if (filters?.source) params.append('source', filters.source);
    if (filters?.search) params.append('search', filters.search);

    const response = await api.get(`/lead-pipeline/kanban?${params.toString()}`);
    return response.data.data;
  }

  /**
   * Get pipeline analytics
   */
  async getAnalytics(): Promise<PipelineAnalytics> {
    const response = await api.get('/lead-pipeline/analytics');
    return response.data.data;
  }

  /**
   * Get leads that have breached SLA
   */
  async getSLABreaches(): Promise<SLABreach[]> {
    const response = await api.get('/lead-pipeline/sla-breaches');
    return response.data.data;
  }

  /**
   * Move a lead to a different stage
   */
  async moveLeadToStage(
    leadId: string,
    toStageId: string,
    reason?: string
  ): Promise<PipelineLead> {
    const response = await api.post(`/lead-pipeline/${leadId}/move`, {
      toStageId,
      reason,
    });
    return response.data.data;
  }

  /**
   * Get stage history for a lead
   */
  async getLeadHistory(leadId: string): Promise<StageHistoryEntry[]> {
    const response = await api.get(`/lead-pipeline/${leadId}/history`);
    return response.data.data;
  }

  /**
   * Manually assign a lead to the default pipeline
   */
  async assignLeadToPipeline(leadId: string): Promise<PipelineLead> {
    const response = await api.post(`/lead-pipeline/${leadId}/assign`);
    return response.data.data;
  }
}

export const leadPipelineService = new LeadPipelineService();
