import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import dynamicFieldsService from '../services/dynamic-fields.service';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/dynamic-fields
 * Get all field definitions for the organization
 */
router.get('/', async (req, res) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { entityType } = req.query;

    const fields = await dynamicFieldsService.getFieldDefinitions(
      organizationId,
      entityType as string | undefined
    );

    res.json({
      success: true,
      data: fields,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch field definitions',
      error: error.message,
    });
  }
});

/**
 * GET /api/dynamic-fields/groups
 * Get field definitions grouped by group name
 */
router.get('/groups', async (req, res) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { entityType } = req.query;

    if (!entityType) {
      return res.status(400).json({
        success: false,
        message: 'entityType is required',
      });
    }

    const groups = await dynamicFieldsService.getFieldGroups(
      organizationId,
      entityType as string
    );

    res.json({
      success: true,
      data: groups,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch field groups',
      error: error.message,
    });
  }
});

/**
 * GET /api/dynamic-fields/:id
 * Get a single field definition
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const field = await dynamicFieldsService.getFieldDefinitionById(id);

    if (!field) {
      return res.status(404).json({
        success: false,
        message: 'Field definition not found',
      });
    }

    res.json({
      success: true,
      data: field,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch field definition',
      error: error.message,
    });
  }
});

/**
 * POST /api/dynamic-fields
 * Create a new field definition
 */
router.post('/', authorize(['admin', 'tenant_admin']), async (req, res) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const data = req.body;

    if (!data.name || !data.label || !data.fieldType || !data.entityType) {
      return res.status(400).json({
        success: false,
        message: 'name, label, fieldType, and entityType are required',
      });
    }

    const field = await dynamicFieldsService.createFieldDefinition(organizationId, data);

    res.status(201).json({
      success: true,
      data: field,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to create field definition',
      error: error.message,
    });
  }
});

/**
 * PUT /api/dynamic-fields/:id
 * Update a field definition
 */
router.put('/:id', authorize(['admin', 'tenant_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const field = await dynamicFieldsService.updateFieldDefinition(id, data);

    res.json({
      success: true,
      data: field,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update field definition',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/dynamic-fields/:id
 * Delete a field definition
 */
router.delete('/:id', authorize(['admin', 'tenant_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    await dynamicFieldsService.deleteFieldDefinition(id);

    res.json({
      success: true,
      message: 'Field definition deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete field definition',
      error: error.message,
    });
  }
});

/**
 * PUT /api/dynamic-fields/reorder
 * Reorder field definitions
 */
router.put('/reorder', authorize(['admin', 'tenant_admin']), async (req, res) => {
  try {
    const { fieldOrders } = req.body;

    if (!Array.isArray(fieldOrders)) {
      return res.status(400).json({
        success: false,
        message: 'fieldOrders must be an array',
      });
    }

    await dynamicFieldsService.reorderFieldDefinitions(fieldOrders);

    res.json({
      success: true,
      message: 'Fields reordered successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to reorder fields',
      error: error.message,
    });
  }
});

// ============ Field Values Routes ============

/**
 * GET /api/dynamic-fields/values/:entityType/:entityId
 * Get field values for a record
 */
router.get('/values/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    const values = await dynamicFieldsService.getFieldValuesMap(entityType, entityId);

    res.json({
      success: true,
      data: values,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch field values',
      error: error.message,
    });
  }
});

/**
 * PUT /api/dynamic-fields/values/:entityType/:entityId
 * Set multiple field values for a record
 */
router.put('/values/:entityType/:entityId', async (req, res) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const userId = (req as any).user.id;
    const { entityType, entityId } = req.params;
    const { values } = req.body;

    if (!values || typeof values !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'values must be an object',
      });
    }

    const results = await dynamicFieldsService.setFieldValues(
      organizationId,
      entityType,
      entityId,
      values,
      userId
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to set field values',
    });
  }
});

/**
 * PUT /api/dynamic-fields/values/:entityType/:entityId/:fieldId
 * Set a single field value
 */
router.put('/values/:entityType/:entityId/:fieldId', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { entityType, entityId, fieldId } = req.params;
    const { value } = req.body;

    const result = await dynamicFieldsService.setFieldValue(
      fieldId,
      entityType,
      entityId,
      value,
      userId
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to set field value',
    });
  }
});

/**
 * DELETE /api/dynamic-fields/values/:entityType/:entityId/:fieldId
 * Delete a field value
 */
router.delete('/values/:entityType/:entityId/:fieldId', async (req, res) => {
  try {
    const { entityType, entityId, fieldId } = req.params;

    await dynamicFieldsService.deleteFieldValue(fieldId, entityType, entityId);

    res.json({
      success: true,
      message: 'Field value deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete field value',
      error: error.message,
    });
  }
});

/**
 * POST /api/dynamic-fields/template
 * Create fields from a template
 */
router.post('/template', authorize(['admin', 'tenant_admin']), async (req, res) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { entityType, fields } = req.body;

    if (!entityType || !Array.isArray(fields)) {
      return res.status(400).json({
        success: false,
        message: 'entityType and fields array are required',
      });
    }

    const results = await dynamicFieldsService.createFieldsFromTemplate(
      organizationId,
      entityType,
      fields
    );

    res.status(201).json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to create fields from template',
      error: error.message,
    });
  }
});

export default router;
