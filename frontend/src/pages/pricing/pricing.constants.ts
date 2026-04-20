/**
 * Pricing Page Constants
 * MyLeadX - AI Voice CRM Platform
 */

import {
  SparklesIcon,
  ChartBarIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  RocketLaunchIcon,
  ChatBubbleLeftRightIcon,
  DevicePhoneMobileIcon,
  ClockIcon,
  PhoneArrowUpRightIcon,
} from '@heroicons/react/24/outline';
import { Plan, SimplePlanFeature, FAQItem, TrustBadge, AddOn, FeatureCategory, WalletRate, PlanCategory } from './pricing.types';

// CRM Only Plans
export const CRM_ONLY_PLANS: Plan[] = [
  {
    id: 'crm-starter',
    name: 'Starter',
    subtitle: 'For small teams getting started',
    monthlyPrice: 2499,
    annualPrice: 1999,
    popular: false,
    icon: SparklesIcon,
    color: 'from-blue-500 to-blue-600',
    lightColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    category: 'crm-only',
    metrics: {
      minutes: '-',
      numbers: '-',
      agents: '-',
      users: '5',
      leads: '1,000',
    },
    features: [
      'Full CRM with Pipeline',
      'Lead & Contact Management',
      'WhatsApp Integration (Wallet)',
      'SMS Integration (Wallet)',
      'Basic Reports & Dashboard',
      'Email Support',
    ],
    extraRate: 0,
  },
  {
    id: 'crm-professional',
    name: 'Professional',
    subtitle: 'For growing sales teams',
    monthlyPrice: 4999,
    annualPrice: 3999,
    popular: true,
    icon: ChartBarIcon,
    color: 'from-primary-500 to-primary-600',
    lightColor: 'bg-primary-50',
    textColor: 'text-primary-600',
    category: 'crm-only',
    metrics: {
      minutes: '-',
      numbers: '-',
      agents: '-',
      users: '10',
      leads: '5,000',
    },
    features: [
      'Everything in Starter',
      'Custom Roles & Permissions',
      'Team Hierarchy',
      'Facebook & Google Ads Integration',
      'Advanced Analytics',
      'Chat + Email Support',
    ],
    extraRate: 0,
  },
  {
    id: 'crm-business',
    name: 'Business',
    subtitle: 'For scaling organizations',
    monthlyPrice: 15999,
    annualPrice: 12999,
    popular: false,
    icon: BuildingOfficeIcon,
    color: 'from-purple-500 to-purple-600',
    lightColor: 'bg-purple-50',
    textColor: 'text-purple-600',
    category: 'crm-only',
    metrics: {
      minutes: '-',
      numbers: '-',
      agents: '-',
      users: '30',
      leads: 'Unlimited',
    },
    features: [
      'Everything in Professional',
      'Multi-Branch Support',
      'Workflow Automation',
      'Commission Management',
      'API Access',
      'Dedicated Account Manager',
    ],
    extraRate: 0,
  },
];

