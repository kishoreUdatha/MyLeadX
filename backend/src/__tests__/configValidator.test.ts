/**
 * Configuration Validator Unit Tests
 */

import {
  validateConfig,
  isFeatureConfigured,
  getConfiguredFeatures,
} from '../utils/configValidator';

describe('Configuration Validator', () => {
  // Store original env vars
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore original env vars after each test
    process.env = { ...originalEnv };
  });

  describe('validateConfig', () => {
    it('should return valid when all required vars are set', () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-at-least-32-chars';

      const result = validateConfig();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for missing required vars', () => {
      // Clear required vars
      delete process.env.DATABASE_URL;

      const result = validateConfig();

      expect(result.errors.some((e) => e.includes('DATABASE_URL'))).toBe(true);
    });

    it('should validate URL format for DATABASE_URL', () => {
      process.env.DATABASE_URL = 'invalid-url';
      process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-at-least-32-chars';

      const result = validateConfig();

      expect(result.errors.some((e) => e.includes('DATABASE_URL'))).toBe(true);
    });

    it('should warn about dependent vars when parent is set', () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-at-least-32-chars';
      process.env.TWILIO_ACCOUNT_SID = 'ACtest123456789';
      // Missing TWILIO_AUTH_TOKEN

      const result = validateConfig();

      expect(result.warnings.some((w) => w.includes('TWILIO_AUTH_TOKEN'))).toBe(true);
    });

    it('should provide summary statistics', () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-at-least-32-chars';

      const result = validateConfig();

      expect(result.summary).toHaveProperty('total');
      expect(result.summary).toHaveProperty('configured');
      expect(result.summary).toHaveProperty('missing');
      expect(result.summary).toHaveProperty('invalid');
      expect(result.summary.total).toBeGreaterThan(0);
    });
  });

  describe('isFeatureConfigured', () => {
    it('should return true when all feature vars are set', () => {
      process.env.TWILIO_ACCOUNT_SID = 'ACtest123456789';
      process.env.TWILIO_AUTH_TOKEN = 'test-auth-token';

      expect(isFeatureConfigured('twilio')).toBe(true);
    });

    it('should return false when feature vars are missing', () => {
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_AUTH_TOKEN;

      expect(isFeatureConfigured('twilio')).toBe(false);
    });

    it('should return false for unknown features', () => {
      expect(isFeatureConfigured('unknown-feature')).toBe(false);
    });

    it('should check OpenAI configuration', () => {
      delete process.env.OPENAI_API_KEY;
      expect(isFeatureConfigured('openai')).toBe(false);

      process.env.OPENAI_API_KEY = 'sk-test123';
      expect(isFeatureConfigured('openai')).toBe(true);
    });

    it('should check Razorpay configuration', () => {
      delete process.env.RAZORPAY_KEY_ID;
      delete process.env.RAZORPAY_KEY_SECRET;
      expect(isFeatureConfigured('razorpay')).toBe(false);

      process.env.RAZORPAY_KEY_ID = 'rzp_test_123';
      process.env.RAZORPAY_KEY_SECRET = 'secret123';
      expect(isFeatureConfigured('razorpay')).toBe(true);
    });
  });

  describe('getConfiguredFeatures', () => {
    it('should return empty array when no features are configured', () => {
      // Clear all feature-related env vars
      delete process.env.OPENAI_API_KEY;
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.RAZORPAY_KEY_ID;
      delete process.env.PLIVO_AUTH_ID;
      delete process.env.EXOTEL_ACCOUNT_SID;
      delete process.env.SARVAM_API_KEY;
      delete process.env.FACEBOOK_APP_ID;
      delete process.env.LINKEDIN_CLIENT_ID;
      delete process.env.GOOGLE_ADS_CLIENT_ID;
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.SMTP_HOST;
      delete process.env.REDIS_URL;
      delete process.env.WHATSAPP_PHONE_NUMBER_ID;
      delete process.env.SENDGRID_API_KEY;

      const features = getConfiguredFeatures();

      expect(features).toHaveLength(0);
    });

    it('should return configured features', () => {
      process.env.OPENAI_API_KEY = 'sk-test123';
      process.env.TWILIO_ACCOUNT_SID = 'ACtest123';
      process.env.TWILIO_AUTH_TOKEN = 'token123';

      const features = getConfiguredFeatures();

      expect(features).toContain('openai');
      expect(features).toContain('twilio');
    });

    it('should not include partially configured features', () => {
      process.env.TWILIO_ACCOUNT_SID = 'ACtest123';
      delete process.env.TWILIO_AUTH_TOKEN;

      const features = getConfiguredFeatures();

      expect(features).not.toContain('twilio');
    });
  });
});
