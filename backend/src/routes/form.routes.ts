import { Router } from 'express';
import { body, param } from 'express-validator';
import { formController } from '../controllers/form.controller';
import { validate } from '../middlewares/validate';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';

const router = Router();

// Public routes (for form embedding and submission)
router.get('/public/:id', formController.getPublicForm.bind(formController));
router.post(
  '/public/:id/submit',
  param('id').isUUID(),
  formController.submit.bind(formController)
);

// Protected routes
router.use(authenticate);
router.use(tenantMiddleware);

const createFormValidation = [
  body('name').trim().notEmpty().withMessage('Form name is required'),
  body('fields').isArray().withMessage('Fields must be an array'),
];

router.post('/', validate(createFormValidation), formController.create.bind(formController));
router.get('/', formController.findAll.bind(formController));
router.get('/:id', param('id').isUUID(), formController.findById.bind(formController));
router.get('/:id/embed-code', param('id').isUUID(), formController.getEmbedCode.bind(formController));
router.put('/:id', param('id').isUUID(), formController.update.bind(formController));
router.delete('/:id', param('id').isUUID(), formController.delete.bind(formController));

export default router;
