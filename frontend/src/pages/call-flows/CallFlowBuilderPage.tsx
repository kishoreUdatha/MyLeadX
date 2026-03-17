import React, { useState, useCallback, useEffect, useRef, DragEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  NodeTypes,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  ArrowLeft,
  Save,
  Play,
  MessageSquare,
  HelpCircle,
  GitBranch,
  Phone,
  Zap,
  PhoneOff,
  Sparkles,
  Loader2,
  Trash2,
  Layout,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
  GripVertical,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
} from 'lucide-react';
import api from '../../services/api';

// Types
type NodeType = 'start' | 'greeting' | 'question' | 'condition' | 'ai_response' | 'action' | 'transfer' | 'end';

interface NodeData {
  label: string;
  message?: string;
  question?: string;
  variableName?: string;
  variableType?: string;
  choices?: string[];
  condition?: { variable: string; operator: string; value: string };
  actionType?: string;
  transferNumber?: string;
  outcomeType?: string;
  aiPrompt?: string;
}

// Compact Node Components
const StartNode = () => (
  <div className="relative">
    <div className="bg-green-500 text-white px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
      <Play size={12} fill="white" />
      <span className="text-xs font-medium">Start</span>
    </div>
    <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-green-400 !border !border-white !-bottom-1" />
  </div>
);

const GreetingNode = ({ data, selected }: { data: NodeData; selected: boolean }) => (
  <div className={`bg-white rounded-lg shadow-md border transition-all w-[160px] ${
    selected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'
  }`}>
    <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-blue-500 !border !border-white !-top-1" />
    <div className="bg-blue-500 text-white px-2 py-1 rounded-t-md flex items-center gap-1.5">
      <MessageSquare size={10} />
      <span className="text-[10px] font-medium truncate">{data.label || 'Greeting'}</span>
    </div>
    <div className="p-2">
      <p className="text-[10px] text-gray-500 line-clamp-2">{data.message || 'Add message...'}</p>
    </div>
    <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-blue-500 !border !border-white !-bottom-1" />
  </div>
);

const QuestionNode = ({ data, selected }: { data: NodeData; selected: boolean }) => (
  <div className={`bg-white rounded-lg shadow-md border transition-all w-[160px] ${
    selected ? 'border-purple-500 ring-2 ring-purple-100' : 'border-gray-200'
  }`}>
    <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-purple-500 !border !border-white !-top-1" />
    <div className="bg-purple-500 text-white px-2 py-1 rounded-t-md flex items-center gap-1.5">
      <HelpCircle size={10} />
      <span className="text-[10px] font-medium truncate">{data.label || 'Question'}</span>
    </div>
    <div className="p-2">
      <p className="text-[10px] text-gray-500 line-clamp-2">{data.question || 'Add question...'}</p>
      {data.variableName && (
        <span className="text-[8px] bg-purple-100 text-purple-600 px-1 rounded mt-1 inline-block">→ {data.variableName}</span>
      )}
    </div>
    <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-purple-500 !border !border-white !-bottom-1" />
  </div>
);

const ConditionNode = ({ data, selected }: { data: NodeData; selected: boolean }) => (
  <div className={`bg-white rounded-lg shadow-md border transition-all w-[140px] ${
    selected ? 'border-amber-500 ring-2 ring-amber-100' : 'border-gray-200'
  }`}>
    <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-amber-500 !border !border-white !-top-1" />
    <div className="bg-amber-500 text-white px-2 py-1 rounded-t-md flex items-center gap-1.5">
      <GitBranch size={10} />
      <span className="text-[10px] font-medium truncate">{data.label || 'Condition'}</span>
    </div>
    <div className="p-2">
      <p className="text-[10px] text-gray-500 truncate">
        {data.condition?.variable ? `${data.condition.variable} ${data.condition.operator}` : 'Set condition...'}
      </p>
      <div className="flex justify-between mt-1 text-[8px]">
        <span className="text-green-600">Yes</span>
        <span className="text-red-600">No</span>
      </div>
    </div>
    <Handle type="source" position={Position.Bottom} id="yes" style={{ left: '30%' }} className="!w-2 !h-2 !bg-green-500 !border !border-white !-bottom-1" />
    <Handle type="source" position={Position.Bottom} id="no" style={{ left: '70%' }} className="!w-2 !h-2 !bg-red-500 !border !border-white !-bottom-1" />
  </div>
);

