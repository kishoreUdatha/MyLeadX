/**
 * Flow Builder Hook
 * Manages state and logic for the visual flow builder
 */

import { useState, useCallback, useEffect, useRef, DragEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  useReactFlow,
} from 'reactflow';
import api from '../../../services/api';
import { NodeType, NodeData, ToastState, FlowTemplate } from '../call-flow-builder.types';
import { nodePalette, initialNodes } from '../call-flow-builder.constants';

interface UseFlowBuilderReturn {
  // State
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
  flowName: string;
  flowDescription: string;
  loading: boolean;
  saving: boolean;
  showTemplates: boolean;
  toast: ToastState | null;
  isEditMode: boolean;

  // Actions
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  setSelectedNode: (node: Node | null) => void;
  setFlowName: (name: string) => void;
  setFlowDescription: (desc: string) => void;
  setShowTemplates: (show: boolean) => void;
  onNodesChange: any;
  onEdgesChange: any;
  onConnect: (params: Connection) => void;
  onDragOver: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  updateNodeData: (nodeId: string, newData: Partial<NodeData>) => void;
  deleteNode: (nodeId: string) => void;
  loadTemplate: (template: FlowTemplate) => void;
  autoLayout: () => void;
  saveFlow: () => Promise<void>;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  reactFlowWrapper: React.RefObject<HTMLDivElement>;
}

export function useFlowBuilder(): UseFlowBuilderReturn {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { project } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [flowName, setFlowName] = useState('Untitled Flow');
  const [flowDescription, setFlowDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTemplates, setShowTemplates] = useState(!isEditMode);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Toast helper
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Load existing flow
  useEffect(() => {
    if (isEditMode && id) {
      const loadFlow = async () => {
        try {
          setLoading(true);
          const response = await api.get(`/call-flows/${id}`);
          const flow = response.data.data;
          setFlowName(flow.name);
          setFlowDescription(flow.description || '');
          if (flow.nodes) setNodes(flow.nodes);
          if (flow.edges) setEdges(flow.edges);
          setShowTemplates(false);
        } catch (error) {
          console.error('Failed to load flow:', error);
          showToast('Failed to load flow', 'error');
        } finally {
          setLoading(false);
        }
      };
      loadFlow();
    }
  }, [id, isEditMode, setNodes, setEdges, showToast]);

  // Connection handler
  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) =>
      addEdge({
        ...params,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6B7280' },
        style: { strokeWidth: 2, stroke: '#6B7280' },
        animated: true,
      }, eds)
    );
  }, [setEdges]);

  // Drag and drop handlers
  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow') as NodeType;
    if (!type || !reactFlowWrapper.current) return;

    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const position = project({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });

    const paletteItem = nodePalette.find(n => n.type === type);
    const newNode: Node = {
      id: `${type}_${Date.now()}`,
      type,
      position,
      data: {
        label: paletteItem?.label || type,
        ...(type === 'greeting' && { message: 'Hello! How can I help you today?' }),
        ...(type === 'question' && { question: 'What would you like to know?', variableName: 'response', variableType: 'text' }),
        ...(type === 'ai_response' && { aiPrompt: 'Respond naturally based on the context.' }),
        ...(type === 'end' && { outcomeType: 'COMPLETED' }),
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setSelectedNode(newNode);
    showToast(`Added ${paletteItem?.label}`, 'success');
  }, [project, setNodes, showToast]);

  // Node click handler
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // Update node data
  const updateNodeData = useCallback((nodeId: string, newData: Partial<NodeData>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
      )
    );
    setSelectedNode((prev) =>
      prev?.id === nodeId ? { ...prev, data: { ...prev.data, ...newData } } : prev
    );
  }, [setNodes]);

  // Delete node
  const deleteNode = useCallback((nodeId: string) => {
    if (nodeId === 'start') {
      showToast('Cannot delete Start node', 'error');
      return;
    }
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
    showToast('Node deleted', 'info');
  }, [setNodes, setEdges, showToast]);

  // Load template
  const loadTemplate = useCallback((template: FlowTemplate) => {
    setNodes(template.nodes as Node[]);
    setEdges(template.edges.map(e => ({
      ...e,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6B7280' },
      style: { strokeWidth: 2, stroke: '#6B7280' },
      animated: true,
    })));
    setFlowName(template.name);
    setFlowDescription(template.description);
    setShowTemplates(false);
    showToast(`Loaded "${template.name}" template`, 'success');
  }, [setNodes, setEdges, showToast]);

  // Auto-layout nodes
  const autoLayout = useCallback(() => {
    const startNode = nodes.find(n => n.type === 'start');
    if (!startNode) return;

    const visited = new Set<string>();
    const newPositions: Record<string, { x: number; y: number }> = {};
    let currentY = 50;

    const layoutNode = (nodeId: string, x: number) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      newPositions[nodeId] = { x, y: currentY };
      currentY += 140;

      const outgoingEdges = edges.filter(e => e.source === nodeId);
      outgoingEdges.forEach((edge, i) => {
        const offsetX = outgoingEdges.length > 1 ? (i - (outgoingEdges.length - 1) / 2) * 250 : 0;
        layoutNode(edge.target, x + offsetX);
      });
    };

    layoutNode('start', 300);

    setNodes(nds => nds.map(n => ({
      ...n,
      position: newPositions[n.id] || n.position,
    })));

    showToast('Layout organized', 'success');
  }, [nodes, edges, setNodes, showToast]);

  // Save flow
  const saveFlow = useCallback(async () => {
    if (!flowName.trim()) {
      showToast('Please enter a flow name', 'error');
      return;
    }

    try {
      setSaving(true);
      const flowData = { name: flowName, description: flowDescription, nodes, edges };

      if (isEditMode && id) {
        await api.put(`/call-flows/${id}`, flowData);
      } else {
        await api.post('/call-flows', flowData);
      }

      showToast('Flow saved successfully!', 'success');
      setTimeout(() => navigate('/call-flows'), 500);
    } catch (error) {
      console.error('Failed to save:', error);
      showToast('Failed to save flow', 'error');
    } finally {
      setSaving(false);
    }
  }, [flowName, flowDescription, nodes, edges, isEditMode, id, navigate, showToast]);

  return {
    nodes,
    edges,
    selectedNode,
    flowName,
    flowDescription,
    loading,
    saving,
    showTemplates,
    toast,
    isEditMode,
    setNodes,
    setEdges,
    setSelectedNode,
    setFlowName,
    setFlowDescription,
    setShowTemplates,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onDragOver,
    onDrop,
    onNodeClick,
    updateNodeData,
    deleteNode,
    loadTemplate,
    autoLayout,
    saveFlow,
    showToast,
    reactFlowWrapper,
  };
}

export default useFlowBuilder;
