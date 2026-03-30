/**
 * Configuration Validator
 * Validates environment variables at startup and provides warnings for missing optional configs
 */

interface ValidationRule {
  key: string;
  required: boolean;
  requiredInProd?: boolean;
  dependsOn?: string;
  validate?: (value: string) => boolean;
  description: string;
  default?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    total: number;
    configured: number;
    missing: number;
    invalid: number;
  };
}

const validationRules: ValidationRule[] = [
  // Core settings
  {
    key: 'NODE_ENV',
    required: false,
    description: 'Application environment',
    default: 'development',
  },
  {
    key: 'PORT',
    required: false,
    description: 'Server port',
    default: '3000',
    validate: (v) => !isNaN(parseInt(v)) && parseInt(v) > 0 && parseInt(v) < 65536,
  },
  {
    key: 'DATABASE_URL',
    required: true,
    description: 'PostgreSQL connection string',
    validate: (v) => v.startsWith('postgres://') || v.startsWith('postgresql://'),
  },
  {
    key: 'FRONTEND_URL',
    required: false,
    requiredInProd: true,
    description: 'Frontend application URL',
    validate: (v) => v.startsWith('http://') || v.startsWith('https://'),
  },
  {
    key: 'BASE_URL',
    required: false,
    requiredInProd: true,
    description: 'Backend API URL',
    validate: (v) => v.startsWith('http://') || v.startsWith('https://'),
  },

  // JWT settings
  {
    key: 'JWT_SECRET',
    required: true,
    description: 'JWT signing secret',
    validate: (v) => v.length >= 32 && v !== 'default-secret-change-me',
  },
  {
    key: 'JWT_REFRESH_SECRET',
    required: true,
    description: 'JWT refresh token secret',
    validate: (v) => v.length >= 32 && v !== 'default-refresh-secret-change-me',
  },
  {
    key: 'JWT_EXPIRY',
    required: false,
    description: 'JWT expiry duration',
    default: '15m',
  },
  {
    key: 'JWT_REFRESH_EXPIRY',
    required: false,
    description: 'JWT refresh expiry duration',
    default: '7d',
  },

  // OpenAI
  {
    key: 'OPENAI_API_KEY',
    required: false,
    description: 'OpenAI API key for AI features',
    validate: (v) => v.startsWith('sk-'),
  },
  {
    key: 'OPENAI_CHAT_MODEL',
    required: false,
    dependsOn: 'OPENAI_API_KEY',
    description: 'OpenAI chat model',
    default: 'gpt-4o-mini',
  },
  {
    key: 'OPENAI_STT_MODEL',
    required: false,
    dependsOn: 'OPENAI_API_KEY',
    description: 'OpenAI speech-to-text model',
    default: 'whisper-1',
  },

  // Sarvam AI (Indian languages)
  {
    key: 'SARVAM_API_KEY',
    required: false,
    description: 'Sarvam AI API key for Indian language support',
  },
  {
    key: 'SARVAM_TTS_PACE',
    required: false,
    dependsOn: 'SARVAM_API_KEY',
    description: 'Sarvam TTS speech pace',
    default: '1.10',
    validate: (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
  },

  // Plivo
  {
    key: 'PLIVO_AUTH_ID',
    required: false,
    description: 'Plivo Auth ID for SMS/Voice',
  },
  {
    key: 'PLIVO_AUTH_TOKEN',
    required: false,
    dependsOn: 'PLIVO_AUTH_ID',
    description: 'Plivo Auth Token',
  },
  {
    key: 'PLIVO_PHONE_NUMBER',
    required: false,
    dependsOn: 'PLIVO_AUTH_ID',
    description: 'Plivo phone number',
  },

  // Exotel
  {
    key: 'EXOTEL_ACCOUNT_SID',
    required: false,
    description: 'Exotel Account SID for SMS/Voice',
  },
  {
    key: 'EXOTEL_API_KEY',
    required: false,
    dependsOn: 'EXOTEL_ACCOUNT_SID',
    description: 'Exotel API Key',
  },
  {
    key: 'EXOTEL_API_TOKEN',
    required: false,
    dependsOn: 'EXOTEL_ACCOUNT_SID',
    description: 'Exotel API Token',
  },
  {
    key: 'EXOTEL_CALLER_ID',
    required: false,
    dependsOn: 'EXOTEL_ACCOUNT_SID',
    description: 'Exotel Caller ID',
  },

  // Twilio
  {
    key: 'TWILIO_ACCOUNT_SID',
    required: false,
    description: 'Twilio Account SID',
    validate: (v) => v.startsWith('AC'),
  },
  {
    key: 'TWILIO_AUTH_TOKEN',
    required: false,
    dependsOn: 'TWILIO_ACCOUNT_SID',
    description: 'Twilio Auth Token',
  },
  {
    key: 'TWILIO_PHONE_NUMBER',
    required: false,
    dependsOn: 'TWILIO_ACCOUNT_SID',
    description: 'Twilio phone number',
    validate: (v) => v.startsWith('+'),
  },

  // Razorpay
  {
    key: 'RAZORPAY_KEY_ID',
    required: false,
    description: 'Razorpay Key ID for payments',
    validate: (v) => v.startsWith('rzp_'),
  },
  {
    key: 'RAZORPAY_KEY_SECRET',
    required: false,
    dependsOn: 'RAZORPAY_KEY_ID',
    description: 'Razorpay Key Secret',
  },

  // Facebook
  {
    key: 'FACEBOOK_APP_ID',
    required: false,
    description: 'Facebook App ID for lead ads',
  },
  {
    key: 'FACEBOOK_APP_SECRET',
    required: false,
    dependsOn: 'FACEBOOK_APP_ID',
    description: 'Facebook App Secret',
  },
  {
    key: 'FACEBOOK_VERIFY_TOKEN',
    required: false,
    dependsOn: 'FACEBOOK_APP_ID',
    description: 'Facebook Webhook Verify Token',
  },

  // LinkedIn
  {
    key: 'LINKEDIN_CLIENT_ID',
    required: false,
    description: 'LinkedIn Client ID for lead ads',
  },
  {
    key: 'LINKEDIN_CLIENT_SECRET',
    required: false,
    dependsOn: 'LINKEDIN_CLIENT_ID',
    description: 'LinkedIn Client Secret',
  },
  {
    key: 'LINKEDIN_WEBHOOK_SECRET',
    required: false,
    dependsOn: 'LINKEDIN_CLIENT_ID',
    description: 'LinkedIn Webhook Secret',
  },

  // Google Ads
  {
    key: 'GOOGLE_ADS_CLIENT_ID',
    required: false,
    description: 'Google Ads Client ID',
  },
  {
    key: 'GOOGLE_ADS_CLIENT_SECRET',
    required: false,
    dependsOn: 'GOOGLE_ADS_CLIENT_ID',
    description: 'Google Ads Client Secret',
  },
  {
    key: 'GOOGLE_ADS_DEVELOPER_TOKEN',
    required: false,
    dependsOn: 'GOOGLE_ADS_CLIENT_ID',
    description: 'Google Ads Developer Token',
  },

  // AWS
  {
    key: 'AWS_ACCESS_KEY_ID',
    required: false,
    description: 'AWS Access Key for file uploads',
  },
  {
    key: 'AWS_SECRET_ACCESS_KEY',
    required: false,
    dependsOn: 'AWS_ACCESS_KEY_ID',
    description: 'AWS Secret Access Key',
  },
  {
    key: 'AWS_BUCKET_NAME',
    required: false,
    dependsOn: 'AWS_ACCESS_KEY_ID',
    description: 'AWS S3 Bucket Name',
  },
  {
    key: 'AWS_REGION',
    required: false,
    dependsOn: 'AWS_ACCESS_KEY_ID',
    description: 'AWS Region',
    default: 'ap-south-1',
  },

  // SMTP
  {
    key: 'SMTP_HOST',
    required: false,
    description: 'SMTP host for email sending',
  },
  {
    key: 'SMTP_PORT',
    required: false,
    dependsOn: 'SMTP_HOST',
    description: 'SMTP port',
    default: '587',
    validate: (v) => !isNaN(parseInt(v)),
  },
  {
    key: 'SMTP_USER',
    required: false,
    dependsOn: 'SMTP_HOST',
    description: 'SMTP username',
  },
  {
    key: 'SMTP_PASS',
    required: false,
    dependsOn: 'SMTP_HOST',
    description: 'SMTP password',
  },
  {
    key: 'SMTP_FROM',
    required: false,
    dependsOn: 'SMTP_HOST',
    description: 'Default sender email address',
    validate: (v) => v.includes('@'),
  },

  // Redis (optional caching)
  {
    key: 'REDIS_URL',
    required: false,
    description: 'Redis URL for caching',
    validate: (v) => v.startsWith('redis://') || v.startsWith('rediss://'),
  },

  // WhatsApp
  {
    key: 'WHATSAPP_PHONE_NUMBER_ID',
    required: false,
    description: 'WhatsApp Business Phone Number ID',
  },
  {
    key: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
    required: false,
    dependsOn: 'WHATSAPP_PHONE_NUMBER_ID',
    description: 'WhatsApp Business Account ID',
  },
  {
    key: 'WHATSAPP_ACCESS_TOKEN',
    required: false,
    dependsOn: 'WHATSAPP_PHONE_NUMBER_ID',
    description: 'WhatsApp Access Token',
  },
  {
    key: 'WHATSAPP_APP_SECRET',
    required: false,
    dependsOn: 'WHATSAPP_PHONE_NUMBER_ID',
    description: 'WhatsApp App Secret for webhook verification',
  },

  // SendGrid
  {
    key: 'SENDGRID_API_KEY',
    required: false,
    description: 'SendGrid API Key for email',
    validate: (v) => v.startsWith('SG.'),
  },
  {
    key: 'SENDGRID_WEBHOOK_KEY',
    required: false,
    dependsOn: 'SENDGRID_API_KEY',
    description: 'SendGrid Webhook Verification Key',
  },
];

/**
 * Validate all configuration settings
 */
export function validateConfig(): ValidationResult {
  const isProduction = process.env.NODE_ENV === 'production';
  const errors: string[] = [];
  const warnings: string[] = [];
  let configured = 0;
  let missing = 0;
  let invalid = 0;

  for (const rule of validationRules) {
    const value = process.env[rule.key];
    const hasValue = value !== undefined && value !== '';

    // Check if required
    const isRequired = rule.required || (isProduction && rule.requiredInProd);
    if (isRequired && !hasValue) {
      errors.push(`Missing required: ${rule.key} - ${rule.description}`);
      missing++;
      continue;
    }

    // Check if dependency is met
    if (rule.dependsOn && !hasValue) {
      const parentValue = process.env[rule.dependsOn];
      if (parentValue && parentValue !== '') {
        warnings.push(`Missing dependent: ${rule.key} (depends on ${rule.dependsOn}) - ${rule.description}`);
        missing++;
        continue;
      }
    }

    // Validate value if present
    if (hasValue) {
      configured++;
      if (rule.validate && !rule.validate(value)) {
        if (isRequired) {
          errors.push(`Invalid value for ${rule.key}: ${rule.description}`);
          invalid++;
        } else {
          warnings.push(`Invalid value for ${rule.key}: ${rule.description}`);
        }
      }
    } else if (!rule.required && !rule.dependsOn) {
      // Optional config not set - just informational
      if (rule.default) {
        // Has default, no warning needed
      } else {
        missing++;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      total: validationRules.length,
      configured,
      missing,
      invalid,
    },
  };
}

/**
 * Validate configuration and log results
 * Call this at application startup
 */
export function validateAndLog(): boolean {
  const result = validateConfig();

  console.info('='.repeat(60));
  console.info('Configuration Validation');
  console.info('='.repeat(60));

  console.info(`Total settings: ${result.summary.total}`);
  console.info(`Configured: ${result.summary.configured}`);
  console.info(`Missing (optional): ${result.summary.missing}`);

  if (result.errors.length > 0) {
    console.error('\n❌ ERRORS:');
    result.errors.forEach((err) => console.error(`  - ${err}`));
  }

  if (result.warnings.length > 0) {
    console.warn('\n⚠️  WARNINGS:');
    result.warnings.forEach((warn) => console.warn(`  - ${warn}`));
  }

  if (result.valid && result.warnings.length === 0) {
    console.info('\n✅ Configuration is valid');
  } else if (result.valid) {
    console.info('\n✅ Configuration is valid (with warnings)');
  } else {
    console.error('\n❌ Configuration validation failed');
  }

  console.info('='.repeat(60));

  return result.valid;
}

/**
 * Check if a specific feature is configured
 */
export function isFeatureConfigured(feature: string): boolean {
  const featureKeys: Record<string, string[]> = {
    openai: ['OPENAI_API_KEY'],
    sarvam: ['SARVAM_API_KEY'],
    plivo: ['PLIVO_AUTH_ID', 'PLIVO_AUTH_TOKEN'],
    exotel: ['EXOTEL_ACCOUNT_SID', 'EXOTEL_API_KEY', 'EXOTEL_API_TOKEN'],
    twilio: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'],
    razorpay: ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'],
    facebook: ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET'],
    linkedin: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'],
    googleAds: ['GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET', 'GOOGLE_ADS_DEVELOPER_TOKEN'],
    aws: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_BUCKET_NAME'],
    smtp: ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'],
    redis: ['REDIS_URL'],
    whatsapp: ['WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN'],
    sendgrid: ['SENDGRID_API_KEY'],
  };

  const keys = featureKeys[feature.toLowerCase()];
  if (!keys) {
    return false;
  }

  return keys.every((key) => {
    const value = process.env[key];
    return value !== undefined && value !== '';
  });
}

/**
 * Get list of configured features
 */
export function getConfiguredFeatures(): string[] {
  const features = [
    'openai', 'sarvam', 'plivo', 'exotel', 'twilio', 'razorpay',
    'facebook', 'linkedin', 'googleAds', 'aws', 'smtp', 'redis',
    'whatsapp', 'sendgrid',
  ];

  return features.filter((feature) => isFeatureConfigured(feature));
}
