/**
 * SMS Service
 * Handles SMS sending via MSG91/Gupshup with DLT compliance
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '../../config';
import { prisma } from '../../config/database';
import { TemplateType, MessageStatus } from '@prisma/client';

export type SmsType = 'TRANSACTIONAL' | 'PROMOTIONAL';

export interface SendSmsParams {
  phone: string;
  message: string;
  templateId?: string;
  dltTemplateId?: string;
  msg91TemplateId?: string; // MSG91 Flow API template ID
  smsType?: SmsType; // TRANSACTIONAL (route 4) or PROMOTIONAL (route 1)
  variables?: Record<string, string>;
  organizationId: string;
  userId: string;
  leadId?: string;
  senderId?: string; // Custom sender ID (6-letter DLT registered header)
}

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class SmsService {
  private msg91Client: AxiosInstance;
  private gupshupClient: AxiosInstance;
  private provider: 'MSG91' | 'GUPSHUP';

  constructor() {
    // MSG91 configuration
    this.msg91Client = axios.create({
      baseURL: 'https://control.msg91.com',
      headers: {
        'Content-Type': 'application/json',
        authkey: config.msg91?.authKey || '',
      },
    });

    // Gupshup configuration
    this.gupshupClient = axios.create({
      baseURL: 'https://enterprise.smsgupshup.com',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Determine primary provider
    this.provider = config.msg91?.authKey ? 'MSG91' : 'GUPSHUP';
  }

  /**
   * Check if SMS service is configured
   */
  isConfigured(): boolean {
    return Boolean(config.msg91?.authKey) || Boolean(config.gupshup?.apiKey);
  }

  /**
   * Format phone number for SMS providers
   */
  private formatPhone(phone: string): string {
    let cleaned = phone.replace(/[^\d+]/g, '');
    cleaned = cleaned.replace(/^\+/, '');

    // If 10 digits, assume Indian number and add 91
    if (cleaned.length === 10 && !cleaned.startsWith('91')) {
      cleaned = '91' + cleaned;
    }

    // Remove leading 0
    if (cleaned.startsWith('0')) {
      cleaned = '91' + cleaned.substring(1);
    }

    return cleaned;
  }

  /**
   * Replace template variables
   */
  private replaceVariables(message: string, variables?: Record<string, string>): string {
    if (!variables) return message;

    let result = message;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return result;
  }

  /**
   * Send SMS via MSG91 Flow API (preferred method)
   */
  private async sendViaMSG91FlowAPI(params: SendSmsParams & { senderId?: string; peId?: string }): Promise<SmsResult> {
    const { phone, msg91TemplateId, smsType, variables } = params;

    const formattedPhone = this.formatPhone(phone);

    // Check promotional timing restrictions (9 AM - 9 PM IST)
    if (smsType === 'PROMOTIONAL') {
      const now = new Date();
      const istHour = (now.getUTCHours() + 5.5) % 24; // Convert to IST
      if (istHour < 9 || istHour >= 21) {
        return {
          success: false,
          error: 'Promotional SMS can only be sent between 9 AM and 9 PM IST',
        };
      }
    }

    try {
      // Build recipient object with variables
      const recipient: Record<string, string> = {
        mobiles: formattedPhone,
      };

      // Add variables for template substitution
      if (variables) {
        Object.entries(variables).forEach(([key, value]) => {
          recipient[key] = value;
        });
      }

      const flowPayload = {
        template_id: msg91TemplateId,
        short_url: '0', // Disable short URL tracking
        recipients: [recipient],
      };

      console.log('[SMS] MSG91 Flow API request:', JSON.stringify(flowPayload, null, 2));

      const response = await this.msg91Client.post('/api/v5/flow/', flowPayload);

      console.log('[SMS] MSG91 Flow API response:', JSON.stringify(response.data));

      if (response.data?.type === 'success' || response.data?.message?.includes('success')) {
        return {
          success: true,
          messageId: response.data.request_id || response.data?.data?.request_id,
        };
      }

      return {
        success: false,
        error: response.data?.message || response.data?.description || 'Failed to send SMS via Flow API',
      };
    } catch (error: any) {
      console.error('[SMS] MSG91 Flow API error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.response?.data?.description || error.message,
      };
    }
  }

  /**
   * Send SMS via MSG91 SendSMS API (fallback for direct DLT)
   */
  private async sendViaMSG91SendSMS(params: SendSmsParams & { senderId?: string; peId?: string }): Promise<SmsResult> {
    const { phone, message, dltTemplateId, smsType, variables, senderId, peId } = params;

    const formattedPhone = this.formatPhone(phone);
    const finalMessage = this.replaceVariables(message, variables);

    // Use organization's sender ID if provided, otherwise fall back to config default
    const effectiveSenderId = senderId || config.msg91?.senderId || 'MYLEADX';
    // Use organization's PE_ID if provided (for custom DLT), otherwise use MyLeadX's PE_ID
    const effectivePeId = peId || config.msg91?.dltEntityId;
    const effectiveDltTemplateId = dltTemplateId || config.msg91?.defaultTemplateId;

    // Determine route based on SMS type
    // Route 4 = Transactional (default), Route 1 = Promotional
    const route = smsType === 'PROMOTIONAL' ? '1' : (config.msg91?.route || '4');

    // Check if DLT template ID is available
    if (!effectiveDltTemplateId) {
      console.error('[SMS] No DLT Template ID configured. Set MSG91_DEFAULT_TEMPLATE_ID in .env or add dltTemplateId to the template.');
      return {
        success: false,
        error: 'DLT Template ID is required for SMS in India. Please configure MSG91_DEFAULT_TEMPLATE_ID or add DLT Template ID to your template.',
      };
    }

    // Check promotional timing restrictions (9 AM - 9 PM IST)
    if (smsType === 'PROMOTIONAL') {
      const now = new Date();
      const istHour = (now.getUTCHours() + 5.5) % 24; // Convert to IST
      if (istHour < 9 || istHour >= 21) {
        return {
          success: false,
          error: 'Promotional SMS can only be sent between 9 AM and 9 PM IST',
        };
      }
    }

    try {
      // Use MSG91 Send SMS API for direct SMS with DLT compliance
      const response = await this.msg91Client.post('/api/v5/sendSMS', {
        sender: effectiveSenderId,
        route,
        mobiles: formattedPhone,
        message: finalMessage,
        DLT_TE_ID: effectiveDltTemplateId, // DLT Template ID
        PE_ID: effectivePeId, // Principal Entity ID
      });

      console.log('[SMS] MSG91 SendSMS response:', JSON.stringify(response.data));

      if (response.data?.type === 'success' || response.data?.message === 'success') {
        return {
          success: true,
          messageId: response.data.request_id || response.data?.data?.request_id,
        };
      }

      return {
        success: false,
        error: response.data?.message || response.data?.description || 'Failed to send SMS',
      };
    } catch (error: any) {
      console.error('[SMS] MSG91 SendSMS error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.response?.data?.description || error.message,
      };
    }
  }

  /**
   * Send SMS via MSG91 - Uses Flow API if msg91TemplateId available, otherwise SendSMS API
   */
  private async sendViaMSG91(params: SendSmsParams & { senderId?: string; peId?: string }): Promise<SmsResult> {
    // Prefer Flow API if MSG91 template ID is available
    if (params.msg91TemplateId) {
      console.log('[SMS] Using MSG91 Flow API with template:', params.msg91TemplateId);
      return this.sendViaMSG91FlowAPI(params);
    }

    // Fallback to SendSMS API with direct DLT_TE_ID
    console.log('[SMS] Using MSG91 SendSMS API with DLT_TE_ID:', params.dltTemplateId);
    return this.sendViaMSG91SendSMS(params);
  }

  /**
   * Send SMS via Gupshup
   */
  private async sendViaGupshup(params: SendSmsParams & { senderId?: string; peId?: string }): Promise<SmsResult> {
    const { phone, message, dltTemplateId, variables, senderId, peId } = params;

    const formattedPhone = this.formatPhone(phone);
    const finalMessage = this.replaceVariables(message, variables);

    try {
      const formData = new URLSearchParams();
      formData.append('method', 'SendMessage');
      formData.append('send_to', formattedPhone);
      formData.append('msg', finalMessage);
      formData.append('msg_type', 'TEXT');
      formData.append('userid', config.gupshup?.userId || '');
      formData.append('auth_scheme', 'plain');
      formData.append('password', config.gupshup?.password || '');
      formData.append('v', '1.1');
      formData.append('format', 'text');

      if (dltTemplateId) {
        formData.append('dltTemplateId', dltTemplateId);
      }

      // Use custom PE_ID if provided, otherwise use default
      const effectivePeId = peId || config.gupshup?.dltEntityId;
      if (effectivePeId) {
        formData.append('dltEntityId', effectivePeId);
      }

      // Add sender ID for white-label support
      if (senderId) {
        formData.append('senderid', senderId);
      }

      const response = await this.gupshupClient.post('/GatewayAPI/rest', formData);

      if (response.data && response.data.startsWith('success')) {
        const messageId = response.data.split('|')[2]?.trim();
        return {
          success: true,
          messageId,
        };
      }

      return {
        success: false,
        error: response.data || 'Failed to send SMS',
      };
    } catch (error: any) {
      console.error('[SMS] Gupshup error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send SMS (main method)
   */
  async send(params: SendSmsParams): Promise<SmsResult> {
    if (!this.isConfigured()) {
      console.error('[SMS] Service not configured');
      return { success: false, error: 'SMS service not configured' };
    }

    // Get template IDs if templateId provided
    let dltTemplateId = params.dltTemplateId;
    let msg91TemplateId = params.msg91TemplateId;

    if (params.templateId && (!dltTemplateId || !msg91TemplateId)) {
      // First check MessageTemplate
      const template = await prisma.messageTemplate.findFirst({
        where: { id: params.templateId, type: TemplateType.SMS },
        select: { dltTemplateId: true, msg91TemplateId: true },
      });
      if (template) {
        dltTemplateId = dltTemplateId || template.dltTemplateId || undefined;
        msg91TemplateId = msg91TemplateId || template.msg91TemplateId || undefined;
      }
    }

    // Fetch organization to get DLT configuration
    // Use custom senderId if provided in params
    let senderId: string | undefined = params.senderId;
    let peId: string | undefined; // Principal Entity ID for DLT
    let useCustomDlt = false;

    if (params.organizationId) {
      const organization = await prisma.organization.findUnique({
        where: { id: params.organizationId },
        select: {
          smsSenderId: true,
          smsEnabled: true,
          smsProviderType: true,
          customDltEntityId: true,
          customDltSenderId: true,
        },
      });

      // Optional: Check if SMS is enabled for this organization
      if (organization && !organization.smsEnabled) {
        console.warn(`[SMS] SMS not enabled for organization ${params.organizationId}`);
        // You can choose to block here or just warn - for now we'll proceed
      }

      // Determine which DLT credentials to use
      if (organization?.smsProviderType === 'CUSTOM' && organization.customDltEntityId) {
        // Customer has their own DLT registration
        useCustomDlt = true;
        peId = organization.customDltEntityId;
        // Use custom senderId if provided, otherwise fall back to org default
        senderId = senderId || organization.customDltSenderId || organization.smsSenderId;
        console.log(`[SMS] Using customer's DLT - PE_ID: ${peId}, Sender: ${senderId}`);

        // For custom DLT, check organization's SMS templates for msg91TemplateId
        if (dltTemplateId && !msg91TemplateId) {
          const orgTemplate = await prisma.organizationSmsTemplate.findFirst({
            where: {
              organizationId: params.organizationId,
              dltTemplateId: dltTemplateId,
              isActive: true,
            },
            select: { msg91TemplateId: true },
          });
          if (orgTemplate?.msg91TemplateId) {
            msg91TemplateId = orgTemplate.msg91TemplateId;
          }
        }
      } else {
        // Use MyLeadX's DLT (white-label or default)
        // Use custom senderId if provided, otherwise fall back to org default
        senderId = senderId || organization?.smsSenderId;
        peId = config.msg91?.dltEntityId; // MyLeadX's PE ID
      }
    }

    // Use default MSG91 template ID from config if not provided
    if (!msg91TemplateId && config.msg91?.defaultFlowTemplateId) {
      msg91TemplateId = config.msg91.defaultFlowTemplateId;
    }

    const sendParams = { ...params, dltTemplateId, msg91TemplateId, senderId, peId };

    // Send via configured provider
    let result: SmsResult;
    if (this.provider === 'MSG91' && config.msg91?.authKey) {
      result = await this.sendViaMSG91(sendParams);
    } else {
      result = await this.sendViaGupshup(sendParams);
    }

    // Log the message
    await this.logMessage(params, result);

    return result;
  }

  /**
   * Log SMS to MessageLog
   */
  private async logMessage(params: SendSmsParams, result: SmsResult): Promise<void> {
    try {
      await prisma.messageLog.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId,
          leadId: params.leadId,
          type: TemplateType.SMS,
          to: params.phone,
          content: params.message,
          templateId: params.templateId,
          status: result.success ? MessageStatus.SENT : MessageStatus.FAILED,
          externalId: result.messageId,
          error: result.error,
          sentAt: result.success ? new Date() : undefined,
        },
      });
    } catch (error) {
      console.error('[SMS] Failed to log message:', error);
    }
  }

  /**
   * Send bulk SMS
   */
  async sendBulk(
    phones: string[],
    message: string,
    params: Omit<SendSmsParams, 'phone' | 'message'>
  ): Promise<{ total: number; sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const phone of phones) {
      const result = await this.send({ ...params, phone, message });
      if (result.success) {
        sent++;
      } else {
        failed++;
      }
    }

    return { total: phones.length, sent, failed };
  }

  /**
   * Get DLT templates for the organization
   */
  async getTemplates(organizationId: string) {
    return prisma.messageTemplate.findMany({
      where: {
        OR: [{ organizationId }, { organizationId: null }],
        type: TemplateType.SMS,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a new SMS template
   */
  async createTemplate(data: {
    organizationId: string;
    name: string;
    content: string;
    dltTemplateId?: string;
    variables?: string[];
    category?: string;
  }) {
    return prisma.messageTemplate.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        type: TemplateType.SMS,
        content: data.content,
        dltTemplateId: data.dltTemplateId,
        dltEntityId: config.msg91?.dltEntityId,
        variables: data.variables || [],
        category: data.category,
      },
    });
  }

  /**
   * Handle delivery status webhook
   */
  async handleDeliveryWebhook(payload: {
    requestId: string;
    status: string;
    timestamp?: string;
    phone?: string;
    error?: string;
  }): Promise<void> {
    const { requestId, status, timestamp, phone, error } = payload;

    // Find message by external ID
    const messageLog = await prisma.messageLog.findFirst({
      where: { externalId: requestId },
    });

    if (!messageLog) {
      console.warn('[SMS] Message not found for delivery status:', requestId);
      return;
    }

    // Map provider status to our status
    let messageStatus: MessageStatus;
    switch (status.toUpperCase()) {
      case 'DELIVERED':
      case 'DELIVRD':
        messageStatus = MessageStatus.DELIVERED;
        break;
      case 'READ':
        messageStatus = MessageStatus.DELIVERED;
        break;
      case 'FAILED':
      case 'UNDELIVRD':
      case 'REJECTED':
        messageStatus = MessageStatus.FAILED;
        break;
      default:
        messageStatus = MessageStatus.SENT;
    }

    await prisma.messageLog.update({
      where: { id: messageLog.id },
      data: {
        status: messageStatus,
        deliveredAt: messageStatus === MessageStatus.DELIVERED ? new Date(timestamp || Date.now()) : undefined,
        error: error || undefined,
      },
    });
  }
}

export const smsService = new SmsService();
