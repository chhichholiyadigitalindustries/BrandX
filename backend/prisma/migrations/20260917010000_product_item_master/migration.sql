-- ============================================================
-- BRANDX PRISMA MIGRATION: PRODUCT / ITEM MASTER MODULE
-- Adds ProductCategory, Product Enhancements, and InventoryTransaction
-- ============================================================

-- Create Enums if they do not exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductUnit') THEN
        CREATE TYPE "ProductUnit" AS ENUM (
            'PCS', 'BOX', 'KG', 'GRAM', 'LITRE', 'ML', 'METER',
            'CM', 'FEET', 'DOZEN', 'PAIR', 'PACK', 'BAG', 'BOTTLE', 'SET', 'OTHER'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaxType') THEN
        CREATE TYPE "TaxType" AS ENUM ('EXCLUSIVE', 'INCLUSIVE', 'EXEMPT');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InventoryTransactionType') THEN
        CREATE TYPE "InventoryTransactionType" AS ENUM (
            'OPENING_STOCK', 'STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT',
            'SALE', 'PURCHASE', 'RETURN_IN', 'RETURN_OUT'
        );
    END IF;
END $$;

-- 1. Create ProductCategory Table
CREATE TABLE IF NOT EXISTS "ProductCategory" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- ProductCategory Foreign Key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ProductCategory_businessId_fkey'
    ) THEN
        ALTER TABLE "ProductCategory"
            ADD CONSTRAINT "ProductCategory_businessId_fkey"
            FOREIGN KEY ("businessId") REFERENCES "Business"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ProductCategory Indexes
CREATE INDEX IF NOT EXISTS "ProductCategory_businessId_idx" ON "ProductCategory"("businessId");
CREATE INDEX IF NOT EXISTS "ProductCategory_businessId_name_idx" ON "ProductCategory"("businessId", "name");

-- 2. Alter Product Table with enhanced fields
ALTER TABLE "Product"
    ADD COLUMN IF NOT EXISTS "itemCode" TEXT,
    ADD COLUMN IF NOT EXISTS "sku" TEXT,
    ADD COLUMN IF NOT EXISTS "categoryId" TEXT,
    ADD COLUMN IF NOT EXISTS "description" TEXT,
    ADD COLUMN IF NOT EXISTS "type" "ItemType" NOT NULL DEFAULT 'GOODS',
    ADD COLUMN IF NOT EXISTS "hsnSac" TEXT,
    ADD COLUMN IF NOT EXISTS "gstPercent" DOUBLE PRECISION NOT NULL DEFAULT 18.0,
    ADD COLUMN IF NOT EXISTS "taxType" "TaxType" NOT NULL DEFAULT 'EXCLUSIVE',
    ADD COLUMN IF NOT EXISTS "cessRate" DECIMAL(5, 2),
    ADD COLUMN IF NOT EXISTS "secondaryUnit" TEXT,
    ADD COLUMN IF NOT EXISTS "conversionFactor" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "openingStock" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS "currentStock" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS "stockQty" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "lowStockThreshold" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS "isAvailable" BOOLEAN NOT NULL DEFAULT true;

-- Adjust pricing column types to Decimal(12, 2)
ALTER TABLE "Product"
    ALTER COLUMN "sellingPrice" TYPE DECIMAL(12, 2) USING "sellingPrice"::numeric(12, 2),
    ALTER COLUMN "purchasePrice" TYPE DECIMAL(12, 2) USING "purchasePrice"::numeric(12, 2),
    ALTER COLUMN "mrp" TYPE DECIMAL(12, 2) USING "mrp"::numeric(12, 2);

-- Safely convert unit column from TEXT to ProductUnit enum if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Product' AND column_name = 'unit' AND data_type = 'text'
    ) THEN
        ALTER TABLE "Product" ALTER COLUMN "unit" DROP DEFAULT;
        ALTER TABLE "Product" ALTER COLUMN "unit" TYPE "ProductUnit" USING (
            CASE 
                WHEN UPPER("unit") IN ('PCS', 'BOX', 'KG', 'GRAM', 'LITRE', 'ML', 'METER', 'CM', 'FEET', 'DOZEN', 'PAIR', 'PACK', 'BAG', 'BOTTLE', 'SET', 'OTHER')
                THEN UPPER("unit")::"ProductUnit"
                ELSE 'PCS'::"ProductUnit"
            END
        );
        ALTER TABLE "Product" ALTER COLUMN "unit" SET DEFAULT 'PCS';
    END IF;
END $$;

-- Product Category Foreign Key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Product_categoryId_fkey'
    ) THEN
        ALTER TABLE "Product"
            ADD CONSTRAINT "Product_categoryId_fkey"
            FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Product Indexes
CREATE INDEX IF NOT EXISTS "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX IF NOT EXISTS "Product_businessId_name_idx" ON "Product"("businessId", "name");
CREATE INDEX IF NOT EXISTS "Product_businessId_sku_idx" ON "Product"("businessId", "sku");
CREATE INDEX IF NOT EXISTS "Product_businessId_itemCode_idx" ON "Product"("businessId", "itemCode");
CREATE INDEX IF NOT EXISTS "Product_businessId_barcode_idx" ON "Product"("businessId", "barcode");
CREATE INDEX IF NOT EXISTS "Product_businessId_categoryId_idx" ON "Product"("businessId", "categoryId");
CREATE INDEX IF NOT EXISTS "Product_businessId_isActive_idx" ON "Product"("businessId", "isActive");

-- 3. Create InventoryTransaction Table
CREATE TABLE IF NOT EXISTS "InventoryTransaction" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "InventoryTransactionType" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "previousStock" DOUBLE PRECISION NOT NULL,
    "newStock" DOUBLE PRECISION NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- InventoryTransaction Foreign Keys
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'InventoryTransaction_businessId_fkey'
    ) THEN
        ALTER TABLE "InventoryTransaction"
            ADD CONSTRAINT "InventoryTransaction_businessId_fkey"
            FOREIGN KEY ("businessId") REFERENCES "Business"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'InventoryTransaction_productId_fkey'
    ) THEN
        ALTER TABLE "InventoryTransaction"
            ADD CONSTRAINT "InventoryTransaction_productId_fkey"
            FOREIGN KEY ("productId") REFERENCES "Product"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- InventoryTransaction Indexes
CREATE INDEX IF NOT EXISTS "InventoryTransaction_businessId_idx" ON "InventoryTransaction"("businessId");
CREATE INDEX IF NOT EXISTS "InventoryTransaction_productId_idx" ON "InventoryTransaction"("productId");
CREATE INDEX IF NOT EXISTS "InventoryTransaction_businessId_productId_idx" ON "InventoryTransaction"("businessId", "productId");
CREATE INDEX IF NOT EXISTS "InventoryTransaction_productId_createdAt_idx" ON "InventoryTransaction"("productId", "createdAt");
