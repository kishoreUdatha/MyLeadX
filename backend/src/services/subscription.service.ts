import Razorpay from 'razorpay';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errors';

const prisma = new PrismaClient();

// Initialize Razorpay (optional - only if credentials are provided)
let razorpay: Razorpay | null = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
} else {
  console.log('Razorpay credentials not configured. Payment features will be disabled.');
}

// Plan configurations - CRM + Voice AI Balanced Pricing (2026)
export const PLANS = {
  free: {
    id: 'free',
    name: 'Free Trial',
    monthlyPrice: 0,
    annualPrice: 0,
    features: {
      maxLeads: 50,
      maxUsers: 1,
      maxForms: 1,
      maxLandingPages: 0,
      // Voice AI Features
      maxPhoneNumbers: 0,
      maxVoiceAgents: 1,
      voiceMinutesIncluded: 15, // 15 mins trial
      extraMinuteRate: 0,
      concurrentCalls: 1,
      // Communication
      smsPerMonth: 0,
      whatsappPerMonth: 50,
      emailsPerMonth: 100,
      // Feature flags
      hasWhatsApp: false,
      hasTelecallerQueue: false,
      hasSocialMediaAds: false,
      hasLeadScoring: false,
      hasWebhooks: false,
      hasApiAccess: false,
      hasSso: false,
      hasWhiteLabeling: false,
      hasEmailCampaigns: false,
      hasIvrBuilder: false,
      hasCallQueues: false,
      hasCallRecording: true,
      hasCallSummary: false,
      hasMultilingual: false,
      supportLevel: 'community',
    },
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 1999,
    annualPrice: 1599 * 12, // ₹19,188 annually (20% off)
    features: {
      maxLeads: 1000,
      maxUsers: 5,
      maxForms: 3,
      maxLandingPages: 2,
      // Voice AI Features
      maxPhoneNumbers: 1,
      maxVoiceAgents: 5,
      voiceMinutesIncluded: 100,
      extraMinuteRate: 8.0,
      concurrentCalls: 1,
      // Communication
      smsPerMonth: 200,
      whatsappPerMonth: 500,
      emailsPerMonth: 1000,
      // Feature flags
      hasWhatsApp: true,
      hasTelecallerQueue: true,
      hasSocialMediaAds: false,
      hasLeadScoring: false,
      hasWebhooks: false,
      hasApiAccess: false,
      hasSso: false,
      hasWhiteLabeling: false,
      hasEmailCampaigns: true,
      hasIvrBuilder: false,
      hasCallQueues: false,
      hasCallRecording: true,
      hasCallSummary: true,
      hasMultilingual: true,
      supportLevel: 'email',
    },
    addOnPricing: {
      extraPhoneNumber: 499,
      extraVoiceAgent: 149,
      extraUser: 299,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 6999,
    annualPrice: 5599 * 12, // ₹67,188 annually (20% off)
    features: {
      maxLeads: 5000,
      maxUsers: 15,
      maxForms: 10,
      maxLandingPages: 5,
      // Voice AI Features
      maxPhoneNumbers: 3,
      maxVoiceAgents: 15,
      voiceMinutesIncluded: 500,
      extraMinuteRate: 6.0,
      concurrentCalls: 5,
      // Communication
      smsPerMonth: 1000,
      whatsappPerMonth: 2000,
      emailsPerMonth: 5000,
      // Feature flags
      hasWhatsApp: true,
      hasTelecallerQueue: true,
      hasSocialMediaAds: true,
      hasLeadScoring: true,
      hasWebhooks: true,
      hasApiAccess: true,
      hasSso: false,
      hasWhiteLabeling: false,
      hasEmailCampaigns: true,
      hasIvrBuilder: true,
      hasCallQueues: true,
      hasCallRecording: true,
      hasCallSummary: true,
      hasMultilingual: true,
      supportLevel: 'priority',
    },
    addOnPricing: {
      extraPhoneNumber: 399,
      extraVoiceAgent: 99,
      extraUser: 199,
    },
  },
  business: {
    id: 'business',
    name: 'Business',
    monthlyPrice: 14999,
    annualPrice: 11999 * 12, // ₹1,43,988 annually (20% off)
    features: {
      maxLeads: 25000,
      maxUsers: 50,
      maxForms: -1,
      maxLandingPages: 20,
      // Voice AI Features
      maxPhoneNumbers: 10,
      maxVoiceAgents: 50,
      voiceMinutesIncluded: 2000,
      extraMinuteRate: 5.0,
      concurrentCalls: 25,
      // Communication
      smsPerMonth: 5000,
      whatsappPerMonth: 10000,
      emailsPerMonth: 25000,
      // Feature flags
      hasWhatsApp: true,
      hasTelecallerQueue: true,
      hasSocialMediaAds: true,
      hasLeadScoring: true,
      hasWebhooks: true,
      hasApiAccess: true,
      hasSso: true,
      hasWhiteLabeling: false,
      hasEmailCampaigns: true,
      hasIvrBuilder: true,
      hasCallQueues: true,
      hasCallRecording: true,
      hasCallSummary: true,
      hasMultilingual: true,
      hasSipTrunking: true,
      supportLevel: 'dedicated',
    },
    addOnPricing: {
      extraPhoneNumber: 299,
      extraVoiceAgent: 79,
      extraUser: 149,
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 0,
    annualPrice: 0,
    customPricing: true,
    features: {
      maxLeads: -1,
      maxUsers: -1,
      maxForms: -1,
      maxLandingPages: -1,
      // Voice AI Features
      maxPhoneNumbers: -1,
      maxVoiceAgents: -1,
      voiceMinutesIncluded: -1,
      extraMinuteRate: 4.0,
      concurrentCalls: -1,
      // Communication
      smsPerMonth: -1,
      whatsappPerMonth: -1,
      emailsPerMonth: -1,
      // Feature flags
      hasWhatsApp: true,
      hasTelecallerQueue: true,
      hasSocialMediaAds: true,
      hasLeadScoring: true,
      hasWebhooks: true,
      hasApiAccess: true,
      hasSso: true,
      hasWhiteLabeling: true,
      hasEmailCampaigns: true,
      hasIvrBuilder: true,
      hasCallQueues: true,
      hasCallRecording: true,
      hasCallSummary: true,
      hasMultilingual: true,
      hasSipTrunking: true,
      hasAgentSdk: true,
      supportLevel: 'dedicated_account_manager',
    },
    addOnPricing: {
      extraPhoneNumber: 199,
      extraVoiceAgent: 49,
      extraUser: 99,
    },
  },
};

// Add-on pricing (per unit) - Balanced Pricing (2026)
export const ADD_ONS = {
  voiceMinutes: { // per minute - matches plan extra rates
    free: 10,
    starter: 8,
    pro: 6,
    business: 5,
    enterprise: 4,
  },
  aiCalls: { // alias for voiceMinutes (legacy support)
    free: 10,
    starter: 8,
    pro: 6,
    business: 5,
    enterprise: 4,
  },
  sms: { // per message
    free: 0.50,
    starter: 0.40,
    pro: 0.35,
    business: 0.30,
    enterprise: 0.25,
  },
  whatsapp: { // per message (marketing)
    free: 1.50,
    starter: 1.20,
    pro: 1.00,
    business: 0.80,
    enterprise: 0.60,
  },
  storage: { // per GB
    free: 100,
    starter: 75,
    pro: 50,
    business: 35,
    enterprise: 20,
  },
  leads: { // per 1000 leads
    free: 800,
    starter: 600,
    pro: 500,
    business: 400,
    enterprise: 300,
  },
  users: { // per additional user per month
    free: 0, // cannot add
    starter: 299,
    pro: 199,
    business: 149,
    enterprise: 99,
  },
  phoneNumbers: { // per number per month
    free: 0,
    starter: 499,
    pro: 399,
    business: 299,
    enterprise: 199,
  },
  voiceAgents: { // per agent per month
    free: 0,
    starter: 149,
    pro: 99,
    business: 79,
    enterprise: 49,
  },
};

class SubscriptionService {
  // Create Razorpay subscription
  async createSubscription(
    organizationId: string,
    planId: string,
    billingCycle: 'monthly' | 'annual',
    userCount: number
  ) {
    const plan = PLANS[planId as keyof typeof PLANS];
    if (!plan) {
      throw new AppError('Invalid plan', 400);
    }

    // Check if Razorpay is configured
    if (!razorpay) {
      throw new AppError('Payment gateway not configured', 503);
    }

    // Calculate amount
    const pricePerUser = billingCycle === 'annual'
      ? plan.annualPrice / 12
      : plan.monthlyPrice;
    const totalAmount = pricePerUser * userCount * 100; // In paise

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: totalAmount,
      currency: 'INR',
      receipt: `sub_${organizationId}_${Date.now()}`,
      notes: {
        organizationId,
        planId,
        billingCycle,
        userCount: userCount.toString(),
      },
    });

    // Store pending subscription
    const subscription = await prisma.subscription.create({
      data: {
        organizationId,
        planId,
        billingCycle,
        userCount,
        status: 'PENDING',
        razorpayOrderId: order.id,
        amount: totalAmount / 100,
        currency: 'INR',
        currentPeriodStart: new Date(),
        currentPeriodEnd: this.calculatePeriodEnd(billingCycle),
      },
    });

    return {
      subscription,
      razorpayOrder: order,
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  }

  // Verify Razorpay payment
  async verifyPayment(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ) {
    // Verify signature
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      throw new AppError('Invalid payment signature', 400);
    }

    // Update subscription status
    const subscription = await prisma.subscription.update({
      where: { razorpayOrderId },
      data: {
        status: 'ACTIVE',
        razorpayPaymentId,
        razorpaySignature,
        activatedAt: new Date(),
      },
    });

    // Update organization's active plan
    await prisma.organization.update({
      where: { id: subscription.organizationId },
      data: {
        activePlanId: subscription.planId,
        subscriptionStatus: 'ACTIVE',
      },
    });

    // Reset usage counters for new billing period
    await this.resetUsageCounters(subscription.organizationId);

    return subscription;
  }

  // Get current subscription
  async getSubscription(organizationId: string) {
    // First check for active subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        organizationId,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    const usage = await this.getUsage(organizationId);

    if (!subscription) {
      // Check organization's active plan (set during registration)
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { activePlanId: true },
      });

      const planId = organization?.activePlanId || 'free';
      const plan = PLANS[planId as keyof typeof PLANS] || PLANS.free;

      // Return virtual free plan subscription
      return {
        id: `free_${organizationId}`,
        organizationId,
        planId: plan.id,
        billingCycle: 'monthly' as const,
        userCount: 1,
        status: 'ACTIVE',
        amount: 0,
        currency: 'INR',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
        plan,
        usage,
      };
    }

    const plan = PLANS[subscription.planId as keyof typeof PLANS];

    return {
      ...subscription,
      plan,
      usage,
    };
  }

  // Get usage statistics
  async getUsage(organizationId: string) {
    const usage = await prisma.usageTracking.findFirst({
      where: {
        organizationId,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
      },
    });

    if (!usage) {
      return {
        leadsCount: 0,
        usersCount: 0,
        aiCallsCount: 0,
        smsCount: 0,
        emailsCount: 0,
        whatsappCount: 0,
        storageUsedMb: 0,
      };
    }

    return usage;
  }

  // Track usage
  async trackUsage(
    organizationId: string,
    type: 'leads' | 'aiCalls' | 'sms' | 'emails' | 'whatsapp' | 'storage',
    amount: number = 1
  ) {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();

    // Get or create usage record
    let usage = await prisma.usageTracking.findFirst({
      where: { organizationId, month, year },
    });

    if (!usage) {
      usage = await prisma.usageTracking.create({
        data: {
          organizationId,
          month,
          year,
          leadsCount: 0,
          usersCount: 0,
          aiCallsCount: 0,
          smsCount: 0,
          emailsCount: 0,
          whatsappCount: 0,
          storageUsedMb: 0,
        },
      });
    }

    // Update the specific counter
    const updateData: any = {};
    switch (type) {
      case 'leads':
        updateData.leadsCount = { increment: amount };
        break;
      case 'aiCalls':
        updateData.aiCallsCount = { increment: amount };
        break;
      case 'sms':
        updateData.smsCount = { increment: amount };
        break;
      case 'emails':
        updateData.emailsCount = { increment: amount };
        break;
      case 'whatsapp':
        updateData.whatsappCount = { increment: amount };
        break;
      case 'storage':
        updateData.storageUsedMb = { increment: amount };
        break;
    }

    await prisma.usageTracking.update({
      where: { id: usage.id },
      data: updateData,
    });

    // Check if limit exceeded
    await this.checkUsageLimits(organizationId, type);
  }

  // Check usage limits
  async checkUsageLimits(organizationId: string, type: string) {
    const subscription = await this.getSubscription(organizationId);
    if (!subscription) return;

    const usage = subscription.usage;
    const limits = subscription.plan.features;

    let exceeded = false;
    let message = '';

    switch (type) {
      case 'leads':
        if (limits.maxLeads !== -1 && usage.leadsCount >= limits.maxLeads) {
          exceeded = true;
          message = `Lead limit (${limits.maxLeads}) reached`;
        }
        break;
      case 'aiCalls':
        if (limits.aiCallsPerMonth !== -1 && usage.aiCallsCount >= limits.aiCallsPerMonth) {
          exceeded = true;
          message = `AI calls limit (${limits.aiCallsPerMonth}/month) reached`;
        }
        break;
      case 'sms':
        if (limits.smsPerMonth !== -1 && usage.smsCount >= limits.smsPerMonth) {
          exceeded = true;
          message = `SMS limit (${limits.smsPerMonth}/month) reached`;
        }
        break;
      case 'emails':
        if (limits.emailsPerMonth !== -1 && usage.emailsCount >= limits.emailsPerMonth) {
          exceeded = true;
          message = `Email limit (${limits.emailsPerMonth}/month) reached`;
        }
        break;
    }

    if (exceeded) {
      // Log the limit exceeded event
      await prisma.usageLimitEvent.create({
        data: {
          organizationId,
          type,
          message,
          occurredAt: new Date(),
        },
      });

      // Could trigger notification here
    }

    return { exceeded, message };
  }

  // Upgrade plan
  async upgradePlan(
    organizationId: string,
    newPlanId: string,
    billingCycle: 'monthly' | 'annual'
  ) {
    const currentSubscription = await this.getSubscription(organizationId);

    // Calculate prorated amount if upgrading mid-cycle
    let proratedCredit = 0;
    if (currentSubscription && currentSubscription.status === 'ACTIVE') {
      const daysRemaining = this.getDaysRemaining(currentSubscription.currentPeriodEnd);
      const dailyRate = currentSubscription.amount / 30;
      proratedCredit = Math.round(daysRemaining * dailyRate);
    }

    // Get new plan pricing
    const newPlan = PLANS[newPlanId as keyof typeof PLANS];
    if (!newPlan) {
      throw new AppError('Invalid plan', 400);
    }

    const userCount = currentSubscription?.userCount || 1;
    const newAmount = billingCycle === 'annual'
      ? newPlan.annualPrice * userCount
      : newPlan.monthlyPrice * userCount;

    // Apply prorated credit
    const finalAmount = Math.max(0, newAmount - proratedCredit);

    // Check if Razorpay is configured
    if (!razorpay) {
      throw new AppError('Payment gateway not configured', 503);
    }

    // Create new order
    const order = await razorpay.orders.create({
      amount: finalAmount * 100, // In paise
      currency: 'INR',
      receipt: `upgrade_${organizationId}_${Date.now()}`,
      notes: {
        organizationId,
        planId: newPlanId,
        billingCycle,
        upgradeFrom: currentSubscription?.planId || 'none',
        proratedCredit: proratedCredit.toString(),
      },
    });

    return {
      order,
      proratedCredit,
      newAmount,
      finalAmount,
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  }

  // Downgrade plan
  async downgradePlan(organizationId: string, newPlanId: string) {
    const currentSubscription = await this.getSubscription(organizationId);
    if (!currentSubscription) {
      throw new AppError('No active subscription', 400);
    }

    // Schedule downgrade for next billing cycle
    await prisma.subscription.update({
      where: { id: currentSubscription.id },
      data: {
        scheduledPlanChange: newPlanId,
        scheduledChangeDate: currentSubscription.currentPeriodEnd,
      },
    });

    return {
      message: 'Downgrade scheduled',
      effectiveDate: currentSubscription.currentPeriodEnd,
      newPlan: PLANS[newPlanId as keyof typeof PLANS],
    };
  }

  // Cancel subscription
  async cancelSubscription(organizationId: string, reason?: string) {
    const subscription = await prisma.subscription.findFirst({
      where: { organizationId, status: 'ACTIVE' },
    });

    if (!subscription) {
      throw new AppError('No active subscription', 400);
    }

    // Don't immediately cancel - let them use until period ends
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelledAt: new Date(),
        cancelReason: reason,
        status: 'CANCELLED',
      },
    });

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        subscriptionStatus: 'CANCELLED',
      },
    });

    return {
      message: 'Subscription cancelled',
      accessUntil: subscription.currentPeriodEnd,
    };
  }

  // Reactivate subscription
  async reactivateSubscription(organizationId: string) {
    const subscription = await prisma.subscription.findFirst({
      where: { organizationId, status: 'CANCELLED' },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new AppError('No cancelled subscription found', 400);
    }

    // Check if still within grace period
    if (new Date() > subscription.currentPeriodEnd) {
      throw new AppError('Grace period expired. Please create a new subscription.', 400);
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'ACTIVE',
        cancelledAt: null,
        cancelReason: null,
      },
    });

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        subscriptionStatus: 'ACTIVE',
      },
    });

    return { message: 'Subscription reactivated' };
  }

  // Get billing history
  async getBillingHistory(organizationId: string) {
    const payments = await prisma.subscription.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        planId: true,
        amount: true,
        currency: true,
        status: true,
        billingCycle: true,
        createdAt: true,
        activatedAt: true,
        razorpayPaymentId: true,
      },
    });

    return payments.map(p => ({
      ...p,
      planName: PLANS[p.planId as keyof typeof PLANS]?.name || p.planId,
    }));
  }

  // Generate invoice
  async generateInvoice(subscriptionId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { organization: true },
    });

    if (!subscription) {
      throw new AppError('Subscription not found', 404);
    }

    const plan = PLANS[subscription.planId as keyof typeof PLANS];
    const gstAmount = subscription.amount * 0.18;
    const totalAmount = subscription.amount + gstAmount;

    const invoice = {
      invoiceNumber: `INV-${Date.now()}`,
      date: subscription.activatedAt || subscription.createdAt,
      organization: subscription.organization,
      plan: plan.name,
      billingCycle: subscription.billingCycle,
      userCount: subscription.userCount,
      subtotal: subscription.amount,
      gst: gstAmount,
      total: totalAmount,
      currency: 'INR',
      paymentId: subscription.razorpayPaymentId,
    };

    return invoice;
  }

  // Add users to subscription
  async addUsers(organizationId: string, additionalUsers: number) {
    const subscription = await this.getSubscription(organizationId);
    if (!subscription) {
      throw new AppError('No active subscription', 400);
    }

    const plan = subscription.plan;
    if (plan.features.maxUsers !== -1 &&
        subscription.userCount + additionalUsers > plan.features.maxUsers) {
      throw new AppError(`Plan allows maximum ${plan.features.maxUsers} users`, 400);
    }

    // Check if Razorpay is configured
    if (!razorpay) {
      throw new AppError('Payment gateway not configured', 503);
    }

    // Calculate prorated amount for additional users
    const daysRemaining = this.getDaysRemaining(subscription.currentPeriodEnd);
    const dailyRate = subscription.billingCycle === 'annual'
      ? (plan.annualPrice / 365)
      : (plan.monthlyPrice / 30);
    const proratedAmount = Math.round(dailyRate * daysRemaining * additionalUsers);

    // Create order for additional users
    const order = await razorpay.orders.create({
      amount: proratedAmount * 100,
      currency: 'INR',
      receipt: `addusers_${organizationId}_${Date.now()}`,
      notes: {
        organizationId,
        type: 'add_users',
        additionalUsers: additionalUsers.toString(),
      },
    });

    return {
      order,
      additionalUsers,
      proratedAmount,
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  }

  // Purchase add-on (credits/minutes/numbers)
  async purchaseAddOn(
    organizationId: string,
    addOnType: 'voiceMinutes' | 'aiCalls' | 'sms' | 'whatsapp' | 'storage' | 'leads' | 'phoneNumbers' | 'voiceAgents' | 'users',
    quantity: number
  ) {
    const subscription = await this.getSubscription(organizationId);
    if (!subscription) {
      throw new AppError('No active subscription', 400);
    }

    // Check if Razorpay is configured
    if (!razorpay) {
      throw new AppError('Payment gateway not configured', 503);
    }

    const planId = subscription.planId as keyof typeof ADD_ONS.aiCalls;
    const pricePerUnit = ADD_ONS[addOnType][planId];
    const totalAmount = Math.round(pricePerUnit * quantity * 100); // In paise

    const order = await razorpay.orders.create({
      amount: totalAmount,
      currency: 'INR',
      receipt: `addon_${addOnType}_${organizationId}_${Date.now()}`,
      notes: {
        organizationId,
        type: 'add_on',
        addOnType,
        quantity: quantity.toString(),
      },
    });

    return {
      order,
      addOnType,
      quantity,
      pricePerUnit,
      totalAmount: totalAmount / 100,
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  }

  // Verify and apply add-on
  async verifyAddOnPayment(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ) {
    // Verify signature
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      throw new AppError('Invalid payment signature', 400);
    }

    // Check if Razorpay is configured
    if (!razorpay) {
      throw new AppError('Payment gateway not configured', 503);
    }

    // Get order details from Razorpay
    const order = await razorpay.orders.fetch(razorpayOrderId);
    const notes = order.notes as any;

    if (notes.type === 'add_on') {
      // Add the purchased quantity to available balance
      await prisma.addOnBalance.upsert({
        where: {
          organizationId_type: {
            organizationId: notes.organizationId,
            type: notes.addOnType,
          },
        },
        update: {
          balance: { increment: parseInt(notes.quantity) },
        },
        create: {
          organizationId: notes.organizationId,
          type: notes.addOnType,
          balance: parseInt(notes.quantity),
        },
      });
    } else if (notes.type === 'add_users') {
      // Update user count on subscription
      await prisma.subscription.updateMany({
        where: {
          organizationId: notes.organizationId,
          status: 'ACTIVE',
        },
        data: {
          userCount: { increment: parseInt(notes.additionalUsers) },
        },
      });
    }

    return { success: true };
  }

  // Check phone number limit
  async checkPhoneNumberLimit(organizationId: string): Promise<{ allowed: boolean; current: number; limit: number; reason?: string }> {
    const subscription = await this.getSubscription(organizationId);
    const limit = subscription?.plan?.features?.maxPhoneNumbers ?? 0;

    const currentCount = await prisma.phoneNumber.count({
      where: { organizationId, status: { not: 'DISABLED' } },
    });

    if (limit !== -1 && currentCount >= limit) {
      return {
        allowed: false,
        current: currentCount,
        limit,
        reason: `Phone number limit (${limit}) reached. Please upgrade your plan.`,
      };
    }

    return { allowed: true, current: currentCount, limit };
  }

  // Check voice agent limit
  async checkVoiceAgentLimit(organizationId: string): Promise<{ allowed: boolean; current: number; limit: number; reason?: string }> {
    const subscription = await this.getSubscription(organizationId);
    const limit = subscription?.plan?.features?.maxVoiceAgents ?? 0;

    const currentCount = await prisma.voiceAgent.count({
      where: { organizationId, isActive: true },
    });

    if (limit !== -1 && currentCount >= limit) {
      return {
        allowed: false,
        current: currentCount,
        limit,
        reason: `Voice agent limit (${limit}) reached. Please upgrade your plan.`,
      };
    }

    return { allowed: true, current: currentCount, limit };
  }

  // Get plan limits summary for organization
  async getPlanLimits(organizationId: string) {
    const subscription = await this.getSubscription(organizationId);
    const plan = subscription?.plan;

    if (!plan) {
      return null;
    }

    // Get current counts
    const [phoneNumberCount, voiceAgentCount, userCount, leadCount] = await Promise.all([
      prisma.phoneNumber.count({ where: { organizationId, status: { not: 'DISABLED' } } }),
      prisma.voiceAgent.count({ where: { organizationId, isActive: true } }),
      prisma.user.count({ where: { organizationId, isActive: true } }),
      prisma.lead.count({ where: { organizationId } }),
    ]);

    // Get voice minutes usage from organization
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { voiceMinutesUsed: true, voiceMinutesLimit: true },
    });

    const voiceMinutesLimit = org?.voiceMinutesLimit ?? plan.features.voiceMinutesIncluded;
    const voiceMinutesUsed = org?.voiceMinutesUsed ?? 0;

    return {
      plan: {
        id: plan.id,
        name: plan.name,
        monthlyPrice: plan.monthlyPrice,
      },
      limits: {
        phoneNumbers: { used: phoneNumberCount, limit: plan.features.maxPhoneNumbers },
        voiceAgents: { used: voiceAgentCount, limit: plan.features.maxVoiceAgents },
        voiceMinutes: {
          used: Math.round(voiceMinutesUsed),
          limit: voiceMinutesLimit,
          extraRate: plan.features.extraMinuteRate,
        },
        users: { used: userCount, limit: plan.features.maxUsers },
        leads: { used: leadCount, limit: plan.features.maxLeads },
      },
      features: plan.features,
      addOnPricing: (plan as any).addOnPricing || null,
    };
  }

  // Get all available plans
  async getAvailablePlans() {
    // First try to get from database
    const dbPlans = await prisma.planDefinition.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    if (dbPlans.length > 0) {
      return dbPlans.map(plan => ({
        id: plan.slug,
        name: plan.name,
        description: plan.description,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        features: {
          maxUsers: plan.maxUsers,
          maxLeads: plan.maxLeads,
          maxPhoneNumbers: plan.maxPhoneNumbers,
          maxVoiceAgents: plan.maxVoiceAgents,
          voiceMinutesIncluded: plan.voiceMinutesIncluded,
          extraMinuteRate: plan.extraMinuteRate,
          maxSMS: plan.maxSMS,
          maxEmails: plan.maxEmails,
          maxWhatsapp: plan.maxWhatsapp,
          features: plan.features,
        },
        addOnPricing: {
          extraPhoneNumber: plan.extraPhoneNumberRate,
          extraVoiceAgent: plan.extraAgentRate,
          extraUser: plan.extraUserRate,
        },
        isPopular: plan.isPopular,
      }));
    }

    // Fallback to static plans
    return Object.values(PLANS).map(plan => ({
      ...plan,
      yearlyPrice: plan.annualPrice,
    }));
  }

  // Helper methods
  private calculatePeriodEnd(billingCycle: 'monthly' | 'annual'): Date {
    const now = new Date();
    if (billingCycle === 'annual') {
      return new Date(now.setFullYear(now.getFullYear() + 1));
    }
    return new Date(now.setMonth(now.getMonth() + 1));
  }

  private getDaysRemaining(endDate: Date): number {
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  private async resetUsageCounters(organizationId: string) {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();

    await prisma.usageTracking.upsert({
      where: {
        organizationId_month_year: {
          organizationId,
          month,
          year,
        },
      },
      update: {
        aiCallsCount: 0,
        smsCount: 0,
        emailsCount: 0,
        whatsappCount: 0,
      },
      create: {
        organizationId,
        month,
        year,
        leadsCount: 0,
        usersCount: 0,
        aiCallsCount: 0,
        smsCount: 0,
        emailsCount: 0,
        whatsappCount: 0,
        storageUsedMb: 0,
      },
    });
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;
