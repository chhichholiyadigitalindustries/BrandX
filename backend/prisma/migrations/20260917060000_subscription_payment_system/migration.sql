-- ============================================================
-- BRANDX MIGRATION: Subscription, Pro Plan & Payment Architecture
-- Safe, Idempotent DDL - Non-destructive
-- ============================================================

-- 1. Enum value additions
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'TRIALING';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PAUSED';

ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'CREATED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'AUTHORIZED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'CAPTURED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_REFUNDED';

ALTER TYPE "PaymentGateway" ADD VALUE IF NOT EXISTS 'STRIPE';

ALTER TYPE "RefundStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "RefundStatus" ADD VALUE IF NOT EXISTS 'PROCESSED';
ALTER TYPE "RefundStatus" ADD VALUE IF NOT EXISTS 'FAILED';

-- 2. SubscriptionPlan enhancements
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "billingInterval" TEXT;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "durationDays" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS "SubscriptionPlan_isActive_idx" ON "SubscriptionPlan"("isActive");

-- 3. Subscription lifecycle fields
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "currentPeriodStart" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "endedAt" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "providerCustomerId" TEXT;
CREATE INDEX IF NOT EXISTS "Subscription_currentPeriodEnd_idx" ON "Subscription"("currentPeriodEnd");

-- 4. PaymentTransaction tracking enhancements
ALTER TABLE "PaymentTransaction" ADD COLUMN IF NOT EXISTS "providerOrderId" TEXT;
ALTER TABLE "PaymentTransaction" ADD COLUMN IF NOT EXISTS "providerPaymentId" TEXT;
ALTER TABLE "PaymentTransaction" ADD COLUMN IF NOT EXISTS "providerSignature" TEXT;
ALTER TABLE "PaymentTransaction" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "PaymentTransaction" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE "PaymentTransaction" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
ALTER TABLE "PaymentTransaction" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 5. RefundRecord enhancements
ALTER TABLE "RefundRecord" ADD COLUMN IF NOT EXISTS "providerRefundId" TEXT;
ALTER TABLE "RefundRecord" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- 6. WebhookEvent model for Idempotency
CREATE TABLE IF NOT EXISTS "WebhookEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'RAZORPAY',
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSED',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WebhookEvent_eventId_key" ON "WebhookEvent"("eventId");
CREATE INDEX IF NOT EXISTS "WebhookEvent_eventId_idx" ON "WebhookEvent"("eventId");
CREATE INDEX IF NOT EXISTS "WebhookEvent_provider_eventType_idx" ON "WebhookEvent"("provider", "eventType");
CREATE INDEX IF NOT EXISTS "WebhookEvent_createdAt_idx" ON "WebhookEvent"("createdAt");
