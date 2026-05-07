import crypto from 'crypto';
import { prisma } from '../config/database';
import { AppError } from '../utils/errors';
import {
  PartnerApplication,
  PartnerApplicationStatus,
  ApplicationDocumentStatus,
  ApplicationPaymentStatus,
  ApplicationCommissionStatus,
  Prisma,
} from '@prisma/client';
import { admissionPartnerService } from './admission-partner.service';

// ==================== DTOs ====================

interface CreateApplicationDto {
  organizationId: string;
  partnerId: string;
  universityId: string;
  collegeId?: string;
  courseId?: string;
  academicYear: string;
  studentName: string;
  studentEmail?: string;
  studentPhone: string;
  parentName?: string;
  parentPhone?: string;
  dateOfBirth?: Date;
  gender?: string;
  aadhaarNumber?: string;
  hallTicketNumber?: string;
  formData?: Record<string, any>;
  totalFee: number;
  scholarshipAmount?: number;
  filledBy?: 'PARTNER' | 'STUDENT';
}

interface UpdateApplicationDto {
  studentName?: string;
  studentEmail?: string;
  studentPhone?: string;
  parentName?: string;
  parentPhone?: string;
  dateOfBirth?: Date;
  gender?: string;
  aadhaarNumber?: string;
  hallTicketNumber?: string;
  formData?: Record<string, any>;
  totalFee?: number;
  scholarshipAmount?: number;
  internalRemarks?: string;
  partnerRemarks?: string;
}

interface ApplicationListParams {
  organizationId: string;
  partnerId?: string;
  universityId?: string;
  collegeId?: string;
  courseId?: string;
  status?: PartnerApplicationStatus;
  paymentStatus?: ApplicationPaymentStatus;
  documentsStatus?: ApplicationDocumentStatus;
  counsellorId?: string;
  academicYear?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

interface CreateApplicationLinkDto {
  partnerId: string;
  universityId: string;
  collegeId?: string;
  courseId?: string;
  studentName?: string;
  studentPhone?: string;
  studentEmail?: string;
  expiresInDays?: number;
}

interface UploadDocumentDto {
  applicationId: string;
  documentType: string;
  documentName: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType?: string;
  uploadedBy: 'PARTNER' | 'STUDENT' | 'ADMIN';
  uploadedByName?: string;
}

interface DuplicateCheckResult {
  isDuplicate: boolean;
  matches: Array<{
    applicationId: string;
    applicationNumber: string;
    matchField: string;
    matchValue: string;
    status: string;
    partnerName: string;
    createdAt: Date;
  }>;
}

// Status transition rules
const VALID_STATUS_TRANSITIONS: Record<PartnerApplicationStatus, PartnerApplicationStatus[]> = {
  DRAFT: ['APPLICATION_SUBMITTED', 'CANCELLED'],
  LINK_SENT: ['APPLICATION_SUBMITTED', 'CANCELLED'],
  APPLICATION_SUBMITTED: ['DOCUMENT_PENDING', 'DOCUMENT_VERIFICATION', 'CANCELLED'],
  DOCUMENT_PENDING: ['DOCUMENT_VERIFICATION', 'CANCELLED'],
  DOCUMENT_VERIFICATION: ['DOCUMENT_VERIFIED', 'DOCUMENT_REJECTED'],
  DOCUMENT_VERIFIED: ['PAYMENT_PENDING', 'PAYMENT_LINK_SENT'],
  DOCUMENT_REJECTED: ['DOCUMENT_PENDING', 'CANCELLED'],
  PAYMENT_PENDING: ['PAYMENT_LINK_SENT', 'PAYMENT_PROOF_SUBMITTED', 'CANCELLED'],
  PAYMENT_LINK_SENT: ['PAYMENT_PROOF_SUBMITTED', 'PAYMENT_RECEIVED', 'CANCELLED'],
  PAYMENT_PROOF_SUBMITTED: ['PAYMENT_UNDER_VERIFICATION'],
  PAYMENT_UNDER_VERIFICATION: ['PAYMENT_VERIFIED', 'PAYMENT_REJECTED'],
  PAYMENT_VERIFIED: ['ADMISSION_PROCESSING', 'COUNSELLOR_ASSIGNED'],
  PAYMENT_REJECTED: ['PAYMENT_PENDING', 'PAYMENT_PROOF_SUBMITTED', 'CANCELLED'],
  ADMISSION_PROCESSING: ['COUNSELLOR_ASSIGNED', 'ADMISSION_CONFIRMED', 'ADMISSION_REJECTED'],
  COUNSELLOR_ASSIGNED: ['ADMISSION_CONFIRMED', 'ADMISSION_REJECTED'],
  ADMISSION_CONFIRMED: ['COMMISSION_PENDING'],
  ADMISSION_REJECTED: ['CANCELLED'],
  COMMISSION_PENDING: ['COMMISSION_APPROVED'],
  COMMISSION_APPROVED: ['COMMISSION_PAID'],
  COMMISSION_PAID: [],
  CANCELLED: [],
  DUPLICATE_APPLICATION: [],
};

// ==================== Service ====================

class PartnerApplicationService {
  // Generate unique application number
  private async generateApplicationNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.partnerApplication.count({
      where: {
        organizationId,
        applicationNumber: { startsWith: `APP-${year}` },
      },
    });
    const paddedNumber = (count + 1).toString().padStart(5, '0');
    return `APP-${year}-${paddedNumber}`;
  }

