/**
 * Conversational AI Agent Routes
 *
 * Manages conversational AI agent creation, sync, and WebSocket connections
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { ApiResponse } from '../utils/apiResponse';
import { conversationalAIService } from '../integrations/conversational-ai.service';
import { prisma } from '../config/database';

const router = Router();

// ==================== PUBLIC ENDPOINTS ====================

/**
 * Get signed WebSocket URL for an agent (for widget/frontend)
 */
router.get('/agents/:agentId/websocket-url', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;

    if (!conversationalAIService.isAvailable()) {
      return ApiResponse.error(res, 'Conversational AI API not configured', 503);
    }

    const signedUrl = await conversationalAIService.getAgentWebSocketUrl(agentId);

    ApiResponse.success(res, 'WebSocket URL generated', {
      signedUrl,
      agentId,
      expiresIn: 300,
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Check Conversational AI service status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const isAvailable = conversationalAIService.isAvailable();

    if (!isAvailable) {
      return ApiResponse.success(res, 'Conversational AI status', {
        available: false,
        message: 'Conversational AI API key not configured',
      });
    }

    try {
      const agents = await conversationalAIService.listAgents();
      ApiResponse.success(res, 'Conversational AI status', {
        available: true,
        agentCount: agents.length,
      });
    } catch {
      ApiResponse.success(res, 'Conversational AI status', {
        available: false,
        message: 'API key invalid',
      });
    }
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// ==================== AUTHENTICATED ENDPOINTS ====================

router.use(authenticate);
router.use(tenantMiddleware);

/**
 * Create a new agent
 */
router.post('/agents', async (req: TenantRequest, res: Response) => {
  try {
    const {
      name,
      industry,
      useCase,
      systemPrompt,
      firstMessage,
      voiceId,
      language,
      llm,
      website,
      mainGoal,
      knowledgeBase,
    } = req.body;

    if (!name || !mainGoal) {
      return ApiResponse.error(res, 'Name and mainGoal are required', 400);
    }

    // Generate system prompt if not provided
    const finalSystemPrompt = systemPrompt || generateSystemPrompt(industry, useCase, mainGoal);
    const finalFirstMessage = firstMessage || generateFirstMessage(name);

    // Create in VoiceBridge database first
    const voiceBridgeAgent = await prisma.voiceAgent.create({
      data: {
        organizationId: req.organizationId!,
        name,
        industry: mapIndustry(industry),
        systemPrompt: finalSystemPrompt,
        greeting: finalFirstMessage,
        voiceId: voiceId || 'voice-21m00Tcm4TlvDq8ikWAM',
        language: language || 'en',
        knowledgeBase: knowledgeBase ? JSON.stringify(knowledgeBase) : null,
        createdById: req.user?.id,
        metadata: {
          useCase,
          website,
          mainGoal,
          llm: llm || 'gemini-2.5-flash',
          provider: 'conversational-ai',
          createdVia: 'wizard',
        },
      },
    });

    // Try to sync to Conversational AI platform if configured
    let conversationalAIAgentId = null;
    if (conversationalAIService.isAvailable()) {
      try {
        const result = await conversationalAIService.createAgent({
          name,
          systemPrompt: finalSystemPrompt,
          firstMessage: finalFirstMessage,
          voiceId: voiceId || '21m00Tcm4TlvDq8ikWAM',
          language,
          knowledgeBase: typeof knowledgeBase === 'string' ? knowledgeBase : JSON.stringify(knowledgeBase),
        });

        conversationalAIAgentId = result.agentId;

        // Update VoiceBridge agent with Conversational AI ID
        await prisma.voiceAgent.update({
          where: { id: voiceBridgeAgent.id },
          data: {
            metadata: {
              ...(voiceBridgeAgent.metadata as object),
              conversationalAIAgentId: result.agentId,
              conversationalAISyncedAt: new Date().toISOString(),
            },
          },
        });
      } catch (syncError) {
        console.warn('[ConversationalAI] Failed to sync agent:', (syncError as Error).message);
      }
    }

    ApiResponse.success(res, 'Agent created', {
      voiceBridgeAgentId: voiceBridgeAgent.id,
      conversationalAIAgentId,
      agent: voiceBridgeAgent,
    }, 201);
  } catch (error) {
    console.error('[ConversationalAI] Create agent error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Sync agent to Conversational AI platform
 */
router.post('/agents/:agentId/sync', async (req: TenantRequest, res: Response) => {
  try {
    const { agentId } = req.params;

    if (!conversationalAIService.isAvailable()) {
      return ApiResponse.error(res, 'Conversational AI API not configured', 503);
    }

    const agent = await prisma.voiceAgent.findFirst({
      where: {
        id: agentId,
        organizationId: req.organizationId,
      },
    });

    if (!agent) {
      return ApiResponse.error(res, 'Agent not found', 404);
    }

    const conversationalAIAgentId = await conversationalAIService.syncAgentToConversationalAI(agentId);

    ApiResponse.success(res, 'Agent synced to Voice Platform', {
      voiceBridgeAgentId: agentId,
      conversationalAIAgentId,
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * List all Conversational AI agents
 */
router.get('/agents', async (req: TenantRequest, res: Response) => {
  try {
    if (!conversationalAIService.isAvailable()) {
      return ApiResponse.error(res, 'Conversational AI API not configured', 503);
    }

    const agents = await conversationalAIService.listAgents();

    ApiResponse.success(res, 'Agents retrieved', { agents });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Get conversations for an agent
 */
router.get('/agents/:agentId/conversations', async (req: TenantRequest, res: Response) => {
  try {
    const { agentId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!conversationalAIService.isAvailable()) {
      return ApiResponse.error(res, 'Conversational AI API not configured', 503);
    }

    const agent = await prisma.voiceAgent.findFirst({
      where: {
        id: agentId,
        organizationId: req.organizationId,
      },
    });

    if (!agent) {
      return ApiResponse.error(res, 'Agent not found', 404);
    }

    const metadata = (agent.metadata as any) || {};
    if (!metadata.conversationalAIAgentId) {
      return ApiResponse.error(res, 'Agent not synced to Voice Platform', 400);
    }

    const conversations = await conversationalAIService.getConversations(
      metadata.conversationalAIAgentId,
      limit
    );

    ApiResponse.success(res, 'Conversations retrieved', { conversations });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Helper functions
function generateSystemPrompt(industry: string, useCase: string, mainGoal: string): string {
  const industryName = (industry || 'business').replace(/_/g, ' ');
  const useCaseName = (useCase || 'customer support').replace(/_/g, ' ');

  return `### Personality
You are a friendly and knowledgeable ${useCaseName} advisor for a ${industryName} organization. You are personable, patient, and genuinely interested in understanding the prospect's needs. You aim to provide helpful information without being pushy.

### Goals
${mainGoal}

### Guidelines
- Be warm and professional in all interactions
- Listen actively and ask clarifying questions
- Provide accurate information based on your knowledge base
- If you don't know something, be honest and offer to connect them with a human representative
- Always maintain a helpful and positive tone`;
}

function generateFirstMessage(agentName: string): string {
  return `[warmly] Hello there! My name is ${agentName}, and I'm here to help you today. How can I assist you?`;
}

function mapIndustry(industry: string): string {
  const mapping: Record<string, string> = {
    education: 'EDUCATION',
    real_estate: 'REAL_ESTATE',
    healthcare: 'HEALTHCARE',
    finance: 'FINANCE',
    retail: 'ECOMMERCE',
    technology: 'IT_RECRUITMENT',
    hospitality: 'CUSTOMER_CARE',
    automotive: 'CUSTOM',
    professional: 'CUSTOM',
    government: 'CUSTOM',
    food: 'CUSTOMER_CARE',
    manufacturing: 'CUSTOM',
    fitness: 'HEALTHCARE',
    legal: 'CUSTOM',
    nonprofit: 'CUSTOM',
    media: 'CUSTOM',
    other: 'CUSTOM',
  };

  return mapping[industry] || 'CUSTOM';
}

export default router;
