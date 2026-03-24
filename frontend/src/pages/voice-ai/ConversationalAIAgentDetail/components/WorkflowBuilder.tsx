/**
 * n8n-Style Workflow Builder
 * Authentic n8n look and feel using React Flow
 */

import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  NodeProps,
  BackgroundVariant,
  getBezierPath,
  EdgeProps,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Plus,
  Trash2,
  MessageSquare,
  GitBranch,
  Database,
  Zap,
  X,
  Play,
  Square,
  Bot,
  Mail,
  Clock,
  Search,
  Webhook,
  Code,
  FileText,
  Send,
  Globe,
  Settings,
  CheckCircle,
  AlertCircle,
  Key,
  Lock,
  Link,
  RefreshCw,
  Shield,
  Timer,
  Eye,
  EyeOff,
  User,
  Hash,
  Check,
  ExternalLink,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Undo2,
  MousePointer2,
  SplitSquareHorizontal,
  Sparkles,
  Box,
} from 'lucide-react';

// n8n color palette - Light theme
const N8N_COLORS = {
  canvas: '#fafafa',
  canvasDots: '#d4d4d4',
  nodeBackground: '#ffffff',
  nodeBorder: '#e5e5e5',
  nodeSelected: '#ff6d5a',
  nodeHover: '#f5f5f5',
  panelBg: '#ffffff',
  panelBorder: '#e5e5e5',
  inputBg: '#f5f5f5',
  inputBorder: '#d4d4d4',
  text: '#171717',
  textMuted: '#737373',
  accent: '#ff6d5a',
  success: '#10b981',
  warning: '#f59e0b',
  info: '#3b82f6',
  danger: '#ef4444',
};

// HTTP Methods with colors
const HTTP_METHODS = [
  { method: 'GET', color: '#059669', bgColor: '#d1fae5' },
  { method: 'POST', color: '#2563eb', bgColor: '#dbeafe' },
  { method: 'PUT', color: '#d97706', bgColor: '#fef3c7' },
  { method: 'PATCH', color: '#7c3aed', bgColor: '#ede9fe' },
  { method: 'DELETE', color: '#dc2626', bgColor: '#fee2e2' },
  { method: 'HEAD', color: '#0891b2', bgColor: '#cffafe' },
  { method: 'OPTIONS', color: '#4b5563', bgColor: '#f3f4f6' },
  { method: 'CONNECT', color: '#be185d', bgColor: '#fce7f3' },
];

// Node type configurations - n8n style with light backgrounds
const NODE_CONFIGS: Record<string, { name: string; description: string; icon: any; color: string; bgColor: string }> = {
  trigger: { name: 'When clicking "Test workflow"', description: 'Runs the workflow', icon: Play, color: '#ff6d5a', bgColor: '#fff5f3' },
  webhook: { name: 'Webhook', description: 'Starts workflow on webhook call', icon: Webhook, color: '#9b59b6', bgColor: '#f9f5fc' },
  chat: { name: 'Chat Trigger', description: 'On new chat message', icon: MessageSquare, color: '#3498db', bgColor: '#f0f7ff' },
  ai: { name: 'AI Agent', description: 'AI-powered responses', icon: Bot, color: '#ff6d5a', bgColor: '#fff5f3' },
  openai: { name: 'OpenAI', description: 'GPT models', icon: Zap, color: '#10a37f', bgColor: '#f0fdf4' },
  message: { name: 'Send Message', description: 'Send a response', icon: Send, color: '#3498db', bgColor: '#f0f7ff' },
  condition: { name: 'If', description: 'Conditional logic', icon: GitBranch, color: '#f39c12', bgColor: '#fffbeb' },
  switch: { name: 'Switch', description: 'Multiple conditions', icon: GitBranch, color: '#e67e22', bgColor: '#fff7ed' },
  code: { name: 'Code', description: 'Custom JavaScript', icon: Code, color: '#27ae60', bgColor: '#f0fdf4' },
  http: { name: 'HTTP Request', description: 'Make API calls', icon: Globe, color: '#9b59b6', bgColor: '#f9f5fc' },
  set: { name: 'Set', description: 'Set field values', icon: Database, color: '#16a085', bgColor: '#f0fdfa' },
  function: { name: 'Function', description: 'Transform data', icon: Code, color: '#2ecc71', bgColor: '#f0fdf4' },
  email: { name: 'Send Email', description: 'Email notification', icon: Mail, color: '#e74c3c', bgColor: '#fef2f2' },
  wait: { name: 'Wait', description: 'Delay execution', icon: Clock, color: '#6b7280', bgColor: '#f9fafb' },
  respond: { name: 'Respond to Webhook', description: 'Send response', icon: Send, color: '#9b59b6', bgColor: '#f9f5fc' },
  end: { name: 'Stop and Error', description: 'End workflow', icon: Square, color: '#e74c3c', bgColor: '#fef2f2' },
  noOp: { name: 'No Operation', description: 'Do nothing', icon: CheckCircle, color: '#6b7280', bgColor: '#f9fafb' },
};

