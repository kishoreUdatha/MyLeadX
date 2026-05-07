import { prisma } from '../config/database';
import { AppError } from '../utils/errors';

// ==================== Types ====================

interface CreatePaymentConfigDto {
  organizationId: string;
  universityId: string;
  collegeId?: string;
  courseId?: string;
  configName: string;
  feeType?: string;
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  upiId?: string;
  paymentQrCodeUrl?: string;
  paymentQrCodeData?: string;
  paymentGatewayUrl?: string;
  paymentGatewayId?: string;
  defaultAmount?: number;
  currency?: string;
  paymentInstructions?: string;
  showQrCode?: boolean;
  showBankDetails?: boolean;
  showUpi?: boolean;
}

interface UpdatePaymentConfigDto {
  configName?: string;
  feeType?: string;
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  upiId?: string;
  paymentQrCodeUrl?: string;
  paymentQrCodeData?: string;
  paymentGatewayUrl?: string;
  paymentGatewayId?: string;
  defaultAmount?: number;
  currency?: string;
  paymentInstructions?: string;
  showQrCode?: boolean;
  showBankDetails?: boolean;
  showUpi?: boolean;
  isActive?: boolean;
}

// ==================== Service ====================

class UniversityPaymentConfigService {
  // Create payment configuration
  async createConfig(data: CreatePaymentConfigDto) {
    // Check if config already exists for this combination
    const existing = await prisma.universityPaymentConfig.findFirst({
      where: {
        organizationId: data.organizationId,
        universityId: data.universityId,
        collegeId: data.collegeId || null,
        courseId: data.courseId || null,
        feeType: data.feeType || 'ADMISSION_FEE',
      },
    });

    if (existing) {
      throw new AppError(
        'Payment configuration already exists for this university/college/course and fee type',
        400
      );
    }

    const config = await prisma.universityPaymentConfig.create({
      data: {
        organizationId: data.organizationId,
        universityId: data.universityId,
        collegeId: data.collegeId,
        courseId: data.courseId,
        configName: data.configName,
        feeType: data.feeType || 'ADMISSION_FEE',
        bankName: data.bankName,
        accountHolderName: data.accountHolderName,
        accountNumber: data.accountNumber,
        ifscCode: data.ifscCode,
        branchName: data.branchName,
        upiId: data.upiId,
        paymentQrCodeUrl: data.paymentQrCodeUrl,
        paymentQrCodeData: data.paymentQrCodeData,
        paymentGatewayUrl: data.paymentGatewayUrl,
        paymentGatewayId: data.paymentGatewayId,
        defaultAmount: data.defaultAmount,
        currency: data.currency || 'INR',
        paymentInstructions: data.paymentInstructions,
        showQrCode: data.showQrCode ?? true,
        showBankDetails: data.showBankDetails ?? true,
        showUpi: data.showUpi ?? true,
      },
    });

    return config;
  }

  // Get config by ID
  async getConfigById(id: string) {
    const config = await prisma.universityPaymentConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new AppError('Payment configuration not found', 404);
    }

    return config;
  }

  // Get payment config for a specific university/college/course (hierarchical lookup)
  async getConfigForPayment(
    organizationId: string,
    universityId: string,
    feeType: string = 'ADMISSION_FEE',
    collegeId?: string,
    courseId?: string
  ) {
    // Try to find the most specific config first
    const config = await prisma.universityPaymentConfig.findFirst({
      where: {
        organizationId,
        universityId,
        feeType,
        isActive: true,
        OR: [
          // Most specific: course level
          { collegeId, courseId },
          // College level (no specific course)
          { collegeId, courseId: null },
          // University default (no college or course)
          { collegeId: null, courseId: null },
        ],
      },
      orderBy: [
        { courseId: 'desc' }, // Course-specific first
        { collegeId: 'desc' }, // Then college-specific
      ],
    });

    return config;
  }

  // Get all payment configs for a university (for partner portal to show payment options)
  async getConfigsForUniversity(
    organizationId: string,
    universityId: string,
    collegeId?: string,
    courseId?: string
  ) {
    const configs = await prisma.universityPaymentConfig.findMany({
      where: {
        organizationId,
        universityId,
        isActive: true,
        OR: [
          { collegeId, courseId },
          { collegeId, courseId: null },
          { collegeId: null, courseId: null },
        ],
      },
      orderBy: [
        { feeType: 'asc' },
        { courseId: 'desc' },
        { collegeId: 'desc' },
      ],
    });

    // Group by feeType, keeping most specific config for each
    const configMap = new Map();
    for (const config of configs) {
      if (!configMap.has(config.feeType)) {
        configMap.set(config.feeType, config);
      }
    }

    return Array.from(configMap.values());
  }

  // List all configs for an organization
  async listConfigs(params: {
    organizationId: string;
    universityId?: string;
    collegeId?: string;
    feeType?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { organizationId, universityId, collegeId, feeType, isActive, page = 1, limit = 20 } = params;

    const where: any = { organizationId };

    if (universityId) where.universityId = universityId;
    if (collegeId) where.collegeId = collegeId;
    if (feeType) where.feeType = feeType;
    if (isActive !== undefined) where.isActive = isActive;

    const [configs, total] = await Promise.all([
      prisma.universityPaymentConfig.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.universityPaymentConfig.count({ where }),
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
  async updateConfig(id: string, data: UpdatePaymentConfigDto) {
    const config = await prisma.universityPaymentConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new AppError('Payment configuration not found', 404);
    }

    const updated = await prisma.universityPaymentConfig.update({
      where: { id },
      data: {
        configName: data.configName,
        feeType: data.feeType,
        bankName: data.bankName,
        accountHolderName: data.accountHolderName,
        accountNumber: data.accountNumber,
        ifscCode: data.ifscCode,
        branchName: data.branchName,
        upiId: data.upiId,
        paymentQrCodeUrl: data.paymentQrCodeUrl,
        paymentQrCodeData: data.paymentQrCodeData,
        paymentGatewayUrl: data.paymentGatewayUrl,
        paymentGatewayId: data.paymentGatewayId,
        defaultAmount: data.defaultAmount,
        currency: data.currency,
        paymentInstructions: data.paymentInstructions,
        showQrCode: data.showQrCode,
        showBankDetails: data.showBankDetails,
        showUpi: data.showUpi,
        isActive: data.isActive,
      },
    });

    return updated;
  }

  // Delete config
  async deleteConfig(id: string) {
    const config = await prisma.universityPaymentConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new AppError('Payment configuration not found', 404);
    }

    await prisma.universityPaymentConfig.delete({
      where: { id },
    });

    return { message: 'Payment configuration deleted successfully' };
  }

  // Bulk create configs (for setting up a new university)
  async bulkCreateConfigs(organizationId: string, universityId: string, configs: Array<Omit<CreatePaymentConfigDto, 'organizationId' | 'universityId'>>) {
    const results = [];

    for (const config of configs) {
      try {
        const created = await this.createConfig({
          organizationId,
          universityId,
          ...config,
        });
        results.push({ success: true, data: created });
      } catch (error: any) {
        results.push({ success: false, error: error.message, config });
      }
    }

    return results;
  }
}

export const universityPaymentConfigService = new UniversityPaymentConfigService();
