import { Router, Request, Response } from 'express';
import { otpService } from '../services/otp.service';
import { authenticate, optionalAuth } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { ApiResponse } from '../utils/apiResponse';
import { OtpPurpose, OtpChannel, OtpIdentifierType } from '@prisma/client';

const router = Router();

// ==================== PUBLIC ENDPOINTS ====================

/**
 * Send OTP (Public - for lead verification)
 * POST /api/otp/send
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { identifier, identifierType, purpose, channel, leadId, applicationId } = req.body;

    // Validation
    if (!identifier) {
      return ApiResponse.error(res, 'Identifier (phone or email) is required', 400);
    }

    if (!identifierType || !['PHONE', 'EMAIL'].includes(identifierType)) {
      return ApiResponse.error(res, 'Valid identifier type (PHONE or EMAIL) is required', 400);
    }

    if (!purpose) {
      return ApiResponse.error(res, 'OTP purpose is required', 400);
    }

    // Validate purpose
    const validPurposes = [
      'PHONE_VERIFICATION',
      'EMAIL_VERIFICATION',
      'APPLICATION_SUBMISSION',
      'DOCUMENT_UPLOAD',
      'PAYMENT_CONFIRMATION',
      'ADMISSION_CONFIRMATION',
    ];

    if (!validPurposes.includes(purpose)) {
      return ApiResponse.error(res, 'Invalid OTP purpose', 400);
    }

    // Validate phone format
    if (identifierType === 'PHONE') {
      const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
      const cleanPhone = identifier.replace(/[\s-]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        return ApiResponse.error(res, 'Invalid phone number format', 400);
      }
    }

    // Validate email format
    if (identifierType === 'EMAIL') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(identifier)) {
        return ApiResponse.error(res, 'Invalid email format', 400);
      }
    }

    const result = await otpService.sendOtp({
      identifier: identifier.replace(/[\s-]/g, ''),
      identifierType: identifierType as OtpIdentifierType,
      purpose: purpose as OtpPurpose,
      channel: channel as OtpChannel,
      leadId,
      applicationId,
    });

    if (result.success) {
      ApiResponse.success(res, result.message, {
        otpId: result.otpId,
        expiresAt: result.expiresAt,
      });
    } else {
      ApiResponse.error(res, result.message, 429, {
        canResendAt: result.canResendAt,
      });
    }
  } catch (error) {
    console.error('[OTP Route] Send error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Verify OTP (Public)
 * POST /api/otp/verify
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { identifier, purpose, otp } = req.body;

    // Validation
    if (!identifier || !purpose || !otp) {
      return ApiResponse.error(res, 'Identifier, purpose, and OTP are required', 400);
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return ApiResponse.error(res, 'OTP must be 6 digits', 400);
    }

    const result = await otpService.verifyOtp({
      identifier: identifier.replace(/[\s-]/g, ''),
      purpose: purpose as OtpPurpose,
      otp,
    });

    if (result.success) {
      ApiResponse.success(res, result.message, {
        verified: true,
        otpId: result.otpId,
      });
    } else {
      ApiResponse.error(res, result.message, 400, {
        verified: false,
        attemptsRemaining: result.attemptsRemaining,
      });
    }
  } catch (error) {
    console.error('[OTP Route] Verify error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Resend OTP (Public)
 * POST /api/otp/resend
 */
