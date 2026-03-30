import { prisma } from '../config/database';
import { s3Service } from '../integrations/s3.service';
import fs from 'fs';
import path from 'path';

interface CleanupConfig {
  // Days after which temp files are deleted
  tempFileMaxAgeDays: number;
  // Days after which orphaned files are deleted
  orphanedFileMaxAgeDays: number;
  // Days after which old voice recordings are deleted
  voiceRecordingMaxAgeDays: number;
  // Days to keep email tracking events
  emailTrackingMaxAgeDays: number;
  // Days to keep webhook logs
  webhookLogMaxAgeDays: number;
  // Days to keep call events
  callEventMaxAgeDays: number;
  // Max size in MB for local uploads directory
  localUploadMaxSizeMB: number;
}

const DEFAULT_CONFIG: CleanupConfig = {
  tempFileMaxAgeDays: 1,
  orphanedFileMaxAgeDays: 30,
  voiceRecordingMaxAgeDays: 90,
  emailTrackingMaxAgeDays: 365,
  webhookLogMaxAgeDays: 30,
  callEventMaxAgeDays: 90,
  localUploadMaxSizeMB: 5000, // 5GB
};

interface CleanupResult {
  success: boolean;
  filesDeleted: number;
  bytesFreed: number;
  recordsDeleted: number;
  errors: string[];
  details: {
    tempFiles?: number;
    orphanedFiles?: number;
    voiceRecordings?: number;
    emailTrackingEvents?: number;
    webhookLogs?: number;
    callEvents?: number;
    s3Files?: number;
    localFiles?: number;
  };
}

export class FileCleanupService {
  private config: CleanupConfig;
  private localUploadDir: string;

  constructor(config: Partial<CleanupConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.localUploadDir = path.join(process.cwd(), 'uploads');
  }

  /**
   * Run all cleanup tasks
   */
  async runFullCleanup(): Promise<CleanupResult> {
    const result: CleanupResult = {
      success: true,
      filesDeleted: 0,
      bytesFreed: 0,
      recordsDeleted: 0,
      errors: [],
      details: {},
    };

    try {
      // Run all cleanup tasks in parallel where possible
      const [
        tempResult,
        orphanedResult,
        voiceResult,
        trackingResult,
        webhookResult,
        callEventResult,
      ] = await Promise.allSettled([
        this.cleanupTempFiles(),
        this.cleanupOrphanedAttachments(),
        this.cleanupOldVoiceRecordings(),
        this.cleanupOldEmailTrackingEvents(),
        this.cleanupOldWebhookLogs(),
        this.cleanupOldCallEvents(),
      ]);

      // Aggregate results
      if (tempResult.status === 'fulfilled') {
        result.filesDeleted += tempResult.value.filesDeleted;
        result.bytesFreed += tempResult.value.bytesFreed;
        result.details.tempFiles = tempResult.value.filesDeleted;
      } else {
        result.errors.push(`Temp files: ${tempResult.reason}`);
      }

      if (orphanedResult.status === 'fulfilled') {
        result.filesDeleted += orphanedResult.value.filesDeleted;
        result.bytesFreed += orphanedResult.value.bytesFreed;
        result.details.orphanedFiles = orphanedResult.value.filesDeleted;
      } else {
        result.errors.push(`Orphaned files: ${orphanedResult.reason}`);
      }

      if (voiceResult.status === 'fulfilled') {
        result.filesDeleted += voiceResult.value.filesDeleted;
        result.bytesFreed += voiceResult.value.bytesFreed;
        result.details.voiceRecordings = voiceResult.value.filesDeleted;
      } else {
        result.errors.push(`Voice recordings: ${voiceResult.reason}`);
      }

      if (trackingResult.status === 'fulfilled') {
        result.recordsDeleted += trackingResult.value.recordsDeleted;
        result.details.emailTrackingEvents = trackingResult.value.recordsDeleted;
      } else {
        result.errors.push(`Email tracking: ${trackingResult.reason}`);
      }

      if (webhookResult.status === 'fulfilled') {
        result.recordsDeleted += webhookResult.value.recordsDeleted;
        result.details.webhookLogs = webhookResult.value.recordsDeleted;
      } else {
        result.errors.push(`Webhook logs: ${webhookResult.reason}`);
      }

      if (callEventResult.status === 'fulfilled') {
        result.recordsDeleted += callEventResult.value.recordsDeleted;
        result.details.callEvents = callEventResult.value.recordsDeleted;
      } else {
        result.errors.push(`Call events: ${callEventResult.reason}`);
      }

      result.success = result.errors.length === 0;
    } catch (error) {
      result.success = false;
      result.errors.push((error as Error).message);
    }

    console.log(
      `Cleanup completed: ${result.filesDeleted} files deleted, ` +
      `${result.recordsDeleted} records deleted, ` +
      `${(result.bytesFreed / 1024 / 1024).toFixed(2)} MB freed`
    );

    return result;
  }