const AIResponseNode = ({ data, selected }: { data: NodeData; selected: boolean }) => (
  <div className={`bg-white rounded-lg shadow-md border transition-all w-[160px] ${
    selected ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-gray-200'
  }`}>
    <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-indigo-500 !border !border-white !-top-1" />
    <div className="bg-indigo-500 text-white px-2 py-1 rounded-t-md flex items-center gap-1.5">
      <Sparkles size={10} />
      <span className="text-[10px] font-medium truncate">{data.label || 'AI Response'}</span>
    </div>
    <div className="p-2">
      <p className="text-[10px] text-gray-500 line-clamp-2">{data.aiPrompt || 'AI responds...'}</p>
    </div>
    <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-indigo-500 !border !border-white !-bottom-1" />
  </div>
);

const ActionNode = ({ data, selected }: { data: NodeData; selected: boolean }) => (
  <div className={`bg-white rounded-lg shadow-md border transition-all w-[140px] ${
    selected ? 'border-orange-500 ring-2 ring-orange-100' : 'border-gray-200'
  }`}>
    <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-orange-500 !border !border-white !-top-1" />
    <div className="bg-orange-500 text-white px-2 py-1 rounded-t-md flex items-center gap-1.5">
      <Zap size={10} />
      <span className="text-[10px] font-medium truncate">{data.label || 'Action'}</span>
    </div>
    <div className="p-2">
      <p className="text-[10px] text-gray-500 truncate">{data.actionType || 'Select action...'}</p>
    </div>
    <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-orange-500 !border !border-white !-bottom-1" />
  </div>
);

const TransferNode = ({ data, selected }: { data: NodeData; selected: boolean }) => (
  <div className={`bg-white rounded-lg shadow-md border transition-all w-[140px] ${
    selected ? 'border-cyan-500 ring-2 ring-cyan-100' : 'border-gray-200'
  }`}>
    <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-cyan-500 !border !border-white !-top-1" />
    <div className="bg-cyan-500 text-white px-2 py-1 rounded-t-md flex items-center gap-1.5">
      <Phone size={10} />
      <span className="text-[10px] font-medium truncate">{data.label || 'Transfer'}</span>
    </div>
    <div className="p-2">
      <p className="text-[10px] text-gray-500 truncate">{data.transferNumber || 'Set number...'}</p>
    </div>
    <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-cyan-500 !border !border-white !-bottom-1" />
  </div>
);

const EndNode = ({ data, selected }: { data: NodeData; selected: boolean }) => (
  <div className={`bg-white rounded-lg shadow-md border transition-all w-[130px] ${
    selected ? 'border-red-500 ring-2 ring-red-100' : 'border-gray-200'
  }`}>
    <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-red-500 !border !border-white !-top-1" />
    <div className="bg-red-500 text-white px-2 py-1 rounded-t-md flex items-center gap-1.5">
      <PhoneOff size={10} />
      <span className="text-[10px] font-medium truncate">{data.label || 'End'}</span>
    </div>
    <div className="p-2">
      <p className="text-[10px] text-gray-500 truncate">{data.outcomeType || 'Completed'}</p>
    </div>
  </div>
);

const nodeTypes: NodeTypes = {
  start: StartNode,
  greeting: GreetingNode,
  question: QuestionNode,
  condition: ConditionNode,
  ai_response: AIResponseNode,
  action: ActionNode,
  transfer: TransferNode,
  end: EndNode,
};

// Node palette configuration
const nodePalette = [
  { type: 'start', label: 'Start', icon: Play, color: 'bg-green-500' },
  { type: 'greeting', label: 'Greeting', icon: MessageSquare, color: 'bg-blue-500' },
  { type: 'question', label: 'Question', icon: HelpCircle, color: 'bg-purple-500' },
  { type: 'ai_response', label: 'AI Reply', icon: Sparkles, color: 'bg-indigo-500' },
  { type: 'condition', label: 'Condition', icon: GitBranch, color: 'bg-amber-500' },
  { type: 'action', label: 'Action', icon: Zap, color: 'bg-orange-500' },
  { type: 'transfer', label: 'Transfer', icon: Phone, color: 'bg-cyan-500' },
  { type: 'end', label: 'End', icon: PhoneOff, color: 'bg-red-500' },
];

