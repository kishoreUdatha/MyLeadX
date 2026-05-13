/**
 * Messaging Service
 * API client for message credits, bulk messaging, and contacts
 */

import api from './api';

// Types
export interface MessageBalance {
  smsCredits: number;
  whatsappCredits: number;
  rcsCredits: number;
}

export interface MessagePricing {
  smsPrice: number;
  whatsappPrice: number;
  rcsPrice: number;
  smsBulkDiscount: Record<string, number>;
  whatsappBulkDiscount: Record<string, number>;
  rcsBulkDiscount: Record<string, number>;
  minPurchase: number;
}

export type MessageChannel = 'SMS' | 'WHATSAPP' | 'RCS';
export type BulkRecipientSource = 'FILTER' | 'LIST' | 'CSV' | 'MANUAL';
export type BulkMessageJobStatus = 'DRAFT' | 'SCHEDULED' | 'PROCESSING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type BulkMessageDeliveryStatus = 'PENDING' | 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'REJECTED' | 'EXPIRED';

export interface MessagePurchase {
  id: string;
  organizationId: string;
  userId: string;
  channel: MessageChannel;
  quantity: number;
  pricePerUnit: number;
  totalAmount: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  isManualAdjustment: boolean;
  adjustmentReason?: string;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface BulkMessageJob {
  id: string;
  organizationId: string;
  userId: string;
  channel: MessageChannel;
  templateId?: string;
  dltTemplateId?: string;
  senderId?: string;
  name?: string;
  description?: string;
  recipientSource: BulkRecipientSource;
  recipientFilter?: Record<string, unknown>;
  recipientListId?: string;
  phoneNumbers?: string[];
  totalCount: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  deliveredCount: number;
  readCount: number;
  status: BulkMessageJobStatus;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  message?: string;
  mediaUrl?: string;
  creditsUsed: number;
  creditsRefund: number;
  estimatedCost: number;
  actualCost: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface BulkMessageLog {
  id: string;
  organizationId: string;
  bulkJobId: string;
  userId: string;
  phone: string;
  name?: string;
  email?: string;
  message: string;
  channel: MessageChannel;
  status: BulkMessageDeliveryStatus;
  provider?: string;
  providerMsgId?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  failedAt?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface MessagingContact {
  id: string;
  organizationId: string;
  phone: string;
  name?: string;
  email?: string;
  customFields?: Record<string, string>;
  smsOptOut: boolean;
  whatsappOptOut: boolean;
  rcsOptOut: boolean;
  optOutAt?: string;
  source?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  groups?: Array<{
    group: MessagingContactGroup;
  }>;
}

export interface MessagingContactGroup {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  color?: string;
  contactCount: number;
  syncFromCRM: boolean;
  crmSyncFilter?: Record<string, unknown>;
  lastSyncAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContactUpload {
  id: string;
  organizationId: string;
  userId: string;
  fileName: string;
  fileSize: number;
  originalName: string;
  columnMapping: Record<string, string>;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalRows: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errors?: Array<{ row: number; error: string }>;
  targetGroupId?: string;
  processedAt?: string;
  createdAt: string;
}

export interface MessageTemplate {
  id: string;
  organizationId?: string;
  name: string;
  type: 'SMS' | 'EMAIL' | 'WHATSAPP' | 'RCS';
  channel: 'sms' | 'whatsapp' | 'rcs' | 'SMS' | 'WHATSAPP' | 'RCS';
  category?: string;
  content: string;
  dltTemplateId?: string;
  whatsappTemplateId?: string;
  whatsappStatus?: string;
  variables?: string[];
  isActive: boolean;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreditTransaction {
  id: string;
  organizationId: string;
  channel: MessageChannel;
  transactionType: 'CREDIT' | 'DEBIT' | 'REFUND' | 'ADJUSTMENT';
  amount: number;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: string;
  description?: string;
  userId?: string;
  createdAt: string;
}

export interface PurchaseOrderResult {
  success: boolean;
  purchaseId?: string;
  razorpayOrderId?: string;
  razorpayKeyId?: string;
  amount?: number;
  currency?: string;
  error?: string;
  testMode?: boolean;
  message?: string;
}

export interface CreateBulkJobParams {
  channel: MessageChannel;
  name?: string;
  description?: string;
  templateId?: string;
  message?: string;
  mediaUrl?: string;
  recipientSource: BulkRecipientSource;
  recipientFilter?: Record<string, unknown>;
  recipientListId?: string;
  phoneNumbers?: string[];
  recipients?: Array<{ phone: string; variables?: Record<string, string> }>;
  scheduledAt?: string;
  startImmediately?: boolean;
  variables?: string[];
  rcsRichCardPayload?: Record<string, unknown>;
  rcsCarouselPayload?: Record<string, unknown>;
  rcsSuggestedReplies?: Record<string, unknown>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ==================== CREDITS API ====================

export const messagingCreditsApi = {
  /**
   * Get message credit balance
   */
  getBalance: async (): Promise<MessageBalance> => {
    const response = await api.get('/messaging-credits/balance');
    return response.data.data;
  },

  /**
   * Get pricing information
   */
  getPricing: async (): Promise<MessagePricing> => {
    const response = await api.get('/messaging-credits/pricing');
    return response.data.data;
  },

  /**
   * Create a purchase order
   */
  createPurchaseOrder: async (data: { channel: string; quantity: number }): Promise<PurchaseOrderResult> => {
    const response = await api.post('/messaging-credits/purchase', {
      channel: data.channel.toUpperCase(),
      quantity: data.quantity,
    });
    return response.data.data;
  },

  /**
   * Confirm payment
   */
  confirmPurchase: async (
    purchaseId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ): Promise<{ balance: MessageBalance }> => {
    const response = await api.post('/messaging-credits/purchase/confirm', {
      purchaseId,
      razorpayPaymentId,
      razorpaySignature,
    });
    return response.data.data;
  },

  /**
   * Get purchase history
   */
  getPurchaseHistory: async (
    page = 1,
    limit = 20,
    channel?: MessageChannel
  ): Promise<{ purchases: MessagePurchase[]; pagination: PaginationMeta }> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (channel) params.append('channel', channel);
    const response = await api.get(`/messaging-credits/history?${params}`);
    return response.data.data;
  },

  /**
   * Get transaction history
   */
  getTransactionHistory: async (
    page = 1,
    limit = 50,
    channel?: MessageChannel
  ): Promise<{ transactions: CreditTransaction[]; pagination: PaginationMeta }> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (channel) params.append('channel', channel);
    const response = await api.get(`/messaging-credits/transactions?${params}`);
    return response.data.data;
  },
};

// ==================== BULK MESSAGING API ====================

export const bulkMessagingApi = {
  /**
   * Create a bulk messaging job
   */
  createJob: async (params: CreateBulkJobParams): Promise<BulkMessageJob> => {
    const response = await api.post('/messaging-credits/bulk/send', params);
    return response.data.data;
  },

  /**
   * List bulk messaging jobs
   */
  listJobs: async (
    page = 1,
    limit = 20,
    filters?: {
      status?: BulkMessageJobStatus;
      channel?: MessageChannel;
      fromDate?: string;
      toDate?: string;
    }
  ): Promise<{ jobs: BulkMessageJob[]; pagination: PaginationMeta }> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters?.status) params.append('status', filters.status);
    if (filters?.channel) params.append('channel', filters.channel);
    if (filters?.fromDate) params.append('fromDate', filters.fromDate);
    if (filters?.toDate) params.append('toDate', filters.toDate);
    const response = await api.get(`/messaging-credits/bulk/jobs?${params}`);
    return response.data.data;
  },

  /**
   * Get job details
   */
  getJob: async (jobId: string): Promise<BulkMessageJob> => {
    const response = await api.get(`/messaging-credits/bulk/jobs/${jobId}`);
    return response.data.data;
  },

  /**
   * Start a job
   */
  startJob: async (jobId: string): Promise<void> => {
    await api.post(`/messaging-credits/bulk/jobs/${jobId}/start`);
  },

  /**
   * Cancel a job
   */
  cancelJob: async (jobId: string): Promise<void> => {
    await api.post(`/messaging-credits/bulk/jobs/${jobId}/cancel`);
  },

  /**
   * Get job delivery report
   */
  getJobReport: async (
    jobId: string,
    page = 1,
    limit = 100,
    status?: BulkMessageDeliveryStatus
  ): Promise<{ logs: BulkMessageLog[]; pagination: PaginationMeta }> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.append('status', status);
    const response = await api.get(`/messaging-credits/bulk/jobs/${jobId}/report?${params}`);
    return response.data.data;
  },
};

// ==================== CONTACTS API ====================

export const contactsApi = {
  /**
   * List contacts
   */
  listContacts: async (
    page = 1,
    limit = 50,
    filters?: { search?: string; groupId?: string }
  ): Promise<{ contacts: MessagingContact[]; pagination: PaginationMeta }> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters?.search) params.append('search', filters.search);
    if (filters?.groupId) params.append('groupId', filters.groupId);
    const response = await api.get(`/messaging-credits/contacts?${params}`);
    return response.data.data;
  },

  /**
   * Create a contact
   */
  createContact: async (data: {
    phone: string;
    name?: string;
    email?: string;
    customFields?: Record<string, string>;
    groupIds?: string[];
  }): Promise<MessagingContact> => {
    const response = await api.post('/messaging-credits/contacts', data);
    return response.data.data;
  },

  /**
   * Upload contacts from CSV
   */
  uploadCsv: async (data: {
    fileName: string;
    fileSize: number;
    originalName: string;
    content: string;
    columnMapping: Record<string, string>;
    targetGroupId?: string;
  }): Promise<ContactUpload> => {
    const response = await api.post('/messaging-credits/contacts/upload', data);
    return response.data.data;
  },

  /**
   * Bulk create contacts (simple array format)
   */
  bulkCreate: async (contacts: Array<{ phone: string; name?: string; email?: string }>): Promise<{ created: number; skipped: number }> => {
    const response = await api.post('/messaging-portal/contacts/bulk', { contacts });
    return response.data.data;
  },

  /**
   * Update a contact
   */
  updateContact: async (
    id: string,
    data: { name?: string; email?: string; customFields?: Record<string, string> }
  ): Promise<MessagingContact> => {
    const response = await api.put(`/messaging-portal/contacts/${id}`, data);
    return response.data.data;
  },

  /**
   * Delete a contact
   */
  deleteContact: async (id: string): Promise<void> => {
    await api.delete(`/messaging-portal/contacts/${id}`);
  },

  /**
   * Get upload status
   */
  getUploadStatus: async (uploadId: string): Promise<ContactUpload> => {
    const response = await api.get(`/messaging-credits/contacts/uploads/${uploadId}`);
    return response.data.data;
  },

  /**
   * List contact groups
   */
  listGroups: async (): Promise<MessagingContactGroup[]> => {
    const response = await api.get('/messaging-credits/groups');
    return response.data.data;
  },

  /**
   * Create a group
   */
  createGroup: async (data: {
    name: string;
    description?: string;
    color?: string;
  }): Promise<MessagingContactGroup> => {
    const response = await api.post('/messaging-credits/groups', data);
    return response.data.data;
  },

  /**
   * Add contacts to a group
   */
  addContactsToGroup: async (groupId: string, contactIds: string[]): Promise<{ added: number }> => {
    const response = await api.post(`/messaging-credits/groups/${groupId}/contacts`, { contactIds });
    return response.data.data;
  },
};

