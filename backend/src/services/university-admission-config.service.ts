import { prisma } from '../config/database';
import { AppError } from '../utils/errors';
import { Decimal } from '@prisma/client/runtime/library';

// ==================== Types ====================

type ApplicationMode = 'OFFLINE' | 'ONLINE' | 'HYBRID';
type PaymentMode = 'ONLINE_GATEWAY' | 'OFFLINE_QR' | 'EXTERNAL' | 'HYBRID';

interface RequiredDocument {
  docType: string;
  docName: string;
  required: boolean;
  maxSizeMB?: number;
  description?: string;
}

interface OtherFee {
  feeName: string;
  amount: number;
  frequency?: string; // ONE_TIME, YEARLY, SEMESTER
  required?: boolean;
}

interface CreateAdmissionConfigDto {
  organizationId: string;
  universityId: string;
  collegeId?: string;
  courseId?: string;
  configName: string;
  description?: string;
  academicYear: string;

  // Application Mode
  applicationMode?: ApplicationMode;

  // Offline settings
  useCustomForm?: boolean;
  requiredDocuments?: RequiredDocument[];

  // Online settings
  externalPortalUrl?: string;
  externalPortalName?: string;
  externalInstructions?: string;
  trackExternalAppNumber?: boolean;
  trackExternalPayment?: boolean;

  // Payment Mode
  paymentMode?: PaymentMode;

  // Gateway settings
  paymentGateway?: string;
  gatewayMerchantId?: string;
  gatewaySecretKey?: string;
  gatewayWebhookUrl?: string;

  // Fee structure
  applicationFee?: number;
  admissionFee?: number;
  tuitionFeePerYear?: number;
  hostelFeePerYear?: number;
  otherFees?: OtherFee[];
  totalFeeAmount?: number;

  // Scholarship
  scholarshipEnabled?: boolean;
  maxScholarshipPercent?: number;
  scholarshipCriteria?: string;

  // Commission
  commissionPercent?: number;
  commissionOnFeeType?: string;
  commissionCapAmount?: number;

  // Availability
  applicationStartDate?: Date;
  applicationEndDate?: Date;
  seatsTotal?: number;

  // Display
  logoUrl?: string;
  bannerUrl?: string;
  brochureUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  websiteUrl?: string;

  isFeatured?: boolean;
}

interface UpdateAdmissionConfigDto extends Partial<Omit<CreateAdmissionConfigDto, 'organizationId' | 'universityId' | 'collegeId' | 'courseId' | 'academicYear'>> {
  isActive?: boolean;
  seatsFilled?: number;
}

interface ListConfigsParams {
  organizationId: string;
  universityId?: string;
  collegeId?: string;
  applicationMode?: ApplicationMode;
  academicYear?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  page?: number;
  limit?: number;
}

// ==================== Service ====================

