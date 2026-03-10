import api, { getErrorMessage } from './index';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lead, LeadStatus, LeadFormData, ApiResponse, PaginatedResponse, STORAGE_KEYS } from '../types';

export const leadsApi = {
  /**
   * Get assigned leads with pagination and filters
   */
  getAssignedLeads: async (
    page: number = 1,
    limit: number = 20,
    filters?: {
      status?: LeadStatus;
      search?: string;
    }
  ): Promise<PaginatedResponse<Lead>> => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filters?.status) params.append('status', filters.status);
      if (filters?.search) params.append('search', filters.search);

      const response = await api.get<PaginatedResponse<Lead>>(
        `/telecaller/leads?${params.toString()}`
      );

      // Cache leads for offline access
      const cachedLeads = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_LEADS);
      const existingLeads: Lead[] = cachedLeads ? JSON.parse(cachedLeads) : [];

      // Merge new leads with cache (avoid duplicates)
      const newLeads = response.data.data;
      const mergedLeads = [...existingLeads];

      newLeads.forEach((newLead) => {
        const existingIndex = mergedLeads.findIndex((l) => l.id === newLead.id);
        if (existingIndex >= 0) {
          mergedLeads[existingIndex] = newLead;
        } else {
          mergedLeads.push(newLead);
        }
      });

      // Keep only latest 100 leads in cache
      const leadsToCache = mergedLeads.slice(-100);
      await AsyncStorage.setItem(STORAGE_KEYS.CACHED_LEADS, JSON.stringify(leadsToCache));

      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get single lead details
   */
  getLead: async (leadId: string): Promise<Lead> => {
    try {
      const response = await api.get<ApiResponse<Lead>>(`/leads/${leadId}`);
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Update lead status
   */
  updateLeadStatus: async (leadId: string, status: LeadStatus): Promise<Lead> => {
    try {
      const response = await api.patch<ApiResponse<Lead>>(`/leads/${leadId}`, {
        status,
      });
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Update lead with full data
   */
  updateLead: async (leadId: string, data: LeadFormData): Promise<Lead> => {
    try {
      const response = await api.put<ApiResponse<Lead>>(`/leads/${leadId}`, data);
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Create a new lead
   */
  createLead: async (data: LeadFormData): Promise<Lead> => {
    try {
      const response = await api.post<ApiResponse<Lead>>('/leads', data);
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Add note to lead
   */
  addNote: async (leadId: string, note: string): Promise<Lead> => {
    try {
      const response = await api.post<ApiResponse<Lead>>(`/leads/${leadId}/notes`, {
        content: note,
      });
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get cached leads (for offline mode)
   */
  getCachedLeads: async (): Promise<Lead[]> => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_LEADS);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Error getting cached leads:', error);
      return [];
    }
  },

  /**
   * Search leads locally (offline)
   */
  searchCachedLeads: async (query: string): Promise<Lead[]> => {
    try {
      const leads = await leadsApi.getCachedLeads();
      const lowerQuery = query.toLowerCase();

      return leads.filter(
        (lead) =>
          lead.name.toLowerCase().includes(lowerQuery) ||
          lead.phone.includes(query) ||
          lead.email?.toLowerCase().includes(lowerQuery) ||
          lead.company?.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      return [];
    }
  },

  /**
   * Get lead call history
   */
  getLeadCallHistory: async (leadId: string): Promise<any[]> => {
    try {
      const response = await api.get<ApiResponse<any[]>>(`/leads/${leadId}/calls`);
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Clear cached leads
   */
  clearCache: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CACHED_LEADS);
    } catch (error) {
      console.error('Error clearing lead cache:', error);
    }
  },
};

export default leadsApi;
