import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { rawImportController } from '../controllers/rawImport.controller';
import { validate } from '../middlewares/validate';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';

const router = Router();

// Apply authentication and tenant middleware to all routes
router.use(authenticate);
router.use(tenantMiddleware);

// Validation rules
const assignToTelecallersValidation = [
  body('recordIds').isArray({ min: 1 }).withMessage('At least one record ID is required'),
  body('recordIds.*').isUUID().withMessage('Invalid record ID'),
  body('telecallerIds').isArray({ min: 1 }).withMessage('At least one telecaller ID is required'),
  body('telecallerIds.*').isUUID().withMessage('Invalid telecaller ID'),
];

const assignToAIAgentValidation = [
  body('recordIds').isArray({ min: 1 }).withMessage('At least one record ID is required'),
  body('recordIds.*').isUUID().withMessage('Invalid record ID'),
  body('agentId').isUUID().withMessage('Valid AI agent ID is required'),
];

const updateStatusValidation = [
  param('id').isUUID().withMessage('Invalid record ID'),
  body('status').isIn([
    'PENDING', 'ASSIGNED', 'CALLING', 'INTERESTED', 'NOT_INTERESTED',
    'NO_ANSWER', 'CALLBACK_REQUESTED', 'CONVERTED', 'REJECTED'
  ]).withMessage('Invalid status'),
];

const convertToLeadValidation = [
  param('id').isUUID().withMessage('Invalid record ID'),
  body('source').optional().isIn([
    'MANUAL', 'BULK_UPLOAD', 'FORM', 'LANDING_PAGE', 'CHATBOT',
    'AD_FACEBOOK', 'AD_INSTAGRAM', 'AD_LINKEDIN', 'REFERRAL', 'WEBSITE', 'OTHER'
  ]),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
];

const bulkConvertValidation = [
  body('recordIds').isArray({ min: 1 }).withMessage('At least one record ID is required'),
  body('recordIds.*').isUUID().withMessage('Invalid record ID'),
];

const listRecordsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn([
    'PENDING', 'ASSIGNED', 'CALLING', 'INTERESTED', 'NOT_INTERESTED',
    'NO_ANSWER', 'CALLBACK_REQUESTED', 'CONVERTED', 'REJECTED'
  ]),
  query('bulkImportId').optional().isUUID(),
  query('assignedToId').optional().isUUID(),
  query('assignedAgentId').optional().isUUID(),
];

// Routes

// Stats
router.get(
  '/stats',
  rawImportController.getStats.bind(rawImportController)
);

// Bulk Imports List
router.get(
  '/',
  rawImportController.listBulkImports.bind(rawImportController)
);

// Records List (can filter by bulkImportId)
router.get(
  '/records',
  validate(listRecordsValidation),
  rawImportController.listRecords.bind(rawImportController)
);

// Get single bulk import
router.get(
  '/:id',
  param('id').isUUID().withMessage('Invalid bulk import ID'),
  validate([]),
  rawImportController.getBulkImport.bind(rawImportController)
);

// Get single record
router.get(
  '/records/:id',
  param('id').isUUID().withMessage('Invalid record ID'),
  validate([]),
  rawImportController.getRecord.bind(rawImportController)
);

// Assignment
router.post(
  '/assign/telecallers',
  authorize('admin'),
  validate(assignToTelecallersValidation),
  rawImportController.assignToTelecallers.bind(rawImportController)
);

router.post(
  '/assign/ai-agent',
  authorize('admin'),
  validate(assignToAIAgentValidation),
  rawImportController.assignToAIAgent.bind(rawImportController)
);

// Status Update
router.put(
  '/records/:id/status',
  validate(updateStatusValidation),
  rawImportController.updateRecordStatus.bind(rawImportController)
);

// Conversion
router.post(
  '/records/:id/convert',
  validate(convertToLeadValidation),
  rawImportController.convertToLead.bind(rawImportController)
);

router.post(
  '/records/bulk-convert',
  validate(bulkConvertValidation),
  rawImportController.bulkConvertToLeads.bind(rawImportController)
);

export default router;
