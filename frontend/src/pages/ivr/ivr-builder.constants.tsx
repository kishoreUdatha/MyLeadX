/**
 * IVR Builder Constants
 */

import {
  Volume2,
  Keyboard,
  Users,
  ArrowRight,
  Voicemail,
  Globe,
  X,
  MessageSquare,
} from 'lucide-react';
import { PaletteItem, FlowState } from './ivr-builder.types';

export const INITIAL_FLOW_STATE: FlowState = {
  name: '',
  description: '',
  welcomeMessage: '',
  timeoutSeconds: 10,
  maxRetries: 3,
  isActive: false,
};

export const PALETTE_ITEMS: PaletteItem[] = [
  { type: 'play', label: 'Play Message', icon: <Volume2 size={16} />, color: 'bg-green-100 text-green-600' },
  { type: 'menu', label: 'IVR Menu', icon: <Keyboard size={16} />, color: 'bg-purple-100 text-purple-600' },
  { type: 'gather', label: 'Gather Input', icon: <MessageSquare size={16} />, color: 'bg-yellow-100 text-yellow-600' },
  { type: 'queue', label: 'Add to Queue', icon: <Users size={16} />, color: 'bg-blue-100 text-blue-600' },
  { type: 'transfer', label: 'Transfer', icon: <ArrowRight size={16} />, color: 'bg-orange-100 text-orange-600' },
  { type: 'voicemail', label: 'Voicemail', icon: <Voicemail size={16} />, color: 'bg-indigo-100 text-indigo-600' },
  { type: 'webhook', label: 'Webhook', icon: <Globe size={16} />, color: 'bg-teal-100 text-teal-600' },
  { type: 'end', label: 'End Call', icon: <X size={16} />, color: 'bg-red-100 text-red-600' },
];

export const DEFAULT_MENU_OPTION = { digit: '', label: '' };

export const TRANSFER_TYPES = [
  { value: 'cold', label: 'Cold Transfer' },
  { value: 'warm', label: 'Warm Transfer' },
];
