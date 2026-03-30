/**
 * Call Flow Service
 * API client for managing call flow workflows
 */

import api from './api';

// Node types for call flow
export interface CallFlowNode {
  id: string;
  type: 'START' | 'GREETING' | 'QUESTION' | 'CONDITION' | 'AI_RESPONSE' | 'ACTION' | 'TRANSFER' | 'END';
  position: { x: number; y: number };
  data: {
    label: string;
    message?: string;
    question?: string;
    variableName?: string;
    variableType?: 'text' | 'number' | 'email' | 'phone' | 'date' | 'boolean' | 'choice';
    choices?: string[];
    required?: boolean;
    validation?: string;
    condition?: {
      variable: string;
      operator: 'equals' | 'contains' | 'greater' | 'less' | 'exists' | 'not_exists';
      value: string;
    };
    actionType?: string;
    actionConfig?: Record<string, any>;
    transferNumber?: string;
    transferMessage?: string;
    outcomeType?: string;
    aiPrompt?: string;
    maxRetries?: number;
    retryMessage?: string;
  };
}

export interface CallFlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  label?: string;
}

export interface CallFlow {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  nodes: CallFlowNode[];
  edges: CallFlowEdge[];
  variables?: Array<{ name: string; type: string; defaultValue?: string }>;
  defaultGreeting?: string;
  defaultFallback?: string;
  defaultTransfer?: string;
  defaultEnd?: string;
  successOutcomes?: string[];
  failureOutcomes?: string[];
  isTemplate: boolean;
  isActive: boolean;
  organizationId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCallFlowInput {
  name: string;
  description?: string;
  industry?: string;
  nodes: CallFlowNode[];
  edges: CallFlowEdge[];
  variables?: Array<{ name: string; type: string; defaultValue?: string }>;
  defaultGreeting?: string;
  defaultFallback?: string;
  defaultTransfer?: string;
  defaultEnd?: string;
}

export interface UpdateCallFlowInput {
  name?: string;
  description?: string;
  industry?: string;
  nodes?: CallFlowNode[];
  edges?: CallFlowEdge[];
  variables?: Array<{ name: string; type: string; defaultValue?: string }>;
  defaultGreeting?: string;
  defaultFallback?: string;
  defaultTransfer?: string;
  defaultEnd?: string;
  isActive?: boolean;
}

class CallFlowService {
  /**
   * Get all call flows for the organization
   */
  async getCallFlows(): Promise<CallFlow[]> {
    const response = await api.get('/call-flows');
    return response.data.data;
  }

  /**
   * Get a single call flow by ID
   */
  async getCallFlow(id: string): Promise<CallFlow> {
    const response = await api.get(`/call-flows/${id}`);
    return response.data.data;
  }

  /**
   * Create a new call flow
   */
  async createCallFlow(data: CreateCallFlowInput): Promise<CallFlow> {
    const response = await api.post('/call-flows', data);
    return response.data.data;
  }

  /**
   * Update an existing call flow
   */
  async updateCallFlow(id: string, data: UpdateCallFlowInput): Promise<CallFlow> {
    const response = await api.put(`/call-flows/${id}`, data);
    return response.data.data;
  }

  /**
   * Delete a call flow
   */
  async deleteCallFlow(id: string): Promise<void> {
    await api.delete(`/call-flows/${id}`);
  }

  /**
   * Assign a call flow to a voice agent
   */
  async assignToAgent(flowId: string, agentId: string): Promise<any> {
    const response = await api.post(`/call-flows/${flowId}/assign`, { agentId });
    return response.data.data;
  }

  /**
   * Get call flow templates
   */
  async getTemplates(): Promise<CallFlow[]> {
    const response = await api.get('/call-flows/templates');
    return response.data.data;
  }

  /**
   * Create call flow from template
   */
  async createFromTemplate(templateId: string, name: string): Promise<CallFlow> {
    const response = await api.post('/call-flows/from-template', { templateId, name });
    return response.data.data;
  }

  /**
   * Duplicate an existing call flow
   */
  async duplicateCallFlow(id: string, name: string): Promise<CallFlow> {
    const response = await api.post(`/call-flows/${id}/duplicate`, { name });
    return response.data.data;
  }

  /**
   * Execute/test a call flow with simulated inputs
   */
  async executeFlowTest(
    id: string,
    simulatedInputs: string[] = [],
    initialVariables: Record<string, any> = {}
  ): Promise<{
    transcript: Array<{ role: string; content: string }>;
    variables: Record<string, any>;
    outcome?: string;
    visitedNodes: string[];
    nodeCount: number;
  }> {
    const response = await api.post(`/call-flows/${id}/execute`, {
      simulatedInputs,
      initialVariables,
    });
    return response.data.data;
  }

  /**
   * Get analytics for a call flow
   */
  async getAnalytics(
    id: string,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<{
    totalCalls: number;
    successfulCalls: number;
    conversionRate: number;
    avgDuration: number;
    avgQualityScore: number;
    outcomes: Record<string, number>;
    sentiments: Record<string, number>;
  }> {
    let url = `/call-flows/${id}/analytics`;
    if (dateRange) {
      url += `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
    }
    const response = await api.get(url);
    return response.data.data;
  }
}

export const callFlowService = new CallFlowService();
export default callFlowService;