// Flow templates
const flowTemplates = [
  {
    id: 'lead-qualification',
    name: 'Lead Qualification',
    description: 'Qualify leads with key questions',
    nodes: [
      { id: 'start', type: 'start', position: { x: 250, y: 0 }, data: { label: 'Start' } },
      { id: 'greet', type: 'greeting', position: { x: 250, y: 100 }, data: { label: 'Welcome', message: 'Hi! Thank you for your interest. I have a few quick questions.' } },
      { id: 'q1', type: 'question', position: { x: 250, y: 220 }, data: { label: 'Get Name', question: 'May I know your name please?', variableName: 'name', variableType: 'text' } },
      { id: 'q2', type: 'question', position: { x: 250, y: 340 }, data: { label: 'Get Interest', question: 'What are you looking for today?', variableName: 'interest', variableType: 'text' } },
      { id: 'end', type: 'end', position: { x: 250, y: 460 }, data: { label: 'End', outcomeType: 'INTERESTED' } },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'greet' },
      { id: 'e2', source: 'greet', target: 'q1' },
      { id: 'e3', source: 'q1', target: 'q2' },
      { id: 'e4', source: 'q2', target: 'end' },
    ],
  },
  {
    id: 'appointment-booking',
    name: 'Appointment Booking',
    description: 'Schedule appointments with callers',
    nodes: [
      { id: 'start', type: 'start', position: { x: 250, y: 0 }, data: { label: 'Start' } },
      { id: 'greet', type: 'greeting', position: { x: 250, y: 100 }, data: { label: 'Welcome', message: 'Hello! I can help you book an appointment.' } },
      { id: 'q1', type: 'question', position: { x: 250, y: 220 }, data: { label: 'Preferred Date', question: 'What date works best for you?', variableName: 'date', variableType: 'date' } },
      { id: 'action', type: 'action', position: { x: 250, y: 340 }, data: { label: 'Book Slot', actionType: 'BOOK_APPOINTMENT' } },
      { id: 'end', type: 'end', position: { x: 250, y: 460 }, data: { label: 'Confirmed', outcomeType: 'APPOINTMENT_BOOKED' } },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'greet' },
      { id: 'e2', source: 'greet', target: 'q1' },
      { id: 'e3', source: 'q1', target: 'action' },
      { id: 'e4', source: 'action', target: 'end' },
    ],
  },
];

// Action types
const actionTypes = [
  { value: 'BOOK_APPOINTMENT', label: 'Book Appointment' },
  { value: 'SEND_SMS', label: 'Send SMS' },
  { value: 'SEND_WHATSAPP', label: 'Send WhatsApp' },
  { value: 'SEND_EMAIL', label: 'Send Email' },
  { value: 'CREATE_LEAD', label: 'Create Lead' },
  { value: 'UPDATE_LEAD', label: 'Update Lead' },
  { value: 'TRIGGER_WEBHOOK', label: 'Trigger Webhook' },
];

// Outcome types
const outcomeTypes = [
  { value: 'INTERESTED', label: 'Interested' },
  { value: 'NOT_INTERESTED', label: 'Not Interested' },
  { value: 'CALLBACK_REQUESTED', label: 'Callback Requested' },
  { value: 'APPOINTMENT_BOOKED', label: 'Appointment Booked' },
  { value: 'TRANSFERRED', label: 'Transferred' },
  { value: 'COMPLETED', label: 'Completed' },
];