  /**
   * Cleanup temporary files from local storage
   */
  async cleanupTempFiles(): Promise<{ filesDeleted: number; bytesFreed: number }> {
    let filesDeleted = 0;
    let bytesFreed = 0;

    const tempDir = path.join(this.localUploadDir, 'temp');

    if (!fs.existsSync(tempDir)) {
      return { filesDeleted, bytesFreed };
    }

    const cutoffTime = Date.now() - this.config.tempFileMaxAgeDays * 24 * 60 * 60 * 1000;
    const files = fs.readdirSync(tempDir);

    for (const file of files) {
      try {
        const filePath = path.join(tempDir, file);
        const stats = fs.statSync(filePath);

        if (stats.mtimeMs < cutoffTime) {
          fs.unlinkSync(filePath);
          filesDeleted++;
          bytesFreed += stats.size;
        }
      } catch (error) {
        console.error(`Error deleting temp file ${file}:`, error);
      }
    }

    return { filesDeleted, bytesFreed };
  }

  /**
   * Cleanup orphaned attachments (files not referenced in database)
   */
  async cleanupOrphanedAttachments(): Promise<{ filesDeleted: number; bytesFreed: number }> {
    let filesDeleted = 0;
    let bytesFreed = 0;

    // Get all attachment URLs from database
    const attachments = await prisma.leadAttachment.findMany({
      select: { fileUrl: true },
    });
    const academicDocs = await prisma.academicDocument.findMany({
      select: { fileUrl: true },
    });

    const allDbUrls = new Set([
      ...attachments.map((a) => a.fileUrl),
      ...academicDocs.map((d) => d.fileUrl),
    ]);

    // Check local uploads
    const localResult = await this.cleanupOrphanedLocalFiles(allDbUrls);
    filesDeleted += localResult.filesDeleted;
    bytesFreed += localResult.bytesFreed;

    // Check S3 if configured
    if (s3Service.isConfigured()) {
      const s3Result = await this.cleanupOrphanedS3Files(allDbUrls);
      filesDeleted += s3Result.filesDeleted;
      bytesFreed += s3Result.bytesFreed;
    }

    return { filesDeleted, bytesFreed };
  }

