import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { campaignController } from '../controllers/campaign.controller';
import { validate } from '../middlewares/validate';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';

const router = Router();

router.use(authenticate);
router.use(tenantMiddleware);

const createCampaignValidation = [
  body('name').trim().notEmpty().withMessage('Campaign name is required'),
  body('type').isIn(['SMS', 'EMAIL', 'WHATSAPP']).withMessage('Invalid campaign type'),
  body('content').trim().notEmpty().withMessage('Content is required'),
  body('subject').optional().trim(),
  body('scheduledAt').optional().isISO8601(),
];

const addRecipientsValidation = [
  param('id').isUUID(),
  body('recipients').isArray().withMessage('Recipients must be an array'),
];

router.post(
  '/',
  authorize('admin', 'counselor'),
  validate(createCampaignValidation),
  campaignController.create.bind(campaignController)
);

router.get(
  '/',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  campaignController.findAll.bind(campaignController)
);

router.get(
  '/:id',
  param('id').isUUID(),
  campaignController.findById.bind(campaignController)
);

router.get(
  '/:id/stats',
  param('id').isUUID(),
  campaignController.getStats.bind(campaignController)
);

router.post(
  '/:id/recipients',
  authorize('admin'),
  validate(addRecipientsValidation),
  campaignController.addRecipients.bind(campaignController)
);

router.post(
  '/:id/execute',
  authorize('admin'),
  param('id').isUUID(),
  campaignController.execute.bind(campaignController)
);

export default router;
