/**
 * IVR Builder Types
 */

import { Node, Edge } from 'reactflow';

export interface FlowState {
  id?: string;
  name: string;
  description: string;
  welcomeMessage: string;
  timeoutSeconds: number;
  maxRetries: number;
  isActive: boolean;
}

export interface PaletteItem {
  type: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

export interface MenuOption {
  digit: string;
  label: string;
}

export interface MenuNodeData {
  label: string;
  options?: MenuOption[];
}

export interface PlayNodeData {
  label: string;
  ttsText?: string;
  audioUrl?: string;
}

export interface GatherNodeData {
  label: string;
  numDigits?: number;
}

export interface QueueNodeData {
  label: string;
  queueName?: string;
}

export interface TransferNodeData {
  label: string;
  number?: string;
  transferType?: 'cold' | 'warm';
}

export interface VoicemailNodeData {
  label: string;
}

export interface WebhookNodeData {
  label: string;
  webhookUrl?: string;
}

export interface EndNodeData {
  label?: string;
  message?: string;
}

export type IvrNodeData =
  | MenuNodeData
  | PlayNodeData
  | GatherNodeData
  | QueueNodeData
  | TransferNodeData
  | VoicemailNodeData
  | WebhookNodeData
  | EndNodeData;

export interface IvrBuilderState {
  flow: FlowState;
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
  showSettings: boolean;
  saving: boolean;
}
