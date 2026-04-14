import { prisma } from '../config/database';

/**
 * TENANT INTELLIGENCE SERVICE
 *
 * AI-powered tenant analytics:
 * - Churn risk prediction
 * - Engagement scoring
 * - Feature adoption tracking
 * - Growth recommendations
 */

interface ChurnRiskFactors {
  loginFrequencyScore: number;      // 0-100
  featureUsageScore: number;        // 0-100
  paymentHealthScore: number;       // 0-100
  supportTicketScore: number;       // 0-100
  growthTrendScore: number;         // 0-100
}

interface TenantHealthScore {
  organizationId: string;
  organizationName: string;
  overallScore: number;             // 0-100
  churnRisk: 'low' | 'medium' | 'high' | 'critical';
  churnProbability: number;         // 0-100%
  factors: ChurnRiskFactors;
  recommendations: string[];
  lastCalculated: Date;
}

interface EngagementMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  avgSessionDuration: number;       // minutes
  featuresUsed: number;
  totalFeatures: number;
  adoptionRate: number;             // percentage
}

interface FeatureAdoption {
  featureName: string;
  category: string;
  adoptedTenants: number;
  totalTenants: number;
  adoptionRate: number;
  avgUsagePerTenant: number;
}

interface GrowthRecommendation {
  type: 'upsell' | 'engagement' | 'retention' | 'activation';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expectedImpact: string;
  targetTenants: number;
}

