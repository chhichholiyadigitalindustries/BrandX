/**
 * BRANDX — Payment Service & Provider Factory
 * Decouples core subscription/checkout workflows from specific gateway APIs.
 */

import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import {
  PaymentProvider,
  CreateOrderParams,
  PaymentOrderResult,
  VerifyPaymentParams,
  PaymentVerificationResult,
  RefundParams,
  RefundResult,
  WebhookVerificationResult,
} from './paymentProvider.js';
import { RazorpayPaymentProvider } from './providers/razorpay.provider.js';
import { PaymentGateway } from '@prisma/client';

export class PaymentService {
  private providers: Map<string, PaymentProvider> = new Map();
  private defaultGateway: PaymentGateway = PaymentGateway.RAZORPAY;

  constructor() {
    // Register supported providers
    const razorpay = new RazorpayPaymentProvider();
    this.providers.set(PaymentGateway.RAZORPAY, razorpay);
    this.providers.set('razorpay', razorpay);

    // Map configured default
    const configuredGateway = (config.payment.gateway || 'razorpay').toUpperCase();
    if (configuredGateway === 'RAZORPAY') {
      this.defaultGateway = PaymentGateway.RAZORPAY;
    }
  }

  public getProvider(gateway?: string | PaymentGateway): PaymentProvider {
    const key = (gateway || this.defaultGateway).toString().toUpperCase();
    const provider = this.providers.get(key) || this.providers.get(this.defaultGateway);

    if (!provider) {
      logger.warn(`Payment provider "${gateway}" not found. Falling back to Razorpay.`);
      return this.providers.get(PaymentGateway.RAZORPAY)!;
    }

    return provider;
  }

  public async createOrder(
    params: CreateOrderParams,
    gateway?: string | PaymentGateway
  ): Promise<PaymentOrderResult> {
    const provider = this.getProvider(gateway);
    return provider.createOrder(params);
  }

  public async verifyPayment(
    params: VerifyPaymentParams,
    gateway?: string | PaymentGateway
  ): Promise<PaymentVerificationResult> {
    const provider = this.getProvider(gateway);
    return provider.verifyPayment(params);
  }

  public async refundPayment(
    params: RefundParams,
    gateway?: string | PaymentGateway
  ): Promise<RefundResult> {
    const provider = this.getProvider(gateway);
    return provider.refundPayment(params);
  }

  public verifyWebhook(
    rawBody: string,
    signature: string,
    gateway?: string | PaymentGateway
  ): WebhookVerificationResult {
    const provider = this.getProvider(gateway);
    return provider.verifyWebhookSignature(rawBody, signature);
  }

  public verifyWebhookSignature(
    param1: string | Buffer,
    param2?: string | Buffer,
    param3?: string
  ): WebhookVerificationResult {
    // If called as (provider, rawBody, signature)
    if (typeof param1 === 'string' && (param1.toUpperCase() === 'RAZORPAY' || param1.toUpperCase() === 'STRIPE')) {
      const provider = this.getProvider(param1);
      const rawBody = typeof param2 === 'string' ? param2 : param2 ? param2.toString('utf8') : '';
      const signature = param3 || '';
      return provider.verifyWebhookSignature(rawBody, signature);
    }

    // If called as (rawBody, signature, gateway)
    const rawBody = typeof param1 === 'string' ? param1 : param1.toString('utf8');
    const signature = typeof param2 === 'string' ? param2 : '';
    const gateway = param3;
    const provider = this.getProvider(gateway);
    return provider.verifyWebhookSignature(rawBody, signature);
  }
}

export const paymentService = new PaymentService();
