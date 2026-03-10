import api from './api';

export interface TelecallerQueueItem {
  id: string;
  organizationId: string;
  leadId?: string;
  outboundCallId?: string;
  phoneNumber: string;
  contactName?: string;
  email?: string;
  aiCallSummary?: string;
  aiCallSentiment?: string;
  aiCallOutcome?: string;
  aiCallDuration?: number;
  qualification?: Record<string, any>;
  priority: number;
  status: string;
  reason?: string;
  assignedToId?: string;
  assignedAt?: string;
  telecallerNotes?: string;
  telecallerOutcome?: string;
  callbackScheduled?: string;
  addedAt: string;
  claimedAt?: string;
  completedAt?: string;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface QueueStats {
  totalPending: number;
  totalClaimed: number;
  totalCompleted: number;
  totalCallback: number;
  myItems: number;
  highPriority: number;
}

export interface QueueResponse {
  items: TelecallerQueueItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const telecallerQueueService = {
  async getQueue(params?: {
    status?: string[];
    page?: number;
    limit?: number;
    showAll?: boolean;
  }): Promise<QueueResponse> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.set('status', params.status.join(','));
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.showAll) queryParams.set('showAll', 'true');

    const response = await api.get(`/telecaller-queue?${queryParams.toString()}`);
    return response.data.data;
  },

  async getStats(): Promise<QueueStats> {
    const response = await api.get('/telecaller-queue/stats');
    return response.data.data;
  },

  async getItem(id: string): Promise<TelecallerQueueItem> {
    const response = await api.get(`/telecaller-queue/${id}`);
    return response.data.data;
  },

  async claimItem(id: string): Promise<TelecallerQueueItem> {
    const response = await api.post(`/telecaller-queue/${id}/claim`);
    return response.data.data;
  },

  async releaseItem(id: string): Promise<TelecallerQueueItem> {
    const response = await api.post(`/telecaller-queue/${id}/release`);
    return response.data.data;
  },

  async skipItem(id: string, reason?: string): Promise<TelecallerQueueItem> {
    const response = await api.post(`/telecaller-queue/${id}/skip`, { reason });
    return response.data.data;
  },

  async updateItem(
    id: string,
    data: {
      status?: string;
      telecallerNotes?: string;
      telecallerOutcome?: string;
      callbackScheduled?: string;
    }
  ): Promise<TelecallerQueueItem> {
    const response = await api.put(`/telecaller-queue/${id}`, data);
    return response.data.data;
  },

  async completeItem(
    id: string,
    data: {
      telecallerOutcome: string;
      telecallerNotes?: string;
      callbackScheduled?: string;
    }
  ): Promise<TelecallerQueueItem> {
    const response = await api.post(`/telecaller-queue/${id}/complete`, data);
    return response.data.data;
  },

  async addToQueue(data: {
    leadId?: string;
    phoneNumber: string;
    contactName?: string;
    email?: string;
    reason?: string;
    priority?: number;
  }): Promise<TelecallerQueueItem> {
    const response = await api.post('/telecaller-queue/add', data);
    return response.data.data;
  },
};
