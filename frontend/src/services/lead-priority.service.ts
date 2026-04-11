import api from './api';

export interface PriorityLevel {
  id: string;
  name: string;
  color: string;
  minScore: number;
  maxScore: number;
  slaHours: number;
  autoAssign: boolean;
}

export interface ScoringRule {
  id: string;
  name: string;
  field: string;
  operator: string;
  value: any;
  points: number;
  isActive: boolean;
  order: number;
}

export interface LeadPrioritySettings {
  organizationId?: string;
  priorityLevels: PriorityLevel[];
  scoringRules: ScoringRule[];
  autoScoringEnabled: boolean;
  recalculateOnUpdate: boolean;
  escalationEnabled: boolean;
  escalationThreshold: number;
}

export interface ScoreResult {
  score: number;
  matchedRules: ScoringRule[];
}

// Get lead priority settings
export const getLeadPrioritySettings = async (): Promise<LeadPrioritySettings> => {
  const response = await api.get('/settings/lead-priority');
  return response.data.data;
};

// Update lead priority settings
export const updateLeadPrioritySettings = async (
  data: Partial<{
    autoScoringEnabled: boolean;
    recalculateOnUpdate: boolean;
    escalationEnabled: boolean;
    escalationThreshold: number;
  }>
): Promise<LeadPrioritySettings> => {
  const response = await api.put('/settings/lead-priority', data);
  return response.data.data;
};

// Reset to defaults
export const resetLeadPrioritySettings = async (): Promise<LeadPrioritySettings> => {
  const response = await api.post('/settings/lead-priority/reset');
  return response.data.data;
};

// ==================== PRIORITY LEVELS ====================

// Get priority levels
export const getPriorityLevels = async (): Promise<PriorityLevel[]> => {
  const response = await api.get('/settings/lead-priority/levels');
  return response.data.data;
};

// Update all priority levels
export const updatePriorityLevels = async (levels: PriorityLevel[]): Promise<LeadPrioritySettings> => {
  const response = await api.put('/settings/lead-priority/levels', { levels });
  return response.data.data;
};

// Add priority level
export const addPriorityLevel = async (level: PriorityLevel): Promise<LeadPrioritySettings> => {
  const response = await api.post('/settings/lead-priority/levels', level);
  return response.data.data;
};

// Update single priority level
export const updatePriorityLevel = async (
  levelId: string,
  data: Partial<PriorityLevel>
): Promise<LeadPrioritySettings> => {
  const response = await api.put(`/settings/lead-priority/levels/${levelId}`, data);
  return response.data.data;
};

// Delete priority level
export const deletePriorityLevel = async (levelId: string): Promise<LeadPrioritySettings> => {
  const response = await api.delete(`/settings/lead-priority/levels/${levelId}`);
  return response.data.data;
};

// ==================== SCORING RULES ====================

// Get scoring rules
export const getScoringRules = async (): Promise<ScoringRule[]> => {
  const response = await api.get('/settings/lead-priority/rules');
  return response.data.data;
};

// Update all scoring rules
export const updateScoringRules = async (rules: ScoringRule[]): Promise<LeadPrioritySettings> => {
  const response = await api.put('/settings/lead-priority/rules', { rules });
  return response.data.data;
};

// Add scoring rule
export const addScoringRule = async (rule: Omit<ScoringRule, 'isActive' | 'order'> & { isActive?: boolean; order?: number }): Promise<LeadPrioritySettings> => {
  const response = await api.post('/settings/lead-priority/rules', rule);
  return response.data.data;
};

// Update single scoring rule
export const updateScoringRule = async (
  ruleId: string,
  data: Partial<ScoringRule>
): Promise<LeadPrioritySettings> => {
  const response = await api.put(`/settings/lead-priority/rules/${ruleId}`, data);
  return response.data.data;
};

// Delete scoring rule
export const deleteScoringRule = async (ruleId: string): Promise<LeadPrioritySettings> => {
  const response = await api.delete(`/settings/lead-priority/rules/${ruleId}`);
  return response.data.data;
};

// Toggle scoring rule active status
export const toggleScoringRule = async (ruleId: string): Promise<LeadPrioritySettings> => {
  const response = await api.patch(`/settings/lead-priority/rules/${ruleId}/toggle`);
  return response.data.data;
};

// ==================== LEAD SCORING ====================

// Calculate lead score
export const calculateLeadScore = async (leadData: Record<string, any>): Promise<ScoreResult> => {
  const response = await api.post('/settings/lead-priority/calculate', { leadData });
  return response.data.data;
};

// Get priority level for score
export const getPriorityForScore = async (score: number): Promise<PriorityLevel> => {
  const response = await api.get(`/settings/lead-priority/priority-for-score/${score}`);
  return response.data.data;
};

export const leadPriorityService = {
  getLeadPrioritySettings,
  updateLeadPrioritySettings,
  resetLeadPrioritySettings,
  getPriorityLevels,
  updatePriorityLevels,
  addPriorityLevel,
  updatePriorityLevel,
  deletePriorityLevel,
  getScoringRules,
  updateScoringRules,
  addScoringRule,
  updateScoringRule,
  deleteScoringRule,
  toggleScoringRule,
  calculateLeadScore,
  getPriorityForScore,
};
