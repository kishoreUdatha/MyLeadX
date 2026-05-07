import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { AppError } from '../utils/errors';
import { resendService } from './resend.service';
import { exotelService } from '../integrations/exotel.service';
import {
  AdmissionPartner,
  AdmissionPartnerType,
  AdmissionPartnerTier,
  AdmissionPartnerStatus,
  Prisma,
} from '@prisma/client';

// Commission rates by tier (default)
const TIER_COMMISSION_RATES: Record<AdmissionPartnerTier, number> = {
  BRONZE: 10,
  SILVER: 15,
  GOLD: 20,
  PLATINUM: 25,
};

// ==================== DTOs ====================

interface CreateAdmissionPartnerDto {
  organizationId: string;
  partnerType?: AdmissionPartnerType;
  tier?: AdmissionPartnerTier;
  name: string;
  email: string;
  phone: string;
  altPhone?: string;
  password: string;
  companyName?: string;
  gstNumber?: string;
  panNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  parentPartnerId?: string;
  defaultCommissionPercent?: number;
}

interface UpdateAdmissionPartnerDto {
  name?: string;
  email?: string;
  phone?: string;
  altPhone?: string;
  companyName?: string;
  gstNumber?: string;
  panNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  defaultCommissionPercent?: number;
}

interface AssignCollegeAccessDto {
  partnerId: string;
  universityId: string;
  collegeId?: string;
  courseId?: string;
  commissionOverride?: number;
}

interface CreateCommissionRuleDto {
  organizationId: string;
  partnerId?: string;
  universityId: string;
  collegeId?: string;
  courseId?: string;
  bronzePercent: number;
  silverPercent: number;
  goldPercent: number;
  platinumPercent: number;
  superPartnerSplitPercent?: number;
  subPartnerSplitPercent?: number;
  agentSplitPercent?: number;
}

interface PartnerLoginDto {
  email: string;
  password: string;
  organizationId: string;
}

interface PartnerListParams {
  organizationId: string;
  status?: AdmissionPartnerStatus;
  tier?: AdmissionPartnerTier;
  type?: AdmissionPartnerType;
  parentPartnerId?: string;
  page?: number;
  limit?: number;
  search?: string;
}

// ==================== Service ====================

class AdmissionPartnerService {
  // Generate unique partner code
  private async generatePartnerCode(organizationId: string): Promise<string> {
    const count = await prisma.admissionPartner.count({
      where: { organizationId },
    });
    const paddedNumber = (count + 1).toString().padStart(4, '0');
    return `PTR-${paddedNumber}`;
  }

  // ==================== Partner CRUD ====================

  // Create new admission partner
  async createPartner(data: CreateAdmissionPartnerDto): Promise<AdmissionPartner> {
    // Check if email already exists
    const existingEmail = await prisma.admissionPartner.findFirst({
      where: {
        organizationId: data.organizationId,
        email: data.email,
      },
    });

    if (existingEmail) {
      throw new AppError('Partner with this email already exists', 400);
    }

    // Check if phone already exists
    const existingPhone = await prisma.admissionPartner.findFirst({
      where: {
        organizationId: data.organizationId,
        phone: data.phone,
      },
    });

    if (existingPhone) {
      throw new AppError('Partner with this phone number already exists', 400);
    }

    // Validate parent partner if provided
    if (data.parentPartnerId) {
      const parentPartner = await prisma.admissionPartner.findUnique({
        where: { id: data.parentPartnerId },
      });

      if (!parentPartner) {
        throw new AppError('Parent partner not found', 404);
      }

      if (parentPartner.organizationId !== data.organizationId) {
        throw new AppError('Parent partner belongs to different organization', 400);
      }

      // Set partner type based on parent
      if (parentPartner.partnerType === 'SUPER_PARTNER') {
        data.partnerType = 'SUB_PARTNER';
      } else if (parentPartner.partnerType === 'SUB_PARTNER') {
        data.partnerType = 'AGENT';
      }
    }

    // Generate partner code
    const partnerCode = await this.generatePartnerCode(data.organizationId);

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Determine commission rate
    const tier = data.tier || 'BRONZE';
    const defaultCommission = data.defaultCommissionPercent || TIER_COMMISSION_RATES[tier];

    const partner = await prisma.admissionPartner.create({
      data: {
        organizationId: data.organizationId,
        partnerCode,
        partnerType: data.partnerType || 'AGENT',
        tier,
        status: 'ACTIVE', // Can be changed to PENDING_APPROVAL if approval workflow needed
        name: data.name,
        email: data.email,
        phone: data.phone,
        altPhone: data.altPhone,
        passwordHash,
        companyName: data.companyName,
        gstNumber: data.gstNumber,
        panNumber: data.panNumber,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        parentPartnerId: data.parentPartnerId,
        defaultCommissionPercent: defaultCommission,
      },
    });

    // Create wallet for partner
    await prisma.admissionPartnerWallet.create({
      data: {
        partnerId: partner.id,
      },
    });

    // Log activity
    await this.logActivity(partner.id, 'PARTNER_CREATED', 'Partner account created');

    // Send welcome credentials via Email and WhatsApp
    await this.sendWelcomeCredentials(partner, data.password, data.organizationId);

    return partner;
  }

