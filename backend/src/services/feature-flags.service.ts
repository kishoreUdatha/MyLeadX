import { prisma } from '../config/database';

/**
 * FEATURE FLAGS SERVICE
 *
 * Control feature availability per tenant:
 * - Enable/disable features per tenant
 * - Beta feature rollouts
 * - A/B testing controls
 * - Gradual rollouts
 */

interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  description: string;
  type: 'boolean' | 'percentage' | 'variant';
  defaultValue: boolean | number | string;
  isEnabled: boolean;
  rolloutPercentage: number;
  variants?: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface TenantFeatureOverride {
  organizationId: string;
  featureKey: string;
  value: boolean | number | string;
  reason?: string;
  expiresAt?: Date;
}

interface FeatureFlagStats {
  featureKey: string;
  enabledCount: number;
  disabledCount: number;
  customOverrides: number;
}

// Default platform features
const DEFAULT_FEATURES: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>[] = [
  // ==================== COMMUNICATION FEATURES ====================
  {
    id: 'voice-ai',
    name: 'Voice AI Agents',
    key: 'voice_ai',
    description: 'AI-powered voice calling agents',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'whatsapp-integration',
    name: 'WhatsApp Integration',
    key: 'whatsapp',
    description: 'WhatsApp Business API integration',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'sms-messaging',
    name: 'SMS Messaging',
    key: 'sms_messaging',
    description: 'Send SMS messages to leads and customers',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'email-campaigns',
    name: 'Email Campaigns',
    key: 'email_campaigns',
    description: 'Send email campaigns and automated emails',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'call-recording',
    name: 'Call Recording',
    key: 'call_recording',
    description: 'Record and store voice calls',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'multi-language',
    name: 'Multi-Language Support',
    key: 'multi_language',
    description: 'Support for multiple languages in voice and chat',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },

  // ==================== LEAD MANAGEMENT FEATURES ====================
  {
    id: 'lead-import-export',
    name: 'Lead Import/Export',
    key: 'lead_import_export',
    description: 'Import and export leads via CSV/Excel',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'ai-lead-scoring',
    name: 'AI Lead Scoring',
    key: 'ai_lead_scoring',
    description: 'Machine learning based lead scoring',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 30,
  },
  {
    id: 'lead-assignment',
    name: 'Auto Lead Assignment',
    key: 'lead_assignment',
    description: 'Automatic lead assignment to agents based on rules',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'lead-deduplication',
    name: 'Lead Deduplication',
    key: 'lead_deduplication',
    description: 'Automatic detection and merging of duplicate leads',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'custom-fields',
    name: 'Custom Fields',
    key: 'custom_fields',
    description: 'Create custom fields for leads and contacts',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'lead-stages',
    name: 'Custom Lead Stages',
    key: 'lead_stages',
    description: 'Create and customize lead pipeline stages',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },

  // ==================== AUTOMATION FEATURES ====================
  {
    id: 'custom-workflows',
    name: 'Custom Workflows',
    key: 'custom_workflows',
    description: 'Create custom automation workflows',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 20,
  },
  {
    id: 'follow-up-automation',
    name: 'Follow-up Automation',
    key: 'follow_up_automation',
    description: 'Automated follow-up reminders and tasks',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'appointment-reminders',
    name: 'Appointment Reminders',
    key: 'appointment_reminders',
    description: 'Automated appointment reminder notifications',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'scheduled-calls',
    name: 'Scheduled Calls',
    key: 'scheduled_calls',
    description: 'Schedule AI calls for future times',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },

  // ==================== TEAM & USER FEATURES ====================
  {
    id: 'team-management',
    name: 'Team Management',
    key: 'team_management',
    description: 'Manage teams, roles, and permissions',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'telecaller-app',
    name: 'Telecaller Mobile App',
    key: 'telecaller_app',
    description: 'Access to telecaller mobile application',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'user-activity-tracking',
    name: 'User Activity Tracking',
    key: 'user_activity_tracking',
    description: 'Track user login, actions, and productivity',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'work-sessions',
    name: 'Work Sessions',
    key: 'work_sessions',
    description: 'Track agent work sessions and breaks',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },

  // ==================== REPORTING & ANALYTICS ====================
  {
    id: 'advanced-analytics',
    name: 'Advanced Analytics',
    key: 'advanced_analytics',
    description: 'Advanced reporting and analytics dashboard',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 50,
  },
  {
    id: 'auto-reports',
    name: 'Automated Reports',
    key: 'auto_reports',
    description: 'Schedule and auto-generate reports',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'call-analytics',
    name: 'Call Analytics',
    key: 'call_analytics',
    description: 'Detailed call performance analytics',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'conversion-tracking',
    name: 'Conversion Tracking',
    key: 'conversion_tracking',
    description: 'Track lead to customer conversion metrics',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },

  // ==================== INTEGRATIONS ====================
  {
    id: 'api-access',
    name: 'API Access',
    key: 'api_access',
    description: 'Access to public API endpoints',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'webhook-integration',
    name: 'Webhooks',
    key: 'webhook_integration',
    description: 'Send and receive webhook events',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'facebook-leads',
    name: 'Facebook Lead Ads',
    key: 'facebook_leads',
    description: 'Import leads from Facebook Lead Ads',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'google-ads',
    name: 'Google Ads Integration',
    key: 'google_ads',
    description: 'Import leads from Google Ads',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'indiamart-integration',
    name: 'IndiaMART Integration',
    key: 'indiamart_integration',
    description: 'Import leads from IndiaMART',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },

  // ==================== BILLING & PAYMENTS ====================
  {
    id: 'payment-collection',
    name: 'Payment Collection',
    key: 'payment_collection',
    description: 'Collect payments via Razorpay',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'commission-tracking',
    name: 'Commission Tracking',
    key: 'commission_tracking',
    description: 'Track and manage sales commissions',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 50,
  },

  // ==================== ADVANCED FEATURES ====================
  {
    id: 'beta-features',
    name: 'Beta Features',
    key: 'beta_features',
    description: 'Access to beta/experimental features',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 10,
  },
  {
    id: 'ai-transcription',
    name: 'AI Transcription',
    key: 'ai_transcription',
    description: 'AI-powered call transcription',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'sentiment-analysis',
    name: 'Sentiment Analysis',
    key: 'sentiment_analysis',
    description: 'AI-powered sentiment analysis on calls',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 30,
  },
  {
    id: 'voice-cloning',
    name: 'Voice Cloning',
    key: 'voice_cloning',
    description: 'Custom AI voice cloning for agents',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 10,
  },
  {
    id: 'bulk-operations',
    name: 'Bulk Operations',
    key: 'bulk_operations',
    description: 'Bulk update, delete, and assign leads',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'data-export',
    name: 'Data Export',
    key: 'data_export',
    description: 'Export all organization data',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },

  // ==================== EDUCATION/ADMISSIONS ====================
  {
    id: 'admissions-module',
    name: 'Admissions Module',
    key: 'admissions_module',
    description: 'Student admissions and enrollment management',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'student-visits',
    name: 'Student Visits',
    key: 'student_visits',
    description: 'Track and manage student campus visits',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'scholarships',
    name: 'Scholarships',
    key: 'scholarships',
    description: 'Manage scholarship applications and approvals',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'courses-management',
    name: 'Courses Management',
    key: 'courses_management',
    description: 'Manage courses and programs',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },

  // ==================== REAL ESTATE ====================
  {
    id: 'realestate-module',
    name: 'Real Estate Module',
    key: 'realestate_module',
    description: 'Property and real estate CRM features',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },

  // ==================== CHATBOT & LIVE CHAT ====================
  {
    id: 'chatbot',
    name: 'AI Chatbot',
    key: 'chatbot',
    description: 'AI-powered chatbot for websites',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 50,
  },
  {
    id: 'live-chat',
    name: 'Live Chat',
    key: 'live_chat',
    description: 'Live chat widget for websites',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'unified-inbox',
    name: 'Unified Inbox',
    key: 'unified_inbox',
    description: 'Single inbox for all communication channels',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },

  // ==================== SOCIAL MEDIA INTEGRATIONS ====================
  {
    id: 'instagram-integration',
    name: 'Instagram Integration',
    key: 'instagram_integration',
    description: 'Instagram DM and lead capture',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 50,
  },
  {
    id: 'linkedin-integration',
    name: 'LinkedIn Integration',
    key: 'linkedin_integration',
    description: 'LinkedIn lead generation',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 30,
  },
  {
    id: 'twitter-integration',
    name: 'Twitter/X Integration',
    key: 'twitter_integration',
    description: 'Twitter/X social CRM',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 20,
  },
  {
    id: 'youtube-integration',
    name: 'YouTube Integration',
    key: 'youtube_integration',
    description: 'YouTube lead capture',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 20,
  },
  {
    id: 'tiktok-integration',
    name: 'TikTok Integration',
    key: 'tiktok_integration',
    description: 'TikTok lead generation',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 10,
  },

  // ==================== MARKETPLACE INTEGRATIONS ====================
  {
    id: 'justdial-integration',
    name: 'JustDial Integration',
    key: 'justdial_integration',
    description: 'Import leads from JustDial',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'sulekha-integration',
    name: 'Sulekha Integration',
    key: 'sulekha_integration',
    description: 'Import leads from Sulekha',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'apify-scraping',
    name: 'Web Scraping (Apify)',
    key: 'apify_scraping',
    description: 'Automated lead scraping via Apify',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 30,
  },

  // ==================== THIRD-PARTY INTEGRATIONS ====================
  {
    id: 'zapier-integration',
    name: 'Zapier Integration',
    key: 'zapier_integration',
    description: 'Connect with 5000+ apps via Zapier',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 50,
  },
  {
    id: 'tawkto-integration',
    name: 'Tawk.to Integration',
    key: 'tawkto_integration',
    description: 'Tawk.to live chat integration',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },

  // ==================== TELEPHONY PROVIDERS ====================
  {
    id: 'plivo-telephony',
    name: 'Plivo Telephony',
    key: 'plivo_telephony',
    description: 'Plivo voice and SMS services',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'exotel-telephony',
    name: 'Exotel Telephony',
    key: 'exotel_telephony',
    description: 'Exotel voice services',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'ivr-system',
    name: 'IVR System',
    key: 'ivr_system',
    description: 'Interactive Voice Response system',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'softphone',
    name: 'Browser Softphone',
    key: 'softphone',
    description: 'Make calls directly from browser',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'voicemail',
    name: 'Voicemail',
    key: 'voicemail',
    description: 'Voicemail recording and management',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },

  // ==================== SALES & DEALS ====================
  {
    id: 'deal-pipeline',
    name: 'Deal Pipeline',
    key: 'deal_pipeline',
    description: 'Visual deal/opportunity pipeline',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'quotations',
    name: 'Quotations',
    key: 'quotations',
    description: 'Create and send quotations',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'contracts',
    name: 'Contracts',
    key: 'contracts',
    description: 'Contract management',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 50,
  },
  {
    id: 'sales-forecasting',
    name: 'Sales Forecasting',
    key: 'sales_forecasting',
    description: 'AI-powered sales forecasting',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 30,
  },
  {
    id: 'sales-playbook',
    name: 'Sales Playbook',
    key: 'sales_playbook',
    description: 'Sales scripts and playbooks',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 50,
  },

  // ==================== GAMIFICATION & TARGETS ====================
  {
    id: 'gamification',
    name: 'Gamification',
    key: 'gamification',
    description: 'Leaderboards and achievements',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 50,
  },
  {
    id: 'performance-targets',
    name: 'Performance Targets',
    key: 'performance_targets',
    description: 'Set and track sales targets',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },

  // ==================== SERVICE & SUPPORT ====================
  {
    id: 'service-tickets',
    name: 'Service Tickets',
    key: 'service_tickets',
    description: 'Customer service ticket management',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 50,
  },
  {
    id: 'customer-portal',
    name: 'Customer Portal',
    key: 'customer_portal',
    description: 'Self-service customer portal',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 30,
  },
  {
    id: 'customer-health-score',
    name: 'Customer Health Score',
    key: 'customer_health_score',
    description: 'Track customer health and churn risk',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 30,
  },

  // ==================== WORKFLOW & APPROVALS ====================
  {
    id: 'approval-workflows',
    name: 'Approval Workflows',
    key: 'approval_workflows',
    description: 'Multi-level approval workflows',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 50,
  },
  {
    id: 'workflow-engine',
    name: 'Workflow Engine',
    key: 'workflow_engine',
    description: 'Advanced workflow automation engine',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 30,
  },

  // ==================== TERRITORIES & BRANCHES ====================
  {
    id: 'territories',
    name: 'Territory Management',
    key: 'territories',
    description: 'Geographic territory management',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 50,
  },
  {
    id: 'branches',
    name: 'Branch Management',
    key: 'branches',
    description: 'Multi-branch/location management',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },

  // ==================== QA & COMPLIANCE ====================
  {
    id: 'qa-reviews',
    name: 'QA Reviews',
    key: 'qa_reviews',
    description: 'Quality assurance call reviews',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 50,
  },
  {
    id: 'compliance-module',
    name: 'Compliance Module',
    key: 'compliance_module',
    description: 'DNC lists and compliance management',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'audit-logs',
    name: 'Audit Logs',
    key: 'audit_logs',
    description: 'Detailed activity audit logging',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },

  // ==================== ADVANCED AI ====================
  {
    id: 'predictive-analytics',
    name: 'Predictive Analytics',
    key: 'predictive_analytics',
    description: 'AI-powered predictive insights',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 20,
  },
  {
    id: 'conversational-ai',
    name: 'Conversational AI',
    key: 'conversational_ai',
    description: 'Advanced conversational AI agents',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 30,
  },
  {
    id: 'rag-knowledge-base',
    name: 'RAG Knowledge Base',
    key: 'rag_knowledge_base',
    description: 'AI knowledge base with RAG',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 20,
  },
  {
    id: 'data-enrichment',
    name: 'Data Enrichment',
    key: 'data_enrichment',
    description: 'Auto-enrich lead data from external sources',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 30,
  },

  // ==================== MEETINGS & CALENDAR ====================
  {
    id: 'video-meetings',
    name: 'Video Meetings',
    key: 'video_meetings',
    description: 'Built-in video meeting support',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 50,
  },
  {
    id: 'calendar-sync',
    name: 'Calendar Sync',
    key: 'calendar_sync',
    description: 'Sync with Google/Outlook calendar',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },

  // ==================== FORMS & LANDING PAGES ====================
  {
    id: 'web-forms',
    name: 'Web Forms',
    key: 'web_forms',
    description: 'Embeddable lead capture forms',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'landing-pages',
    name: 'Landing Pages',
    key: 'landing_pages',
    description: 'Create landing pages for campaigns',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 50,
  },

  // ==================== EMAIL ADVANCED ====================
  {
    id: 'email-sequences',
    name: 'Email Sequences',
    key: 'email_sequences',
    description: 'Automated email drip sequences',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 50,
  },
  {
    id: 'email-tracking',
    name: 'Email Tracking',
    key: 'email_tracking',
    description: 'Track email opens and clicks',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },

  // ==================== BRANDING ====================
  {
    id: 'white-label',
    name: 'White Label',
    key: 'white_label',
    description: 'Custom branding and white-labeling',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'custom-domain',
    name: 'Custom Domain',
    key: 'custom_domain',
    description: 'Use custom domain for the platform',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },

  // ==================== REPORTS ====================
  {
    id: 'report-builder',
    name: 'Report Builder',
    key: 'report_builder',
    description: 'Custom report builder',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 30,
  },
  {
    id: 'bi-export',
    name: 'BI Export',
    key: 'bi_export',
    description: 'Export data for BI tools',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 30,
  },

  // ==================== NOTIFICATIONS ====================
  {
    id: 'push-notifications',
    name: 'Push Notifications',
    key: 'push_notifications',
    description: 'Mobile and web push notifications',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'realtime-alerts',
    name: 'Real-time Alerts',
    key: 'realtime_alerts',
    description: 'Real-time activity alerts',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },

  // ==================== TEAM COLLABORATION ====================
  {
    id: 'team-messaging',
    name: 'Team Messaging',
    key: 'team_messaging',
    description: 'Internal team chat and messaging',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 50,
  },
  {
    id: 'mentions-comments',
    name: 'Mentions & Comments',
    key: 'mentions_comments',
    description: '@mentions and comments on leads',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },

  // ==================== GLOBAL SEARCH ====================
  {
    id: 'global-search',
    name: 'Global Search',
    key: 'global_search',
    description: 'Search across all modules',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },

  // ==================== SUBSCRIPTION & LIMITS ====================
  {
    id: 'sso-authentication',
    name: 'SSO Authentication',
    key: 'sso_authentication',
    description: 'Single Sign-On with SAML/OAuth',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'sip-trunking',
    name: 'SIP Trunking',
    key: 'sip_trunking',
    description: 'Connect your own SIP provider',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'agent-sdk',
    name: 'Agent SDK Access',
    key: 'agent_sdk',
    description: 'Access to Voice Agent SDK for custom integrations',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'unlimited-leads',
    name: 'Unlimited Leads',
    key: 'unlimited_leads',
    description: 'Remove lead count limits',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'unlimited-users',
    name: 'Unlimited Users',
    key: 'unlimited_users',
    description: 'Remove user count limits',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'unlimited-voice-minutes',
    name: 'Unlimited Voice Minutes',
    key: 'unlimited_voice_minutes',
    description: 'Remove voice minute limits',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'unlimited-sms',
    name: 'Unlimited SMS',
    key: 'unlimited_sms',
    description: 'Remove SMS count limits',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'unlimited-whatsapp',
    name: 'Unlimited WhatsApp',
    key: 'unlimited_whatsapp',
    description: 'Remove WhatsApp message limits',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'unlimited-emails',
    name: 'Unlimited Emails',
    key: 'unlimited_emails',
    description: 'Remove email count limits',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'unlimited-phone-numbers',
    name: 'Unlimited Phone Numbers',
    key: 'unlimited_phone_numbers',
    description: 'Remove phone number limits',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'unlimited-voice-agents',
    name: 'Unlimited Voice Agents',
    key: 'unlimited_voice_agents',
    description: 'Remove voice agent limits',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'unlimited-concurrent-calls',
    name: 'Unlimited Concurrent Calls',
    key: 'unlimited_concurrent_calls',
    description: 'Remove concurrent call limits',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'priority-support',
    name: 'Priority Support',
    key: 'priority_support',
    description: 'Priority customer support access',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'dedicated-account-manager',
    name: 'Dedicated Account Manager',
    key: 'dedicated_account_manager',
    description: 'Assigned dedicated account manager',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'custom-pricing',
    name: 'Custom Pricing',
    key: 'custom_pricing',
    description: 'Enable custom pricing for this tenant',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'trial-extension',
    name: 'Extended Trial',
    key: 'trial_extension',
    description: 'Extended trial period',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'grace-period',
    name: 'Payment Grace Period',
    key: 'grace_period',
    description: 'Extended payment grace period',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'invoice-billing',
    name: 'Invoice Billing',
    key: 'invoice_billing',
    description: 'Pay via invoice instead of card',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'usage-alerts',
    name: 'Usage Alerts',
    key: 'usage_alerts',
    description: 'Get alerts when nearing usage limits',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'overage-allowed',
    name: 'Allow Overage',
    key: 'overage_allowed',
    description: 'Allow usage beyond plan limits with charges',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },

  // ==================== SECURITY & COMPLIANCE ====================
  {
    id: 'two-factor-auth',
    name: 'Two-Factor Authentication',
    key: 'two_factor_auth',
    description: 'Enforce 2FA for all users',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'ip-whitelisting',
    name: 'IP Whitelisting',
    key: 'ip_whitelisting',
    description: 'Restrict access by IP address',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'session-timeout',
    name: 'Session Timeout',
    key: 'session_timeout',
    description: 'Auto logout after inactivity',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'gdpr-tools',
    name: 'GDPR Tools',
    key: 'gdpr_tools',
    description: 'GDPR compliance tools (data export, deletion)',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'data-retention-policy',
    name: 'Data Retention Policy',
    key: 'data_retention_policy',
    description: 'Custom data retention settings',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    id: 'field-encryption',
    name: 'Field-Level Encryption',
    key: 'field_encryption',
    description: 'Encrypt sensitive fields',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 30,
  },
];

