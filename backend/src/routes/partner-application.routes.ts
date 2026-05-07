import { Router, Request, Response, NextFunction } from 'express';
import { partnerApplicationService } from '../services/partner-application.service';
import { authenticate, authorize } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validate';
import { z } from 'zod';

const router = Router();

// ==================== Validation Schemas ====================

const createApplicationSchema = z.object({
  body: z.object({
    partnerId: z.string().uuid(),
    universityId: z.string().uuid(),
    collegeId: z.string().uuid().optional(),
    courseId: z.string().uuid().optional(),
    academicYear: z.string().min(4),
    studentName: z.string().min(2),
    studentEmail: z.string().email().optional(),
    studentPhone: z.string().min(10),
    parentName: z.string().optional(),
    parentPhone: z.string().optional(),
    dateOfBirth: z.string().datetime().optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    aadhaarNumber: z.string().length(12).optional(),
    hallTicketNumber: z.string().optional(),
    formData: z.record(z.any()).optional(),
    totalFee: z.number().positive(),
    scholarshipAmount: z.number().min(0).optional(),
  }),
});

const updateApplicationSchema = z.object({
  body: z.object({
    studentName: z.string().min(2).optional(),
    studentEmail: z.string().email().optional(),
    studentPhone: z.string().min(10).optional(),
    parentName: z.string().optional(),
    parentPhone: z.string().optional(),
    dateOfBirth: z.string().datetime().optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    aadhaarNumber: z.string().length(12).optional(),
    hallTicketNumber: z.string().optional(),
    formData: z.record(z.any()).optional(),
    totalFee: z.number().positive().optional(),
    scholarshipAmount: z.number().min(0).optional(),
    internalRemarks: z.string().optional(),
    partnerRemarks: z.string().optional(),
  }),
});

const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum([
      'DRAFT',
      'LINK_SENT',
      'APPLICATION_SUBMITTED',
      'DOCUMENT_PENDING',
      'DOCUMENT_VERIFICATION',
      'DOCUMENT_VERIFIED',
      'DOCUMENT_REJECTED',
      'PAYMENT_PENDING',
      'PAYMENT_LINK_SENT',
      'PAYMENT_PROOF_SUBMITTED',
      'PAYMENT_UNDER_VERIFICATION',
      'PAYMENT_VERIFIED',
      'PAYMENT_REJECTED',
      'ADMISSION_PROCESSING',
      'COUNSELLOR_ASSIGNED',
      'ADMISSION_CONFIRMED',
      'ADMISSION_REJECTED',
      'COMMISSION_PENDING',
      'COMMISSION_APPROVED',
      'COMMISSION_PAID',
      'CANCELLED',
    ]),
    notes: z.string().optional(),
  }),
});

const assignCounsellorSchema = z.object({
  body: z.object({
    counsellorId: z.string().uuid(),
  }),
});

const uploadDocumentSchema = z.object({
  body: z.object({
    documentType: z.string().min(1),
    documentName: z.string().min(1),
    fileName: z.string().min(1),
    fileUrl: z.string().url(),
    fileSize: z.number().positive(),
    mimeType: z.string().optional(),
  }),
});

const verifyDocumentSchema = z.object({
  body: z.object({
    status: z.enum(['VERIFIED', 'REJECTED']),
    rejectionReason: z.string().optional(),
  }),
});

const listApplicationsSchema = z.object({
  query: z.object({
    partnerId: z.string().uuid().optional(),
    universityId: z.string().uuid().optional(),
    collegeId: z.string().uuid().optional(),
    courseId: z.string().uuid().optional(),
    status: z.string().optional(),
    paymentStatus: z.enum(['PENDING', 'PARTIAL', 'PAID', 'FAILED', 'REFUNDED']).optional(),
    documentsStatus: z.enum(['PENDING', 'PARTIAL', 'COMPLETE', 'VERIFIED', 'REJECTED']).optional(),
    counsellorId: z.string().uuid().optional(),
    academicYear: z.string().optional(),
    search: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
  }),
});

const checkDuplicatesSchema = z.object({
  body: z.object({
    studentPhone: z.string().min(10),
    studentEmail: z.string().email().optional(),
    aadhaarNumber: z.string().length(12).optional(),
    hallTicketNumber: z.string().optional(),
  }),
});

// ==================== Admin Routes ====================

// Create application (Admin)
router.post(
  '/',
  authenticate,
  authorize(['admin', 'manager']),
  validateRequest(createApplicationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const application = await partnerApplicationService.createApplication({
        organizationId: req.user!.organizationId,
        ...req.body,
        dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : undefined,
      });

      res.status(201).json({
        success: true,
        message: 'Application created successfully',
        data: application,
      });
    } catch (error) {
      next(error);
    }
  }
);

