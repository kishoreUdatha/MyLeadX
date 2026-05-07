import { prisma } from '../config/database';
import { AppError } from '../utils/errors';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';

// ==================== Types ====================

interface CreatePaymentDto {
  applicationId: string;
  amount: number;
  paymentMode: 'ONLINE_CRM' | 'ONLINE_UNIVERSITY' | 'OFFLINE_CASH' | 'OFFLINE_CHEQUE' | 'OFFLINE_DD' | 'BANK_TRANSFER' | 'UPI';
  paymentType: 'ADMISSION_FEE' | 'TUITION_FEE' | 'HOSTEL_FEE' | 'EXAM_FEE' | 'OTHER';
  description?: string;
  submittedBy: string;
  submittedByType: 'ADMIN' | 'PARTNER' | 'STUDENT';
  submittedByName: string;
}

interface SubmitPaymentProofDto {
  paymentId: string;
  proofType: 'RECEIPT' | 'SCREENSHOT' | 'BANK_STATEMENT' | 'CHEQUE_IMAGE' | 'DD_IMAGE';
  fileUrl: string;
  fileName: string;
  fileSize: number;
  transactionId?: string;
  paymentDate?: Date;
  bankName?: string;
  notes?: string;
}

interface VerifyPaymentDto {
  paymentId: string;
  status: 'VERIFIED' | 'REJECTED';
  verifiedById: string;
  verificationNotes?: string;
  rejectionReason?: string;
}

interface CreatePaymentLinkDto {
  applicationId: string;
  amount: number;
  feeType: string; // FULL, INSTALLMENT_1, etc.
  description?: string;
  expiresInHours?: number;
  sentTo: string; // Phone or Email
  sentVia?: string; // SMS, WHATSAPP, EMAIL
}

interface ProcessCommissionDto {
  applicationId: string;
  processedBy: string;
}

interface CreatePayoutDto {
  partnerId: string;
  amount: number;
  paymentMethod: 'BANK_TRANSFER' | 'UPI' | 'CHEQUE';
  processedBy: string;
  notes?: string;
}

// ==================== Service ====================

class ApplicationPaymentService {
  // ==================== Payment Recording ====================

  async recordPayment(data: CreatePaymentDto) {
    const application = await prisma.partnerApplication.findUnique({
      where: { id: data.applicationId },
      include: {
        partner: true,
        payments: true,
      },
    });

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    // Determine initial status based on payment mode
    let status: 'PENDING' | 'VERIFICATION_PENDING' | 'VERIFIED' | 'REJECTED' = 'PENDING';

    // For online CRM payments, we'll mark as verified after Razorpay callback
    // For external/offline payments, mark as verification pending
    if (data.paymentMode !== 'ONLINE_CRM') {
      status = 'VERIFICATION_PENDING';
    }

    // Calculate payment number (for installments)
    const paymentNumber = application.payments.length + 1;

    const payment = await prisma.applicationPayment.create({
      data: {
        applicationId: data.applicationId,
        amount: data.amount,
        paymentMode: data.paymentMode,
        paymentNumber,
        paymentDate: new Date(),
        status,
        remarks: data.description,
        submittedBy: data.submittedByType,
        submittedByName: data.submittedByName,
      },
    });

    // Update application payment tracking
    await this.updateApplicationPaymentStatus(data.applicationId);

    return payment;
  }

  async submitPaymentProof(data: SubmitPaymentProofDto) {
    const payment = await prisma.applicationPayment.findUnique({
      where: { id: data.paymentId },
    });

    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    // Build remarks with proof details
    const proofDetails = {
      proofType: data.proofType,
      bankName: data.bankName,
      notes: data.notes,
      submittedAt: new Date().toISOString(),
    };

    const updatedPayment = await prisma.applicationPayment.update({
      where: { id: data.paymentId },
      data: {
        status: 'VERIFICATION_PENDING',
        proofUrl: data.fileUrl,
        proofFileName: data.fileName,
        transactionId: data.transactionId,
        paymentDate: data.paymentDate || payment.paymentDate,
        remarks: JSON.stringify(proofDetails),
      },
    });

    // Update application status
    await prisma.partnerApplication.update({
      where: { id: payment.applicationId },
      data: {
        paymentStatus: 'PARTIAL',
        status: 'PAYMENT_PROOF_SUBMITTED',
      },
    });

    return updatedPayment;
  }

