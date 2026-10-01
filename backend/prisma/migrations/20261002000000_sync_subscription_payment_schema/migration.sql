-- ============================================================
-- BRANDX MIGRATION: Sync Subscription & Payment Schema
-- Safe, Idempotent DDL - Non-destructive
-- Adds missing columns expected by Prisma models to PostgreSQL
-- ============================================================

-- 1. SubscriptionPlan table additions
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "price" DOUBLE PRECISION;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "originalPrice" DOUBLE PRECISION;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'INR';
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "billingCycle" TEXT DEFAULT 'monthly';
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "tagline" TEXT;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "isPopular" BOOLEAN DEFAULT false;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "limits" JSONB DEFAULT '{}'::jsonb;

-- Backfill SubscriptionPlan fields if null
UPDATE "SubscriptionPlan"
SET "price" = COALESCE("price", "priceMonthly", 0.0),
    "currency" = COALESCE("currency", 'INR'),
    "billingCycle" = COALESCE("billingCycle", "billingInterval", 'monthly'),
    "limits" = COALESCE("limits", '{}'::jsonb),
    "isPopular" = COALESCE("isPopular", false)
WHERE "price" IS NULL;

ALTER TABLE "SubscriptionPlan" ALTER COLUMN "price" SET NOT NULL;
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "price" SET DEFAULT 0.0;
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "currency" SET NOT NULL;
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "currency" SET DEFAULT 'INR';
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "billingCycle" SET NOT NULL;
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "billingCycle" SET DEFAULT 'monthly';
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "isPopular" SET NOT NULL;
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "isPopular" SET DEFAULT false;
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "limits" SET NOT NULL;
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "limits" SET DEFAULT '{}'::jsonb;
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "status" TYPE TEXT;
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "status" SET DEFAULT 'active';
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "nameHindi" DROP NOT NULL;
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "priceMonthly" DROP NOT NULL;
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "priceYearly" DROP NOT NULL;

-- 2. Subscription table additions
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "amount" DOUBLE PRECISION;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'INR';
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "paymentProvider" "PaymentGateway" DEFAULT 'RAZORPAY';
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "providerSubscriptionId" TEXT;

UPDATE "Subscription"
SET "amount" = COALESCE("amount", "amountPaid", 0.0),
    "currency" = COALESCE("currency", 'INR'),
    "paymentProvider" = COALESCE("paymentProvider", 'RAZORPAY'::"PaymentGateway"),
    "providerSubscriptionId" = COALESCE("providerSubscriptionId", "lastPaymentId")
WHERE "amount" IS NULL;

ALTER TABLE "Subscription" ALTER COLUMN "amount" SET NOT NULL;
ALTER TABLE "Subscription" ALTER COLUMN "amount" SET DEFAULT 0.0;
ALTER TABLE "Subscription" ALTER COLUMN "currency" SET NOT NULL;
ALTER TABLE "Subscription" ALTER COLUMN "currency" SET DEFAULT 'INR';
ALTER TABLE "Subscription" ALTER COLUMN "paymentProvider" SET NOT NULL;
ALTER TABLE "Subscription" ALTER COLUMN "paymentProvider" SET DEFAULT 'RAZORPAY';
ALTER TABLE "Subscription" ALTER COLUMN "planCode" DROP NOT NULL;
ALTER TABLE "Subscription" ALTER COLUMN "billingCycle" DROP NOT NULL;
ALTER TABLE "Subscription" ALTER COLUMN "amountPaid" DROP NOT NULL;

-- 3. PaymentTransaction table additions
ALTER TABLE "PaymentTransaction" ADD COLUMN IF NOT EXISTS "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE "PaymentTransaction" ADD COLUMN IF NOT EXISTS "gatewayFee" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE "PaymentTransaction" ADD COLUMN IF NOT EXISTS "netAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE "PaymentTransaction" ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethod" DEFAULT 'UPI';
ALTER TABLE "PaymentTransaction" ADD COLUMN IF NOT EXISTS "maskedInstrument" TEXT;
ALTER TABLE "PaymentTransaction" ADD COLUMN IF NOT EXISTS "failureReason" TEXT;
ALTER TABLE "PaymentTransaction" ADD COLUMN IF NOT EXISTS "failureCode" TEXT;
ALTER TABLE "PaymentTransaction" ADD COLUMN IF NOT EXISTS "refundId" TEXT;
ALTER TABLE "PaymentTransaction" ADD COLUMN IF NOT EXISTS "refundAmount" DOUBLE PRECISION;
ALTER TABLE "PaymentTransaction" ADD COLUMN IF NOT EXISTS "refundDate" TIMESTAMP(3);

UPDATE "PaymentTransaction"
SET "paymentMethod" = COALESCE("paymentMethod", "method", 'UPI'::"PaymentMethod"),
    "failureReason" = COALESCE("failureReason", "errorMessage")
WHERE "paymentMethod" IS NULL;

ALTER TABLE "PaymentTransaction" ALTER COLUMN "paymentMethod" SET NOT NULL;
ALTER TABLE "PaymentTransaction" ALTER COLUMN "paymentMethod" SET DEFAULT 'UPI';

-- 4. AuditLog table additions
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
UPDATE "AuditLog" SET "metadata" = "details" WHERE "metadata" IS NULL AND "details" IS NOT NULL;