// List applications (Admin)
router.get(
  '/',
  authenticate,
  authorize(['admin', 'manager', 'telecaller']),
  validateRequest(listApplicationsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await partnerApplicationService.listApplications({
        organizationId: req.user!.organizationId,
        partnerId: req.query.partnerId as string,
        universityId: req.query.universityId as string,
        collegeId: req.query.collegeId as string,
        courseId: req.query.courseId as string,
        status: req.query.status as any,
        paymentStatus: req.query.paymentStatus as any,
        documentsStatus: req.query.documentsStatus as any,
        counsellorId: req.query.counsellorId as string,
        academicYear: req.query.academicYear as string,
        search: req.query.search as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
      });

      res.json({
        success: true,
        data: result.applications,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get application statistics (Admin)
router.get(
  '/stats',
  authenticate,
  authorize(['admin', 'manager']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await partnerApplicationService.getApplicationStats(
        req.user!.organizationId,
        req.query.partnerId as string
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Check for duplicates (Admin)
router.post(
  '/check-duplicates',
  authenticate,
  authorize(['admin', 'manager']),
  validateRequest(checkDuplicatesSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await partnerApplicationService.checkDuplicates(
        req.user!.organizationId,
        req.body.studentPhone,
        req.body.studentEmail,
        req.body.aadhaarNumber,
        req.body.hallTicketNumber
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get application by ID (Admin)
router.get(
  '/:id',
  authenticate,
  authorize(['admin', 'manager', 'telecaller']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const application = await partnerApplicationService.getApplicationById(req.params.id);

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found',
        });
      }

      res.json({
        success: true,
        data: application,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update application (Admin)
router.patch(
  '/:id',
  authenticate,
  authorize(['admin', 'manager']),
  validateRequest(updateApplicationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const application = await partnerApplicationService.updateApplication(
        req.params.id,
        {
          ...req.body,
          dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : undefined,
        },
        req.user!.id,
        'ADMIN'
      );

      res.json({
        success: true,
        message: 'Application updated successfully',
        data: application,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update application status (Admin)
router.patch(
  '/:id/status',
  authenticate,
  authorize(['admin', 'manager']),
  validateRequest(updateStatusSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const application = await partnerApplicationService.updateStatus(
        req.params.id,
        req.body.status,
        req.user!.id,
        'ADMIN',
        `${req.user!.firstName} ${req.user!.lastName}`,
        req.body.notes
      );

      res.json({
        success: true,
        message: `Application status updated to ${req.body.status}`,
        data: application,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Assign counsellor (Admin)
router.patch(
  '/:id/assign-counsellor',
  authenticate,
  authorize(['admin', 'manager']),
  validateRequest(assignCounsellorSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const application = await partnerApplicationService.assignCounsellor(
        req.params.id,
        req.body.counsellorId,
        req.user!.id
      );

      res.json({
        success: true,
        message: 'Counsellor assigned successfully',
        data: application,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== Document Routes ====================

// Upload document (Admin)
router.post(
  '/:id/documents',
  authenticate,
  authorize(['admin', 'manager']),
  validateRequest(uploadDocumentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const document = await partnerApplicationService.uploadDocument({
        applicationId: req.params.id,
        ...req.body,
        uploadedBy: 'ADMIN',
        uploadedByName: `${req.user!.firstName} ${req.user!.lastName}`,
      });

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        data: document,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Verify document (Admin)
router.patch(
  '/:id/documents/:documentId/verify',
  authenticate,
  authorize(['admin', 'manager']),
  validateRequest(verifyDocumentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const document = await partnerApplicationService.verifyDocument(
        req.params.documentId,
        req.user!.id,
        req.body.status,
        req.body.rejectionReason
      );

      res.json({
        success: true,
        message: `Document ${req.body.status.toLowerCase()}`,
        data: document,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get required documents for college (Admin)
router.get(
  '/required-documents/:universityId',
  authenticate,
  authorize(['admin', 'manager']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const documents = await partnerApplicationService.getRequiredDocuments(
        req.user!.organizationId,
        req.params.universityId,
        req.query.collegeId as string,
        req.query.courseId as string
      );

      res.json({
        success: true,
        data: documents,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== Activity Logs ====================

// Get application activity logs (Admin)
router.get(
  '/:id/activity-logs',
  authenticate,
  authorize(['admin', 'manager']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const logs = await partnerApplicationService.getActivityLogs(req.params.id);

      res.json({
        success: true,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
