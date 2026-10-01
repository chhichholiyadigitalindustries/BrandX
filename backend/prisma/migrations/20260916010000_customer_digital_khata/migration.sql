-- AlterEnum
ALTER TYPE "KhataTransactionType" ADD VALUE IF NOT EXISTS 'UDHAAR';
ALTER TYPE "KhataTransactionType" ADD VALUE IF NOT EXISTS 'JAMA';

-- AlterTable Customer
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "balance" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- AlterTable KhataTransaction
ALTER TABLE "KhataTransaction" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Customer_businessId_mobile_idx" ON "Customer"("businessId", "mobile");
CREATE INDEX IF NOT EXISTS "Customer_businessId_name_idx" ON "Customer"("businessId", "name");
CREATE INDEX IF NOT EXISTS "KhataTransaction_businessId_customerId_idx" ON "KhataTransaction"("businessId", "customerId");
CREATE INDEX IF NOT EXISTS "KhataTransaction_businessId_transactionDate_idx" ON "KhataTransaction"("businessId", "transactionDate");
