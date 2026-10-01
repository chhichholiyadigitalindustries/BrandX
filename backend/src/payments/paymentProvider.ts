/**
 * BRANDX — Payment Provider Abstraction Layer
 * Pluggable architecture supporting Razorpay, Cashfree, PhonePe, Stripe, and Mock providers.
 */

import { PaymentGateway, PaymentMethod, PaymentStatus } from '@prisma/client';

export interface CreateOrderParams {
  amount: number; // in standard currency units (e.g., ₹199)
  currency?: string; // default "INR"
  receipt: string;
  notes?: Record<string, string>;
  customer?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
}

export interface PaymentOrderResult {
  orderId: string;
  amount: number; // in smallest currency units (e.g. 19900 paise) or standard depending on consumer
  currency: string;
  keyId: string;
  gateway: PaymentGateway;
  rawResponse?: any;
}

export interface VerifyPaymentParams {
  orderId: string;
  paymentId: string;
  signature?: string;
  rawPayload?: any;
}

export interface PaymentVerificationResult {
  isValid: boolean;
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  maskedInstrument?: string;
  gateway: PaymentGateway;
  error?: string;
  rawResponse?: any;
}

export interface RefundParams {
  paymentId: string;
  amount: number;
  currency?: string;
  reason?: string;
  notes?: Record<string, string>;
}

export interface RefundResult {
  refundId: string;
  paymentId: string;
  amount: number;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
  gateway: PaymentGateway;
  rawResponse?: any;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  eventId?: string;
  eventType?: string;
  eventPayload?: any;
  error?: string;
}

export interface PaymentProvider {
  readonly gatewayName: PaymentGateway;
  isConfigured(): boolean;
  createOrder(params: CreateOrderParams): Promise<PaymentOrderResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerificationResult>;
  refundPayment(params: RefundParams): Promise<RefundResult>;
  verifyWebhookSignature(rawBody: string, signature: string): WebhookVerificationResult;
}
