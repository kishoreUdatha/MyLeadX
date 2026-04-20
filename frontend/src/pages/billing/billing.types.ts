/**
 * Billing Types - TypeScript interfaces for billing system
 */

export interface WalletBalance {
  balance: number;
  currency: string;
  presets: number[];
  lastTransaction?: {
    type: string;
    amount: number;
    description: string;
    createdAt: string;
  };
}

export interface WalletTransaction {
  id: string;
  type: 'CREDIT' | 'DEBIT' | 'REFUND';
  amount: number;
  currency: string;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  referenceType?: string;
  referenceId?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  createdAt: string;
}

export interface TransactionHistoryResponse {
  transactions: WalletTransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  color?: string;
  icon?: string;
  features: {
    maxLeads: number;
    maxUsers: number;
    maxForms: number;
    maxLandingPages: number;
    aiCallsPerMonth: number;
    voiceAgents: number;
    smsPerMonth: number;
    emailsPerMonth: number;
    hasWhatsApp: boolean;
    hasTelecallerQueue: boolean;
    hasSocialMediaAds: boolean;
    hasLeadScoring: boolean;
    hasWebhooks: boolean;
    hasApiAccess: boolean;
    hasSso: boolean;
    hasWhiteLabeling: boolean;
    storageGb?: number;
    voiceMinutesPerMonth?: number;
  };
}

export interface Subscription {
  id: string;
  organizationId: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
  userCount: number;
  status: 'PENDING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED' | 'TRIAL';
  amount: number;
  currency: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  plan: Plan;
  usage?: Usage;
}

export interface Usage {
  leadsCount: number;
  usersCount: number;
  aiCallsCount: number;
  voiceMinutesUsed?: number;
  smsCount: number;
  emailsCount: number;
  whatsappCount: number;
  storageUsedMb: number;
}

export interface UsageLimits {
  leads: { used: number; limit: number };
  users: { used: number; limit: number };
  aiCalls: { used: number; limit: number };
  voiceMinutes?: { used: number; limit: number };
  sms: { used: number; limit: number };
  emails: { used: number; limit: number };
  whatsapp: { used: number; limit: number };
  storage: { used: number; limit: number };
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  plan: string;
  billingCycle: string;
  userCount: number;
  subtotal: number;
  gst: number;
  total: number;
  currency: string;
  paymentId: string | null;
  status: string;
}

export interface BillingHistoryItem {
  id: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  status: string;
  billingCycle: string;
  createdAt: string;
  activatedAt: string | null;
  paymentId: string | null;
}

export interface PlanUpgradeData {
  order: {
    id: string;
    amount: number;
    currency: string;
  };
  proratedCredit: number;
  newAmount: number;
  finalAmount: number;
  keyId: string;
}

export interface AddUsersData {
  order: {
    id: string;
    amount: number;
    currency: string;
  };
  additionalUsers: number;
  pricePerUser: number;
  totalAmount: number;
  keyId: string;
}

// Plan display configuration
export const PLAN_COLORS: Record<string, string> = {
  free: 'slate',
  starter: 'blue',
  growth: 'indigo',
  business: 'purple',
  enterprise: 'amber',
};

export const PLAN_ICONS: Record<string, string> = {
  free: 'SparklesIcon',
  starter: 'RocketLaunchIcon',
  growth: 'ArrowTrendingUpIcon',
  business: 'BuildingOfficeIcon',
  enterprise: 'BuildingOffice2Icon',
};

// Status badge colors
export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: 'bg-green-100', text: 'text-green-700' },
  TRIAL: { bg: 'bg-blue-100', text: 'text-blue-700' },
  PAST_DUE: { bg: 'bg-red-100', text: 'text-red-700' },
  CANCELLED: { bg: 'bg-slate-100', text: 'text-slate-700' },
  EXPIRED: { bg: 'bg-amber-100', text: 'text-amber-700' },
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
};

// Usage color thresholds
export function getUsageColor(percentage: number): string {
  if (percentage >= 90) return 'red';
  if (percentage >= 70) return 'yellow';
  return 'green';
}

export function getUsageBarColor(percentage: number): string {
  if (percentage >= 90) return 'bg-red-500';
  if (percentage >= 70) return 'bg-yellow-500';
  return 'bg-green-500';
}

export function getUsageBarBgColor(percentage: number): string {
  if (percentage >= 90) return 'bg-red-100';
  if (percentage >= 70) return 'bg-yellow-100';
  return 'bg-green-100';
}