  /**
   * Cleanup orphaned local files
   */
  private async cleanupOrphanedLocalFiles(
    dbUrls: Set<string>
  ): Promise<{ filesDeleted: number; bytesFreed: number }> {
    let filesDeleted = 0;
    let bytesFreed = 0;

    if (!fs.existsSync(this.localUploadDir)) {
      return { filesDeleted, bytesFreed };
    }

    const cutoffTime = Date.now() - this.config.orphanedFileMaxAgeDays * 24 * 60 * 60 * 1000;

    const walkDir = (dir: string) => {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
          if (file !== 'temp') {
            walkDir(filePath);
          }
        } else {
          // Check if file is in database
          const isReferenced = Array.from(dbUrls).some((url) => url.includes(file));

          if (!isReferenced && stats.mtimeMs < cutoffTime) {
            try {
              fs.unlinkSync(filePath);
              filesDeleted++;
              bytesFreed += stats.size;
            } catch (error) {
              console.error(`Error deleting orphaned file ${filePath}:`, error);
            }
          }
        }
      }
    };

    walkDir(this.localUploadDir);

    return { filesDeleted, bytesFreed };
  }

  /**
   * Cleanup orphaned S3 files
   */
  private async cleanupOrphanedS3Files(
    dbUrls: Set<string>
  ): Promise<{ filesDeleted: number; bytesFreed: number }> {
    let filesDeleted = 0;
    let bytesFreed = 0;

    try {
      const s3Files = await s3Service.listFiles();
      const cutoffDate = new Date(
        Date.now() - this.config.orphanedFileMaxAgeDays * 24 * 60 * 60 * 1000
      );

      for (const file of s3Files) {
        // Check if file is in database
        const isReferenced = Array.from(dbUrls).some((url) => url.includes(file.key));

        if (!isReferenced && file.lastModified && file.lastModified < cutoffDate) {
          try {
            await s3Service.deleteFile(file.key);
            filesDeleted++;
            bytesFreed += file.size || 0;
          } catch (error) {
            console.error(`Error deleting S3 file ${file.key}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error listing S3 files:', error);
    }

    return { filesDeleted, bytesFreed };
  }

  /**
   * Cleanup old voice recordings
   */
  async cleanupOldVoiceRecordings(): Promise<{ filesDeleted: number; bytesFreed: number }> {
    let filesDeleted = 0;
    let bytesFreed = 0;

    const cutoffDate = new Date(
      Date.now() - this.config.voiceRecordingMaxAgeDays * 24 * 60 * 60 * 1000
    );

    // Find old voice transcripts with recordings
    const oldTranscripts = await prisma.voiceTranscript.findMany({
      where: {
        audioUrl: { not: null },
        timestamp: { lt: cutoffDate },
      },
      select: { id: true, audioUrl: true },
    });

    for (const transcript of oldTranscripts) {
      if (!transcript.audioUrl) continue;

      try {
        // Delete from storage
        if (transcript.audioUrl.includes('s3.amazonaws.com')) {
          const key = transcript.audioUrl.split('/').pop();
          if (key) await s3Service.deleteFile(key);
        } else {
          const filePath = path.join(this.localUploadDir, path.basename(transcript.audioUrl));
          if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            bytesFreed += stats.size;
            fs.unlinkSync(filePath);
          }
        }

        // Clear the URL in database
        await prisma.voiceTranscript.update({
          where: { id: transcript.id },
          data: { audioUrl: null },
        });

        filesDeleted++;
      } catch (error) {
        console.error(`Error deleting recording for transcript ${transcript.id}:`, error);
      }
    }

    // Also clean up outbound call recordings
    const oldCalls = await prisma.outboundCall.findMany({
      where: {
        recordingUrl: { not: null },
        createdAt: { lt: cutoffDate },
      },
      select: { id: true, recordingUrl: true },
    });

    for (const call of oldCalls) {
      if (!call.recordingUrl) continue;

      try {
        // Clear the URL in database (Twilio recordings are managed by Twilio)
        await prisma.outboundCall.update({
          where: { id: call.id },
          data: { recordingUrl: null },
        });

        filesDeleted++;
      } catch (error) {
        console.error(`Error clearing recording URL for call ${call.id}:`, error);
      }
    }

    return { filesDeleted, bytesFreed };
  }

  /**
   * Cleanup old email tracking events
   */
  async cleanupOldEmailTrackingEvents(): Promise<{ recordsDeleted: number }> {
    const cutoffDate = new Date(
      Date.now() - this.config.emailTrackingMaxAgeDays * 24 * 60 * 60 * 1000
    );

    const result = await prisma.emailTrackingEvent.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    return { recordsDeleted: result.count };
  }

  /**
   * Cleanup old webhook logs
   */
  async cleanupOldWebhookLogs(): Promise<{ recordsDeleted: number }> {
    const cutoffDate = new Date(
      Date.now() - this.config.webhookLogMaxAgeDays * 24 * 60 * 60 * 1000
    );

    const result = await prisma.webhookLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    return { recordsDeleted: result.count };
  }

  /**
   * Cleanup old call events
   */
  async cleanupOldCallEvents(): Promise<{ recordsDeleted: number }> {
    const cutoffDate = new Date(
      Date.now() - this.config.callEventMaxAgeDays * 24 * 60 * 60 * 1000
    );

    const result = await prisma.callEvent.deleteMany({
      where: {
        timestamp: { lt: cutoffDate },
      },
    });

    return { recordsDeleted: result.count };
  }

  /**
   * Check local storage usage
   */
  async getLocalStorageStats(): Promise<{
    totalSizeBytes: number;
    totalSizeMB: number;
    fileCount: number;
    breakdown: { [dir: string]: { sizeBytes: number; fileCount: number } };
  }> {
    let totalSizeBytes = 0;
    let fileCount = 0;
    const breakdown: { [dir: string]: { sizeBytes: number; fileCount: number } } = {};

    if (!fs.existsSync(this.localUploadDir)) {
      return { totalSizeBytes: 0, totalSizeMB: 0, fileCount: 0, breakdown: {} };
    }

    const getDirStats = (dir: string, relativePath: string = '') => {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
          const subPath = relativePath ? `${relativePath}/${file}` : file;
          getDirStats(filePath, subPath);
        } else {
          totalSizeBytes += stats.size;
          fileCount++;

          const dirKey = relativePath || 'root';
          if (!breakdown[dirKey]) {
            breakdown[dirKey] = { sizeBytes: 0, fileCount: 0 };
          }
          breakdown[dirKey].sizeBytes += stats.size;
          breakdown[dirKey].fileCount++;
        }
      }
    };

    getDirStats(this.localUploadDir);

    return {
      totalSizeBytes,
      totalSizeMB: Math.round((totalSizeBytes / 1024 / 1024) * 100) / 100,
      fileCount,
      breakdown,
    };
  }

  /**
   * Check if storage limit is exceeded and trigger cleanup
   */
  async checkAndCleanupIfNeeded(): Promise<CleanupResult | null> {
    const stats = await this.getLocalStorageStats();

    if (stats.totalSizeMB > this.config.localUploadMaxSizeMB) {
      console.log(
        `Storage limit exceeded (${stats.totalSizeMB}MB > ${this.config.localUploadMaxSizeMB}MB), running cleanup...`
      );
      return this.runFullCleanup();
    }

    return null;
  }

  /**
   * Get cleanup preview (what would be deleted)
   */
  async getCleanupPreview(): Promise<{
    tempFiles: { count: number; sizeBytes: number };
    orphanedFiles: { count: number; sizeBytes: number };
    voiceRecordings: { count: number };
    emailTrackingEvents: { count: number };
    webhookLogs: { count: number };
    callEvents: { count: number };
    totalEstimatedSizeBytes: number;
  }> {
    const tempCutoff = Date.now() - this.config.tempFileMaxAgeDays * 24 * 60 * 60 * 1000;
    const voiceCutoff = new Date(
      Date.now() - this.config.voiceRecordingMaxAgeDays * 24 * 60 * 60 * 1000
    );
    const trackingCutoff = new Date(
      Date.now() - this.config.emailTrackingMaxAgeDays * 24 * 60 * 60 * 1000
    );
    const webhookCutoff = new Date(
      Date.now() - this.config.webhookLogMaxAgeDays * 24 * 60 * 60 * 1000
    );
    const callEventCutoff = new Date(
      Date.now() - this.config.callEventMaxAgeDays * 24 * 60 * 60 * 1000
    );

    // Count temp files
    let tempFileCount = 0;
    let tempFileSize = 0;
    const tempDir = path.join(this.localUploadDir, 'temp');
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      for (const file of files) {
        const stats = fs.statSync(path.join(tempDir, file));
        if (stats.mtimeMs < tempCutoff) {
          tempFileCount++;
          tempFileSize += stats.size;
        }
      }
    }

    // Count database records
    const [voiceRecordings, emailEvents, webhookLogs, callEvents] = await Promise.all([
      prisma.voiceTranscript.count({
        where: { audioUrl: { not: null }, timestamp: { lt: voiceCutoff } },
      }),
      prisma.emailTrackingEvent.count({
        where: { createdAt: { lt: trackingCutoff } },
      }),
      prisma.webhookLog.count({
        where: { createdAt: { lt: webhookCutoff } },
      }),
      prisma.callEvent.count({
        where: { timestamp: { lt: callEventCutoff } },
      }),
    ]);

    // Scan for orphaned files
    const orphanedFilesResult = await this.scanForOrphanedFiles();

    return {
      tempFiles: { count: tempFileCount, sizeBytes: tempFileSize },
      orphanedFiles: { count: orphanedFilesResult.count, sizeBytes: orphanedFilesResult.sizeBytes },
      voiceRecordings: { count: voiceRecordings },
      emailTrackingEvents: { count: emailEvents },
      webhookLogs: { count: webhookLogs },
      callEvents: { count: callEvents },
      totalEstimatedSizeBytes: tempFileSize + orphanedFilesResult.sizeBytes,
    };
  }
  /**
   * Scan for orphaned files without deleting them (for preview)
   */
  async scanForOrphanedFiles(): Promise<{ count: number; sizeBytes: number }> {
    let count = 0;
    let sizeBytes = 0;

    if (!fs.existsSync(this.localUploadDir)) {
      return { count, sizeBytes };
    }

    // Get all attachment URLs from database
    const attachments = await prisma.leadAttachment.findMany({
      select: { fileUrl: true },
    });
    const academicDocs = await prisma.academicDocument.findMany({
      select: { fileUrl: true },
    });

    const allDbUrls = new Set([
      ...attachments.map((a) => a.fileUrl),
      ...academicDocs.map((d) => d.fileUrl),
    ]);

    const cutoffTime = Date.now() - this.config.orphanedFileMaxAgeDays * 24 * 60 * 60 * 1000;

    const walkDir = (dir: string) => {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
          if (file !== 'temp') {
            walkDir(filePath);
          }
        } else {
          // Check if file is in database
          const isReferenced = Array.from(allDbUrls).some((url) => url.includes(file));

          if (!isReferenced && stats.mtimeMs < cutoffTime) {
            count++;
            sizeBytes += stats.size;
          }
        }
      }
    };

    walkDir(this.localUploadDir);

    // Also check S3 if configured
    if (s3Service.isConfigured()) {
      try {
        const s3Files = await s3Service.listFiles();
        const cutoffDate = new Date(cutoffTime);

        for (const file of s3Files) {
          const isReferenced = Array.from(allDbUrls).some((url) => url.includes(file.key));

          if (!isReferenced && file.lastModified && file.lastModified < cutoffDate) {
            count++;
            sizeBytes += file.size || 0;
          }
        }
      } catch (error) {
        console.error('Error listing S3 files for orphan scan:', error);
      }
    }

    return { count, sizeBytes };
  }
}

export const fileCleanupService = new FileCleanupService();