  // Generate secure token for application link
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // ==================== Duplicate Detection ====================

  // Check for duplicates
  async checkDuplicates(
    organizationId: string,
    studentPhone: string,
    studentEmail?: string,
    aadhaarNumber?: string,
    hallTicketNumber?: string,
    excludeApplicationId?: string
  ): Promise<DuplicateCheckResult> {
    const matches: DuplicateCheckResult['matches'] = [];

    const baseWhere: Prisma.PartnerApplicationWhereInput = {
      organizationId,
      status: { notIn: ['CANCELLED', 'DUPLICATE_APPLICATION'] },
    };

    if (excludeApplicationId) {
      baseWhere.id = { not: excludeApplicationId };
    }

    // Check phone
    const phoneMatches = await prisma.partnerApplication.findMany({
      where: { ...baseWhere, studentPhone },
      include: { partner: { select: { name: true } } },
      take: 5,
    });

    for (const match of phoneMatches) {
      matches.push({
        applicationId: match.id,
        applicationNumber: match.applicationNumber,
        matchField: 'Phone Number',
        matchValue: studentPhone,
        status: match.status,
        partnerName: match.partner.name,
        createdAt: match.createdAt,
      });
    }

    // Check email
    if (studentEmail) {
      const emailMatches = await prisma.partnerApplication.findMany({
        where: { ...baseWhere, studentEmail },
        include: { partner: { select: { name: true } } },
        take: 5,
      });

      for (const match of emailMatches) {
        if (!matches.find((m) => m.applicationId === match.id)) {
          matches.push({
            applicationId: match.id,
            applicationNumber: match.applicationNumber,
            matchField: 'Email',
            matchValue: studentEmail,
            status: match.status,
            partnerName: match.partner.name,
            createdAt: match.createdAt,
          });
        }
      }
    }

    // Check Aadhaar
    if (aadhaarNumber) {
      const aadhaarMatches = await prisma.partnerApplication.findMany({
        where: { ...baseWhere, aadhaarNumber },
        include: { partner: { select: { name: true } } },
        take: 5,
      });

      for (const match of aadhaarMatches) {
        if (!matches.find((m) => m.applicationId === match.id)) {
          matches.push({
            applicationId: match.id,
            applicationNumber: match.applicationNumber,
            matchField: 'Aadhaar Number',
            matchValue: aadhaarNumber,
            status: match.status,
            partnerName: match.partner.name,
            createdAt: match.createdAt,
          });
        }
      }
    }

    // Check Hall Ticket
    if (hallTicketNumber) {
      const hallTicketMatches = await prisma.partnerApplication.findMany({
        where: { ...baseWhere, hallTicketNumber },
        include: { partner: { select: { name: true } } },
        take: 5,
      });

      for (const match of hallTicketMatches) {
        if (!matches.find((m) => m.applicationId === match.id)) {
          matches.push({
            applicationId: match.id,
            applicationNumber: match.applicationNumber,
            matchField: 'Hall Ticket Number',
            matchValue: hallTicketNumber,
            status: match.status,
            partnerName: match.partner.name,
            createdAt: match.createdAt,
          });
        }
      }
    }

    return {
      isDuplicate: matches.length > 0,
      matches,
    };
  }

