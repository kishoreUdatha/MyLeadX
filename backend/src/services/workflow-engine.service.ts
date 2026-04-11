import { prisma } from '../config/database';

/**
 * Get all workflows for an organization
 */
export const getWorkflows = async (organizationId: string, status?: string) => {
  return prisma.workflowDefinition.findMany({
    where: {
      organizationId,
      ...(status && { status: status as any }),
    },
    include: {
      conditions: {
        orderBy: { order: 'asc' },
      },
      actions: {
        orderBy: { order: 'asc' },
      },
      _count: {
        select: { executions: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Get a single workflow with full details
 */
export const getWorkflowById = async (workflowId: string) => {
  return prisma.workflowDefinition.findUnique({
    where: { id: workflowId },
    include: {
      conditions: {
        orderBy: { order: 'asc' },
      },
      actions: {
        orderBy: { order: 'asc' },
        include: {
          childActions: {
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  });
};

/**
 * Create a new workflow
 */
export const createWorkflow = async (
  organizationId: string,
  data: {
    name: string;
    slug?: string;
    description?: string;
    triggerType: string;
    triggerConfig?: any;
    schedule?: string;
    timezone?: string;
  }
) => {
  const slug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-');

  return prisma.workflowDefinition.create({
    data: {
      organizationId,
      name: data.name,
      slug,
      description: data.description,
      triggerType: data.triggerType as any,
      triggerConfig: data.triggerConfig,
      schedule: data.schedule,
      timezone: data.timezone,
      status: 'DRAFT',
    },
  });
};

/**
 * Update a workflow
 */
export const updateWorkflow = async (
  workflowId: string,
  data: {
    name?: string;
    description?: string;
    triggerType?: string;
    triggerConfig?: any;
    schedule?: string;
    timezone?: string;
    status?: string;
    isActive?: boolean;
  }
) => {
  return prisma.workflowDefinition.update({
    where: { id: workflowId },
    data: {
      ...data,
      triggerType: data.triggerType as any,
      status: data.status as any,
    },
  });
};

/**
 * Delete a workflow
 */
export const deleteWorkflow = async (workflowId: string) => {
  return prisma.workflowDefinition.delete({
    where: { id: workflowId },
  });
};

/**
 * Activate a workflow
 */
export const activateWorkflow = async (workflowId: string) => {
  return prisma.workflowDefinition.update({
    where: { id: workflowId },
    data: {
      status: 'ACTIVE',
      isActive: true,
    },
  });
};

/**
 * Pause a workflow
 */
export const pauseWorkflow = async (workflowId: string) => {
  return prisma.workflowDefinition.update({
    where: { id: workflowId },
    data: {
      status: 'PAUSED',
      isActive: false,
    },
  });
};

/**
 * Add a condition to a workflow
 */
export const addWorkflowCondition = async (
  workflowId: string,
  data: {
    field: string;
    operator: string;
    value: any;
    conditionGroup?: number;
    groupOperator?: string;
    order?: number;
  }
) => {
  // Get max order if not provided
  let order = data.order;
  if (order === undefined) {
    const maxOrder = await prisma.workflowCondition.aggregate({
      where: { workflowId },
      _max: { order: true },
    });
    order = (maxOrder._max.order || 0) + 1;
  }

  return prisma.workflowCondition.create({
    data: {
      workflowId,
      field: data.field,
      operator: data.operator,
      value: data.value,
      conditionGroup: data.conditionGroup || 0,
      groupOperator: data.groupOperator || 'AND',
      order,
    },
  });
};

/**
 * Update a workflow condition
 */
export const updateWorkflowCondition = async (
  conditionId: string,
  data: {
    field?: string;
    operator?: string;
    value?: any;
    conditionGroup?: number;
    groupOperator?: string;
    order?: number;
  }
) => {
  return prisma.workflowCondition.update({
    where: { id: conditionId },
    data,
  });
};

/**
 * Delete a workflow condition
 */
export const deleteWorkflowCondition = async (conditionId: string) => {
  return prisma.workflowCondition.delete({
    where: { id: conditionId },
  });
};

/**
 * Add an action to a workflow
 */
export const addWorkflowAction = async (
  workflowId: string,
  data: {
    actionType: string;
    config: any;
    order?: number;
    parentActionId?: string;
    branchCondition?: any;
    delayMinutes?: number;
    onErrorAction?: string;
    maxRetries?: number;
  }
) => {
  // Get max order if not provided
  let order = data.order;
  if (order === undefined) {
    const maxOrder = await prisma.workflowAction.aggregate({
      where: { workflowId, parentActionId: data.parentActionId || null },
      _max: { order: true },
    });
    order = (maxOrder._max.order || 0) + 1;
  }

  return prisma.workflowAction.create({
    data: {
      workflowId,
      actionType: data.actionType as any,
      config: data.config,
      order,
      parentActionId: data.parentActionId,
      branchCondition: data.branchCondition,
      delayMinutes: data.delayMinutes,
      onErrorAction: data.onErrorAction,
      maxRetries: data.maxRetries,
    },
  });
};

/**
 * Update a workflow action
 */
export const updateWorkflowAction = async (
  actionId: string,
  data: {
    actionType?: string;
    config?: any;
    order?: number;
    branchCondition?: any;
    delayMinutes?: number;
    onErrorAction?: string;
    maxRetries?: number;
  }
) => {
  return prisma.workflowAction.update({
    where: { id: actionId },
    data: {
      ...data,
      actionType: data.actionType as any,
    },
  });
};

/**
 * Delete a workflow action
 */
export const deleteWorkflowAction = async (actionId: string) => {
  return prisma.workflowAction.delete({
    where: { id: actionId },
  });
};

/**
 * Execute a workflow
 */
export const executeWorkflow = async (
  workflowId: string,
  triggeredBy: string,
  entityType?: string,
  entityId?: string,
  inputData?: any
) => {
  const workflow = await prisma.workflowDefinition.findUnique({
    where: { id: workflowId },
    include: {
      conditions: { orderBy: { order: 'asc' } },
      actions: { orderBy: { order: 'asc' } },
    },
  });

  if (!workflow || !workflow.isActive) {
    throw new Error('Workflow not found or not active');
  }

  // Create execution record
  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId,
      triggerType: workflow.triggerType,
      triggeredBy,
      entityType,
      entityId,
      status: 'running',
      inputData,
    },
  });

  // Evaluate conditions
  const conditionsMet = await evaluateConditions(workflow.conditions, inputData);

  if (!conditionsMet) {
    // Conditions not met, mark as completed
    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        outputData: { conditionsMet: false },
      },
    });
    return execution;
  }

  // Execute actions
  try {
    for (const action of workflow.actions.filter(a => !a.parentActionId)) {
      await executeAction(execution.id, action, inputData);
    }

    // Mark as completed
    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    // Update workflow stats
    await prisma.workflowDefinition.update({
      where: { id: workflowId },
      data: {
        executionCount: { increment: 1 },
        successCount: { increment: 1 },
        lastExecutedAt: new Date(),
      },
    });
  } catch (error: any) {
    // Mark as failed
    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        error: error.message,
      },
    });

    // Update failure count
    await prisma.workflowDefinition.update({
      where: { id: workflowId },
      data: {
        executionCount: { increment: 1 },
        failureCount: { increment: 1 },
        lastExecutedAt: new Date(),
      },
    });
  }

  return execution;
};

/**
 * Evaluate workflow conditions
 */
const evaluateConditions = async (
  conditions: any[],
  data: any
): Promise<boolean> => {
  if (!conditions || conditions.length === 0) {
    return true;
  }

  // Group conditions by conditionGroup
  const groups: Map<number, any[]> = new Map();
  for (const condition of conditions) {
    const group = condition.conditionGroup || 0;
    if (!groups.has(group)) {
      groups.set(group, []);
    }
    groups.get(group)!.push(condition);
  }

  // Evaluate each group (groups are AND'd together)
  for (const [, groupConditions] of groups) {
    const groupOperator = groupConditions[0]?.groupOperator || 'AND';
    const results = groupConditions.map(c => evaluateCondition(c, data));

    if (groupOperator === 'AND') {
      if (!results.every(r => r)) return false;
    } else {
      if (!results.some(r => r)) return false;
    }
  }

  return true;
};

/**
 * Evaluate a single condition
 */
const evaluateCondition = (condition: any, data: any): boolean => {
  const fieldValue = getNestedValue(data, condition.field);
  const targetValue = condition.value;

  switch (condition.operator) {
    case 'equals':
      return fieldValue === targetValue;
    case 'not_equals':
      return fieldValue !== targetValue;
    case 'greater_than':
      return Number(fieldValue) > Number(targetValue);
    case 'less_than':
      return Number(fieldValue) < Number(targetValue);
    case 'greater_than_or_equals':
      return Number(fieldValue) >= Number(targetValue);
    case 'less_than_or_equals':
      return Number(fieldValue) <= Number(targetValue);
    case 'contains':
      return String(fieldValue).includes(String(targetValue));
    case 'not_contains':
      return !String(fieldValue).includes(String(targetValue));
    case 'starts_with':
      return String(fieldValue).startsWith(String(targetValue));
    case 'ends_with':
      return String(fieldValue).endsWith(String(targetValue));
    case 'is_empty':
      return !fieldValue || fieldValue === '' || fieldValue === null;
    case 'is_not_empty':
      return fieldValue && fieldValue !== '' && fieldValue !== null;
    case 'in':
      return Array.isArray(targetValue) && targetValue.includes(fieldValue);
    case 'not_in':
      return !Array.isArray(targetValue) || !targetValue.includes(fieldValue);
    default:
      return false;
  }
};

/**
 * Get nested value from object using dot notation
 */
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
};

