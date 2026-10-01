-- ============================================================
-- BRANDX MIGRATION: DIGITAL DUKAAN + NFC DIGITAL VISITING CARD
-- ============================================================

-- AlterTable DigitalStore
ALTER TABLE "DigitalStore" 
ADD COLUMN IF NOT EXISTS "tagline" TEXT,
ADD COLUMN IF NOT EXISTS "whatsappNumber" TEXT,
ADD COLUMN IF NOT EXISTS "whatsapp" TEXT,
ADD COLUMN IF NOT EXISTS "email" TEXT,
ADD COLUMN IF NOT EXISTS "address" TEXT,
ADD COLUMN IF NOT EXISTS "city" TEXT,
ADD COLUMN IF NOT EXISTS "state" TEXT,
ADD COLUMN IF NOT EXISTS "pincode" TEXT,
ADD COLUMN IF NOT EXISTS "mapUrl" TEXT,
ADD COLUMN IF NOT EXISTS "websiteUrl" TEXT,
ADD COLUMN IF NOT EXISTS "website" TEXT,
ADD COLUMN IF NOT EXISTS "upiId" TEXT,
ADD COLUMN IF NOT EXISTS "businessHours" TEXT,
ADD COLUMN IF NOT EXISTS "googleReviewUrl" TEXT,
ADD COLUMN IF NOT EXISTS "instagram" TEXT,
ADD COLUMN IF NOT EXISTS "socialLinks" JSONB,
ADD COLUMN IF NOT EXISTS "theme" TEXT NOT NULL DEFAULT 'emerald',
ADD COLUMN IF NOT EXISTS "viewsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndexes for DigitalStore
CREATE INDEX IF NOT EXISTS "DigitalStore_businessId_idx" ON "DigitalStore"("businessId");
CREATE INDEX IF NOT EXISTS "DigitalStore_isPublished_idx" ON "DigitalStore"("isPublished");

-- AlterTable DigitalStoreItem
ALTER TABLE "DigitalStoreItem"
ADD COLUMN IF NOT EXISTS "displayName" TEXT,
ADD COLUMN IF NOT EXISTS "displayPrice" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "isVisible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndexes for DigitalStoreItem
CREATE INDEX IF NOT EXISTS "DigitalStoreItem_productId_idx" ON "DigitalStoreItem"("productId");
CREATE INDEX IF NOT EXISTS "DigitalStoreItem_sortOrder_idx" ON "DigitalStoreItem"("sortOrder");

-- AlterTable DigitalCard
ALTER TABLE "DigitalCard"
ADD COLUMN IF NOT EXISTS "digitalStoreId" TEXT,
ADD COLUMN IF NOT EXISTS "fullName" TEXT,
ADD COLUMN IF NOT EXISTS "companyName" TEXT,
ADD COLUMN IF NOT EXISTS "phone" TEXT,
ADD COLUMN IF NOT EXISTS "logoUrl" TEXT,
ADD COLUMN IF NOT EXISTS "viewsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndexes for DigitalCard
CREATE INDEX IF NOT EXISTS "DigitalCard_digitalStoreId_idx" ON "DigitalCard"("digitalStoreId");
CREATE INDEX IF NOT EXISTS "DigitalCard_isPublished_idx" ON "DigitalCard"("isPublished");

-- AddForeignKey if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'DigitalCard_digitalStoreId_fkey'
    ) THEN
        ALTER TABLE "DigitalCard" 
        ADD CONSTRAINT "DigitalCard_digitalStoreId_fkey" 
        FOREIGN KEY ("digitalStoreId") REFERENCES "DigitalStore"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
