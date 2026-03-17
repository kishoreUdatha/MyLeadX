/**
 * Call Flow Builder Types
 * Type definitions for the visual flow builder
 */

import { Node, Edge } from 'reactflow';
import { LucideIcon } from 'lucide-react';

export type NodeType = 'start' | 'greeting' | 'question' | 'condition' | 'ai_response' | 'action' | 'transfer' | 'end';

export interface NodeData {
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

export interface NodePaletteItem {
  type: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
}

export interface ActionTypeOption {
  value: string;
  label: string;
}

export interface OutcomeTypeOption {
  value: string;
  label: string;
}

export interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}