// Custom Edge - n8n style bezier with execution animation
function CustomEdge({ id, sourceX, sourceY, targetX, targetY, style, markerEnd, selected, data }: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    curvature: 0.4,
  });

  const isActive = data?._active === true;
  const isExecuted = data?._executed === true;

  return (
    <>
      {/* Background path for glow effect when active */}
      {isActive && (
        <path
          d={edgePath}
          fill="none"
          stroke="#ff6d5a"
          strokeWidth={8}
          opacity={0.3}
          className="animate-pulse"
        />
      )}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={isActive ? '#ff6d5a' : isExecuted ? '#22c55e' : selected ? N8N_COLORS.accent : '#b0b0b0'}
        strokeWidth={isActive ? 3 : selected ? 3 : 2}
        style={style}
        markerEnd={markerEnd}
      />
      {/* Animated dot for data flow during execution */}
      {isActive && (
        <>
          <circle r="6" fill="#ff6d5a">
            <animateMotion dur="0.6s" repeatCount="1" path={edgePath} fill="freeze" />
          </circle>
          <circle r="4" fill="#fff">
            <animateMotion dur="0.6s" repeatCount="1" path={edgePath} fill="freeze" />
          </circle>
        </>
      )}
      {/* Static dot for executed edges */}
      {isExecuted && !isActive && (
        <circle r="4" fill="#22c55e" cx={targetX} cy={targetY} />
      )}
      {/* Animated dot for selected (when not executing) */}
      {selected && !isActive && !isExecuted && (
        <circle r="4" fill={N8N_COLORS.accent}>
          <animateMotion dur="1.5s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
    </>
  );
}

// Custom Node Component - authentic n8n style (Light theme)
function N8NNode({ data, selected }: NodeProps) {
  const config = NODE_CONFIGS[data.type as keyof typeof NODE_CONFIGS] || NODE_CONFIGS.message;
  const Icon = config.icon;
  const status = data._status as 'running' | 'success' | 'error' | undefined;

  return (
    <div
      className={`relative transition-all duration-150 ${selected ? 'scale-[1.02]' : ''}`}
      style={{
        filter: selected
          ? 'drop-shadow(0 0 12px rgba(255, 109, 90, 0.3))'
          : status === 'running'
          ? 'drop-shadow(0 0 12px rgba(251, 146, 60, 0.5))'
          : status === 'success'
          ? 'drop-shadow(0 0 12px rgba(34, 197, 94, 0.5))'
          : 'drop-shadow(0 2px 8px rgba(0,0,0,0.08))',
      }}
    >
      {/* Status Indicator */}
      {status && (
        <div className="absolute -top-1 -right-1 z-10">
          {status === 'running' && (
            <div className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center animate-pulse">
              <RefreshCw className="w-2.5 h-2.5 text-white animate-spin" />
            </div>
          )}
          {status === 'success' && (
            <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
              <CheckCircle className="w-2.5 h-2.5 text-white" />
            </div>
          )}
          {status === 'error' && (
            <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
              <AlertCircle className="w-2.5 h-2.5 text-white" />
            </div>
          )}
        </div>
      )}

      {/* Input Handle */}
      {data.type !== 'trigger' && data.type !== 'webhook' && data.type !== 'chat' && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !-left-1.5 !border-2"
          style={{
            background: N8N_COLORS.nodeBackground,
            borderColor: selected ? N8N_COLORS.accent : '#b0b0b0',
          }}
        />
      )}

      {/* Node Container */}
      <div
        className="flex items-stretch rounded-md overflow-hidden"
        style={{
          backgroundColor: N8N_COLORS.nodeBackground,
          border: `1px solid ${
            status === 'running' ? '#f97316' :
            status === 'success' ? '#22c55e' :
            selected ? N8N_COLORS.accent : N8N_COLORS.nodeBorder
          }`,
          minWidth: '140px',
          maxWidth: '180px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        {/* Icon Section */}
        <div
          className="flex items-center justify-center px-2.5"
          style={{ backgroundColor: config.bgColor }}
        >
          <div
            className="w-7 h-7 rounded flex items-center justify-center"
            style={{ backgroundColor: config.color + '15' }}
          >
            <Icon className="w-4 h-4" style={{ color: config.color }} />
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 py-2.5 px-2.5 min-w-0">
          <h3 className="text-[11px] font-medium truncate leading-tight" style={{ color: N8N_COLORS.text }}>
            {data.label || config.name}
          </h3>
          {data.subtitle && (
            <p className="text-[9px] truncate mt-0.5" style={{ color: N8N_COLORS.textMuted }}>{data.subtitle}</p>
          )}
        </div>

        {/* Status Indicator */}
        {data.hasError && (
          <div className="flex items-center pr-2">
            <AlertCircle className="w-3.5 h-3.5" style={{ color: N8N_COLORS.danger }} />
          </div>
        )}
        {data.isSuccess && (
          <div className="flex items-center pr-2">
            <CheckCircle className="w-3.5 h-3.5" style={{ color: N8N_COLORS.success }} />
          </div>
        )}
      </div>

      {/* Output Handle */}
      {data.type !== 'end' && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !-right-1.5 !border-2"
          style={{
            background: N8N_COLORS.nodeBackground,
            borderColor: selected ? N8N_COLORS.accent : '#b0b0b0',
          }}
        />
      )}

      {/* Condition Output Handles */}
      {(data.type === 'condition' || data.type === 'switch') && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            className="!w-3 !h-3 !-right-1.5 !border-2"
            style={{
              background: N8N_COLORS.nodeBackground,
              borderColor: N8N_COLORS.success,
              top: '30%',
            }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="false"
            className="!w-3 !h-3 !-right-1.5 !border-2"
            style={{
              background: N8N_COLORS.nodeBackground,
              borderColor: N8N_COLORS.danger,
              top: '70%',
            }}
          />
        </>
      )}

      {/* Execution count badge */}
      {data.executionCount && (
        <div
          className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 text-[9px] font-medium rounded"
          style={{ backgroundColor: N8N_COLORS.accent, color: 'white' }}
        >
          {data.executionCount}
        </div>
      )}
    </div>
  );
}

// Node and Edge types for React Flow
const nodeTypes = { n8n: N8NNode };
const edgeTypes = { n8n: CustomEdge };

// Node categories for sidebar
const NODE_CATEGORIES = [
  {
    name: 'Triggers',
    nodes: ['trigger', 'webhook', 'chat'],
  },
  {
    name: 'AI',
    nodes: ['ai', 'openai'],
  },
  {
    name: 'Actions',
    nodes: ['message', 'http', 'email', 'respond'],
  },
  {
    name: 'Flow',
    nodes: ['condition', 'switch', 'wait', 'end', 'noOp'],
  },
  {
    name: 'Data',
    nodes: ['set', 'code', 'function'],
  },
];

interface WorkflowBuilderProps {
  onChange?: (nodes: Node[], edges: Edge[]) => void;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  agentId?: string;
  isSaving?: boolean;
}

// Default education admission workflow
const defaultInitialNodes: Node[] = [
  {
    id: 'start-1',
    type: 'n8n',
    position: { x: 50, y: 200 },
    data: { type: 'chat', label: 'Start Call', subtitle: 'Incoming inquiry' },
  },
  {
    id: 'greeting-1',
    type: 'n8n',
    position: { x: 280, y: 200 },
    data: { type: 'message', label: 'Welcome', subtitle: 'Greet student' },
  },
  {
    id: 'course-1',
    type: 'n8n',
    position: { x: 510, y: 200 },
    data: { type: 'ai', label: 'Ask Course', subtitle: 'Which program?' },
  },
  {
    id: 'qualify-1',
    type: 'n8n',
    position: { x: 740, y: 200 },
    data: { type: 'ai', label: 'Qualification', subtitle: 'Education background' },
  },
  {
    id: 'check-1',
    type: 'n8n',
    position: { x: 970, y: 200 },
    data: { type: 'condition', label: 'Eligible?', subtitle: 'Check requirements' },
  },
  {
    id: 'info-1',
    type: 'n8n',
    position: { x: 1200, y: 100 },
    data: { type: 'ai', label: 'Share Info', subtitle: 'Program details' },
  },
  {
    id: 'contact-1',
    type: 'n8n',
    position: { x: 1430, y: 100 },
    data: { type: 'ai', label: 'Get Contact', subtitle: 'Name & phone' },
  },
  {
    id: 'schedule-1',
    type: 'n8n',
    position: { x: 1660, y: 100 },
    data: { type: 'http', label: 'Schedule Visit', subtitle: 'Book campus tour' },
  },
  {
    id: 'end-1',
    type: 'n8n',
    position: { x: 1890, y: 100 },
    data: { type: 'end', label: 'Success', subtitle: 'Inquiry complete' },
  },
  {
    id: 'end-2',
    type: 'n8n',
    position: { x: 1200, y: 300 },
    data: { type: 'end', label: 'Follow Up', subtitle: 'Schedule callback' },
  },
];

const defaultInitialEdges: Edge[] = [
  { id: 'e1', source: 'start-1', target: 'greeting-1', type: 'n8n' },
  { id: 'e2', source: 'greeting-1', target: 'course-1', type: 'n8n' },
  { id: 'e3', source: 'course-1', target: 'qualify-1', type: 'n8n' },
  { id: 'e4', source: 'qualify-1', target: 'check-1', type: 'n8n' },
  { id: 'e5', source: 'check-1', target: 'info-1', sourceHandle: 'true', type: 'n8n' },
  { id: 'e6', source: 'check-1', target: 'end-2', sourceHandle: 'false', type: 'n8n' },
  { id: 'e7', source: 'info-1', target: 'contact-1', type: 'n8n' },
  { id: 'e8', source: 'contact-1', target: 'schedule-1', type: 'n8n' },
  { id: 'e9', source: 'schedule-1', target: 'end-1', type: 'n8n' },
];

function WorkflowBuilderInner({
  onChange,
  initialNodes: propInitialNodes,
  initialEdges: propInitialEdges,
  agentId: _agentId,
  isSaving = false,
}: WorkflowBuilderProps) {
  const reactFlowInstance = useReactFlow();

  // Use provided initial values or defaults (use defaults if less than 2 nodes)
  const startingNodes = propInitialNodes && propInitialNodes.length > 1
    ? propInitialNodes
    : defaultInitialNodes;
  const startingEdges = propInitialNodes && propInitialNodes.length > 1
    ? (propInitialEdges || [])
    : defaultInitialEdges;

  const [nodes, setNodes, onNodesChange] = useNodesState(startingNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(startingEdges);

  // Track if this is the initial load to avoid triggering onChange
  const isInitialLoad = React.useRef(true);
  const debounceTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNodePanel, setShowNodePanel] = useState(false);

  // Modal State - all nodes use center modal
  const [httpActiveTab, setHttpActiveTab] = useState<'request' | 'auth' | 'headers' | 'body' | 'options' | 'response'>('request');
  const [showPassword, setShowPassword] = useState(false);
  const [showNodeModal, setShowNodeModal] = useState(false);

  // HTTP Request Testing State
  const [isRequestLoading, setIsRequestLoading] = useState(false);
  const [httpResponse, setHttpResponse] = useState<{
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    time: number;
  } | null>(null);
  const [httpError, setHttpError] = useState<string | null>(null);

  // Workflow Testing State
  const [isWorkflowTesting, setIsWorkflowTesting] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState<'ready' | 'running' | 'success' | 'error'>('ready');
  const [workflowLogs, setWorkflowLogs] = useState<Array<{ nodeId: string; nodeName: string; status: 'running' | 'success' | 'error'; message: string; data?: unknown; time: number }>>([]);
  const [showWorkflowLogs, setShowWorkflowLogs] = useState(false);
  const [selectedLogIndex, setSelectedLogIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'executions' | 'evaluations'>('editor');

  // Debounced onChange effect - triggers when nodes/edges change
  React.useEffect(() => {
    // Skip the initial load to prevent immediate save on mount
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    // Clear any existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Debounce the onChange callback (1 second delay)
    debounceTimer.current = setTimeout(() => {
      if (onChange) {
        onChange(nodes, edges);
      }
    }, 1000);

    // Cleanup timer on unmount or before next effect run
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [nodes, edges, onChange]);

  // Reset nodes/edges when initial props change (e.g., loading from backend)
  React.useEffect(() => {
    if (propInitialNodes && propInitialNodes.length > 0) {
      isInitialLoad.current = true; // Prevent onChange trigger
      setNodes(propInitialNodes);
      if (propInitialEdges) {
        setEdges(propInitialEdges);
      }
      // Reset the flag after a tick
      setTimeout(() => {
        isInitialLoad.current = false;
      }, 100);
    }
  }, [propInitialNodes, propInitialEdges, setNodes, setEdges]);

  // Go to node in workflow - focus and highlight
  const goToNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node && reactFlowInstance) {
      // Close logs modal
      setShowWorkflowLogs(false);

      // Center on node with animation
      reactFlowInstance.setCenter(
        node.position.x + 100,
        node.position.y + 30,
        { zoom: 1.5, duration: 500 }
      );

      // Select the node
      setSelectedNode(node);
      setShowNodeModal(true);
    }
  }, [nodes, reactFlowInstance]);

  // Handle connection
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, type: 'n8n' }, eds));
    },
    [setEdges]
  );

  // Handle node selection - always open center modal
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setShowNodeModal(true);
  }, []);

  // Add new node
  const addNode = useCallback((type: string) => {
    const config = NODE_CONFIGS[type];
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: 'n8n',
      position: { x: 400 + Math.random() * 100, y: 200 + Math.random() * 100 },
      data: { type, label: config.name, subtitle: config.description },
    };
    setNodes((nds) => [...nds, newNode]);
    setShowNodePanel(false);
  }, [setNodes]);

  // Delete selected node
  const deleteNode = useCallback(() => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  }, [selectedNode, setNodes, setEdges]);

  // Filter nodes by search
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return NODE_CATEGORIES;
    return NODE_CATEGORIES.map(cat => ({
      ...cat,
      nodes: cat.nodes.filter(nodeType => {
        const config = NODE_CONFIGS[nodeType];
        return config.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               config.description.toLowerCase().includes(searchQuery.toLowerCase());
      }),
    })).filter(cat => cat.nodes.length > 0);
  }, [searchQuery]);

  // Update node data
  const updateNodeData = useCallback((field: string, value: string | boolean | number) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNode.id
          ? { ...n, data: { ...n.data, [field]: value } }
          : n
      )
    );
    setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, [field]: value } } : null);
  }, [selectedNode, setNodes]);

  // Add new parameter
  const addParam = useCallback(() => {
    if (!selectedNode) return;
    const params = selectedNode.data.params || [];
    const newParams = [...params, { id: Date.now(), key: '', value: '', description: '', enabled: true }];
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNode.id
          ? { ...n, data: { ...n.data, params: newParams } }
          : n
      )
    );
    setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, params: newParams } } : null);
  }, [selectedNode, setNodes]);

  // Update parameter
  const updateParam = useCallback((paramId: number, field: string, value: string | boolean) => {
    if (!selectedNode) return;
    const params = selectedNode.data.params || [];
    const newParams = params.map((p: { id: number }) => p.id === paramId ? { ...p, [field]: value } : p);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNode.id
          ? { ...n, data: { ...n.data, params: newParams } }
          : n
      )
    );
    setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, params: newParams } } : null);
  }, [selectedNode, setNodes]);

  // Delete parameter
  const deleteParam = useCallback((paramId: number) => {
    if (!selectedNode) return;
    const params = selectedNode.data.params || [];
    const newParams = params.filter((p: { id: number }) => p.id !== paramId);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNode.id
          ? { ...n, data: { ...n.data, params: newParams } }
          : n
      )
    );
    setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, params: newParams } } : null);
  }, [selectedNode, setNodes]);

  // Add new header
  const addHeader = useCallback(() => {
    if (!selectedNode) return;
    const headers = selectedNode.data.headers || [];
    const newHeaders = [...headers, { id: Date.now(), key: '', value: '', description: '', enabled: true }];
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNode.id
          ? { ...n, data: { ...n.data, headers: newHeaders } }
          : n
      )
    );
    setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, headers: newHeaders } } : null);
  }, [selectedNode, setNodes]);

  // Update header
  const updateHeader = useCallback((headerId: number, field: string, value: string | boolean) => {
    if (!selectedNode) return;
    const headers = selectedNode.data.headers || [];
    const newHeaders = headers.map((h: { id: number }) => h.id === headerId ? { ...h, [field]: value } : h);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNode.id
          ? { ...n, data: { ...n.data, headers: newHeaders } }
          : n
      )
    );
    setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, headers: newHeaders } } : null);
  }, [selectedNode, setNodes]);

  // Delete header
  const deleteHeader = useCallback((headerId: number) => {
    if (!selectedNode) return;
    const headers = selectedNode.data.headers || [];
    const newHeaders = headers.filter((h: { id: number }) => h.id !== headerId);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNode.id
          ? { ...n, data: { ...n.data, headers: newHeaders } }
          : n
      )
    );
    setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, headers: newHeaders } } : null);
  }, [selectedNode, setNodes]);

  // Send HTTP request (test)
  const sendRequest = useCallback(async () => {
    if (!selectedNode || !selectedNode.data.url) {
      setHttpError('Please enter a URL');
      return;
    }

    setIsRequestLoading(true);
    setHttpError(null);
    setHttpResponse(null);
    const startTime = Date.now();

    try {
      // Build request options
      const method = selectedNode.data.method || 'GET';
      const url = selectedNode.data.url;

      // Build headers
      const requestHeaders: Record<string, string> = {
        'Content-Type': selectedNode.data.contentType || 'application/json',
      };

      // Add custom headers
      (selectedNode.data.headers || []).forEach((h: { enabled: boolean; key: string; value: string }) => {
        if (h.enabled && h.key) {
          requestHeaders[h.key] = h.value;
        }
      });

      // Add auth headers
      if (selectedNode.data.authType === 'bearer' && selectedNode.data.bearerToken) {
        requestHeaders['Authorization'] = `Bearer ${selectedNode.data.bearerToken}`;
      } else if (selectedNode.data.authType === 'basic' && selectedNode.data.username) {
        const credentials = btoa(`${selectedNode.data.username}:${selectedNode.data.password || ''}`);
        requestHeaders['Authorization'] = `Basic ${credentials}`;
      } else if (selectedNode.data.authType === 'apiKey' && selectedNode.data.apiKeyName) {
        const addTo = selectedNode.data.apiKeyAddTo || 'header';
        if (addTo === 'header') {
          requestHeaders[selectedNode.data.apiKeyName] = selectedNode.data.apiKeyValue || '';
        }
      }

      // Build fetch options
      const fetchOptions: RequestInit = {
        method,
        headers: requestHeaders,
        mode: 'cors',
      };

      // Add body for non-GET requests
      if (method !== 'GET' && method !== 'HEAD' && selectedNode.data.bodyType !== 'none') {
        if (selectedNode.data.bodyType === 'raw' || selectedNode.data.bodyType === 'graphql') {
          fetchOptions.body = selectedNode.data.rawBody || '';
        }
      }

      // Make the request
      const response = await fetch(url, fetchOptions);
      const endTime = Date.now();

      // Get response body
      let body = '';
      try {
        body = await response.text();
        // Try to format as JSON
        const jsonBody = JSON.parse(body);
        body = JSON.stringify(jsonBody, null, 2);
      } catch {
        // Keep as text
      }

      // Get response headers
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      setHttpResponse({
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body,
        time: endTime - startTime,
      });

      // Switch to response tab
      setHttpActiveTab('response');
    } catch (error) {
      setHttpError(error instanceof Error ? error.message : 'Request failed');
      setHttpActiveTab('response');
    } finally {
      setIsRequestLoading(false);
    }
  }, [selectedNode]);

  // Execute a single node with real logic and detailed error reporting
  const executeNode = useCallback(async (
    node: Node,
    context: Record<string, unknown>
  ): Promise<{ success: boolean; data?: unknown; error?: string; errorDetails?: Record<string, unknown> }> => {
    const { data } = node;
    const startTime = Date.now();
    const nodeLabel = data.label || NODE_CONFIGS[data.type as keyof typeof NODE_CONFIGS]?.name || 'Unknown Node';

    try {
      switch (data.type) {
        case 'http': {
          // Real HTTP request
          const method = data.method || 'GET';
          const url = data.url;

          if (!url) {
            return {
              success: false,
              error: `HTTP Request Failed: No URL configured for "${nodeLabel}"`,
              errorDetails: {
                nodeType: 'http',
                nodeLabel,
                issue: 'Missing URL',
                suggestion: 'Please configure a valid URL in the HTTP Request node settings',
              }
            };
          }

          // Validate URL format
          try {
            new URL(url);
          } catch {
            return {
              success: false,
              error: `HTTP Request Failed: Invalid URL format`,
              errorDetails: {
                nodeType: 'http',
                nodeLabel,
                url,
                issue: 'Invalid URL format',
                suggestion: 'URL must start with http:// or https://',
              }
            };
          }

          // Build headers
          const headers: Record<string, string> = {
            'Content-Type': data.contentType || 'application/json',
          };

          // Add custom headers
          (data.headers || []).forEach((h: { enabled: boolean; key: string; value: string }) => {
            if (h.enabled && h.key) headers[h.key] = h.value;
          });

          // Add auth
          if (data.authType === 'bearer' && data.bearerToken) {
            headers['Authorization'] = `Bearer ${data.bearerToken}`;
          } else if (data.authType === 'basic' && data.username) {
            headers['Authorization'] = `Basic ${btoa(`${data.username}:${data.password || ''}`)}`;
          } else if (data.authType === 'apiKey' && data.apiKeyName && data.apiKeyAddTo === 'header') {
            headers[data.apiKeyName] = data.apiKeyValue || '';
          }

          const fetchOptions: RequestInit = { method, headers, mode: 'cors' };

          // Add body for non-GET
          if (method !== 'GET' && method !== 'HEAD' && data.bodyType !== 'none' && data.body) {
            fetchOptions.body = data.body;
          }

          let response: Response;
          try {
            response = await fetch(url, fetchOptions);
          } catch (fetchError) {
            const errorMsg = fetchError instanceof Error ? fetchError.message : 'Network error';
            return {
              success: false,
              error: `HTTP Request Failed: ${errorMsg}`,
              errorDetails: {
                nodeType: 'http',
                nodeLabel,
                method,
                url,
                issue: errorMsg,
                suggestion: errorMsg.includes('CORS')
                  ? 'CORS error - The server may not allow requests from this origin. Check server CORS settings.'
                  : errorMsg.includes('network')
                  ? 'Network error - Check if the URL is accessible and your internet connection is working.'
                  : 'Check the URL and try again.',
              }
            };
          }

          let responseBody: unknown;
          const responseText = await response.text();
          try {
            responseBody = JSON.parse(responseText);
          } catch {
            responseBody = responseText;
          }

          if (!response.ok) {
            return {
              success: false,
              error: `HTTP ${response.status}: ${response.statusText}`,
              errorDetails: {
                nodeType: 'http',
                nodeLabel,
                method,
                url,
                status: response.status,
                statusText: response.statusText,
                responseBody,
                suggestion: response.status === 401
                  ? 'Authentication failed - Check your credentials or API key.'
                  : response.status === 403
                  ? 'Access forbidden - You may not have permission to access this resource.'
                  : response.status === 404
                  ? 'Resource not found - Check if the URL is correct.'
                  : response.status >= 500
                  ? 'Server error - The API server encountered an error.'
                  : 'Check the API documentation for valid request format.',
              }
            };
          }

          return {
            success: true,
            data: {
              status: response.status,
              statusText: response.statusText,
              body: responseBody,
              time: Date.now() - startTime,
            },
            error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
          };
        }

        case 'wait': {
          // Real wait
          const waitTime = parseInt(data.waitTime || '5', 10) * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return { success: true, data: { waited: waitTime } };
        }

        case 'condition': {
          // Evaluate condition based on previous data
          const field = data.field || '';
          const operator = data.operator || 'equals';
          const compareValue = data.value || '';

          // Get value from context (previous node output)
          let fieldValue: unknown = context;
          const fieldParts = field.split('.');
          for (const part of fieldParts) {
            if (fieldValue && typeof fieldValue === 'object') {
              fieldValue = (fieldValue as Record<string, unknown>)[part];
            } else {
              fieldValue = undefined;
              break;
            }
          }

          let result = false;
          switch (operator) {
            case 'equals': result = String(fieldValue) === compareValue; break;
            case 'not_equals': result = String(fieldValue) !== compareValue; break;
            case 'contains': result = String(fieldValue).includes(compareValue); break;
            case 'greater': result = Number(fieldValue) > Number(compareValue); break;
            case 'less': result = Number(fieldValue) < Number(compareValue); break;
            case 'empty': result = !fieldValue || String(fieldValue) === ''; break;
            case 'not_empty': result = !!fieldValue && String(fieldValue) !== ''; break;
          }

          return { success: true, data: { condition: result, field, operator, compareValue, fieldValue } };
        }

        case 'message': {
          // Log the message
          const message = data.message || data.label || 'Message node';
          return { success: true, data: { message, context } };
        }

        case 'code': {
          // Execute JavaScript code (sandboxed)
          const code = data.code || '';

          if (!code.trim()) {
            return {
              success: false,
              error: `Code Execution Failed: No code provided for "${nodeLabel}"`,
              errorDetails: {
                nodeType: 'code',
                nodeLabel,
                issue: 'Empty code block',
                suggestion: 'Please add JavaScript code to the Code node',
              }
            };
          }

          try {
            // Create a sandboxed function with context
            const fn = new Function('input', 'context', `
              try {
                ${code}
                return { success: true };
              } catch (e) {
                return { success: false, error: e.message, stack: e.stack };
              }
            `);
            const result = fn(context, context);
            if (!result.success) {
              return {
                success: false,
                error: `Code Execution Error: ${result.error}`,
                errorDetails: {
                  nodeType: 'code',
                  nodeLabel,
                  errorMessage: result.error,
                  stack: result.stack,
                  code: code.substring(0, 200) + (code.length > 200 ? '...' : ''),
                  suggestion: 'Check your JavaScript code for syntax errors or runtime issues',
                }
              };
            }
            return { success: true, data: result };
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            return {
              success: false,
              error: `Code Syntax Error: ${errorMsg}`,
              errorDetails: {
                nodeType: 'code',
                nodeLabel,
                errorMessage: errorMsg,
                code: code.substring(0, 200) + (code.length > 200 ? '...' : ''),
                suggestion: 'Check your JavaScript code for syntax errors',
              }
            };
          }
        }

        case 'webhook':
        case 'trigger':
        case 'chat': {
          // Trigger nodes just pass through
          return { success: true, data: { triggered: true, timestamp: new Date().toISOString() } };
        }

        case 'email': {
          // Simulate email (would need backend)
          return {
            success: true,
            data: {
              sent: true,
              to: data.to || 'test@example.com',
              subject: data.subject || 'Test Email',
              simulated: true
            }
          };
        }

        case 'database': {
          // Simulate database (would need backend)
          return {
            success: true,
            data: {
              operation: data.operation || 'select',
              table: data.table || 'unknown',
              simulated: true,
              rows: []
            }
          };
        }

        case 'ai': {
          // Simulate AI response (would need backend/API)
          return {
            success: true,
            data: {
              model: data.model || 'gpt-4',
              prompt: data.prompt,
              response: '[AI Response would appear here - requires API integration]',
              simulated: true
            }
          };
        }

        default:
          return { success: true, data: { type: data.type, message: 'Node executed', executionTime: Date.now() - startTime } };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Node Execution Failed: ${errorMsg}`,
        errorDetails: {
          nodeType: data.type,
          nodeLabel,
          errorMessage: errorMsg,
          stack: error instanceof Error ? error.stack : undefined,
          executionTime: Date.now() - startTime,
          suggestion: 'Check the node configuration and input data',
        }
      };
    }
  }, []);

  // Helper to animate edge
  const animateEdge = useCallback((sourceId: string, targetId: string) => {
    return new Promise<void>((resolve) => {
      // Set edge as active
      setEdges(eds => eds.map(e =>
        (e.source === sourceId && e.target === targetId)
          ? { ...e, data: { ...e.data, _active: true } }
          : e
      ));

      // After animation duration, mark as executed
      setTimeout(() => {
        setEdges(eds => eds.map(e =>
          (e.source === sourceId && e.target === targetId)
            ? { ...e, data: { ...e.data, _active: false, _executed: true } }
            : e
        ));
        resolve();
      }, 600); // Match animation duration
    });
  }, [setEdges]);

  // Test workflow - REAL execution with n8n-style node-by-node animation
  const testWorkflow = useCallback(async () => {
    if (nodes.length === 0) return;

    setIsWorkflowTesting(true);
    setWorkflowStatus('running');
    setWorkflowLogs([]);

    // Reset all edges
    setEdges(eds => eds.map(e => ({ ...e, data: { ...e.data, _active: false, _executed: false } })));

    // Execution context - stores output from each node
    const executionContext: Record<string, unknown> = {};

    // Find trigger/start nodes (nodes with no incoming edges)
    const targetIds = new Set(edges.map(e => e.target));
    const startNodes = nodes.filter(n => !targetIds.has(n.id));

    // Build adjacency list for traversal
    const adjacency: Record<string, { nodeId: string; edgeId: string }[]> = {};
    edges.forEach(e => {
      if (!adjacency[e.source]) adjacency[e.source] = [];
      adjacency[e.source].push({ nodeId: e.target, edgeId: e.id });
    });

    // Get incoming edges for a node (to get previous node's output)
    const incomingEdges: Record<string, string[]> = {};
    edges.forEach(e => {
      if (!incomingEdges[e.target]) incomingEdges[e.target] = [];
      incomingEdges[e.target].push(e.source);
    });

    // Sequential execution to show flow
    const visited = new Set<string>();
    const queue = startNodes.map(n => n.id);
    let hasError = false;

    try {
      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        if (visited.has(nodeId)) continue;
        visited.add(nodeId);

        const node = nodes.find(n => n.id === nodeId);
        if (!node) continue;

        const nodeName = node.data.label || NODE_CONFIGS[node.data.type as keyof typeof NODE_CONFIGS]?.name || 'Unknown';

        // Log start
        setWorkflowLogs(prev => [...prev, {
          nodeId,
          nodeName,
          status: 'running',
          message: `Executing ${nodeName}...`,
          time: Date.now(),
        }]);

        // Update node to show running state
        setNodes(nds => nds.map(n =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, _status: 'running' } }
            : n
        ));

        // Wait a bit to show running state
        await new Promise(resolve => setTimeout(resolve, 300));

        // Build input context from previous nodes
        const inputNodeIds = incomingEdges[nodeId] || [];
        const inputContext: Record<string, unknown> = {};
        inputNodeIds.forEach(id => {
          if (executionContext[id]) {
            Object.assign(inputContext, executionContext[id]);
          }
        });

        // Execute the node with real logic
        const result = await executeNode(node, inputContext);

        // Store output in context
        executionContext[nodeId] = result.data;

        if (result.success) {
          // Mark node as completed
          setNodes(nds => nds.map(n =>
            n.id === nodeId
              ? { ...n, data: { ...n.data, _status: 'success' } }
              : n
          ));

          setWorkflowLogs(prev => [...prev, {
            nodeId,
            nodeName,
            status: 'success',
            message: `Completed successfully`,
            data: result.data,
            time: Date.now(),
          }]);

          // Get connected nodes
          const nextConnections = adjacency[nodeId] || [];

          // For condition nodes, handle true/false paths
          if (node.data.type === 'condition' && result.data) {
            const conditionResult = (result.data as { condition: boolean }).condition;

            setWorkflowLogs(prev => [...prev, {
              nodeId,
              nodeName,
              status: 'success',
              message: `Condition evaluated to: ${conditionResult}`,
              time: Date.now(),
            }]);

            // Animate edges to next nodes and add to queue
            for (const conn of nextConnections) {
              if (!visited.has(conn.nodeId)) {
                // Animate the edge
                await animateEdge(nodeId, conn.nodeId);
                queue.push(conn.nodeId);
              }
            }
          } else {
            // Animate edges sequentially for visual flow
            for (const conn of nextConnections) {
              if (!visited.has(conn.nodeId)) {
                // Animate the edge
                await animateEdge(nodeId, conn.nodeId);
                queue.push(conn.nodeId);
              }
            }
          }
        } else {
          // Mark node as error
          hasError = true;
          setNodes(nds => nds.map(n =>
            n.id === nodeId
              ? { ...n, data: { ...n.data, _status: 'error' } }
              : n
          ));

          // Include detailed error information in logs
          setWorkflowLogs(prev => [...prev, {
            nodeId,
            nodeName,
            status: 'error',
            message: result.error || 'Execution failed',
            data: (result as { errorDetails?: Record<string, unknown> }).errorDetails || { error: result.error },
            time: Date.now(),
          }]);

          // Stop execution on error
          break;
        }
      }

      setWorkflowStatus(hasError ? 'error' : 'success');

      // Clear status after delay
      setTimeout(() => {
        setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, _status: undefined } })));
        setEdges(eds => eds.map(e => ({ ...e, data: { ...e.data, _active: false, _executed: false } })));
        setWorkflowStatus('ready');
      }, 3000);

    } catch (error) {
      setWorkflowStatus('error');
      setWorkflowLogs(prev => [...prev, {
        nodeId: 'system',
        nodeName: 'System',
        status: 'error',
        message: error instanceof Error ? error.message : 'Workflow execution failed',
        time: Date.now(),
      }]);

      setTimeout(() => {
        setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, _status: undefined } })));
        setEdges(eds => eds.map(e => ({ ...e, data: { ...e.data, _active: false, _executed: false } })));
        setWorkflowStatus('ready');
      }, 3000);
    } finally {
      setIsWorkflowTesting(false);
    }
  }, [nodes, edges, setNodes, setEdges, executeNode, animateEdge]);

  return (
    <div className="flex flex-col overflow-hidden" style={{ backgroundColor: '#f5f5f4', height: 'calc(100vh - 140px)' }}>
      {/* Top Bar - Floating elements */}
      <div className="relative h-14 flex-shrink-0">
        {/* Left - Set up template button */}
        <div className="absolute left-4 top-3">
          <button
            onClick={() => setShowNodePanel(!showNodePanel)}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg text-xs font-medium border hover:bg-gray-50 transition-all shadow-sm"
            style={{ borderColor: '#e5e5e5', color: '#171717' }}
          >
            <Box className="w-3.5 h-3.5" />
            Set up template
          </button>
        </div>

        {/* Center - Tabs */}
        <div className="absolute left-1/2 top-3 -translate-x-1/2">
          <div className="flex items-center bg-gray-800 rounded-full p-1">
            {[
              { id: 'editor', label: 'Editor' },
              { id: 'logs', label: 'Logs' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => id === 'logs' ? setShowWorkflowLogs(true) : setActiveTab(id as typeof activeTab)}
                className={`px-4 py-1 text-xs font-medium rounded-full transition-all ${
                  activeTab === id
                    ? 'bg-white text-gray-900'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Right - Saving Indicator */}
        {isSaving && (
          <div className="absolute right-4 top-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg text-xs font-medium border shadow-sm" style={{ borderColor: '#e5e5e5', color: '#737373' }}>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Saving...
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex relative">
        {/* Canvas Area */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={() => setSelectedNode(null)}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={{ type: 'n8n' }}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.3}
            maxZoom={2}
            attributionPosition="bottom-left"
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={25}
              size={1}
              color="#d4d4d4"
              style={{ backgroundColor: '#f5f5f4' }}
            />

            {/* Hide default controls - we use custom ones */}
          </ReactFlow>

          {/* Right Sidebar - Floating on canvas */}
          <div className="absolute right-4 top-4 flex flex-col gap-2">
            <button
              onClick={() => setShowNodePanel(!showNodePanel)}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all shadow-sm ${
                showNodePanel ? 'bg-white text-gray-900' : 'bg-white/80 text-gray-500 hover:bg-white hover:text-gray-700'
              }`}
              title="Add node"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowNodePanel(true)}
              className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/80 text-gray-500 hover:bg-white hover:text-gray-700 transition-all shadow-sm"
              title="Search nodes"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowWorkflowLogs(true)}
              className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/80 text-gray-500 hover:bg-white hover:text-gray-700 transition-all shadow-sm"
              title="View Logs"
            >
              <FileText className="w-5 h-5" />
            </button>
            <button
              onClick={() => reactFlowInstance?.fitView({ padding: 0.2 })}
              className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/80 text-gray-500 hover:bg-white hover:text-gray-700 transition-all shadow-sm"
              title="Fit to view"
            >
              <SplitSquareHorizontal className="w-5 h-5" />
            </button>
            <button
              onClick={() => alert('AI Assistant coming soon!')}
              className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/80 text-gray-500 hover:bg-white hover:text-gray-700 transition-all shadow-sm"
              title="AI Assistant"
            >
              <Sparkles className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Add Node Panel - positioned absolutely */}
        {showNodePanel && (
          <div
            className="absolute top-4 left-4 w-80 rounded-xl shadow-xl z-50 overflow-hidden"
            style={{ backgroundColor: N8N_COLORS.panelBg, border: `1px solid ${N8N_COLORS.panelBorder}` }}
          >
            {/* Search */}
            <div className="p-3 border-b" style={{ borderColor: N8N_COLORS.panelBorder }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: N8N_COLORS.textMuted }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search nodes..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-300"
                  style={{
                    backgroundColor: N8N_COLORS.inputBg,
                    border: `1px solid ${N8N_COLORS.inputBorder}`,
                    color: N8N_COLORS.text,
                  }}
                  autoFocus
                />
              </div>
            </div>

            {/* Node Categories */}
            <div className="max-h-[400px] overflow-y-auto p-2">
              {filteredCategories.map((category) => (
                <div key={category.name} className="mb-3">
                  <h4 className="px-2 py-1 text-xs font-semibold uppercase tracking-wider" style={{ color: N8N_COLORS.textMuted }}>
                    {category.name}
                  </h4>
                  <div className="space-y-0.5">
                    {category.nodes.map((nodeType) => {
                      const config = NODE_CONFIGS[nodeType];
                      const Icon = config.icon;
                      return (
                        <button
                          key={nodeType}
                          onClick={() => addNode(nodeType)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg transition-all hover:bg-gray-100 group"
                        >
                          <div
                            className="w-8 h-8 rounded flex items-center justify-center transition-transform group-hover:scale-110"
                            style={{ backgroundColor: config.color + '15' }}
                          >
                            <Icon className="w-4 h-4" style={{ color: config.color }} />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium" style={{ color: N8N_COLORS.text }}>{config.name}</p>
                            <p className="text-xs" style={{ color: N8N_COLORS.textMuted }}>{config.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Close button */}
            <button
              onClick={() => setShowNodePanel(false)}
              className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color: N8N_COLORS.textMuted }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Bottom Toolbar - Floating controls like n8n */}
      <div className="relative h-16 flex-shrink-0">
        {/* Left - Zoom controls */}
        <div className="absolute left-4 bottom-3 flex items-center gap-2">
          <button
            onClick={() => reactFlowInstance?.fitView({ padding: 0.2 })}
            className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all border shadow-sm"
            style={{ borderColor: '#e5e5e5' }}
            title="Fit view"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => reactFlowInstance?.zoomIn()}
            className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all border shadow-sm"
            style={{ borderColor: '#e5e5e5' }}
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => reactFlowInstance?.zoomOut()}
            className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all border shadow-sm"
            style={{ borderColor: '#e5e5e5' }}
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all border shadow-sm"
            style={{ borderColor: '#e5e5e5' }}
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-all border shadow-sm"
            style={{ borderColor: '#e5e5e5' }}
            title="Select"
          >
            <MousePointer2 className="w-4 h-4" style={{ fill: '#374151' }} />
          </button>
        </div>

        {/* Center - Execute workflow button */}
        <div className="absolute left-1/2 bottom-3 -translate-x-1/2">
          <button
            onClick={testWorkflow}
            disabled={isWorkflowTesting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-medium transition-all hover:opacity-90 disabled:opacity-50 shadow-lg"
            style={{ backgroundColor: '#ea5532', color: 'white' }}
          >
            {isWorkflowTesting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 3h6l2 4h4v14H3V7h4l2-4z" />
                  <circle cx="12" cy="14" r="3" />
                </svg>
                Execute workflow
              </>
            )}
          </button>
        </div>
      </div>


      {/* Full Logs Modal - opens when clicking Logs tab */}
      {showWorkflowLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowWorkflowLogs(false)}
          />

          {/* Modal */}
          <div className="relative w-[1100px] h-[85vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Execution Log</h2>
                  <p className="text-xs text-white/70">{workflowLogs.length} entries</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {workflowStatus === 'running' && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-white/20 text-white">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Running
                  </span>
                )}
                {workflowStatus === 'success' && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-green-500/30 text-white">
                    <CheckCircle className="w-3 h-3" />
                    Success
                  </span>
                )}
                {workflowStatus === 'error' && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-red-500/30 text-white">
                    <AlertCircle className="w-3 h-3" />
                    Failed
                  </span>
                )}
                <button
                  onClick={() => setShowWorkflowLogs(false)}
                  className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Two Panel Layout */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Panel - Logs List */}
              <div className="w-[350px] border-r border-gray-200 flex flex-col bg-gray-50">
                {/* Left Header */}
                <div className="px-4 py-3 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">Nodes</h3>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="flex items-center gap-1 text-green-600">
                        <Check className="w-3 h-3" />
                        {workflowLogs.filter(l => l.status === 'success').length}
                      </span>
                      <span className="flex items-center gap-1 text-red-600">
                        <X className="w-3 h-3" />
                        {workflowLogs.filter(l => l.status === 'error').length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Logs List */}
                <div className="flex-1 overflow-y-auto">
                  {workflowLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6">
                      <FileText className="w-12 h-12 mb-3 opacity-50" />
                      <p className="text-sm font-medium">No execution logs yet</p>
                      <p className="text-xs mt-1 text-center">Click "Execute workflow" to run your workflow and see logs here.</p>
                    </div>
                  ) : (
                    workflowLogs.map((log, index) => {
                      const isError = log.status === 'error';
                      const isSuccess = log.status === 'success';
                      const isRunning = log.status === 'running';
                      const isSelected = selectedLogIndex === index;

                      return (
                        <div
                          key={index}
                          onClick={() => setSelectedLogIndex(index)}
                          className={`px-4 py-3 border-b border-gray-200 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-indigo-50 border-l-4 border-l-indigo-500'
                              : 'bg-white hover:bg-gray-50 border-l-4 border-l-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Status Icon */}
                            <div className="flex-shrink-0">
                              {isRunning && (
                                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                                  <RefreshCw className="w-4 h-4 text-orange-600 animate-spin" />
                                </div>
                              )}
                              {isSuccess && (
                                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                  <Check className="w-4 h-4 text-green-600" />
                                </div>
                              )}
                              {isError && (
                                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                                  <X className="w-4 h-4 text-red-600" />
                                </div>
                              )}
                            </div>

                            {/* Node Info */}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {log.nodeName}
                              </h4>
                              <p className={`text-xs truncate mt-0.5 ${
                                isError ? 'text-red-500' : isSuccess ? 'text-green-600' : 'text-orange-500'
                              }`}>
                                {isError ? 'Failed' : isSuccess ? 'Success' : 'Running...'}
                              </p>
                            </div>

                            {/* Time */}
                            <span className="text-[10px] text-gray-400 flex-shrink-0">
                              {new Date(log.time).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Left Footer */}
                <div className="px-4 py-2 border-t border-gray-200 bg-white">
                  <button
                    onClick={() => { setWorkflowLogs([]); setSelectedLogIndex(null); }}
                    className="w-full px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Right Panel - Output Details */}
              <div className="flex-1 flex flex-col bg-white">
                {/* Right Header */}
                <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-700">Output</h3>
                </div>

                {/* Output Content */}
                <div className="flex-1 overflow-y-auto p-5">
                  {selectedLogIndex !== null && workflowLogs[selectedLogIndex] ? (
                    (() => {
                      const log = workflowLogs[selectedLogIndex];
                      const isError = log.status === 'error';
                      const isSuccess = log.status === 'success';
                      const errorData = log.data as Record<string, string | number | boolean | null | undefined> | undefined;

                      return (
                        <div className="space-y-4">
                          {/* Node Header */}
                          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                isError ? 'bg-red-100' : isSuccess ? 'bg-green-100' : 'bg-orange-100'
                              }`}>
                                {isError ? (
                                  <X className="w-5 h-5 text-red-600" />
                                ) : isSuccess ? (
                                  <Check className="w-5 h-5 text-green-600" />
                                ) : (
                                  <RefreshCw className="w-5 h-5 text-orange-600 animate-spin" />
                                )}
                              </div>
                              <div>
                                <h4 className="text-base font-semibold text-gray-900">{log.nodeName}</h4>
                                <p className={`text-sm ${isError ? 'text-red-600' : 'text-gray-500'}`}>
                                  {log.message}
                                </p>
                              </div>
                            </div>
                            {/* Go to Node Button */}
                            <button
                              onClick={() => goToNode(log.nodeId)}
                              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Go to Node
                            </button>
                          </div>

                          {/* Error Details */}
                          {isError && errorData != null && (
                            <div className="space-y-4">
                              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                                <h5 className="text-sm font-semibold text-red-700 mb-3">Error Details</h5>
                                <div className="space-y-2">
                                  {errorData.nodeType != null && (
                                    <div className="flex text-sm">
                                      <span className="w-28 text-gray-500">Type</span>
                                      <span className="text-gray-900 font-medium">{String(errorData.nodeType)}</span>
                                    </div>
                                  )}
                                  {errorData.url != null && (
                                    <div className="flex text-sm">
                                      <span className="w-28 text-gray-500">URL</span>
                                      <span className="text-gray-900 break-all font-mono text-xs">{String(errorData.url)}</span>
                                    </div>
                                  )}
                                  {errorData.method != null && (
                                    <div className="flex text-sm">
                                      <span className="w-28 text-gray-500">Method</span>
                                      <span className="text-gray-900 font-medium">{String(errorData.method)}</span>
                                    </div>
                                  )}
                                  {errorData.status != null && (
                                    <div className="flex text-sm">
                                      <span className="w-28 text-gray-500">Status</span>
                                      <span className="text-red-600 font-semibold">
                                        {String(errorData.status)} {errorData.statusText != null ? String(errorData.statusText) : ''}
                                      </span>
                                    </div>
                                  )}
                                  {errorData.issue != null && (
                                    <div className="flex text-sm">
                                      <span className="w-28 text-gray-500">Issue</span>
                                      <span className="text-red-600">{String(errorData.issue)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {errorData.suggestion != null && (
                                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                                  <div className="flex gap-3">
                                    <span className="text-xl">💡</span>
                                    <div>
                                      <h5 className="text-sm font-semibold text-amber-800">Suggestion</h5>
                                      <p className="text-sm text-amber-700 mt-1">{String(errorData.suggestion)}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Success Output */}
                          {isSuccess && log.data != null && (
                            <div className="space-y-3">
                              <h5 className="text-sm font-semibold text-gray-700">Response Data</h5>
                              <pre className="p-4 bg-gray-900 rounded-lg text-sm text-green-400 overflow-auto max-h-[400px] font-mono">
                                {JSON.stringify(log.data, null, 2)}
                              </pre>
                            </div>
                          )}

                          {/* Timestamp */}
                          <div className="pt-4 border-t border-gray-200">
                            <p className="text-xs text-gray-400">
                              Executed at {new Date(log.time).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Select a node to view output</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Node Configuration Modal - Centered Overlay for ALL node types */}
      {showNodeModal && selectedNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowNodeModal(false)}
          />

          {/* Modal - Dynamic size based on node type */}
          <div
            className={`relative rounded-xl shadow-2xl overflow-hidden flex flex-col ${
              selectedNode.data.type === 'http' ? 'w-[1100px] h-[92vh]' : 'w-[500px] max-h-[80vh]'
            }`}
            style={{ backgroundColor: '#ffffff' }}
          >
            {/* Modal Header - Dynamic based on node type */}
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ background: `linear-gradient(135deg, ${NODE_CONFIGS[selectedNode.data.type as keyof typeof NODE_CONFIGS]?.color || '#ff6c37'} 0%, ${NODE_CONFIGS[selectedNode.data.type as keyof typeof NODE_CONFIGS]?.color || '#ff6c37'}aa 100%)` }}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  {(() => {
                    const Icon = NODE_CONFIGS[selectedNode.data.type as keyof typeof NODE_CONFIGS]?.icon || MessageSquare;
                    return <Icon className="w-4 h-4 text-white" />;
                  })()}
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    {NODE_CONFIGS[selectedNode.data.type as keyof typeof NODE_CONFIGS]?.name || 'Node'}
                  </h2>
                  <p className="text-[10px] text-white/70">
                    {NODE_CONFIGS[selectedNode.data.type as keyof typeof NODE_CONFIGS]?.description || 'Configure node'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNodeModal(false)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            </div>

            {/* HTTP-specific: URL Bar */}
            {selectedNode.data.type === 'http' && (
              <div className="flex items-center gap-2 px-5 py-3 bg-gray-50" style={{ borderBottom: '1px solid #e5e5e5' }}>
                <select
                  value={selectedNode.data.method || 'GET'}
                  onChange={(e) => updateNodeData('method', e.target.value)}
                  className="px-3 py-2 text-xs font-bold rounded-lg border-0 outline-none cursor-pointer"
                  style={{
                    backgroundColor: HTTP_METHODS.find(m => m.method === (selectedNode.data.method || 'GET'))?.bgColor,
                    color: HTTP_METHODS.find(m => m.method === (selectedNode.data.method || 'GET'))?.color,
                    minWidth: '85px',
                  }}
                >
                  {HTTP_METHODS.map(({ method }) => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={selectedNode.data.url || ''}
                  onChange={(e) => updateNodeData('url', e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-lg border outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 font-mono"
                  style={{ borderColor: '#d4d4d4' }}
                  placeholder="https://api.example.com/endpoint"
                />
                <button
                  onClick={sendRequest}
                  disabled={isRequestLoading}
                  className="px-4 py-2 text-xs font-semibold text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-50"
                  style={{ backgroundColor: '#ff6c37' }}
                >
                  {isRequestLoading ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3" />
                      Send
                    </>
                  )}
                </button>
              </div>
            )}

            {/* HTTP-specific: Tabs */}
            {selectedNode.data.type === 'http' && (
              <div
                className="flex gap-0 px-5 bg-white"
                style={{ borderBottom: '1px solid #e5e5e5' }}
              >
                {[
                  { id: 'request', label: 'Params', icon: Link },
                  { id: 'auth', label: 'Authorization', icon: Shield },
                  { id: 'headers', label: 'Headers', icon: FileText },
                  { id: 'body', label: 'Body', icon: Code },
                  { id: 'options', label: 'Settings', icon: Settings },
                  { id: 'response', label: 'Response', icon: CheckCircle, highlight: httpResponse !== null || httpError !== null },
                ].map(({ id, label, icon: Icon, highlight }) => (
                  <button
                    key={id}
                    onClick={() => setHttpActiveTab(id as typeof httpActiveTab)}
                    className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-all relative"
                    style={{
                      color: httpActiveTab === id ? '#ff6c37' : highlight ? '#10b981' : '#6b7280',
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                    {highlight && httpActiveTab !== id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 ml-1" />
                    )}
                    {httpActiveTab === id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: '#ff6c37' }} />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-5" style={{ backgroundColor: '#fafafa' }}>
              {/* Non-HTTP nodes: Simple form */}
              {selectedNode.data.type !== 'http' && (
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Name</label>
                    <input
                      type="text"
                      value={selectedNode.data.label || ''}
                      onChange={(e) => updateNodeData('label', e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border outline-none focus:ring-2 focus:ring-orange-200"
                      style={{ borderColor: '#d4d4d4' }}
                      placeholder="Enter node name..."
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes</label>
                    <input
                      type="text"
                      value={selectedNode.data.subtitle || ''}
                      onChange={(e) => updateNodeData('subtitle', e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border outline-none focus:ring-2 focus:ring-orange-200"
                      style={{ borderColor: '#d4d4d4' }}
                      placeholder="Add a note..."
                    />
                  </div>

                  {/* Message Node: Message textarea */}
                  {selectedNode.data.type === 'message' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Message</label>
                      <textarea
                        value={selectedNode.data.message || ''}
                        onChange={(e) => updateNodeData('message', e.target.value)}
                        rows={5}
                        className="w-full px-3 py-2 text-xs rounded-lg border outline-none resize-none focus:ring-2 focus:ring-orange-200"
                        style={{ borderColor: '#d4d4d4' }}
                        placeholder="Enter message..."
                      />
                    </div>
                  )}

                  {/* Condition Node: Condition settings */}
                  {selectedNode.data.type === 'condition' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Field</label>
                        <input
                          type="text"
                          value={selectedNode.data.field || ''}
                          onChange={(e) => updateNodeData('field', e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border outline-none focus:ring-2 focus:ring-orange-200"
                          style={{ borderColor: '#d4d4d4' }}
                          placeholder="e.g., user.email"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Operator</label>
                        <select
                          value={selectedNode.data.operator || 'equals'}
                          onChange={(e) => updateNodeData('operator', e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border outline-none focus:ring-2 focus:ring-orange-200"
                          style={{ borderColor: '#d4d4d4' }}
                        >
                          <option value="equals">Equals</option>
                          <option value="not_equals">Not Equals</option>
                          <option value="contains">Contains</option>
                          <option value="greater">Greater Than</option>
                          <option value="less">Less Than</option>
                          <option value="empty">Is Empty</option>
                          <option value="not_empty">Is Not Empty</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Value</label>
                        <input
                          type="text"
                          value={selectedNode.data.value || ''}
                          onChange={(e) => updateNodeData('value', e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border outline-none focus:ring-2 focus:ring-orange-200"
                          style={{ borderColor: '#d4d4d4' }}
                          placeholder="Compare value..."
                        />
                      </div>
                    </>
                  )}

                  {/* Wait Node: Wait time */}
                  {selectedNode.data.type === 'wait' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Wait Time (seconds)</label>
                      <input
                        type="number"
                        value={selectedNode.data.waitTime || '5'}
                        onChange={(e) => updateNodeData('waitTime', e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border outline-none focus:ring-2 focus:ring-orange-200"
                        style={{ borderColor: '#d4d4d4' }}
                        min="1"
                      />
                    </div>
                  )}

                  {/* AI Node: AI settings */}
                  {selectedNode.data.type === 'ai' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Prompt</label>
                        <textarea
                          value={selectedNode.data.prompt || ''}
                          onChange={(e) => updateNodeData('prompt', e.target.value)}
                          rows={5}
                          className="w-full px-3 py-2 text-xs rounded-lg border outline-none resize-none focus:ring-2 focus:ring-orange-200"
                          style={{ borderColor: '#d4d4d4' }}
                          placeholder="Enter AI prompt..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Model</label>
                        <select
                          value={selectedNode.data.model || 'gpt-4'}
                          onChange={(e) => updateNodeData('model', e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border outline-none focus:ring-2 focus:ring-orange-200"
                          style={{ borderColor: '#d4d4d4' }}
                        >
                          <option value="gpt-4">GPT-4</option>
                          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                          <option value="claude-3">Claude 3</option>
                        </select>
                      </div>
                    </>
                  )}

                  {/* Email Node: Email settings */}
                  {selectedNode.data.type === 'email' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">To</label>
                        <input
                          type="email"
                          value={selectedNode.data.to || ''}
                          onChange={(e) => updateNodeData('to', e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border outline-none focus:ring-2 focus:ring-orange-200"
                          style={{ borderColor: '#d4d4d4' }}
                          placeholder="recipient@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Subject</label>
                        <input
                          type="text"
                          value={selectedNode.data.subject || ''}
                          onChange={(e) => updateNodeData('subject', e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border outline-none focus:ring-2 focus:ring-orange-200"
                          style={{ borderColor: '#d4d4d4' }}
                          placeholder="Email subject..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Body</label>
                        <textarea
                          value={selectedNode.data.body || ''}
                          onChange={(e) => updateNodeData('body', e.target.value)}
                          rows={5}
                          className="w-full px-3 py-2 text-xs rounded-lg border outline-none resize-none focus:ring-2 focus:ring-orange-200"
                          style={{ borderColor: '#d4d4d4' }}
                          placeholder="Email body..."
                        />
                      </div>
                    </>
                  )}

                  {/* Database Node: Database settings */}
                  {selectedNode.data.type === 'database' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Operation</label>
                        <select
                          value={selectedNode.data.operation || 'select'}
                          onChange={(e) => updateNodeData('operation', e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border outline-none focus:ring-2 focus:ring-orange-200"
                          style={{ borderColor: '#d4d4d4' }}
                        >
                          <option value="select">SELECT</option>
                          <option value="insert">INSERT</option>
                          <option value="update">UPDATE</option>
                          <option value="delete">DELETE</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Table</label>
                        <input
                          type="text"
                          value={selectedNode.data.table || ''}
                          onChange={(e) => updateNodeData('table', e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border outline-none focus:ring-2 focus:ring-orange-200"
                          style={{ borderColor: '#d4d4d4' }}
                          placeholder="Table name..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Query</label>
                        <textarea
                          value={selectedNode.data.query || ''}
                          onChange={(e) => updateNodeData('query', e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 text-xs rounded-lg border outline-none resize-none focus:ring-2 focus:ring-orange-200 font-mono"
                          style={{ borderColor: '#d4d4d4' }}
                          placeholder="Custom SQL query..."
                        />
                      </div>
                    </>
                  )}

                  {/* Code Node: Code settings */}
                  {selectedNode.data.type === 'code' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">JavaScript Code</label>
                      <textarea
                        value={selectedNode.data.code || ''}
                        onChange={(e) => updateNodeData('code', e.target.value)}
                        rows={10}
                        className="w-full px-3 py-2 text-xs rounded-lg border outline-none resize-none focus:ring-2 focus:ring-orange-200 font-mono"
                        style={{ borderColor: '#d4d4d4' }}
                        placeholder="// Enter your code here..."
                      />
                    </div>
                  )}

                  {/* Webhook Node: Webhook settings */}
                  {selectedNode.data.type === 'webhook' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Webhook Path</label>
                      <input
                        type="text"
                        value={selectedNode.data.path || ''}
                        onChange={(e) => updateNodeData('path', e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border outline-none focus:ring-2 focus:ring-orange-200"
                        style={{ borderColor: '#d4d4d4' }}
                        placeholder="/webhook/my-endpoint"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* HTTP Node Tabs Content */}
              {selectedNode.data.type === 'http' && httpActiveTab === 'request' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-gray-700">Query Parameters</h3>
                    <button
                      onClick={addParam}
                      className="text-[11px] text-orange-500 hover:text-orange-600 font-medium"
                    >
                      + Add Parameter
                    </button>
                  </div>
                  <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#e5e5e5' }}>
                    <div className="flex text-[10px] font-medium text-gray-500 uppercase bg-gray-50 border-b" style={{ borderColor: '#e5e5e5' }}>
                      <div className="w-10 px-2 py-2 border-r flex items-center justify-center" style={{ borderColor: '#e5e5e5' }}></div>
                      <div className="flex-1 px-3 py-2 border-r" style={{ borderColor: '#e5e5e5' }}>Key</div>
                      <div className="flex-1 px-3 py-2 border-r" style={{ borderColor: '#e5e5e5' }}>Value</div>
                      <div className="w-40 px-3 py-2 border-r" style={{ borderColor: '#e5e5e5' }}>Description</div>
                      <div className="w-12 px-2 py-2"></div>
                    </div>
                    {/* Dynamic param rows */}
                    {(selectedNode.data.params || []).map((param: { id: number; key: string; value: string; description: string; enabled: boolean }) => (
                      <div key={param.id} className="flex items-center text-xs border-b hover:bg-gray-50" style={{ borderColor: '#e5e5e5' }}>
                        <div className="w-10 px-2 py-2 border-r flex items-center justify-center" style={{ borderColor: '#e5e5e5' }}>
                          <input
                            type="checkbox"
                            className="w-3 h-3 rounded"
                            checked={param.enabled}
                            onChange={(e) => updateParam(param.id, 'enabled', e.target.checked)}
                          />
                        </div>
                        <input
                          type="text"
                          value={param.key}
                          onChange={(e) => updateParam(param.id, 'key', e.target.value)}
                          className="flex-1 px-3 py-2 text-xs outline-none border-r bg-transparent"
                          style={{ borderColor: '#e5e5e5' }}
                          placeholder="Enter key"
                        />
                        <input
                          type="text"
                          value={param.value}
                          onChange={(e) => updateParam(param.id, 'value', e.target.value)}
                          className="flex-1 px-3 py-2 text-xs outline-none border-r bg-transparent"
                          style={{ borderColor: '#e5e5e5' }}
                          placeholder="Enter value"
                        />
                        <input
                          type="text"
                          value={param.description}
                          onChange={(e) => updateParam(param.id, 'description', e.target.value)}
                          className="w-40 px-3 py-2 text-xs outline-none border-r bg-transparent"
                          style={{ borderColor: '#e5e5e5' }}
                          placeholder="Description"
                        />
                        <div className="w-12 px-2 py-2 flex justify-center">
                          <button
                            onClick={() => deleteParam(param.id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {/* Add new row placeholder */}
                    <div
                      onClick={addParam}
                      className="flex items-center text-xs text-gray-400 hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="w-10 px-2 py-2 border-r" style={{ borderColor: '#e5e5e5' }}></div>
                      <div className="flex-1 px-3 py-2">Click to add parameter...</div>
                    </div>
                  </div>
                </div>
              )}

              {/* AUTH TAB */}
              {selectedNode.data.type === 'http' && httpActiveTab === 'auth' && (
                <div className="flex gap-4">
                  {/* Auth Type Selector - Left Sidebar */}
                  <div className="w-44 flex-shrink-0">
                    <h3 className="text-xs font-semibold text-gray-700 mb-2">Type</h3>
                    <div className="space-y-0.5">
                      {[
                        { id: 'none', label: 'No Auth', icon: X },
                        { id: 'basic', label: 'Basic Auth', icon: User },
                        { id: 'bearer', label: 'Bearer Token', icon: Key },
                        { id: 'apiKey', label: 'API Key', icon: Lock },
                        { id: 'oauth2', label: 'OAuth 2.0', icon: Shield },
                        { id: 'digest', label: 'Digest Auth', icon: Hash },
                      ].map(({ id, label, icon: Icon }) => (
                        <button
                          key={id}
                          onClick={() => updateNodeData('authType', id)}
                          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left"
                          style={{
                            backgroundColor: (selectedNode.data.authType || 'none') === id ? '#fff5f0' : 'transparent',
                            color: (selectedNode.data.authType || 'none') === id ? '#ff6c37' : '#6b7280',
                            border: (selectedNode.data.authType || 'none') === id ? '1px solid #ffcbb8' : '1px solid transparent',
                          }}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Auth Fields - Right Content */}
                  <div className="flex-1 bg-white rounded-lg border p-4" style={{ borderColor: '#e5e5e5' }}>
                    {(selectedNode.data.authType === 'none' || !selectedNode.data.authType) && (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                          <X className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-xs text-gray-500">This request does not use any authorization.</p>
                        <p className="text-[10px] text-gray-400 mt-1">Select an auth type from the left to configure.</p>
                      </div>
                    )}

                    {/* Basic Auth Fields */}
                    {selectedNode.data.authType === 'basic' && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-gray-700">Basic Authentication</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-1">Username</label>
                            <input
                              type="text"
                              value={selectedNode.data.basicUser || ''}
                              onChange={(e) => updateNodeData('basicUser', e.target.value)}
                              className="w-full px-3 py-2 text-xs border rounded-lg outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                              style={{ borderColor: '#d4d4d4' }}
                              placeholder="Enter username"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-1">Password</label>
                            <div className="relative">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                value={selectedNode.data.basicPassword || ''}
                                onChange={(e) => updateNodeData('basicPassword', e.target.value)}
                                className="w-full px-3 py-2 pr-8 text-xs border rounded-lg outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                                style={{ borderColor: '#d4d4d4' }}
                                placeholder="Enter password"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bearer Token Fields */}
                    {selectedNode.data.authType === 'bearer' && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-gray-700">Bearer Token</h4>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-500 mb-1">Token</label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={selectedNode.data.bearerToken || ''}
                              onChange={(e) => updateNodeData('bearerToken', e.target.value)}
                              className="w-full px-3 py-2 pr-8 text-xs font-mono border rounded-lg outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                              style={{ borderColor: '#d4d4d4' }}
                              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">Token will be sent as: Authorization: Bearer &lt;token&gt;</p>
                        </div>
                      </div>
                    )}

                    {/* API Key Fields */}
                    {selectedNode.data.authType === 'apiKey' && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-gray-700">API Key</h4>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-1">Add to</label>
                            <select
                              value={selectedNode.data.apiKeyLocation || 'header'}
                              onChange={(e) => updateNodeData('apiKeyLocation', e.target.value)}
                              className="w-full px-3 py-2 text-xs border rounded-lg outline-none focus:ring-2 focus:ring-orange-200"
                              style={{ borderColor: '#d4d4d4' }}
                            >
                              <option value="header">Header</option>
                              <option value="query">Query Params</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-1">Key</label>
                            <input
                              type="text"
                              value={selectedNode.data.apiKeyName || ''}
                              onChange={(e) => updateNodeData('apiKeyName', e.target.value)}
                              className="w-full px-3 py-2 text-xs border rounded-lg outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                              style={{ borderColor: '#d4d4d4' }}
                              placeholder="X-API-Key"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-1">Value</label>
                            <div className="relative">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                value={selectedNode.data.apiKeyValue || ''}
                                onChange={(e) => updateNodeData('apiKeyValue', e.target.value)}
                                className="w-full px-3 py-2 pr-8 text-xs font-mono border rounded-lg outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                                style={{ borderColor: '#d4d4d4' }}
                                placeholder="Enter API key"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* HEADERS TAB */}
              {selectedNode.data.type === 'http' && httpActiveTab === 'headers' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-gray-700">Request Headers</h3>
                    <button
                      onClick={addHeader}
                      className="text-[11px] text-orange-500 hover:text-orange-600 font-medium"
                    >
                      + Add Header
                    </button>
                  </div>
                  <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#e5e5e5' }}>
                    <div className="flex text-[10px] font-medium text-gray-500 uppercase bg-gray-50 border-b" style={{ borderColor: '#e5e5e5' }}>
                      <div className="w-10 px-2 py-2 border-r flex items-center justify-center" style={{ borderColor: '#e5e5e5' }}></div>
                      <div className="flex-1 px-3 py-2 border-r" style={{ borderColor: '#e5e5e5' }}>Key</div>
                      <div className="flex-1 px-3 py-2 border-r" style={{ borderColor: '#e5e5e5' }}>Value</div>
                      <div className="w-40 px-3 py-2 border-r" style={{ borderColor: '#e5e5e5' }}>Description</div>
                      <div className="w-12 px-2 py-2"></div>
                    </div>
                    {/* Content-Type Header (always present) */}
                    <div className="flex items-center text-xs border-b hover:bg-gray-50" style={{ borderColor: '#e5e5e5' }}>
                      <div className="w-10 px-2 py-2 border-r flex items-center justify-center" style={{ borderColor: '#e5e5e5' }}>
                        <input type="checkbox" className="w-3 h-3 rounded" defaultChecked />
                      </div>
                      <div className="flex-1 px-3 py-2 border-r font-medium text-gray-700" style={{ borderColor: '#e5e5e5' }}>Content-Type</div>
                      <select
                        value={selectedNode.data.contentType || 'application/json'}
                        onChange={(e) => updateNodeData('contentType', e.target.value)}
                        className="flex-1 px-3 py-2 text-xs border-r outline-none bg-transparent"
                        style={{ borderColor: '#e5e5e5' }}
                      >
                        <option value="application/json">application/json</option>
                        <option value="application/xml">application/xml</option>
                        <option value="application/x-www-form-urlencoded">x-www-form-urlencoded</option>
                        <option value="multipart/form-data">multipart/form-data</option>
                        <option value="text/plain">text/plain</option>
                      </select>
                      <div className="w-40 px-3 py-2 border-r text-gray-400" style={{ borderColor: '#e5e5e5' }}>Auto</div>
                      <div className="w-12 px-2 py-2"></div>
                    </div>
                    {/* Dynamic header rows */}
                    {(selectedNode.data.headers || []).map((header: { id: number; key: string; value: string; description: string; enabled: boolean }) => (
                      <div key={header.id} className="flex items-center text-xs border-b hover:bg-gray-50" style={{ borderColor: '#e5e5e5' }}>
                        <div className="w-10 px-2 py-2 border-r flex items-center justify-center" style={{ borderColor: '#e5e5e5' }}>
                          <input
                            type="checkbox"
                            className="w-3 h-3 rounded"
                            checked={header.enabled}
                            onChange={(e) => updateHeader(header.id, 'enabled', e.target.checked)}
                          />
                        </div>
                        <input
                          type="text"
                          value={header.key}
                          onChange={(e) => updateHeader(header.id, 'key', e.target.value)}
                          className="flex-1 px-3 py-2 text-xs outline-none border-r bg-transparent"
                          style={{ borderColor: '#e5e5e5' }}
                          placeholder="Enter header name"
                        />
                        <input
                          type="text"
                          value={header.value}
                          onChange={(e) => updateHeader(header.id, 'value', e.target.value)}
                          className="flex-1 px-3 py-2 text-xs outline-none border-r bg-transparent"
                          style={{ borderColor: '#e5e5e5' }}
                          placeholder="Enter value"
                        />
                        <input
                          type="text"
                          value={header.description}
                          onChange={(e) => updateHeader(header.id, 'description', e.target.value)}
                          className="w-40 px-3 py-2 text-xs outline-none border-r bg-transparent"
                          style={{ borderColor: '#e5e5e5' }}
                          placeholder="Description"
                        />
                        <div className="w-12 px-2 py-2 flex justify-center">
                          <button
                            onClick={() => deleteHeader(header.id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {/* Add new row placeholder */}
                    <div
                      onClick={addHeader}
                      className="flex items-center text-xs text-gray-400 hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="w-10 px-2 py-2 border-r" style={{ borderColor: '#e5e5e5' }}></div>
                      <div className="flex-1 px-3 py-2">Click to add header...</div>
                    </div>
                  </div>
                </div>
              )}

              {/* BODY TAB */}
              {selectedNode.data.type === 'http' && httpActiveTab === 'body' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-gray-700">Request Body</h3>

                  {/* Body type selector */}
                  <div className="flex items-center gap-4 p-3 bg-white rounded-lg border" style={{ borderColor: '#e5e5e5' }}>
                    {[
                      { id: 'none', label: 'none' },
                      { id: 'form', label: 'form-data' },
                      { id: 'urlencoded', label: 'x-www-form-urlencoded' },
                      { id: 'raw', label: 'raw' },
                      { id: 'binary', label: 'binary' },
                      { id: 'graphql', label: 'GraphQL' },
                    ].map(({ id, label }) => (
                      <label key={id} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="bodyType"
                          checked={(selectedNode.data.bodyType || 'none') === id}
                          onChange={() => updateNodeData('bodyType', id)}
                          className="w-3 h-3"
                          style={{ accentColor: '#ff6c37' }}
                        />
                        <span className={`text-xs ${(selectedNode.data.bodyType || 'none') === id ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* Body content */}
                  {(selectedNode.data.bodyType === 'none' || !selectedNode.data.bodyType) && (
                    <div className="text-center py-8 bg-white rounded-lg border" style={{ borderColor: '#e5e5e5' }}>
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <FileText className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-xs text-gray-500">This request does not have a body</p>
                      <p className="text-[10px] text-gray-400 mt-1">Select a body type above to add content</p>
                    </div>
                  )}

                  {/* Raw/JSON Editor */}
                  {['raw', 'graphql'].includes(selectedNode.data.bodyType || '') && (
                    <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#e5e5e5' }}>
                      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b" style={{ borderColor: '#e5e5e5' }}>
                        <select className="text-xs px-2 py-1 border rounded outline-none" style={{ borderColor: '#d4d4d4' }}>
                          <option>JSON</option>
                          <option>Text</option>
                          <option>JavaScript</option>
                          <option>HTML</option>
                          <option>XML</option>
                        </select>
                        <button className="text-[10px] text-orange-500 hover:text-orange-600 font-medium">Beautify</button>
                      </div>
                      <textarea
                        value={selectedNode.data.body || ''}
                        onChange={(e) => updateNodeData('body', e.target.value)}
                        rows={16}
                        className="w-full px-3 py-2 text-xs font-mono outline-none resize-none"
                        style={{ lineHeight: '1.5' }}
                        placeholder={selectedNode.data.bodyType === 'graphql'
                          ? 'query {\n  user(id: 1) {\n    name\n    email\n  }\n}'
                          : '{\n  "key": "value",\n  "items": []\n}'}
                      />
                    </div>
                  )}

                  {/* Form Data Table */}
                  {selectedNode.data.bodyType === 'form' && (
                    <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#e5e5e5' }}>
                      <div className="flex text-[10px] font-medium text-gray-500 uppercase bg-gray-50 border-b" style={{ borderColor: '#e5e5e5' }}>
                        <div className="w-10 px-2 py-2 border-r" style={{ borderColor: '#e5e5e5' }}></div>
                        <div className="flex-1 px-3 py-2 border-r" style={{ borderColor: '#e5e5e5' }}>Key</div>
                        <div className="flex-1 px-3 py-2 border-r" style={{ borderColor: '#e5e5e5' }}>Value</div>
                        <div className="w-24 px-3 py-2 border-r" style={{ borderColor: '#e5e5e5' }}>Type</div>
                        <div className="w-12 px-2 py-2"></div>
                      </div>
                      <div className="flex items-center text-xs text-gray-400 hover:bg-gray-50 cursor-pointer">
                        <div className="w-10 px-2 py-2 border-r" style={{ borderColor: '#e5e5e5' }}></div>
                        <div className="flex-1 px-3 py-2">Click to add form field...</div>
                      </div>
                    </div>
                  )}

                  {/* URL Encoded Table */}
                  {selectedNode.data.bodyType === 'urlencoded' && (
                    <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#e5e5e5' }}>
                      <div className="flex text-[10px] font-medium text-gray-500 uppercase bg-gray-50 border-b" style={{ borderColor: '#e5e5e5' }}>
                        <div className="w-10 px-2 py-2 border-r" style={{ borderColor: '#e5e5e5' }}></div>
                        <div className="flex-1 px-3 py-2 border-r" style={{ borderColor: '#e5e5e5' }}>Key</div>
                        <div className="flex-1 px-3 py-2 border-r" style={{ borderColor: '#e5e5e5' }}>Value</div>
                        <div className="w-12 px-2 py-2"></div>
                      </div>
                      <div className="flex items-center text-xs text-gray-400 hover:bg-gray-50 cursor-pointer">
                        <div className="w-10 px-2 py-2 border-r" style={{ borderColor: '#e5e5e5' }}></div>
                        <div className="flex-1 px-3 py-2">Click to add field...</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SETTINGS TAB */}
              {selectedNode.data.type === 'http' && httpActiveTab === 'options' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-gray-700">Request Settings</h3>

                  <div className="bg-white rounded-lg border divide-y" style={{ borderColor: '#e5e5e5' }}>
                    {/* Timeout */}
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                          <Timer className="w-3.5 h-3.5 text-blue-500" />
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-700">Request Timeout</div>
                          <div className="text-[10px] text-gray-400">Maximum time to wait for response</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={selectedNode.data.timeout || 30000}
                          onChange={(e) => updateNodeData('timeout', e.target.value)}
                          className="w-20 px-2 py-1.5 text-xs border rounded-lg outline-none text-right focus:ring-2 focus:ring-orange-200"
                          style={{ borderColor: '#d4d4d4' }}
                        />
                        <span className="text-xs text-gray-400">ms</span>
                      </div>
                    </div>

                    {/* Follow Redirects */}
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
                          <ExternalLink className="w-3.5 h-3.5 text-purple-500" />
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-700">Follow Redirects</div>
                          <div className="text-[10px] text-gray-400">Automatically follow HTTP 3xx responses</div>
                        </div>
                      </div>
                      <button
                        onClick={() => updateNodeData('followRedirects', !selectedNode.data.followRedirects)}
                        className="relative w-10 h-5 rounded-full transition-colors"
                        style={{ backgroundColor: selectedNode.data.followRedirects !== false ? '#ff6c37' : '#d4d4d4' }}
                      >
                        <span
                          className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                          style={{ left: selectedNode.data.followRedirects !== false ? '22px' : '2px' }}
                        />
                      </button>
                    </div>

                    {/* SSL Verification */}
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                          <Shield className="w-3.5 h-3.5 text-green-500" />
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-700">SSL Certificate Verification</div>
                          <div className="text-[10px] text-gray-400">Verify server SSL certificates</div>
                        </div>
                      </div>
                      <button
                        onClick={() => updateNodeData('verifySSL', !selectedNode.data.verifySSL)}
                        className="relative w-10 h-5 rounded-full transition-colors"
                        style={{ backgroundColor: selectedNode.data.verifySSL !== false ? '#ff6c37' : '#d4d4d4' }}
                      >
                        <span
                          className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                          style={{ left: selectedNode.data.verifySSL !== false ? '22px' : '2px' }}
                        />
                      </button>
                    </div>

                    {/* Retries */}
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                          <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-700">Max Retries</div>
                          <div className="text-[10px] text-gray-400">Number of retry attempts on failure</div>
                        </div>
                      </div>
                      <input
                        type="number"
                        value={selectedNode.data.maxRetries || 0}
                        onChange={(e) => updateNodeData('maxRetries', e.target.value)}
                        className="w-16 px-2 py-1.5 text-xs border rounded-lg outline-none text-right focus:ring-2 focus:ring-orange-200"
                        style={{ borderColor: '#d4d4d4' }}
                        min="0"
                        max="10"
                      />
                    </div>

                    {/* Retry Delay */}
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center">
                          <Clock className="w-3.5 h-3.5 text-rose-500" />
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-700">Retry Delay</div>
                          <div className="text-[10px] text-gray-400">Delay between retry attempts</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={selectedNode.data.retryDelay || 1000}
                          onChange={(e) => updateNodeData('retryDelay', e.target.value)}
                          className="w-20 px-2 py-1.5 text-xs border rounded-lg outline-none text-right focus:ring-2 focus:ring-orange-200"
                          style={{ borderColor: '#d4d4d4' }}
                          min="100"
                        />
                        <span className="text-xs text-gray-400">ms</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* RESPONSE TAB */}
              {selectedNode.data.type === 'http' && httpActiveTab === 'response' && (
                <div className="space-y-3">
                  {/* Loading State */}
                  {isRequestLoading && (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex items-center gap-3 text-gray-500">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Sending request...</span>
                      </div>
                    </div>
                  )}

                  {/* Error State */}
                  {httpError && !isRequestLoading && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-red-600 mb-2">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Request Failed</span>
                      </div>
                      <p className="text-xs text-red-600">{httpError}</p>
                    </div>
                  )}

                  {/* Success Response */}
                  {httpResponse && !isRequestLoading && (
                    <>
                      {/* Status Bar */}
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border" style={{ borderColor: '#e5e5e5' }}>
                        <div className="flex items-center gap-3">
                          <span
                            className="px-2.5 py-1 rounded-lg text-xs font-bold"
                            style={{
                              backgroundColor: httpResponse.status < 300 ? '#d1fae5' : httpResponse.status < 400 ? '#fef3c7' : '#fee2e2',
                              color: httpResponse.status < 300 ? '#059669' : httpResponse.status < 400 ? '#d97706' : '#dc2626',
                            }}
                          >
                            {httpResponse.status} {httpResponse.statusText}
                          </span>
                          <span className="text-xs text-gray-500">
                            Time: <span className="font-medium text-gray-700">{httpResponse.time}ms</span>
                          </span>
                          <span className="text-xs text-gray-500">
                            Size: <span className="font-medium text-gray-700">{(httpResponse.body.length / 1024).toFixed(2)} KB</span>
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setHttpResponse(null);
                            setHttpError(null);
                          }}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Clear
                        </button>
                      </div>

                      {/* Response Headers */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">Response Headers</h4>
                        <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#e5e5e5' }}>
                          <div className="max-h-32 overflow-y-auto">
                            {Object.entries(httpResponse.headers).map(([key, value]) => (
                              <div key={key} className="flex text-xs border-b last:border-b-0" style={{ borderColor: '#e5e5e5' }}>
                                <div className="w-40 px-3 py-1.5 font-medium text-gray-600 bg-gray-50 border-r" style={{ borderColor: '#e5e5e5' }}>{key}</div>
                                <div className="flex-1 px-3 py-1.5 text-gray-500 font-mono truncate">{value}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Response Body */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-gray-700">Response Body</h4>
                          <button
                            onClick={() => navigator.clipboard.writeText(httpResponse.body)}
                            className="text-[10px] text-orange-500 hover:text-orange-600 font-medium"
                          >
                            Copy
                          </button>
                        </div>
                        <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#e5e5e5' }}>
                          <pre className="p-3 text-xs font-mono text-gray-700 overflow-auto max-h-80 whitespace-pre-wrap">
                            {httpResponse.body || '(empty response)'}
                          </pre>
                        </div>
                      </div>
                    </>
                  )}

                  {/* No Response Yet */}
                  {!httpResponse && !httpError && !isRequestLoading && (
                    <div className="text-center py-12 bg-white rounded-lg border" style={{ borderColor: '#e5e5e5' }}>
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <Play className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-xs text-gray-500">No response yet</p>
                      <p className="text-[10px] text-gray-400 mt-1">Click "Send" to make a request</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderTop: '1px solid #e5e5e5', backgroundColor: '#ffffff' }}
            >
              <button
                onClick={() => {
                  deleteNode();
                  setShowNodeModal(false);
                }}
                className="px-4 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border flex items-center gap-1.5"
                style={{ borderColor: '#fecaca' }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowNodeModal(false)}
                  className="px-4 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border"
                  style={{ borderColor: '#d4d4d4' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowNodeModal(false)}
                  className="px-4 py-1.5 text-xs font-medium text-white rounded-lg transition-opacity hover:opacity-90 flex items-center gap-1.5"
                  style={{ backgroundColor: '#ff6c37' }}
                >
                  <Check className="w-3.5 h-3.5" />
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrapper component with ReactFlowProvider
export function WorkflowBuilder(props: WorkflowBuilderProps) {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderInner {...props} />
    </ReactFlowProvider>
  );
}
