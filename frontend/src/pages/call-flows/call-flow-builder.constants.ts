/**
 * Call Flow Builder Constants
 * Configuration data for the visual flow builder
 */

import { Node } from 'reactflow';
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
import { NodePaletteItem, FlowTemplate, ActionTypeOption, OutcomeTypeOption } from './call-flow-builder.types';

// Node palette configuration
export const nodePalette: NodePaletteItem[] = [
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
export const flowTemplates: FlowTemplate[] = [
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
export const actionTypes: ActionTypeOption[] = [
  { value: 'BOOK_APPOINTMENT', label: 'Book Appointment' },
  { value: 'SEND_SMS', label: 'Send SMS' },
  { value: 'SEND_WHATSAPP', label: 'Send WhatsApp' },
  { value: 'SEND_EMAIL', label: 'Send Email' },
  { value: 'CREATE_LEAD', label: 'Create Lead' },
  { value: 'UPDATE_LEAD', label: 'Update Lead' },
  { value: 'TRIGGER_WEBHOOK', label: 'Trigger Webhook' },
];

// Outcome types
export const outcomeTypes: OutcomeTypeOption[] = [
  { value: 'INTERESTED', label: 'Interested' },
  { value: 'NOT_INTERESTED', label: 'Not Interested' },
  { value: 'CALLBACK_REQUESTED', label: 'Callback Requested' },
  { value: 'APPOINTMENT_BOOKED', label: 'Appointment Booked' },
  { value: 'TRANSFERRED', label: 'Transferred' },
  { value: 'COMPLETED', label: 'Completed' },
];

// Initial nodes state
export const initialNodes: Node[] = [
  { id: 'start', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Start' } },
];

// MiniMap node colors
export const minimapNodeColors: Record<string, string> = {
  start: '#22C55E',
  greeting: '#3B82F6',
  question: '#A855F7',
  condition: '#F59E0B',
  ai_response: '#6366F1',
  action: '#F97316',
  transfer: '#06B6D4',
  end: '#EF4444',
};
