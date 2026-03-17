/**
 * Call Flow Builder Page
 * Visual flow builder for creating voice AI call flows
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  MarkerType,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  ArrowLeft,
  Save,
  Play,
  Loader2,
  Layout,
  FileText,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { nodeTypes } from './components/FlowNodes';
import { TemplatesModal, TestModeModal } from './components/FlowModals';
import { PropertiesPanel } from './components/PropertiesPanel';
import { useFlowBuilder } from './hooks/useFlowBuilder';
import { useFlowTestMode } from './hooks/useFlowTestMode';
import { nodePalette, initialNodes, minimapNodeColors } from './call-flow-builder.constants';

// Main Flow Builder Component
const FlowBuilder: React.FC = () => {
  const navigate = useNavigate();

  const {
    nodes,
    edges,
    selectedNode,
    flowName,
    flowDescription,
    loading,
    saving,
    showTemplates,
    toast,
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
  } = useFlowBuilder();

  const {
    showTestMode,
    testStep,
    testPath,
    testInput,
    testVariables,
    voiceEnabled,
    isSpeaking,
    isListening,
    setShowTestMode,
    setTestInput,
    setVoiceEnabled,
    startTestMode,
    nextTestStep,
    stopSpeaking,
    startListening,
    stopListening,
    getNodeMessage,
    resetTest,
  } = useFlowTestMode(nodes, edges, showToast);

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
              nodeColor={(node) => minimapNodeColors[node.type || ''] || '#9CA3AF'}
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
          <PropertiesPanel
            selectedNode={selectedNode}
            onUpdateNodeData={updateNodeData}
            onDeleteNode={deleteNode}
          />
        )}
      </div>

      {/* Templates Modal */}
      {showTemplates && (
        <TemplatesModal
          onClose={() => setShowTemplates(false)}
          onLoadTemplate={loadTemplate}
          onStartFromScratch={() => {
            setNodes(initialNodes);
            setEdges([]);
            setFlowName('Untitled Flow');
            setFlowDescription('');
            setShowTemplates(false);
          }}
        />
      )}

      {/* Test Mode Modal */}
      {showTestMode && (
        <TestModeModal
          testPath={testPath}
          testStep={testStep}
          testInput={testInput}
          testVariables={testVariables}
          voiceEnabled={voiceEnabled}
          isSpeaking={isSpeaking}
          isListening={isListening}
          onClose={() => setShowTestMode(false)}
          onToggleVoice={() => setVoiceEnabled(!voiceEnabled)}
          onStopSpeaking={stopSpeaking}
          onSetTestInput={setTestInput}
          onNextStep={nextTestStep}
          onStartListening={startListening}
          onStopListening={stopListening}
          onReset={resetTest}
          getNodeMessage={getNodeMessage}
        />
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