// CRM + AI Voice Plans (Most Popular)
// Pricing optimized for 60%+ gross margin
export const CRM_AI_VOICE_PLANS: Plan[] = [
  {
    id: 'growth',
    name: 'Growth',
    subtitle: 'CRM + AI Voice for growing teams',
    monthlyPrice: 9999,
    annualPrice: 7999,
    popular: false,
    icon: RocketLaunchIcon,
    color: 'from-emerald-500 to-emerald-600',
    lightColor: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    category: 'crm-ai-voice',
    metrics: {
      minutes: '500',
      numbers: '2',
      agents: '2',
      users: '15',
      leads: '10,000',
    },
    features: [
      'Full CRM Features',
      'English + Hindi Support',
      'Click-to-Call & Auto Dialer',
      'Call Recording & Transcription',
      'WhatsApp & SMS (from Wallet)',
      'Basic Analytics',
    ],
    extraRate: 12,
  },
  {
    id: 'scale',
    name: 'Scale',
    subtitle: 'For high-volume sales operations',
    monthlyPrice: 24999,
    annualPrice: 19999,
    popular: true,
    icon: ChartBarIcon,
    color: 'from-primary-500 to-primary-600',
    lightColor: 'bg-primary-50',
    textColor: 'text-primary-600',
    category: 'crm-ai-voice',
    metrics: {
      minutes: '1,500',
      numbers: '5',
      agents: '5',
      users: '50',
      leads: '50,000',
    },
    features: [
      'Everything in Growth',
      '10+ Indian Languages',
      'IVR Builder & Call Routing',
      'Advanced Analytics',
      'Custom Roles & Permissions',
      'Priority Support',
    ],
    extraRate: 10,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    subtitle: 'Custom solution for large teams',
    monthlyPrice: 74999,
    annualPrice: 59999,
    popular: false,
    icon: ShieldCheckIcon,
    color: 'from-slate-700 to-slate-800',
    lightColor: 'bg-slate-100',
    textColor: 'text-slate-700',
    category: 'crm-ai-voice',
    metrics: {
      minutes: '3,500',
      numbers: '15',
      agents: 'Unlimited',
      users: '100',
      leads: 'Unlimited',
    },
    features: [
      'Everything in Scale',
      'Custom Voice Cloning',
      'White Label Option',
      'SLA 99.95% Uptime',
      'Dedicated Account Manager',
      'On-premise Option',
    ],
    extraRate: 8,
  },
];

// Combined plans for display (default to CRM + AI Voice)
export const PLANS: Plan[] = CRM_AI_VOICE_PLANS;

// Wallet-based usage rates
export const WALLET_RATES: WalletRate[] = [
  {
    id: 'whatsapp-marketing',
    name: 'WhatsApp Marketing',
    description: 'Promotional & marketing messages',
    rate: 1.20,
    unit: 'per message',
    icon: ChatBubbleLeftRightIcon,
  },
  {
    id: 'whatsapp-utility',
    name: 'WhatsApp Utility',
    description: 'Transactional & service messages',
    rate: 0.20,
    unit: 'per message',
    icon: ChatBubbleLeftRightIcon,
  },
  {
    id: 'sms',
    name: 'SMS',
    description: 'DLT compliant SMS messages',
    rate: 0.30,
    unit: 'per SMS',
    icon: DevicePhoneMobileIcon,
  },
  {
    id: 'extra-ai-minutes',
    name: 'Extra AI Minutes',
    description: 'Additional AI voice call minutes',
    rate: 12,
    unit: 'per minute',
    icon: ClockIcon,
  },
  {
    id: 'manual-calls',
    name: 'Manual Calls',
    description: 'Human agent outbound calls',
    rate: 1.50,
    unit: 'per minute',
    icon: PhoneArrowUpRightIcon,
  },
];

