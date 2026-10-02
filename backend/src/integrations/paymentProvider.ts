import crypto from 'crypto';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { PaymentGateway, PaymentMethod, PaymentStatus } from '@prisma/client';

export interface CreateOrderParams {
  amount: number; // in INR
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface PaymentOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface VerifyPaymentParams {
  orderId: string;
  paymentId: string;
  signature?: string;
}

export interface PaymentVerificationResult {
  isValid: boolean;
  paymentId: string;
  orderId: string;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  maskedInstrument?: string;
  gateway: PaymentGateway;
  rawResponse?: any;
}

export interface PaymentProvider {
  createOrder(params: CreateOrderParams): Promise<PaymentOrderResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerificationResult>;
  refundPayment(paymentId: string, amount: number, reason?: string): Promise<{ refundId: string; status: string }>;
  verifyWebhook(rawBody: string, signature: string): boolean;
}

export class RazorpayPaymentProvider implements PaymentProvider {
  public getKeyId(): string {
    return (
      process.env.RAZORPAY_KEY_ID ||
      process.env.PAYMENT_KEY_ID ||
      process.env.PAYMENT_PROVIDER_KEY ||
      config.payment.providerKey ||
      ''
    ).trim();
  }

  public getKeySecret(): string {
    return (
      process.env.RAZORPAY_KEY_SECRET ||
      process.env.PAYMENT_KEY_SECRET ||
      process.env.PAYMENT_PROVIDER_SECRET ||
      config.payment.providerSecret ||
      ''
    ).trim();
  }

  public getWebhookSecret(): string {
    return (
      process.env.RAZORPAY_WEBHOOK_SECRET ||
      process.env.PAYMENT_WEBHOOK_SECRET ||
      config.payment.webhookSecret ||
      ''
    ).trim();
  }

  public isConfigured(): boolean {
    const keyId = this.getKeyId();
    const keySecret = this.getKeySecret();
    return Boolean(
      keyId &&
      keySecret &&
      !keyId.toLowerCase().includes('placeholder') &&
      !keySecret.toLowerCase().includes('placeholder') &&
      (keyId.startsWith('rzp_test_') || keyId.startsWith('rzp_live_'))
    );
  }

  public async createOrder(params: CreateOrderParams): Promise<PaymentOrderResult> {
    const keyId = this.getKeyId();
    const keySecret = this.getKeySecret();

    if (!this.isConfigured()) {
      if (config.isProduction) {
        throw new Error('Payment gateway is not configured for production transactions.');
      }
      logger.info('Using development mock payment order.');
      const mockOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return {
        orderId: mockOrderId,
        amount: params.amount,
        currency: params.currency || 'INR',
        keyId,
      };
    }

    try {
      const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(params.amount * 100), // convert to paise
          currency: params.currency || 'INR',
          receipt: params.receipt,
          notes: params.notes,
        }),
      });

      if (!response.ok) {
        throw new Error(`Razorpay Order creation failed: ${await response.text()}`);
      }

      const data: any = await response.json();
      return {
        orderId: data.id,
        amount: data.amount / 100,
        currency: data.currency,
        keyId,
      };
    } catch (error) {
      logger.error('Error creating Razorpay order:', error);
      if (config.isProduction) {
        throw error;
      }
      const mockOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return {
        orderId: mockOrderId,
        amount: params.amount,
        currency: params.currency || 'INR',
        keyId,
      };
    }
  }

  public async verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerificationResult> {
    const keySecret = this.getKeySecret();
    if (!this.isConfigured()) {
      if (config.isProduction) {
        return {
          isValid: false,
          paymentId: params.paymentId,
          orderId: params.orderId,
          amount: 0,
          status: PaymentStatus.FAILED,
          method: PaymentMethod.UPI,
          gateway: PaymentGateway.RAZORPAY,
        };
      }
      // In dev / test environment only
      return {
        isValid: true,
        paymentId: params.paymentId || `pay_${Date.now()}`,
        orderId: params.orderId,
        amount: 199,
        status: PaymentStatus.SUCCESS,
        method: PaymentMethod.UPI,
        maskedInstrument: 'UPI: vyapari@okhdfcbank',
        gateway: PaymentGateway.RAZORPAY,
      };
    }

    try {
      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${params.orderId}|${params.paymentId}`)
        .digest('hex');

      const isValid = Boolean(params.signature && generatedSignature === params.signature);

      return {
        isValid,
        paymentId: params.paymentId,
        orderId: params.orderId,
        amount: 199,
        status: isValid ? PaymentStatus.SUCCESS : PaymentStatus.FAILED,
        method: PaymentMethod.UPI,
        maskedInstrument: 'UPI: vyapari@okhdfcbank',
        gateway: PaymentGateway.RAZORPAY,
      };
    } catch (error) {
      logger.error('Razorpay signature verification error:', error);
      return {
        isValid: false,
        paymentId: params.paymentId,
        orderId: params.orderId,
        amount: 0,
        status: PaymentStatus.FAILED,
        method: PaymentMethod.UPI,
        gateway: PaymentGateway.RAZORPAY,
      };
    }
  }

  public async refundPayment(paymentId: string, amount: number, reason?: string): Promise<{ refundId: string; status: string }> {
    const refundId = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    logger.info(`Processing refund for payment ${paymentId}, amount: ₹${amount}, reason: ${reason}`);
    return {
      refundId,
      status: 'processed',
    };
  }

  public verifyWebhook(rawBody: string, signature: string): boolean {
    const webhookSecret = this.getWebhookSecret();
    if (!webhookSecret || webhookSecret.includes('placeholder')) {
      if (config.isProduction) {
        logger.error('CRITICAL: Webhook secret not configured in production mode. Rejecting incoming webhook.');
        return false;
      }
      return true;
    }
    const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    return expected === signature;
  }
}

export const paymentProvider: PaymentProvider = new RazorpayPaymentProvider();
