import { Router, Response } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { ApiResponse } from '../utils/apiResponse';
import { voiceMinutesService } from '../services/voice-minutes.service';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(tenantMiddleware);

/**
 * Get voice minutes usage for the organization
 * GET /voice-minutes/usage
 */
router.get('/usage', async (req: TenantRequest, res: Response) => {
  try {
    const usage = await voiceMinutesService.getOrganizationUsage(req.organizationId!);
    return ApiResponse.success(res, 'Voice minutes usage retrieved', usage);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

/**
 * Check if current user can make a call
 * GET /voice-minutes/check
 */
router.get('/check', async (req: TenantRequest, res: Response) => {
  try {
    const result = await voiceMinutesService.checkUsage(
      req.organizationId!,
      req.user?.id
    );
    return ApiResponse.success(res, 'Usage check completed', result);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

/**
 * Set voice minutes limit for a user (Admin only)
 * PUT /voice-minutes/users/:userId/limit
 */
router.put('/users/:userId/limit', authorize('admin', 'manager'), async (req: TenantRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit } = req.body;

    // Validate limit
    if (limit !== null && (typeof limit !== 'number' || limit < 0)) {
      return ApiResponse.error(res, 'Limit must be a positive number or null for unlimited', 400);
    }

    await voiceMinutesService.setUserLimit(req.organizationId!, userId, limit);

    return ApiResponse.success(res, 'User voice minutes limit updated', { userId, limit });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.message.includes('not found') ? 404 : 500);
  }
});

/**
 * Set voice minutes limits for multiple users at once (Admin only)
 * PUT /voice-minutes/users/bulk-limit
 */
router.put('/users/bulk-limit', authorize('admin', 'manager'), async (req: TenantRequest, res: Response) => {
  try {
    const { users } = req.body;

    if (!Array.isArray(users) || users.length === 0) {
      return ApiResponse.error(res, 'Users array is required', 400);
    }

    const results = [];
    for (const { userId, limit } of users) {
      try {
        await voiceMinutesService.setUserLimit(req.organizationId!, userId, limit);
        results.push({ userId, limit, success: true });
      } catch (error: any) {
        results.push({ userId, limit, success: false, error: error.message });
      }
    }

    return ApiResponse.success(res, 'Bulk limits updated', results);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

/**
 * Get all users with their voice minutes usage (Admin only)
 * GET /voice-minutes/users
 */
router.get('/users', authorize('admin', 'manager'), async (req: TenantRequest, res: Response) => {
  try {
    const usage = await voiceMinutesService.getOrganizationUsage(req.organizationId!);
    return ApiResponse.success(res, 'Users voice minutes retrieved', usage.userBreakdown);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

/**
 * Reset user's voice minutes usage (Admin only - for special cases)
 * POST /voice-minutes/users/:userId/reset
 */
router.post('/users/:userId/reset', authorize('admin'), async (req: TenantRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { prisma } = await import('../config/database');

    // Verify user belongs to organization
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId: req.organizationId! },
    });

    if (!user) {
      return ApiResponse.error(res, 'User not found in organization', 404);
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        voiceMinutesUsed: 0,
        voiceMinutesResetAt: new Date(),
      },
    });

    return ApiResponse.success(res, 'User voice minutes usage reset', { userId });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

/**
 * Set organization voice minutes limit (Super admin only - override plan)
 * PUT /voice-minutes/organization/limit
 */
router.put('/organization/limit', authorize('admin'), async (req: TenantRequest, res: Response) => {
  try {
    const { limit } = req.body;

    // Validate limit
    if (limit !== null && (typeof limit !== 'number' || limit < 0)) {
      return ApiResponse.error(res, 'Limit must be a positive number or null for plan default', 400);
    }

    await voiceMinutesService.setOrganizationLimit(req.organizationId!, limit);

    return ApiResponse.success(res, 'Organization voice minutes limit updated', { limit });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

export default router;
