/**
 * WhatsApp Service
 * Handles WhatsApp messaging via Gupshup/MSG91 APIs
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '../../config';
import { prisma } from '../../config/database';
import { TemplateType, MessageStatus } from '@prisma/client';

export interface SendWhatsAppParams {
  phone: string;
  message: string;
  templateId?: string;
  templateParams?: Record<string, string>;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document' | 'audio';
  mediaCaption?: string;
  organizationId: string;
  userId: string;
  leadId?: string;
}

export interface WhatsAppTemplateMessage {
  phone: string;
  templateId: string;
  templateNamespace?: string;
  params: string[];
  headerParams?: string[];
  mediaUrl?: string;
  organizationId: string;
  userId: string;
  leadId?: string;
}

export interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class WhatsAppService {
  private gupshupClient: AxiosInstance;
  private sourceNumber: string;
  private appName: string;

  constructor() {
    this.sourceNumber = config.gupshup?.whatsappSource || '';
    this.appName = config.gupshup?.whatsappAppName || '';

    this.gupshupClient = axios.create({
      baseURL: 'https://api.gupshup.io',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        apikey: config.gupshup?.apiKey || '',
      },
    });
  }

  /**
   * Check if WhatsApp service is configured
   */
  isConfigured(): boolean {
    return Boolean(config.gupshup?.apiKey && this.sourceNumber);
  }

  /**
   * Format phone number for WhatsApp (requires country code)
   */
  private formatPhone(phone: string): string {
    let cleaned = phone.replace(/[^\d+]/g, '');
    cleaned = cleaned.replace(/^\+/, '');

    // If 10 digits, assume Indian number
    if (cleaned.length === 10 && !cleaned.startsWith('91')) {
      cleaned = '91' + cleaned;
    }

    if (cleaned.startsWith('0')) {
      cleaned = '91' + cleaned.substring(1);
    }

    return cleaned;
  }

  /**
   * Send text message via Gupshup
   */
  private async sendTextMessage(params: SendWhatsAppParams): Promise<WhatsAppResult> {
    const { phone, message } = params;
    const formattedPhone = this.formatPhone(phone);

    try {
      const formData = new URLSearchParams();
      formData.append('channel', 'whatsapp');
      formData.append('source', this.sourceNumber);
      formData.append('destination', formattedPhone);
      formData.append('message', JSON.stringify({ type: 'text', text: message }));
      formData.append('src.name', this.appName);

      const response = await this.gupshupClient.post('/sm/api/v1/msg', formData);

      if (response.data?.status === 'submitted') {
        return {
          success: true,
          messageId: response.data.messageId,
        };
      }

      return {
        success: false,
        error: response.data?.message || 'Failed to send WhatsApp message',
      };
    } catch (error: any) {
      console.error('[WhatsApp] Error sending text:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Send media message via Gupshup
   */
  private async sendMediaMessage(params: SendWhatsAppParams): Promise<WhatsAppResult> {
    const { phone, mediaUrl, mediaType = 'image', mediaCaption } = params;
    const formattedPhone = this.formatPhone(phone);

    if (!mediaUrl) {
      return { success: false, error: 'Media URL is required' };
    }

    try {
      const messagePayload: Record<string, unknown> = {
        type: mediaType,
        originalUrl: mediaUrl,
        previewUrl: mediaUrl,
      };

      if (mediaCaption) {
        messagePayload.caption = mediaCaption;
      }

      const formData = new URLSearchParams();
      formData.append('channel', 'whatsapp');
      formData.append('source', this.sourceNumber);
      formData.append('destination', formattedPhone);
      formData.append('message', JSON.stringify(messagePayload));
      formData.append('src.name', this.appName);

      const response = await this.gupshupClient.post('/sm/api/v1/msg', formData);

      if (response.data?.status === 'submitted') {
        return {
          success: true,
          messageId: response.data.messageId,
        };
      }

      return {
        success: false,
        error: response.data?.message || 'Failed to send WhatsApp media',
      };
    } catch (error: any) {
      console.error('[WhatsApp] Error sending media:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Send template message via Gupshup
   */
  async sendTemplate(params: WhatsAppTemplateMessage): Promise<WhatsAppResult> {
    const { phone, templateId, templateNamespace, params: templateParams, headerParams, mediaUrl } = params;
    const formattedPhone = this.formatPhone(phone);

    try {
      // Get template details
      const template = await prisma.messageTemplate.findFirst({
        where: { id: templateId, type: TemplateType.WHATSAPP },
      });

      if (!template) {
        return { success: false, error: 'Template not found' };
      }

      const messagePayload: Record<string, unknown> = {
        type: 'template',
        template: {
          id: template.whatsappTemplateId || templateId,
          namespace: templateNamespace || config.gupshup?.whatsappNamespace,
          params: templateParams,
        },
      };

      // Add header if media is provided
      if (mediaUrl && headerParams) {
        (messagePayload.template as Record<string, unknown>).header = {
          type: template.headerType || 'image',
          url: mediaUrl,
        };
      }

      const formData = new URLSearchParams();
      formData.append('channel', 'whatsapp');
      formData.append('source', this.sourceNumber);
      formData.append('destination', formattedPhone);
      formData.append('message', JSON.stringify(messagePayload));
      formData.append('src.name', this.appName);

      const response = await this.gupshupClient.post('/sm/api/v1/msg', formData);

      if (response.data?.status === 'submitted') {
        // Update template usage
        await prisma.messageTemplate.update({
          where: { id: templateId },
          data: {
            usageCount: { increment: 1 },
            lastUsedAt: new Date(),
          },
        });

        return {
          success: true,
          messageId: response.data.messageId,
        };
      }

      return {
        success: false,
        error: response.data?.message || 'Failed to send template message',
      };
    } catch (error: any) {
      console.error('[WhatsApp] Error sending template:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Send WhatsApp message (main method)
   */
  async send(params: SendWhatsAppParams): Promise<WhatsAppResult> {
    if (!this.isConfigured()) {
      console.error('[WhatsApp] Service not configured');
      return { success: false, error: 'WhatsApp service not configured' };
    }

    let result: WhatsAppResult;

    if (params.mediaUrl) {
      result = await this.sendMediaMessage(params);
    } else {
      result = await this.sendTextMessage(params);
    }

    // Log the message
    await this.logMessage(params, result);

    return result;
  }

  /**
   * Log WhatsApp message
   */
  private async logMessage(params: SendWhatsAppParams, result: WhatsAppResult): Promise<void> {
    try {
      await prisma.messageLog.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId,
          leadId: params.leadId,
          type: TemplateType.WHATSAPP,
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
      console.error('[WhatsApp] Failed to log message:', error);
    }
  }

  /**
   * Get WhatsApp templates
   */
  async getTemplates(organizationId: string) {
    return prisma.messageTemplate.findMany({
      where: {
        OR: [{ organizationId }, { organizationId: null }],
        type: TemplateType.WHATSAPP,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create WhatsApp template
   */
  async createTemplate(data: {
    organizationId: string;
    name: string;
    content: string;
    whatsappTemplateId?: string;
    headerType?: string;
    headerContent?: string;
    footerContent?: string;
    buttons?: any[];
    variables?: string[];
    category?: string;
  }) {
    return prisma.messageTemplate.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        type: TemplateType.WHATSAPP,
        content: data.content,
        whatsappTemplateId: data.whatsappTemplateId,
        headerType: data.headerType,
        headerContent: data.headerContent,
        footerContent: data.footerContent,
        buttons: data.buttons || [],
        variables: data.variables || [],
        category: data.category,
        whatsappStatus: 'PENDING',
      },
    });
  }

  /**
   * Handle delivery status webhook
   */
  async handleDeliveryWebhook(payload: {
    messageId: string;
    status: string;
    timestamp?: string;
    phone?: string;
    error?: string;
  }): Promise<void> {
    const { messageId, status, timestamp, error } = payload;

    const messageLog = await prisma.messageLog.findFirst({
      where: { externalId: messageId },
    });

    if (!messageLog) {
      console.warn('[WhatsApp] Message not found for status update:', messageId);
      return;
    }

    let messageStatus: MessageStatus;
    switch (status.toLowerCase()) {
      case 'delivered':
        messageStatus = MessageStatus.DELIVERED;
        break;
      case 'read':
        messageStatus = MessageStatus.DELIVERED; // We don't have a READ status
        break;
      case 'failed':
      case 'undelivered':
        messageStatus = MessageStatus.FAILED;
        break;
      default:
        messageStatus = MessageStatus.SENT;
    }

    await prisma.messageLog.update({
      where: { id: messageLog.id },
      data: {
        status: messageStatus,
        deliveredAt:
          messageStatus === MessageStatus.DELIVERED ? new Date(timestamp || Date.now()) : undefined,
        readAt: status.toLowerCase() === 'read' ? new Date(timestamp || Date.now()) : undefined,
        error: error || undefined,
      },
    });
  }

  /**
   * Handle incoming message webhook (for two-way messaging)
   */
  async handleIncomingMessage(payload: {
    messageId: string;
    from: string;
    message: string;
    timestamp: string;
    type: string;
    mediaUrl?: string;
  }): Promise<void> {
    // This can be extended to handle incoming WhatsApp messages
    // For now, just log it
    console.log('[WhatsApp] Incoming message:', payload);
  }

  /**
   * Opt-out user from WhatsApp messages
   */
  async optOut(phone: string, organizationId: string): Promise<void> {
    const formattedPhone = this.formatPhone(phone);

    // Find the contact and mark as opted out
    await prisma.messagingContact.updateMany({
      where: {
        organizationId,
        phone: formattedPhone,
      },
      data: {
        whatsappOptOut: true,
        optOutAt: new Date(),
      },
    });
  }
}

export const whatsappService = new WhatsAppService();
