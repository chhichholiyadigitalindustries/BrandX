import { Request, Response } from 'express';
import { webhookService } from '../services/webhookService.js';
import { logger } from '../utils/logger.js';

export class WebhookController {
  async handlePaymentWebhook(req: Request, res: Response): Promise<void> {
    const provider = (req.params.provider || 'RAZORPAY').toUpperCase();
    const signature =
      (req.headers['x-razorpay-signature'] as string) ||
      (req.headers['stripe-signature'] as string) ||
      (req.headers['x-webhook-signature'] as string) ||
      '';

    const eventIdHeader =
      (req.headers['x-razorpay-event-id'] as string) ||
      (req.headers['stripe-event-id'] as string) ||
      undefined;

    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    try {
      const result = await webhookService.processWebhook({
        provider,
        payload: req.body,
        rawBody,
        signature,
        eventIdHeader,
      });

      res.status(200).json(result);
    } catch (error: any) {
      logger.error(`Webhook processing failure: ${error.message}`);
      res.status(error.status || 400).json({
        status: 'error',
        message: error.message,
      });
    }
  }
}

export const webhookController = new WebhookController();
