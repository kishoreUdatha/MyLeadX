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
    id: 'multi-language',
    name: 'Multi-Language Support',
    key: 'multi_language',
    description: 'Support for multiple languages in voice and chat',
    type: 'boolean',
    defaultValue: true,
    isEnabled: true,
    rolloutPercentage: 100,
  },
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
    id: 'beta-features',
    name: 'Beta Features',
    key: 'beta_features',
    description: 'Access to beta/experimental features',
    type: 'boolean',
    defaultValue: false,
    isEnabled: true,
    rolloutPercentage: 10,
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