/**
 * Execute a workflow action
 */
const executeAction = async (
  executionId: string,
  action: any,
  data: any
): Promise<any> => {
  // Create step record
  const step = await prisma.workflowExecutionStep.create({
    data: {
      executionId,
      actionId: action.id,
      status: 'running',
      startedAt: new Date(),
    },
  });

  try {
    // Handle delay
    if (action.delayMinutes) {
      await new Promise(resolve => setTimeout(resolve, action.delayMinutes * 60000));
    }

    // Execute based on action type
    let output: any;
    switch (action.actionType) {
      case 'UPDATE_FIELD':
        output = await executeUpdateField(action.config, data);
        break;
      case 'SEND_EMAIL':
        output = await executeSendEmail(action.config, data);
        break;
      case 'SEND_SMS':
        output = await executeSendSms(action.config, data);
        break;
      case 'CREATE_TASK':
        output = await executeCreateTask(action.config, data);
        break;
      case 'ASSIGN_USER':
        output = await executeAssignUser(action.config, data);
        break;
      case 'CHANGE_STAGE':
        output = await executeChangeStage(action.config, data);
        break;
      case 'ADD_TAG':
        output = await executeAddTag(action.config, data);
        break;
      case 'WEBHOOK':
        output = await executeWebhook(action.config, data);
        break;
      case 'LOG_ACTIVITY':
        output = await executeLogActivity(action.config, data);
        break;
      case 'CREATE_NOTIFICATION':
        output = await executeCreateNotification(action.config, data);
        break;
      default:
        output = { message: 'Action type not implemented' };
    }

    // Update step as completed
    await prisma.workflowExecutionStep.update({
      where: { id: step.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        output,
      },
    });

    return output;
  } catch (error: any) {
    // Update step as failed
    await prisma.workflowExecutionStep.update({
      where: { id: step.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        error: error.message,
        retryCount: step.retryCount + 1,
      },
    });

    // Handle retry
    if (action.onErrorAction === 'retry' && step.retryCount < (action.maxRetries || 3)) {
      return executeAction(executionId, action, data);
    }

    if (action.onErrorAction === 'stop') {
      throw error;
    }

    return { error: error.message };
  }
};

