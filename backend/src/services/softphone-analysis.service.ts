/**
 * Softphone Call Analysis Service
 * Downloads recordings and triggers existing AI analysis pipeline
 *
 * Uses the comprehensive TelecallerCallFinalizationService which includes:
 * - Transcription (Deepgram/Sarvam/Whisper)
 * - Sentiment Analysis
 * - Outcome Detection
 * - Summary Generation
 * - Lead Scoring
 * - Lead Lifecycle Integration
 * - Auto Follow-up Scheduling
 * - Coaching Suggestions
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { telecallerCallFinalizationService } from './telecaller-call-finalization.service';

class SoftphoneAnalysisService {
  /**
   * Download recording from Exotel and trigger AI analysis
   */
  async analyzeCall(callId: string, recordingUrl: string): Promise<boolean> {
    console.log(`[SoftphoneAnalysis] Starting analysis for call ${callId}`);

    try {
      // 1. Download recording from Exotel
      const tempFilePath = await this.downloadRecording(callId, recordingUrl);
      if (!tempFilePath) {
        console.error(`[SoftphoneAnalysis] Failed to download recording for call ${callId}`);
        return false;
      }

      console.log(`[SoftphoneAnalysis] Downloaded recording to: ${tempFilePath}`);

      // 2. Use existing comprehensive AI analysis service
      try {
        await telecallerCallFinalizationService.processRecording(callId, tempFilePath);
        console.log(`[SoftphoneAnalysis] AI analysis completed for call ${callId}`);
        return true;
      } finally {
        // 3. Clean up temp file
        try {
          fs.unlinkSync(tempFilePath);
          console.log(`[SoftphoneAnalysis] Cleaned up temp file: ${tempFilePath}`);
        } catch (cleanupError) {
          console.warn(`[SoftphoneAnalysis] Failed to cleanup temp file: ${tempFilePath}`);
        }
      }
    } catch (error) {
      console.error(`[SoftphoneAnalysis] Error analyzing call ${callId}:`, error);
      return false;
    }
  }

  /**
   * Download recording from Exotel URL to temp file
   */
  private async downloadRecording(callId: string, recordingUrl: string): Promise<string | null> {
    try {
      // Exotel recordings require authentication
      const exotelApiKey = process.env.EXOTEL_API_KEY;
      const exotelApiToken = process.env.EXOTEL_API_TOKEN;

      console.log(`[SoftphoneAnalysis] Downloading recording from: ${recordingUrl}`);

      const response = await axios.get(recordingUrl, {
        responseType: 'arraybuffer',
        auth: exotelApiKey && exotelApiToken ? {
          username: exotelApiKey,
          password: exotelApiToken,
        } : undefined,
        timeout: 120000, // 2 minute timeout for large files
        headers: {
          'Accept': 'audio/*',
        },
      });

      // Determine file extension from content-type or URL
      const contentType = response.headers['content-type'] || '';
      let ext = '.mp3';
      if (contentType.includes('wav')) ext = '.wav';
      else if (contentType.includes('ogg')) ext = '.ogg';
      else if (contentType.includes('m4a')) ext = '.m4a';
      else if (recordingUrl.includes('.wav')) ext = '.wav';
      else if (recordingUrl.includes('.ogg')) ext = '.ogg';

      // Save to temp file
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `softphone-${callId}${ext}`);
      fs.writeFileSync(tempFilePath, Buffer.from(response.data));

      const fileSize = fs.statSync(tempFilePath).size;
      console.log(`[SoftphoneAnalysis] Downloaded ${fileSize} bytes to ${tempFilePath}`);

      return tempFilePath;
    } catch (error: any) {
      console.error('[SoftphoneAnalysis] Error downloading recording:', error.message);
      return null;
    }
  }

  /**
   * Queue a call for analysis (async processing)
   */
  async queueForAnalysis(callId: string, recordingUrl: string): Promise<void> {
    // Run analysis asynchronously without blocking
    setImmediate(async () => {
      try {
        await this.analyzeCall(callId, recordingUrl);
      } catch (error) {
        console.error(`[SoftphoneAnalysis] Queued analysis failed for ${callId}:`, error);
      }
    });
  }
}

export const softphoneAnalysisService = new SoftphoneAnalysisService();
