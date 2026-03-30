/**
 * Properties Panel Component
 * Node property editor for the flow builder
 */

import React from 'react';
import { Node } from 'reactflow';
import { Trash2 } from 'lucide-react';
import { NodeData } from '../call-flow-builder.types';
import { actionTypes, outcomeTypes } from '../call-flow-builder.constants';

interface PropertiesPanelProps {
  selectedNode: Node;
  onUpdateNodeData: (nodeId: string, newData: Partial<NodeData>) => void;
  onDeleteNode: (nodeId: string) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedNode,
  onUpdateNodeData,
  onDeleteNode,
}) => {
  return (
    <div className="w-80 bg-white border-l overflow-y-auto">
      <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Edit Node</h3>
        <button
          onClick={() => onDeleteNode(selectedNode.id)}
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
            onChange={(e) => onUpdateNodeData(selectedNode.id, { label: e.target.value })}
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
              onChange={(e) => onUpdateNodeData(selectedNode.id,
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
                onChange={(e) => onUpdateNodeData(selectedNode.id, { question: e.target.value })}
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
                onChange={(e) => onUpdateNodeData(selectedNode.id, { variableName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., name, email, phone"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Answer Type</label>
              <select
                value={selectedNode.data.variableType || 'text'}
                onChange={(e) => onUpdateNodeData(selectedNode.id, { variableType: e.target.value })}
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
                onChange={(e) => onUpdateNodeData(selectedNode.id, {
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
                onChange={(e) => onUpdateNodeData(selectedNode.id, {
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
                onChange={(e) => onUpdateNodeData(selectedNode.id, {
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
              onChange={(e) => onUpdateNodeData(selectedNode.id, { actionType: e.target.value })}
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
              onChange={(e) => onUpdateNodeData(selectedNode.id, { transferNumber: e.target.value })}
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
              onChange={(e) => onUpdateNodeData(selectedNode.id, { outcomeType: e.target.value })}
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
  );
};

export default PropertiesPanel;
