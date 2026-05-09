/**
 * Gupshup Service
 * Unified interface for Gupshup SMS, WhatsApp, and RCS APIs
 */

import { smsService, SendSmsParams, SmsResult } from './sms.service';
import { whatsappService, SendWhatsAppParams, WhatsAppResult, WhatsAppTemplateMessage } from './whatsapp.service';
import { rcsService, SendRcsParams, RcsResult, RichCardPayload, CarouselPayload } from './rcs.service';
import { config } from '../../config';

export interface GupshupConfig {
  apiKey: string;
  userId?: string;
  password?: string;
  dltEntityId?: string;
  whatsappSource?: string;
  whatsappAppName?: string;
  whatsappNamespace?: string;
  rcsAgentId?: string;
  rcsBotId?: string;
}

export interface DeliveryWebhookPayload {
  channel: 'sms' | 'whatsapp' | 'rcs';
  messageId: string;
  status: string;
  timestamp?: string;
  phone?: string;
  error?: string;
}

export interface IncomingMessagePayload {
  channel: 'whatsapp' | 'rcs';
  messageId: string;
  from: string;
  message: string;
  timestamp: string;
  type: string;
  mediaUrl?: string;
  postbackData?: string;
}

class GupshupService {
  /**
   * Check if Gupshup is configured
   */
  isConfigured(): boolean {
    return Boolean(config.gupshup?.apiKey);
  }

  /**
   * Get configuration status for each channel
   */
  getChannelStatus(): { sms: boolean; whatsapp: boolean; rcs: boolean } {
    return {
      sms: smsService.isConfigured(),
      whatsapp: whatsappService.isConfigured(),
      rcs: rcsService.isConfigured(),
    };
  }

  // ==================== SMS ====================

  /**
   * Send SMS
   */
  async sendSms(params: SendSmsParams): Promise<SmsResult> {
    return smsService.send(params);
  }

  /**
   * Send bulk SMS
   */
  async sendBulkSms(
    phones: string[],
    message: string,
    params: Omit<SendSmsParams, 'phone' | 'message'>
  ) {
    return smsService.sendBulk(phones, message, params);
  }

  /**
   * Get SMS templates
   */
  async getSmsTemplates(organizationId: string) {
    return smsService.getTemplates(organizationId);
  }

  // ==================== WhatsApp ====================

  /**
   * Send WhatsApp text message
   */
  async sendWhatsApp(params: SendWhatsAppParams): Promise<WhatsAppResult> {
    return whatsappService.send(params);
  }

  /**
   * Send WhatsApp template message
   */
  async sendWhatsAppTemplate(params: WhatsAppTemplateMessage): Promise<WhatsAppResult> {
    return whatsappService.sendTemplate(params);
  }

  /**
   * Get WhatsApp templates
   */
  async getWhatsAppTemplates(organizationId: string) {
    return whatsappService.getTemplates(organizationId);
  }

  /**
   * Opt out from WhatsApp
   */
  async optOutWhatsApp(phone: string, organizationId: string) {
    return whatsappService.optOut(phone, organizationId);
  }

  // ==================== RCS ====================

  /**
   * Send RCS text message
   */
  async sendRcsText(params: SendRcsParams): Promise<RcsResult> {
    return rcsService.send(params);
  }

  /**
   * Send RCS rich card
   */
  async sendRcsRichCard(
    phone: string,
    card: RichCardPayload,
    params: Omit<SendRcsParams, 'phone' | 'message' | 'richCardPayload'>
  ): Promise<RcsResult> {
    return rcsService.send({
      ...params,
      phone,
      message: card.title, // Use title as message fallback
      richCardPayload: card,
    });
  }

  /**
   * Send RCS carousel
   */
  async sendRcsCarousel(
    phone: string,
    carousel: CarouselPayload,
    params: Omit<SendRcsParams, 'phone' | 'message' | 'carouselPayload'>
  ): Promise<RcsResult> {
    return rcsService.send({
      ...params,
      phone,
      message: carousel.cards[0]?.title || 'Carousel', // Use first card title as fallback
      carouselPayload: carousel,
    });
  }

  /**
   * Check RCS capability for a phone number
   */
  async checkRcsCapability(phone: string) {
    return rcsService.checkRcsCapability(phone);
  }

