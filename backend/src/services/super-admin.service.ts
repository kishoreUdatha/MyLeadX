import { prisma } from '../config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import ExcelJS from 'exceljs';
import { config } from '../config';
import { emailService } from '../integrations/email.service';


class SuperAdminService {
  /**
   * Create a super admin (first time setup)
   */
  async createSuperAdmin(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) {
    const existingAdmin = await prisma.superAdmin.findUnique({
      where: { email: data.email },
    });

    if (existingAdmin) {
      throw new Error('Super admin with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const admin = await prisma.superAdmin.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      },
    });

    return {
      id: admin.id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
    };
  }

  /**
   * Super admin login
   */
  async login(email: string, password: string) {
    const admin = await prisma.superAdmin.findUnique({
      where: { email },
    });

    if (!admin) {
      throw new Error('Invalid credentials');
    }

    if (!admin.isActive) {
      throw new Error('Account is disabled');
    }

    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const accessToken = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        isSuperAdmin: true,
      },
      config.jwt.secret,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { id: admin.id, isSuperAdmin: true },
      config.jwt.refreshSecret,
      { expiresIn: '7d' }
    );

    // Update last login
    await prisma.superAdmin.update({
      where: { id: admin.id },
      data: {
        lastLoginAt: new Date(),
        refreshToken,
      },
    });

    return {
      accessToken,
      refreshToken,
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
      },
    };
  }

  /**
   * Get platform statistics - comprehensive tenant tracking
   */
  async getPlatformStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Organization stats with subscription status
    const [
      totalOrgs,
      activeOrgs,
      trialOrgs,
      expiredOrgs,
      newOrgsThisMonth,
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({
        where: {
          isActive: true,
          subscriptionStatus: 'ACTIVE',
        }
      }),
      prisma.organization.count({
        where: { subscriptionStatus: 'TRIAL' }
      }),
      prisma.organization.count({
        where: {
          OR: [
            { subscriptionStatus: 'EXPIRED' },
            { subscriptionStatus: 'CANCELLED' },
            { isActive: false },
          ]
        }
      }),
      prisma.organization.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
    ]);

    // User stats
    const [totalUsers, activeUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
    ]);

    // Revenue stats
    const [totalRevenue, monthlyRevenue, lastMonthRevenue] = await Promise.all([
      prisma.invoice.aggregate({
        where: { status: 'PAID' },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: {
          status: 'PAID',
          paidAt: { gte: startOfMonth },
        },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: {
          status: 'PAID',
          paidAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    // Usage stats - comprehensive
    const usageThisMonth = await prisma.usageTracking.aggregate({
      where: {
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      },
      _sum: {
        leadsCount: true,
        aiCallsCount: true,
        voiceMinutesUsed: true,
        smsCount: true,
        whatsappCount: true,
        emailsCount: true,
        apiCallsCount: true,
        storageUsedMb: true,
      },
    });

    // Plan distribution with revenue
    const planDistribution = await prisma.organization.groupBy({
      by: ['activePlanId'],
      _count: true,
    });

    // Get revenue per plan
    const planRevenue = await prisma.invoice.groupBy({
      by: ['planName'],
      where: { status: 'PAID' },
      _sum: { totalAmount: true },
    });
    const planRevenueMap = new Map(planRevenue.map(p => [p.planName, p._sum.totalAmount || 0]));

    // Subscription status distribution
    const subscriptionStatus = await prisma.organization.groupBy({
      by: ['subscriptionStatus'],
      _count: true,
    });

    // Top organizations by usage with comprehensive metrics
    const topOrgsByUsage = await prisma.usageTracking.findMany({
      where: {
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      },
      orderBy: { aiCallsCount: 'desc' },
      take: 20,
      select: {
        organizationId: true,
        aiCallsCount: true,
        voiceMinutesUsed: true,
        leadsCount: true,
        smsCount: true,
        whatsappCount: true,
        emailsCount: true,
        apiCallsCount: true,
        storageUsedMb: true,
      },
    });

    // Get org details for top orgs
    const topOrgIds = topOrgsByUsage.map((u) => u.organizationId);
    const orgs = await prisma.organization.findMany({
      where: { id: { in: topOrgIds } },
      select: {
        id: true,
        name: true,
        activePlanId: true,
        subscriptionStatus: true,
        industry: true,
        _count: {
          select: { users: true },
        },
      },
    });

    // Get revenue per org
    const orgRevenue = await prisma.invoice.groupBy({
      by: ['organizationId'],
      where: {
        organizationId: { in: topOrgIds },
        status: 'PAID',
      },
      _sum: { totalAmount: true },
    });
    const orgRevenueMap = new Map(orgRevenue.map(o => [o.organizationId, o._sum.totalAmount || 0]));

    // Get last login per org
    const lastLogins = await prisma.loginHistory.findMany({
      where: {
        user: { organizationId: { in: topOrgIds } },
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['userId'],
      select: {
        createdAt: true,
        user: { select: { organizationId: true } },
      },
    });
    const lastLoginMap = new Map<string, Date>();
    lastLogins.forEach(l => {
      if (!lastLoginMap.has(l.user.organizationId)) {
        lastLoginMap.set(l.user.organizationId, l.createdAt);
      }
    });

    const orgMap = new Map(orgs.map((o) => [o.id, o]));

    return {
      overview: {
        totalOrganizations: totalOrgs,
        activeOrganizations: activeOrgs,
        expiredOrganizations: expiredOrgs,
        trialOrganizations: trialOrgs,
        newOrganizationsThisMonth: newOrgsThisMonth,
        totalUsers,
        activeUsers,
      },
      revenue: {
        total: totalRevenue._sum.totalAmount || 0,
        thisMonth: monthlyRevenue._sum.totalAmount || 0,
        lastMonth: lastMonthRevenue._sum.totalAmount || 0,
        currency: 'INR',
      },
      usage: {
        thisMonth: {
          leads: usageThisMonth._sum.leadsCount || 0,
          aiCalls: usageThisMonth._sum.aiCallsCount || 0,
          voiceMinutes: usageThisMonth._sum.voiceMinutesUsed || 0,
          sms: usageThisMonth._sum.smsCount || 0,
          whatsapp: usageThisMonth._sum.whatsappCount || 0,
          emails: usageThisMonth._sum.emailsCount || 0,
          apiCalls: usageThisMonth._sum.apiCallsCount || 0,
          storageGB: Math.round((usageThisMonth._sum.storageUsedMb || 0) / 1024 * 100) / 100,
        },
      },
      planDistribution: planDistribution.map((p) => ({
        plan: p.activePlanId || 'starter',
        count: p._count,
        revenue: planRevenueMap.get(p.activePlanId || 'starter') || 0,
      })),
      subscriptionStatus: subscriptionStatus.map((s) => ({
        status: s.subscriptionStatus || 'UNKNOWN',
        count: s._count,
      })),
      topOrganizations: topOrgsByUsage.map((u) => {
        const org = orgMap.get(u.organizationId);
        return {
          organizationId: u.organizationId,
          aiCallsCount: u.aiCallsCount,
          voiceMinutes: u.voiceMinutesUsed || 0,
          leadsCount: u.leadsCount,
          smsCount: u.smsCount,
          whatsappCount: u.whatsappCount || 0,
          emailCount: u.emailsCount,
          usersCount: org?._count?.users || 0,
          revenue: orgRevenueMap.get(u.organizationId) || 0,
          lastActiveAt: lastLoginMap.get(u.organizationId) || null,
          organization: org ? {
            id: org.id,
            name: org.name,
            activePlanId: org.activePlanId,
            subscriptionStatus: org.subscriptionStatus,
            industry: org.industry,
          } : null,
        };
      }),
    };
  }

  /**
   * Get detailed tenant information
   */
  async getTenantDetails(tenantId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: tenantId },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
            lastLoginAt: true,
            role: { select: { name: true, slug: true } },
          },
        },
        _count: {
          select: {
            leads: true,
            callLogs: true,
            campaigns: true,
            voiceAgents: true,
          },
        },
      },
    });

    if (!org) {
      throw new Error('Tenant not found');
    }

    // Get current month usage
    const now = new Date();
    const usage = await prisma.usageTracking.findUnique({
      where: {
        organizationId_month_year: {
          organizationId: tenantId,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        },
      },
    });

    // Get total revenue from this tenant
    const revenue = await prisma.invoice.aggregate({
      where: {
        organizationId: tenantId,
        status: 'PAID',
      },
      _sum: { totalAmount: true },
    });

    // Get last payment
    const lastPayment = await prisma.invoice.findFirst({
      where: {
        organizationId: tenantId,
        status: 'PAID',
      },
      orderBy: { paidAt: 'desc' },
    });

    // Get pending invoices
    const pendingInvoices = await prisma.invoice.aggregate({
      where: {
        organizationId: tenantId,
        status: 'PENDING',
      },
      _sum: { totalAmount: true },
      _count: true,
    });

    // Get last login activity
    const lastLogin = await prisma.loginHistory.findFirst({
      where: { user: { organizationId: tenantId } },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
    });

    // Get active users (logged in last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const activeUsersCount = await prisma.user.count({
      where: {
        organizationId: tenantId,
        isActive: true,
        lastLoginAt: { gte: thirtyDaysAgo },
      },
    });

    return {
      id: org.id,
      tenantCode: org.tenantCode,
      name: org.name,
      slug: org.slug,
      email: org.email,
      phone: org.phone,
      contactPerson: org.contactPerson,
      industry: org.industry,
      activePlanId: org.activePlanId,
      subscriptionStatus: org.subscriptionStatus,
      subscriptionExpiresAt: org.subscriptionExpiresAt,
      trialEndsAt: org.trialEndsAt,
      isActive: org.isActive,
      createdAt: org.createdAt,

      // Limits
      maxUsers: org.maxUsers,
      maxStorageGB: org.maxStorageGB,
      voiceMinutesLimit: org.voiceMinutesLimit,

      // Stats
      stats: {
        totalUsers: org.users.length,
        activeUsers: activeUsersCount,
        totalLeads: org._count.leads,
        totalCalls: org._count.callLogs,
        voiceMinutesUsed: org.voiceMinutesUsed || 0,
        voiceMinutesLimit: org.voiceMinutesLimit || 0,
        smsCount: usage?.smsCount || 0,
        whatsappCount: usage?.whatsappCount || 0,
        emailCount: usage?.emailsCount || 0,
        storageUsedMB: usage?.storageUsedMb || 0,
        apiCallsThisMonth: usage?.apiCallsCount || 0,
        lastLoginAt: lastLogin?.createdAt || null,
        lastLoginBy: lastLogin?.user ? `${lastLogin.user.firstName} ${lastLogin.user.lastName}` : null,
      },

      // Billing
      billing: {
        totalPaid: revenue._sum.totalAmount || 0,
        lastPaymentAt: lastPayment?.paidAt || null,
        lastPaymentAmount: lastPayment?.totalAmount || 0,
        pendingAmount: pendingInvoices._sum.totalAmount || 0,
        pendingInvoices: pendingInvoices._count,
        nextBillingAt: org.subscriptionExpiresAt || null,
      },

      // Users list
      users: org.users,
    };
  }

  /**
   * Get all organizations with details
   */
  async getAllOrganizations(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    plan?: string;
  }) {
    const { page = 1, limit = 20, search, status, plan } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    if (plan) {
      where.activePlanId = plan;
    }

    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              users: true,
              leads: true,
            },
          },
          subscriptions: {
            where: { status: 'ACTIVE' },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      prisma.organization.count({ where }),
    ]);

    return {
      organizations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get organization details
   */
  async getOrganizationDetails(orgId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
            lastLoginAt: true,
          },
        },
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            leads: true,
            campaigns: true,
            voiceAgents: true,
          },
        },
      },
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    // Get usage for current month
    const now = new Date();
    const usage = await prisma.usageTracking.findUnique({
      where: {
        organizationId_month_year: {
          organizationId: orgId,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        },
      },
    });

    // Get recent invoices
    const invoices = await prisma.invoice.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return {
      ...org,
      usage,
      invoices,
    };
  }

  /**
   * Update organization status
   */
  async updateOrganization(orgId: string, data: {
    isActive?: boolean;
    activePlanId?: string;
    subscriptionStatus?: string;
  }) {
    return prisma.organization.update({
      where: { id: orgId },
      data,
    });
  }

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(months: number = 12) {
    const now = new Date();
    const results = [];

    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const revenue = await prisma.invoice.aggregate({
        where: {
          status: 'PAID',
          paidAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: { totalAmount: true },
        _count: true,
      });

      results.unshift({
        month: date.toLocaleString('default', { month: 'short' }),
        year: date.getFullYear(),
        revenue: revenue._sum.totalAmount || 0,
        transactions: revenue._count,
      });
    }

    return results;
  }

  /**
   * Create audit log
   */
  async createAuditLog(data: {
    actorType: string;
    actorId?: string;
    actorEmail?: string;
    organizationId?: string;
    targetType?: string;
    targetId?: string;
    action: string;
    description?: string;
    changes?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return prisma.auditLog.create({ data });
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(params: {
    organizationId?: string;
    actorId?: string;
    action?: string;
    page?: number;
    limit?: number;
  }) {
    const { organizationId, actorId, action, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    if (actorId) where.actorId = actorId;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create organization manually (super admin feature)
   * Creates org + admin user + default roles in a transaction
   */
  async createOrganization(data: {
    organizationName: string;
    slug: string;
    adminEmail: string;
    adminFirstName: string;
    adminLastName: string;
    planId?: string;
  }) {
    // Check if slug exists
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: data.slug },
    });

    if (existingOrg) {
      throw new Error('Organization with this slug already exists');
    }

    // Check if email exists
    const existingUser = await prisma.user.findFirst({
      where: { email: data.adminEmail },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Generate temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // Create organization, roles, and user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create organization
      const organization = await tx.organization.create({
        data: {
          name: data.organizationName,
          slug: data.slug,
          email: data.adminEmail,
          activePlanId: data.planId || 'starter',
          isActive: true,
        },
      });

      // Create default roles
      const adminRole = await tx.role.create({
        data: {
          organizationId: organization.id,
          name: 'Admin',
          slug: 'admin',
          permissions: [
            'users.read', 'users.write', 'users.delete',
            'leads.read', 'leads.write', 'leads.delete', 'leads.assign', 'leads.bulk_upload',
            'forms.read', 'forms.write', 'forms.delete',
            'campaigns.read', 'campaigns.write', 'campaigns.execute',
            'payments.read', 'payments.write',
            'reports.read', 'settings.read', 'settings.write',
          ],
        },
      });

      await tx.role.create({
        data: {
          organizationId: organization.id,
          name: 'Counselor',
          slug: 'counselor',
          permissions: ['leads.read', 'leads.write', 'leads.call', 'campaigns.read', 'payments.read', 'payments.write'],
        },
      });

      await tx.role.create({
        data: {
          organizationId: organization.id,
          name: 'Student',
          slug: 'student',
          permissions: ['profile.read', 'profile.write', 'payments.read'],
        },
      });

      // Create admin user
      const user = await tx.user.create({
        data: {
          organizationId: organization.id,
          email: data.adminEmail,
          password: hashedPassword,
          firstName: data.adminFirstName,
          lastName: data.adminLastName,
          roleId: adminRole.id,
          isActive: true,
        },
      });

      return { organization, user, adminRole };
    });

    // Send welcome email with temporary password
    try {
      await emailService.sendEmail({
        to: data.adminEmail,
        subject: 'Your CRM Account Has Been Created',
        body: `Hi ${data.adminFirstName},\n\nYour organization "${data.organizationName}" has been created on CRM Pro.\n\nYour login credentials:\nEmail: ${data.adminEmail}\nTemporary Password: ${tempPassword}\n\nPlease login at ${config.frontendUrl}/login and change your password immediately.\n\nBest regards,\nCRM Pro Team`,
        html: `
          <h2>Welcome to CRM Pro!</h2>
          <p>Hi ${data.adminFirstName},</p>
          <p>Your organization "<strong>${data.organizationName}</strong>" has been created.</p>
          <h3>Your Login Credentials:</h3>
          <ul>
            <li><strong>Email:</strong> ${data.adminEmail}</li>
            <li><strong>Temporary Password:</strong> ${tempPassword}</li>
          </ul>
          <p><a href="${config.frontendUrl}/login" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">Login Now</a></p>
          <p><strong>Please change your password immediately after logging in.</strong></p>
          <p>Best regards,<br>CRM Pro Team</p>
        `,
        userId: 'system',
      });
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }

    return {
      organization: result.organization,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
      tempPassword, // Return for display (optional)
    };
  }

  /**
   * Impersonate a user (login as any user)
   */
  async impersonateUser(userId: string, superAdminId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
        role: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.isActive) {
      throw new Error('User account is deactivated');
    }

    if (!user.organization.isActive) {
      throw new Error('Organization is deactivated');
    }

    // Generate impersonation token
    const accessToken = jwt.sign(
      {
        userId: user.id,
        organizationId: user.organizationId,
        roleSlug: user.role.slug,
        isImpersonating: true,
        impersonatedBy: superAdminId,
      },
      config.jwt.secret,
      { expiresIn: '2h' } // Shorter expiry for impersonation
    );

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId,
        organizationName: user.organization.name,
        role: user.role.slug,
      },
    };
  }

  /**
   * Exit impersonation and return to super admin session
   */
  async exitImpersonation(superAdminId: string) {
    const admin = await prisma.superAdmin.findUnique({
      where: { id: superAdminId },
    });

    if (!admin) {
      throw new Error('Super admin not found');
    }

    // Generate new super admin token
    const accessToken = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        isSuperAdmin: true,
      },
      config.jwt.secret,
      { expiresIn: '1h' }
    );

    return {
      accessToken,
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
      },
    };
  }

  /**
   * Send bulk email to organizations
   */
  async sendBulkEmailToOrganizations(data: {
    subject: string;
    body: string;
    html?: string;
    filter: {
      planId?: string;
      isActive?: boolean;
      orgIds?: string[];
    };
    superAdminId: string;
  }) {
    // Build filter
    const where: any = {};

    if (data.filter.orgIds && data.filter.orgIds.length > 0) {
      where.id = { in: data.filter.orgIds };
    } else {
      if (data.filter.planId) {
        where.activePlanId = data.filter.planId;
      }
      if (data.filter.isActive !== undefined) {
        where.isActive = data.filter.isActive;
      }
    }

    // Get organizations with their admin users
    const organizations = await prisma.organization.findMany({
      where,
      include: {
        users: {
          where: {
            role: { slug: 'admin' },
            isActive: true,
          },
          take: 1,
        },
      },
    });

    const results: Array<{
      organizationId: string;
      organizationName: string;
      email: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const org of organizations) {
      const adminUser = org.users[0];
      if (!adminUser) continue;

      // Personalize content
      const personalizedBody = data.body
        .replace(/{organizationName}/g, org.name)
        .replace(/{adminName}/g, `${adminUser.firstName} ${adminUser.lastName}`);

      const personalizedHtml = data.html
        ? data.html
            .replace(/{organizationName}/g, org.name)
            .replace(/{adminName}/g, `${adminUser.firstName} ${adminUser.lastName}`)
        : undefined;

      try {
        await emailService.sendEmail({
          to: adminUser.email,
          subject: data.subject.replace(/{organizationName}/g, org.name),
          body: personalizedBody,
          html: personalizedHtml,
          userId: 'system',
        });

        results.push({
          organizationId: org.id,
          organizationName: org.name,
          email: adminUser.email,
          success: true,
        });
      } catch (error: any) {
        results.push({
          organizationId: org.id,
          organizationName: org.name,
          email: adminUser.email,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      totalSent: results.filter((r) => r.success).length,
      totalFailed: results.filter((r) => !r.success).length,
      results,
    };
  }

  /**
   * Export organizations to XLSX
   */
  async exportOrganizations(): Promise<Buffer> {
    const organizations = await prisma.organization.findMany({
      include: {
        _count: { select: { users: true, leads: true } },
        subscriptions: {
          where: { status: 'ACTIVE' },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Organizations');

    // Add headers
    worksheet.columns = [
      { header: 'Organization ID', key: 'id', width: 40 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Slug', key: 'slug', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Active Plan', key: 'plan', width: 15 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Users', key: 'users', width: 10 },
      { header: 'Leads', key: 'leads', width: 10 },
      { header: 'Created At', key: 'createdAt', width: 25 },
      { header: 'Subscription Status', key: 'subscriptionStatus', width: 20 },
    ];

    // Add data rows
    organizations.forEach((org) => {
      worksheet.addRow({
        id: org.id,
        name: org.name,
        slug: org.slug,
        email: org.email || '',
        phone: org.phone || '',
        plan: org.activePlanId || 'starter',
        status: org.isActive ? 'Active' : 'Inactive',
        users: org._count.users,
        leads: org._count.leads,
        createdAt: org.createdAt.toISOString(),
        subscriptionStatus: org.subscriptions[0]?.status || 'None',
      });
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Export revenue report to XLSX
   */
  async exportRevenueReport(months: number = 12): Promise<Buffer> {
    const revenueData = await this.getRevenueAnalytics(months);

    // Get detailed invoice data
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);

    const invoices = await prisma.invoice.findMany({
      where: {
        status: 'PAID',
        paidAt: { gte: startDate },
      },
      orderBy: { paidAt: 'desc' },
    });

    // Fetch organization names for invoices
    const invOrgIds = [...new Set(invoices.map(inv => inv.organizationId))];
    const invOrgs = await prisma.organization.findMany({
      where: { id: { in: invOrgIds } },
      select: { id: true, name: true },
    });
    const invOrgMap = new Map(invOrgs.map(o => [o.id, o.name]));

    const workbook = new ExcelJS.Workbook();

    // Summary sheet
    const summarySheet = workbook.addWorksheet('Monthly Summary');
    summarySheet.columns = [
      { header: 'Month', key: 'month', width: 15 },
      { header: 'Revenue', key: 'revenue', width: 15 },
      { header: 'Transactions', key: 'transactions', width: 15 },
    ];
    revenueData.forEach((r) => {
      summarySheet.addRow({
        month: `${r.month} ${r.year}`,
        revenue: r.revenue,
        transactions: r.transactions,
      });
    });
    summarySheet.getRow(1).font = { bold: true };

    // Detailed invoices sheet
    const invoiceSheet = workbook.addWorksheet('Invoice Details');
    invoiceSheet.columns = [
      { header: 'Invoice ID', key: 'id', width: 40 },
      { header: 'Organization', key: 'organization', width: 30 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Currency', key: 'currency', width: 10 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Paid At', key: 'paidAt', width: 25 },
      { header: 'Plan', key: 'plan', width: 15 },
    ];
    invoices.forEach((inv) => {
      invoiceSheet.addRow({
        id: inv.id,
        organization: invOrgMap.get(inv.organizationId) || 'Unknown',
        amount: inv.totalAmount,
        currency: inv.currency,
        status: inv.status,
        paidAt: inv.paidAt?.toISOString() || '',
        plan: inv.planName || '',
      });
    });
    invoiceSheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Export usage statistics to XLSX
   */
  async exportUsageReport(): Promise<Buffer> {
    const now = new Date();
    const usageData = await prisma.usageTracking.findMany({
      where: {
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      },
      orderBy: { aiCallsCount: 'desc' },
    });

    // Fetch organization info for usage data
    const usageOrgIds = [...new Set(usageData.map(u => u.organizationId))];
    const usageOrgs = await prisma.organization.findMany({
      where: { id: { in: usageOrgIds } },
      select: { id: true, name: true, activePlanId: true },
    });
    const usageOrgMap = new Map(usageOrgs.map(o => [o.id, o]));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Usage Statistics');

    worksheet.columns = [
      { header: 'Organization', key: 'organization', width: 30 },
      { header: 'Plan', key: 'plan', width: 15 },
      { header: 'Month', key: 'month', width: 10 },
      { header: 'Leads', key: 'leads', width: 10 },
      { header: 'AI Calls', key: 'aiCalls', width: 10 },
      { header: 'SMS', key: 'sms', width: 10 },
      { header: 'Emails', key: 'emails', width: 10 },
      { header: 'Storage (MB)', key: 'storage', width: 15 },
    ];

    usageData.forEach((u) => {
      worksheet.addRow({
        organization: usageOrgMap.get(u.organizationId)?.name || 'Unknown',
        plan: usageOrgMap.get(u.organizationId)?.activePlanId || 'starter',
        month: `${u.month}/${u.year}`,
        leads: u.leadsCount,
        aiCalls: u.aiCallsCount,
        sms: u.smsCount,
        emails: u.emailsCount,
        storage: u.storageUsedMb,
      });
    });

    worksheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Export audit logs to XLSX
   */
  async exportAuditLogs(params: {
    startDate?: Date;
    endDate?: Date;
    organizationId?: string;
  }): Promise<Buffer> {
    const where: any = {};

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = params.startDate;
      if (params.endDate) where.createdAt.lte = params.endDate;
    }

    if (params.organizationId) {
      where.organizationId = params.organizationId;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10000, // Limit to prevent memory issues
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Audit Logs');

    worksheet.columns = [
      { header: 'Log ID', key: 'id', width: 40 },
      { header: 'Actor Type', key: 'actorType', width: 15 },
      { header: 'Actor Email', key: 'actorEmail', width: 30 },
      { header: 'Action', key: 'action', width: 20 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Target Type', key: 'targetType', width: 15 },
      { header: 'Target ID', key: 'targetId', width: 40 },
      { header: 'Organization ID', key: 'organizationId', width: 40 },
      { header: 'IP Address', key: 'ipAddress', width: 15 },
      { header: 'Created At', key: 'createdAt', width: 25 },
    ];

    logs.forEach((log) => {
      worksheet.addRow({
        id: log.id,
        actorType: log.actorType,
        actorEmail: log.actorEmail || '',
        action: log.action,
        description: log.description || '',
        targetType: log.targetType || '',
        targetId: log.targetId || '',
        organizationId: log.organizationId || '',
        ipAddress: log.ipAddress || '',
        createdAt: log.createdAt.toISOString(),
      });
    });

    worksheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ==================== BILLING DASHBOARD ====================

  /**
   * Get comprehensive billing dashboard stats
   */
  async getBillingDashboard() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get subscription stats
    const [
      activeSubscriptions,
      trialSubscriptions,
      cancelledSubscriptions,
      totalOrganizations,
    ] = await Promise.all([
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.subscription.count({ where: { status: 'TRIAL' } }),
      prisma.subscription.count({ where: { status: 'CANCELLED' } }),
      prisma.organization.count(),
    ]);

    // Get MRR (Monthly Recurring Revenue)
    const activeSubsWithAmount = await prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      select: { amount: true, billingCycle: true },
    });

    const mrr = activeSubsWithAmount.reduce((total, sub) => {
      // If annual, divide by 12 to get monthly equivalent
      const monthlyAmount = sub.billingCycle === 'annual' ? sub.amount / 12 : sub.amount;
      return total + monthlyAmount;
    }, 0);

    const arr = mrr * 12;

    // Get this month's revenue
    const thisMonthRevenue = await prisma.invoice.aggregate({
      where: {
        status: 'PAID',
        paidAt: { gte: startOfMonth },
      },
      _sum: { totalAmount: true },
      _count: true,
    });

    // Get last month's revenue for comparison
    const lastMonthRevenue = await prisma.invoice.aggregate({
      where: {
        status: 'PAID',
        paidAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
      _sum: { totalAmount: true },
    });

    // Get wallet stats
    const walletStats = await prisma.organization.aggregate({
      _sum: { subscriptionWalletBalance: true },
      _avg: { subscriptionWalletBalance: true },
    });

    // Get this month's wallet top-ups
    const thisMonthTopUps = await prisma.walletTransaction.aggregate({
      where: {
        type: 'CREDIT',
        status: 'COMPLETED',
        createdAt: { gte: startOfMonth },
        referenceType: 'razorpay_topup',
      },
      _sum: { amount: true },
      _count: true,
    });

    // Get promo code stats
    const promoStats = await prisma.promoCode.aggregate({
      where: { isActive: true },
      _count: true,
    });

    const totalRedemptions = await prisma.promoCodeRedemption.aggregate({
      _sum: { discountAmount: true },
      _count: true,
    });

    // Plan distribution
    const planDistribution = await prisma.organization.groupBy({
      by: ['activePlanId'],
      _count: true,
    });

    // Revenue growth
    const currentRevenue = thisMonthRevenue._sum.totalAmount || 0;
    const previousRevenue = lastMonthRevenue._sum.totalAmount || 0;
    const revenueGrowth = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : 0;

    return {
      overview: {
        totalOrganizations,
        activeSubscriptions,
        trialSubscriptions,
        cancelledSubscriptions,
        conversionRate: totalOrganizations > 0
          ? Math.round((activeSubscriptions / totalOrganizations) * 100)
          : 0,
      },
      revenue: {
        mrr: Math.round(mrr),
        arr: Math.round(arr),
        thisMonth: currentRevenue,
        lastMonth: previousRevenue,
        growth: Math.round(revenueGrowth * 100) / 100,
        transactionsThisMonth: thisMonthRevenue._count,
      },
      wallet: {
        totalBalance: walletStats._sum.subscriptionWalletBalance || 0,
        averageBalance: Math.round(walletStats._avg.subscriptionWalletBalance || 0),
        topUpsThisMonth: thisMonthTopUps._sum.amount || 0,
        topUpCountThisMonth: thisMonthTopUps._count,
      },
      promoCodes: {
        activeCount: promoStats._count,
        totalRedemptions: totalRedemptions._count,
        totalDiscountGiven: totalRedemptions._sum.discountAmount || 0,
      },
      planDistribution: planDistribution.map(p => ({
        plan: p.activePlanId || 'free',
        count: p._count,
      })),
    };
  }

  /**
   * Get all wallet transactions across tenants
   */
  async getAllWalletTransactions(params: {
    page?: number;
    limit?: number;
    type?: string;
    organizationId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const { page = 1, limit = 50, type, organizationId, startDate, endDate } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      status: 'COMPLETED',
    };

    if (type) {
      where.type = type;
    }

    if (organizationId) {
      where.organizationId = organizationId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where,
        include: {
          organization: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.walletTransaction.count({ where }),
    ]);

    return {
      transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get all subscriptions across tenants
   */
  async getAllSubscriptions(params: {
    page?: number;
    limit?: number;
    status?: string;
    planId?: string;
    billingCycle?: string;
  }) {
    const { page = 1, limit = 50, status, planId, billingCycle } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (planId) {
      where.planId = planId;
    }

    if (billingCycle) {
      where.billingCycle = billingCycle;
    }

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              email: true,
              subscriptionWalletBalance: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.subscription.count({ where }),
    ]);

    // Calculate summary
    const summary = await prisma.subscription.groupBy({
      by: ['status'],
      _count: true,
      _sum: { amount: true },
    });

    return {
      subscriptions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: summary.map(s => ({
        status: s.status,
        count: s._count,
        totalAmount: s._sum.amount || 0,
      })),
    };
  }

  /**
   * Get promo code analytics
   */
  async getPromoCodeAnalytics() {
    // Get all promo codes with redemption stats
    const promoCodes = await prisma.promoCode.findMany({
      include: {
        _count: {
          select: { redemptions: true },
        },
        redemptions: {
          select: {
            discountAmount: true,
            originalAmount: true,
            finalAmount: true,
            redeemedAt: true,
          },
          orderBy: { redeemedAt: 'desc' },
          take: 5, // Last 5 redemptions per code
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate totals
    const totals = await prisma.promoCodeRedemption.aggregate({
      _sum: {
        discountAmount: true,
        originalAmount: true,
        finalAmount: true,
      },
      _count: true,
    });

    // Get redemptions by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const redemptionsByMonth = await prisma.promoCodeRedemption.groupBy({
      by: ['redeemedAt'],
      where: {
        redeemedAt: { gte: sixMonthsAgo },
      },
      _sum: { discountAmount: true },
      _count: true,
    });

    // Format promo codes with stats
    const formattedCodes = promoCodes.map(code => {
      const totalDiscount = code.redemptions.reduce((sum, r) => sum + r.discountAmount, 0);
      const totalOriginal = code.redemptions.reduce((sum, r) => sum + r.originalAmount, 0);

      return {
        id: code.id,
        code: code.code,
        description: code.description,
        discountType: code.discountType,
        discountValue: code.discountValue,
        isActive: code.isActive,
        validUntil: code.validUntil,
        maxUses: code.maxUses,
        usedCount: code.usedCount,
        redemptionCount: code._count.redemptions,
        totalDiscountGiven: totalDiscount,
        totalRevenueGenerated: totalOriginal - totalDiscount,
        recentRedemptions: code.redemptions,
      };
    });

    // Top performing codes
    const topCodes = [...formattedCodes]
      .sort((a, b) => b.redemptionCount - a.redemptionCount)
      .slice(0, 5);

    return {
      promoCodes: formattedCodes,
      totals: {
        totalRedemptions: totals._count,
        totalDiscountGiven: totals._sum.discountAmount || 0,
        totalOriginalAmount: totals._sum.originalAmount || 0,
        totalFinalAmount: totals._sum.finalAmount || 0,
        averageDiscount: totals._count > 0
          ? Math.round((totals._sum.discountAmount || 0) / totals._count)
          : 0,
      },
      topCodes,
      activeCodesCount: promoCodes.filter(c => c.isActive).length,
      expiredCodesCount: promoCodes.filter(c => !c.isActive || (c.validUntil && c.validUntil < new Date())).length,
    };
  }

  /**
   * Get subscription churn analytics
   */
  async getChurnAnalytics(months: number = 6) {
    const results = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const [cancelled, newSubs, active] = await Promise.all([
        prisma.subscription.count({
          where: {
            cancelledAt: { gte: startOfMonth, lte: endOfMonth },
          },
        }),
        prisma.subscription.count({
          where: {
            createdAt: { gte: startOfMonth, lte: endOfMonth },
          },
        }),
        prisma.subscription.count({
          where: {
            status: 'ACTIVE',
            createdAt: { lte: endOfMonth },
          },
        }),
      ]);

      const churnRate = active > 0 ? (cancelled / active) * 100 : 0;

      results.unshift({
        month: date.toLocaleString('default', { month: 'short' }),
        year: date.getFullYear(),
        cancelled,
        newSubscriptions: newSubs,
        activeAtEnd: active,
        churnRate: Math.round(churnRate * 100) / 100,
      });
    }

    return results;
  }

  /**
   * Manually credit or debit a tenant's subscription wallet
   */
  async adjustWalletBalance(params: {
    organizationId: string;
    amount: number;
    type: 'CREDIT' | 'DEBIT';
    reason: string;
    adminId: string;
  }) {
    const { organizationId, amount, type, reason, adminId } = params;

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { subscriptionWalletBalance: true, name: true },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    const currentBalance = organization.subscriptionWalletBalance || 0;
    const newBalance = type === 'CREDIT'
      ? currentBalance + amount
      : currentBalance - amount;

    if (newBalance < 0) {
      throw new Error('Insufficient balance for debit');
    }

    // Update balance and create transaction record
    const [updatedOrg, transaction] = await prisma.$transaction([
      prisma.organization.update({
        where: { id: organizationId },
        data: { subscriptionWalletBalance: newBalance },
      }),
      prisma.walletTransaction.create({
        data: {
          organizationId,
          type: type === 'CREDIT' ? 'CREDIT' : 'DEBIT',
          amount,
          currency: 'INR',
          status: 'COMPLETED',
          description: `Manual ${type.toLowerCase()} by admin: ${reason}`,
          metadata: {
            adminId,
            reason,
            previousBalance: currentBalance,
            newBalance,
          },
        },
      }),
    ]);

    return {
      organizationId,
      organizationName: organization.name,
      previousBalance: currentBalance,
      adjustment: type === 'CREDIT' ? amount : -amount,
      newBalance,
      transactionId: transaction.id,
    };
  }

  /**
   * Get all invoices across all tenants
   */
  async getAllInvoices(params: {
    page?: number;
    limit?: number;
    status?: string;
    organizationId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const { page = 1, limit = 20, status, organizationId, startDate, endDate } = params;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (organizationId) {
      where.organizationId = organizationId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          organization: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    // Calculate totals
    const totals = await prisma.invoice.aggregate({
      where,
      _sum: {
        amount: true,
        taxAmount: true,
        totalAmount: true,
      },
      _count: true,
    });

    return {
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalAmount: totals._sum.totalAmount || 0,
        totalTax: totals._sum.taxAmount || 0,
        count: totals._count,
      },
    };
  }

  /**
   * Get failed or pending payments
   */
  async getFailedPayments(params: {
    page?: number;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  }) {
    const { page = 1, limit = 20, startDate, endDate } = params;

    const where: any = {
      status: { in: ['FAILED', 'PENDING'] },
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where,
        include: {
          organization: {
            select: { name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.walletTransaction.count({ where }),
    ]);

    // Get failure summary
    const failedCount = await prisma.walletTransaction.count({
      where: { ...where, status: 'FAILED' },
    });
    const pendingCount = await prisma.walletTransaction.count({
      where: { ...where, status: 'PENDING' },
    });

    const failedAmount = await prisma.walletTransaction.aggregate({
      where: { ...where, status: 'FAILED' },
      _sum: { amount: true },
    });

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        failedCount,
        pendingCount,
        totalFailedAmount: failedAmount._sum.amount || 0,
      },
    };
  }

  /**
   * Issue a refund to a tenant
   */
  async issueRefund(params: {
    organizationId: string;
    amount: number;
    reason: string;
    originalTransactionId?: string;
    adminId: string;
  }) {
    const { organizationId, amount, reason, originalTransactionId, adminId } = params;

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { subscriptionWalletBalance: true, name: true },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Credit the refund to wallet
    const currentBalance = organization.subscriptionWalletBalance || 0;
    const newBalance = currentBalance + amount;

    const [updatedOrg, transaction] = await prisma.$transaction([
      prisma.organization.update({
        where: { id: organizationId },
        data: { subscriptionWalletBalance: newBalance },
      }),
      prisma.walletTransaction.create({
        data: {
          organizationId,
          type: 'REFUND',
          amount,
          currency: 'INR',
          status: 'COMPLETED',
          description: `Refund: ${reason}`,
          metadata: {
            adminId,
            reason,
            originalTransactionId,
            previousBalance: currentBalance,
            newBalance,
          },
        },
      }),
    ]);

    return {
      organizationId,
      organizationName: organization.name,
      refundAmount: amount,
      newBalance,
      transactionId: transaction.id,
    };
  }

  /**
   * Export billing data to Excel
   */
  async exportBillingData(params: {
    type: 'transactions' | 'subscriptions' | 'invoices';
    startDate?: Date;
    endDate?: Date;
  }) {
    const { type, startDate, endDate } = params;
    const workbook = new ExcelJS.Workbook();

    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = startDate;
      if (endDate) dateFilter.createdAt.lte = endDate;
    }

    if (type === 'transactions') {
      const transactions = await prisma.walletTransaction.findMany({
        where: dateFilter,
        include: {
          organization: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const sheet = workbook.addWorksheet('Wallet Transactions');
      sheet.columns = [
        { header: 'Date', key: 'date', width: 20 },
        { header: 'Organization', key: 'organization', width: 30 },
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Currency', key: 'currency', width: 10 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Description', key: 'description', width: 40 },
      ];

      transactions.forEach(t => {
        sheet.addRow({
          date: t.createdAt.toISOString(),
          organization: t.organization?.name || 'N/A',
          type: t.type,
          amount: t.amount,
          currency: t.currency,
          status: t.status,
          description: t.description,
        });
      });
    } else if (type === 'subscriptions') {
      const subscriptions = await prisma.subscription.findMany({
        where: dateFilter,
        include: {
          organization: { select: { name: true } },
          plan: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const sheet = workbook.addWorksheet('Subscriptions');
      sheet.columns = [
        { header: 'Organization', key: 'organization', width: 30 },
        { header: 'Plan', key: 'plan', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Billing Cycle', key: 'billingCycle', width: 15 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Start Date', key: 'startDate', width: 20 },
        { header: 'End Date', key: 'endDate', width: 20 },
        { header: 'Created', key: 'createdAt', width: 20 },
      ];

      subscriptions.forEach(s => {
        sheet.addRow({
          organization: s.organization?.name || 'N/A',
          plan: s.plan?.name || 'N/A',
          status: s.status,
          billingCycle: s.billingCycle,
          amount: s.amount,
          startDate: s.startDate?.toISOString() || 'N/A',
          endDate: s.endDate?.toISOString() || 'N/A',
          createdAt: s.createdAt.toISOString(),
        });
      });
    } else if (type === 'invoices') {
      const invoices = await prisma.invoice.findMany({
        where: dateFilter,
        include: {
          organization: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const sheet = workbook.addWorksheet('Invoices');
      sheet.columns = [
        { header: 'Invoice Number', key: 'invoiceNumber', width: 20 },
        { header: 'Organization', key: 'organization', width: 30 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Tax', key: 'tax', width: 15 },
        { header: 'Total', key: 'total', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Due Date', key: 'dueDate', width: 20 },
        { header: 'Paid Date', key: 'paidDate', width: 20 },
        { header: 'Created', key: 'createdAt', width: 20 },
      ];

      invoices.forEach(i => {
        sheet.addRow({
          invoiceNumber: i.invoiceNumber,
          organization: i.organization?.name || 'N/A',
          amount: i.amount,
          tax: i.taxAmount,
          total: i.totalAmount,
          status: i.status,
          dueDate: i.dueDate?.toISOString() || 'N/A',
          paidDate: i.paidAt?.toISOString() || 'N/A',
          createdAt: i.createdAt.toISOString(),
        });
      });
    }

    return workbook;
  }

  /**
   * Get revenue forecast based on active subscriptions
   */
  async getRevenueForecast(months: number = 3) {
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: {
        amount: true,
        billingCycle: true,
        endDate: true,
      },
    });

    const forecast = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const forecastMonth = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);

      let projectedRevenue = 0;
      let activeCount = 0;

      activeSubscriptions.forEach(sub => {
        // Check if subscription will still be active
        if (!sub.endDate || sub.endDate > forecastMonth) {
          activeCount++;
          if (sub.billingCycle === 'MONTHLY') {
            projectedRevenue += sub.amount || 0;
          } else if (sub.billingCycle === 'ANNUAL') {
            projectedRevenue += (sub.amount || 0) / 12;
          }
        }
      });

      forecast.push({
        month: forecastMonth.toISOString().substring(0, 7),
        projectedMRR: Math.round(projectedRevenue),
        activeSubscriptions: activeCount,
      });
    }

    return forecast;
  }

  /**
   * Get phone number analytics across all tenants
   */
  async getPhoneNumberAnalytics() {
    // Get counts by provider
    const providerCounts = await prisma.phoneNumber.groupBy({
      by: ['provider'],
      _count: true,
    });

    // Get counts by status
    const statusCounts = await prisma.phoneNumber.groupBy({
      by: ['status'],
      _count: true,
    });

    // Get counts by source (PLATFORM vs BYOC)
    const sourceCounts = await prisma.phoneNumber.groupBy({
      by: ['source'],
      _count: true,
    });

    // Get total numbers
    const totalNumbers = await prisma.phoneNumber.count();

    // Get top tenants by number count
    const topTenants = await prisma.phoneNumber.groupBy({
      by: ['organizationId'],
      _count: true,
      orderBy: {
        _count: {
          organizationId: 'desc',
        },
      },
      take: 10,
    });

    // Get organization names for top tenants
    const orgIds = topTenants.map(t => t.organizationId);
    const organizations = await prisma.organization.findMany({
      where: { id: { in: orgIds } },
      select: { id: true, name: true },
    });
    const orgMap = new Map(organizations.map(o => [o.id, o.name]));

    return {
      totalNumbers,
      byProvider: providerCounts.map(p => ({
        provider: p.provider,
        count: p._count,
      })),
      byStatus: statusCounts.map(s => ({
        status: s.status,
        count: s._count,
      })),
      bySource: sourceCounts.map(s => ({
        source: s.source,
        count: s._count,
      })),
      topTenants: topTenants.map(t => ({
        organizationId: t.organizationId,
        organizationName: orgMap.get(t.organizationId) || 'Unknown',
        numberCount: t._count,
      })),
    };
  }

  /**
   * Get all phone numbers across all tenants with filters
   */
  async getAllPhoneNumbers(params: {
    page?: number;
    limit?: number;
    provider?: string;
    status?: string;
    organizationId?: string;
  }) {
    const { page = 1, limit = 20, provider, status, organizationId } = params;

    const where: any = {};
    if (provider) where.provider = provider;
    if (status) where.status = status;
    if (organizationId) where.organizationId = organizationId;

    const [numbers, total] = await Promise.all([
      prisma.phoneNumber.findMany({
        where,
        include: {
          organization: {
            select: { name: true },
          },
          assignedAgent: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.phoneNumber.count({ where }),
    ]);

    return {
      numbers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get provider usage by tenant
   */
  async getProviderUsageByTenant() {
    const usage = await prisma.phoneNumber.groupBy({
      by: ['organizationId', 'provider'],
      _count: true,
    });

    // Get organization names
    const orgIds = [...new Set(usage.map(u => u.organizationId))];
    const organizations = await prisma.organization.findMany({
      where: { id: { in: orgIds } },
      select: { id: true, name: true },
    });
    const orgMap = new Map(organizations.map(o => [o.id, o.name]));

    // Group by organization
    const byTenant: Record<string, { name: string; providers: Record<string, number> }> = {};

    usage.forEach(u => {
      if (!byTenant[u.organizationId]) {
        byTenant[u.organizationId] = {
          name: orgMap.get(u.organizationId) || 'Unknown',
          providers: {},
        };
      }
      byTenant[u.organizationId].providers[u.provider] = u._count;
    });

    return Object.entries(byTenant).map(([orgId, data]) => ({
      organizationId: orgId,
      organizationName: data.name,
      ...data.providers,
      total: Object.values(data.providers).reduce((a, b) => a + b, 0),
    }));
  }
}

export const superAdminService = new SuperAdminService();
export default superAdminService;
