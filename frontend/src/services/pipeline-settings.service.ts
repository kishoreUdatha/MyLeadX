/**
 * Pipeline Settings Service
 * API client for pipeline configuration management
 */

import api from './api';

// Types
export interface PipelineStage {
  id: string;
  pipelineId: string;
  name: string;
  slug: string;
  order: number;
  color: string;
  icon?: string;
  stageType: 'entry' | 'active' | 'won' | 'lost' | 'archived';
  probability: number;
  expectedDays?: number;
  slaHours?: number;
  slaEscalateTo?: string;
  requiredFields: string[];
  autoActions: Record<string, any>;
  exitActions: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StageTransition {
  id: string;
  fromStageId: string;
  toStageId: string;
  isAllowed: boolean;
  requiresApproval: boolean;
  approvalRole?: string;
  approvalUserId?: string;
  conditions: Record<string, any>;
  autoTrigger: boolean;
  triggerActions: Record<string, any>;
  notifyOnTransition: string[];
  createdAt: string;
  updatedAt: string;
  fromStage?: PipelineStage;
  toStage?: PipelineStage;
}

export interface Pipeline {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  entityType: 'LEAD' | 'DEAL' | 'TICKET' | 'PROJECT';
  icon?: string;
  color: string;
  isDefault: boolean;
  isActive: boolean;
  autoMoveOnStale: boolean;
  staleAlertDays: number;
  allowMultiple: boolean;
  stages: PipelineStage[];
  transitions?: StageTransition[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    stages: number;
    records: number;
  };
}

export interface PipelineAnalytics {
  totalRecords: number;
  activeRecords: number;
  wonRecords: number;
  lostRecords: number;
  conversionRate: number;
  stageStats: {
    stageId: string;
    stageName: string;
    count: number;
    avgTimeMinutes: number;
  }[];
}

// Create pipeline input
export interface CreatePipelineInput {
  name: string;
  description?: string;
  entityType: 'LEAD' | 'DEAL' | 'TICKET' | 'PROJECT';
  icon?: string;
  color?: string;
  isDefault?: boolean;
  autoMoveOnStale?: boolean;
  staleAlertDays?: number;
}

// Create stage input
export interface CreateStageInput {
  name: string;
  color?: string;
  icon?: string;
  stageType?: 'entry' | 'active' | 'won' | 'lost' | 'archived';
  probability?: number;
  expectedDays?: number;
  slaHours?: number;
  slaEscalateTo?: string;
  requiredFields?: string[];
  autoActions?: Record<string, any>;
  exitActions?: Record<string, any>;
}

// Create transition input
export interface CreateTransitionInput {
  fromStageId: string;
  toStageId: string;
  isAllowed?: boolean;
  requiresApproval?: boolean;
  approvalRole?: string;
  conditions?: Record<string, any>;
  autoTrigger?: boolean;
  triggerActions?: Record<string, any>;
  notifyOnTransition?: string[];
}

// Pipeline template
export interface PipelineTemplate {
  name: string;
  description: string;
  entityType: 'LEAD' | 'DEAL';
  industry?: string;
  stages: {
    name: string;
    color: string;
    stageType: 'entry' | 'active' | 'won' | 'lost';
    probability: number;
  }[];
}

const pipelineSettingsService = {
  // ==================== PIPELINES ====================

  /**
   * Get all pipelines for the organization
   */
  async getPipelines(entityType?: string): Promise<Pipeline[]> {
    const params = entityType ? { entityType } : {};
    const response = await api.get('/pipelines', { params });
    return response.data.data || response.data;
  },

  /**
   * Get single pipeline with stages and transitions
   */
  async getPipeline(id: string): Promise<Pipeline> {
    const response = await api.get(`/pipelines/${id}`);
    return response.data.data || response.data;
  },

  /**
   * Create new pipeline
   */
  async createPipeline(data: CreatePipelineInput): Promise<Pipeline> {
    const response = await api.post('/pipelines', data);
    return response.data.data || response.data;
  },

  /**
   * Update pipeline
   */
  async updatePipeline(id: string, data: Partial<CreatePipelineInput>): Promise<Pipeline> {
    const response = await api.put(`/pipelines/${id}`, data);
    return response.data.data || response.data;
  },

  /**
   * Delete pipeline (soft delete)
   */
  async deletePipeline(id: string): Promise<void> {
    await api.delete(`/pipelines/${id}`);
  },

  /**
   * Get pipeline analytics
   */
  async getPipelineAnalytics(id: string): Promise<PipelineAnalytics> {
    const response = await api.get(`/pipelines/${id}/analytics`);
    return response.data.data || response.data;
  },

  // ==================== STAGES ====================

  /**
   * Create new stage in pipeline
   */
  async createStage(pipelineId: string, data: CreateStageInput): Promise<PipelineStage> {
    const response = await api.post(`/pipelines/${pipelineId}/stages`, data);
    return response.data.data || response.data;
  },

  /**
   * Update stage
   */
  async updateStage(pipelineId: string, stageId: string, data: Partial<CreateStageInput>): Promise<PipelineStage> {
    const response = await api.put(`/pipelines/${pipelineId}/stages/${stageId}`, data);
    return response.data.data || response.data;
  },

  /**
   * Delete stage (soft delete)
   */
  async deleteStage(pipelineId: string, stageId: string): Promise<void> {
    await api.delete(`/pipelines/${pipelineId}/stages/${stageId}`);
  },

  /**
   * Reorder stages
   */
  async reorderStages(pipelineId: string, stageIds: string[]): Promise<void> {
    await api.put(`/pipelines/${pipelineId}/stages/reorder`, { stageIds });
  },

  // ==================== TRANSITIONS ====================

  /**
   * Get allowed transitions from a stage
   */
  async getAllowedTransitions(stageId: string): Promise<StageTransition[]> {
    const response = await api.get(`/pipelines/stages/${stageId}/transitions`);
    return response.data.data || response.data;
  },

  /**
   * Create transition rule
   */
  async createTransition(data: CreateTransitionInput): Promise<StageTransition> {
    const response = await api.post('/pipelines/transitions', data);
    return response.data.data || response.data;
  },

  /**
   * Update transition rule
   */
  async updateTransition(id: string, data: Partial<CreateTransitionInput>): Promise<StageTransition> {
    const response = await api.put(`/pipelines/transitions/${id}`, data);
    return response.data.data || response.data;
  },

  /**
   * Delete transition rule
   */
  async deleteTransition(id: string): Promise<void> {
    await api.delete(`/pipelines/transitions/${id}`);
  },

  // ==================== TEMPLATES ====================

  /**
   * Get predefined pipeline templates
   */
  getTemplates(): PipelineTemplate[] {
    return [
      {
        name: 'Sales Pipeline',
        description: 'Standard sales pipeline for B2B/B2C',
        entityType: 'LEAD',
        stages: [
          { name: 'New Lead', color: '#6B7280', stageType: 'entry', probability: 10 },
          { name: 'Contacted', color: '#3B82F6', stageType: 'active', probability: 20 },
          { name: 'Qualified', color: '#8B5CF6', stageType: 'active', probability: 40 },
          { name: 'Proposal Sent', color: '#F59E0B', stageType: 'active', probability: 60 },
          { name: 'Negotiation', color: '#EC4899', stageType: 'active', probability: 80 },
          { name: 'Won', color: '#10B981', stageType: 'won', probability: 100 },
          { name: 'Lost', color: '#EF4444', stageType: 'lost', probability: 0 },
        ],
      },
      {
        name: 'Education Admissions',
        description: 'Student admission pipeline',
        entityType: 'LEAD',
        industry: 'EDUCATION',
        stages: [
          { name: 'Enquiry', color: '#6B7280', stageType: 'entry', probability: 10 },
          { name: 'Counseling Done', color: '#3B82F6', stageType: 'active', probability: 25 },
          { name: 'Campus Visit', color: '#8B5CF6', stageType: 'active', probability: 40 },
          { name: 'Application Submitted', color: '#F59E0B', stageType: 'active', probability: 60 },
          { name: 'Fee Discussion', color: '#EC4899', stageType: 'active', probability: 80 },
          { name: 'Enrolled', color: '#10B981', stageType: 'won', probability: 100 },
          { name: 'Dropped', color: '#EF4444', stageType: 'lost', probability: 0 },
        ],
      },
      {
        name: 'Real Estate Sales',
        description: 'Property sales pipeline',
        entityType: 'LEAD',
        industry: 'REAL_ESTATE',
        stages: [
          { name: 'New Enquiry', color: '#6B7280', stageType: 'entry', probability: 10 },
          { name: 'Site Visit Scheduled', color: '#3B82F6', stageType: 'active', probability: 20 },
          { name: 'Site Visit Done', color: '#8B5CF6', stageType: 'active', probability: 35 },
          { name: 'Negotiation', color: '#F59E0B', stageType: 'active', probability: 50 },
          { name: 'Booking Amount', color: '#EC4899', stageType: 'active', probability: 75 },
          { name: 'Documentation', color: '#14B8A6', stageType: 'active', probability: 90 },
          { name: 'Registered', color: '#10B981', stageType: 'won', probability: 100 },
          { name: 'Not Interested', color: '#EF4444', stageType: 'lost', probability: 0 },
        ],
      },
      {
        name: 'Healthcare Patient',
        description: 'Patient journey pipeline',
        entityType: 'LEAD',
        industry: 'HEALTHCARE',
        stages: [
          { name: 'Enquiry', color: '#6B7280', stageType: 'entry', probability: 15 },
          { name: 'Appointment Booked', color: '#3B82F6', stageType: 'active', probability: 30 },
          { name: 'Consultation Done', color: '#8B5CF6', stageType: 'active', probability: 50 },
          { name: 'Treatment Plan', color: '#F59E0B', stageType: 'active', probability: 70 },
          { name: 'Treatment Started', color: '#EC4899', stageType: 'active', probability: 85 },
          { name: 'Completed', color: '#10B981', stageType: 'won', probability: 100 },
          { name: 'Cancelled', color: '#EF4444', stageType: 'lost', probability: 0 },
        ],
      },
      {
        name: 'Insurance Policy',
        description: 'Insurance sales pipeline',
        entityType: 'LEAD',
        industry: 'INSURANCE',
        stages: [
          { name: 'Lead', color: '#6B7280', stageType: 'entry', probability: 10 },
          { name: 'Needs Analysis', color: '#3B82F6', stageType: 'active', probability: 25 },
          { name: 'Quote Generated', color: '#8B5CF6', stageType: 'active', probability: 40 },
          { name: 'Proposal Shared', color: '#F59E0B', stageType: 'active', probability: 60 },
          { name: 'Documents Collected', color: '#EC4899', stageType: 'active', probability: 80 },
          { name: 'Policy Issued', color: '#10B981', stageType: 'won', probability: 100 },
          { name: 'Rejected', color: '#EF4444', stageType: 'lost', probability: 0 },
        ],
      },
      {
        name: 'Deal Pipeline',
        description: 'B2B deal tracking',
        entityType: 'DEAL',
        stages: [
          { name: 'Prospecting', color: '#6B7280', stageType: 'entry', probability: 10 },
          { name: 'Discovery', color: '#3B82F6', stageType: 'active', probability: 20 },
          { name: 'Proposal', color: '#8B5CF6', stageType: 'active', probability: 40 },
          { name: 'Negotiation', color: '#F59E0B', stageType: 'active', probability: 60 },
          { name: 'Contract Sent', color: '#EC4899', stageType: 'active', probability: 80 },
          { name: 'Closed Won', color: '#10B981', stageType: 'won', probability: 100 },
          { name: 'Closed Lost', color: '#EF4444', stageType: 'lost', probability: 0 },
        ],
      },
    ];
  },

  /**
   * Create pipeline from template
   */
  async createFromTemplate(template: PipelineTemplate): Promise<Pipeline> {
    // First create the pipeline (set as default for this entity type)
    const pipeline = await this.createPipeline({
      name: template.name,
      description: template.description,
      entityType: template.entityType,
      color: template.stages[0]?.color || '#3B82F6',
      isDefault: true, // Set as default so leads use this pipeline
    });

    // Then create stages
    for (let i = 0; i < template.stages.length; i++) {
      const stage = template.stages[i];
      await this.createStage(pipeline.id, {
        name: stage.name,
        color: stage.color,
        stageType: stage.stageType,
        probability: stage.probability,
      });
    }

    // Fetch and return the complete pipeline
    return this.getPipeline(pipeline.id);
  },
};

export default pipelineSettingsService;
