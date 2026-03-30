/**
 * Apify Scheduler Service
 *
 * Manages scheduled scraping jobs for Apify integration.
 * Checks for due scrapes and triggers them through the job queue.
 */

import { prisma } from '../config/database';
import { ScheduleInterval } from '@prisma/client';
import { jobQueueService } from './job-queue.service';

// Schedule interval in milliseconds
const SCHEDULER_CHECK_INTERVAL = 60 * 1000; // Check every minute

class ApifySchedulerService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  /**
   * Start the scheduler
   */
  start() {
    if (this.isRunning) {
      console.warn('[ApifyScheduler] Scheduler already running');
      return;
    }

    console.info('[ApifyScheduler] Starting scheduler...');
    this.isRunning = true;

    // Run immediately on start
    this.checkScheduledScrapes().catch(console.error);

    // Then run at interval
    this.intervalId = setInterval(() => {
      this.checkScheduledScrapes().catch(console.error);
    }, SCHEDULER_CHECK_INTERVAL);
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.info('[ApifyScheduler] Scheduler stopped');
  }

  /**
   * Check for and trigger scheduled scrapes
   */
  async checkScheduledScrapes(): Promise<void> {
    const now = new Date();

    try {
      // Find all active scraper configs with schedule enabled and due for execution
      const dueConfigs = await prisma.apifyScraperConfig.findMany({
        where: {
          isActive: true,
          scheduleEnabled: true,
          nextScheduledAt: {
            lte: now,
          },
          integration: {
            isActive: true,
          },
        },
        include: {
          integration: true,
        },
      });

      if (dueConfigs.length === 0) {
        return;
      }

      console.info(`[ApifyScheduler] Found ${dueConfigs.length} due scrapes`);

      for (const config of dueConfigs) {
        try {
          await this.executeScheduledScrape(config.id, config.integration.organizationId);
        } catch (error) {
          console.error(`[ApifyScheduler] Failed to execute scrape for config ${config.id}:`, error);
        }
      }
    } catch (error) {
      console.error('[ApifyScheduler] Error checking scheduled scrapes:', error);
    }
  }

  /**
   * Execute a scheduled scrape
   */
  async executeScheduledScrape(configId: string, organizationId: string): Promise<void> {
    // Get fresh config data
    const config = await prisma.apifyScraperConfig.findUnique({
      where: { id: configId },
      include: { integration: true },
    });

    if (!config || !config.isActive || !config.scheduleEnabled) {
      console.warn(`[ApifyScheduler] Config ${configId} is not active or schedule disabled`);
      return;
    }

    // Calculate next run time before triggering
    const nextRunTime = this.calculateNextRunTime(config.scheduleInterval, config.scheduleCron);

    // Update next scheduled time
    await prisma.apifyScraperConfig.update({
      where: { id: configId },
      data: { nextScheduledAt: nextRunTime },
    });

    // Add job to queue
    await jobQueueService.addJob(
      'APIFY_SCRAPE_RUN',
      {
        configId,
        integrationId: config.integrationId,
        actorId: config.actorId,
        inputConfig: config.inputConfig,
        fieldMapping: config.fieldMapping,
        scraperType: config.scraperType,
        isScheduled: true,
      },
      { organizationId }
    );

    console.info(`[ApifyScheduler] Triggered scheduled scrape for config ${configId}, next run at ${nextRunTime}`);
  }

  /**
   * Calculate the next run time based on interval
   */
  calculateNextRunTime(interval: ScheduleInterval, customCron?: string | null): Date {
    const now = new Date();

    switch (interval) {
      case 'HOURLY':
        return new Date(now.getTime() + 60 * 60 * 1000);

      case 'DAILY':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);

      case 'WEEKLY':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      case 'MONTHLY':
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth;

      case 'CUSTOM':
        // For custom cron, calculate next occurrence
        // For simplicity, default to daily if cron is invalid
        if (customCron) {
          return this.getNextCronOccurrence(customCron);
        }
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);

      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Parse simple cron expression and get next occurrence
   * Supports basic format: minute hour day month weekday
   */
  private getNextCronOccurrence(cron: string): Date {
    // Simple cron parser - just handles basic cases
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) {
      // Invalid cron, return next day
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    const [minute, hour, , ,] = parts;
    const now = new Date();
    const next = new Date();

    // Set the target time
    if (minute !== '*') {
      next.setMinutes(parseInt(minute, 10) || 0);
    }
    if (hour !== '*') {
      next.setHours(parseInt(hour, 10) || 0);
    }
    next.setSeconds(0);
    next.setMilliseconds(0);

    // If time has passed today, move to tomorrow
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    return next;
  }

  /**
   * Enable scheduling for a config
   */
  async enableSchedule(
    configId: string,
    interval: ScheduleInterval,
    customCron?: string
  ): Promise<void> {
    const nextRunTime = this.calculateNextRunTime(interval, customCron);

    await prisma.apifyScraperConfig.update({
      where: { id: configId },
      data: {
        scheduleEnabled: true,
        scheduleInterval: interval,
        scheduleCron: customCron,
        nextScheduledAt: nextRunTime,
      },
    });

    console.info(`[ApifyScheduler] Enabled schedule for config ${configId}, next run at ${nextRunTime}`);
  }

  /**
   * Disable scheduling for a config
   */
  async disableSchedule(configId: string): Promise<void> {
    await prisma.apifyScraperConfig.update({
      where: { id: configId },
      data: {
        scheduleEnabled: false,
        nextScheduledAt: null,
      },
    });

    console.info(`[ApifyScheduler] Disabled schedule for config ${configId}`);
  }

  /**
   * Get scheduler status
   */
  getStatus(): { isRunning: boolean; nextCheck: Date | null } {
    return {
      isRunning: this.isRunning,
      nextCheck: this.isRunning ? new Date(Date.now() + SCHEDULER_CHECK_INTERVAL) : null,
    };
  }
}

// Export singleton instance
export const apifySchedulerService = new ApifySchedulerService();
