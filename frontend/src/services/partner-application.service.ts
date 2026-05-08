import api from './api';

export interface PartnerApplication {
  id: string;
  applicationNumber: string;
  partnerId: string;
  universityId: string;
  collegeId?: string;
  courseId?: string;
  academicYear: string;
  studentName: string;
  studentEmail?: string;
  studentPhone: string;
  parentName?: string;
  parentPhone?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  status: string;
  documentsStatus: string;
  paymentStatus: string;
  totalFee: number;
  scholarshipAmount?: number;
  netFee: number;
  paidAmount: number;
  partner?: {
    id: string;
    name: string;
    type: string;
  };
  university?: {
    id: string;
    name: string;
  };
  course?: {
    id: string;
    name: string;
  };
  counsellor?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  documents?: any[];
  payments?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  paymentStatus?: string;
  documentsStatus?: string;
  partnerId?: string;
  universityId?: string;
  startDate?: string;
  endDate?: string;
}

// Note: Application link creation is done via partner-portal.service.ts for partner self-service
// or via the partner portal pages directly using fetch calls

class PartnerApplicationService {
  // List applications
  async listApplications(params: ApplicationListParams = {}) {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });

      const response = await api.get(`/partner-applications?${queryParams.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('Error listing applications:', error);
      return { success: false, data: [], error: error.message };
    }
  }

  // Get application by ID
  async getApplicationById(id: string) {
    try {
      const response = await api.get(`/partner-applications/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching application:', error);
      return { success: false, error: error.message };
    }
  }

  // Get application stats
  async getApplicationStats(partnerId?: string) {
    try {
      const url = partnerId
        ? `/partner-applications/stats?partnerId=${partnerId}`
        : '/partner-applications/stats';
      const response = await api.get(url);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      return { success: false, data: { total: 0, pending: 0, paymentPending: 0, confirmed: 0 } };
    }
  }

  // Create application
  async createApplication(data: any) {
    try {
      const response = await api.post('/partner-applications', data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating application:', error);
      throw error;
    }
  }

  // Update application
  async updateApplication(id: string, data: any) {
    try {
      const response = await api.patch(`/partner-applications/${id}`, data);
      return response.data;
    } catch (error: any) {
      console.error('Error updating application:', error);
      throw error;
    }
  }

  // Update application status
  async updateStatus(id: string, status: string, notes?: string) {
    try {
      const response = await api.patch(`/partner-applications/${id}/status`, { status, notes });
      return response.data;
    } catch (error: any) {
      console.error('Error updating status:', error);
      throw error;
    }
  }

  // Assign counsellor
  async assignCounsellor(id: string, counsellorId: string) {
    try {
      const response = await api.patch(`/partner-applications/${id}/assign-counsellor`, { counsellorId });
      return response.data;
    } catch (error: any) {
      console.error('Error assigning counsellor:', error);
      throw error;
    }
  }

  // Upload document
  async uploadDocument(applicationId: string, data: any) {
    try {
      const response = await api.post(`/partner-applications/${applicationId}/documents`, data);
      return response.data;
    } catch (error: any) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }

  // Verify document
  async verifyDocument(applicationId: string, documentId: string, status: 'VERIFIED' | 'REJECTED', rejectionReason?: string) {
    try {
      const response = await api.patch(`/partner-applications/${applicationId}/documents/${documentId}/verify`, {
        status,
        rejectionReason,
      });
      return response.data;
    } catch (error: any) {
      console.error('Error verifying document:', error);
      throw error;
    }
  }

  // Get activity logs
  async getActivityLogs(applicationId: string) {
    try {
      const response = await api.get(`/partner-applications/${applicationId}/activity-logs`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching activity logs:', error);
      return { success: false, data: [] };
    }
  }

  // ==================== Application Link Management (Admin) ====================
  // Note: These methods are for admin viewing/managing partner application links
  // For partner self-service, partners use the partner-portal endpoints directly

  // Get all application links with filters (Admin)
  async getApplicationLinks(params?: { partnerId?: string; status?: string; page?: number; limit?: number }) {
    try {
      const queryParams = new URLSearchParams();
      if (params?.partnerId) queryParams.append('partnerId', params.partnerId);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const response = await api.get(`/partner-applications/links?${queryParams.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching application links:', error);
      return { success: false, data: [] };
    }
  }

  // ==================== Payment Management ====================

  // Create payment link
  async createPaymentLink(applicationId: string, data: { amount: number; feeType: string; sentTo: string; sentVia?: string; expiresInHours?: number }) {
    try {
      const response = await api.post('/application-payments/payment-links', {
        applicationId,
        ...data,
      });
      return response.data;
    } catch (error: any) {
      console.error('Error creating payment link:', error);
      throw error;
    }
  }

  // Record payment
  async recordPayment(data: { applicationId: string; amount: number; paymentMode: string; paymentType: string; description?: string }) {
    try {
      const response = await api.post('/application-payments', data);
      return response.data;
    } catch (error: any) {
      console.error('Error recording payment:', error);
      throw error;
    }
  }

  // Verify payment
  async verifyPayment(paymentId: string, status: 'VERIFIED' | 'REJECTED', notes?: string, rejectionReason?: string) {
    try {
      const response = await api.patch(`/application-payments/${paymentId}/verify`, {
        status,
        verificationNotes: notes,
        rejectionReason,
      });
      return response.data;
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      throw error;
    }
  }

  // Get application payments
  async getApplicationPayments(applicationId: string) {
    try {
      const response = await api.get(`/application-payments/application/${applicationId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      return { success: false, data: [] };
    }
  }
}

export const partnerApplicationService = new PartnerApplicationService();
