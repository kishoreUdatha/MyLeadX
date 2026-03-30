import api, { getErrorMessage } from './index';
import { ApiResponse } from '../types';

export interface SendMessagePayload {
  leadId: string;
  phone: string;
  email?: string;
  message: string;
  templateId?: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  type: 'SMS' | 'WHATSAPP' | 'EMAIL';
  subject?: string;
  content: string;
}

export interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  status: 'sent' | 'queued' | 'failed';
}

export const messagingApi = {
  /**
   * Send SMS to a lead
   */
  sendSMS: async (payload: SendMessagePayload): Promise<SendMessageResponse> => {
    try {
      const response = await api.post<ApiResponse<SendMessageResponse>>(
        '/messaging/sms',
        {
          to: payload.phone,
          message: payload.message,
          leadId: payload.leadId,
        }
      );
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Send WhatsApp message to a lead
   */
  sendWhatsApp: async (payload: SendMessagePayload): Promise<SendMessageResponse> => {
    try {
      const response = await api.post<ApiResponse<SendMessageResponse>>(
        '/messaging/whatsapp',
        {
          to: payload.phone,
          message: payload.message,
          leadId: payload.leadId,
          templateId: payload.templateId,
        }
      );
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Send Email to a lead
   */
  sendEmail: async (
    payload: SendMessagePayload & { subject: string }
  ): Promise<SendMessageResponse> => {
    try {
      const response = await api.post<ApiResponse<SendMessageResponse>>(
        '/messaging/email',
        {
          to: payload.email,
          subject: payload.subject,
          body: payload.message,
          leadId: payload.leadId,
        }
      );
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get message templates
   */
  getTemplates: async (type?: 'SMS' | 'WHATSAPP' | 'EMAIL'): Promise<MessageTemplate[]> => {
    try {
      const params = type ? `?type=${type}` : '';
      const response = await api.get<ApiResponse<MessageTemplate[]>>(
        `/messaging/templates${params}`
      );
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Quick send - uses default template
   */
  quickSend: async (
    type: 'SMS' | 'WHATSAPP' | 'EMAIL',
    leadId: string,
    phone: string,
    email?: string
  ): Promise<SendMessageResponse> => {
    try {
      const response = await api.post<ApiResponse<SendMessageResponse>>(
        '/messaging/quick-send',
        {
          type,
          leadId,
          phone,
          email,
        }
      );
      return response.data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};

export default messagingApi;
