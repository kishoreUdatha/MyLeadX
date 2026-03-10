import dotenv from 'dotenv';
import { validateAndLog, isFeatureConfigured, getConfiguredFeatures } from '../utils/configValidator';

dotenv.config();

const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';

// Run comprehensive configuration validation
const isValidConfig = validateAndLog();

// In production, fail fast on invalid configuration
if (isProduction && !isValidConfig) {
  console.error('FATAL: Invalid configuration in production mode. Exiting.');
  process.exit(1);
}

// Log configured features
const configuredFeatures = getConfiguredFeatures();
if (configuredFeatures.length > 0) {
  console.info(`Configured features: ${configuredFeatures.join(', ')}`);
}

// Parse CORS origins (supports comma-separated list)
function parseCorsOrigins(): string | string[] {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const corsOrigins = process.env.CORS_ORIGINS;

  if (corsOrigins) {
    // Support multiple origins: "https://example.com,https://www.example.com"
    return corsOrigins.split(',').map((origin) => origin.trim());
  }

  // In development, allow multiple localhost ports
  if (!isProduction) {
    return [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',
      'http://localhost:3000',
      'http://localhost:3001',
      frontendUrl,
    ];
  }

  return frontendUrl;
}

export const config = {
  env,
  isProduction,
  port: parseInt(process.env.PORT || '3000', 10),

  database: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-me',
    expiry: process.env.JWT_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
  },

  plivo: {
    authId: process.env.PLIVO_AUTH_ID,
    authToken: process.env.PLIVO_AUTH_TOKEN,
    phoneNumber: process.env.PLIVO_PHONE_NUMBER,
  },

  exotel: {
    accountSid: process.env.EXOTEL_ACCOUNT_SID,
    apiKey: process.env.EXOTEL_API_KEY,
    apiToken: process.env.EXOTEL_API_TOKEN,
    callerId: process.env.EXOTEL_CALLER_ID,
    subdomain: process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com',
    appId: process.env.EXOTEL_APP_ID,
    smsSenderId: process.env.EXOTEL_SMS_SENDER_ID,
    dltEntityId: process.env.EXOTEL_DLT_ENTITY_ID,
    dltTemplateId: process.env.EXOTEL_DLT_TEMPLATE_ID,
  },

  // SMS/Voice provider selection: 'plivo' or 'exotel'
  smsProvider: process.env.SMS_PROVIDER || 'exotel',
  voiceProvider: process.env.VOICE_PROVIDER || 'exotel',

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },

  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    bucketName: process.env.AWS_BUCKET_NAME,
    region: process.env.AWS_REGION || 'ap-south-1',
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
  },

  facebook: {
    appId: process.env.FACEBOOK_APP_ID,
    appSecret: process.env.FACEBOOK_APP_SECRET,
    verifyToken: process.env.FACEBOOK_VERIFY_TOKEN,
  },

  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },

  google: {
    adsClientId: process.env.GOOGLE_ADS_CLIENT_ID,
    adsClientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET,
    adsDeveloperToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
  },

  redis: {
    url: process.env.REDIS_URL,
  },

  // API versions (can be overridden via env vars)
  apiVersions: {
    facebook: process.env.FACEBOOK_API_VERSION || 'v18.0',
    whatsapp: process.env.WHATSAPP_API_VERSION || 'v18.0',
    linkedin: process.env.LINKEDIN_API_VERSION || 'v2',
    googleAds: process.env.GOOGLE_ADS_API_VERSION || 'v15',
  },

  // Sarvam AI (Indian language support)
  sarvam: {
    apiKey: process.env.SARVAM_API_KEY,
    apiUrl: process.env.SARVAM_API_URL || 'https://api.sarvam.ai',
    ttsPace: parseFloat(process.env.SARVAM_TTS_PACE || '1.10'),
  },

  // Voice AI settings
  voiceAi: {
    chatModel: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
    sttModel: process.env.OPENAI_STT_MODEL || 'whisper-1',
    ttsModel: process.env.TTS_MODEL || 'tts-1-hd',
    sampleRateTelephony: parseInt(process.env.AUDIO_SAMPLE_RATE || '8000', 10),
  },

  // CORS - supports single URL or comma-separated list via CORS_ORIGINS
  corsOrigins: parseCorsOrigins(),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
};
