/**
 * IVR Builder Custom Node Components
 * ReactFlow node types for the IVR flow canvas
 */

import { Handle, Position, NodeProps } from 'reactflow';
import {
  Keyboard,
  Volume2,
  Users,
  ArrowRight,
  Voicemail,
  Globe,
  X,
} from 'lucide-react';
import { MenuOption } from '../ivr-builder.types';

// Menu Node
export function MenuNode({ data, selected }: NodeProps) {
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
      {data.options?.map((opt: MenuOption, i: number) => (
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

// Play Message Node
export function PlayNode({ data, selected }: NodeProps) {
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

// Gather Input Node
export function GatherNode({ data, selected }: NodeProps) {
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

// Queue Node
export function QueueNode({ data, selected }: NodeProps) {
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

// Transfer Node
export function TransferNode({ data, selected }: NodeProps) {
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

// Voicemail Node
export function VoicemailNode({ data, selected }: NodeProps) {
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

// Webhook Node
export function WebhookNode({ data, selected }: NodeProps) {
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

// End Call Node
export function EndNode({ data, selected }: NodeProps) {
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

// Node types map for ReactFlow
export const nodeTypes = {
  menu: MenuNode,
  play: PlayNode,
  gather: GatherNode,
  queue: QueueNode,
  transfer: TransferNode,
  voicemail: VoicemailNode,
  webhook: WebhookNode,
  end: EndNode,
};