  // ==================== Webhooks ====================

  /**
   * Handle delivery status webhook from Gupshup
   */
  async handleDeliveryWebhook(payload: DeliveryWebhookPayload): Promise<void> {
    const { channel, messageId, status, timestamp, phone, error } = payload;

    switch (channel) {
      case 'sms':
        await smsService.handleDeliveryWebhook({
          requestId: messageId,
          status,
          timestamp,
          phone,
          error,
        });
        break;

      case 'whatsapp':
        await whatsappService.handleDeliveryWebhook({
          messageId,
          status,
          timestamp,
          phone,
          error,
        });
        break;

      case 'rcs':
        await rcsService.handleDeliveryWebhook({
          messageId,
          status,
          timestamp,
          error,
        });
        break;
    }
  }

  /**
   * Handle incoming message webhook from Gupshup
   */
  async handleIncomingMessage(payload: IncomingMessagePayload): Promise<void> {
    const { channel, messageId, from, message, timestamp, type, mediaUrl, postbackData } = payload;

    switch (channel) {
      case 'whatsapp':
        await whatsappService.handleIncomingMessage({
          messageId,
          from,
          message,
          timestamp,
          type,
          mediaUrl,
        });
        break;

      case 'rcs':
        if (postbackData) {
          await rcsService.handlePostback({
            phone: from,
            postbackData,
            text: message,
            timestamp,
          });
        }
        break;
    }
  }

  /**
   * Parse Gupshup webhook payload
   */
  parseWebhookPayload(rawPayload: any): DeliveryWebhookPayload | IncomingMessagePayload | null {
    try {
      // Gupshup SMS webhook format
      if (rawPayload.type === 'dlr' || rawPayload.eventType === 'DLR') {
        return {
          channel: 'sms',
          messageId: rawPayload.msgid || rawPayload.messageId,
          status: rawPayload.status || rawPayload.eventValue,
          timestamp: rawPayload.timestamp || rawPayload.sentAt,
          phone: rawPayload.mobile || rawPayload.phone,
          error: rawPayload.cause || rawPayload.error,
        };
      }

      // Gupshup WhatsApp webhook format
      if (rawPayload.app === 'WHATSAPP' || rawPayload.channel === 'whatsapp') {
        if (rawPayload.type === 'message-event') {
          return {
            channel: 'whatsapp',
            messageId: rawPayload.payload?.gsId || rawPayload.messageId,
            status: rawPayload.payload?.type || rawPayload.status,
            timestamp: rawPayload.timestamp,
            phone: rawPayload.payload?.destination,
            error: rawPayload.payload?.payload?.reason,
          };
        }

        if (rawPayload.type === 'message') {
          return {
            channel: 'whatsapp',
            messageId: rawPayload.payload?.id,
            from: rawPayload.payload?.source,
            message: rawPayload.payload?.payload?.text || rawPayload.payload?.payload?.caption || '',
            timestamp: rawPayload.timestamp,
            type: rawPayload.payload?.type,
            mediaUrl: rawPayload.payload?.payload?.url,
          };
        }
      }

      // Gupshup RCS webhook format
      if (rawPayload.channel === 'rcs' || rawPayload.type === 'rcs') {
        if (rawPayload.eventType === 'DELIVERED' || rawPayload.eventType === 'READ') {
          return {
            channel: 'rcs',
            messageId: rawPayload.messageId,
            status: rawPayload.eventType.toLowerCase(),
            timestamp: rawPayload.timestamp,
          };
        }

        if (rawPayload.eventType === 'POSTBACK' || rawPayload.eventType === 'REPLY') {
          return {
            channel: 'rcs',
            messageId: rawPayload.messageId,
            from: rawPayload.userPhone,
            message: rawPayload.text || '',
            timestamp: rawPayload.timestamp,
            type: 'postback',
            postbackData: rawPayload.postbackData,
          };
        }
      }

      console.warn('[Gupshup] Unknown webhook format:', rawPayload);
      return null;
    } catch (error) {
      console.error('[Gupshup] Error parsing webhook:', error);
      return null;
    }
  }
}

export const gupshupService = new GupshupService();