// Action implementations (stubs - implement with actual logic)
const executeUpdateField = async (config: any, data: any) => {
  // TODO: Implement field update logic
  return { updated: config.field, value: config.value };
};

const executeSendEmail = async (config: any, data: any) => {
  // TODO: Implement email sending
  return { sent: true, to: config.to };
};

const executeSendSms = async (config: any, data: any) => {
  // TODO: Implement SMS sending
  return { sent: true, to: config.to };
};

const executeCreateTask = async (config: any, data: any) => {
  // TODO: Implement task creation
  return { taskCreated: true, title: config.title };
};

const executeAssignUser = async (config: any, data: any) => {
  // TODO: Implement user assignment
  return { assigned: true, userId: config.userId };
};

const executeChangeStage = async (config: any, data: any) => {
  // TODO: Implement stage change
  return { stageChanged: true, newStage: config.stageId };
};

const executeAddTag = async (config: any, data: any) => {
  // TODO: Implement tag addition
  return { tagAdded: true, tag: config.tag };
};

const executeWebhook = async (config: any, data: any) => {
  // TODO: Implement webhook call
  return { webhookCalled: true, url: config.url };
};

const executeLogActivity = async (config: any, data: any) => {
  // TODO: Implement activity logging
  return { logged: true, type: config.activityType };
};

const executeCreateNotification = async (config: any, data: any) => {
  // TODO: Implement notification creation
  return { notificationCreated: true, title: config.title };
};

/**
 * Get workflow executions
 */
export const getWorkflowExecutions = async (
  workflowId: string,
  limit: number = 50
) => {
  return prisma.workflowExecution.findMany({
    where: { workflowId },
    include: {
      steps: {
        include: { action: true },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { startedAt: 'desc' },
    take: limit,
  });
};

/**
 * Get workflow statistics
 */
export const getWorkflowStats = async (workflowId: string) => {
  const workflow = await prisma.workflowDefinition.findUnique({
    where: { id: workflowId },
  });

  if (!workflow) {
    throw new Error('Workflow not found');
  }

  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);

  const recentExecutions = await prisma.workflowExecution.groupBy({
    by: ['status'],
    where: {
      workflowId,
      startedAt: { gte: last7Days },
    },
    _count: { id: true },
  });

  const avgDuration = await prisma.workflowExecution.aggregate({
    where: {
      workflowId,
      status: 'completed',
      completedAt: { not: null },
    },
    _avg: {
      // Note: This would need a computed field for duration
    },
  });

  return {
    totalExecutions: workflow.executionCount,
    successCount: workflow.successCount,
    failureCount: workflow.failureCount,
    successRate: workflow.executionCount > 0
      ? (workflow.successCount / workflow.executionCount) * 100
      : 0,
    lastExecutedAt: workflow.lastExecutedAt,
    recentStats: recentExecutions,
  };
};

export default {
  getWorkflows,
  getWorkflowById,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  activateWorkflow,
  pauseWorkflow,
  addWorkflowCondition,
  updateWorkflowCondition,
  deleteWorkflowCondition,
  addWorkflowAction,
  updateWorkflowAction,
  deleteWorkflowAction,
  executeWorkflow,
  getWorkflowExecutions,
  getWorkflowStats,
};
