/**
 * Flow Node Components
 * Visual node components for the React Flow builder
 */

import React from 'react';
import { NodeTypes, Handle, Position } from 'reactflow';
import {
  Play,
  MessageSquare,
  HelpCircle,
  GitBranch,
  Phone,
  Zap,
  PhoneOff,
  Sparkles,
} from 'lucide-react';
import { NodeData } from '../call-flow-builder.types';

// Start Node
export const StartNode: React.FC = () => (
  <div className="relative">
    <div className="bg-green-500 text-white px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
      <Play size={12} fill="white" />
      <span className="text-xs font-medium">Start</span>
    </div>
    <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-green-400 !border !border-white !-bottom-1" />
  </div>
);

// Greeting Node
export const GreetingNode: React.FC<{ data: NodeData; selected: boolean }> = ({ data, selected }) => (
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

// Question Node
export const QuestionNode: React.FC<{ data: NodeData; selected: boolean }> = ({ data, selected }) => (
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

// Condition Node
export const ConditionNode: React.FC<{ data: NodeData; selected: boolean }> = ({ data, selected }) => (
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

// AI Response Node
export const AIResponseNode: React.FC<{ data: NodeData; selected: boolean }> = ({ data, selected }) => (
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

// Action Node
export const ActionNode: React.FC<{ data: NodeData; selected: boolean }> = ({ data, selected }) => (
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

// Transfer Node
export const TransferNode: React.FC<{ data: NodeData; selected: boolean }> = ({ data, selected }) => (
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

// End Node
export const EndNode: React.FC<{ data: NodeData; selected: boolean }> = ({ data, selected }) => (
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

// Node types registry for ReactFlow
export const nodeTypes: NodeTypes = {
  start: StartNode,
  greeting: GreetingNode,
  question: QuestionNode,
  condition: ConditionNode,
  ai_response: AIResponseNode,
  action: ActionNode,
  transfer: TransferNode,
  end: EndNode,
};