router.post('/resend', async (req: Request, res: Response) => {
  try {
    const { identifier, purpose } = req.body;

    if (!identifier || !purpose) {
      return ApiResponse.error(res, 'Identifier and purpose are required', 400);
    }

    const result = await otpService.resendOtp(
      identifier.replace(/[\s-]/g, ''),
      purpose as OtpPurpose
    );

    if (result.success) {
      ApiResponse.success(res, result.message, {
        otpId: result.otpId,
        expiresAt: result.expiresAt,
      });
    } else {
      ApiResponse.error(res, result.message, 429, {
        canResendAt: result.canResendAt,
      });
    }
  } catch (error) {
    console.error('[OTP Route] Resend error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Check verification status (Public)
 * GET /api/otp/status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const { identifier, purpose } = req.query;

    if (!identifier || !purpose) {
      return ApiResponse.error(res, 'Identifier and purpose are required', 400);
    }

    const status = await otpService.getVerificationStatus(
      (identifier as string).replace(/[\s-]/g, ''),
      purpose as OtpPurpose
    );

    ApiResponse.success(res, 'Verification status retrieved', status);
  } catch (error) {
    console.error('[OTP Route] Status error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// ==================== AUTHENTICATED ENDPOINTS ====================

router.use(authenticate);
router.use(tenantMiddleware);

/**
 * Send OTP for a lead (Authenticated)
 * POST /api/otp/lead/:leadId/send
 */
router.post('/lead/:leadId/send', async (req: TenantRequest, res: Response) => {
  try {
    const { leadId } = req.params;
    const { identifierType, purpose, channel } = req.body;

    // Get lead details
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        organizationId: req.organizationId,
      },
    });

    if (!lead) {
      return ApiResponse.error(res, 'Lead not found', 404);
    }

    const identifier = identifierType === 'EMAIL' ? lead.email : lead.phone;

    if (!identifier) {
      return ApiResponse.error(res, `Lead does not have a ${identifierType?.toLowerCase()}`, 400);
    }

    const result = await otpService.sendOtp({
      identifier,
      identifierType: identifierType as OtpIdentifierType,
      purpose: purpose as OtpPurpose,
      channel: channel as OtpChannel,
      organizationId: req.organizationId,
      leadId,
    });

    if (result.success) {
      ApiResponse.success(res, result.message, {
        otpId: result.otpId,
        expiresAt: result.expiresAt,
      });
    } else {
      ApiResponse.error(res, result.message, 429, {
        canResendAt: result.canResendAt,
      });
    }
  } catch (error) {
    console.error('[OTP Route] Lead send error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Send OTP for application submission (Authenticated)
 * POST /api/otp/application/:applicationId/send
 */
router.post('/application/:applicationId/send', async (req: TenantRequest, res: Response) => {
  try {
    const { applicationId } = req.params;
    const { channel } = req.body;

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const application = await prisma.leadApplication.findFirst({
      where: { id: applicationId },
      include: { lead: true },
    });

    if (!application) {
      return ApiResponse.error(res, 'Application not found', 404);
    }

    const lead = application.lead;
    if (!lead.phone) {
      return ApiResponse.error(res, 'Lead does not have a phone number', 400);
    }

    const result = await otpService.sendOtp({
      identifier: lead.phone,
      identifierType: 'PHONE',
      purpose: 'APPLICATION_SUBMISSION',
      channel: channel || 'SMS',
      organizationId: req.organizationId,
      leadId: lead.id,
      applicationId,
    });

    if (result.success) {
      ApiResponse.success(res, result.message, {
        otpId: result.otpId,
        expiresAt: result.expiresAt,
      });
    } else {
      ApiResponse.error(res, result.message, 429);
    }
  } catch (error) {
    console.error('[OTP Route] Application send error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Verify and submit application (Authenticated)
 * POST /api/otp/application/:applicationId/verify-submit
 */
router.post('/application/:applicationId/verify-submit', async (req: TenantRequest, res: Response) => {
  try {
    const { applicationId } = req.params;
    const { otp } = req.body;

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const application = await prisma.leadApplication.findFirst({
      where: { id: applicationId },
      include: { lead: true },
    });

    if (!application) {
      return ApiResponse.error(res, 'Application not found', 404);
    }

    // Verify OTP
    const verifyResult = await otpService.verifyOtp({
      identifier: application.lead.phone,
      purpose: 'APPLICATION_SUBMISSION',
      otp,
    });

    if (!verifyResult.success) {
      return ApiResponse.error(res, verifyResult.message, 400, {
        attemptsRemaining: verifyResult.attemptsRemaining,
      });
    }

    // Update application status to SUBMITTED
    const updatedApplication = await prisma.leadApplication.update({
      where: { id: applicationId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    // Update lead phone verification
    await prisma.lead.update({
      where: { id: application.lead.id },
      data: { phoneVerified: true },
    });

    ApiResponse.success(res, 'Application submitted successfully', {
      application: updatedApplication,
      verified: true,
    });
  } catch (error) {
    console.error('[OTP Route] Application verify-submit error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Get OTP history for a lead (Authenticated)
 * GET /api/otp/lead/:leadId/history
 */
router.get('/lead/:leadId/history', async (req: TenantRequest, res: Response) => {
  try {
    const { leadId } = req.params;

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const otpHistory = await prisma.otpVerification.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        identifier: true,
        identifierType: true,
        purpose: true,
        channel: true,
        isVerified: true,
        attempts: true,
        createdAt: true,
        verifiedAt: true,
        expiresAt: true,
      },
    });

    ApiResponse.success(res, 'OTP history retrieved', otpHistory);
  } catch (error) {
    console.error('[OTP Route] History error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

/**
 * Cleanup expired OTPs (Admin only)
 * POST /api/otp/cleanup
 */
router.post('/cleanup', async (req: TenantRequest, res: Response) => {
  try {
    const deletedCount = await otpService.cleanupExpiredOtps();
    ApiResponse.success(res, `Cleaned up ${deletedCount} expired OTP records`, { deletedCount });
  } catch (error) {
    console.error('[OTP Route] Cleanup error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

export default router;
