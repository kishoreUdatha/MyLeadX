import api, { getErrorMessage } from './index';
import {
  TelecallerStats,
  Call,
  StartCallPayload,
  UpdateCallPayload,
  ApiResponse,
  PaginatedResponse,
} from '../types';

export const telecallerApi = {
  /**
   * Get telecaller dashboard stats
   */
  getStats: async (): Promise<TelecallerStats> => {
    try {
      const response = await api.get<ApiResponse<TelecallerStats>>('/telecaller/stats');
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get call history with pagination
   */
  getCalls: async (
    page: number = 1,
    limit: number = 20,
    filters?: {
      startDate?: string;
      endDate?: string;
      outcome?: string;
    }
  ): Promise<PaginatedResponse<Call>> => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.outcome) params.append('outcome', filters.outcome);

      const response = await api.get<PaginatedResponse<Call>>(
        `/telecaller/calls?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get single call details
   */
  getCall: async (callId: string): Promise<Call> => {
    try {
      const response = await api.get<ApiResponse<Call>>(`/telecaller/calls/${callId}`);
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Start a new call - creates call record with INITIATED status
   */
  startCall: async (payload: StartCallPayload): Promise<Call> => {
    try {
      const response = await api.post<ApiResponse<Call>>('/telecaller/calls', payload);
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Update call with outcome and notes
   */
  updateCall: async (callId: string, payload: UpdateCallPayload): Promise<Call> => {
    try {
      const response = await api.put<ApiResponse<Call>>(`/telecaller/calls/${callId}`, payload);
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Upload call recording
   */
  uploadRecording: async (
    callId: string,
    recordingPath: string,
    onProgress?: (progress: number) => void
  ): Promise<{ recordingUrl: string }> => {
    try {
      const formData = new FormData();

      // Add recording file to form data
      formData.append('recording', {
        uri: recordingPath,
        type: 'audio/mp4',
        name: `call_${callId}_recording.m4a`,
      } as any);

      const response = await api.post<ApiResponse<{ recordingUrl: string }>>(
        `/telecaller/calls/${callId}/recording`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total && onProgress) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress(progress);
            }
          },
        }
      );

      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get today's assigned leads for quick calling
   */
  getTodaysLeads: async (): Promise<number> => {
    try {
      const response = await api.get<ApiResponse<{ count: number }>>('/telecaller/today-leads');
      return response.data.data.count;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Mark callback reminder as completed
   */
  completeCallback: async (callId: string): Promise<void> => {
    try {
      await api.post(`/telecaller/calls/${callId}/callback-complete`);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get pending callbacks
   */
  getPendingCallbacks: async (): Promise<Call[]> => {
    try {
      const response = await api.get<ApiResponse<Call[]>>('/telecaller/callbacks');
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get calls for a specific lead
   */
  getCallsByLead: async (leadId: string): Promise<Call[]> => {
    try {
      const response = await api.get<ApiResponse<Call[]>>(`/leads/${leadId}/calls`);
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get AI analysis status and results for a call
   */
  getCallAnalysis: async (callId: string): Promise<CallAnalysis> => {
    try {
      const response = await api.get<ApiResponse<CallAnalysis>>(`/telecaller/calls/${callId}/analysis`);
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Trigger re-analysis for a call
   */
  reanalyzeCall: async (callId: string): Promise<void> => {
    try {
      await api.post(`/telecaller/calls/${callId}/reanalyze`);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get calls with AI analysis
   */
  getAnalyzedCalls: async (
    page: number = 1,
    limit: number = 20,
    analyzed?: boolean
  ): Promise<PaginatedResponse<Call>> => {
    try {
      const params = new URLSearchParams({
        offset: ((page - 1) * limit).toString(),
        limit: limit.toString(),
      });

      if (analyzed !== undefined) {
        params.append('analyzed', analyzed.toString());
      }

      const response = await api.get<PaginatedResponse<Call>>(
        `/telecaller/calls-analyzed?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};

// Type for AI analysis response
export interface CallAnalysis {
  id: string;
  aiAnalyzed: boolean;
  analysisStatus: 'completed' | 'pending';
  transcript: string | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  outcome: string | null;
  summary: string | null;
  qualification: {
    name?: string;
    email?: string;
    company?: string;
    budget?: string;
    timeline?: string;
    requirements?: string;
    buyingSignals?: string[];
    objections?: string[];
    aiAnalyzedAt?: string;
  } | null;
  recordingUrl: string | null;
  duration: number | null;
  lead: {
    id: string;
    firstName: string;
    lastName: string;
    leadScore?: {
      overallScore: number;
      grade: string;
      aiClassification: string;
    };
  } | null;
}

export default telecallerApi;
