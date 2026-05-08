import api from './api';

/**
 * Partner Portal Service
 * Self-service endpoints for admission partners to manage their own portal
 * Uses partner-specific JWT token stored as 'admission_partner_token'
 */

// ==================== Types ====================

export interface PartnerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  partnerCode: string;
  partnerType: 'SUPER_PARTNER' | 'SUB_PARTNER' | 'AGENT';
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  status: 'ACTIVE' | 'PENDING_APPROVAL' | 'SUSPENDED' | 'BLOCKED';
  companyName?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface PartnerDashboard {
  stats: {
    totalApplications: number;
    pendingApplications: number;
    confirmedAdmissions: number;
    totalCommission: number;
    pendingCommission: number;
    thisMonthApplications: number;
  };
  recentApplications: Array<{
    id: string;
    applicationNumber: string;
    studentName: string;
    status: string;
    createdAt: string;
  }>;
}

export interface PartnerWallet {
  balance: number;
  pendingBalance: number;
  totalEarnings: number;
  totalWithdrawn: number;
  transactions: Array<{
    id: string;
    type: 'COMMISSION' | 'WITHDRAWAL' | 'BONUS' | 'ADJUSTMENT';
    amount: number;
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    description: string;
    createdAt: string;
  }>;
}

export interface PartnerPayout {
  id: string;
  amount: number;
  status: 'PENDING' | 'PROCESSED' | 'REJECTED';
  paymentMethod: string;
  createdAt: string;
  processedAt?: string;
  notes?: string;
}

export interface PartnerApplication {
  id: string;
  applicationNumber: string;
  studentName: string;
  studentPhone: string;
  status: string;
  paymentStatus: string;
  documentsStatus: string;
  totalFee: number;
  paidAmount: number;
  createdAt: string;
  university?: { name: string };
}

export interface ApplicationLink {
  id: string;
  linkCode: string;
  fullUrl: string;
  expiresAt: string;
  studentName?: string;
  studentPhone?: string;
  status: string;
  createdAt: string;
}

export interface University {
  id: string;
  name: string;
}

export interface College {
  id: string;
  name: string;
}

export interface Course {
  id: string;
  name: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  partnerType: string;
  status: string;
  createdAt: string;
}

export interface BankDetails {
  id: string;
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  ifscCode: string;
  branchName?: string;
  accountType?: 'SAVINGS' | 'CURRENT';
  upiId?: string;
  isPrimary: boolean;
  isVerified: boolean;
}

// ==================== Helper ====================

const getPartnerToken = () => localStorage.getItem('admission_partner_token');

