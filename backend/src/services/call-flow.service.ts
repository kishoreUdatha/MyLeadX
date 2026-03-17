/**
 * Call Flow Service
 * Manages structured call flows for voice agents
 */

import { PrismaClient, CallOutcome } from '@prisma/client';

const prisma = new PrismaClient();

// Node Types
export interface CallFlowNode {
  id: string;
  type: 'START' | 'GREETING' | 'QUESTION' | 'CONDITION' | 'AI_RESPONSE' | 'ACTION' | 'TRANSFER' | 'END';
  position: { x: number; y: number };
  data: {
    label: string;
    message?: string;           // For GREETING, AI_RESPONSE, END
    question?: string;          // For QUESTION
    variableName?: string;      // Variable to store response
    variableType?: 'text' | 'number' | 'email' | 'phone' | 'date' | 'boolean' | 'choice';
    choices?: string[];         // For choice type questions
    required?: boolean;
    validation?: string;        // Validation regex
    condition?: {               // For CONDITION node
      variable: string;
      operator: 'equals' | 'contains' | 'greater' | 'less' | 'exists' | 'not_exists';
      value: string;
    };
    actionType?: string;        // For ACTION node
    actionConfig?: Record<string, any>;
    transferNumber?: string;    // For TRANSFER node
    transferMessage?: string;
    outcomeType?: CallOutcome;  // For END node
    aiPrompt?: string;          // For AI_RESPONSE - dynamic AI response
    maxRetries?: number;        // Retry count for questions
    retryMessage?: string;
  };
}

export interface CallFlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;  // For condition branches: 'true' or 'false'
  label?: string;
}

export interface CreateCallFlowInput {
  name: string;
  description?: string;
  industry?: string;
  nodes: CallFlowNode[];
  edges: CallFlowEdge[];
  variables?: Array<{ name: string; type: string; defaultValue?: string }>;
  defaultGreeting?: string;
  defaultFallback?: string;
  defaultTransfer?: string;
  defaultEnd?: string;
  successOutcomes?: CallOutcome[];
  failureOutcomes?: CallOutcome[];
}

class CallFlowService {
  /**
   * Create a new call flow
   */
  async createCallFlow(organizationId: string, userId: string, input: CreateCallFlowInput) {
    return prisma.callFlow.create({
      data: {
        organizationId,
        createdById: userId,
        name: input.name,
        description: input.description,
        industry: input.industry,
        nodes: input.nodes as any,
        edges: input.edges as any,
        variables: input.variables || [],
        defaultGreeting: input.defaultGreeting,
        defaultFallback: input.defaultFallback,
        defaultTransfer: input.defaultTransfer,
        defaultEnd: input.defaultEnd,
        successOutcomes: input.successOutcomes || ['INTERESTED', 'APPOINTMENT_BOOKED', 'PAYMENT_COLLECTED'],
        failureOutcomes: input.failureOutcomes || ['NOT_INTERESTED', 'WRONG_NUMBER', 'DNC_REQUESTED'],
      },
    });
  }

