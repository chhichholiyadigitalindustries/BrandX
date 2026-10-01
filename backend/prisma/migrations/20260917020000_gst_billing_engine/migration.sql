-- ============================================================
-- BRANDX PRISMA MIGRATION: GST BILLING + POS INVOICE ENGINE
-- Enums, Decimal precision financial types, snapshots, sequence generator
-- ============================================================

-- 1. Create / Update Enums (Transaction-Safe Definition)
DO $$
BEGIN
    -- Ensure DocumentType exists and contains all required values
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentType') THEN
        CREATE TYPE "DocumentType" AS ENUM (
            'GST_INVOICE', 'RETAIL_BILL', 'QUOTATION', 'ESTIMATE',
            'DELIVERY_CHALLAN', 'PROFORMA_INVOICE', 'TAX_INVOICE', 'ESTIMATE_QUOTATION'
        );
    ELSIF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'DocumentType' AND e.enumlabel = 'GST_INVOICE'
    ) THEN
        ALTER TYPE "DocumentType" RENAME TO "DocumentType_old";
        CREATE TYPE "DocumentType" AS ENUM (
            'GST_INVOICE', 'RETAIL_BILL', 'QUOTATION', 'ESTIMATE',
            'DELIVERY_CHALLAN', 'PROFORMA_INVOICE', 'TAX_INVOICE', 'ESTIMATE_QUOTATION'
        );
        ALTER TABLE "Invoice" ALTER COLUMN "documentType" DROP DEFAULT;
        ALTER TABLE "Invoice" ALTER COLUMN "documentType" TYPE "DocumentType" USING ("documentType"::text::"DocumentType");
        ALTER TABLE "Invoice" ALTER COLUMN "documentType" SET DEFAULT 'GST_INVOICE';
        DROP TYPE "DocumentType_old";
    END IF;

    -- Create InvoiceStatus Enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InvoiceStatus') THEN
        CREATE TYPE "InvoiceStatus" AS ENUM (
            'DRAFT', 'ISSUED', 'PAID', 'PARTIALLY_PAID', 'UNPAID', 'CANCELLED', 'VOID'
        );
    END IF;

    -- Ensure PaymentMethod exists and contains all required values
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentMethod') THEN
        CREATE TYPE "PaymentMethod" AS ENUM (
            'UPI', 'CARD', 'NETBANKING', 'WALLET', 'EMI', 'CASH', 'QR', 'BANK_TRANSFER', 'CREDIT', 'OTHER'
        );
    ELSIF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'PaymentMethod' AND e.enumlabel = 'BANK_TRANSFER'
    ) THEN
        ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";
        CREATE TYPE "PaymentMethod" AS ENUM (
            'UPI', 'CARD', 'NETBANKING', 'WALLET', 'EMI', 'CASH', 'QR', 'BANK_TRANSFER', 'CREDIT', 'OTHER'
        );
        
        ALTER TABLE "InvoicePayment" ALTER COLUMN "paymentMethod" DROP DEFAULT;
        ALTER TABLE "InvoicePayment" ALTER COLUMN "paymentMethod" TYPE "PaymentMethod" USING ("paymentMethod"::text::"PaymentMethod");
        ALTER TABLE "InvoicePayment" ALTER COLUMN "paymentMethod" SET DEFAULT 'UPI';
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PaymentTransaction') THEN
            ALTER TABLE "PaymentTransaction" ALTER COLUMN "method" DROP DEFAULT;
            ALTER TABLE "PaymentTransaction" ALTER COLUMN "method" TYPE "PaymentMethod" USING ("method"::text::"PaymentMethod");
            ALTER TABLE "PaymentTransaction" ALTER COLUMN "method" SET DEFAULT 'UPI';
        END IF;

        DROP TYPE "PaymentMethod_old";
    END IF;
END $$;

