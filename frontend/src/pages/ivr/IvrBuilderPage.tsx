import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  Panel,
  Handle,
  Position,
  NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Save,
  Play,
  Settings,
  Phone,
  Volume2,
  Keyboard,
  GitBranch,
  Users,
  Voicemail,
  ArrowRight,
  Globe,
  MessageSquare,
  X,
  Plus,
  Trash2,
  ChevronLeft,
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

// Node Types
const nodeTypes = {
  menu: MenuNode,
  play: PlayNode,
  gather: GatherNode,
  queue: QueueNode,
  transfer: TransferNode,
  voicemail: VoicemailNode,
  webhook: WebhookNode,
  end: EndNode,
};

// Custom Node Components
function MenuNode({ data, selected }: NodeProps) {
  return (
    <div className={`px-4 py-3 shadow-md rounded-lg bg-white border-2 ${
      selected ? 'border-blue-500' : 'border-gray-200'
    } min-w-[200px]`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-gray-400" />
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1 bg-purple-100 rounded">
          <Keyboard className="text-purple-600" size={16} />
        </div>
        <span className="font-medium text-sm">Menu</span>
      </div>
      <p className="text-xs text-gray-500 mb-2">{data.label}</p>
      {data.options?.map((opt: { digit: string; label: string }, i: number) => (
        <div key={i} className="relative">
          <div className="text-xs bg-gray-50 px-2 py-1 rounded mb-1">
            Press {opt.digit}: {opt.label}
          </div>
          <Handle
            type="source"
            position={Position.Right}
            id={`digit-${opt.digit}`}
            style={{ top: `${40 + (i * 28)}px` }}
            className="w-2 h-2 !bg-purple-500"
          />
        </div>
      ))}
      <Handle
        type="source"
        position={Position.Right}
        id="invalid"
        style={{ bottom: '10px', top: 'auto' }}
        className="w-2 h-2 !bg-red-500"
      />
    </div>
  );
}

function PlayNode({ data, selected }: NodeProps) {
  return (
    <div className={`px-4 py-3 shadow-md rounded-lg bg-white border-2 ${
      selected ? 'border-blue-500' : 'border-gray-200'
    } min-w-[180px]`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-gray-400" />
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1 bg-green-100 rounded">
          <Volume2 className="text-green-600" size={16} />
        </div>
        <span className="font-medium text-sm">Play Message</span>
      </div>
      <p className="text-xs text-gray-500 line-clamp-2">{data.label || data.ttsText}</p>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-gray-400" />
    </div>
  );
}

function GatherNode({ data, selected }: NodeProps) {
  return (
    <div className={`px-4 py-3 shadow-md rounded-lg bg-white border-2 ${
      selected ? 'border-blue-500' : 'border-gray-200'
    } min-w-[180px]`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-gray-400" />
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1 bg-yellow-100 rounded">
          <Keyboard className="text-yellow-600" size={16} />
        </div>
        <span className="font-medium text-sm">Gather Input</span>
      </div>
      <p className="text-xs text-gray-500">{data.label}</p>
      <p className="text-xs text-gray-400">Digits: {data.numDigits || 4}</p>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-gray-400" />
    </div>
  );
}

function QueueNode({ data, selected }: NodeProps) {
  return (
    <div className={`px-4 py-3 shadow-md rounded-lg bg-white border-2 ${
      selected ? 'border-blue-500' : 'border-gray-200'
    } min-w-[180px]`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-gray-400" />
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1 bg-blue-100 rounded">
          <Users className="text-blue-600" size={16} />
        </div>
        <span className="font-medium text-sm">Add to Queue</span>
      </div>
      <p className="text-xs text-gray-500">{data.label || data.queueName}</p>
    </div>
  );
}

function TransferNode({ data, selected }: NodeProps) {
  return (
    <div className={`px-4 py-3 shadow-md rounded-lg bg-white border-2 ${
      selected ? 'border-blue-500' : 'border-gray-200'
    } min-w-[180px]`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-gray-400" />
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1 bg-orange-100 rounded">
          <ArrowRight className="text-orange-600" size={16} />
        </div>
        <span className="font-medium text-sm">Transfer</span>
      </div>
      <p className="text-xs text-gray-500">{data.label || data.number}</p>
      <p className="text-xs text-gray-400">{data.transferType || 'cold'} transfer</p>
    </div>
  );
}

function VoicemailNode({ data, selected }: NodeProps) {
  return (
    <div className={`px-4 py-3 shadow-md rounded-lg bg-white border-2 ${
      selected ? 'border-blue-500' : 'border-gray-200'
    } min-w-[180px]`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-gray-400" />
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1 bg-indigo-100 rounded">
          <Voicemail className="text-indigo-600" size={16} />
        </div>
        <span className="font-medium text-sm">Voicemail</span>
      </div>
      <p className="text-xs text-gray-500">{data.label}</p>
    </div>
  );
}

function WebhookNode({ data, selected }: NodeProps) {
  return (
    <div className={`px-4 py-3 shadow-md rounded-lg bg-white border-2 ${
      selected ? 'border-blue-500' : 'border-gray-200'
    } min-w-[180px]`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-gray-400" />
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1 bg-teal-100 rounded">
          <Globe className="text-teal-600" size={16} />
        </div>
        <span className="font-medium text-sm">Webhook</span>
      </div>
      <p className="text-xs text-gray-500 truncate">{data.label || data.webhookUrl}</p>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-gray-400" />
    </div>
  );
}

function EndNode({ data, selected }: NodeProps) {
  return (
    <div className={`px-4 py-3 shadow-md rounded-lg bg-white border-2 ${
      selected ? 'border-blue-500' : 'border-gray-200'
    } min-w-[140px]`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-gray-400" />
      <div className="flex items-center gap-2">
        <div className="p-1 bg-red-100 rounded">
          <X className="text-red-600" size={16} />
        </div>
        <span className="font-medium text-sm">End Call</span>
      </div>
      {data.message && (
        <p className="text-xs text-gray-500 mt-1">{data.message}</p>
      )}
    </div>
  );
}

// Node Palette Item
interface PaletteItem {
  type: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const paletteItems: PaletteItem[] = [
  { type: 'play', label: 'Play Message', icon: <Volume2 size={16} />, color: 'bg-green-100 text-green-600' },
  { type: 'menu', label: 'IVR Menu', icon: <Keyboard size={16} />, color: 'bg-purple-100 text-purple-600' },
  { type: 'gather', label: 'Gather Input', icon: <MessageSquare size={16} />, color: 'bg-yellow-100 text-yellow-600' },
  { type: 'queue', label: 'Add to Queue', icon: <Users size={16} />, color: 'bg-blue-100 text-blue-600' },
  { type: 'transfer', label: 'Transfer', icon: <ArrowRight size={16} />, color: 'bg-orange-100 text-orange-600' },
  { type: 'voicemail', label: 'Voicemail', icon: <Voicemail size={16} />, color: 'bg-indigo-100 text-indigo-600' },
  { type: 'webhook', label: 'Webhook', icon: <Globe size={16} />, color: 'bg-teal-100 text-teal-600' },
  { type: 'end', label: 'End Call', icon: <X size={16} />, color: 'bg-red-100 text-red-600' },
];

export const IvrBuilderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [flow, setFlow] = useState<{
    id?: string;
    name: string;
    description: string;
    welcomeMessage: string;
    timeoutSeconds: number;
    maxRetries: number;
    isActive: boolean;
  }>({
    name: '',
    description: '',
    welcomeMessage: '',
    timeoutSeconds: 10,
    maxRetries: 3,
    isActive: false,
  });

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isNew && id) {
      fetchFlow();
    }
  }, [id, isNew]);

  const fetchFlow = async () => {
    try {
      const response = await api.get(`/ivr/flows/${id}`);
      const data = response.data.data;
      setFlow({
        id: data.id,
        name: data.name,
        description: data.description || '',
        welcomeMessage: data.welcomeMessage || '',
        timeoutSeconds: data.timeoutSeconds,
        maxRetries: data.maxRetries,
        isActive: data.isActive,
      });
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
    } catch (error) {
      toast.error('Failed to load IVR flow');
      navigate('/ivr');
    }
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = {
        x: event.clientX - 250,
        y: event.clientY - 100,
      };

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label: `New ${type}`, options: type === 'menu' ? [{ digit: '1', label: 'Option 1' }] : undefined },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleSave = async () => {
    if (!flow.name) {
      toast.error('Please enter a flow name');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: flow.name,
        description: flow.description,
        welcomeMessage: flow.welcomeMessage,
        timeoutSeconds: flow.timeoutSeconds,
        maxRetries: flow.maxRetries,
        nodes,
        edges,
      };

      if (isNew) {
        const response = await api.post('/ivr/flows', payload);
        toast.success('IVR flow created');
        navigate(`/ivr/${response.data.data.id}`);
      } else {
        await api.put(`/ivr/flows/${id}`, payload);
        toast.success('IVR flow saved');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save flow');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (isNew) {
      toast.error('Save the flow first before publishing');
      return;
    }

    try {
      await api.post(`/ivr/flows/${id}/publish`);
      setFlow(prev => ({ ...prev, isActive: true }));
      toast.success('IVR flow published');
    } catch (error) {
      toast.error('Failed to publish flow');
    }
  };

  const handleDeleteNode = () => {
    if (!selectedNode) return;
    setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
    setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  };

  const updateNodeData = (key: string, value: unknown) => {
    if (!selectedNode) return;
    setNodes(nds =>
      nds.map(n =>
        n.id === selectedNode.id
          ? { ...n, data: { ...n.data, [key]: value } }
          : n
      )
    );
    setSelectedNode(prev => prev ? { ...prev, data: { ...prev.data, [key]: value } } : null);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/ivr')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <input
              type="text"
              value={flow.name}
              onChange={(e) => setFlow(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter flow name..."
              className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-0"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Settings"
          >
            <Settings size={20} />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handlePublish}
            disabled={isNew}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg disabled:opacity-50"
          >
            <Play size={18} />
            Publish
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Node Palette */}
        <div className="w-64 bg-white border-r p-4">
          <h3 className="font-medium text-gray-700 mb-3">Drag nodes to canvas</h3>
          <div className="space-y-2">
            {paletteItems.map((item) => (
              <div
                key={item.type}
                draggable
                onDragStart={(e) => handleDragStart(e, item.type)}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-grab hover:bg-gray-100 border border-gray-200"
              >
                <div className={`p-2 rounded ${item.color}`}>
                  {item.icon}
                </div>
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1" onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
          >
            <Controls />
            <MiniMap />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          </ReactFlow>
        </div>

        {/* Node Properties Panel */}
        {selectedNode && (
          <div className="w-80 bg-white border-l p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Node Properties</h3>
              <button
                onClick={handleDeleteNode}
                className="p-2 text-red-600 hover:bg-red-50 rounded"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Label
                </label>
                <input
                  type="text"
                  value={selectedNode.data.label || ''}
                  onChange={(e) => updateNodeData('label', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {selectedNode.type === 'play' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Text to Speech
                    </label>
                    <textarea
                      value={selectedNode.data.ttsText || ''}
                      onChange={(e) => updateNodeData('ttsText', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Or Audio URL
                    </label>
                    <input
                      type="text"
                      value={selectedNode.data.audioUrl || ''}
                      onChange={(e) => updateNodeData('audioUrl', e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {selectedNode.type === 'menu' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Menu Options
                  </label>
                  {(selectedNode.data.options || []).map((opt: { digit: string; label: string }, i: number) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={opt.digit}
                        onChange={(e) => {
                          const newOpts = [...(selectedNode.data.options || [])];
                          newOpts[i] = { ...newOpts[i], digit: e.target.value };
                          updateNodeData('options', newOpts);
                        }}
                        className="w-16 px-2 py-1 border rounded text-center"
                        placeholder="#"
                      />
                      <input
                        type="text"
                        value={opt.label}
                        onChange={(e) => {
                          const newOpts = [...(selectedNode.data.options || [])];
                          newOpts[i] = { ...newOpts[i], label: e.target.value };
                          updateNodeData('options', newOpts);
                        }}
                        className="flex-1 px-2 py-1 border rounded"
                        placeholder="Option label"
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const newOpts = [...(selectedNode.data.options || []), { digit: '', label: '' }];
                      updateNodeData('options', newOpts);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Add Option
                  </button>
                </div>
              )}

              {selectedNode.type === 'transfer' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Transfer To
                    </label>
                    <input
                      type="text"
                      value={selectedNode.data.number || ''}
                      onChange={(e) => updateNodeData('number', e.target.value)}
                      placeholder="+1234567890"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Transfer Type
                    </label>
                    <select
                      value={selectedNode.data.transferType || 'cold'}
                      onChange={(e) => updateNodeData('transferType', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="cold">Cold Transfer</option>
                      <option value="warm">Warm Transfer</option>
                    </select>
                  </div>
                </>
              )}

              {selectedNode.type === 'end' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Goodbye Message
                  </label>
                  <textarea
                    value={selectedNode.data.message || ''}
                    onChange={(e) => updateNodeData('message', e.target.value)}
                    rows={2}
                    placeholder="Thank you for calling. Goodbye."
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Flow Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={flow.description}
                  onChange={(e) => setFlow(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Welcome Message
                </label>
                <textarea
                  value={flow.welcomeMessage}
                  onChange={(e) => setFlow(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Welcome to our company..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Timeout (seconds)
                  </label>
                  <input
                    type="number"
                    value={flow.timeoutSeconds}
                    onChange={(e) => setFlow(prev => ({ ...prev, timeoutSeconds: parseInt(e.target.value) || 10 }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Retries
                  </label>
                  <input
                    type="number"
                    value={flow.maxRetries}
                    onChange={(e) => setFlow(prev => ({ ...prev, maxRetries: parseInt(e.target.value) || 3 }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