  async verifyPayment(data: VerifyPaymentDto) {
    const payment = await prisma.applicationPayment.findUnique({
      where: { id: data.paymentId },
      include: { application: true },
    });

    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    if (payment.status !== 'VERIFICATION_PENDING') {
      throw new AppError('Payment is not pending verification', 400);
    }

    const updatedPayment = await prisma.applicationPayment.update({
      where: { id: data.paymentId },
      data: {
        status: data.status,
        verifiedAt: new Date(),
        verifiedById: data.verifiedById,
        rejectionReason: data.rejectionReason || data.verificationNotes,
      },
    });

    // Update application payment status
    await this.updateApplicationPaymentStatus(payment.applicationId);

    // If verified, check if we should process commission
    if (data.status === 'VERIFIED') {
      await this.checkAndProcessCommission(payment.applicationId);
    }

    return updatedPayment;
  }

  async updateApplicationPaymentStatus(applicationId: string) {
    const application = await prisma.partnerApplication.findUnique({
      where: { id: applicationId },
      include: {
        payments: {
          where: { status: 'VERIFIED' },
        },
      },
    });

    if (!application) return;

    const totalPaid = application.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const netFee = Number(application.netFee);

    let paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' | 'FAILED' | 'REFUNDED' = 'PENDING';
    let applicationStatus = application.status;

    if (totalPaid >= netFee) {
      paymentStatus = 'PAID';
      applicationStatus = 'PAYMENT_VERIFIED';
    } else if (totalPaid > 0) {
      paymentStatus = 'PARTIAL';
    }

    await prisma.partnerApplication.update({
      where: { id: applicationId },
      data: {
        paidAmount: totalPaid,
        paymentStatus,
        status: paymentStatus === 'PAID' ? 'PAYMENT_VERIFIED' : applicationStatus,
      },
    });
  }

  // ==================== Payment Links ====================

  async createPaymentLink(data: CreatePaymentLinkDto) {
    const application = await prisma.partnerApplication.findUnique({
      where: { id: data.applicationId },
      include: { organization: true },
    });

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + (data.expiresInHours || 72) * 60 * 60 * 1000);

    const paymentLink = await prisma.applicationPaymentLink.create({
      data: {
        applicationId: data.applicationId,
        token,
        amount: data.amount,
        feeType: data.feeType,
        expiresAt,
        sentTo: data.sentTo,
        sentVia: data.sentVia || 'LINK',
        sentAt: new Date(),
        status: 'ACTIVE',
      },
    });

    // Generate shareable URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const paymentUrl = `${baseUrl}/pay/${token}`;