-- 2. Alter Invoice Table
ALTER TABLE "Invoice"
    ADD COLUMN IF NOT EXISTS "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    ADD COLUMN IF NOT EXISTS "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS "sellerName" TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "sellerAddress" TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "sellerPhone" TEXT,
    ADD COLUMN IF NOT EXISTS "sellerEmail" TEXT,
    ADD COLUMN IF NOT EXISTS "sellerGSTIN" TEXT,
    ADD COLUMN IF NOT EXISTS "sellerGstin" TEXT,
    ADD COLUMN IF NOT EXISTS "sellerUpi" TEXT,
    ADD COLUMN IF NOT EXISTS "upiIdSnapshot" TEXT,
    ADD COLUMN IF NOT EXISTS "bankDetailsSnapshot" TEXT,
    ADD COLUMN IF NOT EXISTS "buyerName" TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "buyerPhone" TEXT,
    ADD COLUMN IF NOT EXISTS "buyerEmail" TEXT,
    ADD COLUMN IF NOT EXISTS "buyerGSTIN" TEXT,
    ADD COLUMN IF NOT EXISTS "buyerGstin" TEXT,
    ADD COLUMN IF NOT EXISTS "buyerAddress" TEXT,
    ADD COLUMN IF NOT EXISTS "reverseCharge" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "termsAndConditions" TEXT,
    ADD COLUMN IF NOT EXISTS "terms" TEXT,
    ADD COLUMN IF NOT EXISTS "includeSignature" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS "totalDiscount" DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS "totalCGST" DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS "totalSGST" DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS "totalIGST" DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS "totalCess" DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS "roundOff" DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS "grandTotal" DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS "amountDue" DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS "cessAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS "discountCode" TEXT,
    ADD COLUMN IF NOT EXISTS "amountInWords" TEXT,
    ADD COLUMN IF NOT EXISTS "isGstBill" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS "createdBy" TEXT,
    ADD COLUMN IF NOT EXISTS "stockDeducted" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "khataTxId" TEXT;

-- Convert existing calculation columns to Decimal(12, 2)
ALTER TABLE "Invoice"
    ALTER COLUMN "subtotal" TYPE DECIMAL(12, 2) USING "subtotal"::numeric(12, 2),
    ALTER COLUMN "taxableAmount" TYPE DECIMAL(12, 2) USING "taxableAmount"::numeric(12, 2),
    ALTER COLUMN "totalAmount" TYPE DECIMAL(12, 2) USING "totalAmount"::numeric(12, 2),
    ALTER COLUMN "amountPaid" TYPE DECIMAL(12, 2) USING "amountPaid"::numeric(12, 2);

-- Update column defaults to match schema.prisma
ALTER TABLE "Invoice"
    ALTER COLUMN "documentType" SET DEFAULT 'GST_INVOICE',
    ALTER COLUMN "paymentStatus" SET DEFAULT 'PAID';

-- Safely convert paymentMethod from TEXT to PaymentMethod enum if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'paymentMethod' AND data_type = 'text'
    ) THEN
        ALTER TABLE "Invoice" ALTER COLUMN "paymentMethod" DROP DEFAULT;
        ALTER TABLE "Invoice" ALTER COLUMN "paymentMethod" TYPE "PaymentMethod" USING (
            CASE 
                WHEN UPPER("paymentMethod") IN ('UPI','CARD','NETBANKING','WALLET','EMI','CASH','QR','BANK_TRANSFER','CREDIT','OTHER') 
                THEN UPPER("paymentMethod")::"PaymentMethod" 
                ELSE 'UPI'::"PaymentMethod" 
            END
        );
        ALTER TABLE "Invoice" ALTER COLUMN "paymentMethod" SET DEFAULT 'UPI';
    END IF;
END $$;

-- Populate legacy aliases if needed
UPDATE "Invoice"
SET "sellerGSTIN" = "sellerGstin"
WHERE "sellerGSTIN" IS NULL AND "sellerGstin" IS NOT NULL;

UPDATE "Invoice"
SET "buyerGSTIN" = "buyerGstin"
WHERE "buyerGSTIN" IS NULL AND "buyerGstin" IS NOT NULL;

UPDATE "Invoice"
SET "subtotal" = "totalAmount"
WHERE "subtotal" = 0.0 AND "totalAmount" > 0;

UPDATE "Invoice"
SET "grandTotal" = "totalAmount"
WHERE "grandTotal" = 0.0 AND "totalAmount" > 0;

-- Invoice Indexes
CREATE INDEX IF NOT EXISTS "Invoice_businessId_invoiceNumber_idx" ON "Invoice"("businessId", "invoiceNumber");
CREATE INDEX IF NOT EXISTS "Invoice_businessId_invoiceDate_idx" ON "Invoice"("businessId", "invoiceDate");
CREATE INDEX IF NOT EXISTS "Invoice_businessId_status_idx" ON "Invoice"("businessId", "status");
CREATE INDEX IF NOT EXISTS "Invoice_businessId_documentType_idx" ON "Invoice"("businessId", "documentType");

