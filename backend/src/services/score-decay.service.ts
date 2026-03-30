import { prisma } from '../config/database';
import { LeadGrade } from '@prisma/client';

interface DecayConfig {
  // Days after which decay starts
  decayStartDays: number;
  // Percentage decay per day after start
  dailyDecayRate: number;
  // Minimum score after decay
  minimumScore: number;
  // Maximum days of decay (after this, score stays at minimum)
  maxDecayDays: number;
}

const DEFAULT_DECAY_CONFIG: DecayConfig = {
  decayStartDays: 7, // Start decaying after 7 days of inactivity
  dailyDecayRate: 2, // 2% per day
  minimumScore: 10, // Never go below 10
  maxDecayDays: 45, // After 45 days, stop decaying
};

export class ScoreDecayService {
  private config: DecayConfig;

  constructor(config: Partial<DecayConfig> = {}) {
    this.config = { ...DEFAULT_DECAY_CONFIG, ...config };
  }

  /**
   * Calculate decayed score based on last activity
   */
  calculateDecayedScore(originalScore: number, lastActivityDate: Date): number {
    const now = new Date();
    const daysSinceActivity = Math.floor(
      (now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // No decay if within grace period
    if (daysSinceActivity <= this.config.decayStartDays) {
      return originalScore;
    }

    // Calculate decay days (capped at max)
    const decayDays = Math.min(
      daysSinceActivity - this.config.decayStartDays,
      this.config.maxDecayDays
    );

    // Calculate decayed score
    const decayMultiplier = 1 - (decayDays * this.config.dailyDecayRate) / 100;
    const decayedScore = Math.max(
      originalScore * decayMultiplier,
      this.config.minimumScore
    );

    return Math.round(decayedScore);
  }

  /**
   * Determine grade from score
   */
  getGradeFromScore(score: number): LeadGrade {
    if (score >= 90) return 'A_PLUS';
    if (score >= 75) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    if (score >= 25) return 'D';
    return 'F';
  }

  /**
   * Process decay for a single lead
   */
  async processLeadDecay(leadId: string): Promise<{
    leadId: string;
    originalScore: number;
    decayedScore: number;
    originalGrade: LeadGrade;
    newGrade: LeadGrade;
    updated: boolean;
  } | null> {
    // Get lead score with last activity
    const leadScore = await prisma.leadScore.findUnique({
      where: { leadId },
      include: {
        lead: {
          include: {
            activities: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            callLogs: {
              orderBy: { startedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!leadScore || !leadScore.lead) {
      return null;
    }

    // Find last activity date
    const lastActivityDates = [
      leadScore.lead.activities[0]?.createdAt,
      leadScore.lead.callLogs[0]?.startedAt,
      leadScore.lastCalculatedAt,
      leadScore.lead.updatedAt,
    ].filter(Boolean) as Date[];

    const lastActivityDate = lastActivityDates.length > 0
      ? new Date(Math.max(...lastActivityDates.map(d => d.getTime())))
      : leadScore.lead.createdAt;

    // Calculate decayed score
    const decayedScore = this.calculateDecayedScore(
      leadScore.overallScore,
      lastActivityDate
    );

    // Skip update if score hasn't changed
    if (decayedScore === leadScore.overallScore) {
      return {
        leadId,
        originalScore: leadScore.overallScore,
        decayedScore,
        originalGrade: leadScore.grade,
        newGrade: leadScore.grade,
        updated: false,
      };
    }

    const newGrade = this.getGradeFromScore(decayedScore);

    // Update lead score
    await prisma.leadScore.update({
      where: { leadId },
      data: {
        overallScore: decayedScore,
        grade: newGrade,
        lastCalculatedAt: new Date(),
        metadata: {
          ...(leadScore.metadata as object || {}),
          decayApplied: true,
          decayedAt: new Date().toISOString(),
          originalScore: leadScore.overallScore,
          lastActivityDate: lastActivityDate.toISOString(),
        },
      },
    });

    return {
      leadId,
      originalScore: leadScore.overallScore,
      decayedScore,
      originalGrade: leadScore.grade,
      newGrade,
      updated: true,
    };
  }

  /**
   * Process decay for all leads in an organization
   */
  async processOrganizationDecay(organizationId: string): Promise<{
    processed: number;
    updated: number;
    errors: number;
  }> {
    const leads = await prisma.lead.findMany({
      where: { organizationId },
      select: { id: true },
    });

    let processed = 0;
    let updated = 0;
    let errors = 0;

    for (const lead of leads) {
      try {
        const result = await this.processLeadDecay(lead.id);
        processed++;
        if (result?.updated) {
          updated++;
        }
      } catch (error) {
        console.error(`Error processing decay for lead ${lead.id}:`, error);
        errors++;
      }
    }

    return { processed, updated, errors };
  }

  /**
   * Process decay for all organizations (scheduled job)
   */
  async processAllDecay(): Promise<{
    organizations: number;
    totalProcessed: number;
    totalUpdated: number;
    totalErrors: number;
  }> {
    const organizations = await prisma.organization.findMany({
      select: { id: true },
    });

    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    for (const org of organizations) {
      const result = await this.processOrganizationDecay(org.id);
      totalProcessed += result.processed;
      totalUpdated += result.updated;
      totalErrors += result.errors;
    }

    console.log(
      `Score decay completed: ${organizations.length} orgs, ${totalProcessed} leads processed, ${totalUpdated} updated, ${totalErrors} errors`
    );

    return {
      organizations: organizations.length,
      totalProcessed,
      totalUpdated,
      totalErrors,
    };
  }

  /**
   * Boost score when activity occurs (anti-decay)
   */
  async boostScoreOnActivity(leadId: string, boostPercentage: number = 5): Promise<void> {
    const leadScore = await prisma.leadScore.findUnique({
      where: { leadId },
    });

    if (!leadScore) return;

    // Calculate boosted score (cap at 100)
    const boostedScore = Math.min(
      leadScore.overallScore + boostPercentage,
      100
    );

    const newGrade = this.getGradeFromScore(boostedScore);

    await prisma.leadScore.update({
      where: { leadId },
      data: {
        overallScore: boostedScore,
        grade: newGrade,
        lastCalculatedAt: new Date(),
        metadata: {
          ...(leadScore.metadata as object || {}),
          lastBoost: new Date().toISOString(),
          boostAmount: boostPercentage,
        },
      },
    });
  }

  /**
   * Get decay preview for a lead (without applying)
   */
  async getDecayPreview(leadId: string): Promise<{
    currentScore: number;
    projectedScores: Array<{ days: number; score: number; grade: LeadGrade }>;
  } | null> {
    const leadScore = await prisma.leadScore.findUnique({
      where: { leadId },
    });

    if (!leadScore) return null;

    const projectedScores = [];
    const now = new Date();

    // Project for next 60 days
    for (let days = 0; days <= 60; days += 7) {
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() - days); // Simulate as if last activity was X days ago

      const score = this.calculateDecayedScore(leadScore.overallScore, futureDate);
      projectedScores.push({
        days,
        score,
        grade: this.getGradeFromScore(score),
      });
    }

    return {
      currentScore: leadScore.overallScore,
      projectedScores,
    };
  }
}

export const scoreDecayService = new ScoreDecayService();