  // Send welcome credentials to partner
  private async sendWelcomeCredentials(
    partner: AdmissionPartner,
    plainPassword: string,
    organizationId: string
  ): Promise<void> {
    try {
      // Get organization details for the login URL
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { name: true, slug: true },
      });

      const orgSlug = organization?.slug || '';
      const orgName = organization?.name || 'Our Organization';
      const baseUrl = process.env.FRONTEND_URL || 'https://app.myleadx.ai';
      const loginUrl = `${baseUrl}/admission-partner/login/${orgSlug}`;

      // Send Email
      if (resendService.isConfigured()) {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">Welcome to ${orgName}!</h1>
              <p style="color: rgba(255,255,255,0.9); margin-top: 10px;">Partner Portal Access</p>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p>Dear <strong>${partner.name}</strong>,</p>
              <p>Congratulations! Your partner account has been created successfully. You can now start referring students and earning commissions.</p>

              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #374151;">Your Login Credentials</h3>
                <p style="margin: 5px 0;"><strong>Partner Code:</strong> ${partner.partnerCode}</p>
                <p style="margin: 5px 0;"><strong>Email:</strong> ${partner.email}</p>
                <p style="margin: 5px 0;"><strong>Password:</strong> ${plainPassword}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${loginUrl}" style="background: #667eea; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Login to Partner Portal</a>
              </div>

              <p style="color: #6b7280; font-size: 14px;">Please change your password after first login for security.</p>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                This is an automated message. Please do not reply to this email.
              </p>
            </div>
          </div>
        `;

        await resendService.sendEmail({
          to: partner.email,
          subject: `Welcome to ${orgName} Partner Portal - Your Login Credentials`,
          body: `Welcome ${partner.name}! Your partner account has been created.\n\nPartner Code: ${partner.partnerCode}\nEmail: ${partner.email}\nPassword: ${plainPassword}\n\nLogin at: ${loginUrl}`,
          html: emailHtml,
        });
        console.log(`[AdmissionPartner] Welcome email sent to ${partner.email}`);
      }

      // Send WhatsApp
      if (await exotelService.isWhatsAppConfigured()) {
        const whatsappMessage = `🎉 *Welcome to ${orgName} Partner Portal!*

Hello ${partner.name},

Your partner account has been created successfully.

*Your Login Credentials:*
📋 Partner Code: ${partner.partnerCode}
📧 Email: ${partner.email}
🔑 Password: ${plainPassword}

🔗 Login here: ${loginUrl}

Start referring students today and earn commissions on every successful admission!

Please change your password after first login.`;

        await exotelService.sendWhatsApp({
          to: partner.phone,
          message: whatsappMessage,
        });
        console.log(`[AdmissionPartner] Welcome WhatsApp sent to ${partner.phone}`);
      }
    } catch (error) {
      // Don't fail partner creation if notification fails
      console.error('[AdmissionPartner] Failed to send welcome credentials:', error);
    }
  }

  // Get partner by ID
  async getPartnerById(id: string): Promise<AdmissionPartner | null> {
    return prisma.admissionPartner.findUnique({
      where: { id },
      include: {
        parentPartner: {
          select: {
            id: true,
            name: true,
            partnerCode: true,
            partnerType: true,
          },
        },
        childPartners: {
          select: {
            id: true,
            name: true,
            partnerCode: true,
            partnerType: true,
            status: true,
          },
        },
        collegeAccess: true,
        wallet: true,
        bankDetails: {
          where: { isPrimary: true },
        },
        _count: {
          select: {
            applications: true,
            childPartners: true,
          },
        },
      },
    });
  }

  // Get partner by email (for login)
  async getPartnerByEmail(organizationId: string, email: string): Promise<AdmissionPartner | null> {
    return prisma.admissionPartner.findFirst({
      where: {
        organizationId,
        email,
      },
    });
  }

  // List partners with filters
  async listPartners(params: PartnerListParams) {
    const {
      organizationId,
      status,
      tier,
      type,
      parentPartnerId,
      page = 1,
      limit = 10,
      search,
    } = params;

    const where: Prisma.AdmissionPartnerWhereInput = {
      organizationId,
    };

    if (status) where.status = status;
    if (tier) where.tier = tier;
    if (type) where.partnerType = type;
    if (parentPartnerId !== undefined) {
      where.parentPartnerId = parentPartnerId || null;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { partnerCode: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [partners, total] = await Promise.all([
      prisma.admissionPartner.findMany({
        where,
        include: {
          parentPartner: {
            select: {
              id: true,
              name: true,
              partnerCode: true,
            },
          },
          wallet: {
            select: {
              availableBalance: true,
              pendingBalance: true,
            },
          },
          _count: {
            select: {
              applications: true,
              childPartners: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.admissionPartner.count({ where }),
    ]);

    return {
      partners,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Update partner
  async updatePartner(id: string, data: UpdateAdmissionPartnerDto): Promise<AdmissionPartner> {
    const partner = await prisma.admissionPartner.findUnique({ where: { id } });

    if (!partner) {
      throw new AppError('Partner not found', 404);
    }

    // Check for duplicate email if changing
    if (data.email && data.email !== partner.email) {
      const existingEmail = await prisma.admissionPartner.findFirst({
        where: {
          organizationId: partner.organizationId,
          email: data.email,
          id: { not: id },
        },
      });

      if (existingEmail) {
        throw new AppError('Email already in use by another partner', 400);
      }
    }

    // Check for duplicate phone if changing
    if (data.phone && data.phone !== partner.phone) {
      const existingPhone = await prisma.admissionPartner.findFirst({
        where: {
          organizationId: partner.organizationId,
          phone: data.phone,
          id: { not: id },
        },
      });

      if (existingPhone) {
        throw new AppError('Phone number already in use by another partner', 400);
      }
    }

    const updated = await prisma.admissionPartner.update({
      where: { id },
      data,
    });

    await this.logActivity(id, 'PARTNER_UPDATED', 'Partner details updated');

    return updated;
  }

  // Update partner status
  async updatePartnerStatus(
    id: string,
    status: AdmissionPartnerStatus,
    reason?: string,
    suspendedUntil?: Date
  ): Promise<AdmissionPartner> {
    const partner = await prisma.admissionPartner.findUnique({ where: { id } });

    if (!partner) {
      throw new AppError('Partner not found', 404);
    }

    const updateData: Prisma.AdmissionPartnerUpdateInput = {
      status,
    };

    if (status === 'BLOCKED') {
      updateData.blockedReason = reason;
    } else if (status === 'SUSPENDED') {
      updateData.suspendedReason = reason;
      updateData.suspendedUntil = suspendedUntil;
    }

    const updated = await prisma.admissionPartner.update({
      where: { id },
      data: updateData,
    });

    await this.logActivity(id, `PARTNER_${status}`, reason || `Partner status changed to ${status}`);

    return updated;
  }

  // Update partner tier
  async updatePartnerTier(id: string, tier: AdmissionPartnerTier): Promise<AdmissionPartner> {
    const partner = await prisma.admissionPartner.findUnique({ where: { id } });

    if (!partner) {
      throw new AppError('Partner not found', 404);
    }

    const updated = await prisma.admissionPartner.update({
      where: { id },
      data: {
        tier,
        defaultCommissionPercent: TIER_COMMISSION_RATES[tier],
      },
    });

    await this.logActivity(id, 'TIER_CHANGED', `Partner tier changed to ${tier}`);

    return updated;
  }

  // ==================== Authentication ====================

  // Partner login
  async login(data: PartnerLoginDto): Promise<{ partner: AdmissionPartner; token: string }> {
    const partner = await prisma.admissionPartner.findFirst({
      where: {
        organizationId: data.organizationId,
        email: data.email,
      },
    });

    if (!partner) {
      throw new AppError('Invalid email or password', 401);
    }

    if (partner.status === 'BLOCKED') {
      throw new AppError('Your account has been blocked. Please contact support.', 403);
    }

    if (partner.status === 'SUSPENDED') {
      if (partner.suspendedUntil && partner.suspendedUntil > new Date()) {
        throw new AppError(
          `Your account is suspended until ${partner.suspendedUntil.toLocaleDateString()}`,
          403
        );
      }
      // Auto-reactivate if suspension period ended
      await prisma.admissionPartner.update({
        where: { id: partner.id },
        data: {
          status: 'ACTIVE',
          suspendedReason: null,
          suspendedUntil: null,
        },
      });
    }

    if (partner.status === 'PENDING_APPROVAL') {
      throw new AppError('Your account is pending approval', 403);
    }

    const isValidPassword = await bcrypt.compare(data.password, partner.passwordHash);

    if (!isValidPassword) {
      throw new AppError('Invalid email or password', 401);
    }

    // Generate token (simple JWT-like token for partner portal)
    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Update last login
    await prisma.admissionPartner.update({
      where: { id: partner.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    await this.logActivity(partner.id, 'LOGIN', 'Partner logged in');

    return { partner, token };
  }

  // Change password
  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const partner = await prisma.admissionPartner.findUnique({ where: { id } });

    if (!partner) {
      throw new AppError('Partner not found', 404);
    }

    const isValidPassword = await bcrypt.compare(currentPassword, partner.passwordHash);

    if (!isValidPassword) {
      throw new AppError('Current password is incorrect', 400);
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await prisma.admissionPartner.update({
      where: { id },
      data: { passwordHash: newPasswordHash },
    });

    await this.logActivity(id, 'PASSWORD_CHANGED', 'Partner changed password');
  }

  // Reset password (admin action)
  async resetPassword(id: string, newPassword: string): Promise<void> {
    const partner = await prisma.admissionPartner.findUnique({ where: { id } });

    if (!partner) {
      throw new AppError('Partner not found', 404);
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await prisma.admissionPartner.update({
      where: { id },
      data: { passwordHash: newPasswordHash },
    });

    await this.logActivity(id, 'PASSWORD_RESET', 'Partner password reset by admin');
  }

  // ==================== College Access Management ====================

  // Assign college access to partner
  async assignCollegeAccess(data: AssignCollegeAccessDto): Promise<any> {
    const partner = await prisma.admissionPartner.findUnique({
      where: { id: data.partnerId },
    });

    if (!partner) {
      throw new AppError('Partner not found', 404);
    }

    // Check if access already exists
    const existingAccess = await prisma.admissionPartnerCollegeAccess.findFirst({
      where: {
        partnerId: data.partnerId,
        universityId: data.universityId,
        collegeId: data.collegeId || null,
        courseId: data.courseId || null,
      },
    });

    if (existingAccess) {
      // Update existing access
      return prisma.admissionPartnerCollegeAccess.update({
        where: { id: existingAccess.id },
        data: {
          commissionOverride: data.commissionOverride,
          isActive: true,
        },
      });
    }

    // Create new access
    return prisma.admissionPartnerCollegeAccess.create({
      data: {
        partnerId: data.partnerId,
        universityId: data.universityId,
        collegeId: data.collegeId,
        courseId: data.courseId,
        commissionOverride: data.commissionOverride,
      },
    });
  }

  // Remove college access
  async removeCollegeAccess(accessId: string): Promise<void> {
    await prisma.admissionPartnerCollegeAccess.update({
      where: { id: accessId },
      data: { isActive: false },
    });
  }

  // Get partner's college access
  async getPartnerCollegeAccess(partnerId: string) {
    return prisma.admissionPartnerCollegeAccess.findMany({
      where: {
        partnerId,
        isActive: true,
      },
    });
  }

  // Get accessible universities for partner
  async getAccessibleUniversities(partnerId: string, organizationId: string) {
    const partner = await prisma.admissionPartner.findUnique({
      where: { id: partnerId },
      include: {
        collegeAccess: {
          where: { isActive: true },
        },
      },
    });

    if (!partner) {
      throw new AppError('Partner not found', 404);
    }

    // If no specific access defined, return all active universities
    if (partner.collegeAccess.length === 0) {
      return prisma.university.findMany({
        where: {
          organizationId,
          isActive: true,
        },
        orderBy: { name: 'asc' },
      });
    }

    // Return only accessible universities
    const universityIds = [...new Set(partner.collegeAccess.map((a) => a.universityId))];

    return prisma.university.findMany({
      where: {
        id: { in: universityIds },
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  // ==================== Commission Rules ====================

  // Create commission rule
  async createCommissionRule(data: CreateCommissionRuleDto) {
    return prisma.admissionPartnerCommissionRule.create({
      data: {
        organizationId: data.organizationId,
        partnerId: data.partnerId,
        universityId: data.universityId,
        collegeId: data.collegeId,
        courseId: data.courseId,
        bronzePercent: data.bronzePercent,
        silverPercent: data.silverPercent,
        goldPercent: data.goldPercent,
        platinumPercent: data.platinumPercent,
        superPartnerSplitPercent: data.superPartnerSplitPercent || 60,
        subPartnerSplitPercent: data.subPartnerSplitPercent || 30,
        agentSplitPercent: data.agentSplitPercent || 10,
      },
    });
  }

  // Get commission rate for partner and college
  async getCommissionRate(
    partnerId: string,
    universityId: string,
    collegeId?: string,
    courseId?: string
  ): Promise<number> {
    const partner = await prisma.admissionPartner.findUnique({
      where: { id: partnerId },
      include: {
        collegeAccess: {
          where: {
            universityId,
            collegeId: collegeId || null,
            courseId: courseId || null,
            isActive: true,
          },
        },
      },
    });

    if (!partner) {
      throw new AppError('Partner not found', 404);
    }

    // Check for override in college access
    const access = partner.collegeAccess[0];
    if (access?.commissionOverride) {
      return Number(access.commissionOverride);
    }

    // Check for commission rule
    const rule = await prisma.admissionPartnerCommissionRule.findFirst({
      where: {
        organizationId: partner.organizationId,
        universityId,
        OR: [
          { partnerId: partnerId },
          { partnerId: null }, // Global rule
        ],
        isActive: true,
      },
      orderBy: {
        partnerId: 'desc', // Partner-specific rules take precedence
      },
    });

    if (rule) {
      const rateField = `${partner.tier.toLowerCase()}Percent` as keyof typeof rule;
      return Number(rule[rateField]);
    }

    // Default to partner's default commission
    return Number(partner.defaultCommissionPercent);
  }

  // ==================== Dashboard & Stats ====================

  // Get partner dashboard stats
  async getPartnerDashboard(partnerId: string) {
    const partner = await prisma.admissionPartner.findUnique({
      where: { id: partnerId },
      include: {
        wallet: true,
        _count: {
          select: {
            applications: true,
            childPartners: true,
          },
        },
      },
    });

    if (!partner) {
      throw new AppError('Partner not found', 404);
    }

    // Get application stats
    const applicationStats = await prisma.partnerApplication.groupBy({
      by: ['status'],
      where: { partnerId },
      _count: { id: true },
    });

    // Get this month's stats
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyStats = await prisma.partnerApplication.aggregate({
      where: {
        partnerId,
        createdAt: { gte: startOfMonth },
      },
      _count: { id: true },
      _sum: {
        commissionAmount: true,
        totalFee: true,
      },
    });

    // Get recent activity
    const recentActivity = await prisma.admissionPartnerActivityLog.findMany({
      where: { partnerId },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    // Format application stats
    const statusCounts: Record<string, number> = {};
    applicationStats.forEach((stat) => {
      statusCounts[stat.status] = stat._count.id;
    });

    return {
      partner: {
        id: partner.id,
        name: partner.name,
        partnerCode: partner.partnerCode,
        tier: partner.tier,
        status: partner.status,
        defaultCommissionPercent: partner.defaultCommissionPercent,
      },
      stats: {
        totalApplications: partner._count.applications,
        totalAdmissions: partner.totalAdmissions,
        totalRevenue: partner.totalRevenue,
        totalCommissionEarned: partner.totalCommissionEarned,
        teamSize: partner._count.childPartners,
      },
      wallet: partner.wallet
        ? {
            availableBalance: partner.wallet.availableBalance,
            pendingBalance: partner.wallet.pendingBalance,
            totalEarned: partner.wallet.totalEarned,
            totalPaid: partner.wallet.totalPaid,
          }
        : {
            availableBalance: 0,
            pendingBalance: 0,
            totalEarned: 0,
            totalPaid: 0,
          },
      applicationsByStatus: statusCounts,
      monthly: {
        applications: monthlyStats._count.id,
        commission: monthlyStats._sum.commissionAmount || 0,
        revenue: monthlyStats._sum.totalFee || 0,
      },
      recentActivity,
    };
  }

  // Get team members (for super partner / sub partner)
  async getTeamMembers(partnerId: string, params: { page?: number; limit?: number }) {
    const { page = 1, limit = 10 } = params;

    const partner = await prisma.admissionPartner.findUnique({
      where: { id: partnerId },
    });

    if (!partner) {
      throw new AppError('Partner not found', 404);
    }

    const [members, total] = await Promise.all([
      prisma.admissionPartner.findMany({
        where: {
          parentPartnerId: partnerId,
        },
        include: {
          wallet: {
            select: {
              availableBalance: true,
              pendingBalance: true,
            },
          },
          _count: {
            select: {
              applications: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.admissionPartner.count({
        where: { parentPartnerId: partnerId },
      }),
    ]);

    return {
      members,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== Bank Details ====================

  // Add/Update bank details
  async updateBankDetails(
    partnerId: string,
    data: {
      accountHolderName: string;
      accountNumber: string;
      bankName: string;
      ifscCode: string;
      branchName?: string;
      accountType?: string;
      upiId?: string;
      isPrimary?: boolean;
    }
  ) {
    const partner = await prisma.admissionPartner.findUnique({
      where: { id: partnerId },
    });

    if (!partner) {
      throw new AppError('Partner not found', 404);
    }

    // If setting as primary, unset other primary
    if (data.isPrimary) {
      await prisma.admissionPartnerBankDetails.updateMany({
        where: { partnerId },
        data: { isPrimary: false },
      });
    }

    // Check if bank details already exist for this account number
    const existing = await prisma.admissionPartnerBankDetails.findFirst({
      where: {
        partnerId,
        accountNumber: data.accountNumber,
      },
    });

    if (existing) {
      return prisma.admissionPartnerBankDetails.update({
        where: { id: existing.id },
        data: {
          ...data,
          isVerified: false, // Reset verification on update
        },
      });
    }

    return prisma.admissionPartnerBankDetails.create({
      data: {
        partnerId,
        ...data,
        isPrimary: data.isPrimary ?? true,
      },
    });
  }

  // Get bank details
  async getBankDetails(partnerId: string) {
    return prisma.admissionPartnerBankDetails.findMany({
      where: { partnerId },
      orderBy: { isPrimary: 'desc' },
    });
  }

  // Verify bank details (admin action)
  async verifyBankDetails(bankDetailsId: string, verifiedById: string) {
    return prisma.admissionPartnerBankDetails.update({
      where: { id: bankDetailsId },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        verifiedById,
      },
    });
  }

  // ==================== Partner Applications ====================

  // Get applications for a specific partner
  async getPartnerApplications(partnerId: string, params: {
    page?: number;
    limit?: number;
    status?: string;
    universityId?: string;
    collegeId?: string;
    search?: string;
  }) {
    const { page = 1, limit = 20, status, universityId, collegeId, search } = params;

    const partner = await prisma.admissionPartner.findUnique({
      where: { id: partnerId },
    });

    if (!partner) {
      throw new AppError('Partner not found', 404);
    }

    const where: any = { partnerId };

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by university
    if (universityId) {
      where.universityId = universityId;
    }

    // Filter by college
    if (collegeId) {
      where.collegeId = collegeId;
    }

    // Search by student name, phone, or application number
    if (search) {
      where.OR = [
        { studentName: { contains: search, mode: 'insensitive' } },
        { studentPhone: { contains: search } },
        { applicationNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [applications, total] = await Promise.all([
      prisma.partnerApplication.findMany({
        where,
        include: {
          university: {
            select: { id: true, name: true },
          },
          college: {
            select: { id: true, name: true },
          },
          course: {
            select: { id: true, name: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.partnerApplication.count({ where }),
    ]);

    return {
      applications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== Partner Stats (Admin) ====================

  // Get organization-level partner statistics
  async getPartnerStats(organizationId: string) {
    // Total partners by status
    const partnersByStatus = await prisma.admissionPartner.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: { id: true },
    });

    // Total partners by tier
    const partnersByTier = await prisma.admissionPartner.groupBy({
      by: ['tier'],
      where: { organizationId },
      _count: { id: true },
    });

    // Total partners by type
    const partnersByType = await prisma.admissionPartner.groupBy({
      by: ['partnerType'],
      where: { organizationId },
      _count: { id: true },
    });

    // Overall totals
    const totals = await prisma.admissionPartner.aggregate({
      where: { organizationId },
      _count: { id: true },
      _sum: {
        totalAdmissions: true,
        totalRevenue: true,
        totalCommissionEarned: true,
      },
    });

    // Recent partners (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentPartnersCount = await prisma.admissionPartner.count({
      where: {
        organizationId,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    // Format the counts
    const statusCounts: Record<string, number> = {};
    partnersByStatus.forEach((item) => {
      statusCounts[item.status] = item._count.id;
    });

    const tierCounts: Record<string, number> = {};
    partnersByTier.forEach((item) => {
      tierCounts[item.tier] = item._count.id;
    });

    const typeCounts: Record<string, number> = {};
    partnersByType.forEach((item) => {
      typeCounts[item.partnerType] = item._count.id;
    });

    return {
      totalPartners: totals._count.id || 0,
      totalAdmissions: totals._sum.totalAdmissions || 0,
      totalRevenue: totals._sum.totalRevenue || 0,
      totalCommission: totals._sum.totalCommissionEarned || 0,
      recentPartnersCount,
      byStatus: statusCounts,
      byTier: tierCounts,
      byType: typeCounts,
    };
  }

  // Get partner earnings/commission history
  async getPartnerEarnings(partnerId: string, params: { page?: number; limit?: number; startDate?: string; endDate?: string }) {
    const { page = 1, limit = 20, startDate, endDate } = params;

    const partner = await prisma.admissionPartner.findUnique({
      where: { id: partnerId },
      include: {
        wallet: true,
      },
    });

    if (!partner) {
      throw new AppError('Partner not found', 404);
    }

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // Get commission history from applications
    const where: any = {
      partnerId,
      commissionAmount: { gt: 0 },
    };

    if (startDate || endDate) {
      where.createdAt = dateFilter;
    }

    const [commissions, total] = await Promise.all([
      prisma.partnerApplication.findMany({
        where,
        select: {
          id: true,
          studentName: true,
          applicationNumber: true,
          status: true,
          totalFee: true,
          commissionRate: true,
          commissionAmount: true,
          commissionStatus: true,
          createdAt: true,
          university: {
            select: { name: true },
          },
          college: {
            select: { name: true },
          },
          course: {
            select: { name: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.partnerApplication.count({ where }),
    ]);

    // Get summary stats
    const stats = await prisma.partnerApplication.aggregate({
      where: {
        partnerId,
        commissionAmount: { gt: 0 },
      },
      _sum: {
        commissionAmount: true,
        totalFee: true,
      },
      _count: { id: true },
    });

    // Get pending vs paid breakdown
    const pendingCommission = await prisma.partnerApplication.aggregate({
      where: {
        partnerId,
        commissionAmount: { gt: 0 },
        commissionStatus: 'PENDING',
      },
      _sum: { commissionAmount: true },
    });

    const paidCommission = await prisma.partnerApplication.aggregate({
      where: {
        partnerId,
        commissionAmount: { gt: 0 },
        commissionStatus: 'PAID',
      },
      _sum: { commissionAmount: true },
    });

    return {
      summary: {
        totalEarnings: stats._sum.commissionAmount || 0,
        totalRevenue: stats._sum.totalFee || 0,
        totalApplications: stats._count.id,
        pendingCommission: pendingCommission._sum.commissionAmount || 0,
        paidCommission: paidCommission._sum.commissionAmount || 0,
        walletBalance: partner.wallet?.availableBalance || 0,
        pendingBalance: partner.wallet?.pendingBalance || 0,
      },
      commissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== Activity Logging ====================

  // Log partner activity
  async logActivity(
    partnerId: string,
    action: string,
    description?: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    return prisma.admissionPartnerActivityLog.create({
      data: {
        partnerId,
        action,
        description,
        details: details || {},
        ipAddress,
        userAgent,
      },
    });
  }

  // Get activity logs
  async getActivityLogs(partnerId: string, params: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = params;

    const [logs, total] = await Promise.all([
      prisma.admissionPartnerActivityLog.findMany({
        where: { partnerId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.admissionPartnerActivityLog.count({ where: { partnerId } }),
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
}

export const admissionPartnerService = new AdmissionPartnerService();
