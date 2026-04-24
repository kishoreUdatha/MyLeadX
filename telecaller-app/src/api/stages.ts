import api from './index';

// Pipeline Stage interface matching backend (unified system - same as web)
export interface LeadStage {
  id: string;
  organizationId?: string;
  pipelineId?: string;
  name: string;
  slug: string;
  color: string;
  order: number;
  journeyOrder?: number;
  icon?: string;
  isActive: boolean;
  stageType?: 'entry' | 'active' | 'won' | 'lost' | null;
  autoSyncStatus?: 'WON' | 'LOST' | null;
}

export interface StagesResponse {
  stages: LeadStage[];
  industry: string;
  total: number;
}

export interface JourneyStagesResponse {
  progressStages: LeadStage[];
  lostStage: LeadStage | null;
  industry: string;
}

// Get all pipeline stages for the organization (unified system - same as web)
export const getStages = async (): Promise<LeadStage[]> => {
  const response = await api.get('/lead-pipeline/stages');
  return response.data.data || [];
};

// Get journey stages (ordered for display) - uses unified pipeline system
export const getJourneyStages = async (): Promise<JourneyStagesResponse> => {
  try {
    const response = await api.get('/lead-pipeline/stages');
    const allStages: LeadStage[] = response.data.data || [];

    // Map pipeline stages to journey format
    const mappedStages = allStages.map((stage: any) => ({
      id: stage.id,
      name: stage.name,
      slug: stage.slug,
      color: stage.color || '#6B7280',
      order: stage.order,
      journeyOrder: stage.stageType === 'lost' ? -1 : stage.order,
      stageType: stage.stageType || 'active',
      autoSyncStatus: stage.stageType === 'won' ? 'WON' : stage.stageType === 'lost' ? 'LOST' : null,
      isActive: stage.isActive !== false,
    }));

    // Separate progress stages (journeyOrder >= 0) from lost stage
    const progressStages = mappedStages.filter((s: LeadStage) => (s.journeyOrder || 0) >= 0);
    const lostStage = mappedStages.find((s: LeadStage) => (s.journeyOrder || 0) < 0) || null;

    // Get industry from separate API
    let industry = 'GENERAL';
    try {
      const industryRes = await api.get('/lead-stages/industry');
      industry = industryRes.data.data?.industry || 'GENERAL';
    } catch (e) {
      console.log('[StagesAPI] Could not fetch industry, using default');
    }

    return { progressStages, lostStage, industry };
  } catch (error) {
    console.error('[StagesAPI] Error fetching journey stages:', error);
    return { progressStages: [], lostStage: null, industry: 'GENERAL' };
  }
};

// Update a lead's stage using unified pipeline API (same as web)
export const updateLeadStage = async (leadId: string, stageId: string): Promise<any> => {
  console.log('[StagesAPI] Moving lead to stage (unified pipeline):', { leadId, stageId });
  try {
    // Use the unified pipeline API - same as web
    const response = await api.post(`/lead-pipeline/${leadId}/move`, { toStageId: stageId });
    console.log('[StagesAPI] Stage move response:', JSON.stringify(response.data));
    return response.data.data;
  } catch (error: any) {
    console.error('[StagesAPI] Stage move error:', error.response?.data || error.message);
    throw error;
  }
};

export default {
  getStages,
  getJourneyStages,
  updateLeadStage,
};