    return {
      ...paymentLink,
      paymentUrl,
    };
  }

  async getPaymentLinkByToken(token: string) {
    const paymentLink = await prisma.applicationPaymentLink.findUnique({
      where: { token },
      include: {
        application: {
          include: {
            partner: {
              select: {
                id: true,
                name: true,
                companyName: true,
                organizationId: true,
              },
            },
          },
        },
      },
    });

    if (!paymentLink) {
      throw new AppError('Payment link not found', 404);
    }

    if (paymentLink.status !== 'ACTIVE') {
      throw new AppError('Payment link is no longer active', 400);
    }

    if (paymentLink.expiresAt < new Date()) {
      await prisma.applicationPaymentLink.update({
        where: { id: paymentLink.id },
        data: { status: 'EXPIRED' },
      });
      throw new AppError('Payment link has expired', 400);
    }

    // Track access
    await prisma.applicationPaymentLink.update({
      where: { id: paymentLink.id },
      data: {
        accessCount: { increment: 1 },
        lastAccessAt: new Date(),
      },
    });

    return paymentLink;
  }

  async processOnlinePayment(paymentLinkId: string, razorpayPaymentId: string, razorpayOrderId: string) {
    const paymentLink = await prisma.applicationPaymentLink.findUnique({
      where: { id: paymentLinkId },
      include: {
        application: {
          include: { payments: true },
        },
      },
    });

    if (!paymentLink) {
      throw new AppError('Payment link not found', 404);
    }

    // Calculate payment number
    const paymentNumber = paymentLink.application.payments.length + 1;

    // Record the payment
    const payment = await prisma.applicationPayment.create({
      data: {
        applicationId: paymentLink.applicationId,
        amount: paymentLink.amount,
        paymentMode: 'ONLINE_CRM',
        paymentNumber,
        status: 'VERIFIED',
        razorpayPaymentId,
        razorpayOrderId,
        paymentDate: new Date(),
        verifiedAt: new Date(),
        submittedBy: 'STUDENT',
        submittedByName: 'Online Payment',
      },
    });

    // Update payment link status
    await prisma.applicationPaymentLink.update({
      where: { id: paymentLinkId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentId: payment.id,
      },
    });

    // Update application payment status
    await this.updateApplicationPaymentStatus(paymentLink.applicationId);

    // Check and process commission
    await this.checkAndProcessCommission(paymentLink.applicationId);

    return payment;
  }

  // ==================== Commission Processing ====================

  async checkAndProcessCommission(applicationId: string) {
    const application = await prisma.partnerApplication.findUnique({
      where: { id: applicationId },
      include: {
        partner: {
          include: {
            parentPartner: true,
          },
        },
        commissions: true,
      },
    });

    if (!application) return;

    // Check if commission already processed
    if (application.commissions.length > 0) return;

    // Check if admission is confirmed and payment is complete
    if (application.status !== 'ADMISSION_CONFIRMED' && application.paymentStatus !== 'PAID') {
      return;
    }

    // Get commission rate for this partner
    const commissionRule = await prisma.partnerCommissionRule.findFirst({
      where: {
        partnerId: application.partnerId,
        universityId: application.universityId,
        OR: [
          { collegeId: null, courseId: null },
          { collegeId: application.collegeId, courseId: null },
          { collegeId: application.collegeId, courseId: application.courseId },
        ],
        isActive: true,
      },
      orderBy: [{ courseId: 'desc' }, { collegeId: 'desc' }],
    });

    let commissionRate = commissionRule?.commissionRate || application.partner.commissionRate;
    const commissionType = commissionRule?.commissionType || application.partner.commissionType;

    // Calculate commission amount
    let commissionAmount: number;
    const baseAmount = Number(application.netFee);

    if (commissionType === 'PERCENTAGE') {
      commissionAmount = (baseAmount * commissionRate) / 100;
    } else {
      commissionAmount = commissionRate;
    }

    // Calculate hierarchy split if applicable
    let partnerShare = commissionAmount;
    let parentShare = 0;

    if (application.partner.parentPartnerId) {
      // Get split configuration (default 80-20)
      const splitPercentage = 80; // Partner gets 80%, parent gets 20%
      partnerShare = (commissionAmount * splitPercentage) / 100;
      parentShare = commissionAmount - partnerShare;
    }

    // Create commission records
    const commissions = [];

    // Partner commission
    const partnerCommission = await prisma.partnerCommission.create({
      data: {
        applicationId,
        partnerId: application.partnerId,
        organizationId: application.organizationId,
        amount: partnerShare,
        commissionRate,
        commissionType,
        baseAmount,
        status: 'PENDING',
        calculatedAt: new Date(),
      },
    });
    commissions.push(partnerCommission);

    // Add to partner wallet
    await this.addToPartnerWallet(application.partnerId, application.organizationId, partnerShare, applicationId);

    // Parent partner commission (if applicable)
    if (application.partner.parentPartnerId && parentShare > 0) {
      const parentCommission = await prisma.partnerCommission.create({
        data: {
          applicationId,
          partnerId: application.partner.parentPartnerId,
          organizationId: application.organizationId,
          amount: parentShare,
          commissionRate: 100 - 80, // 20%
          commissionType: 'PERCENTAGE',
          baseAmount: commissionAmount,
          status: 'PENDING',
          calculatedAt: new Date(),
          notes: `Hierarchy split from sub-partner ${application.partner.name}`,
        },
      });
      commissions.push(parentCommission);

      // Add to parent partner wallet
      await this.addToPartnerWallet(
        application.partner.parentPartnerId,
        application.organizationId,
        parentShare,
        applicationId
      );
    }

    // Update application status
    await prisma.partnerApplication.update({
      where: { id: applicationId },
      data: { status: 'COMMISSION_PENDING' },
    });

    return commissions;
  }

  async addToPartnerWallet(partnerId: string, organizationId: string, amount: number, applicationId: string) {
    // Get or create wallet
    let wallet = await prisma.admissionPartnerWallet.findUnique({
      where: { partnerId },
    });

    if (!wallet) {
      wallet = await prisma.admissionPartnerWallet.create({
        data: {
          partnerId,
          organizationId,
          balance: 0,
          pendingBalance: 0,
          totalEarnings: 0,
          totalWithdrawn: 0,
        },
      });
    }

    // Update wallet balances
    await prisma.admissionPartnerWallet.update({
      where: { partnerId },
      data: {
        pendingBalance: { increment: amount },
        totalEarnings: { increment: amount },
      },
    });

    // Create transaction record
    await prisma.partnerWalletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'COMMISSION',
        amount,
        status: 'PENDING',
        description: `Commission for application`,
        referenceType: 'APPLICATION',
        referenceId: applicationId,
      },
    });
  }

  async approveCommission(commissionId: string, approvedBy: string) {
    const commission = await prisma.partnerCommission.findUnique({
      where: { id: commissionId },
      include: { partner: true },
    });

    if (!commission) {
      throw new AppError('Commission not found', 404);
    }

    if (commission.status !== 'PENDING') {
      throw new AppError('Commission is not pending approval', 400);
    }

    // Update commission status
    const updatedCommission = await prisma.partnerCommission.update({
      where: { id: commissionId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy,
      },
    });

    // Move from pending to available balance
    const wallet = await prisma.admissionPartnerWallet.findUnique({
      where: { partnerId: commission.partnerId },
    });

    if (wallet) {
      await prisma.admissionPartnerWallet.update({
        where: { partnerId: commission.partnerId },
        data: {
          pendingBalance: { decrement: Number(commission.amount) },
          balance: { increment: Number(commission.amount) },
        },
      });

      // Update transaction status
      await prisma.partnerWalletTransaction.updateMany({
        where: {
          walletId: wallet.id,
          referenceId: commission.applicationId,
          type: 'COMMISSION',
          status: 'PENDING',
        },
        data: {
          status: 'COMPLETED',
        },
      });
    }

    // Update application status
    await prisma.partnerApplication.update({
      where: { id: commission.applicationId },
      data: { status: 'COMMISSION_APPROVED' },
    });

    return updatedCommission;
  }

  // ==================== Payouts ====================

  async createPayoutRequest(partnerId: string, amount: number, notes?: string) {
    const wallet = await prisma.admissionPartnerWallet.findUnique({
      where: { partnerId },
      include: { partner: true },
    });

    if (!wallet) {
      throw new AppError('Wallet not found', 404);
    }

    if (Number(wallet.balance) < amount) {
      throw new AppError('Insufficient balance', 400);
    }

    // Check minimum payout amount
    const minPayoutAmount = 1000; // Rs. 1000 minimum
    if (amount < minPayoutAmount) {
      throw new AppError(`Minimum payout amount is Rs. ${minPayoutAmount}`, 400);
    }

    // Create payout request
    const payout = await prisma.partnerPayout.create({
      data: {
        partnerId,
        organizationId: wallet.organizationId,
        amount,
        status: 'PENDING',
        paymentMethod: wallet.partner.preferredPaymentMethod || 'BANK_TRANSFER',
        notes,
      },
    });

    // Create wallet transaction
    await prisma.partnerWalletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'WITHDRAWAL',
        amount: -amount,
        status: 'PENDING',
        description: 'Payout request',
        referenceType: 'PAYOUT',
        referenceId: payout.id,
      },
    });

    // Hold the amount
    await prisma.admissionPartnerWallet.update({
      where: { partnerId },
      data: {
        balance: { decrement: amount },
        pendingBalance: { increment: amount },
      },
    });

    return payout;
  }

  async processPayout(data: CreatePayoutDto) {
    const payout = await prisma.partnerPayout.findFirst({
      where: {
        partnerId: data.partnerId,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!payout) {
      throw new AppError('No pending payout found', 404);
    }

    // Update payout status
    const updatedPayout = await prisma.partnerPayout.update({
      where: { id: payout.id },
      data: {
        status: 'PROCESSED',
        processedAt: new Date(),
        processedBy: data.processedBy,
        notes: data.notes,
      },
    });

    // Update wallet
    const wallet = await prisma.admissionPartnerWallet.findUnique({
      where: { partnerId: data.partnerId },
    });

    if (wallet) {
      await prisma.admissionPartnerWallet.update({
        where: { partnerId: data.partnerId },
        data: {
          pendingBalance: { decrement: Number(payout.amount) },
          totalWithdrawn: { increment: Number(payout.amount) },
        },
      });

      // Update transaction status
      await prisma.partnerWalletTransaction.updateMany({
        where: {
          walletId: wallet.id,
          referenceId: payout.id,
          type: 'WITHDRAWAL',
          status: 'PENDING',
        },
        data: {
          status: 'COMPLETED',
        },
      });
    }

    return updatedPayout;
  }

  async rejectPayout(payoutId: string, rejectedBy: string, reason: string) {
    const payout = await prisma.partnerPayout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new AppError('Payout not found', 404);
    }

    if (payout.status !== 'PENDING') {
      throw new AppError('Payout is not pending', 400);
    }

    // Update payout status
    const updatedPayout = await prisma.partnerPayout.update({
      where: { id: payoutId },
      data: {
        status: 'REJECTED',
        processedAt: new Date(),
        processedBy: rejectedBy,
        notes: reason,
      },
    });

    // Refund to wallet
    const wallet = await prisma.admissionPartnerWallet.findUnique({
      where: { partnerId: payout.partnerId },
    });

    if (wallet) {
      await prisma.admissionPartnerWallet.update({
        where: { partnerId: payout.partnerId },
        data: {
          pendingBalance: { decrement: Number(payout.amount) },
          balance: { increment: Number(payout.amount) },
        },
      });

      // Update transaction status
      await prisma.partnerWalletTransaction.updateMany({
        where: {
          walletId: wallet.id,
          referenceId: payout.id,
          type: 'WITHDRAWAL',
          status: 'PENDING',
        },
        data: {
          status: 'FAILED',
        },
      });
    }

    return updatedPayout;
  }

  // ==================== Queries ====================

  async getApplicationPayments(applicationId: string) {
    return prisma.applicationPayment.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPartnerWallet(partnerId: string) {
    // Get or create wallet for the partner
    let wallet = await prisma.admissionPartnerWallet.findUnique({
      where: { partnerId },
    });

    // If wallet doesn't exist, create one
    if (!wallet) {
      wallet = await prisma.admissionPartnerWallet.create({
        data: {
          partnerId,
          availableBalance: 0,
          pendingBalance: 0,
          totalEarned: 0,
          totalPaid: 0,
          totalTdsDeducted: 0,
        },
      });
    }

    // Get transactions separately (they're on the partner, not wallet)
    const transactions = await prisma.admissionPartnerTransaction.findMany({
      where: { partnerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      ...wallet,
      transactions,
    };
  }

  async getPartnerPayouts(partnerId: string, status?: string) {
    return prisma.partnerPayout.findMany({
      where: {
        partnerId,
        ...(status && { status: status as any }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingPayouts(organizationId: string) {
    return prisma.partnerPayout.findMany({
      where: {
        organizationId,
        status: 'PENDING',
      },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            companyName: true,
            bankAccountNumber: true,
            bankIfscCode: true,
            bankAccountName: true,
            upiId: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getCommissionStats(organizationId: string, partnerId?: string) {
    const where: any = { organizationId };
    if (partnerId) where.partnerId = partnerId;

    const [pending, approved, paid, total] = await Promise.all([
      prisma.partnerCommission.aggregate({
        where: { ...where, status: 'PENDING' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.partnerCommission.aggregate({
        where: { ...where, status: 'APPROVED' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.partnerCommission.aggregate({
        where: { ...where, status: 'PAID' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.partnerCommission.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      pending: {
        count: pending._count,
        amount: pending._sum.amount || 0,
      },
      approved: {
        count: approved._count,
        amount: approved._sum.amount || 0,
      },
      paid: {
        count: paid._count,
        amount: paid._sum.amount || 0,
      },
      total: {
        count: total._count,
        amount: total._sum.amount || 0,
      },
    };
  }

  async getPaymentStats(organizationId: string, filters?: {
    partnerId?: string;
    universityId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {
      application: { organizationId },
    };

    if (filters?.partnerId) {
      where.application.partnerId = filters.partnerId;
    }
    if (filters?.universityId) {
      where.application.universityId = filters.universityId;
    }
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [verified, pending, rejected, byMode] = await Promise.all([
      prisma.applicationPayment.aggregate({
        where: { ...where, status: 'VERIFIED' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.applicationPayment.aggregate({
        where: { ...where, status: 'VERIFICATION_PENDING' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.applicationPayment.aggregate({
        where: { ...where, status: 'FAILED' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.applicationPayment.groupBy({
        by: ['paymentMode'],
        where: { ...where, status: 'VERIFIED' },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      verified: {
        count: verified._count,
        amount: verified._sum.amount || 0,
      },
      pending: {
        count: pending._count,
        amount: pending._sum.amount || 0,
      },
      rejected: {
        count: rejected._count,
        amount: rejected._sum.amount || 0,
      },
      byPaymentMode: byMode.map((m) => ({
        mode: m.paymentMode,
        count: m._count,
        amount: m._sum.amount || 0,
      })),
    };
  }

  // ==================== Admin Payout Management ====================

  async getAllPayouts(params: {
    organizationId: string;
    status?: string;
    partnerId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const { organizationId, status, partnerId, startDate, endDate, page = 1, limit = 20 } = params;

    // Map frontend status to database status
    const statusMap: Record<string, string> = {
      'PENDING': 'REQUESTED',
      'APPROVED': 'APPROVED',
      'COMPLETED': 'COMPLETED',
      'REJECTED': 'REJECTED',
      'PROCESSING': 'PROCESSING',
      'CANCELLED': 'CANCELLED',
    };

    // Map database status back to frontend status
    const reverseStatusMap: Record<string, string> = {
      'REQUESTED': 'PENDING',
      'APPROVED': 'APPROVED',
      'COMPLETED': 'COMPLETED',
      'REJECTED': 'REJECTED',
      'PROCESSING': 'PROCESSING',
      'CANCELLED': 'CANCELLED',
    };

    try {
      // First get partner IDs for this organization
      const partners = await prisma.admissionPartner.findMany({
        where: { organizationId },
        select: { id: true },
      });

      const partnerIds = partners.map(p => p.id);

      if (partnerIds.length === 0) {
        return {
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        };
      }

      const where: any = {
        partnerId: { in: partnerIds },
      };

      if (status) {
        where.status = statusMap[status] || status;
      }
      if (partnerId) {
        where.partnerId = partnerId;
      }
      if (startDate || endDate) {
        where.requestedAt = {};
        if (startDate) where.requestedAt.gte = new Date(startDate);
        if (endDate) where.requestedAt.lte = new Date(endDate);
      }

      const [payouts, total] = await Promise.all([
        prisma.admissionPartnerPayoutRequest.findMany({
          where,
          include: {
            partner: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                companyName: true,
                partnerCode: true,
              },
            },
            bankDetails: true,
          },
          orderBy: { requestedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.admissionPartnerPayoutRequest.count({ where }),
      ]);

      const mappedPayouts = payouts.map(p => ({
        ...p,
        status: reverseStatusMap[p.status] || p.status,
      }));

      return {
        data: mappedPayouts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error in getAllPayouts:', error);
      // Return empty result if table doesn't exist or other errors
      return {
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }
  }

  async approvePayout(payoutId: string, approvedBy: string, notes?: string) {
    try {
      const payout = await prisma.admissionPartnerPayoutRequest.findUnique({
        where: { id: payoutId },
        include: { partner: { include: { wallet: true } } },
      });

      if (!payout) {
        throw new AppError('Payout request not found', 404);
      }

      if (payout.status !== 'REQUESTED') {
        throw new AppError('Payout is not in pending status', 400);
      }

      // Update payout status
      const updatedPayout = await prisma.admissionPartnerPayoutRequest.update({
        where: { id: payoutId },
        data: {
          status: 'APPROVED',
          approvedBy,
          approvedAt: new Date(),
          remarks: notes,
        },
      });

      return { ...updatedPayout, status: 'APPROVED' };
    } catch (error) {
      console.error('Error in approvePayout:', error);
      throw error;
    }
  }

  async rejectPayoutRequest(payoutId: string, rejectedBy: string, reason: string) {
    try {
      const payout = await prisma.admissionPartnerPayoutRequest.findUnique({
        where: { id: payoutId },
        include: { partner: { include: { wallet: true } } },
      });

      if (!payout) {
        throw new AppError('Payout request not found', 404);
      }

      if (payout.status !== 'REQUESTED' && payout.status !== 'APPROVED') {
        throw new AppError('Payout cannot be rejected in current status', 400);
      }

      // Refund the amount back to available balance
      if (payout.partner?.wallet) {
        await prisma.admissionPartnerWallet.update({
          where: { partnerId: payout.partnerId },
          data: {
            availableBalance: { increment: Number(payout.amount) },
          },
        });
      }

      // Update payout status
      const updatedPayout = await prisma.admissionPartnerPayoutRequest.update({
        where: { id: payoutId },
        data: {
          status: 'REJECTED',
          rejectedBy,
          rejectedAt: new Date(),
          rejectionReason: reason,
        },
      });

      return { ...updatedPayout, status: 'REJECTED' };
    } catch (error) {
      console.error('Error in rejectPayoutRequest:', error);
      throw error;
    }
  }

  async completePayout(
    payoutId: string,
    completedBy: string,
    details: { transactionId?: string; paymentMethod?: string; notes?: string }
  ) {
    try {
      const payout = await prisma.admissionPartnerPayoutRequest.findUnique({
        where: { id: payoutId },
        include: { partner: { include: { wallet: true } } },
      });

      if (!payout) {
        throw new AppError('Payout request not found', 404);
      }

      if (payout.status !== 'APPROVED' && payout.status !== 'REQUESTED') {
        throw new AppError('Payout must be approved first or pending', 400);
      }

      // Update payout as completed
      const updatedPayout = await prisma.admissionPartnerPayoutRequest.update({
        where: { id: payoutId },
        data: {
          status: 'COMPLETED',
          processedBy: completedBy,
          processedAt: new Date(),
          transactionReference: details.transactionId,
          remarks: details.notes,
        },
      });

      // Update wallet - deduct from available and add to withdrawn
      if (payout.partner?.wallet) {
        await prisma.admissionPartnerWallet.update({
          where: { partnerId: payout.partnerId },
          data: {
            totalWithdrawn: { increment: Number(payout.amount) },
          },
        });

        // Create transaction record
        await prisma.admissionPartnerTransaction.create({
          data: {
            partnerId: payout.partnerId,
            type: 'PAYOUT',
            amount: Number(payout.netAmount) * -1,
            balance: Number(payout.partner.wallet.availableBalance) - Number(payout.netAmount),
            referenceType: 'PAYOUT_REQUEST',
            referenceId: payoutId,
            description: `Payout processed - ${details.transactionId || 'Manual'}`,
            status: 'COMPLETED',
          },
        });
      }

      return { ...updatedPayout, status: 'COMPLETED' };
    } catch (error) {
      console.error('Error in completePayout:', error);
      throw error;
    }
  }
}

export const applicationPaymentService = new ApplicationPaymentService();