-- 3. Alter InvoiceItem Table
ALTER TABLE "InvoiceItem"
    ADD COLUMN IF NOT EXISTS "productNameSnapshot" TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "itemCodeSnapshot" TEXT,
    ADD COLUMN IF NOT EXISTS "hsnSacSnapshot" TEXT,
    ADD COLUMN IF NOT EXISTS "code" TEXT,
    ADD COLUMN IF NOT EXISTS "type" "ItemType" NOT NULL DEFAULT 'GOODS',
    ADD COLUMN IF NOT EXISTS "qty" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    ADD COLUMN IF NOT EXISTS "mrp" DECIMAL(12, 2),
    ADD COLUMN IF NOT EXISTS "discountType" TEXT NOT NULL DEFAULT 'PERCENT',
    ADD COLUMN IF NOT EXISTS "discountValue" DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS "taxableValue" DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS "gstPercent" DOUBLE PRECISION NOT NULL DEFAULT 18.0,
    ADD COLUMN IF NOT EXISTS "cessAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS "totalAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Convert existing calculation columns to Decimal(12, 2)
ALTER TABLE "InvoiceItem"
    ALTER COLUMN "rate" TYPE DECIMAL(12, 2) USING "rate"::numeric(12, 2),
    ALTER COLUMN "taxableAmount" TYPE DECIMAL(12, 2) USING "taxableAmount"::numeric(12, 2),
    ALTER COLUMN "cgstAmount" TYPE DECIMAL(12, 2) USING "cgstAmount"::numeric(12, 2),
    ALTER COLUMN "sgstAmount" TYPE DECIMAL(12, 2) USING "sgstAmount"::numeric(12, 2),
    ALTER COLUMN "igstAmount" TYPE DECIMAL(12, 2) USING "igstAmount"::numeric(12, 2);

-- Update unit default to match schema.prisma
ALTER TABLE "InvoiceItem"
    ALTER COLUMN "unit" SET DEFAULT 'PCS';

-- Populate snapshots from legacy fields
UPDATE "InvoiceItem"
SET "productNameSnapshot" = "name"
WHERE "productNameSnapshot" = '' AND "name" IS NOT NULL;

UPDATE "InvoiceItem"
SET "itemCodeSnapshot" = "code"
WHERE "itemCodeSnapshot" IS NULL AND "code" IS NOT NULL;

UPDATE "InvoiceItem"
SET "taxableValue" = "taxableAmount"
WHERE "taxableValue" = 0.0 AND "taxableAmount" > 0;

UPDATE "InvoiceItem"
SET "quantity" = "qty"
WHERE "quantity" = 1.0 AND "qty" != 1.0;

-- 4. Alter InvoicePayment Table
ALTER TABLE "InvoicePayment"
    ADD COLUMN IF NOT EXISTS "referenceNumber" TEXT,
    ADD COLUMN IF NOT EXISTS "notes" TEXT,
    ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "InvoicePayment"
    ALTER COLUMN "amount" TYPE DECIMAL(12, 2) USING "amount"::numeric(12, 2);

UPDATE "InvoicePayment"
SET "referenceNumber" = "transactionRef"
WHERE "referenceNumber" IS NULL AND "transactionRef" IS NOT NULL;

UPDATE "InvoicePayment"
SET "notes" = "note"
WHERE "notes" IS NULL AND "note" IS NOT NULL;

-- 5. Create InvoiceNumberSequence Table
CREATE TABLE IF NOT EXISTS "InvoiceNumberSequence" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT 'INV',
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "financialYear" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceNumberSequence_pkey" PRIMARY KEY ("id")
);

-- Foreign Key for InvoiceNumberSequence
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'InvoiceNumberSequence_businessId_fkey'
    ) THEN
        ALTER TABLE "InvoiceNumberSequence"
            ADD CONSTRAINT "InvoiceNumberSequence_businessId_fkey"
            FOREIGN KEY ("businessId") REFERENCES "Business"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Indexes for InvoiceNumberSequence
CREATE UNIQUE INDEX IF NOT EXISTS "InvoiceNumberSequence_businessId_documentType_financialYear_key"
    ON "InvoiceNumberSequence"("businessId", "documentType", "financialYear");

CREATE INDEX IF NOT EXISTS "InvoiceNumberSequence_businessId_idx"
    ON "InvoiceNumberSequence"("businessId");

CREATE INDEX IF NOT EXISTS "InvoiceNumberSequence_businessId_financialYear_idx"
    ON "InvoiceNumberSequence"("businessId", "financialYear");
