// Lead Types
export type LeadSource =
  | 'MANUAL'
  | 'BULK_UPLOAD'
  | 'FORM'
  | 'LANDING_PAGE'
  | 'CHATBOT'
  | 'AD_FACEBOOK'
  | 'AD_INSTAGRAM'
  | 'AD_LINKEDIN'
  | 'REFERRAL'
  | 'WEBSITE'
  | 'OTHER';

export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST'
  | 'FOLLOW_UP';

export type LeadPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Lead {
  id: string;
  organizationId: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  source: LeadSource;
  sourceDetails?: string;
  status: LeadStatus;
  priority: LeadPriority;
  notes?: string;
  customFields?: Record<string, unknown>;
  isConverted: boolean;
  convertedAt?: string;
  createdAt: string;
  updatedAt: string;
  assignments?: LeadAssignment[];
}

export interface LeadAssignment {
  id: string;
  leadId: string;
  assignedToId: string;
  assignedById?: string;
  isActive: boolean;
  assignedAt: string;
  assignedTo?: User;
}

// User Types
export interface User {
  id: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  roleId: string;
  isActive: boolean;
  role?: Role;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  permissions: string[];
}

// Organization Types
export interface Organization {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  address?: string;
  logo?: string;
  settings?: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Campaign Types
export type CampaignType = 'SMS' | 'EMAIL' | 'WHATSAPP';
export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'CANCELLED';

export interface Campaign {
  id: string;
  organizationId: string;
  createdById: string;
  name: string;
  type: CampaignType;
  subject?: string;
  content: string;
  templateId?: string;
  status: CampaignStatus;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  stats?: CampaignStats;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignStats {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
}

// Payment Types
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';

export interface Payment {
  id: string;
  organizationId: string;
  studentProfileId: string;
  createdById: string;
  orderId: string;
  paymentId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  splits?: PaymentSplit[];
}

export interface PaymentSplit {
  id: string;
  paymentId: string;
  splitNumber: number;
  amount: number;
  dueDate: string;
  status: PaymentStatus;
  paidAt?: string;
  reminderSent: boolean;
}

// Form Types
export interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: Record<string, unknown>;
}

export interface CustomForm {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  fields: FormField[];
  settings?: Record<string, unknown>;
  embedCode?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Ad Campaign Types
export type AdPlatform = 'FACEBOOK' | 'INSTAGRAM' | 'LINKEDIN';

export interface AdCampaign {
  id: string;
  organizationId: string;
  platform: AdPlatform;
  externalId: string;
  name: string;
  status: string;
  budget?: number;
  spend?: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  syncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

// Auth Types
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  organizationName: string;
  role: string;
  permissions: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  organizationName: string;
  organizationSlug: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}
