import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create a separate axios instance for super admin
const superAdminApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add super admin auth token
superAdminApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('superAdminToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
superAdminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('superAdminToken');
      localStorage.removeItem('superAdmin');
      window.location.href = '/super-admin/login';
    }
    return Promise.reject(error);
  }
);

export interface SuperAdmin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  activePlanId?: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    users: number;
    leads: number;
  };
  subscriptions?: Array<{
    status: string;
  }>;
}

export interface PlatformStats {
  overview: {
    totalOrganizations: number;
    activeOrganizations: number;
    newOrganizationsThisMonth: number;
    totalUsers: number;
    activeUsers: number;
  };
  revenue: {
    total: number;
    thisMonth: number;
    currency: string;
  };
  usage: {
    thisMonth: {
      leads: number;
      aiCalls: number;
      sms: number;
      emails: number;
    };
  };
  planDistribution: Array<{
    plan: string;
    count: number;
  }>;
  topOrganizations: Array<{
    organizationId: string;
    aiCallsCount: number;
    leadsCount: number;
    smsCount: number;
    organization?: {
      id: string;
      name: string;
      activePlanId: string;
    };
  }>;
}

export interface RevenueData {
  month: string;
  year: number;
  revenue: number;
  transactions: number;
}

export const superAdminService = {
  // Auth
  async login(email: string, password: string) {
    const response = await superAdminApi.post('/super-admin/login', { email, password });
    const { accessToken, refreshToken, admin } = response.data;

    localStorage.setItem('superAdminToken', accessToken);
    localStorage.setItem('superAdminRefreshToken', refreshToken);
    localStorage.setItem('superAdmin', JSON.stringify(admin));

    return response.data;
  },

  async logout() {
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('superAdminRefreshToken');
    localStorage.removeItem('superAdmin');
  },

  getCurrentAdmin(): SuperAdmin | null {
    const admin = localStorage.getItem('superAdmin');
    return admin ? JSON.parse(admin) : null;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('superAdminToken');
  },

  // Dashboard Stats
  async getStats(): Promise<PlatformStats> {
    const response = await superAdminApi.get('/super-admin/stats');
    return response.data;
  },

  async getRevenueAnalytics(months: number = 12): Promise<RevenueData[]> {
    const response = await superAdminApi.get('/super-admin/revenue', { params: { months } });
    return response.data.data;
  },

  // Organizations
  async getOrganizations(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    plan?: string;
  }) {
    const response = await superAdminApi.get('/super-admin/organizations', { params });
    return response.data;
  },

  async getOrganizationDetails(orgId: string) {
    const response = await superAdminApi.get(`/super-admin/organizations/${orgId}`);
    return response.data;
  },

  async updateOrganization(orgId: string, data: {
    isActive?: boolean;
    activePlanId?: string;
    subscriptionStatus?: string;
  }) {
    const response = await superAdminApi.patch(`/super-admin/organizations/${orgId}`, data);
    return response.data;
  },

  async createOrganization(data: {
    organizationName: string;
    slug: string;
    adminEmail: string;
    adminFirstName: string;
    adminLastName: string;
    planId?: string;
  }) {
    const response = await superAdminApi.post('/super-admin/organizations', data);
    return response.data;
  },

  // Impersonation
  async impersonateUser(userId: string) {
    const response = await superAdminApi.post(`/super-admin/impersonate/${userId}`);

    // Store impersonation data
    const { accessToken, user } = response.data;
    localStorage.setItem('impersonationToken', accessToken);
    localStorage.setItem('impersonatedUser', JSON.stringify(user));
    localStorage.setItem('isImpersonating', 'true');

    return response.data;
  },

  async exitImpersonation() {
    const token = localStorage.getItem('impersonationToken');
    if (!token) {
      throw new Error('Not in impersonation mode');
    }

    const response = await axios.post(
      `${API_BASE_URL}/super-admin/exit-impersonation`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Restore super admin session
    localStorage.removeItem('impersonationToken');
    localStorage.removeItem('impersonatedUser');
    localStorage.removeItem('isImpersonating');

    return response.data;
  },

  isImpersonating(): boolean {
    return localStorage.getItem('isImpersonating') === 'true';
  },

  getImpersonatedUser() {
    const user = localStorage.getItem('impersonatedUser');
    return user ? JSON.parse(user) : null;
  },

  // Bulk Email
  async sendBulkEmail(data: {
    subject: string;
    body: string;
    html?: string;
    filter: {
      planId?: string;
      isActive?: boolean;
      orgIds?: string[];
    };
  }) {
    const response = await superAdminApi.post('/super-admin/bulk-email', data);
    return response.data;
  },

  // Plans
  async getPlans() {
    const response = await superAdminApi.get('/super-admin/plans');
    return response.data;
  },

  // Audit Logs
  async getAuditLogs(params: {
    organizationId?: string;
    actorId?: string;
    action?: string;
    page?: number;
    limit?: number;
  }) {
    const response = await superAdminApi.get('/super-admin/audit-logs', { params });
    return response.data;
  },

  // Exports
  async exportOrganizations() {
    const response = await superAdminApi.get('/super-admin/export/organizations', {
      responseType: 'blob',
    });
    return response.data;
  },

  async exportRevenue(months: number = 12) {
    const response = await superAdminApi.get('/super-admin/export/revenue', {
      params: { months },
      responseType: 'blob',
    });
    return response.data;
  },

  async exportUsage() {
    const response = await superAdminApi.get('/super-admin/export/usage', {
      responseType: 'blob',
    });
    return response.data;
  },

  async exportAuditLogs(params?: {
    startDate?: string;
    endDate?: string;
    organizationId?: string;
  }) {
    const response = await superAdminApi.get('/super-admin/export/audit-logs', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  // Helper to download blob as file
  downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

export default superAdminService;
