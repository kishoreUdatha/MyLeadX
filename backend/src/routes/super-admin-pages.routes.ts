import { Router, Request, Response } from 'express';
import { query, body, param } from 'express-validator';
import { validate } from '../middlewares/validate';
import { prisma } from '../config/database';

const router = Router();

// ==================== USAGE & METERING ====================

/**
 * GET /usage/overview - Platform-wide usage summary
 */
router.get('/usage/overview', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Get all usage records for current month
    const usageRecords = await prisma.usageTracking.findMany({
      where: { month, year },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    // Aggregate totals
    const totals = usageRecords.reduce(
      (acc, record) => ({
        aiCalls: acc.aiCalls + record.aiCallsCount,
        aiMinutes: acc.aiMinutes + record.voiceMinutesUsed,
        sms: acc.sms + record.smsCount,
        emails: acc.emails + record.emailsCount,
        whatsapp: acc.whatsapp + record.whatsappCount,
        leads: acc.leads + record.leadsCount,
      }),
      { aiCalls: 0, aiMinutes: 0, sms: 0, emails: 0, whatsapp: 0, leads: 0 }
    );

    // Get tenants near limits (>80% usage)
    const tenantsNearLimits = usageRecords.filter(record => {
      // Simple check - you could enhance with actual plan limits
      return record.voiceMinutesUsed > 800 || record.smsCount > 1600;
    }).length;

    res.json({
      success: true,
      data: {
        totals,
        tenantsWithUsage: usageRecords.length,
        tenantsNearLimits,
        month,
        year,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /usage/tenants - Per-tenant usage with pagination
 */
router.get('/usage/tenants', validate([
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString(),
]), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const skip = (page - 1) * limit;

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const where: any = { month, year };
    if (search) {
      where.organization = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [usageRecords, total] = await Promise.all([
      prisma.usageTracking.findMany({
        where,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              activePlan: { select: { name: true, slug: true } },
            },
          },
        },
        orderBy: { voiceMinutesUsed: 'desc' },
        skip,
        take: limit,
      }),
      prisma.usageTracking.count({ where }),
    ]);

    res.json({
      success: true,
      data: usageRecords,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /usage/trends - Usage trends over time
 */
router.get('/usage/trends', validate([
  query('months').optional().isInt({ min: 1, max: 12 }),
]), async (req: Request, res: Response) => {
  try {
    const months = parseInt(req.query.months as string) || 6;
    const trends = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      const usage = await prisma.usageTracking.aggregate({
        where: { month, year },
        _sum: {
          aiCallsCount: true,
          voiceMinutesUsed: true,
          smsCount: true,
          emailsCount: true,
          whatsappCount: true,
          leadsCount: true,
        },
      });

      trends.push({
        month,
        year,
        label: `${date.toLocaleString('default', { month: 'short' })} ${year}`,
        aiCalls: usage._sum.aiCallsCount || 0,
        aiMinutes: usage._sum.voiceMinutesUsed || 0,
        sms: usage._sum.smsCount || 0,
        emails: usage._sum.emailsCount || 0,
        whatsapp: usage._sum.whatsappCount || 0,
        leads: usage._sum.leadsCount || 0,
      });
    }

    res.json({ success: true, data: trends });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /usage/adjust/:orgId - Manual usage adjustment
 */
router.post('/usage/adjust/:orgId', validate([
  param('orgId').isUUID(),
  body('type').isIn(['aiCallsCount', 'voiceMinutesUsed', 'smsCount', 'emailsCount', 'whatsappCount', 'leadsCount']),
  body('amount').isInt(),
  body('reason').notEmpty(),
]), async (req: Request, res: Response) => {
  try {
    const { type, amount, reason } = req.body;
    const { orgId } = req.params;

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const usage = await prisma.usageTracking.upsert({
      where: {
        organizationId_month_year: {
          organizationId: orgId,
          month,
          year,
        },
      },
      update: {
        [type]: { increment: amount },
      },
      create: {
        organizationId: orgId,
        month,
        year,
        [type]: amount > 0 ? amount : 0,
      },
    });

    // Log audit
    await prisma.superAdminAuditLog.create({
      data: {
        actorType: 'superadmin',
        actorId: (req as any).superAdmin?.userId,
        organizationId: orgId,
        action: 'usage_adjusted',
        description: `Adjusted ${type} by ${amount}: ${reason}`,
        changes: { type, amount, reason },
      },
    });

    res.json({ success: true, data: usage });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== AI CONTROL ====================

/**
 * GET /ai/overview - AI usage stats
 */
router.get('/ai/overview', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Get AI usage from current month
    const usage = await prisma.usageTracking.aggregate({
      where: { month, year },
      _sum: {
        aiCallsCount: true,
        voiceMinutesUsed: true,
      },
    });

    // Get voice agent counts
    const agentStats = await prisma.voiceAgent.groupBy({
      by: ['status'],
      _count: true,
    });

    // Get call stats
    const callStats = await prisma.voiceAgentCall.aggregate({
      where: {
        createdAt: {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 1),
        },
      },
      _count: true,
      _sum: {
        duration: true,
        cost: true,
      },
      _avg: {
        duration: true,
      },
    });

    res.json({
      success: true,
      data: {
        totalAICalls: usage._sum.aiCallsCount || 0,
        totalAIMinutes: usage._sum.voiceMinutesUsed || 0,
        agentsByStatus: agentStats.reduce((acc, s) => {
          acc[s.status] = s._count;
          return acc;
        }, {} as Record<string, number>),
        callsThisMonth: callStats._count || 0,
        totalCallDuration: callStats._sum.duration || 0,
        totalCallCost: callStats._sum.cost || 0,
        avgCallDuration: callStats._avg.duration || 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /ai/agents - All voice agents across tenants
 */
router.get('/ai/agents', validate([
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isString(),
  query('search').optional().isString(),
]), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const search = req.query.search as string;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { organization: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [agents, total] = await Promise.all([
      prisma.voiceAgent.findMany({
        where,
        include: {
          organization: {
            select: { id: true, name: true, slug: true },
          },
          _count: {
            select: { calls: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.voiceAgent.count({ where }),
    ]);

    res.json({
      success: true,
      data: agents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /ai/models - Available AI models/voices
 */
router.get('/ai/models', async (req: Request, res: Response) => {
  try {
    // Return configured AI models and voices
    const models = [
      { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI', costPer1kTokens: 0.03 },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI', costPer1kTokens: 0.01 },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI', costPer1kTokens: 0.002 },
      { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic', costPer1kTokens: 0.015 },
      { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic', costPer1kTokens: 0.003 },
    ];

    const voices = [
      { id: 'rachel', name: 'Rachel', provider: 'ElevenLabs', gender: 'female', language: 'en' },
      { id: 'josh', name: 'Josh', provider: 'ElevenLabs', gender: 'male', language: 'en' },
      { id: 'bella', name: 'Bella', provider: 'ElevenLabs', gender: 'female', language: 'en' },
      { id: 'adam', name: 'Adam', provider: 'ElevenLabs', gender: 'male', language: 'en' },
    ];

    res.json({
      success: true,
      data: { models, voices },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /ai/costs - AI cost breakdown
 */
router.get('/ai/costs', validate([
  query('months').optional().isInt({ min: 1, max: 12 }),
]), async (req: Request, res: Response) => {
  try {
    const months = parseInt(req.query.months as string) || 3;
    const costs = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);

      const callCosts = await prisma.voiceAgentCall.aggregate({
        where: {
          createdAt: {
            gte: startOfMonth,
            lt: endOfMonth,
          },
        },
        _sum: { cost: true },
        _count: true,
      });

      costs.push({
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        label: `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`,
        totalCost: callCosts._sum.cost || 0,
        callCount: callCosts._count || 0,
      });
    }

    res.json({ success: true, data: costs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== INTEGRATIONS ====================

/**
 * GET /integrations/overview - Integration stats
 */
router.get('/integrations/overview', async (req: Request, res: Response) => {
  try {
    // Count integrations by type from various integration tables
    const [
      facebookCount,
      instagramCount,
      googleAdsCount,
      whatsappCount,
      crmCount,
      paymentCount,
      totalOrgs,
    ] = await Promise.all([
      prisma.facebookIntegration.count({ where: { isActive: true } }),
      prisma.instagramIntegration.count({ where: { isActive: true } }),
      prisma.googleAdsIntegration.count({ where: { isActive: true } }),
      prisma.organization.count({ where: { isActive: true } }), // WhatsApp uses org settings
      prisma.crmIntegration.count({ where: { isActive: true } }),
      prisma.paymentIntegration.count({ where: { isActive: true } }),
      prisma.organization.count({ where: { isActive: true } }),
    ]);

    const totalIntegrations = facebookCount + instagramCount + googleAdsCount + crmCount + paymentCount;

    res.json({
      success: true,
      data: {
        byType: {
          facebook: facebookCount,
          instagram: instagramCount,
          googleAds: googleAdsCount,
          crm: crmCount,
          payment: paymentCount,
        },
        orgsWithIntegrations: Math.min(totalIntegrations, totalOrgs),
        totalOrgs,
        adoptionRate: totalOrgs > 0 ? ((Math.min(totalIntegrations, totalOrgs) / totalOrgs) * 100).toFixed(1) : 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /integrations/providers - All providers
 */
router.get('/integrations/providers', async (req: Request, res: Response) => {
  try {
    // Get actual counts from integration tables
    const [
      facebookCount,
      instagramCount,
      googleAdsCount,
      crmCount,
      paymentCount,
      indiaMartCount,
      justDialCount,
    ] = await Promise.all([
      prisma.facebookIntegration.count({ where: { isActive: true } }),
      prisma.instagramIntegration.count({ where: { isActive: true } }),
      prisma.googleAdsIntegration.count({ where: { isActive: true } }),
      prisma.crmIntegration.count({ where: { isActive: true } }),
      prisma.paymentIntegration.count({ where: { isActive: true } }),
      prisma.indiaMartIntegration.count({ where: { isActive: true } }),
      prisma.justDialIntegration.count({ where: { isActive: true } }),
    ]);

    const providers = [
      { name: 'WhatsApp', type: 'messaging', status: 'active', configurable: true, activeConnections: 0 },
      { name: 'Plivo', type: 'telephony', status: 'active', configurable: true, activeConnections: 0 },
      { name: 'Twilio', type: 'telephony', status: 'active', configurable: true, activeConnections: 0 },
      { name: 'ElevenLabs', type: 'voice', status: 'active', configurable: true, activeConnections: 0 },
      { name: 'OpenAI', type: 'ai', status: 'active', configurable: true, activeConnections: 0 },
      { name: 'Razorpay', type: 'payment', status: 'active', configurable: true, activeConnections: paymentCount },
      { name: 'IndiaMart', type: 'marketplace', status: 'active', configurable: true, activeConnections: indiaMartCount },
      { name: 'JustDial', type: 'marketplace', status: 'active', configurable: true, activeConnections: justDialCount },
      { name: 'Facebook', type: 'social', status: 'active', configurable: true, activeConnections: facebookCount },
      { name: 'Instagram', type: 'social', status: 'active', configurable: true, activeConnections: instagramCount },
      { name: 'Google Ads', type: 'advertising', status: 'active', configurable: true, activeConnections: googleAdsCount },
      { name: 'CRM', type: 'crm', status: 'active', configurable: true, activeConnections: crmCount },
    ];

    res.json({ success: true, data: providers });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /integrations/tenants - Per-tenant integration status
 */
router.get('/integrations/tenants', validate([
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
]), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [orgs, total] = await Promise.all([
      prisma.organization.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          facebookIntegrations: {
            where: { isActive: true },
            select: { id: true },
          },
          instagramIntegrations: {
            where: { isActive: true },
            select: { id: true },
          },
          googleAdsIntegrations: {
            where: { isActive: true },
            select: { id: true },
          },
          crmIntegrations: {
            where: { isActive: true },
            select: { id: true },
          },
          paymentIntegrations: {
            where: { isActive: true },
            select: { id: true },
          },
        },
        skip,
        take: limit,
      }),
      prisma.organization.count({ where: { isActive: true } }),
    ]);

    // Transform data to include integration counts
    const transformedOrgs = orgs.map(org => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      integrations: {
        facebook: org.facebookIntegrations.length,
        instagram: org.instagramIntegrations.length,
        googleAds: org.googleAdsIntegrations.length,
        crm: org.crmIntegrations.length,
        payment: org.paymentIntegrations.length,
        total: org.facebookIntegrations.length + org.instagramIntegrations.length +
               org.googleAdsIntegrations.length + org.crmIntegrations.length +
               org.paymentIntegrations.length,
      },
    }));

    res.json({
      success: true,
      data: transformedOrgs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /integrations/health - Integration health checks
 */
router.get('/integrations/health', async (req: Request, res: Response) => {
  try {
    // Simulate health checks for integrations
    const health = [
      { provider: 'WhatsApp', status: 'healthy', latency: 45, lastChecked: new Date() },
      { provider: 'Plivo', status: 'healthy', latency: 120, lastChecked: new Date() },
      { provider: 'Twilio', status: 'healthy', latency: 89, lastChecked: new Date() },
      { provider: 'ElevenLabs', status: 'healthy', latency: 230, lastChecked: new Date() },
      { provider: 'OpenAI', status: 'healthy', latency: 180, lastChecked: new Date() },
      { provider: 'Razorpay', status: 'healthy', latency: 95, lastChecked: new Date() },
    ];

    res.json({ success: true, data: health });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== PLATFORM USERS ====================

/**
 * GET /users/super-admins - List super admins
 */
router.get('/users/super-admins', async (req: Request, res: Response) => {
  try {
    // Get super admins from SuperAdmin table
    const superAdmins = await prisma.superAdmin.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Also get users with super-admin role
    const superAdminUsers = await prisma.user.findMany({
      where: {
        role: {
          slug: { in: ['super-admin', 'super_admin', 'platform-admin', 'platform_admin'] },
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true,
        lastLoginAt: true,
        role: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: {
        dedicated: superAdmins,
        roleBasedUsers: superAdminUsers,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /users/super-admins - Create super admin
 */
router.post('/users/super-admins', validate([
  body('email').isEmail(),
  body('password').isLength({ min: 12 }),
  body('firstName').notEmpty(),
  body('lastName').notEmpty(),
]), async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await prisma.superAdmin.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });

    res.status(201).json({ success: true, data: admin });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * PATCH /users/super-admins/:id - Update super admin
 */
router.patch('/users/super-admins/:id', validate([
  param('id').isUUID(),
]), async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, phone } = req.body;

    const admin = await prisma.superAdmin.update({
      where: { id: req.params.id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone && { phone }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });

    res.json({ success: true, data: admin });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /users/all - All users across tenants
 */
router.get('/users/all', validate([
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString(),
  query('role').optional().isString(),
]), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const role = req.query.role as string;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) {
      where.role = { slug: role };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          role: { select: { name: true, slug: true } },
          organization: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /users/stats - User statistics
 */
router.get('/users/stats', async (req: Request, res: Response) => {
  try {
    const [totalUsers, activeUsers, usersByRole, recentLogins] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.groupBy({
        by: ['roleId'],
        _count: true,
      }),
      prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // Get role names
    const roleIds = usersByRole.map(r => r.roleId).filter(Boolean) as string[];
    const roles = await prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true, name: true },
    });

    const roleMap = roles.reduce((acc, r) => {
      acc[r.id] = r.name;
      return acc;
    }, {} as Record<string, string>);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        recentLogins,
        byRole: usersByRole.map(r => ({
          role: roleMap[r.roleId || ''] || 'Unknown',
          count: r._count,
        })),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== SECURITY ====================

/**
 * GET /security/overview - Security dashboard
 */
router.get('/security/overview', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalLogins24h,
      failedLogins24h,
      activeSessionsCount,
      auditLogsCount,
    ] = await Promise.all([
      prisma.loginHistory.count({
        where: { createdAt: { gte: last24h } },
      }),
      prisma.loginHistory.count({
        where: { createdAt: { gte: last24h }, success: false },
      }),
      prisma.userSession.count({
        where: { isActive: true },
      }),
      prisma.superAdminAuditLog.count({
        where: { createdAt: { gte: last7d } },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalLogins24h,
        failedLogins24h,
        failedLoginRate: totalLogins24h > 0 ? ((failedLogins24h / totalLogins24h) * 100).toFixed(1) : 0,
        activeSessions: activeSessionsCount,
        auditLogs7d: auditLogsCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /security/login-history - Login attempts
 */
router.get('/security/login-history', validate([
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('success').optional().isBoolean(),
]), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const success = req.query.success;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (success !== undefined) {
      where.success = success === 'true';
    }

    const [history, total] = await Promise.all([
      prisma.loginHistory.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              organization: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.loginHistory.count({ where }),
    ]);

    res.json({
      success: true,
      data: history,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /security/sessions - Active sessions
 */
router.get('/security/sessions', validate([
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
]), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      prisma.userSession.findMany({
        where: { isActive: true },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              organization: { select: { name: true } },
            },
          },
        },
        orderBy: { lastActivityAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.userSession.count({ where: { isActive: true } }),
    ]);

    res.json({
      success: true,
      data: sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /security/sessions/:id - Terminate session
 */
router.delete('/security/sessions/:id', validate([
  param('id').isUUID(),
]), async (req: Request, res: Response) => {
  try {
    await prisma.userSession.update({
      where: { id: req.params.id },
      data: { isActive: false, logoutAt: new Date() },
    });

    res.json({ success: true, message: 'Session terminated' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ==================== WORKFLOWS ====================

/**
 * GET /workflows/templates - Platform workflow templates
 */
router.get('/workflows/templates', validate([
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
]), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Get workflows that can serve as templates (system-level or published ones)
    const [workflows, total] = await Promise.all([
      prisma.workflowDefinition.findMany({
        where: { publishedAt: { not: null } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          triggerType: true,
          isActive: true,
          version: true,
          createdAt: true,
          publishedAt: true,
        },
      }),
      prisma.workflowDefinition.count({ where: { publishedAt: { not: null } } }),
    ]);

    res.json({
      success: true,
      data: workflows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /workflows/templates - Create template
 * Note: Templates are published workflows that can be copied
 */
router.post('/workflows/templates', validate([
  body('name').notEmpty(),
  body('description').optional().isString(),
  body('nodes').isArray(),
  body('edges').isArray(),
  body('category').optional().isString(),
  body('triggerType').optional().isString(),
]), async (req: Request, res: Response) => {
  try {
    const { name, description, nodes, edges, category, triggerType } = req.body;

    // Note: WorkflowDefinition requires organizationId - templates would need a system org
    // For now, return a mock response as this needs architectural decision
    res.status(501).json({
      success: false,
      message: 'Creating platform-wide workflow templates requires a system organization. Please create workflows within a specific organization.'
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /workflows/stats - Workflow usage stats
 */
router.get('/workflows/stats', async (req: Request, res: Response) => {
  try {
    const [
      totalWorkflows,
      activeWorkflows,
      publishedCount,
      executionStats,
    ] = await Promise.all([
      prisma.workflowDefinition.count(),
      prisma.workflowDefinition.count({ where: { isActive: true } }),
      prisma.workflowDefinition.count({ where: { publishedAt: { not: null } } }),
      prisma.workflowExecution.aggregate({
        _count: true,
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalWorkflows,
        activeWorkflows,
        templateCount: publishedCount,
        executions30d: executionStats._count,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /workflows/executions - Recent executions
 */
router.get('/workflows/executions', validate([
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isString(),
]), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;

    const [executions, total] = await Promise.all([
      prisma.workflowExecution.findMany({
        where,
        include: {
          workflow: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.workflowExecution.count({ where }),
    ]);

    res.json({
      success: true,
      data: executions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== RELEASES ====================

/**
 * GET /releases - All releases
 */
router.get('/releases', validate([
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
]), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;

    const [releases, total] = await Promise.all([
      prisma.platformRelease.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.platformRelease.count({ where }),
    ]);

    res.json({
      success: true,
      data: releases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /releases - Create release
 */
router.post('/releases', validate([
  body('version').notEmpty(),
  body('title').notEmpty(),
  body('description').optional().isString(),
  body('type').isIn(['MAJOR', 'MINOR', 'PATCH', 'HOTFIX']),
]), async (req: Request, res: Response) => {
  try {
    const { version, title, description, type, features } = req.body;

    const release = await prisma.platformRelease.create({
      data: {
        version,
        title,
        description: description || '',
        type,
        status: 'DRAFT',
        features: features || [],
      },
    });

    res.status(201).json({ success: true, data: release });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * PATCH /releases/:id - Update release
 */
router.patch('/releases/:id', validate([
  param('id').isUUID(),
]), async (req: Request, res: Response) => {
  try {
    const { version, title, description, type, features, status } = req.body;

    const updateData: any = {};
    if (version) updateData.version = version;
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (type) updateData.type = type;
    if (features) updateData.features = features;
    if (status) {
      updateData.status = status;
      if (status === 'PUBLISHED') {
        updateData.publishedAt = new Date();
      }
    }

    const release = await prisma.platformRelease.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json({ success: true, data: release });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /releases/:id - Delete release
 */
router.delete('/releases/:id', validate([
  param('id').isUUID(),
]), async (req: Request, res: Response) => {
  try {
    await prisma.platformRelease.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true, message: 'Release deleted' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /releases/stats - Release stats
 */
router.get('/releases/stats', async (req: Request, res: Response) => {
  try {
    const [total, byStatus, byType] = await Promise.all([
      prisma.platformRelease.count(),
      prisma.platformRelease.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.platformRelease.groupBy({
        by: ['type'],
        _count: true,
      }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        byStatus: byStatus.reduce((acc, s) => {
          acc[s.status] = s._count;
          return acc;
        }, {} as Record<string, number>),
        byType: byType.reduce((acc, t) => {
          acc[t.type] = t._count;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
