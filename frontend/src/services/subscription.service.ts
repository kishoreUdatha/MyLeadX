import api from './api';

export interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
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
  usage: Usage;
}

export interface Usage {
  leadsCount: number;
  usersCount: number;
  aiCallsCount: number;
  smsCount: number;
  emailsCount: number;
  whatsappCount: number;
  storageUsedMb: number;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

class SubscriptionService {
  // Get all plans
  async getPlans(): Promise<{ plans: Plan[]; addOns: any }> {
    const response = await api.get('/subscription/plans');
    return response.data.data;
  }

  // Get current subscription
  async getCurrentSubscription(): Promise<Subscription | null> {
    const response = await api.get('/subscription/current');
    return response.data.data;
  }

  // Get usage
  async getUsage(): Promise<Usage> {
    const response = await api.get('/subscription/usage');
    return response.data.data;
  }

  // Create subscription
  async createSubscription(
    planId: string,
    billingCycle: 'monthly' | 'annual',
    userCount: number
  ): Promise<{ subscription: any; razorpayOrder: RazorpayOrder; keyId: string }> {
    const response = await api.post('/subscription/create', {
      planId,
      billingCycle,
      userCount,
    });
    return response.data.data;
  }

  // Verify payment
  async verifyPayment(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ): Promise<Subscription> {
    const response = await api.post('/subscription/verify', {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });
    return response.data.data;
  }

  // Upgrade plan
  async upgradePlan(
    planId: string,
    billingCycle: 'monthly' | 'annual'
  ): Promise<{ order: RazorpayOrder; proratedCredit: number; newAmount: number; finalAmount: number; keyId: string }> {
    const response = await api.post('/subscription/upgrade', {
      planId,
      billingCycle,
    });
    return response.data.data;
  }

  // Downgrade plan
  async downgradePlan(planId: string): Promise<{ message: string; effectiveDate: string; newPlan: Plan }> {
    const response = await api.post('/subscription/downgrade', { planId });
    return response.data.data;
  }

  // Cancel subscription
  async cancelSubscription(reason?: string): Promise<{ message: string; accessUntil: string }> {
    const response = await api.post('/subscription/cancel', { reason });
    return response.data.data;
  }

  // Reactivate subscription
  async reactivateSubscription(): Promise<{ message: string }> {
    const response = await api.post('/subscription/reactivate');
    return response.data.data;
  }

  // Get billing history
  async getBillingHistory(): Promise<any[]> {
    const response = await api.get('/subscription/billing-history');
    return response.data.data;
  }

  // Generate invoice
  async generateInvoice(subscriptionId: string): Promise<any> {
    const response = await api.get(`/subscription/invoice/${subscriptionId}`);
    return response.data.data;
  }

  // Add users
  async addUsers(additionalUsers: number): Promise<{ order: RazorpayOrder; additionalUsers: number; proratedAmount: number; keyId: string }> {
    const response = await api.post('/subscription/add-users', { additionalUsers });
    return response.data.data;
  }

  // Purchase add-on (voice minutes, SMS, WhatsApp, phone numbers, voice agents, etc.)
  async purchaseAddOn(
    addOnType: 'voiceMinutes' | 'aiCalls' | 'sms' | 'whatsapp' | 'storage' | 'leads' | 'phoneNumbers' | 'voiceAgents' | 'users',
    quantity: number
  ): Promise<{ order: RazorpayOrder; addOnType: string; quantity: number; pricePerUnit: number; totalAmount: number; keyId: string }> {
    const response = await api.post('/subscription/add-on', { addOnType, quantity });
    return response.data.data;
  }

  // Verify add-on payment
  async verifyAddOnPayment(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ): Promise<{ success: boolean }> {
    const response = await api.post('/subscription/add-on/verify', {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });
    return response.data.data;
  }

  // Load Razorpay script
  loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  // Open Razorpay checkout
  async openCheckout(
    order: RazorpayOrder,
    keyId: string,
    prefill: { name: string; email: string; contact?: string },
    onSuccess: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void,
    onError: (error: any) => void
  ): Promise<void> {
    const loaded = await this.loadRazorpayScript();
    if (!loaded) {
      onError(new Error('Failed to load Razorpay SDK'));
      return;
    }

    const options = {
      key: keyId,
      amount: order.amount,
      currency: order.currency,
      name: 'MyLeadX',
      description: 'Subscription Payment',
      order_id: order.id,
      prefill,
      theme: {
        color: '#6366f1',
      },
      handler: onSuccess,
      modal: {
        ondismiss: () => {
          onError(new Error('Payment cancelled by user'));
        },
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.on('payment.failed', (response: any) => {
      onError(response.error);
    });
    razorpay.open();
  }

  // Format currency
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  // Calculate percentage used
  calculateUsagePercentage(used: number, limit: number): number {
    if (limit === -1) return 0; // Unlimited
    return Math.min(100, Math.round((used / limit) * 100));
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;
