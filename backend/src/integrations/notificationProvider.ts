import { logger } from '../utils/logger.js';
import { NotificationChannel } from '@prisma/client';

export interface SendMessageParams {
  to: string; // phone or email
  message: string;
  channel: NotificationChannel;
  templateId?: string;
  data?: Record<string, any>;
}

export class NotificationProvider {
  public async send(params: SendMessageParams): Promise<{ success: boolean; messageId: string }> {
    logger.info(`[Notification] Dispatching via ${params.channel} to ${params.to}: "${params.message.substring(0, 50)}..."`);
    // Abstraction for future WhatsApp Cloud API / Twilio / Msg91 / Firebase Cloud Messaging
    return {
      success: true,
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
  }
}

export const notificationProvider = new NotificationProvider();
