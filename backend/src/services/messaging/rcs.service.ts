/**
 * RCS (Rich Communication Services) Service
 * Handles RCS messaging via Gupshup API
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '../../config';
import { prisma } from '../../config/database';
import { MessageStatus } from '@prisma/client';

export interface SendRcsParams {
  phone: string;
  message: string;
  mediaUrl?: string;
  richCardPayload?: RichCardPayload;
  carouselPayload?: CarouselPayload;
  suggestedReplies?: SuggestedReply[];
  suggestedActions?: SuggestedAction[];
  organizationId: string;
  userId: string;
  leadId?: string;
}

export interface RichCardPayload {
  title: string;
  description: string;
  mediaUrl?: string;
  mediaHeight?: 'SHORT' | 'MEDIUM' | 'TALL';
  suggestions?: (SuggestedReply | SuggestedAction)[];
}

export interface CarouselPayload {
  cardWidth?: 'SMALL' | 'MEDIUM';
  cards: RichCardPayload[];
}

export interface SuggestedReply {
  type: 'reply';
  text: string;
  postbackData: string;
}

export interface SuggestedAction {
  type: 'action';
  text: string;
  action: {
    type: 'openUrl' | 'dialPhone' | 'viewLocation' | 'shareLocation' | 'createCalendarEvent';
    url?: string;
    phoneNumber?: string;
    latitude?: number;
    longitude?: number;
    label?: string;
    title?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
  };
}

export interface RcsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class RcsService {
  private client: AxiosInstance;
  private agentId: string;
  private botId: string;

  constructor() {
    this.agentId = config.gupshup?.rcsAgentId || '';
    this.botId = config.gupshup?.rcsBotId || '';

    this.client = axios.create({
      baseURL: 'https://api.gupshup.io/rcs/v1',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.gupshup?.apiKey || '',
      },
    });
  }

  /**
   * Check if RCS service is configured
   */
  isConfigured(): boolean {
    return Boolean(config.gupshup?.apiKey && this.agentId);
  }

  /**
   * Format phone number for RCS
   */
  private formatPhone(phone: string): string {
    let cleaned = phone.replace(/[^\d+]/g, '');

    // Add + if not present
    if (!cleaned.startsWith('+')) {
      // Assume Indian number if 10 digits
      if (cleaned.length === 10) {
        cleaned = '+91' + cleaned;
      } else if (!cleaned.startsWith('91') && cleaned.length > 10) {
        cleaned = '+' + cleaned;
      } else {
        cleaned = '+91' + cleaned;
      }
    }

    return cleaned;
  }

  /**
   * Send text message
   */
  private async sendTextMessage(params: SendRcsParams): Promise<RcsResult> {
    const { phone, message, suggestedReplies, suggestedActions } = params;
    const formattedPhone = this.formatPhone(phone);

    try {
      const payload: Record<string, unknown> = {
        phone: formattedPhone,
        agentId: this.agentId,
        message: {
          contentMessage: {
            text: message,
          },
        },
      };

      // Add suggestions if provided
      const suggestions = [
        ...(suggestedReplies || []).map((r) => ({
          reply: { text: r.text, postbackData: r.postbackData },
        })),
        ...(suggestedActions || []).map((a) => ({
          action: {
            text: a.text,
            ...this.buildActionPayload(a),
          },
        })),
      ];

      if (suggestions.length > 0) {
        (payload.message as Record<string, unknown>).suggestions = suggestions;
      }

      const response = await this.client.post('/msg', payload);

      if (response.data?.status === 'success' || response.data?.messageId) {
        return {
          success: true,
          messageId: response.data.messageId,
        };
      }

      return {
        success: false,
        error: response.data?.message || 'Failed to send RCS message',
      };
    } catch (error: any) {
      console.error('[RCS] Error sending text:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Send rich card
   */
  private async sendRichCard(params: SendRcsParams): Promise<RcsResult> {
    const { phone, richCardPayload } = params;

    if (!richCardPayload) {
      return { success: false, error: 'Rich card payload is required' };
    }

    const formattedPhone = this.formatPhone(phone);

    try {
      const payload: Record<string, unknown> = {
        phone: formattedPhone,
        agentId: this.agentId,
        message: {
          contentMessage: {
            richCard: {
              standaloneCard: {
                cardOrientation: 'VERTICAL',
                thumbnailImageAlignment: 'LEFT',
                cardContent: {
                  title: richCardPayload.title,
                  description: richCardPayload.description,
                  media: richCardPayload.mediaUrl
                    ? {
                        height: richCardPayload.mediaHeight || 'MEDIUM',
                        contentInfo: {
                          fileUrl: richCardPayload.mediaUrl,
                          forceRefresh: false,
                        },
                      }
                    : undefined,
                  suggestions: richCardPayload.suggestions?.map((s) => {
                    if (s.type === 'reply') {
                      return { reply: { text: s.text, postbackData: (s as SuggestedReply).postbackData } };
                    }
                    return { action: { text: s.text, ...this.buildActionPayload(s as SuggestedAction) } };
                  }),
                },
              },
            },
          },
        },
      };

      const response = await this.client.post('/msg', payload);

      if (response.data?.status === 'success' || response.data?.messageId) {
        return {
          success: true,
          messageId: response.data.messageId,
        };
      }

      return {
        success: false,
        error: response.data?.message || 'Failed to send rich card',
      };
    } catch (error: any) {
      console.error('[RCS] Error sending rich card:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Send carousel
   */
  private async sendCarousel(params: SendRcsParams): Promise<RcsResult> {
    const { phone, carouselPayload } = params;

    if (!carouselPayload || !carouselPayload.cards || carouselPayload.cards.length === 0) {
      return { success: false, error: 'Carousel payload with cards is required' };
    }

    const formattedPhone = this.formatPhone(phone);

    try {
      const payload: Record<string, unknown> = {
        phone: formattedPhone,
        agentId: this.agentId,
        message: {
          contentMessage: {
            richCard: {
              carouselCard: {
                cardWidth: carouselPayload.cardWidth || 'MEDIUM',
                cardContents: carouselPayload.cards.map((card) => ({
                  title: card.title,
                  description: card.description,
                  media: card.mediaUrl
                    ? {
                        height: card.mediaHeight || 'MEDIUM',
                        contentInfo: {
                          fileUrl: card.mediaUrl,
                          forceRefresh: false,
                        },
                      }
                    : undefined,
                  suggestions: card.suggestions?.map((s) => {
                    if (s.type === 'reply') {
                      return { reply: { text: s.text, postbackData: (s as SuggestedReply).postbackData } };
                    }
                    return { action: { text: s.text, ...this.buildActionPayload(s as SuggestedAction) } };
                  }),
                })),
              },
            },
          },
        },
      };

      const response = await this.client.post('/msg', payload);

      if (response.data?.status === 'success' || response.data?.messageId) {
        return {
          success: true,
          messageId: response.data.messageId,
        };
      }

      return {
        success: false,
        error: response.data?.message || 'Failed to send carousel',
      };
    } catch (error: any) {
      console.error('[RCS] Error sending carousel:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Build action payload for suggested actions
   */
  private buildActionPayload(action: SuggestedAction): Record<string, unknown> {
    const { type, url, phoneNumber, latitude, longitude, label, title, description, startTime, endTime } =
      action.action;

    switch (type) {
      case 'openUrl':
        return { openUrlAction: { url } };
      case 'dialPhone':
        return { dialAction: { phoneNumber } };
      case 'viewLocation':
        return {
          viewLocationAction: {
            latLong: { latitude, longitude },
            label,
          },
        };
      case 'shareLocation':
        return { shareLocationAction: {} };
      case 'createCalendarEvent':
        return {
          createCalendarEventAction: {
            startTime,
            endTime,
            title,
            description,
          },
        };
      default:
        return {};
    }
  }

  /**
   * Send RCS message (main method)
   */
  async send(params: SendRcsParams): Promise<RcsResult> {
    if (!this.isConfigured()) {
      console.error('[RCS] Service not configured');
      return { success: false, error: 'RCS service not configured' };
    }

    let result: RcsResult;

    if (params.carouselPayload) {
      result = await this.sendCarousel(params);
    } else if (params.richCardPayload) {
      result = await this.sendRichCard(params);
    } else {
      result = await this.sendTextMessage(params);
    }

    // Log the message
    await this.logMessage(params, result);

    return result;
  }

  /**
   * Log RCS message
   */
  private async logMessage(params: SendRcsParams, result: RcsResult): Promise<void> {
    try {
      await prisma.messageLog.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId,
          leadId: params.leadId,
          type: 'SMS', // Using SMS type for now, can add RCS type later
          to: params.phone,
          content: params.message || JSON.stringify(params.richCardPayload || params.carouselPayload),
          status: result.success ? MessageStatus.SENT : MessageStatus.FAILED,
          externalId: result.messageId,
          error: result.error,
          sentAt: result.success ? new Date() : undefined,
        },
      });
    } catch (error) {
      console.error('[RCS] Failed to log message:', error);
    }
  }

  /**
   * Check if phone supports RCS
   */
  async checkRcsCapability(phone: string): Promise<{ supported: boolean; features?: string[] }> {
    const formattedPhone = this.formatPhone(phone);

    try {
      const response = await this.client.get(`/users/${formattedPhone}/capability`, {
        params: { agentId: this.agentId },
      });

      return {
        supported: response.data?.isRcsEnabled || false,
        features: response.data?.features || [],
      };
    } catch (error: any) {
      console.error('[RCS] Capability check error:', error.response?.data || error.message);
      return { supported: false };
    }
  }

  /**
   * Handle delivery status webhook
   */
  async handleDeliveryWebhook(payload: {
    messageId: string;
    status: string;
    timestamp?: string;
    error?: string;
  }): Promise<void> {
    const { messageId, status, timestamp, error } = payload;

    const messageLog = await prisma.messageLog.findFirst({
      where: { externalId: messageId },
    });

    if (!messageLog) {
      console.warn('[RCS] Message not found for status update:', messageId);
      return;
    }

    let messageStatus: MessageStatus;
    switch (status.toLowerCase()) {
      case 'delivered':
        messageStatus = MessageStatus.DELIVERED;
        break;
      case 'read':
        messageStatus = MessageStatus.DELIVERED;
        break;
      case 'failed':
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
   * Handle user events (typing, read receipts, etc.)
   */
  async handleUserEvent(payload: {
    phone: string;
    event: 'isTyping' | 'read';
    messageId?: string;
    timestamp: string;
  }): Promise<void> {
    console.log('[RCS] User event:', payload);
  }

  /**
   * Handle postback from suggested replies/actions
   */
  async handlePostback(payload: {
    phone: string;
    postbackData: string;
    text?: string;
    timestamp: string;
  }): Promise<void> {
    console.log('[RCS] Postback received:', payload);
    // This can be extended to handle user interactions
  }
}

export const rcsService = new RcsService();
