import api from './api';

export interface AdmissionPartner {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: 'SUPER_PARTNER' | 'SUB_PARTNER' | 'AGENT';
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'INACTIVE';
  city?: string;
  state?: string;
  companyName?: string;
  parentPartnerId?: string;
  parentPartner?: { id: string; name: string };
  commissionRate: number;
  walletBalance: number;
  totalApplications?: number;
  confirmedAdmissions?: number;
  totalEarnings?: number;
  pendingCommission?: number;
  subPartners?: number;
  agents?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerListParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  status?: string;
}

export interface CreatePartnerParams {
  name: string;
  email: string;
  phone: string;
  password: string;
  partnerType?: 'SUPER_PARTNER' | 'SUB_PARTNER' | 'AGENT';
  parentPartnerId?: string;
  companyName?: string;
  city?: string;
  state?: string;
  address?: string;
  panNumber?: string;
  defaultCommissionPercent?: number;
}

// Note: For partner self-service application links, use partnerPortalService

/**
 * Admin service for managing admission partners
 * These endpoints require admin authentication and are used by CRM/admin pages
 * For partner self-service, use partnerPortalService instead
 */
class AdmissionPartnerService {
  // List partners (Admin)
  async listPartners(params: PartnerListParams = {}) {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });

      const response = await api.get(`/admission-partners?${queryParams.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('Error listing partners:', error);
      return { success: false, data: [], error: error.message };
    }
  }

  // Get partner by ID (Admin)
  async getPartnerById(id: string) {
    try {
      const response = await api.get(`/admission-partners/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching partner:', error);
      return { success: false, error: error.message };
    }
  }

  // Get partner stats for organization (Admin)
  async getPartnerStats() {
    try {
      const response = await api.get('/admission-partners/stats');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      return {
        success: false,
        data: { total: 0, active: 0, pending: 0, totalApplications: 0, totalEarnings: 0, pendingCommissions: 0 }
      };
    }
  }

  // Create partner (Admin)
  async createPartner(data: CreatePartnerParams) {
    try {
      const response = await api.post('/admission-partners', data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating partner:', error);
      throw error;
    }
  }

  // Update partner (Admin)
  async updatePartner(id: string, data: Partial<CreatePartnerParams>) {
    try {
      const response = await api.patch(`/admission-partners/${id}`, data);
      return response.data;
    } catch (error: any) {
      console.error('Error updating partner:', error);
      throw error;
    }
  }

  // Update partner status (Admin)
  async updatePartnerStatus(id: string, status: string, reason?: string) {
    try {
      const response = await api.patch(`/admission-partners/${id}/status`, { status, reason });
      return response.data;
    } catch (error: any) {
      console.error('Error updating status:', error);
      throw error;
    }
  }

  // Update partner tier (Admin)
  async updatePartnerTier(id: string, tier: string) {
    try {
      const response = await api.patch(`/admission-partners/${id}/tier`, { tier });
      return response.data;
    } catch (error: any) {
      console.error('Error updating tier:', error);
      throw error;
    }
  }

  // Get partner's team members (Admin)
  async getPartnerTeam(id: string, params?: { page?: number; limit?: number }) {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const response = await api.get(`/admission-partners/${id}/team?${queryParams.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching team:', error);
      return { success: false, data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    }
  }

  // Get partner's college access (Admin)
  async getPartnerCollegeAccess(id: string) {
    try {
      const response = await api.get(`/admission-partners/${id}/college-access`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching college access:', error);
      return { success: false, data: [] };
    }
  }

  // Assign college access to partner (Admin)
  async assignCollegeAccess(partnerId: string, data: { universityId: string; collegeId?: string; courseId?: string; commissionOverride?: number }) {
    try {
      const response = await api.post(`/admission-partners/${partnerId}/college-access`, data);
      return response.data;
    } catch (error: any) {
      console.error('Error assigning college access:', error);
      throw error;
    }
  }

  // Remove college access from partner (Admin)
  async removeCollegeAccess(partnerId: string, accessId: string) {
    try {
      const response = await api.delete(`/admission-partners/${partnerId}/college-access/${accessId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error removing college access:', error);
      throw error;
    }
  }

  // Get partner bank details (Admin)
  async getPartnerBankDetails(id: string) {
    try {
      const response = await api.get(`/admission-partners/${id}/bank-details`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching bank details:', error);
      return { success: false, data: [] };
    }
  }

  // Verify partner bank details (Admin)
  async verifyBankDetails(partnerId: string, bankDetailsId: string) {
    try {
      const response = await api.post(`/admission-partners/${partnerId}/bank-details/${bankDetailsId}/verify`);
      return response.data;
    } catch (error: any) {
      console.error('Error verifying bank details:', error);
      throw error;
    }
  }

  // Get partner activity logs (Admin)
  async getPartnerActivityLogs(id: string, params?: { page?: number; limit?: number }) {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const response = await api.get(`/admission-partners/${id}/activity-logs?${queryParams.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching activity logs:', error);
      return { success: false, data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
  }

  // Get partner's applications (Admin)
  async getPartnerApplications(id: string, params?: { page?: number; limit?: number; status?: string; universityId?: string; collegeId?: string; search?: string }) {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.status) queryParams.append('status', params.status);
      if (params?.universityId) queryParams.append('universityId', params.universityId);
      if (params?.collegeId) queryParams.append('collegeId', params.collegeId);
      if (params?.search) queryParams.append('search', params.search);

      const response = await api.get(`/admission-partners/${id}/applications?${queryParams.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      return { success: false, data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
  }

  // Get partner earnings/commission history (Admin)
  async getPartnerEarnings(partnerId: string, params?: { page?: number; limit?: number; startDate?: string; endDate?: string }) {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);

      const response = await api.get(`/admission-partners/${partnerId}/earnings?${queryParams.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching earnings:', error);
      return { success: false, data: [] };
    }
  }

  // Reset partner password (Admin)
  async resetPartnerPassword(id: string, newPassword: string) {
    try {
      const response = await api.post(`/admission-partners/${id}/reset-password`, { newPassword });
      return response.data;
    } catch (error: any) {
      console.error('Error resetting password:', error);
      throw error;
    }
  }

  // ==================== Payout Management (Admin) ====================

  // Get all pending payouts (Admin)
  async getPendingPayouts() {
    try {
      const response = await api.get('/admission-partners/payouts/pending');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching pending payouts:', error);
      return { success: false, data: [] };
    }
  }

  // Get all payouts with filters (Admin)
  async getAllPayouts(params?: { status?: string; partnerId?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) {
    try {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.partnerId) queryParams.append('partnerId', params.partnerId);
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const response = await api.get(`/admission-partners/payouts?${queryParams.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching payouts:', error);
      return { success: false, data: [] };
    }
  }

  // Approve payout request (Admin)
  async approvePayout(payoutId: string, notes?: string) {
    try {
      const response = await api.post(`/admission-partners/payouts/${payoutId}/approve`, { notes });
      return response.data;
    } catch (error: any) {
      console.error('Error approving payout:', error);
      throw error;
    }
  }

  // Reject payout request (Admin)
  async rejectPayout(payoutId: string, reason: string) {
    try {
      const response = await api.post(`/admission-partners/payouts/${payoutId}/reject`, { reason });
      return response.data;
    } catch (error: any) {
      console.error('Error rejecting payout:', error);
      throw error;
    }
  }

  // Complete payout (Admin)
  async completePayout(payoutId: string, data: { transactionId?: string; paymentMethod?: string; notes?: string }) {
    try {
      const response = await api.post(`/admission-partners/payouts/${payoutId}/complete`, data);
      return response.data;
    } catch (error: any) {
      console.error('Error completing payout:', error);
      throw error;
    }
  }
}

export const admissionPartnerService = new AdmissionPartnerService();