// ==================== TEMPLATES API ====================

export const templatesApi = {
  /**
   * List templates
   */
  listTemplates: async (channel?: 'SMS' | 'WHATSAPP' | 'RCS'): Promise<MessageTemplate[]> => {
    const params = channel ? `?channel=${channel}` : '';
    const response = await api.get(`/messaging-portal/templates${params}`);
    return response.data.data;
  },

  /**
   * Create a template
   */
  createTemplate: async (data: {
    name: string;
    channel: 'SMS' | 'WHATSAPP' | 'RCS' | string;
    content: string;
    dltTemplateId?: string;
    whatsappTemplateId?: string;
    variables?: string[];
    category?: string;
  }): Promise<MessageTemplate> => {
    const response = await api.post('/messaging-portal/templates', {
      ...data,
      channel: data.channel.toUpperCase(),
    });
    return response.data.data;
  },

  /**
   * Update a template
   */
  updateTemplate: async (
    id: string,
    data: {
      name?: string;
      content?: string;
      dltTemplateId?: string;
      whatsappTemplateId?: string;
      variables?: string[];
    }
  ): Promise<MessageTemplate> => {
    const response = await api.put(`/messaging-portal/templates/${id}`, data);
    return response.data.data;
  },

  /**
   * Delete a template
   */
  deleteTemplate: async (id: string): Promise<void> => {
    await api.delete(`/messaging-portal/templates/${id}`);
  },
};

