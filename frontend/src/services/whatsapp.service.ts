import api from './api';

export interface WhatsAppRecipient {
  phone: string;
  message: string;
  name?: string;
  templateName?: string;
  templateParams?: string[];
  mediaUrl?: string;
}

export interface WhatsAppSendResult {
  phone: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BulkWhatsAppResponse {
  total: number;
  successful: number;
  failed: number;
  results: WhatsAppSendResult[];
}

export interface WhatsAppCampaign {
  id: string;
  name: string;
  createdAt: string;
  totalRecipients: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface MessageStatusUpdate {
  messageId: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  errorCode?: string;
  errorMessage?: string;
}

class WhatsAppService {
  /**
   * Check if WhatsApp is configured
   */
  async checkStatus(): Promise<{ configured: boolean; provider: string; requiredEnvVars: string[] }> {
    const response = await api.get('/exotel/whatsapp/status');
    return response.data.data;
  }

  /**
   * Send single WhatsApp message
   */
  async sendMessage(params: {
    to: string;
    message: string;
    mediaUrl?: string;
    templateName?: string;
    templateParams?: string[];
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const response = await api.post('/exotel/whatsapp/send', params);
    return response.data.data;
  }

  /**
   * Send bulk WhatsApp messages
   */
  async sendBulk(recipients: WhatsAppRecipient[]): Promise<BulkWhatsAppResponse> {
    const response = await api.post('/exotel/whatsapp/bulk', { recipients });
    return response.data.data;
  }

  /**
   * Get message status history
   */
  async getMessageStatus(messageId: string): Promise<MessageStatusUpdate[]> {
    const response = await api.get(`/message-status/${messageId}/history`);
    return response.data.data;
  }

  /**
   * Get recent status updates for organization
   */
  async getRecentStatusUpdates(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{
    data: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const response = await api.get('/message-status/recent', { params });
    return response.data;
  }

  /**
   * Get WhatsApp campaigns (bulk sends)
   */
  async getCampaigns(params?: {
    page?: number;
    limit?: number;
  }): Promise<{
    data: WhatsAppCampaign[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    // This would need a dedicated endpoint - for now return from communication logs
    const response = await api.get('/communication-logs', {
      params: {
        ...params,
        type: 'whatsapp',
        isBulk: true,
      },
    });
    return response.data;
  }

  /**
   * Send WhatsApp with personalization
   * Replaces placeholders like {name}, {phone} with actual values
   */
  async sendBulkWithPersonalization(
    recipients: Array<{ phone: string; name?: string; [key: string]: any }>,
    messageTemplate: string
  ): Promise<BulkWhatsAppResponse> {
    const personalizedRecipients = recipients.map((recipient) => {
      let message = messageTemplate;

      // Replace all placeholders with recipient data
      Object.keys(recipient).forEach((key) => {
        const placeholder = new RegExp(`\\{${key}\\}`, 'gi');
        message = message.replace(placeholder, recipient[key] || '');
      });

      return {
        phone: recipient.phone,
        message,
        name: recipient.name,
      };
    });

    return this.sendBulk(personalizedRecipients);
  }

  /**
   * Validate phone numbers for WhatsApp
   * Returns cleaned phone numbers in E.164 format
   */
  validatePhoneNumbers(phones: string[]): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];

    phones.forEach((phone) => {
      // Remove all non-digit characters except +
      let cleaned = phone.replace(/[^\d+]/g, '');

      // Handle Indian phone numbers
      if (cleaned.length === 10 && !cleaned.startsWith('+')) {
        cleaned = '+91' + cleaned;
      } else if (cleaned.startsWith('91') && cleaned.length === 12) {
        cleaned = '+' + cleaned;
      } else if (cleaned.startsWith('0') && cleaned.length === 11) {
        cleaned = '+91' + cleaned.substring(1);
      }

      // Validate E.164 format (+ followed by 10-15 digits)
      if (/^\+[1-9]\d{9,14}$/.test(cleaned)) {
        valid.push(cleaned);
      } else {
        invalid.push(phone);
      }
    });

    return { valid, invalid };
  }

  /**
   * Parse CSV content for bulk upload
   */
  parseCSV(content: string): Array<{ phone: string; name?: string; [key: string]: any }> {
    const lines = content.trim().split('\n');
    if (lines.length === 0) return [];

    // Parse header
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const phoneIndex = header.findIndex((h) =>
      h === 'phone' || h === 'mobile' || h === 'phonenumber' || h === 'mobile_number'
    );
    const nameIndex = header.findIndex((h) =>
      h === 'name' || h === 'fullname' || h === 'full_name' || h === 'customer_name'
    );

    if (phoneIndex === -1) {
      throw new Error('CSV must have a "phone" or "mobile" column');
    }

    const results: Array<{ phone: string; name?: string; [key: string]: any }> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      if (values[phoneIndex]) {
        const record: any = { phone: values[phoneIndex] };
        if (nameIndex !== -1 && values[nameIndex]) {
          record.name = values[nameIndex];
        }
        // Add all other columns as custom fields
        header.forEach((h, idx) => {
          if (idx !== phoneIndex && idx !== nameIndex && values[idx]) {
            record[h] = values[idx];
          }
        });
        results.push(record);
      }
    }

    return results;
  }
}

export const whatsappService = new WhatsAppService();
export default whatsappService;