  // ==================== Application CRUD ====================

  // Create new application
  async createApplication(data: CreateApplicationDto): Promise<PartnerApplication> {
    // Check for duplicates
    const duplicateCheck = await this.checkDuplicates(
      data.organizationId,
      data.studentPhone,
      data.studentEmail,
      data.aadhaarNumber,
      data.hallTicketNumber
    );

    // Get commission rate
    const commissionRate = await admissionPartnerService.getCommissionRate(
      data.partnerId,
      data.universityId,
      data.collegeId,
      data.courseId
    );

    // Calculate net fee and commission
    const scholarshipAmount = data.scholarshipAmount || 0;
    const netFee = data.totalFee - scholarshipAmount;
    const commissionAmount = (netFee * commissionRate) / 100;

    // Generate application number
    const applicationNumber = await this.generateApplicationNumber(data.organizationId);

    // Find or create student master record
    let studentMaster = await prisma.studentMaster.findFirst({
      where: {
        organizationId: data.organizationId,
        phone: data.studentPhone,
      },
    });

    if (!studentMaster) {
      studentMaster = await prisma.studentMaster.create({
        data: {
          organizationId: data.organizationId,
          phone: data.studentPhone,
          email: data.studentEmail,
          name: data.studentName,
          aadhaarNumber: data.aadhaarNumber,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          parentPhone: data.parentPhone,
        },
      });
    }

    // Create application
    const application = await prisma.partnerApplication.create({
      data: {
        organizationId: data.organizationId,
        applicationNumber,
        partnerId: data.partnerId,
        studentMasterId: studentMaster.id,
        universityId: data.universityId,
        collegeId: data.collegeId,
        courseId: data.courseId,
        academicYear: data.academicYear,
        studentName: data.studentName,
        studentEmail: data.studentEmail,
        studentPhone: data.studentPhone,
        parentName: data.parentName,
        parentPhone: data.parentPhone,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        aadhaarNumber: data.aadhaarNumber,
        hallTicketNumber: data.hallTicketNumber,
        formData: data.formData || {},
        filledBy: data.filledBy || 'PARTNER',
        status: duplicateCheck.isDuplicate ? 'DUPLICATE_APPLICATION' : 'DRAFT',
        totalFee: data.totalFee,
        scholarshipAmount,
        netFee,
        commissionRate,
        commissionAmount,
        commissionStatus: 'NOT_ELIGIBLE',
        statusHistory: [
          {
            status: duplicateCheck.isDuplicate ? 'DUPLICATE_APPLICATION' : 'DRAFT',
            changedAt: new Date().toISOString(),
            changedBy: data.partnerId,
            changedByType: 'PARTNER',
            notes: duplicateCheck.isDuplicate
              ? `Duplicate detected: ${duplicateCheck.matches.map((m) => m.matchField).join(', ')}`
              : 'Application created',
          },
        ],
      },
    });

    // Update partner stats
    await prisma.admissionPartner.update({
      where: { id: data.partnerId },
      data: {
        totalApplications: { increment: 1 },
      },
    });

    // Log activity
    await this.logActivity(
      application.id,
      'APPLICATION_CREATED',
      null,
      duplicateCheck.isDuplicate ? 'DUPLICATE_APPLICATION' : 'DRAFT',
      data.partnerId,
      'PARTNER',
      'Partner',
      { duplicateCheck }
    );

    return application;
  }