// ==================== MESSAGING PORTAL API ====================

export const messagingPortalApi = {
  /**
   * Register a new messaging portal account
   */
  register: async (data: {
    name: string;
    email: string;
    phone: string;
    companyName: string;
    password: string;
  }): Promise<{ email: string }> => {
    const response = await api.post('/messaging-portal/register', data);
    return response.data.data;
  },

  /**
   * Get dashboard data
   */
  getDashboard: async (): Promise<{
    balance: MessageBalance;
    contactCount: number;
    recentCampaigns: BulkMessageJob[];
    todayStats: { sent: number; delivered: number; deliveryRate: number };
  }> => {
    const response = await api.get('/messaging-portal/dashboard');
    return response.data.data;
  },

  /**
   * Get dashboard message trends (last 7 days)
   */
  getDashboardTrends: async (): Promise<
    Array<{ name: string; date: string; sent: number; delivered: number; failed: number }>
  > => {
    const response = await api.get('/messaging-portal/dashboard/trends');
    return response.data.data;
  },

  /**
   * Get dashboard channel stats
   */
  getDashboardChannelStats: async (): Promise<{
    distribution: Array<{ name: string; value: number; color: string }>;
    totalByChannel: Array<{
      channel: string;
      total: number;
      sent: number;
      delivered: number;
      failed: number;
    }>;
  }> => {
    const response = await api.get('/messaging-portal/dashboard/channel-stats');
    return response.data.data;
  },

  /**
   * Get reports summary
   */
  getReportsSummary: async (
    fromDate?: string,
    toDate?: string,
    channel?: MessageChannel
  ): Promise<{
    messageStats: Array<{ status: string; channel: string; _count: number }>;
    campaignStats: {
      totalCampaigns: number;
      totalMessages: number;
      sent: number;
      delivered: number;
      failed: number;
    };
  }> => {
    const params = new URLSearchParams();
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    if (channel) params.append('channel', channel);
    const response = await api.get(`/messaging-portal/reports/summary?${params}`);
    return response.data.data;
  },

  // Quick Send
  quickSend: async (data: {
    channel: 'SMS' | 'WHATSAPP';
    phone: string;
    message: string;
    templateId?: string;
    contactName?: string;
    senderId?: string;
  }): Promise<{
    messageId: string;
    phone: string;
    channel: string;
    creditsUsed: number;
    remainingCredits: number;
  }> => {
    const response = await api.post('/messaging-portal/quick-send', data);
    return response.data.data;
  },

  getQuickSendHistory: async (
    page = 1,
    limit = 20,
    channel?: 'SMS' | 'WHATSAPP'
  ): Promise<{
    messages: Array<{
      id: string;
      phone: string;
      name?: string;
      message: string;
      channel: MessageChannel;
      status: string;
      sentAt?: string;
      createdAt: string;
    }>;
    pagination: PaginationMeta;
  }> => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (channel) params.append('channel', channel);
    const response = await api.get(`/messaging-portal/quick-send/history?${params}`);
    return response.data.data;
  },

  // Contacts
  listContacts: contactsApi.listContacts,
  createContact: contactsApi.createContact,

  getContact: async (id: string): Promise<MessagingContact> => {
    const response = await api.get(`/messaging-portal/contacts/${id}`);
    return response.data.data;
  },

  updateContact: async (
    id: string,
    data: { name?: string; email?: string; customFields?: Record<string, string>; groupIds?: string[] }
  ): Promise<MessagingContact> => {
    const response = await api.put(`/messaging-portal/contacts/${id}`, data);
    return response.data.data;
  },

  deleteContact: async (id: string): Promise<void> => {
    await api.delete(`/messaging-portal/contacts/${id}`);
  },

  uploadContacts: contactsApi.uploadCsv,

  exportContacts: async (groupId?: string): Promise<Blob> => {
    const params = groupId ? `?groupId=${groupId}` : '';
    const response = await api.get(`/messaging-portal/contacts/export${params}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Groups
  listGroups: contactsApi.listGroups,
  createGroup: contactsApi.createGroup,

  getGroup: async (id: string): Promise<MessagingContactGroup> => {
    const response = await api.get(`/messaging-portal/groups/${id}`);
    return response.data.data;
  },

  updateGroup: async (
    id: string,
    data: { name?: string; description?: string; color?: string }
  ): Promise<MessagingContactGroup> => {
    const response = await api.put(`/messaging-portal/groups/${id}`, data);
    return response.data.data;
  },

  deleteGroup: async (id: string): Promise<void> => {
    await api.delete(`/messaging-portal/groups/${id}`);
  },

  getGroupContacts: async (
    groupId: string,
    page = 1,
    limit = 50,
    search?: string
  ): Promise<{ contacts: MessagingContact[]; pagination: PaginationMeta }> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.append('search', search);
    const response = await api.get(`/messaging-portal/groups/${groupId}/contacts?${params}`);
    return response.data.data;
  },

  addContactsToGroup: async (groupId: string, contactIds: string[]): Promise<{ added: number }> => {
    const response = await api.post(`/messaging-portal/groups/${groupId}/contacts`, { contactIds });
    return response.data.data;
  },

  removeContactsFromGroup: async (groupId: string, contactIds: string[]): Promise<{ removed: number }> => {
    const response = await api.delete(`/messaging-portal/groups/${groupId}/contacts`, {
      data: { contactIds },
    });
    return response.data.data;
  },

  // Campaigns
  listCampaigns: async (
    page = 1,
    limit = 20,
    filters?: { status?: BulkMessageJobStatus; channel?: MessageChannel }
  ): Promise<{ jobs: BulkMessageJob[]; pagination: PaginationMeta }> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters?.status) params.append('status', filters.status);
    if (filters?.channel) params.append('channel', filters.channel);
    const response = await api.get(`/messaging-portal/campaigns?${params}`);
    return response.data.data;
  },

  getCampaign: async (id: string): Promise<BulkMessageJob> => {
    const response = await api.get(`/messaging-portal/campaigns/${id}`);
    return response.data.data;
  },

  createCampaign: async (params: Omit<CreateBulkJobParams, 'startImmediately'>): Promise<BulkMessageJob> => {
    const response = await api.post('/messaging-portal/campaigns', params);
    return response.data.data;
  },

  startCampaign: async (id: string): Promise<void> => {
    await api.post(`/messaging-portal/campaigns/${id}/start`);
  },

  cancelCampaign: async (id: string): Promise<void> => {
    await api.post(`/messaging-portal/campaigns/${id}/cancel`);
  },

  getCampaignReport: async (
    id: string,
    page = 1,
    limit = 100,
    status?: BulkMessageDeliveryStatus
  ): Promise<{ logs: BulkMessageLog[]; pagination: PaginationMeta }> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.append('status', status);
    const response = await api.get(`/messaging-portal/campaigns/${id}/report?${params}`);
    return response.data.data;
  },

  // Billing
  getBalance: async (): Promise<MessageBalance> => {
    const response = await api.get('/messaging-portal/billing/balance');
    return response.data.data;
  },

  getPricing: async (): Promise<MessagePricing> => {
    const response = await api.get('/messaging-portal/billing/pricing');
    return response.data.data;
  },

  createPurchase: async (channel: MessageChannel, quantity: number): Promise<PurchaseOrderResult> => {
    const response = await api.post('/messaging-portal/billing/purchase', { channel, quantity });
    return response.data.data;
  },

  confirmPurchase: async (
    purchaseId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ): Promise<{ balance: MessageBalance }> => {
    const response = await api.post('/messaging-portal/billing/purchase/confirm', {
      purchaseId,
      razorpayPaymentId,
      razorpaySignature,
    });
    return response.data.data;
  },

  getTransactions: async (
    page = 1,
    limit = 50
  ): Promise<{ transactions: CreditTransaction[]; pagination: PaginationMeta }> => {
    const response = await api.get(`/messaging-portal/billing/transactions?page=${page}&limit=${limit}`);
    return response.data.data;
  },

  getPurchases: async (
    page = 1,
    limit = 20
  ): Promise<{ purchases: MessagePurchase[]; pagination: PaginationMeta }> => {
    const response = await api.get(`/messaging-portal/billing/purchases?page=${page}&limit=${limit}`);
    return response.data.data;
  },

  // Opt-Out Management
  getOptOuts: async (
    page = 1,
    limit = 50,
    channel?: 'SMS' | 'WHATSAPP' | 'RCS',
    search?: string
  ): Promise<{
    contacts: MessagingContact[];
    pagination: PaginationMeta;
    stats: {
      totalContacts: number;
      smsOptOuts: number;
      whatsappOptOuts: number;
      rcsOptOuts: number;
    };
  }> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (channel) params.append('channel', channel);
    if (search) params.append('search', search);
    const response = await api.get(`/messaging-portal/opt-outs?${params}`);
    return response.data.data;
  },

  updateOptOut: async (
    id: string,
    data: { smsOptOut?: boolean; whatsappOptOut?: boolean; rcsOptOut?: boolean }
  ): Promise<MessagingContact> => {
    const response = await api.put(`/messaging-portal/opt-outs/${id}`, data);
    return response.data.data;
  },

  bulkOptOut: async (
    phoneNumbers: string[],
    channel: 'SMS' | 'WHATSAPP' | 'RCS'
  ): Promise<{ processed: number; optedOut: number }> => {
    const response = await api.post('/messaging-portal/opt-outs/bulk', { phoneNumbers, channel });
    return response.data.data;
  },

  exportOptOuts: async (channel?: 'SMS' | 'WHATSAPP' | 'RCS'): Promise<Blob> => {
    const params = channel ? `?channel=${channel}` : '';
    const response = await api.get(`/messaging-portal/opt-outs/export${params}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // CRM Import
  getCrmImportSources: async (): Promise<{
    pipelines: Array<{
      id: string;
      name: string;
      stages: Array<{ id: string; name: string }>;
    }>;
    campaigns: Array<{ id: string; name: string; leadCount: number }>;
    tags: Array<{ id: string; name: string; color?: string }>;
    leadSources: Array<{ id: string; name: string }>;
    totalLeads: number;
  }> => {
    const response = await api.get('/messaging-portal/crm-import/sources');
    return response.data.data;
  },

  previewCrmImport: async (filters: {
    pipelineId?: string;
    stageIds?: string[];
    campaignId?: string;
    tagIds?: string[];
    sourceId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{
    total: number;
    preview: Array<{
      id: string;
      name: string;
      phone: string;
      email?: string;
      createdAt: string;
      isDuplicate: boolean;
    }>;
    estimatedDuplicates: number;
  }> => {
    const response = await api.post('/messaging-portal/crm-import/preview', filters);
    return response.data.data;
  },

  importFromCrm: async (options: {
    pipelineId?: string;
    stageIds?: string[];
    campaignId?: string;
    tagIds?: string[];
    sourceId?: string;
    dateFrom?: string;
    dateTo?: string;
    skipDuplicates?: boolean;
    targetGroupId?: string;
  }): Promise<{
    total: number;
    imported: number;
    updated: number;
    skipped: number;
  }> => {
    const response = await api.post('/messaging-portal/crm-import/import', options);
    return response.data.data;
  },

  // Scheduled Messages
  getScheduledMessages: async (
    page = 1,
    limit = 20,
    status?: string,
    type?: string
  ): Promise<{
    messages: ScheduledMessage[];
    stats: { pending: number; completed: number; failed: number; total: number };
    pagination: PaginationMeta;
  }> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.append('status', status);
    if (type) params.append('type', type);
    const response = await api.get(`/messaging-portal/scheduled-messages?${params}`);
    return response.data.data;
  },

  getScheduledMessage: async (id: string): Promise<ScheduledMessage> => {
    const response = await api.get(`/messaging-portal/scheduled-messages/${id}`);
    return response.data.data;
  },

  createScheduledMessage: async (data: {
    type: 'SMS' | 'WHATSAPP';
    recipients: string[];
    content: string;
    scheduledAt: string;
    name?: string;
    templateId?: string;
    variables?: Record<string, string>;
    timezone?: string;
    isRecurring?: boolean;
    recurringRule?: string;
    recurringEndAt?: string;
  }): Promise<ScheduledMessage> => {
    const response = await api.post('/messaging-portal/scheduled-messages', data);
    return response.data.data;
  },

  updateScheduledMessage: async (
    id: string,
    data: {
      content?: string;
      scheduledAt?: string;
      name?: string;
      recipients?: string[];
    }
  ): Promise<ScheduledMessage> => {
    const response = await api.put(`/messaging-portal/scheduled-messages/${id}`, data);
    return response.data.data;
  },

  pauseScheduledMessage: async (id: string): Promise<void> => {
    await api.post(`/messaging-portal/scheduled-messages/${id}/pause`);
  },

  resumeScheduledMessage: async (id: string): Promise<void> => {
    await api.post(`/messaging-portal/scheduled-messages/${id}/resume`);
  },

  cancelScheduledMessage: async (id: string): Promise<void> => {
    await api.delete(`/messaging-portal/scheduled-messages/${id}`);
  },

  sendScheduledMessageNow: async (id: string): Promise<{ sentCount: number; failedCount: number }> => {
    const response = await api.post(`/messaging-portal/scheduled-messages/${id}/send-now`);
    return response.data.data;
  },

  // Message History
  getMessageHistory: async (params: {
    page?: number;
    limit?: number;
    channel?: string;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    messages: Array<{
      id: string;
      phone: string;
      channel: string;
      content: string;
      status: string;
      senderId?: string;
      templateId?: string;
      dltTemplateId?: string;
      externalId?: string;
      error?: string;
      source: string;
      campaignName?: string;
      createdAt: string;
      sentAt?: string;
      deliveredAt?: string;
    }>;
    pagination: PaginationMeta;
  }> => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', String(params.page));
    if (params.limit) searchParams.append('limit', String(params.limit));
    if (params.channel) searchParams.append('channel', params.channel);
    if (params.status) searchParams.append('status', params.status);
    if (params.search) searchParams.append('search', params.search);
    if (params.startDate) searchParams.append('startDate', params.startDate);
    if (params.endDate) searchParams.append('endDate', params.endDate);
    const response = await api.get(`/messaging-portal/message-history?${searchParams}`);
    return response.data.data;
  },
};

// Scheduled Message type
export interface ScheduledMessage {
  id: string;
  name: string | null;
  type: 'SMS' | 'WHATSAPP';
  content: string;
  recipients: string[];
  recipientCount?: number;
  templateId: string | null;
  variables: Record<string, string>;
  scheduledAt: string;
  timezone: string;
  isRecurring: boolean;
  recurringRule: string | null;
  recurringEndAt: string | null;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'PAUSED';
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  processedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

// Default export for backward compatibility
export default {
  credits: messagingCreditsApi,
  bulk: bulkMessagingApi,
  contacts: contactsApi,
  templates: templatesApi,
  portal: messagingPortalApi,
};