class UniversityAdmissionConfigService {
  // Create admission configuration
  async createConfig(data: CreateAdmissionConfigDto) {
    // Check if config already exists
    const existing = await prisma.universityAdmissionConfig.findFirst({
      where: {
        organizationId: data.organizationId,
        universityId: data.universityId,
        collegeId: data.collegeId || null,
        courseId: data.courseId || null,
        academicYear: data.academicYear,
      },
    });

    if (existing) {
      throw new AppError(
        `Admission configuration already exists for this university/college/course for ${data.academicYear}`,
        400
      );
    }

    // Validate application mode settings
    if (data.applicationMode === 'ONLINE' || data.applicationMode === 'HYBRID') {
      if (!data.externalPortalUrl) {
        throw new AppError('External portal URL is required for ONLINE/HYBRID mode', 400);
      }
    }

    // Validate payment mode settings
    if (data.paymentMode === 'ONLINE_GATEWAY') {
      if (!data.paymentGateway || !data.gatewayMerchantId) {
        throw new AppError('Payment gateway details are required for ONLINE_GATEWAY mode', 400);
      }
    }

    const config = await prisma.universityAdmissionConfig.create({
      data: {
        organizationId: data.organizationId,
        universityId: data.universityId,
        collegeId: data.collegeId,
        courseId: data.courseId,
        configName: data.configName,
        description: data.description,
        academicYear: data.academicYear,

        applicationMode: data.applicationMode || 'OFFLINE',
        useCustomForm: data.useCustomForm ?? true,
        requiredDocuments: (data.requiredDocuments || []) as any,

        externalPortalUrl: data.externalPortalUrl,
        externalPortalName: data.externalPortalName,
        externalInstructions: data.externalInstructions,
        trackExternalAppNumber: data.trackExternalAppNumber ?? true,
        trackExternalPayment: data.trackExternalPayment ?? true,

        paymentMode: data.paymentMode || 'OFFLINE_QR',
        paymentGateway: data.paymentGateway,
        gatewayMerchantId: data.gatewayMerchantId,
        gatewaySecretKey: data.gatewaySecretKey,
        gatewayWebhookUrl: data.gatewayWebhookUrl,

        applicationFee: data.applicationFee,
        admissionFee: data.admissionFee,
        tuitionFeePerYear: data.tuitionFeePerYear,
        hostelFeePerYear: data.hostelFeePerYear,
        otherFees: (data.otherFees || []) as any,
        totalFeeAmount: data.totalFeeAmount,

        scholarshipEnabled: data.scholarshipEnabled ?? false,
        maxScholarshipPercent: data.maxScholarshipPercent,
        scholarshipCriteria: data.scholarshipCriteria,

        commissionPercent: data.commissionPercent,
        commissionOnFeeType: data.commissionOnFeeType || 'ADMISSION_FEE',
        commissionCapAmount: data.commissionCapAmount,

        applicationStartDate: data.applicationStartDate,
        applicationEndDate: data.applicationEndDate,
        seatsTotal: data.seatsTotal,

        logoUrl: data.logoUrl,
        bannerUrl: data.bannerUrl,
        brochureUrl: data.brochureUrl,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        websiteUrl: data.websiteUrl,

        isFeatured: data.isFeatured ?? false,
      },
    });

    return config;
  }

  // Get config by ID
  async getConfigById(id: string) {
    const config = await prisma.universityAdmissionConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new AppError('Admission configuration not found', 404);
    }

