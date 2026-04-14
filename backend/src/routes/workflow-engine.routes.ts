import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import workflowService from '../services/workflow-engine.service';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/workflow-engine
 * Get all workflows for the organization
 */
router.get('/', async (req, res) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { status } = req.query;

    const workflows = await workflowService.getWorkflows(
      organizationId,
      status as string | undefined
    );

    res.json({
      success: true,
      data: workflows,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workflows',
      error: error.message,
    });
  }
});

/**
 * GET /api/workflow-engine/:id
 * Get a single workflow with details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const workflow = await workflowService.getWorkflowById(id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found',
      });
    }

    res.json({
      success: true,
      data: workflow,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workflow',
      error: error.message,
    });
  }
});

/**
 * POST /api/workflow-engine
 * Create a new workflow
 */
router.post('/', authorize(['admin', 'tenant_admin']), async (req, res) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { name, slug, description, triggerType, triggerConfig, schedule, timezone } = req.body;

    if (!name || !triggerType) {
      return res.status(400).json({
        success: false,
        message: 'name and triggerType are required',
      });
    }

    const workflow = await workflowService.createWorkflow(organizationId, {
      name,
      slug,
      description,
      triggerType,
      triggerConfig,
      schedule,
      timezone,
    });

    res.status(201).json({
      success: true,
      data: workflow,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to create workflow',
      error: error.message,
    });
  }
});

/**
 * PUT /api/workflow-engine/:id
 * Update a workflow
 */
router.put('/:id', authorize(['admin', 'tenant_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const workflow = await workflowService.updateWorkflow(id, data);

    res.json({
      success: true,
      data: workflow,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update workflow',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/workflow-engine/:id
 * Delete a workflow
 */
router.delete('/:id', authorize(['admin', 'tenant_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    await workflowService.deleteWorkflow(id);

    res.json({
      success: true,
      message: 'Workflow deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete workflow',
      error: error.message,
    });
  }
});

/**
 * POST /api/workflow-engine/:id/activate
 * Activate a workflow
 */
router.post('/:id/activate', authorize(['admin', 'tenant_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const workflow = await workflowService.activateWorkflow(id);

    res.json({
      success: true,
      data: workflow,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to activate workflow',
      error: error.message,
    });
  }
});

/**
 * POST /api/workflow-engine/:id/pause
 * Pause a workflow
 */
router.post('/:id/pause', authorize(['admin', 'tenant_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const workflow = await workflowService.pauseWorkflow(id);

    res.json({
      success: true,
      data: workflow,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to pause workflow',
      error: error.message,
    });
  }
});

/**
 * GET /api/workflow-engine/:id/stats
 * Get workflow statistics
 */
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const stats = await workflowService.getWorkflowStats(id);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workflow stats',
      error: error.message,
    });
  }
});

/**
 * GET /api/workflow-engine/:id/executions
 * Get workflow executions
 */
router.get('/:id/executions', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit } = req.query;

    const executions = await workflowService.getWorkflowExecutions(
      id,
      limit ? parseInt(limit as string) : 50
    );

    res.json({
      success: true,
      data: executions,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch executions',
      error: error.message,
    });
  }
});

/**
 * POST /api/workflow-engine/:id/execute
 * Manually execute a workflow
 */
router.post('/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const { entityType, entityId, inputData } = req.body;
    const userId = (req as any).user.id;

    const execution = await workflowService.executeWorkflow(
      id,
      userId,
      entityType,
      entityId,
      inputData
    );

    res.json({
      success: true,
      data: execution,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to execute workflow',
    });
  }
});

// ============ Condition Routes ============

/**
 * POST /api/workflow-engine/:id/conditions
 * Add a condition to a workflow
 */
router.post('/:id/conditions', authorize(['admin', 'tenant_admin']), async (req, res) => {
  try {
    const { id: workflowId } = req.params;
    const data = req.body;

    if (!data.field || !data.operator) {
      return res.status(400).json({
        success: false,
        message: 'field and operator are required',
      });
    }

    const condition = await workflowService.addWorkflowCondition(workflowId, data);

    res.status(201).json({
      success: true,
      data: condition,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to add condition',
      error: error.message,
    });
  }
});

/**
 * PUT /api/workflow-engine/conditions/:conditionId
 * Update a workflow condition
 */
router.put('/conditions/:conditionId', authorize(['admin', 'tenant_admin']), async (req, res) => {
  try {
    const { conditionId } = req.params;
    const data = req.body;

    const condition = await workflowService.updateWorkflowCondition(conditionId, data);

    res.json({
      success: true,
      data: condition,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update condition',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/workflow-engine/conditions/:conditionId
 * Delete a workflow condition
 */
router.delete('/conditions/:conditionId', authorize(['admin', 'tenant_admin']), async (req, res) => {
  try {
    const { conditionId } = req.params;
    await workflowService.deleteWorkflowCondition(conditionId);

    res.json({
      success: true,
      message: 'Condition deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete condition',
      error: error.message,
    });
  }
});

// ============ Action Routes ============

/**
 * POST /api/workflow-engine/:id/actions
 * Add an action to a workflow
 */
router.post('/:id/actions', authorize(['admin', 'tenant_admin']), async (req, res) => {
  try {
    const { id: workflowId } = req.params;
    const data = req.body;

    if (!data.actionType || !data.config) {
      return res.status(400).json({
        success: false,
        message: 'actionType and config are required',
      });
    }

    const action = await workflowService.addWorkflowAction(workflowId, data);

    res.status(201).json({
      success: true,
      data: action,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to add action',
      error: error.message,
    });
  }
});

/**
 * PUT /api/workflow-engine/actions/:actionId
 * Update a workflow action
 */
router.put('/actions/:actionId', authorize(['admin', 'tenant_admin']), async (req, res) => {
  try {
    const { actionId } = req.params;
    const data = req.body;

    const action = await workflowService.updateWorkflowAction(actionId, data);

    res.json({
      success: true,
      data: action,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update action',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/workflow-engine/actions/:actionId
 * Delete a workflow action
 */
router.delete('/actions/:actionId', authorize(['admin', 'tenant_admin']), async (req, res) => {
  try {
    const { actionId } = req.params;
    await workflowService.deleteWorkflowAction(actionId);

    res.json({
      success: true,
      message: 'Action deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete action',
      error: error.message,
    });
  }
});

export default router;