export class FeatureFlagsService {
  private featureCache: Map<string, FeatureFlag> = new Map();

  constructor() {
    this.initializeFeatures();
  }

  private initializeFeatures() {
    const now = new Date();
    DEFAULT_FEATURES.forEach((f) => {
      this.featureCache.set(f.key, {
        ...f,
        createdAt: now,
        updatedAt: now,
      });
    });
  }

  /**
   * Get all feature flags
   */
  async getAllFeatureFlags(): Promise<FeatureFlag[]> {
    return Array.from(this.featureCache.values());
  }

  /**
   * Get a specific feature flag
   */
  async getFeatureFlag(key: string): Promise<FeatureFlag | null> {
    return this.featureCache.get(key) || null;
  }

  /**
   * Update a feature flag
   */
  async updateFeatureFlag(
    key: string,
    updates: Partial<Pick<FeatureFlag, 'isEnabled' | 'rolloutPercentage' | 'defaultValue'>>
  ): Promise<FeatureFlag> {
    const existing = this.featureCache.get(key);
    if (!existing) {
      throw new Error(`Feature flag '${key}' not found`);
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    this.featureCache.set(key, updated);
    return updated;
  }

  /**
   * Check if a feature is enabled for a tenant
   */
  async isFeatureEnabled(organizationId: string, featureKey: string): Promise<boolean> {
    const feature = this.featureCache.get(featureKey);
    if (!feature || !feature.isEnabled) {
      return false;
    }

    // Check for tenant-specific override
    const override = await this.getTenantOverride(organizationId, featureKey);
    if (override !== null) {
      return override as boolean;
    }

    // Check rollout percentage
    if (feature.rolloutPercentage < 100) {
      const hash = this.hashString(`${organizationId}-${featureKey}`);
      return hash % 100 < feature.rolloutPercentage;
    }

    return feature.defaultValue as boolean;
  }

  /**
   * Get all features for a tenant
   */
  async getTenantFeatures(organizationId: string): Promise<Record<string, boolean>> {
    const features: Record<string, boolean> = {};

    for (const [key] of this.featureCache) {
      features[key] = await this.isFeatureEnabled(organizationId, key);
    }

    return features;
  }

  /**
   * Set feature override for a tenant
   */
  async setTenantOverride(
    organizationId: string,
    featureKey: string,
    value: boolean,
    reason?: string,
    expiresAt?: Date
  ): Promise<TenantFeatureOverride> {
    const tenant = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, settings: true },
    });

    if (!tenant) throw new Error('Organization not found');

    const currentSettings = (tenant.settings as any) || {};
    const featureOverrides = currentSettings.featureOverrides || {};

    featureOverrides[featureKey] = {
      value,
      reason,
      expiresAt: expiresAt?.toISOString(),
      setAt: new Date().toISOString(),
    };

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...currentSettings,
          featureOverrides,
        },
      },
    });

    return {
      organizationId,
      featureKey,
      value,
      reason,
      expiresAt,
    };
  }

  /**
   * Remove feature override for a tenant
   */
  async removeTenantOverride(organizationId: string, featureKey: string): Promise<void> {
    const tenant = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, settings: true },
    });

    if (!tenant) throw new Error('Organization not found');

    const currentSettings = (tenant.settings as any) || {};
    const featureOverrides = currentSettings.featureOverrides || {};

    delete featureOverrides[featureKey];

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...currentSettings,
          featureOverrides,
        },
      },
    });
  }

  /**
   * Get tenant-specific override
   */
  private async getTenantOverride(
    organizationId: string,
    featureKey: string
  ): Promise<boolean | null> {
    const tenant = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    if (!tenant) return null;

    const settings = (tenant.settings as any) || {};
    const overrides = settings.featureOverrides || {};
    const override = overrides[featureKey];

    if (!override) return null;

    // Check expiration
    if (override.expiresAt && new Date(override.expiresAt) < new Date()) {
      return null;
    }

    return override.value;
  }

  /**
   * Get all tenant overrides
   */
  async getAllTenantOverrides(): Promise<Array<{
    organizationId: string;
    organizationName: string;
    overrides: TenantFeatureOverride[];
  }>> {
    const tenants = await prisma.organization.findMany({
      where: { isActive: true },
      select: { id: true, name: true, settings: true },
    });

    return tenants
      .map((tenant) => {
        const settings = (tenant.settings as any) || {};
        const overrides = settings.featureOverrides || {};

        return {
          organizationId: tenant.id,
          organizationName: tenant.name,
          overrides: Object.entries(overrides).map(([key, value]: [string, any]) => ({
            organizationId: tenant.id,
            featureKey: key,
            value: value.value,
            reason: value.reason,
            expiresAt: value.expiresAt ? new Date(value.expiresAt) : undefined,
          })),
        };
      })
      .filter((t) => t.overrides.length > 0);
  }

  /**
   * Get feature flag statistics
   */
  async getFeatureFlagStats(): Promise<FeatureFlagStats[]> {
    const tenants = await prisma.organization.findMany({
      where: { isActive: true },
      select: { id: true, settings: true },
    });

    const stats: Map<string, FeatureFlagStats> = new Map();

    // Initialize stats for all features
    for (const [key] of this.featureCache) {
      stats.set(key, {
        featureKey: key,
        enabledCount: 0,
        disabledCount: 0,
        customOverrides: 0,
      });
    }

    // Calculate stats for each tenant
    for (const tenant of tenants) {
      const settings = (tenant.settings as any) || {};
      const overrides = settings.featureOverrides || {};

      for (const [key, feature] of this.featureCache) {
        const stat = stats.get(key)!;
        const override = overrides[key];

        if (override) {
          stat.customOverrides++;
          if (override.value) {
            stat.enabledCount++;
          } else {
            stat.disabledCount++;
          }
        } else {
          // Use default/rollout logic
          const hash = this.hashString(`${tenant.id}-${key}`);
          const enabled = feature.rolloutPercentage >= 100 ||
            hash % 100 < feature.rolloutPercentage;

          if (enabled && feature.defaultValue) {
            stat.enabledCount++;
          } else {
            stat.disabledCount++;
          }
        }
      }
    }

    return Array.from(stats.values());
  }

  /**
   * Gradual rollout - increase percentage for a feature
   */
  async increaseRollout(featureKey: string, increment: number = 10): Promise<FeatureFlag> {
    const feature = this.featureCache.get(featureKey);
    if (!feature) {
      throw new Error(`Feature flag '${featureKey}' not found`);
    }

    const newPercentage = Math.min(100, feature.rolloutPercentage + increment);
    return this.updateFeatureFlag(featureKey, { rolloutPercentage: newPercentage });
  }

  /**
   * Helper: Simple string hash for consistent rollout
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

export const featureFlagsService = new FeatureFlagsService();
