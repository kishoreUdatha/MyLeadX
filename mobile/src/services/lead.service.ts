import api from './api';

export interface Lead {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
  status: string;
  priority: string;
  source: string;
  notes?: string;
  createdAt: string;
  assignments?: Array<{
    assignedTo: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
}

export const leadService = {
  async getMyLeads(params: { page?: number; status?: string } = {}) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', String(params.page));
    if (params.status) queryParams.append('status', params.status);

    const response = await api.get(`/leads?${queryParams.toString()}`);
    return {
      leads: response.data.data,
      total: response.data.meta?.total || 0,
    };
  },

  async getById(id: string): Promise<Lead> {
    const response = await api.get(`/leads/${id}`);
    return response.data.data;
  },

  async updateStatus(id: string, status: string): Promise<Lead> {
    const response = await api.put(`/leads/${id}`, { status });
    return response.data.data;
  },

  async addNote(id: string, notes: string): Promise<Lead> {
    const response = await api.put(`/leads/${id}`, { notes });
    return response.data.data;
  },

  async logCall(leadId: string, callData: { duration: number; notes?: string }) {
    const response = await api.post(`/leads/${leadId}/calls`, callData);
    return response.data.data;
  },
};