export class TenantIntelligenceService {
  /**
   * Calculate health score for all tenants
   */
  async calculateAllTenantHealthScores(): Promise<TenantHealthScore[]> {
    const tenants = await prisma.organization.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        createdAt: true,
        subscriptionStatus: true,
        activePlanId: true,
      },
    });

    const scores: TenantHealthScore[] = [];

    for (const tenant of tenants) {
      const score = await this.calculateTenantHealthScore(tenant.id);
      scores.push(score);
    }

    return scores.sort((a, b) => a.overallScore - b.overallScore);
  }

  /**
   * Calculate health score for a single tenant
   */
  async calculateTenantHealthScore(organizationId: string): Promise<TenantHealthScore> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, createdAt: true, subscriptionStatus: true },
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    const factors = await this.calculateChurnFactors(organizationId);
    const overallScore = this.calculateOverallScore(factors);
    const churnRisk = this.determineChurnRisk(overallScore);
    const churnProbability = Math.max(0, 100 - overallScore);
    const recommendations = this.generateRecommendations(factors, churnRisk);

    return {
      organizationId: org.id,
      organizationName: org.name,
      overallScore,
      churnRisk,
      churnProbability,
      factors,
      recommendations,
      lastCalculated: new Date(),
    };
  }

  /**
   * Calculate individual churn risk factors
   */
  private async calculateChurnFactors(organizationId: string): Promise<ChurnRiskFactors> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Login frequency score
    const activeUsers = await prisma.user.count({
      where: {
        organizationId,
        isActive: true,
        lastLoginAt: { gte: sevenDaysAgo },
      },
    });
    const totalUsers = await prisma.user.count({
      where: { organizationId, isActive: true },
    });
    const loginFrequencyScore = totalUsers > 0 ? Math.min(100, (activeUsers / totalUsers) * 100) : 0;

    // Feature usage score
    const [leadsCount, callsCount, messagesCount] = await Promise.all([
      prisma.lead.count({ where: { organizationId, createdAt: { gte: thirtyDaysAgo } } }),
      prisma.call.count({ where: { organizationId, createdAt: { gte: thirtyDaysAgo } } }),
      prisma.message.count({ where: { organizationId, createdAt: { gte: thirtyDaysAgo } } }),
    ]);
    const featureUsageScore = Math.min(100, (leadsCount + callsCount + messagesCount) / 10);

    // Payment health score
    const payments = await prisma.payment.findMany({
      where: { organizationId, createdAt: { gte: thirtyDaysAgo } },
      select: { status: true },
    });
    const successfulPayments = payments.filter((p) => p.status === 'COMPLETED').length;
    const paymentHealthScore = payments.length > 0
      ? (successfulPayments / payments.length) * 100
      : 100;

    // Support ticket score (fewer tickets = better)
    // Simplified - would need actual support ticket model
    const supportTicketScore = 80; // Placeholder

    // Growth trend score
    const previousMonth = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const previousLeads = await prisma.lead.count({
      where: {
        organizationId,
        createdAt: { gte: previousMonth, lt: thirtyDaysAgo },
      },
    });
    const growthTrendScore = previousLeads > 0
      ? Math.min(100, (leadsCount / previousLeads) * 50 + 50)
      : leadsCount > 0 ? 75 : 25;

    return {
      loginFrequencyScore: Math.round(loginFrequencyScore),
      featureUsageScore: Math.round(featureUsageScore),
      paymentHealthScore: Math.round(paymentHealthScore),
      supportTicketScore: Math.round(supportTicketScore),
      growthTrendScore: Math.round(growthTrendScore),
    };
  }

  /**
   * Calculate overall health score from factors
   */
  private calculateOverallScore(factors: ChurnRiskFactors): number {
    const weights = {
      loginFrequencyScore: 0.25,
      featureUsageScore: 0.25,
      paymentHealthScore: 0.20,
      supportTicketScore: 0.10,
      growthTrendScore: 0.20,
    };

    const score =
      factors.loginFrequencyScore * weights.loginFrequencyScore +
      factors.featureUsageScore * weights.featureUsageScore +
      factors.paymentHealthScore * weights.paymentHealthScore +
      factors.supportTicketScore * weights.supportTicketScore +
      factors.growthTrendScore * weights.growthTrendScore;

    return Math.round(score);
  }

  /**
   * Determine churn risk level
   */
  private determineChurnRisk(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 75) return 'low';
    if (score >= 50) return 'medium';
    if (score >= 25) return 'high';
    return 'critical';
  }

  /**
   * Generate personalized recommendations
   */
  private generateRecommendations(factors: ChurnRiskFactors, risk: string): string[] {
    const recommendations: string[] = [];

    if (factors.loginFrequencyScore < 50) {
      recommendations.push('Send re-engagement email campaign to inactive users');
      recommendations.push('Offer a free training session on platform features');
    }

    if (factors.featureUsageScore < 50) {
      recommendations.push('Schedule onboarding call to demonstrate key features');
      recommendations.push('Share success stories from similar customers');
    }

    if (factors.paymentHealthScore < 80) {
      recommendations.push('Reach out about payment issues proactively');
      recommendations.push('Offer flexible payment options or payment plan');
    }

    if (factors.growthTrendScore < 50) {
      recommendations.push('Discuss expansion opportunities with account manager');
      recommendations.push('Offer upgrade incentives or additional features trial');
    }

    if (risk === 'critical') {
      recommendations.unshift('URGENT: Schedule immediate call with customer success');
    }

    return recommendations.slice(0, 5);
  }

  /**
   * Get engagement metrics for a tenant
   */
  async getTenantEngagement(organizationId: string): Promise<EngagementMetrics> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [dau, wau, mau] = await Promise.all([
      prisma.user.count({
        where: { organizationId, lastLoginAt: { gte: oneDayAgo } },
      }),
      prisma.user.count({
        where: { organizationId, lastLoginAt: { gte: oneWeekAgo } },
      }),
      prisma.user.count({
        where: { organizationId, lastLoginAt: { gte: oneMonthAgo } },
      }),
    ]);

    // Count features used (simplified)
    const [hasLeads, hasCalls, hasMessages, hasCampaigns, hasPayments] = await Promise.all([
      prisma.lead.count({ where: { organizationId }, take: 1 }),
      prisma.call.count({ where: { organizationId }, take: 1 }),
      prisma.message.count({ where: { organizationId }, take: 1 }),
      prisma.campaign.count({ where: { organizationId }, take: 1 }),
      prisma.payment.count({ where: { organizationId }, take: 1 }),
    ]);

    const featuresUsed = [hasLeads, hasCalls, hasMessages, hasCampaigns, hasPayments]
      .filter((count) => count > 0).length;
    const totalFeatures = 5;

    return {
      dailyActiveUsers: dau,
      weeklyActiveUsers: wau,
      monthlyActiveUsers: mau,
      avgSessionDuration: 15, // Would need session tracking
      featuresUsed,
      totalFeatures,
      adoptionRate: Math.round((featuresUsed / totalFeatures) * 100),
    };
  }

  /**
   * Get platform-wide feature adoption stats
   */
  async getFeatureAdoption(): Promise<FeatureAdoption[]> {
    const totalTenants = await prisma.organization.count({ where: { isActive: true } });

    const features: FeatureAdoption[] = [];

    // Check each major feature
    const featureChecks = [
      { name: 'Lead Management', category: 'Core', model: 'lead' },
      { name: 'Voice Calls', category: 'Communication', model: 'call' },
      { name: 'SMS Messaging', category: 'Communication', model: 'smsLog' },
      { name: 'WhatsApp', category: 'Communication', model: 'whatsappLog' },
      { name: 'Email Campaigns', category: 'Marketing', model: 'emailLog' },
      { name: 'Campaigns', category: 'Marketing', model: 'campaign' },
      { name: 'Payments', category: 'Finance', model: 'payment' },
      { name: 'Voice AI Agents', category: 'AI', model: 'voiceAgent' },
    ];

    for (const feature of featureChecks) {
      try {
        const tenantsUsingFeature = await (prisma as any)[feature.model].groupBy({
          by: ['organizationId'],
          _count: { id: true },
        });

        const adoptedTenants = tenantsUsingFeature.length;
        const avgUsage = tenantsUsingFeature.length > 0
          ? tenantsUsingFeature.reduce((sum: number, t: any) => sum + t._count.id, 0) / tenantsUsingFeature.length
          : 0;

        features.push({
          featureName: feature.name,
          category: feature.category,
          adoptedTenants,
          totalTenants,
          adoptionRate: Math.round((adoptedTenants / totalTenants) * 100),
          avgUsagePerTenant: Math.round(avgUsage),
        });
      } catch (e) {
        // Model might not exist, skip
      }
    }

    return features.sort((a, b) => b.adoptionRate - a.adoptionRate);
  }

  /**
   * Generate growth recommendations for the platform
   */
  async getGrowthRecommendations(): Promise<GrowthRecommendation[]> {
    const recommendations: GrowthRecommendation[] = [];

    // Analyze platform data to generate recommendations
    const [
      inactiveCount,
      trialCount,
      lowUsageCount,
      highValueCount,
    ] = await Promise.all([
      // Inactive tenants (no login in 30 days)
      prisma.organization.count({
        where: {
          isActive: true,
          users: {
            none: {
              lastLoginAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            },
          },
        },
      }),
      // Trial tenants
      prisma.organization.count({
        where: { subscriptionStatus: 'TRIAL' },
      }),
      // Low usage tenants (simplified)
      prisma.organization.count({
        where: {
          isActive: true,
          leads: { none: {} },
        },
      }),
      // High value tenants (have payments)
      prisma.organization.count({
        where: {
          isActive: true,
          payments: { some: { status: 'COMPLETED' } },
        },
      }),
    ]);

    if (inactiveCount > 0) {
      recommendations.push({
        type: 'retention',
        priority: 'high',
        title: 'Re-engage Inactive Tenants',
        description: `${inactiveCount} tenants haven't logged in for 30+ days. Launch win-back campaign.`,
        expectedImpact: `Could recover ${Math.round(inactiveCount * 0.2)} tenants`,
        targetTenants: inactiveCount,
      });
    }

    if (trialCount > 0) {
      recommendations.push({
        type: 'activation',
        priority: 'high',
        title: 'Convert Trial Users',
        description: `${trialCount} tenants are on trial. Focus on conversion before expiry.`,
        expectedImpact: `Potential ${Math.round(trialCount * 0.3)} conversions`,
        targetTenants: trialCount,
      });
    }

    if (lowUsageCount > 0) {
      recommendations.push({
        type: 'engagement',
        priority: 'medium',
        title: 'Increase Feature Adoption',
        description: `${lowUsageCount} tenants have low feature usage. Offer onboarding assistance.`,
        expectedImpact: 'Reduce churn risk by 25%',
        targetTenants: lowUsageCount,
      });
    }

    if (highValueCount > 5) {
      recommendations.push({
        type: 'upsell',
        priority: 'medium',
        title: 'Upsell to Power Users',
        description: `${highValueCount} high-value tenants may benefit from premium features.`,
        expectedImpact: `+${Math.round(highValueCount * 500)} MRR potential`,
        targetTenants: highValueCount,
      });
    }

    return recommendations.sort((a, b) =>
      a.priority === 'high' ? -1 : b.priority === 'high' ? 1 : 0
    );
  }

  /**
   * Get tenants at risk of churning
   */
  async getAtRiskTenants(limit: number = 20): Promise<TenantHealthScore[]> {
    const allScores = await this.calculateAllTenantHealthScores();
    return allScores
      .filter((t) => t.churnRisk === 'high' || t.churnRisk === 'critical')
      .slice(0, limit);
  }
}

export const tenantIntelligenceService = new TenantIntelligenceService();
