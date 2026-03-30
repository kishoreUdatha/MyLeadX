/**
 * Voice AI Service - Orchestration Layer
 *
 * This service acts as a facade/orchestrator that delegates to specialized services:
 * - voiceAgentService: Agent CRUD operations
 * - voiceSessionService: Session lifecycle management
 * - voiceLeadIntegrationService: Lead creation and CRM integration
 * - voiceCloningService: Voice cloning with ElevenLabs
 * - voiceSpeechService: Speech-to-text and text-to-speech
 *
 * Following SOLID principles:
 * - Single Responsibility: Each service handles one concern
 * - Open/Closed: Easy to extend without modifying existing services
 * - Dependency Inversion: Services depend on abstractions
 */

import { VoiceAgentIndustry, VoiceSessionStatus } from '@prisma/client';

// Import specialized services
import {
  voiceAgentService,
  createAgent,
  getAgent,
  getAgents,
  updateAgent,
  deleteAgent,
  getTemplate,
  getAllTemplates,
} from '../services/voice-agent.service';

import {
  voiceSessionService,
  startSession,
  processMessage,
  addTranscript,
  endSession,
  getSession,
  getAgentSessions,
  getAgentAnalytics,
} from '../services/voice-session.service';

import {
  voiceLeadIntegrationService,
  createLeadFromSession,
} from '../services/voice-lead-integration.service';

import {
  voiceCloningService,
  cloneVoice,
  getCustomVoices,
  deleteCustomVoice,
  getCustomVoiceAudio,
  generateElevenLabsTTS,
} from '../services/voice-cloning.service';

import {
  voiceSpeechService,
  speechToText,
  textToSpeech,
  isConfigured,
} from '../services/voice-speech.service';

// Re-export industry templates for backward compatibility
import { INDUSTRY_TEMPLATES } from '../config/voice-agent-templates.config';
export const industryTemplates = INDUSTRY_TEMPLATES;

/**
 * VoiceAIService - Unified interface for voice AI operations
 * Maintains backward compatibility while delegating to specialized services
 */
class VoiceAIService {
  // ==================== CONFIGURATION ====================

  private isConfigured(): boolean {
    return isConfigured();
  }

  // ==================== TEMPLATES ====================

  getTemplate(industry: VoiceAgentIndustry) {
    return getTemplate(industry);
  }

  getAllTemplates() {
    return getAllTemplates();
  }

  // ==================== AGENT CRUD ====================

  async createAgent(data: {
    organizationId: string;
    name: string;
    industry: VoiceAgentIndustry;
    customPrompt?: string;
    customQuestions?: any[];
    createdById?: string;
  }) {
    return createAgent(data);
  }

  async getAgent(agentId: string) {
    return getAgent(agentId);
  }

  async getAgents(organizationId: string) {
    return getAgents(organizationId);
  }

  async updateAgent(agentId: string, data: any) {
    return updateAgent(agentId, data);
  }

  async deleteAgent(agentId: string) {
    return deleteAgent(agentId);
  }

  // ==================== SESSION MANAGEMENT ====================

  async startSession(agentId: string, visitorInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    ip?: string;
    device?: string;
  }) {
    return startSession(agentId, visitorInfo);
  }

  async processMessage(sessionId: string, userMessage: string): Promise<{
    response: string;
    audioBuffer?: Buffer;
    qualification?: any;
    shouldEnd?: boolean;
  }> {
    const result = await processMessage(sessionId, userMessage);

    // Generate audio if needed
    let audioBuffer: Buffer | undefined;
    if (result.response && this.isConfigured()) {
      try {
        audioBuffer = await this.textToSpeech(result.response);
      } catch (error) {
        console.error('[VoiceAI] TTS error:', error);
      }
    }

    return {
      ...result,
      audioBuffer,
    };
  }

  async addTranscript(sessionId: string, role: string, content: string, audioUrl?: string, duration?: number) {
    return addTranscript(sessionId, role, content, audioUrl, duration);
  }

  async endSession(sessionId: string, status: VoiceSessionStatus = 'COMPLETED') {
    return endSession(sessionId, status);
  }

  async getSession(sessionId: string) {
    return getSession(sessionId);
  }

  async getAgentSessions(agentId: string, limit: number = 50) {
    return getAgentSessions(agentId, limit);
  }

  async getAgentAnalytics(agentId: string, days: number = 30) {
    return getAgentAnalytics(agentId, days);
  }

  // ==================== SPEECH PROCESSING ====================

  async speechToText(audioBuffer: Buffer, format: string = 'webm'): Promise<string> {
    return speechToText(audioBuffer, format);
  }

  async textToSpeech(text: string, voice: string = 'alloy'): Promise<Buffer> {
    return textToSpeech(text, voice);
  }

  // ==================== VOICE CLONING ====================

  async cloneVoice(params: {
    organizationId: string;
    name: string;
    audioBuffer: Buffer;
    mimeType: string;
  }) {
    return cloneVoice(params);
  }

  async getCustomVoices(organizationId: string) {
    return getCustomVoices(organizationId);
  }

  async deleteCustomVoice(voiceId: string, organizationId: string) {
    return deleteCustomVoice(voiceId, organizationId);
  }

  async getCustomVoiceAudio(voiceId: string, organizationId: string) {
    return getCustomVoiceAudio(voiceId, organizationId);
  }

  async generateElevenLabsTTS(text: string, voiceId: string): Promise<Buffer> {
    return generateElevenLabsTTS(text, voiceId);
  }
}

// Export singleton instance
export const voiceAIService = new VoiceAIService();

// Re-export individual services for direct access
export {
  voiceAgentService,
  voiceSessionService,
  voiceLeadIntegrationService,
  voiceCloningService,
  voiceSpeechService,
};

export default voiceAIService;