  // Get application by ID
  async getApplicationById(id: string): Promise<PartnerApplication | null> {
    return prisma.partnerApplication.findUnique({
      where: { id },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            partnerCode: true,
            phone: true,
            email: true,
          },
        },
        counsellor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        verifiedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        documents: true,
        payments: true,
        paymentLinks: true,
      },
    });
  }

  // Get application by application number
  async getApplicationByNumber(
    organizationId: string,
    applicationNumber: string
  ): Promise<PartnerApplication | null> {
    return prisma.partnerApplication.findFirst({
      where: {
        organizationId,
        applicationNumber,
      },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            partnerCode: true,
          },
        },
        documents: true,
        payments: true,
      },
    });
  }

  // List applications with filters
  async listApplications(params: ApplicationListParams) {
    const {
      organizationId,
      partnerId,
      universityId,
      collegeId,
      courseId,
      status,
      paymentStatus,
      documentsStatus,
      counsellorId,
      academicYear,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = params;

    const where: Prisma.PartnerApplicationWhereInput = {
      organizationId,
    };

    if (partnerId) where.partnerId = partnerId;
    if (universityId) where.universityId = universityId;
    if (collegeId) where.collegeId = collegeId;
    if (courseId) where.courseId = courseId;
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (documentsStatus) where.documentsStatus = documentsStatus;
    if (counsellorId) where.counsellorId = counsellorId;
    if (academicYear) where.academicYear = academicYear;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    if (search) {
      where.OR = [
        { applicationNumber: { contains: search, mode: 'insensitive' } },
        { studentName: { contains: search, mode: 'insensitive' } },
        { studentPhone: { contains: search, mode: 'insensitive' } },
        { studentEmail: { contains: search, mode: 'insensitive' } },
        { aadhaarNumber: { contains: search, mode: 'insensitive' } },
        { hallTicketNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [applications, total] = await Promise.all([
      prisma.partnerApplication.findMany({
        where,
        include: {
          partner: {
            select: {
              id: true,
              name: true,
              partnerCode: true,
            },
          },
          counsellor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              documents: true,
              payments: true,
            },
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

  // Update application
  async updateApplication(
    id: string,
    data: UpdateApplicationDto,
    updatedBy: string,
    updatedByType: 'ADMIN' | 'PARTNER' | 'STUDENT'
  ): Promise<PartnerApplication> {
    const application = await prisma.partnerApplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    // Can only update in certain statuses
    const editableStatuses: PartnerApplicationStatus[] = [
      'DRAFT',
      'LINK_SENT',
      'APPLICATION_SUBMITTED',
      'DOCUMENT_PENDING',
      'DOCUMENT_REJECTED',
    ];

    if (!editableStatuses.includes(application.status)) {
      throw new AppError(`Cannot update application in ${application.status} status`, 400);
    }

    // Recalculate fees if changed
    let updateData: Prisma.PartnerApplicationUpdateInput = { ...data };

    if (data.totalFee !== undefined || data.scholarshipAmount !== undefined) {
      const totalFee = data.totalFee ?? Number(application.totalFee);
      const scholarshipAmount = data.scholarshipAmount ?? Number(application.scholarshipAmount);
      const netFee = totalFee - scholarshipAmount;
      const commissionAmount = (netFee * Number(application.commissionRate)) / 100;

      updateData.totalFee = totalFee;
      updateData.scholarshipAmount = scholarshipAmount;
      updateData.netFee = netFee;
      updateData.commissionAmount = commissionAmount;
    }

    // Update student master if phone changed
    if (data.studentPhone && data.studentPhone !== application.studentPhone) {
      // Check for duplicates with new phone
      const duplicateCheck = await this.checkDuplicates(
        application.organizationId,
        data.studentPhone,
        data.studentEmail,
        data.aadhaarNumber,
        data.hallTicketNumber,
        id
      );

      if (duplicateCheck.isDuplicate) {
        throw new AppError(
          `Duplicate found with ${duplicateCheck.matches[0].matchField}: ${duplicateCheck.matches[0].matchValue}`,
          400
        );
      }
    }

    const updated = await prisma.partnerApplication.update({
      where: { id },
      data: updateData,
    });

    // Log activity
    await this.logActivity(
      id,
      'APPLICATION_UPDATED',
      null,
      null,
      updatedBy,
      updatedByType,
      updatedByType,
      { changes: data }
    );

    return updated;
  }

  // ==================== Status Management ====================

  // Update application status
  async updateStatus(
    id: string,
    newStatus: PartnerApplicationStatus,
    updatedBy: string,
    updatedByType: 'ADMIN' | 'PARTNER' | 'STUDENT' | 'SYSTEM',
    updatedByName: string,
    notes?: string
  ): Promise<PartnerApplication> {
    const application = await prisma.partnerApplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    // Validate status transition
    const validTransitions = VALID_STATUS_TRANSITIONS[application.status];
    if (!validTransitions.includes(newStatus)) {
      throw new AppError(
        `Cannot transition from ${application.status} to ${newStatus}`,
        400
      );
    }

    // Get current status history
    const statusHistory = (application.statusHistory as any[]) || [];
    statusHistory.push({
      status: newStatus,
      changedAt: new Date().toISOString(),
      changedBy: updatedBy,
      changedByType: updatedByType,
      notes: notes || `Status changed to ${newStatus}`,
    });

    // Prepare update data
    const updateData: Prisma.PartnerApplicationUpdateInput = {
      status: newStatus,
      statusHistory,
    };

    // Handle specific status changes
    if (newStatus === 'DOCUMENT_VERIFIED') {
      updateData.documentsStatus = 'VERIFIED';
      updateData.verifiedById = updatedByType === 'ADMIN' ? updatedBy : undefined;
      updateData.verifiedAt = new Date();
    }

    if (newStatus === 'DOCUMENT_REJECTED') {
      updateData.documentsStatus = 'REJECTED';
      updateData.rejectionReason = notes;
    }

    if (newStatus === 'PAYMENT_VERIFIED') {
      updateData.paymentStatus = 'PAID';
    }

    if (newStatus === 'PAYMENT_REJECTED') {
      updateData.paymentStatus = 'FAILED';
    }

    if (newStatus === 'ADMISSION_CONFIRMED') {
      updateData.admittedAt = new Date();
      updateData.commissionStatus = 'PENDING';

      // Update partner stats
      await prisma.admissionPartner.update({
        where: { id: application.partnerId },
        data: {
          totalAdmissions: { increment: 1 },
          totalRevenue: { increment: Number(application.netFee) },
        },
      });
    }

    if (newStatus === 'COMMISSION_APPROVED') {
      updateData.commissionStatus = 'APPROVED';

      // Add to partner wallet
      const partner = await prisma.admissionPartner.findUnique({
        where: { id: application.partnerId },
        include: { wallet: true },
      });

      if (partner?.wallet) {
        await prisma.admissionPartnerWallet.update({
          where: { partnerId: partner.id },
          data: {
            pendingBalance: { increment: Number(application.commissionAmount) },
          },
        });

        // Create transaction
        await prisma.admissionPartnerTransaction.create({
          data: {
            partnerId: partner.id,
            type: 'COMMISSION',
            amount: Number(application.commissionAmount),
            balance: Number(partner.wallet.availableBalance) + Number(partner.wallet.pendingBalance) + Number(application.commissionAmount),
            referenceType: 'APPLICATION',
            referenceId: application.id,
            description: `Commission for application ${application.applicationNumber}`,
            status: 'PENDING',
          },
        });
      }
    }

    if (newStatus === 'COMMISSION_PAID') {
      updateData.commissionStatus = 'PAID';
      updateData.commissionPaidAt = new Date();

      // Move from pending to available in wallet
      const partner = await prisma.admissionPartner.findUnique({
        where: { id: application.partnerId },
        include: { wallet: true },
      });

      if (partner?.wallet) {
        await prisma.admissionPartnerWallet.update({
          where: { partnerId: partner.id },
          data: {
            pendingBalance: { decrement: Number(application.commissionAmount) },
            availableBalance: { increment: Number(application.commissionAmount) },
            totalEarned: { increment: Number(application.commissionAmount) },
          },
        });

        // Update partner total commission
        await prisma.admissionPartner.update({
          where: { id: partner.id },
          data: {
            totalCommissionEarned: { increment: Number(application.commissionAmount) },
          },
        });
      }
    }

    if (newStatus === 'CANCELLED') {
      updateData.cancelledReason = notes;
      updateData.cancelledById = updatedBy;
    }

    const updated = await prisma.partnerApplication.update({
      where: { id },
      data: updateData,
    });

    // Log activity
    await this.logActivity(
      id,
      'STATUS_CHANGED',
      application.status,
      newStatus,
      updatedBy,
      updatedByType,
      updatedByName,
      { notes }
    );

    return updated;
  }

  // Submit application (change from DRAFT to APPLICATION_SUBMITTED)
  async submitApplication(
    id: string,
    submittedBy: string,
    submittedByType: 'PARTNER' | 'STUDENT'
  ): Promise<PartnerApplication> {
    const application = await prisma.partnerApplication.findUnique({
      where: { id },
      include: { documents: true },
    });

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    if (application.status !== 'DRAFT' && application.status !== 'LINK_SENT') {
      throw new AppError('Application has already been submitted', 400);
    }

    // Determine next status based on documents
    const hasDocuments = application.documents.length > 0;
    const nextStatus: PartnerApplicationStatus = hasDocuments
      ? 'DOCUMENT_VERIFICATION'
      : 'DOCUMENT_PENDING';

    return this.updateStatus(
      id,
      'APPLICATION_SUBMITTED',
      submittedBy,
      submittedByType,
      submittedByType === 'PARTNER' ? 'Partner' : 'Student',
      'Application submitted'
    ).then(() =>
      this.updateStatus(id, nextStatus, submittedBy, submittedByType, submittedByType, undefined)
    );
  }

  // Assign counsellor
  async assignCounsellor(
    id: string,
    counsellorId: string,
    assignedBy: string
  ): Promise<PartnerApplication> {
    const application = await prisma.partnerApplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    const counsellor = await prisma.user.findUnique({
      where: { id: counsellorId },
    });

    if (!counsellor) {
      throw new AppError('Counsellor not found', 404);
    }

    const updated = await prisma.partnerApplication.update({
      where: { id },
      data: { counsellorId },
    });

    // Update status if applicable
    if (application.status === 'PAYMENT_VERIFIED' || application.status === 'ADMISSION_PROCESSING') {
      await this.updateStatus(
        id,
        'COUNSELLOR_ASSIGNED',
        assignedBy,
        'ADMIN',
        'Admin',
        `Assigned to ${counsellor.firstName} ${counsellor.lastName}`
      );
    }

    return updated;
  }

  // ==================== Application Links ====================

  // Create application link for student
  async createApplicationLink(data: CreateApplicationLinkDto): Promise<any> {
    const partner = await prisma.admissionPartner.findUnique({
      where: { id: data.partnerId },
    });

    if (!partner) {
      throw new AppError('Partner not found', 404);
    }

    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (data.expiresInDays || 7));

    const link = await prisma.partnerApplicationLink.create({
      data: {
        partnerId: data.partnerId,
        universityId: data.universityId,
        collegeId: data.collegeId,
        courseId: data.courseId,
        token,
        studentName: data.studentName,
        studentPhone: data.studentPhone,
        studentEmail: data.studentEmail,
        expiresAt,
        status: 'ACTIVE',
      },
    });

    // Log activity
    await admissionPartnerService.logActivity(
      data.partnerId,
      'APPLICATION_LINK_CREATED',
      'Created application link for student',
      { linkId: link.id, studentPhone: data.studentPhone }
    );

    return {
      ...link,
      url: `/apply/${token}`, // Frontend will use this to build full URL
    };
  }

  // Get application link by token
  async getApplicationLinkByToken(token: string): Promise<any> {
    const link = await prisma.partnerApplicationLink.findUnique({
      where: { token },
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
    });

    if (!link) {
      throw new AppError('Invalid application link', 404);
    }

    if (link.status !== 'ACTIVE') {
      throw new AppError(`Application link is ${link.status.toLowerCase()}`, 400);
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      // Mark as expired
      await prisma.partnerApplicationLink.update({
        where: { id: link.id },
        data: { status: 'EXPIRED' },
      });
      throw new AppError('Application link has expired', 400);
    }

    // Update access count
    await prisma.partnerApplicationLink.update({
      where: { id: link.id },
      data: {
        accessCount: { increment: 1 },
        lastAccessAt: new Date(),
      },
    });

    return link;
  }

  // Create application from link
  async createApplicationFromLink(
    token: string,
    applicationData: Omit<CreateApplicationDto, 'organizationId' | 'partnerId' | 'universityId' | 'collegeId' | 'courseId'>
  ): Promise<PartnerApplication> {
    const link = await this.getApplicationLinkByToken(token);

    // Create application
    const application = await this.createApplication({
      organizationId: link.partner.organizationId,
      partnerId: link.partnerId,
      universityId: link.universityId,
      collegeId: link.collegeId || undefined,
      courseId: link.courseId || undefined,
      ...applicationData,
      filledBy: 'STUDENT',
    });

    // Mark link as used
    await prisma.partnerApplicationLink.update({
      where: { id: link.id },
      data: {
        status: 'USED',
        applicationId: application.id,
      },
    });

    return application;
  }

  // ==================== Document Management ====================

  // Upload document
  async uploadDocument(data: UploadDocumentDto): Promise<any> {
    const application = await prisma.partnerApplication.findUnique({
      where: { id: data.applicationId },
    });

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    // Check if document type already exists
    const existingDoc = await prisma.applicationDocument.findFirst({
      where: {
        applicationId: data.applicationId,
        documentType: data.documentType,
        status: { not: 'REJECTED' },
      },
    });

    if (existingDoc) {
      // Update existing document (reupload)
      const updated = await prisma.applicationDocument.update({
        where: { id: existingDoc.id },
        data: {
          fileName: data.fileName,
          fileUrl: data.fileUrl,
          fileSize: data.fileSize,
          mimeType: data.mimeType,
          status: 'PENDING',
          reuploadCount: { increment: 1 },
          uploadedBy: data.uploadedBy,
          uploadedByName: data.uploadedByName,
        },
      });

      await this.logActivity(
        data.applicationId,
        'DOCUMENT_REUPLOADED',
        null,
        null,
        data.uploadedBy,
        data.uploadedBy as any,
        data.uploadedByName || data.uploadedBy,
        { documentType: data.documentType }
      );

      return updated;
    }

    // Create new document
    const document = await prisma.applicationDocument.create({
      data: {
        applicationId: data.applicationId,
        documentType: data.documentType,
        documentName: data.documentName,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        uploadedBy: data.uploadedBy,
        uploadedByName: data.uploadedByName,
      },
    });

    // Update application document status
    await this.updateDocumentStatus(data.applicationId);

    await this.logActivity(
      data.applicationId,
      'DOCUMENT_UPLOADED',
      null,
      null,
      data.uploadedBy,
      data.uploadedBy as any,
      data.uploadedByName || data.uploadedBy,
      { documentType: data.documentType, documentId: document.id }
    );

    return document;
  }

  // Verify document
  async verifyDocument(
    documentId: string,
    verifiedById: string,
    status: 'VERIFIED' | 'REJECTED',
    rejectionReason?: string
  ): Promise<any> {
    const document = await prisma.applicationDocument.findUnique({
      where: { id: documentId },
      include: { application: true },
    });

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    const updated = await prisma.applicationDocument.update({
      where: { id: documentId },
      data: {
        status,
        verifiedById,
        verifiedAt: new Date(),
        rejectionReason: status === 'REJECTED' ? rejectionReason : null,
      },
    });

    // Update application document status
    await this.updateDocumentStatus(document.applicationId);

    await this.logActivity(
      document.applicationId,
      status === 'VERIFIED' ? 'DOCUMENT_VERIFIED' : 'DOCUMENT_REJECTED',
      null,
      null,
      verifiedById,
      'ADMIN',
      'Admin',
      { documentType: document.documentType, rejectionReason }
    );

    return updated;
  }

  // Update application document status based on all documents
  private async updateDocumentStatus(applicationId: string): Promise<void> {
    const documents = await prisma.applicationDocument.findMany({
      where: { applicationId },
    });

    if (documents.length === 0) {
      await prisma.partnerApplication.update({
        where: { id: applicationId },
        data: { documentsStatus: 'PENDING' },
      });
      return;
    }

    const allVerified = documents.every((d) => d.status === 'VERIFIED');
    const anyRejected = documents.some((d) => d.status === 'REJECTED');
    const anyPending = documents.some((d) => d.status === 'PENDING');

    let documentsStatus: ApplicationDocumentStatus = 'PARTIAL';
    if (allVerified) {
      documentsStatus = 'VERIFIED';
    } else if (anyRejected && !anyPending) {
      documentsStatus = 'REJECTED';
    } else if (anyPending) {
      documentsStatus = 'PARTIAL';
    }

    await prisma.partnerApplication.update({
      where: { id: applicationId },
      data: { documentsStatus },
    });
  }

  // Get required documents for college
  async getRequiredDocuments(
    organizationId: string,
    universityId: string,
    collegeId?: string,
    courseId?: string
  ): Promise<any[]> {
    const requirements = await prisma.collegeDocumentRequirement.findMany({
      where: {
        organizationId,
        universityId,
        OR: [
          { collegeId: null, courseId: null },
          { collegeId, courseId: null },
          { collegeId, courseId },
        ],
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    return requirements;
  }

  // ==================== Statistics ====================

  // Get application statistics
  async getApplicationStats(organizationId: string, partnerId?: string) {
    const where: Prisma.PartnerApplicationWhereInput = { organizationId };
    if (partnerId) where.partnerId = partnerId;

    const [
      totalApplications,
      statusCounts,
      paymentStats,
      commissionStats,
    ] = await Promise.all([
      prisma.partnerApplication.count({ where }),
      prisma.partnerApplication.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
      prisma.partnerApplication.aggregate({
        where: { ...where, paymentStatus: 'PAID' },
        _sum: { paidAmount: true, netFee: true },
        _count: { id: true },
      }),
      prisma.partnerApplication.aggregate({
        where: { ...where, commissionStatus: { in: ['APPROVED', 'PAID'] } },
        _sum: { commissionAmount: true },
        _count: { id: true },
      }),
    ]);

    // Format status counts
    const statusMap: Record<string, number> = {};
    statusCounts.forEach((s) => {
      statusMap[s.status] = s._count.id;
    });

    return {
      totalApplications,
      byStatus: statusMap,
      payments: {
        totalPaid: paymentStats._sum.paidAmount || 0,
        totalFees: paymentStats._sum.netFee || 0,
        paidCount: paymentStats._count.id,
      },
      commissions: {
        totalEarned: commissionStats._sum.commissionAmount || 0,
        eligibleCount: commissionStats._count.id,
      },
    };
  }

  // ==================== Activity Logging ====================

  private async logActivity(
    applicationId: string,
    action: string,
    fromStatus: string | null,
    toStatus: string | null,
    performedById: string,
    performedByType: string,
    performedByName: string,
    details?: any
  ) {
    return prisma.applicationActivityLog.create({
      data: {
        applicationId,
        action,
        fromStatus,
        toStatus,
        performedById,
        performedByType,
        performedByName,
        details: details || {},
      },
    });
  }

  // Get activity logs
  async getActivityLogs(applicationId: string) {
    return prisma.applicationActivityLog.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const partnerApplicationService = new PartnerApplicationService();