  /**
   * Get all call flows for an organization
   */
  async getCallFlows(organizationId: string) {
    return prisma.callFlow.findMany({
      where: { organizationId },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
        _count: {
          select: { voiceAgents: true, callLogs: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Get a single call flow by ID
   */
  async getCallFlow(id: string, organizationId: string) {
    return prisma.callFlow.findFirst({
      where: { id, organizationId },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
        voiceAgents: {
          select: { id: true, name: true },
        },
      },
    });
  }

  /**
   * Update a call flow
   */
  async updateCallFlow(id: string, organizationId: string, input: Partial<CreateCallFlowInput>) {
    const callFlow = await prisma.callFlow.findFirst({
      where: { id, organizationId },
    });

    if (!callFlow) {
      throw new Error('Call flow not found');
    }

    return prisma.callFlow.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        industry: input.industry,
        nodes: input.nodes as any,
        edges: input.edges as any,
        variables: input.variables,
        defaultGreeting: input.defaultGreeting,
        defaultFallback: input.defaultFallback,
        defaultTransfer: input.defaultTransfer,
        defaultEnd: input.defaultEnd,
        successOutcomes: input.successOutcomes,
        failureOutcomes: input.failureOutcomes,
        version: { increment: 1 },
      },
    });
  }

  /**
   * Delete a call flow
   */
  async deleteCallFlow(id: string, organizationId: string) {
    const callFlow = await prisma.callFlow.findFirst({
      where: { id, organizationId },
      include: { voiceAgents: true },
    });

    if (!callFlow) {
      throw new Error('Call flow not found');
    }

    if (callFlow.voiceAgents.length > 0) {
      throw new Error('Cannot delete call flow that is assigned to agents');
    }

    return prisma.callFlow.delete({ where: { id } });
  }

  /**
   * Duplicate a call flow
   */
  async duplicateCallFlow(id: string, organizationId: string, userId: string, newName?: string) {
    const original = await prisma.callFlow.findFirst({
      where: { id, organizationId },
    });

    if (!original) {
      throw new Error('Call flow not found');
    }

    return prisma.callFlow.create({
      data: {
        organizationId,
        createdById: userId,
        name: newName || `${original.name} (Copy)`,
        description: original.description,
        industry: original.industry,
        nodes: original.nodes as any,
        edges: original.edges as any,
        variables: original.variables as any,
        defaultGreeting: original.defaultGreeting,
        defaultFallback: original.defaultFallback,
        defaultTransfer: original.defaultTransfer,
        defaultEnd: original.defaultEnd,
        successOutcomes: original.successOutcomes as any,
        failureOutcomes: original.failureOutcomes as any,
      },
    });
  }

  /**
   * Assign call flow to voice agent
   */
  async assignToAgent(callFlowId: string, agentId: string, organizationId: string) {
    // Verify both belong to same org
    const [callFlow, agent] = await Promise.all([
      prisma.callFlow.findFirst({ where: { id: callFlowId, organizationId } }),
      prisma.voiceAgent.findFirst({ where: { id: agentId, organizationId } }),
    ]);

    if (!callFlow || !agent) {
      throw new Error('Call flow or agent not found');
    }

    return prisma.voiceAgent.update({
      where: { id: agentId },
      data: { callFlowId },
    });
  }

  /**
   * Get call flow templates (system-wide or organization templates)
   */
  async getTemplates(organizationId?: string) {
    return prisma.callFlow.findMany({
      where: {
        isTemplate: true,
        OR: [
          { organizationId: organizationId },
          // System templates would have a specific org ID or null
        ],
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Create flow from template
   */
  async createFromTemplate(templateId: string, organizationId: string, userId: string, name: string) {
    const template = await prisma.callFlow.findFirst({
      where: { id: templateId, isTemplate: true },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    return prisma.callFlow.create({
      data: {
        organizationId,
        createdById: userId,
        name,
        description: template.description,
        industry: template.industry,
        nodes: template.nodes as any,
        edges: template.edges as any,
        variables: template.variables as any,
        defaultGreeting: template.defaultGreeting,
        defaultFallback: template.defaultFallback,
        defaultTransfer: template.defaultTransfer,
        defaultEnd: template.defaultEnd,
        successOutcomes: template.successOutcomes as any,
        failureOutcomes: template.failureOutcomes as any,
        isTemplate: false,
      },
    });
  }

  /**
   * Log a call flow execution
   */
  async logExecution(
    callFlowId: string,
    data: {
      sessionId?: string;
      leadId?: string;
      phoneNumber: string;
      direction?: string;
      nodesVisited?: string[];
      variablesCollected?: Record<string, any>;
      outcome?: CallOutcome;
      outcomeReason?: string;
      sentiment?: string;
      transcript?: Array<{ role: string; content: string; timestamp: Date }>;
      summary?: string;
      actionsTaken?: Array<{ type: string; data: any; timestamp: Date }>;
      duration?: number;
    }
  ) {
    return prisma.callFlowLog.create({
      data: {
        callFlowId,
        sessionId: data.sessionId,
        leadId: data.leadId,
        phoneNumber: data.phoneNumber,
        direction: data.direction || 'outbound',
        nodesVisited: data.nodesVisited || [],
        variablesCollected: data.variablesCollected || {},
        outcome: data.outcome,
        outcomeReason: data.outcomeReason,
        sentiment: data.sentiment,
        transcript: data.transcript || [],
        summary: data.summary,
        actionsTaken: data.actionsTaken || [],
        duration: data.duration,
        endedAt: new Date(),
      },
    });
  }

  /**
   * Get flow analytics
   */
  async getAnalytics(callFlowId: string, organizationId: string, dateRange?: { start: Date; end: Date }) {
    const flow = await prisma.callFlow.findFirst({
      where: { id: callFlowId, organizationId },
    });

    if (!flow) {
      throw new Error('Call flow not found');
    }

    const where: any = { callFlowId };
    if (dateRange) {
      where.startedAt = {
        gte: dateRange.start,
        lte: dateRange.end,
      };
    }

    const logs = await prisma.callFlowLog.findMany({
      where,
      select: {
        outcome: true,
        duration: true,
        sentiment: true,
        qualityScore: true,
      },
    });

    const totalCalls = logs.length;
    const outcomes = logs.reduce((acc, log) => {
      if (log.outcome) {
        acc[log.outcome] = (acc[log.outcome] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const successOutcomes = (flow.successOutcomes as string[]) || [];
    const successfulCalls = logs.filter(l => l.outcome && successOutcomes.includes(l.outcome)).length;

    const avgDuration = logs.reduce((sum, l) => sum + (l.duration || 0), 0) / (totalCalls || 1);
    const avgQuality = logs.reduce((sum, l) => sum + (l.qualityScore || 0), 0) / (totalCalls || 1);

    const sentiments = logs.reduce((acc, log) => {
      if (log.sentiment) {
        acc[log.sentiment] = (acc[log.sentiment] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      totalCalls,
      successfulCalls,
      conversionRate: totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0,
      avgDuration: Math.round(avgDuration),
      avgQualityScore: Math.round(avgQuality * 10) / 10,
      outcomes,
      sentiments,
    };
  }
}

// ==================== CALL FLOW EXECUTION ENGINE ====================

/**
 * Execution context for tracking call flow state during a call
 */
export interface CallFlowExecutionContext {
  callFlowId: string;
  sessionId: string;
  currentNodeId: string;
  visitedNodes: string[];
  variables: Record<string, any>;
  transcript: Array<{ role: string; content: string; timestamp: Date; nodeId?: string }>;
  startedAt: Date;
  lastNodeAt: Date;
  retryCount: number;
  maxRetries: number;
  outcome?: CallOutcome;
  shouldTransfer: boolean;
  transferConfig?: any;
  shouldEnd: boolean;
  endMessage?: string;
}

/**
 * Result from processing a node
 */
export interface NodeProcessingResult {
  response?: string;
  nextNodeId?: string;
  shouldWaitForInput: boolean;
  shouldEnd: boolean;
  shouldTransfer: boolean;
  transferConfig?: any;
  outcome?: CallOutcome;
  variableCollected?: { name: string; value: any };
  action?: { type: string; data: any };
}

class CallFlowExecutor {
  private prisma: typeof prisma;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * Initialize a new execution context for a call flow
   */
  async initializeExecution(callFlowId: string, sessionId: string, initialVariables?: Record<string, any>): Promise<CallFlowExecutionContext> {
    const callFlow = await this.prisma.callFlow.findUnique({
      where: { id: callFlowId },
    });

    if (!callFlow) {
      throw new Error('Call flow not found');
    }

    const nodes = callFlow.nodes as CallFlowNode[];
    const startNode = nodes.find(n => n.type === 'START');

    if (!startNode) {
      throw new Error('Call flow has no START node');
    }

    return {
      callFlowId,
      sessionId,
      currentNodeId: startNode.id,
      visitedNodes: [startNode.id],
      variables: initialVariables || {},
      transcript: [],
      startedAt: new Date(),
      lastNodeAt: new Date(),
      retryCount: 0,
      maxRetries: 3,
      shouldTransfer: false,
      shouldEnd: false,
    };
  }

  /**
   * Process the current node and determine next action
   */
  async processCurrentNode(context: CallFlowExecutionContext, userInput?: string): Promise<NodeProcessingResult> {
    const callFlow = await this.prisma.callFlow.findUnique({
      where: { id: context.callFlowId },
    });

    if (!callFlow) {
      throw new Error('Call flow not found');
    }

    const nodes = callFlow.nodes as CallFlowNode[];
    const edges = callFlow.edges as CallFlowEdge[];
    const currentNode = nodes.find(n => n.id === context.currentNodeId);

    if (!currentNode) {
      throw new Error(`Node ${context.currentNodeId} not found in call flow`);
    }

    context.lastNodeAt = new Date();

    // Process based on node type
    switch (currentNode.type) {
      case 'START':
        return this.processStartNode(context, currentNode, edges);

      case 'GREETING':
        return this.processGreetingNode(context, currentNode, edges);

      case 'QUESTION':
        return this.processQuestionNode(context, currentNode, edges, userInput);

      case 'CONDITION':
        return this.processConditionNode(context, currentNode, edges);

      case 'AI_RESPONSE':
        return this.processAIResponseNode(context, currentNode, edges, userInput);

      case 'ACTION':
        return this.processActionNode(context, currentNode, edges);

      case 'TRANSFER':
        return this.processTransferNode(context, currentNode);

      case 'END':
        return this.processEndNode(context, currentNode);

      default:
        throw new Error(`Unknown node type: ${currentNode.type}`);
    }
  }

  /**
   * Process START node - just move to next
   */
  private processStartNode(context: CallFlowExecutionContext, node: CallFlowNode, edges: CallFlowEdge[]): NodeProcessingResult {
    const nextNodeId = this.getNextNodeId(node.id, edges);
    if (nextNodeId) {
      context.currentNodeId = nextNodeId;
      context.visitedNodes.push(nextNodeId);
    }
    return {
      shouldWaitForInput: false,
      shouldEnd: !nextNodeId,
      shouldTransfer: false,
      nextNodeId,
    };
  }

  /**
   * Process GREETING node - return greeting message and move to next
   */
  private processGreetingNode(context: CallFlowExecutionContext, node: CallFlowNode, edges: CallFlowEdge[]): NodeProcessingResult {
    const message = this.parseVariables(node.data.message || node.data.label, context.variables);

    context.transcript.push({
      role: 'assistant',
      content: message,
      timestamp: new Date(),
      nodeId: node.id,
    });

    const nextNodeId = this.getNextNodeId(node.id, edges);
    if (nextNodeId) {
      context.currentNodeId = nextNodeId;
      context.visitedNodes.push(nextNodeId);
    }

    return {
      response: message,
      nextNodeId,
      shouldWaitForInput: false,
      shouldEnd: !nextNodeId,
      shouldTransfer: false,
    };
  }

  /**
   * Process QUESTION node - ask question and wait for input, or process input
   */
  private processQuestionNode(
    context: CallFlowExecutionContext,
    node: CallFlowNode,
    edges: CallFlowEdge[],
    userInput?: string
  ): NodeProcessingResult {
    // If no user input, ask the question
    if (!userInput) {
      const question = this.parseVariables(node.data.question || node.data.label, context.variables);

      context.transcript.push({
        role: 'assistant',
        content: question,
        timestamp: new Date(),
        nodeId: node.id,
      });

      return {
        response: question,
        shouldWaitForInput: true,
        shouldEnd: false,
        shouldTransfer: false,
      };
    }

    // Process user input
    context.transcript.push({
      role: 'user',
      content: userInput,
      timestamp: new Date(),
      nodeId: node.id,
    });

    // Validate input if validation is specified
    if (node.data.validation) {
      const regex = new RegExp(node.data.validation);
      if (!regex.test(userInput)) {
        context.retryCount++;
        if (context.retryCount >= (node.data.maxRetries || context.maxRetries)) {
          // Max retries exceeded, move to next with empty value
          const nextNodeId = this.getNextNodeId(node.id, edges);
          if (nextNodeId) {
            context.currentNodeId = nextNodeId;
            context.visitedNodes.push(nextNodeId);
          }
          return {
            response: node.data.retryMessage || "Let's continue with the next question.",
            nextNodeId,
            shouldWaitForInput: false,
            shouldEnd: !nextNodeId,
            shouldTransfer: false,
          };
        }
        return {
          response: node.data.retryMessage || "I didn't quite catch that. Could you please try again?",
          shouldWaitForInput: true,
          shouldEnd: false,
          shouldTransfer: false,
        };
      }
    }

    // Store variable
    let variableCollected: { name: string; value: any } | undefined;
    if (node.data.variableName) {
      let value: any = userInput;

      // Type conversion based on variableType
      switch (node.data.variableType) {
        case 'number':
          value = parseFloat(userInput.replace(/[^0-9.-]/g, '')) || 0;
          break;
        case 'boolean':
          value = /^(yes|yeah|yep|sure|ok|okay|true|1|haan|ha)$/i.test(userInput.trim());
          break;
        case 'email':
          const emailMatch = userInput.match(/[\w.-]+@[\w.-]+\.\w+/);
          value = emailMatch ? emailMatch[0] : userInput;
          break;
        case 'phone':
          value = userInput.replace(/[^0-9+]/g, '');
          break;
        case 'date':
          value = new Date(userInput).toISOString();
          break;
        case 'choice':
          // Match against choices if provided
          if (node.data.choices) {
            const matchedChoice = node.data.choices.find(
              (c: string) => c.toLowerCase() === userInput.toLowerCase()
            );
            value = matchedChoice || userInput;
          }
          break;
        default:
          value = userInput.trim();
      }

      context.variables[node.data.variableName] = value;
      variableCollected = { name: node.data.variableName, value };
    }

    // Reset retry count and move to next
    context.retryCount = 0;
    const nextNodeId = this.getNextNodeId(node.id, edges);
    if (nextNodeId) {
      context.currentNodeId = nextNodeId;
      context.visitedNodes.push(nextNodeId);
    }

    return {
      nextNodeId,
      shouldWaitForInput: false,
      shouldEnd: !nextNodeId,
      shouldTransfer: false,
      variableCollected,
    };
  }

  /**
   * Process CONDITION node - evaluate condition and branch accordingly
   */
  private processConditionNode(context: CallFlowExecutionContext, node: CallFlowNode, edges: CallFlowEdge[]): NodeProcessingResult {
    const condition = node.data.condition;
    if (!condition) {
      // No condition, go to default (first edge)
      const nextNodeId = this.getNextNodeId(node.id, edges);
      if (nextNodeId) {
        context.currentNodeId = nextNodeId;
        context.visitedNodes.push(nextNodeId);
      }
      return {
        nextNodeId,
        shouldWaitForInput: false,
        shouldEnd: !nextNodeId,
        shouldTransfer: false,
      };
    }

    const result = this.evaluateCondition(condition, context.variables);

    // Find the appropriate edge based on condition result
    const trueEdge = edges.find(e => e.source === node.id && e.sourceHandle === 'true');
    const falseEdge = edges.find(e => e.source === node.id && e.sourceHandle === 'false');
    const defaultEdge = edges.find(e => e.source === node.id && !e.sourceHandle);

    let nextNodeId: string | undefined;
    if (result && trueEdge) {
      nextNodeId = trueEdge.target;
    } else if (!result && falseEdge) {
      nextNodeId = falseEdge.target;
    } else if (defaultEdge) {
      nextNodeId = defaultEdge.target;
    }

    if (nextNodeId) {
      context.currentNodeId = nextNodeId;
      context.visitedNodes.push(nextNodeId);
    }

    return {
      nextNodeId,
      shouldWaitForInput: false,
      shouldEnd: !nextNodeId,
      shouldTransfer: false,
    };
  }

  /**
   * Evaluate a condition against collected variables
   */
  private evaluateCondition(condition: { variable: string; operator: string; value: string }, variables: Record<string, any>): boolean {
    const actualValue = variables[condition.variable];
    const expectedValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return String(actualValue).toLowerCase() === String(expectedValue).toLowerCase();
      case 'contains':
        return String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase());
      case 'greater':
        return parseFloat(actualValue) > parseFloat(expectedValue);
      case 'less':
        return parseFloat(actualValue) < parseFloat(expectedValue);
      case 'exists':
        return actualValue !== undefined && actualValue !== null && actualValue !== '';
      case 'not_exists':
        return actualValue === undefined || actualValue === null || actualValue === '';
      default:
        return false;
    }
  }

  /**
   * Process AI_RESPONSE node - generate dynamic AI response
   */
  private async processAIResponseNode(
    context: CallFlowExecutionContext,
    node: CallFlowNode,
    edges: CallFlowEdge[],
    userInput?: string
  ): Promise<NodeProcessingResult> {
    // For AI response, we need to generate a response using the AI prompt
    const prompt = this.parseVariables(node.data.aiPrompt || node.data.message || node.data.label, context.variables);

    // If there's user input, include it in transcript
    if (userInput) {
      context.transcript.push({
        role: 'user',
        content: userInput,
        timestamp: new Date(),
        nodeId: node.id,
      });
    }

    // The actual AI response will be generated by the calling service
    // Here we just provide the prompt
    context.transcript.push({
      role: 'assistant',
      content: prompt,
      timestamp: new Date(),
      nodeId: node.id,
    });

    const nextNodeId = this.getNextNodeId(node.id, edges);
    if (nextNodeId) {
      context.currentNodeId = nextNodeId;
      context.visitedNodes.push(nextNodeId);
    }

    return {
      response: prompt,
      nextNodeId,
      shouldWaitForInput: true, // Wait for user response after AI speaks
      shouldEnd: false,
      shouldTransfer: false,
    };
  }

  /**
   * Process ACTION node - execute an action and continue
   */
  private async processActionNode(context: CallFlowExecutionContext, node: CallFlowNode, edges: CallFlowEdge[]): Promise<NodeProcessingResult> {
    const actionType = node.data.actionType;
    const actionConfig = node.data.actionConfig || {};

    // Execute action based on type
    let actionResult: any = null;

    switch (actionType) {
      case 'webhook':
        // Trigger webhook with collected variables
        actionResult = { type: 'webhook', url: actionConfig.url, data: context.variables };
        break;
      case 'create_lead':
        // Mark for lead creation
        actionResult = { type: 'create_lead', data: context.variables };
        break;
      case 'send_sms':
        // Queue SMS
        actionResult = { type: 'send_sms', phone: context.variables.phone, message: actionConfig.message };
        break;
      case 'send_whatsapp':
        // Queue WhatsApp message
        actionResult = { type: 'send_whatsapp', phone: context.variables.phone, message: actionConfig.message };
        break;
      case 'schedule_callback':
        // Schedule callback
        actionResult = { type: 'schedule_callback', data: context.variables };
        break;
      default:
        console.warn(`Unknown action type: ${actionType}`);
    }

    const nextNodeId = this.getNextNodeId(node.id, edges);
    if (nextNodeId) {
      context.currentNodeId = nextNodeId;
      context.visitedNodes.push(nextNodeId);
    }

    return {
      nextNodeId,
      shouldWaitForInput: false,
      shouldEnd: !nextNodeId,
      shouldTransfer: false,
      action: actionResult,
    };
  }

  /**
   * Process TRANSFER node - initiate transfer to human agent
   */
  private processTransferNode(context: CallFlowExecutionContext, node: CallFlowNode): NodeProcessingResult {
    const message = this.parseVariables(node.data.transferMessage || node.data.message || "Please hold while I transfer you.", context.variables);

    context.transcript.push({
      role: 'assistant',
      content: message,
      timestamp: new Date(),
      nodeId: node.id,
    });

    context.shouldTransfer = true;
    context.transferConfig = {
      transferNumber: node.data.transferNumber,
      message,
    };

    return {
      response: message,
      shouldWaitForInput: false,
      shouldEnd: false,
      shouldTransfer: true,
      transferConfig: context.transferConfig,
    };
  }

  /**
   * Process END node - end the call with outcome
   */
  private processEndNode(context: CallFlowExecutionContext, node: CallFlowNode): NodeProcessingResult {
    const message = this.parseVariables(node.data.message || node.data.label || "Thank you for your time. Goodbye!", context.variables);

    context.transcript.push({
      role: 'assistant',
      content: message,
      timestamp: new Date(),
      nodeId: node.id,
    });

    context.shouldEnd = true;
    context.endMessage = message;
    context.outcome = node.data.outcomeType || 'NEEDS_FOLLOWUP';

    return {
      response: message,
      shouldWaitForInput: false,
      shouldEnd: true,
      shouldTransfer: false,
      outcome: context.outcome,
    };
  }

  /**
   * Get the next node ID from edges
   */
  private getNextNodeId(currentNodeId: string, edges: CallFlowEdge[]): string | undefined {
    const edge = edges.find(e => e.source === currentNodeId && !e.sourceHandle);
    return edge?.target;
  }

  /**
   * Parse variables in a text string
   */
  private parseVariables(text: string, variables: Record<string, any>): string {
    if (!text) return '';

    return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return variables[varName] !== undefined ? String(variables[varName]) : match;
    });
  }

  /**
   * Run the call flow to completion (for testing)
   */
  async executeFlowTest(
    callFlowId: string,
    simulatedInputs: string[],
    initialVariables?: Record<string, any>
  ): Promise<{
    transcript: Array<{ role: string; content: string }>;
    variables: Record<string, any>;
    outcome?: CallOutcome;
    visitedNodes: string[];
  }> {
    const context = await this.initializeExecution(callFlowId, 'test-' + Date.now(), initialVariables);
    let inputIndex = 0;
    let iterations = 0;
    const maxIterations = 100; // Prevent infinite loops

    while (!context.shouldEnd && !context.shouldTransfer && iterations < maxIterations) {
      iterations++;
      const result = await this.processCurrentNode(context);

      if (result.shouldWaitForInput && inputIndex < simulatedInputs.length) {
        // Process with simulated input
        const input = simulatedInputs[inputIndex++];
        const inputResult = await this.processCurrentNode(context, input);

        if (inputResult.shouldEnd) break;
        if (inputResult.shouldTransfer) break;
      } else if (result.shouldWaitForInput) {
        // No more inputs, end test
        break;
      }

      if (result.shouldEnd || result.shouldTransfer) break;
      if (!result.nextNodeId && !result.shouldWaitForInput) break;
    }

    return {
      transcript: context.transcript.map(t => ({ role: t.role, content: t.content })),
      variables: context.variables,
      outcome: context.outcome,
      visitedNodes: context.visitedNodes,
    };
  }
}

// Create singleton executor
const callFlowExecutor = new CallFlowExecutor();

// Add execution methods to CallFlowService
Object.assign(CallFlowService.prototype, {
  /**
   * Initialize execution context for a call
   */
  async initializeExecution(callFlowId: string, sessionId: string, initialVariables?: Record<string, any>) {
    return callFlowExecutor.initializeExecution(callFlowId, sessionId, initialVariables);
  },

  /**
   * Process the current node in the execution context
   */
  async processNode(context: CallFlowExecutionContext, userInput?: string) {
    return callFlowExecutor.processCurrentNode(context, userInput);
  },

  /**
   * Test execute a call flow with simulated inputs
   */
  async executeFlowTest(callFlowId: string, simulatedInputs: string[], initialVariables?: Record<string, any>) {
    return callFlowExecutor.executeFlowTest(callFlowId, simulatedInputs, initialVariables);
  },
});

export { callFlowExecutor };
export const callFlowService = new CallFlowService();
export default callFlowService;