// Comprehensive feature comparison organized by category
export const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    category: 'Usage & Limits',
    features: [
      { name: 'AI Voice Minutes/month', starter: '500', growth: '2,000', business: '5,000', enterprise: 'Unlimited' },
      { name: 'Phone Numbers', starter: '1', growth: '3', business: '10', enterprise: 'Unlimited' },
      { name: 'AI Voice Agents', starter: '3', growth: '10', business: '25', enterprise: 'Unlimited' },
      { name: 'Team Members', starter: '5', growth: '15', business: '50', enterprise: 'Unlimited' },
      { name: 'Lead Capacity', starter: '2,500', growth: '10,000', business: '50,000', enterprise: 'Unlimited' },
      { name: 'Concurrent Calls', starter: '2', growth: '10', business: '50', enterprise: 'Unlimited' },
      { name: 'WhatsApp Messages/month', starter: '1,000', growth: '5,000', business: '25,000', enterprise: 'Unlimited' },
      { name: 'SMS Credits/month', starter: '500', growth: '2,000', business: '10,000', enterprise: 'Unlimited' },
      { name: 'Extra Minute Rate', starter: '₹1.5', growth: '₹1.2', business: '₹1', enterprise: '₹0.8' },
    ],
  },
  {
    category: 'AI Voice Capabilities',
    features: [
      { name: 'AI Voice Agents', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Real-time Voice AI (OpenAI)', starter: true, growth: true, business: true, enterprise: true },
      { name: 'English & Hindi Support', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Indian Languages (10+)', starter: false, growth: true, business: true, enterprise: true },
      { name: 'AI4Bharat Integration', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Call Recording', starter: true, growth: true, business: true, enterprise: true },
      { name: 'AI Call Summary', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Real-time Transcription', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Sentiment Analysis', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Custom Voice Cloning (ElevenLabs)', starter: false, growth: false, business: true, enterprise: true },
      { name: 'Voice Mood Detection', starter: false, growth: false, business: true, enterprise: true },
      { name: 'Speaker Identification', starter: false, growth: false, business: true, enterprise: true },
    ],
  },
  {
    category: 'Call Management',
    features: [
      { name: 'Click-to-Call', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Auto Dialer', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Inbound Call Handling', starter: true, growth: true, business: true, enterprise: true },
      { name: 'IVR Builder', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Call Queue Management', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Call Transfer & Routing', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Voicemail System', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Call Monitoring (Listen/Whisper)', starter: false, growth: false, business: true, enterprise: true },
      { name: 'Call Flow Designer', starter: false, growth: false, business: true, enterprise: true },
      { name: 'Scheduled Calls', starter: false, growth: true, business: true, enterprise: true },
    ],
  },
  {
    category: 'CRM & Lead Management',
    features: [
      { name: 'Lead Management', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Deal Pipeline', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Contact Management', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Custom Stages & Statuses', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Follow-up Scheduling', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Task Management', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Notes & Activity Timeline', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Tags & Custom Fields', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Bulk Import (CSV/Excel)', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Lead Scoring (AI)', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Duplicate Detection', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Lead Assignment Rules', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Round Robin Distribution', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Workflow Automation', starter: false, growth: false, business: true, enterprise: true },
      { name: 'Approval Workflows', starter: false, growth: false, business: true, enterprise: true },
    ],
  },
  {
    category: 'Communication Channels',
    features: [
      { name: 'WhatsApp Integration', starter: true, growth: true, business: true, enterprise: true },
      { name: 'WhatsApp Templates', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Bulk WhatsApp', starter: false, growth: true, business: true, enterprise: true },
      { name: 'SMS Integration', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Bulk SMS (DLT Compliant)', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Email Integration', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Email Sequences', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Drip Campaigns', starter: false, growth: false, business: true, enterprise: true },
    ],
  },
  {
    category: 'Lead Source Integrations',
    features: [
      { name: 'Facebook Ads', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Google Ads', starter: false, growth: true, business: true, enterprise: true },
      { name: 'IndiaMART', starter: false, growth: true, business: true, enterprise: true },
      { name: 'JustDial', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Housing.com', starter: false, growth: true, business: true, enterprise: true },
      { name: '99acres', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Sulekha', starter: false, growth: true, business: true, enterprise: true },
      { name: 'TradeIndia', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Instagram Ads', starter: false, growth: true, business: true, enterprise: true },
      { name: 'LinkedIn Ads', starter: false, growth: false, business: true, enterprise: true },
      { name: 'Custom Webhooks', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Zapier Integration', starter: false, growth: false, business: true, enterprise: true },
    ],
  },
  {
    category: 'Campaigns & Automation',
    features: [
      { name: 'Campaign Management', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Campaign Limit', starter: '3', growth: '20', business: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'Auto Follow-ups', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Scheduled Messaging', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Lead Source Tracking', starter: true, growth: true, business: true, enterprise: true },
    ],
  },
  {
    category: 'Reports & Analytics',
    features: [
      { name: 'Dashboard Overview', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Call Reports', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Lead Reports', starter: true, growth: true, business: true, enterprise: true },
      { name: 'User Performance Reports', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Campaign Analytics', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Business Trends Dashboard', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Deal Velocity Report', starter: false, growth: true, business: true, enterprise: true },
      { name: 'AI Usage Reports', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Commission Reports', starter: false, growth: false, business: true, enterprise: true },
      { name: 'Custom Report Builder', starter: false, growth: false, business: true, enterprise: true },
      { name: 'Scheduled Report Emails', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Export (PDF/Excel)', starter: true, growth: true, business: true, enterprise: true },
    ],
  },
  {
    category: 'Team & Organization',
    features: [
      { name: 'Role-Based Access', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Custom Roles & Permissions', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Team Hierarchy', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Multi-Branch Support', starter: false, growth: false, business: true, enterprise: true },
      { name: 'Commission Management', starter: false, growth: false, business: true, enterprise: true },
      { name: 'Incentive Tracking', starter: false, growth: false, business: true, enterprise: true },
      { name: 'Break Time Management', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Login & Activity Tracking', starter: false, growth: true, business: true, enterprise: true },
    ],
  },
  {
    category: 'Industry Solutions',
    features: [
      { name: 'Sales CRM', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Education CRM (Admissions)', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Real Estate CRM', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Field Sales Management', starter: false, growth: false, business: true, enterprise: true },
      { name: 'Visit & Expense Tracking', starter: false, growth: false, business: true, enterprise: true },
    ],
  },
  {
    category: 'Payments & Billing',
    features: [
      { name: 'Razorpay Integration', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Payment Links', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Invoice Generation', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Payment Tracking', starter: false, growth: true, business: true, enterprise: true },
    ],
  },
  {
    category: 'Security & Compliance',
    features: [
      { name: 'Data Encryption (AES-256)', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Two-Factor Authentication', starter: true, growth: true, business: true, enterprise: true },
      { name: 'DNC List Compliance', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Consent Management', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Audit Logs', starter: false, growth: true, business: true, enterprise: true },
      { name: 'SSO (SAML/OAuth)', starter: false, growth: false, business: false, enterprise: true },
      { name: 'IP Whitelisting', starter: false, growth: false, business: false, enterprise: true },
      { name: 'Custom Data Retention', starter: false, growth: false, business: false, enterprise: true },
    ],
  },
  {
    category: 'Platform & API',
    features: [
      { name: 'REST API Access', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Webhooks', starter: false, growth: true, business: true, enterprise: true },
      { name: 'API Rate Limit', starter: '-', growth: '1000/hr', business: '5000/hr', enterprise: 'Unlimited' },
      { name: 'White Label', starter: false, growth: false, business: false, enterprise: true },
      { name: 'Custom Domain', starter: false, growth: false, business: false, enterprise: true },
      { name: 'On-Premise Option', starter: false, growth: false, business: false, enterprise: true },
    ],
  },
  {
    category: 'Support',
    features: [
      { name: 'Email Support', starter: true, growth: true, business: true, enterprise: true },
      { name: 'Chat Support', starter: false, growth: true, business: true, enterprise: true },
      { name: 'Phone Support', starter: false, growth: false, business: true, enterprise: true },
      { name: 'Dedicated Account Manager', starter: false, growth: false, business: true, enterprise: true },
      { name: 'Onboarding Training', starter: '1 session', growth: '3 sessions', business: '5 sessions', enterprise: 'Unlimited' },
      { name: 'Response Time SLA', starter: '48 hrs', growth: '24 hrs', business: '4 hrs', enterprise: '1 hr' },
      { name: 'Uptime SLA', starter: '99%', growth: '99.5%', business: '99.9%', enterprise: '99.99%' },
    ],
  },
];

// Flattened feature comparison for simple display
export const FEATURE_COMPARISON: SimplePlanFeature[] = FEATURE_CATEGORIES.flatMap(cat => cat.features);

// Add-ons for extra capacity
export const ADD_ONS: AddOn[] = [
  {
    id: 'extra-user',
    name: 'Extra User',
    description: 'Add one additional team member',
    price: 399,
    unit: 'per month',
    popular: false,
  },
  {
    id: 'extra-phone-number',
    name: 'Extra Phone Number',
    description: 'Add more phone numbers for campaigns',
    price: 599,
    unit: 'per month',
    popular: true,
  },
  {
    id: 'extra-storage',
    name: 'Extra Storage (10GB)',
    description: 'Additional storage for recordings & files',
    price: 199,
    unit: 'per month',
  },
  {
    id: 'voice-cloning',
    name: 'Voice Cloning',
    description: 'Create custom AI voice with ElevenLabs',
    price: 2999,
    unit: 'one-time setup',
    popular: true,
  },
  {
    id: 'indian-languages',
    name: 'Indian Languages Pack',
    description: 'AI4Bharat support for 10+ Indian languages',
    price: 1999,
    unit: 'per month',
  },
  {
    id: 'white-label',
    name: 'White Label',
    description: 'Your branding, custom domain (Enterprise only)',
    price: 9999,
    unit: 'per month',
  },
];

export const FAQ_ITEMS: FAQItem[] = [
  {
    q: 'What\'s the difference between CRM Only and CRM + AI Voice plans?',
    a: 'CRM Only plans give you full CRM features without AI voice calling. CRM + AI Voice plans include everything in CRM plus AI agents that can make and receive calls automatically. Choose CRM Only if you just need lead management, or CRM + AI Voice if you want automated calling.',
  },
  {
    q: 'How does the Wallet system work?',
    a: 'The Wallet is a prepaid balance for usage-based services like WhatsApp messages, SMS, and extra AI minutes. You can top up anytime. This way, you only pay for what you use beyond your plan limits.',
  },
  {
    q: 'What are AI Voice Minutes?',
    a: 'AI Voice Minutes are the time your AI agents spend on calls. This includes both inbound and outbound calls handled by AI. Human agent calls are billed separately from the wallet at ₹1.50/min.',
  },
  {
    q: 'Which Indian languages are supported?',
    a: 'English and Hindi are included in all AI Voice plans. Scale and Enterprise plans include 10+ Indian languages via AI4Bharat: Telugu, Tamil, Kannada, Malayalam, Bengali, Gujarati, Marathi, Punjabi, and Odia.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes! All plans include a 14-day free trial with full features. No credit card required. You get 50 free AI minutes and 100 free WhatsApp messages to test everything.',
  },
  {
    q: 'How does billing work?',
    a: 'Subscription is billed monthly or annually (20% discount). Wallet usage is deducted in real-time as you use WhatsApp, SMS, or extra AI minutes. All prices are in INR excluding GST (18%).',
  },
  {
    q: 'Can I change plans later?',
    a: 'Yes! Upgrade anytime and the difference is prorated. You can also switch between CRM Only and CRM + AI Voice plans. Downgrades take effect at the next billing cycle.',
  },
  {
    q: 'What happens if my wallet balance runs out?',
    a: 'You\'ll receive alerts at low balance. WhatsApp and SMS will pause until you top up, but AI calls within your plan limit continue working. You can enable auto-recharge to avoid interruptions.',
  },
  {
    q: 'Do you offer discounts?',
    a: 'Yes! Annual payment saves 20%. We also offer 30% off for startups (<2 years), 35% for educational institutions, and 40% for NGOs. Volume discounts available for 50+ users.',
  },
  {
    q: 'What support is included?',
    a: 'Starter/Growth: Email support. Professional/Scale: Chat + Email with 24hr response. Business/Enterprise: Phone support with dedicated account manager and 4-hour response SLA.',
  },
];

export const TRUST_BADGES: TrustBadge[] = [
  { value: '500+', label: 'Active Businesses' },
  { value: '2M+', label: 'AI Calls Handled' },
  { value: '10+', label: 'Indian Languages' },
  { value: '30+', label: 'Integrations' },
];

export const PLAN_TIERS = ['starter', 'growth', 'business', 'enterprise'] as const;

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}