    return config;
  }

  // Get config for a specific university/college/course (with fallback to less specific)
  async getConfigForAdmission(
    organizationId: string,
    universityId: string,
    academicYear: string,
    collegeId?: string,
    courseId?: string
  ) {
    // Try to find the most specific config first
    const config = await prisma.universityAdmissionConfig.findFirst({
      where: {
        organizationId,
        universityId,
        academicYear,
        isActive: true,
        OR: [
          // Most specific: course level
          { collegeId, courseId },
          // College level
          { collegeId, courseId: null },
          // University default
          { collegeId: null, courseId: null },
        ],
      },
      orderBy: [
        { courseId: 'desc' },
        { collegeId: 'desc' },
      ],
    });

    return config;
  }

  // Get configs available for partners (for creating applications)
  async getAvailableConfigs(organizationId: string, partnerId: string) {
    // Get partner's college access
    const partnerAccess = await prisma.admissionPartnerCollegeAccess.findMany({
      where: {
        partnerId,
        isActive: true,
      },
      select: {
        universityId: true,
        collegeId: true,
        courseId: true,
      },
    });

    const now = new Date();

    // If partner has specific access, filter by that
    if (partnerAccess.length > 0) {
      const accessConditions = partnerAccess.map(access => ({
        universityId: access.universityId,
        ...(access.collegeId && { collegeId: access.collegeId }),
        ...(access.courseId && { courseId: access.courseId }),
      }));

      return prisma.universityAdmissionConfig.findMany({
        where: {
          organizationId,
          isActive: true,
          OR: [
            { applicationEndDate: null },
            { applicationEndDate: { gte: now } },
          ],
          AND: [
            { OR: accessConditions },
          ],
        },
        orderBy: [
          { isFeatured: 'desc' },
          { configName: 'asc' },
        ],
      });
    }

    // If no specific access, return all active configs for the org
    return prisma.universityAdmissionConfig.findMany({
      where: {
        organizationId,
        isActive: true,
        OR: [
          { applicationEndDate: null },
          { applicationEndDate: { gte: now } },
        ],
      },
      orderBy: [
        { isFeatured: 'desc' },
        { configName: 'asc' },
      ],
    });
  }

  // List all configs for admin
  async listConfigs(params: ListConfigsParams) {
    const {
      organizationId,
      universityId,
      collegeId,
      applicationMode,
      academicYear,
      isActive,
      isFeatured,
      page = 1,
      limit = 20,
    } = params;

    const where: any = { organizationId };

    if (universityId) where.universityId = universityId;
    if (collegeId) where.collegeId = collegeId;
    if (applicationMode) where.applicationMode = applicationMode;
    if (academicYear) where.academicYear = academicYear;
    if (isActive !== undefined) where.isActive = isActive;
    if (isFeatured !== undefined) where.isFeatured = isFeatured;

    const [configs, total] = await Promise.all([
      prisma.universityAdmissionConfig.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { academicYear: 'desc' },
          { configName: 'asc' },
        ],
      }),
      prisma.universityAdmissionConfig.count({ where }),
    ]);

    return {
      configs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Update config
  async updateConfig(id: string, data: UpdateAdmissionConfigDto) {
    const config = await prisma.universityAdmissionConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new AppError('Admission configuration not found', 404);
    }

    const updated = await prisma.universityAdmissionConfig.update({
      where: { id },
      data: {
        configName: data.configName,
        description: data.description,

        applicationMode: data.applicationMode,
        useCustomForm: data.useCustomForm,
        requiredDocuments: data.requiredDocuments as any,

        externalPortalUrl: data.externalPortalUrl,
        externalPortalName: data.externalPortalName,
        externalInstructions: data.externalInstructions,
        trackExternalAppNumber: data.trackExternalAppNumber,
        trackExternalPayment: data.trackExternalPayment,

        paymentMode: data.paymentMode,
        paymentGateway: data.paymentGateway,
        gatewayMerchantId: data.gatewayMerchantId,
        gatewaySecretKey: data.gatewaySecretKey,
        gatewayWebhookUrl: data.gatewayWebhookUrl,

        applicationFee: data.applicationFee,
        admissionFee: data.admissionFee,
        tuitionFeePerYear: data.tuitionFeePerYear,
        hostelFeePerYear: data.hostelFeePerYear,
        otherFees: data.otherFees as any,
        totalFeeAmount: data.totalFeeAmount,

        scholarshipEnabled: data.scholarshipEnabled,
        maxScholarshipPercent: data.maxScholarshipPercent,
        scholarshipCriteria: data.scholarshipCriteria,

        commissionPercent: data.commissionPercent,
        commissionOnFeeType: data.commissionOnFeeType,
        commissionCapAmount: data.commissionCapAmount,

        applicationStartDate: data.applicationStartDate,
        applicationEndDate: data.applicationEndDate,
        seatsTotal: data.seatsTotal,
        seatsFilled: data.seatsFilled,

        logoUrl: data.logoUrl,
        bannerUrl: data.bannerUrl,
        brochureUrl: data.brochureUrl,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        websiteUrl: data.websiteUrl,

        isActive: data.isActive,
        isFeatured: data.isFeatured,
      },
    });

    return updated;
  }

  // Delete config
  async deleteConfig(id: string) {
    const config = await prisma.universityAdmissionConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new AppError('Admission configuration not found', 404);
    }

    // Check if there are any applications using this config
    const applicationCount = await prisma.partnerApplication.count({
      where: {
        organizationId: config.organizationId,
        universityId: config.universityId,
        collegeId: config.collegeId,
        courseId: config.courseId,
        academicYear: config.academicYear,
      },
    });

    if (applicationCount > 0) {
      throw new AppError(
        `Cannot delete: ${applicationCount} applications exist for this configuration. Deactivate instead.`,
        400
      );
    }

    await prisma.universityAdmissionConfig.delete({
      where: { id },
    });

    return { message: 'Admission configuration deleted successfully' };
  }

  // Clone config for new academic year
  async cloneConfig(sourceId: string, newAcademicYear: string) {
    const source = await prisma.universityAdmissionConfig.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      throw new AppError('Source configuration not found', 404);
    }

    // Check if target already exists
    const existing = await prisma.universityAdmissionConfig.findFirst({
      where: {
        organizationId: source.organizationId,
        universityId: source.universityId,
        collegeId: source.collegeId,
        courseId: source.courseId,
        academicYear: newAcademicYear,
      },
    });

    if (existing) {
      throw new AppError(`Configuration already exists for ${newAcademicYear}`, 400);
    }

    // Clone with new academic year
    const cloned = await prisma.universityAdmissionConfig.create({
      data: {
        organizationId: source.organizationId,
        universityId: source.universityId,
        collegeId: source.collegeId,
        courseId: source.courseId,
        configName: source.configName.replace(source.academicYear, newAcademicYear),
        description: source.description,
        academicYear: newAcademicYear,

        applicationMode: source.applicationMode,
        useCustomForm: source.useCustomForm,
        requiredDocuments: source.requiredDocuments as any,

        externalPortalUrl: source.externalPortalUrl,
        externalPortalName: source.externalPortalName,
        externalInstructions: source.externalInstructions,
        trackExternalAppNumber: source.trackExternalAppNumber,
        trackExternalPayment: source.trackExternalPayment,

        paymentMode: source.paymentMode,
        paymentGateway: source.paymentGateway,
        gatewayMerchantId: source.gatewayMerchantId,
        gatewaySecretKey: source.gatewaySecretKey,
        gatewayWebhookUrl: source.gatewayWebhookUrl,

        applicationFee: source.applicationFee,
        admissionFee: source.admissionFee,
        tuitionFeePerYear: source.tuitionFeePerYear,
        hostelFeePerYear: source.hostelFeePerYear,
        otherFees: source.otherFees as any,
        totalFeeAmount: source.totalFeeAmount,

        scholarshipEnabled: source.scholarshipEnabled,
        maxScholarshipPercent: source.maxScholarshipPercent,
        scholarshipCriteria: source.scholarshipCriteria,

        commissionPercent: source.commissionPercent,
        commissionOnFeeType: source.commissionOnFeeType,
        commissionCapAmount: source.commissionCapAmount,

        seatsTotal: source.seatsTotal,
        seatsFilled: 0, // Reset for new year

        logoUrl: source.logoUrl,
        bannerUrl: source.bannerUrl,
        brochureUrl: source.brochureUrl,
        contactEmail: source.contactEmail,
        contactPhone: source.contactPhone,
        websiteUrl: source.websiteUrl,

        isActive: false, // Start as inactive
        isFeatured: false,
      },
    });

    return cloned;
  }

  // Get complete admission setup for a config (form + payment options)
  async getCompleteSetup(configId: string) {
    const config = await this.getConfigById(configId);

    // Get the admission form if using custom form
    let form = null;
    if (config.applicationMode === 'OFFLINE' || config.applicationMode === 'HYBRID') {
      form = await prisma.collegeAdmissionForm.findFirst({
        where: {
          organizationId: config.organizationId,
          universityId: config.universityId,
          collegeId: config.collegeId,
          courseId: config.courseId,
          isActive: true,
        },
      });

      // Fallback to university-level form
      if (!form && (config.collegeId || config.courseId)) {
        form = await prisma.collegeAdmissionForm.findFirst({
          where: {
            organizationId: config.organizationId,
            universityId: config.universityId,
            collegeId: null,
            courseId: null,
            isActive: true,
          },
        });
      }
    }

    // Get payment configs if using offline payment
    let paymentConfigs: any[] = [];
    if (config.paymentMode === 'OFFLINE_QR' || config.paymentMode === 'HYBRID') {
      paymentConfigs = await prisma.universityPaymentConfig.findMany({
        where: {
          organizationId: config.organizationId,
          universityId: config.universityId,
          isActive: true,
          OR: [
            { collegeId: config.collegeId, courseId: config.courseId },
            { collegeId: config.collegeId, courseId: null },
            { collegeId: null, courseId: null },
          ],
        },
      });
    }

    return {
      config,
      form,
      paymentConfigs,
    };
  }
}

export const universityAdmissionConfigService = new UniversityAdmissionConfigService();
