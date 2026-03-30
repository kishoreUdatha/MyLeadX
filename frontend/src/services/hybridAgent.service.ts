import api from './api';

export interface ConversationMessage {
  id: string;
  channel: 'WHATSAPP' | 'SMS' | 'CALL';
  direction: 'INBOUND' | 'OUTBOUND';
  message: string;
  timestamp: string;
  status: string;
}

export interface ConversationContext {
  leadId?: string;
  phone: string;
  channel: 'WHATSAPP' | 'SMS' | 'CALL';
  agentId: string;
  organizationId: string;
  history: Array<{
    role: string;
    content: string;
    channel: string;
    timestamp: string;
  }>;
  qualification: Record<string, any>;
  lastInteraction: string;
}

export interface TransferConfig {
  id: string;
  name: string;
  agentId?: string;
  triggerKeywords: string[];
  triggerSentiment?: string;
  maxAITurns?: number;
  transferType: 'PHONE' | 'SIP' | 'QUEUE' | 'VOICEMAIL';
  transferTo: string;
  transferMessage?: string;
  fallbackMessage?: string;
  voicemailEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

class HybridAgentService {
  // Get unified conversation history
  async getHistory(phone: string): Promise<ConversationMessage[]> {
    const response = await api.get(`/hybrid-agent/history/${encodeURIComponent(phone)}`);
    return response.data.data;
  }

  // Get conversation context
  async getContext(phone: string, channel: string = 'WHATSAPP'): Promise<ConversationContext> {
    const response = await api.get(`/hybrid-agent/context/${encodeURIComponent(phone)}?channel=${channel}`);
    return response.data.data;
  }

  // Send message
  async sendMessage(phone: string, message: string, channel: string): Promise<any> {
    const response = await api.post('/hybrid-agent/send', { phone, message, channel });
    return response.data.data;
  }

  // Send AI response
  async sendAIResponse(phone: string, userMessage: string, channel: string): Promise<any> {
    const response = await api.post('/hybrid-agent/respond', { phone, userMessage, channel });
    return response.data.data;
  }

  // Switch channel
  async switchChannel(phone: string, currentChannel: string, newChannel: string): Promise<any> {
    const response = await api.post('/hybrid-agent/switch-channel', {
      phone,
      currentChannel,
      newChannel,
    });
    return response.data.data;
  }

  // Initiate call
  async initiateCall(phone: string, agentId?: string): Promise<any> {
    const response = await api.post('/hybrid-agent/call', { phone, agentId });
    return response.data.data;
  }

  // Transfer Configs
  async getTransferConfigs(): Promise<TransferConfig[]> {
    const response = await api.get('/outbound-calls/transfer-configs');
    return response.data.data;
  }

  async createTransferConfig(config: Partial<TransferConfig>): Promise<TransferConfig> {
    const response = await api.post('/outbound-calls/transfer-configs', config);
    return response.data.data;
  }

  async updateTransferConfig(id: string, config: Partial<TransferConfig>): Promise<TransferConfig> {
    const response = await api.put(`/outbound-calls/transfer-configs/${id}`, config);
    return response.data.data;
  }

  async deleteTransferConfig(id: string): Promise<void> {
    await api.delete(`/outbound-calls/transfer-configs/${id}`);
  }
}

export const hybridAgentService = new HybridAgentService();
export default hybridAgentService;
