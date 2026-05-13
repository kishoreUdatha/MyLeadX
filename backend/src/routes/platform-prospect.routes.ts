/**
 * Platform Prospect Routes — SaaS sales for MyLeadX
 *
 * Public endpoint: POST /public/submit  (no auth — marketing form ingestion)
 * Super-admin endpoints: everything else.
 */

import { Router } from 'express';
import { platformProspectController } from '../controllers/platform-prospect.controller';
import { verifySuperAdmin } from '../middlewares/super-admin-auth';

const router = Router();

router.post('/public/submit', platformProspectController.createPublic.bind(platformProspectController));

router.use(verifySuperAdmin);

router.get('/', platformProspectController.list.bind(platformProspectController));
router.get('/pipeline-summary', platformProspectController.pipelineSummary.bind(platformProspectController));
router.get('/source-breakdown', platformProspectController.sourceBreakdown.bind(platformProspectController));
router.get('/assignable-users', platformProspectController.assignableUsers.bind(platformProspectController));
router.get('/:id', platformProspectController.getById.bind(platformProspectController));

router.post('/', platformProspectController.create.bind(platformProspectController));
router.put('/:id', platformProspectController.update.bind(platformProspectController));
router.delete('/:id', platformProspectController.delete.bind(platformProspectController));

router.post('/:id/stage', platformProspectController.changeStage.bind(platformProspectController));
router.post('/:id/assign', platformProspectController.assign.bind(platformProspectController));
router.post('/:id/activities', platformProspectController.logActivity.bind(platformProspectController));
router.post('/:id/convert', platformProspectController.convertToTenant.bind(platformProspectController));

export default router;
