/**
 * RAG Routes - API endpoints for RAG operations
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { ApiResponse } from '../utils/apiResponse';
import { ragService } from '../services/rag.service';
import { prisma } from '../config/database';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(tenantMiddleware);

/**
 * POST /agents/:agentId/rag/index
 * Trigger indexing of agent's knowledge base
 */
router.post('/agents/:agentId/rag/index', async (req: TenantRequest, res: Response) => {
  try {
    const { agentId } = req.params;

    // Verify agent belongs to organization
    const agent = await prisma.voiceAgent.findFirst({
      where: {
        id: agentId,
        organizationId: req.organizationId,
      },
    });

    if (!agent) {
      return ApiResponse.error(res, 'Agent not found', 404);
    }

    // Start indexing
    const result = await ragService.indexKnowledgeBase(agentId);

    ApiResponse.success(res, 'Knowledge base indexed successfully', {
      agentId,
      chunksCreated: result.chunksCreated,
      sourceTypes: result.sourceTypes,
    });
  } catch (error) {
    console.error('[RAG] Indexing error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * GET /agents/:agentId/rag/status
 * Get indexing status for an agent
 */
router.get('/agents/:agentId/rag/status', async (req: TenantRequest, res: Response) => {
  try {
    const { agentId } = req.params;

    // Verify agent belongs to organization
    const agent = await prisma.voiceAgent.findFirst({
      where: {
        id: agentId,
        organizationId: req.organizationId,
      },
    });

    if (!agent) {
      return ApiResponse.error(res, 'Agent not found', 404);
    }

    const status = await ragService.getIndexStatus(agentId);

    ApiResponse.success(res, 'Index status retrieved', {
      agentId,
      ...status,
    });
  } catch (error) {
    console.error('[RAG] Status error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * POST /agents/:agentId/rag/search
 * Test search on agent's knowledge base
 */
router.post('/agents/:agentId/rag/search', async (req: TenantRequest, res: Response) => {
  try {
    const { agentId } = req.params;
    const { query, searchType = 'hybrid', topK = 5, similarityThreshold = 0.5 } = req.body;

    if (!query) {
      return ApiResponse.error(res, 'Query is required', 400);
    }

    // Verify agent belongs to organization
    const agent = await prisma.voiceAgent.findFirst({
      where: {
        id: agentId,
        organizationId: req.organizationId,
      },
    });

    if (!agent) {
      return ApiResponse.error(res, 'Agent not found', 404);
    }

    let results;
    const options = { topK, similarityThreshold };

    switch (searchType) {
      case 'semantic':
        results = await ragService.semanticSearch(agentId, query, options);
        break;
      case 'keyword':
        results = await ragService.keywordSearch(agentId, query, topK);
        break;
      case 'hybrid':
      default:
        results = await ragService.hybridSearch(agentId, query, options);
        break;
    }

    ApiResponse.success(res, 'Search completed', {
      query,
      searchType,
      results,
      resultCount: results.length,
    });
  } catch (error) {
    console.error('[RAG] Search error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * GET /agents/:agentId/rag/chunks
 * View indexed chunks for an agent
 */
router.get('/agents/:agentId/rag/chunks', async (req: TenantRequest, res: Response) => {
  try {
    const { agentId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    // Verify agent belongs to organization
    const agent = await prisma.voiceAgent.findFirst({
      where: {
        id: agentId,
        organizationId: req.organizationId,
      },
    });

    if (!agent) {
      return ApiResponse.error(res, 'Agent not found', 404);
    }

    const result = await ragService.getChunks(agentId, page, pageSize);

    ApiResponse.success(res, 'Chunks retrieved', {
      agentId,
      ...result,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('[RAG] Get chunks error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * DELETE /agents/:agentId/rag/index
 * Clear indexed chunks for an agent
 */
router.delete('/agents/:agentId/rag/index', async (req: TenantRequest, res: Response) => {
  try {
    const { agentId } = req.params;

    // Verify agent belongs to organization
    const agent = await prisma.voiceAgent.findFirst({
      where: {
        id: agentId,
        organizationId: req.organizationId,
      },
    });

    if (!agent) {
      return ApiResponse.error(res, 'Agent not found', 404);
    }

    const deletedCount = await ragService.clearAgentIndex(agentId);

    ApiResponse.success(res, 'Index cleared successfully', {
      agentId,
      chunksDeleted: deletedCount,
    });
  } catch (error) {
    console.error('[RAG] Clear index error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * POST /agents/:agentId/rag/context
 * Get RAG context for a query (used internally for prompt building)
 */
router.post('/agents/:agentId/rag/context', async (req: TenantRequest, res: Response) => {
  try {
    const { agentId } = req.params;
    const { query, maxTokens = 2000 } = req.body;

    if (!query) {
      return ApiResponse.error(res, 'Query is required', 400);
    }

    // Verify agent belongs to organization
    const agent = await prisma.voiceAgent.findFirst({
      where: {
        id: agentId,
        organizationId: req.organizationId,
      },
      select: {
        id: true,
        ragSettings: true,
      },
    });

    if (!agent) {
      return ApiResponse.error(res, 'Agent not found', 404);
    }

    // Get RAG settings
    const ragSettings = (agent.ragSettings as any) || {};
    const topK = ragSettings.topK || 5;
    const similarityThreshold = ragSettings.similarityThreshold || 0.5;
    const searchType = ragSettings.searchType || 'hybrid';

    let results;
    const options = { topK, similarityThreshold };

    switch (searchType) {
      case 'semantic':
        results = await ragService.semanticSearch(agentId, query, options);
        break;
      case 'keyword':
        results = await ragService.keywordSearch(agentId, query, topK);
        break;
      case 'hybrid':
      default:
        results = await ragService.hybridSearch(agentId, query, options);
        break;
    }

    const context = ragService.buildContextFromResults(results, maxTokens);

    ApiResponse.success(res, 'Context retrieved', {
      query,
      context,
      resultCount: results.length,
      results: results.map(r => ({
        sourceType: r.sourceType,
        sourceName: r.sourceName,
        similarity: r.similarity,
      })),
    });
  } catch (error) {
    console.error('[RAG] Context error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

export default router;