const partnerApi = {
  get: async (url: string) => {
    const token = getPartnerToken();
    const response = await fetch(`/api${url}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Request failed');
    }
    return response.json();
  },
  post: async (url: string, body?: any) => {
    const token = getPartnerToken();
    const response = await fetch(`/api${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Request failed');
    }
    return response.json();
  },
  patch: async (url: string, body?: any) => {
    const token = getPartnerToken();
    const response = await fetch(`/api${url}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Request failed');
    }
    return response.json();
  },
};

// ==================== Service ====================

class PartnerPortalService {
  // ==================== Authentication ====================

  // Login as partner
  async login(email: string, password: string, organizationSlug: string) {
    const response = await fetch('/api/partner-portal/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, organizationSlug }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    // Store token
    if (data.data?.token) {
      localStorage.setItem('admission_partner_token', data.data.token);
      localStorage.setItem('admission_partner', JSON.stringify(data.data.partner));
    }

    return data;
  }

  // Logout
  logout() {
    localStorage.removeItem('admission_partner_token');
    localStorage.removeItem('admission_partner');
  }

  // Check if logged in
  isLoggedIn(): boolean {
    return !!getPartnerToken();
  }

  // Get stored partner info
  getStoredPartner(): PartnerProfile | null {
    const stored = localStorage.getItem('admission_partner');
    return stored ? JSON.parse(stored) : null;
  }

  // ==================== Profile ====================

  // Get current partner profile
  async getProfile(): Promise<{ success: boolean; data: PartnerProfile }> {
    return partnerApi.get('/partner-portal/me');
  }

  // Update profile
  async updateProfile(data: Partial<{ name: string; altPhone: string; companyName: string; address: string; city: string; state: string; pincode: string }>) {
    return partnerApi.patch('/partner-portal/me', data);
  }

  // Change password
  async changePassword(currentPassword: string, newPassword: string) {
    return partnerApi.post('/partner-portal/me/change-password', { currentPassword, newPassword });
  }

  // ==================== Dashboard ====================

  // Get dashboard data
  async getDashboard(): Promise<{ success: boolean; data: PartnerDashboard }> {
    return partnerApi.get('/partner-portal/dashboard');
  }

  // ==================== Universities & Colleges ====================

  // Get accessible universities
  async getUniversities(): Promise<{ success: boolean; data: University[] }> {
    return partnerApi.get('/partner-portal/universities');
  }

  // Get college access
  async getCollegeAccess() {
    return partnerApi.get('/partner-portal/college-access');
  }

  // Get commission rate for a college/course
  async getCommissionRate(universityId: string, collegeId?: string, courseId?: string) {
    const params = new URLSearchParams({ universityId });
    if (collegeId) params.append('collegeId', collegeId);
    if (courseId) params.append('courseId', courseId);
    return partnerApi.get(`/partner-portal/commission-rate?${params.toString()}`);
  }

  // ==================== Applications ====================

  // List applications
  async getApplications(params?: { page?: number; limit?: number; status?: string; paymentStatus?: string; search?: string; universityId?: string }): Promise<{ success: boolean; data: PartnerApplication[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.paymentStatus) queryParams.append('paymentStatus', params.paymentStatus);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.universityId) queryParams.append('universityId', params.universityId);

    return partnerApi.get(`/partner-portal/applications?${queryParams.toString()}`);
  }

  // Get application stats
  async getApplicationStats() {
    return partnerApi.get('/partner-portal/applications/stats');
  }

  // Get application by ID
  async getApplication(id: string) {
    return partnerApi.get(`/partner-portal/applications/${id}`);
  }

  // Create application
  async createApplication(data: {
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
    totalFee: number;
    scholarshipAmount?: number;
    formData?: Record<string, any>;
  }) {
    return partnerApi.post('/partner-portal/applications', data);
  }

  // Update application
  async updateApplication(id: string, data: any) {
    return partnerApi.patch(`/partner-portal/applications/${id}`, data);
  }

  // Submit application
  async submitApplication(id: string) {
    return partnerApi.post(`/partner-portal/applications/${id}/submit`);
  }

  // Check for duplicate applications
  async checkDuplicates(studentPhone: string, studentEmail?: string, aadhaarNumber?: string, hallTicketNumber?: string) {
    return partnerApi.post('/partner-portal/applications/check-duplicates', {
      studentPhone,
      studentEmail,
      aadhaarNumber,
      hallTicketNumber,
    });
  }

  // Upload document to application
  async uploadDocument(applicationId: string, data: { documentType: string; documentName: string; fileName: string; fileUrl: string; fileSize: number; mimeType?: string }) {
    return partnerApi.post(`/partner-portal/applications/${applicationId}/documents`, data);
  }

  // Get required documents for a university/college
  async getRequiredDocuments(universityId: string, collegeId?: string, courseId?: string) {
    const params = new URLSearchParams();
    if (collegeId) params.append('collegeId', collegeId);
    if (courseId) params.append('courseId', courseId);
    return partnerApi.get(`/partner-portal/required-documents/${universityId}?${params.toString()}`);
  }

  // ==================== Application Links ====================

  // Create application link
  async createApplicationLink(data: { universityId: string; collegeId?: string; courseId?: string; studentName?: string; studentPhone?: string; studentEmail?: string; expiresInDays?: number }): Promise<{ success: boolean; data: ApplicationLink }> {
    return partnerApi.post('/partner-portal/application-links', data);
  }

  // Get application links
  async getApplicationLinks(params?: { page?: number; limit?: number }): Promise<{ success: boolean; data: ApplicationLink[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    return partnerApi.get(`/partner-portal/application-links?${queryParams.toString()}`);
  }

  // ==================== Wallet & Payouts ====================

  // Get wallet details
  async getWallet(): Promise<{ success: boolean; data: PartnerWallet }> {
    return partnerApi.get('/partner-portal/wallet');
  }

  // Get commissions
  async getCommissions(params?: { page?: number; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    return partnerApi.get(`/partner-portal/commissions?${queryParams.toString()}`);
  }

  // Get commission stats
  async getCommissionStats() {
    return partnerApi.get('/partner-portal/commissions/stats');
  }

  // Request payout
  async requestPayout(amount: number, notes?: string): Promise<{ success: boolean; data: PartnerPayout }> {
    return partnerApi.post('/partner-portal/payouts/request', { amount, notes });
  }

  // Get payout history
  async getPayouts(status?: string): Promise<{ success: boolean; data: PartnerPayout[] }> {
    const params = status ? `?status=${status}` : '';
    return partnerApi.get(`/partner-portal/payouts${params}`);
  }

  // ==================== Bank Details ====================

  // Get bank details
  async getBankDetails(): Promise<{ success: boolean; data: BankDetails[] }> {
    return partnerApi.get('/partner-portal/bank-details');
  }

  // Add/Update bank details
  async saveBankDetails(data: { accountHolderName: string; accountNumber: string; bankName: string; ifscCode: string; branchName?: string; accountType?: 'SAVINGS' | 'CURRENT'; upiId?: string; isPrimary?: boolean }) {
    return partnerApi.post('/partner-portal/bank-details', data);
  }

  // ==================== Team Management ====================

  // Get team members
  async getTeam(params?: { page?: number; limit?: number }): Promise<{ success: boolean; data: TeamMember[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    return partnerApi.get(`/partner-portal/team?${queryParams.toString()}`);
  }

  // Add team member
  async addTeamMember(data: { name: string; email: string; phone: string; password: string; altPhone?: string }) {
    return partnerApi.post('/partner-portal/team', data);
  }

  // ==================== Activity Logs ====================

  // Get activity logs
  async getActivityLogs(params?: { page?: number; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    return partnerApi.get(`/partner-portal/activity-logs?${queryParams.toString()}`);
  }

  // ==================== Payments ====================

  // Record payment with proof
  async recordPayment(applicationId: string, data: {
    paymentMode: 'ONLINE_UNIVERSITY' | 'OFFLINE_CASH' | 'OFFLINE_CHEQUE' | 'OFFLINE_DD' | 'BANK_TRANSFER' | 'UPI';
    paymentType: 'ADMISSION_FEE' | 'TUITION_FEE' | 'HOSTEL_FEE' | 'EXAM_FEE' | 'OTHER';
    amount: number;
    proofType: 'RECEIPT' | 'SCREENSHOT' | 'BANK_STATEMENT' | 'CHEQUE_IMAGE' | 'DD_IMAGE';
    fileUrl: string;
    fileName: string;
    fileSize: number;
    transactionId?: string;
    paymentDate?: string;
    bankName?: string;
    notes?: string;
  }) {
    return partnerApi.post(`/partner-portal/applications/${applicationId}/payments`, data);
  }

  // Get application payments
  async getApplicationPayments(applicationId: string) {
    return partnerApi.get(`/partner-portal/applications/${applicationId}/payments`);
  }
}

export const partnerPortalService = new PartnerPortalService();
