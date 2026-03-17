import { Router } from 'express';
import { complianceService, ConsentMethod, ComplianceEventType, ActorType, TargetType } from '../services/compliance.service';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { ConsentType } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== CONSENT MANAGEMENT ====================

/**
 * @api {post} /compliance/consent Record Consent
 */
router.post(
  '/consent',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const {
      phoneNumber,
      consentType,
      consentGiven,
      consentMethod,
      leadId,
      callId,
      recordingUrl,
      consentPhrase,
      validUntil,
    } = req.body;

    if (!phoneNumber || !consentType || consentGiven === undefined || !consentMethod) {
      return res.status(400).json({
        success: false,
        message: 'phoneNumber, consentType, consentGiven, and consentMethod are required',
      });
    }

    const consent = await complianceService.recordConsent({
      organizationId,
      phoneNumber,
      consentType: consentType as ConsentType,
      consentGiven,
      consentMethod: consentMethod as ConsentMethod,
      leadId,
      callId,
      recordingUrl,
      consentPhrase,
      validUntil: validUntil ? new Date(validUntil) : undefined,
    });

    res.json({ success: true, data: consent });
  })
);

/**
 * @api {delete} /compliance/consent/:id Revoke Consent
 */
router.delete(
  '/consent/:id',
  asyncHandler(async (req, res) => {
    const { id: userId } = req.user!;
    const { reason } = req.body;

    const consent = await complianceService.revokeConsent({
      consentId: req.params.id,
      revokedBy: userId,
      revokeReason: reason,
    });

    res.json({ success: true, data: consent });
  })
);

/**
 * @api {get} /compliance/consent/check/:phone Check Consent Status
 */
router.get(
  '/consent/check/:phone',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { type } = req.query;

    const status = await complianceService.checkConsent(
      organizationId,
      req.params.phone,
      type as ConsentType | undefined
    );

    res.json({ success: true, data: status });
  })
);

/**
 * @api {get} /compliance/consent List Consent Records
 */
router.get(
  '/consent',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const {
      phoneNumber,
      leadId,
      consentType,
      includeRevoked,
      page = '1',
      limit = '50',
    } = req.query;

    const result = await complianceService.getConsentRecords(organizationId, {
      phoneNumber: phoneNumber as string,
      leadId: leadId as string,
      consentType: consentType as ConsentType,
      includeRevoked: includeRevoked === 'true',
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    res.json({ success: true, ...result });
  })
);

// ==================== RECORDING DISCLOSURE ====================

/**
 * @api {get} /compliance/disclosure Get Disclosure Config
 */
router.get(
  '/disclosure',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const config = await complianceService.getDisclosureConfig(organizationId);
    res.json({ success: true, data: config });
  })
);

/**
 * @api {put} /compliance/disclosure Update Disclosure Config
 */
router.put(
  '/disclosure',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const {
      disclosureEnabled,
      disclosureText,
      disclosureMessages,
      requireAcknowledgment,
      acknowledgmentPhrase,
      autoPlayDelay,
      recordingConsent,
      consentRequired,
    } = req.body;

    const config = await complianceService.updateDisclosureConfig({
      organizationId,
      disclosureEnabled,
      disclosureText,
      disclosureMessages,
      requireAcknowledgment,
      acknowledgmentPhrase,
      autoPlayDelay,
      recordingConsent,
      consentRequired,
    });

    res.json({ success: true, data: config });
  })
);

// ==================== AUDIT LOGS ====================

/**
 * @api {get} /compliance/audit-logs List Compliance Audit Logs
 */
router.get(
  '/audit-logs',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const {
      eventType,
      actorType,
      targetType,
      targetId,
      startDate,
      endDate,
      page = '1',
      limit = '50',
    } = req.query;

    const result = await complianceService.getAuditLogs(organizationId, {
      eventType: eventType as ComplianceEventType,
      actorType: actorType as ActorType,
      targetType: targetType as TargetType,
      targetId: targetId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    res.json({ success: true, ...result });
  })
);

// ==================== REPORTING ====================

/**
 * @api {get} /compliance/report Generate Compliance Report
 */
router.get(
  '/report',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
      });
    }

    const report = await complianceService.generateComplianceReport(
      organizationId,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json({ success: true, data: report });
  })
);

/**
 * @api {get} /compliance/dashboard Get Compliance Dashboard Metrics
 */
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const metrics = await complianceService.getDashboardMetrics(organizationId);
    res.json({ success: true, data: metrics });
  })
);

// ==================== PRE-CALL CHECK ====================

/**
 * @api {get} /compliance/pre-call-check/:phone Pre-Call Compliance Check
 */
router.get(
  '/pre-call-check/:phone',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const result = await complianceService.preCallComplianceCheck(
      organizationId,
      req.params.phone
    );
    res.json({ success: true, data: result });
  })
);

export default router;