// Initial state
const initialNodes: Node[] = [
  { id: 'start', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Start' } },
];

// Main Component
const FlowBuilder: React.FC = () => {
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
  const [showTestMode, setShowTestMode] = useState(false);
  const [testStep, setTestStep] = useState(0);
  const [testPath, setTestPath] = useState<Node[]>([]);
  const [testInput, setTestInput] = useState('');
  const [testVariables, setTestVariables] = useState<Record<string, string>>({});
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Toast helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

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
  }, [id, isEditMode]);

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
  }, [project, setNodes]);

  // Node click handler
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // Update node data
  const updateNodeData = (nodeId: string, newData: Partial<NodeData>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
      )
    );
    if (selectedNode?.id === nodeId) {
      setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, ...newData } } : null);
    }
  };

  // Delete node
  const deleteNode = (nodeId: string) => {
    if (nodeId === 'start') {
      showToast('Cannot delete Start node', 'error');
      return;
    }
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
    showToast('Node deleted', 'info');
  };

  // Load template
  const loadTemplate = (template: typeof flowTemplates[0]) => {
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
  };

  // Auto-layout nodes
  const autoLayout = () => {
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
  };

  // Save flow
  const saveFlow = async () => {
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
  };

  // Text-to-Speech function
  const speakMessage = (text: string) => {
    if (!voiceEnabled) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Remove emojis for cleaner speech
    const cleanText = text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to use a female voice
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google UK English Female'));
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // Speech Recognition (Voice Input)
  const startListening = () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        showToast('Speech recognition not supported. Use Chrome browser.', 'error');
        return;
      }

      // Stop any ongoing speech first
      stopSpeaking();

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
        showToast('🎤 Listening... Speak now!', 'info');
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Show interim results or final
        setTestInput(finalTranscript || interimTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);

        switch (event.error) {
          case 'not-allowed':
            showToast('❌ Microphone blocked! Click the lock icon in address bar to allow.', 'error');
            break;
          case 'no-speech':
            showToast('No speech detected. Try again.', 'error');
            break;
          case 'audio-capture':
            showToast('No microphone found. Check your device.', 'error');
            break;
          default:
            showToast(`Error: ${event.error}`, 'error');
        }
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      showToast('Failed to start voice input. Use Chrome browser.', 'error');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Test mode functions
  const startTestMode = () => {
    const startNode = nodes.find(n => n.type === 'start');
    if (!startNode) {
      showToast('Add a Start node first', 'error');
      return;
    }

    // Build the path from start node
    const path: Node[] = [startNode];
    let currentNodeId = startNode.id;
    const visited = new Set<string>();

    while (currentNodeId && !visited.has(currentNodeId)) {
      visited.add(currentNodeId);
      const outgoingEdge = edges.find(e => e.source === currentNodeId);
      if (outgoingEdge) {
        const nextNode = nodes.find(n => n.id === outgoingEdge.target);
        if (nextNode) {
          path.push(nextNode);
          currentNodeId = nextNode.id;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    if (path.length <= 1) {
      showToast('Connect nodes to the Start to test', 'error');
      return;
    }

    setTestPath(path);
    setTestStep(0);
    setTestVariables({});
    setTestInput('');
    setShowTestMode(true);

    // Speak the first message after a short delay
    setTimeout(() => {
      if (path[0]) {
        speakMessage(getNodeMessageClean(path[0]));
      }
    }, 500);
  };

  const nextTestStep = () => {
    const currentNode = testPath[testStep];

    // Save variable if it's a question node
    if (currentNode?.type === 'question' && currentNode.data.variableName && testInput) {
      setTestVariables(prev => ({
        ...prev,
        [currentNode.data.variableName!]: testInput
      }));
    }

    setTestInput('');

    if (testStep < testPath.length - 1) {
      const nextStep = testStep + 1;
      setTestStep(nextStep);

      // Speak the next message
      setTimeout(() => {
        if (testPath[nextStep]) {
          speakMessage(getNodeMessageClean(testPath[nextStep]));
        }
      }, 300);
    }
  };

  // Get clean message for TTS (without emojis)
  const getNodeMessageClean = (node: Node): string => {
    switch (node.type) {
      case 'start':
        return 'Call connected';
      case 'greeting':
        return node.data.message || 'Hello! How can I help you today?';
      case 'question':
        return node.data.question || 'Could you please provide more information?';
      case 'ai_response':
        return node.data.aiPrompt || 'I understand. Let me help you with that.';
      case 'action':
        return `Performing action: ${node.data.actionType || 'processing'}`;
      case 'transfer':
        return `Transferring call to ${node.data.transferNumber || 'agent'}`;
      case 'end':
        return `Call ended. Outcome: ${node.data.outcomeType || 'Completed'}`;
      default:
        return node.data.label || 'Processing';
    }
  };

  const getNodeMessage = (node: Node): string => {
    switch (node.type) {
      case 'start':
        return '📞 Call connected...';
      case 'greeting':
        return node.data.message || 'Hello! How can I help you today?';
      case 'question':
        return node.data.question || 'Could you please provide more information?';
      case 'ai_response':
        return `🤖 AI: ${node.data.aiPrompt || 'I understand. Let me help you with that.'}`;
      case 'action':
        return `⚡ Action: ${node.data.actionType || 'Performing action...'}`;
      case 'transfer':
        return `📱 Transferring to ${node.data.transferNumber || 'agent'}...`;
      case 'end':
        return `✅ Call ended: ${node.data.outcomeType || 'Completed'}`;
      default:
        return node.data.label || 'Processing...';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading flow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/call-flows')}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <input
              type="text"
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              className="text-lg font-semibold bg-transparent border-b-2 border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1"
              placeholder="Flow name..."
            />
            <input
              type="text"
              value={flowDescription}
              onChange={(e) => setFlowDescription(e.target.value)}
              placeholder="Add description..."
              className="block text-sm text-gray-500 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none mt-1 px-1 w-80"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={autoLayout}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            title="Auto-arrange nodes"
          >
            <Layout size={18} />
          </button>
          <button
            onClick={() => setShowTemplates(true)}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 transition"
          >
            <FileText size={18} />
            Templates
          </button>
          <button
            onClick={startTestMode}
            className="flex items-center gap-2 px-3 py-2 text-green-600 hover:bg-green-50 rounded-lg border border-green-200 transition"
          >
            <Play size={18} />
            Test
          </button>
          <button
            onClick={saveFlow}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Save
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Node Palette - Compact */}
        <div className="w-48 bg-white border-r p-3 overflow-y-auto">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Drag to canvas</p>

          <div className="grid grid-cols-2 gap-1.5">
            {nodePalette.map((item) => (
              <div
                key={item.type}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/reactflow', item.type);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                className="flex flex-col items-center gap-1 p-2 bg-gray-50 rounded-lg border border-gray-200 cursor-grab hover:bg-gray-100 hover:border-gray-300 transition active:cursor-grabbing active:scale-95"
              >
                <div className={`p-1.5 rounded ${item.color} text-white`}>
                  <item.icon size={12} />
                </div>
                <span className="text-[9px] font-medium text-gray-600 text-center leading-tight">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 p-2 bg-gray-50 rounded-lg">
            <p className="text-[9px] text-gray-500 leading-relaxed">
              Drag nodes onto canvas. Connect by dragging between handles.
            </p>
          </div>
        </div>

        {/* Flow Canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={() => setSelectedNode(null)}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
            defaultEdgeOptions={{
              style: { strokeWidth: 2, stroke: '#6B7280' },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#6B7280' },
              animated: true,
            }}
          >
            <Background gap={20} color="#E5E7EB" />
            <Controls className="bg-white rounded-lg shadow-lg border" />
            <MiniMap
              nodeColor={(node) => {
                const colors: Record<string, string> = {
                  start: '#22C55E',
                  greeting: '#3B82F6',
                  question: '#A855F7',
                  condition: '#F59E0B',
                  ai_response: '#6366F1',
                  action: '#F97316',
                  transfer: '#06B6D4',
                  end: '#EF4444',
                };
                return colors[node.type || ''] || '#9CA3AF';
              }}
              className="bg-white rounded-lg shadow-lg border"
            />
          </ReactFlow>

          {/* Empty state helper */}
          {nodes.length === 1 && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white px-6 py-4 rounded-xl shadow-lg border z-10 max-w-md text-center">
              <p className="text-gray-700 font-medium mb-1">Get Started</p>
              <p className="text-sm text-gray-500">
                Drag a node from the left panel and drop it here, then connect it to the Start node.
              </p>
            </div>
          )}
        </div>

        {/* Properties Panel */}
        {selectedNode && selectedNode.type !== 'start' && (
          <div className="w-80 bg-white border-l overflow-y-auto">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Edit Node</h3>
              <button
                onClick={() => deleteNode(selectedNode.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Delete node"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Label */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                <input
                  type="text"
                  value={selectedNode.data.label || ''}
                  onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Greeting / AI Response fields */}
              {(selectedNode.type === 'greeting' || selectedNode.type === 'ai_response') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {selectedNode.type === 'greeting' ? 'Message' : 'AI Prompt'}
                  </label>
                  <textarea
                    value={selectedNode.type === 'greeting' ? selectedNode.data.message || '' : selectedNode.data.aiPrompt || ''}
                    onChange={(e) => updateNodeData(selectedNode.id,
                      selectedNode.type === 'greeting' ? { message: e.target.value } : { aiPrompt: e.target.value }
                    )}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={selectedNode.type === 'greeting' ? 'What should the agent say?' : 'Instructions for AI response...'}
                  />
                </div>
              )}

              {/* Question fields */}
              {selectedNode.type === 'question' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                    <textarea
                      value={selectedNode.data.question || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { question: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="What question to ask?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Save Answer As</label>
                    <input
                      type="text"
                      value={selectedNode.data.variableName || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { variableName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., name, email, phone"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Answer Type</label>
                    <select
                      value={selectedNode.data.variableType || 'text'}
                      onChange={(e) => updateNodeData(selectedNode.id, { variableType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="date">Date</option>
                      <option value="boolean">Yes/No</option>
                    </select>
                  </div>
                </>
              )}

              {/* Condition fields */}
              {selectedNode.type === 'condition' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Check Variable</label>
                    <input
                      type="text"
                      value={selectedNode.data.condition?.variable || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, {
                        condition: { ...(selectedNode.data.condition || {}), variable: e.target.value } as any
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Variable name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                    <select
                      value={selectedNode.data.condition?.operator || 'equals'}
                      onChange={(e) => updateNodeData(selectedNode.id, {
                        condition: { ...(selectedNode.data.condition || {}), operator: e.target.value } as any
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="equals">Equals</option>
                      <option value="contains">Contains</option>
                      <option value="greater">Greater Than</option>
                      <option value="less">Less Than</option>
                      <option value="exists">Has Value</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                    <input
                      type="text"
                      value={selectedNode.data.condition?.value || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, {
                        condition: { ...(selectedNode.data.condition || {}), value: e.target.value } as any
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Value to compare"
                    />
                  </div>
                </>
              )}

              {/* Action fields */}
              {selectedNode.type === 'action' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
                  <select
                    value={selectedNode.data.actionType || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, { actionType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select action...</option>
                    {actionTypes.map((a) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Transfer fields */}
              {selectedNode.type === 'transfer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transfer To</label>
                  <input
                    type="text"
                    value={selectedNode.data.transferNumber || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, { transferNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+91XXXXXXXXXX"
                  />
                </div>
              )}

              {/* End fields */}
              {selectedNode.type === 'end' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Call Outcome</label>
                  <select
                    value={selectedNode.data.outcomeType || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, { outcomeType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select outcome...</option>
                    {outcomeTypes.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Choose a Template</h2>
                <p className="text-sm text-gray-500 mt-1">Start with a pre-built flow or create from scratch</p>
              </div>
              <button onClick={() => setShowTemplates(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Blank template */}
              <button
                onClick={() => {
                  setNodes(initialNodes);
                  setEdges([]);
                  setFlowName('Untitled Flow');
                  setFlowDescription('');
                  setShowTemplates(false);
                }}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <FileText size={24} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Start from Scratch</p>
                    <p className="text-sm text-gray-500">Create a custom flow</p>
                  </div>
                </div>
              </button>

              {/* Pre-built templates */}
              {flowTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => loadTemplate(template)}
                  className="w-full p-4 border border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Play size={24} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{template.name}</p>
                      <p className="text-sm text-gray-500">{template.description}</p>
                    </div>
                    <div className="text-xs text-gray-400">{template.nodes.length} nodes</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Test Mode Modal */}
      {showTestMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-teal-500 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <div className={`w-10 h-10 bg-white/20 rounded-full flex items-center justify-center ${isSpeaking ? 'animate-pulse' : ''}`}>
                  {isSpeaking ? <Volume2 size={20} /> : <Phone size={20} />}
                </div>
                <div>
                  <p className="font-semibold">Test Call Simulation</p>
                  <p className="text-xs text-white/80">
                    {isSpeaking ? '🔊 Speaking...' : `Step ${testStep + 1} of ${testPath.length}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setVoiceEnabled(!voiceEnabled);
                  if (voiceEnabled) stopSpeaking();
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition"
                title={voiceEnabled ? 'Mute voice' : 'Enable voice'}
              >
                {voiceEnabled ? <Volume2 size={20} className="text-white" /> : <VolumeX size={20} className="text-white" />}
              </button>
              <button
                onClick={() => {
                  stopSpeaking();
                  setShowTestMode(false);
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition"
              >
                <X size={20} className="text-white" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-gray-200">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${((testStep + 1) / testPath.length) * 100}%` }}
              />
            </div>

            {/* Chat simulation */}
            <div className="p-4 h-72 overflow-y-auto bg-gray-50">
              <div className="space-y-3">
                {testPath.slice(0, testStep + 1).map((node, idx) => (
                  <div key={node.id} className="animate-in fade-in slide-in-from-bottom-2">
                    {/* AI Message */}
                    <div className="flex gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <Sparkles size={14} className="text-white" />
                      </div>
                      <div className="bg-white rounded-xl rounded-tl-none px-3 py-2 shadow-sm max-w-[85%]">
                        <p className="text-sm text-gray-700">{getNodeMessage(node)}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{node.data.label}</p>
                      </div>
                    </div>

                    {/* User response (if variable was captured) */}
                    {node.type === 'question' && node.data.variableName && testVariables[node.data.variableName] && (
                      <div className="flex gap-2 justify-end">
                        <div className="bg-blue-500 text-white rounded-xl rounded-tr-none px-3 py-2 shadow-sm max-w-[85%]">
                          <p className="text-sm">{testVariables[node.data.variableName]}</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                          <MessageSquare size={14} className="text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Input area */}
            <div className="p-4 border-t bg-white">
              {testPath[testStep]?.type === 'question' && testStep < testPath.length - 1 ? (
                <div className="space-y-3">
                  {/* Big Mic Button - Center */}
                  <div className="flex justify-center">
                    <button
                      onClick={isListening ? stopListening : startListening}
                      className={`w-16 h-16 rounded-full flex items-center justify-center transition-all transform hover:scale-105 ${
                        isListening
                          ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200'
                          : 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-200'
                      }`}
                      title={isListening ? 'Tap to stop' : 'Tap to speak'}
                    >
                      {isListening ? <MicOff size={28} /> : <Mic size={28} />}
                    </button>
                  </div>

                  {/* Status text */}
                  <p className="text-center text-sm text-gray-500">
                    {isListening ? (
                      <span className="text-red-500 font-medium flex items-center justify-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                        Listening... Speak now
                      </span>
                    ) : (
                      'Tap mic to speak or type below'
                    )}
                  </p>

                  {/* Text input row */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && testInput && nextTestStep()}
                      placeholder="Or type your response here..."
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    />
                    <button
                      onClick={() => {
                        if (testInput) {
                          stopListening();
                          nextTestStep();
                        }
                      }}
                      disabled={!testInput}
                      className="px-5 py-2.5 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
                    >
                      Send
                    </button>
                  </div>
                </div>
              ) : testStep < testPath.length - 1 ? (
                <button
                  onClick={nextTestStep}
                  className="w-full py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 font-medium transition flex items-center justify-center gap-2"
                >
                  Continue
                  <Play size={16} />
                </button>
              ) : (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-green-600 mb-3">
                    <CheckCircle size={20} />
                    <span className="font-medium">Test Complete!</span>
                  </div>
                  {Object.keys(testVariables).length > 0 && (
                    <div className="text-left bg-gray-50 rounded-lg p-3 mb-3">
                      <p className="text-xs font-medium text-gray-500 mb-2">Collected Data:</p>
                      {Object.entries(testVariables).map(([key, value]) => (
                        <p key={key} className="text-sm text-gray-700">
                          <span className="font-medium">{key}:</span> {value}
                        </p>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setTestStep(0);
                      setTestVariables({});
                      setTestInput('');
                    }}
                    className="text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    Run Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 z-50 animate-in slide-in-from-bottom-4 ${
          toast.type === 'success' ? 'bg-green-500 text-white' :
          toast.type === 'error' ? 'bg-red-500 text-white' :
          'bg-gray-800 text-white'
        }`}>
          {toast.type === 'success' && <CheckCircle size={20} />}
          {toast.type === 'error' && <AlertCircle size={20} />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

// Wrap with ReactFlowProvider
const CallFlowBuilderPage: React.FC = () => (
  <ReactFlowProvider>
    <FlowBuilder />
  </ReactFlowProvider>
);

export default CallFlowBuilderPage;
