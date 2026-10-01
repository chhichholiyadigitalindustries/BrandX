-- ============================================================
-- BRANDX MIGRATION: 365-DAY DAILY STATUS + FESTIVAL / POSTER CMS
-- ============================================================

-- Create Enums safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContentType') THEN
        CREATE TYPE "ContentType" AS ENUM (
            'MORNING_GREETING',
            'SUVICHAR',
            'FESTIVAL',
            'BUSINESS',
            'MOTIVATIONAL',
            'SALE',
            'ANNOUNCEMENT',
            'CUSTOM'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContentEventType') THEN
        CREATE TYPE "ContentEventType" AS ENUM (
            'VIEW',
            'DOWNLOAD',
            'SHARE',
            'WHATSAPP_CLICK',
            'FAVORITE'
        );
    END IF;
END $$;

-- Create ContentCategory Table if not exists
CREATE TABLE IF NOT EXISTS "ContentCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'category',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentCategory_pkey" PRIMARY KEY ("id")
);

-- Alter ContentCategory if already existed
ALTER TABLE "ContentCategory"
ADD COLUMN IF NOT EXISTS "description" TEXT,
ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "icon" TEXT NOT NULL DEFAULT 'category',
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "ContentCategory_slug_key" ON "ContentCategory"("slug");
CREATE INDEX IF NOT EXISTS "ContentCategory_slug_idx" ON "ContentCategory"("slug");
CREATE INDEX IF NOT EXISTS "ContentCategory_isActive_idx" ON "ContentCategory"("isActive");

-- Create Festival Table if not exists
CREATE TABLE IF NOT EXISTS "Festival" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hindiName" TEXT,
    "slug" TEXT NOT NULL DEFAULT '',
    "description" TEXT,
    "festivalDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" TEXT NOT NULL DEFAULT '',
    "year" INTEGER NOT NULL DEFAULT 2026,
    "language" TEXT DEFAULT 'hi',
    "imageUrl" TEXT,
    "bannerUrl" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Festival_pkey" PRIMARY KEY ("id")
);

-- Alter Festival if already existed
ALTER TABLE "Festival"
ADD COLUMN IF NOT EXISTS "hindiName" TEXT,
ADD COLUMN IF NOT EXISTS "slug" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "festivalDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "year" INTEGER NOT NULL DEFAULT 2026,
ADD COLUMN IF NOT EXISTS "language" TEXT DEFAULT 'hi',
ADD COLUMN IF NOT EXISTS "imageUrl" TEXT,
ADD COLUMN IF NOT EXISTS "priority" INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS "Festival_slug_key" ON "Festival"("slug");
CREATE INDEX IF NOT EXISTS "Festival_festivalDate_idx" ON "Festival"("festivalDate");
CREATE INDEX IF NOT EXISTS "Festival_year_idx" ON "Festival"("year");
CREATE INDEX IF NOT EXISTS "Festival_slug_idx" ON "Festival"("slug");
CREATE INDEX IF NOT EXISTS "Festival_date_idx" ON "Festival"("date");
CREATE INDEX IF NOT EXISTS "Festival_isActive_idx" ON "Festival"("isActive");

-- Create DailyContent Table if not exists
CREATE TABLE IF NOT EXISTS "DailyContent" (
    "id" TEXT NOT NULL,
    "date" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "contentText" TEXT,
    "headline" TEXT,
    "quoteHindi" TEXT,
    "quoteEnglish" TEXT,
    "quoteHinglish" TEXT,
    "language" TEXT NOT NULL DEFAULT 'hi',
    "category" TEXT NOT NULL DEFAULT 'suvichar',
    "categoryId" TEXT,
    "contentType" "ContentType" NOT NULL DEFAULT 'SUVICHAR',
    "imageUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "aspectRatio" TEXT NOT NULL DEFAULT '9:16',
    "contentDate" TIMESTAMP(3),
    "festivalId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "publishAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "publishDateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sharesCount" INTEGER NOT NULL DEFAULT 0,
    "downloadsCount" INTEGER NOT NULL DEFAULT 0,
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdBy" TEXT,
    "authorAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyContent_pkey" PRIMARY KEY ("id")
);

-- Alter DailyContent if already existed
ALTER TABLE "DailyContent"
ADD COLUMN IF NOT EXISTS "description" TEXT,
ADD COLUMN IF NOT EXISTS "contentText" TEXT,
ADD COLUMN IF NOT EXISTS "categoryId" TEXT,
ADD COLUMN IF NOT EXISTS "contentType" "ContentType" NOT NULL DEFAULT 'SUVICHAR',
ADD COLUMN IF NOT EXISTS "contentDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "festivalId" TEXT,
ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "publishAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "viewsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "createdBy" TEXT;

CREATE INDEX IF NOT EXISTS "DailyContent_contentDate_idx" ON "DailyContent"("contentDate");
CREATE INDEX IF NOT EXISTS "DailyContent_date_idx" ON "DailyContent"("date");
CREATE INDEX IF NOT EXISTS "DailyContent_categoryId_idx" ON "DailyContent"("categoryId");
CREATE INDEX IF NOT EXISTS "DailyContent_festivalId_idx" ON "DailyContent"("festivalId");
CREATE INDEX IF NOT EXISTS "DailyContent_language_idx" ON "DailyContent"("language");
CREATE INDEX IF NOT EXISTS "DailyContent_isPublished_idx" ON "DailyContent"("isPublished");
CREATE INDEX IF NOT EXISTS "DailyContent_publishAt_idx" ON "DailyContent"("publishAt");
CREATE INDEX IF NOT EXISTS "DailyContent_contentType_idx" ON "DailyContent"("contentType");
CREATE INDEX IF NOT EXISTS "DailyContent_isFeatured_idx" ON "DailyContent"("isFeatured");

-- Create ContentAsset Table if not exists
CREATE TABLE IF NOT EXISTS "ContentAsset" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "contentType" "ContentType" NOT NULL DEFAULT 'BUSINESS',
    "categoryId" TEXT,
    "festivalId" TEXT,
    "language" TEXT NOT NULL DEFAULT 'hi',
    "aspectRatio" TEXT NOT NULL DEFAULT '1:1',
    "format" TEXT NOT NULL DEFAULT '1:1 Sq',
    "tier" "ContentTier" NOT NULL DEFAULT 'FREE',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "sharesCount" INTEGER NOT NULL DEFAULT 0,
    "downloadsCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ContentAsset_categoryId_idx" ON "ContentAsset"("categoryId");
CREATE INDEX IF NOT EXISTS "ContentAsset_festivalId_idx" ON "ContentAsset"("festivalId");
CREATE INDEX IF NOT EXISTS "ContentAsset_language_idx" ON "ContentAsset"("language");
CREATE INDEX IF NOT EXISTS "ContentAsset_contentType_idx" ON "ContentAsset"("contentType");
CREATE INDEX IF NOT EXISTS "ContentAsset_isPublished_idx" ON "ContentAsset"("isPublished");
CREATE INDEX IF NOT EXISTS "ContentAsset_aspectRatio_idx" ON "ContentAsset"("aspectRatio");
CREATE INDEX IF NOT EXISTS "ContentAsset_tier_idx" ON "ContentAsset"("tier");

-- Create ContentEvent Table if not exists
CREATE TABLE IF NOT EXISTS "ContentEvent" (
    "id" TEXT NOT NULL,
    "contentId" TEXT,
    "assetId" TEXT,
    "userId" TEXT,
    "businessId" TEXT,
    "eventType" "ContentEventType" NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ContentEvent_contentId_idx" ON "ContentEvent"("contentId");
CREATE INDEX IF NOT EXISTS "ContentEvent_assetId_idx" ON "ContentEvent"("assetId");
CREATE INDEX IF NOT EXISTS "ContentEvent_eventType_idx" ON "ContentEvent"("eventType");
CREATE INDEX IF NOT EXISTS "ContentEvent_userId_idx" ON "ContentEvent"("userId");
CREATE INDEX IF NOT EXISTS "ContentEvent_businessId_idx" ON "ContentEvent"("businessId");
CREATE INDEX IF NOT EXISTS "ContentEvent_createdAt_idx" ON "ContentEvent"("createdAt");

-- Add Foreign Keys
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DailyContent_categoryId_fkey') THEN
        ALTER TABLE "DailyContent"
        ADD CONSTRAINT "DailyContent_categoryId_fkey"
        FOREIGN KEY ("categoryId") REFERENCES "ContentCategory"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DailyContent_festivalId_fkey') THEN
        ALTER TABLE "DailyContent"
        ADD CONSTRAINT "DailyContent_festivalId_fkey"
        FOREIGN KEY ("festivalId") REFERENCES "Festival"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ContentAsset_categoryId_fkey') THEN
        ALTER TABLE "ContentAsset"
        ADD CONSTRAINT "ContentAsset_categoryId_fkey"
        FOREIGN KEY ("categoryId") REFERENCES "ContentCategory"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ContentAsset_festivalId_fkey') THEN
        ALTER TABLE "ContentAsset"
        ADD CONSTRAINT "ContentAsset_festivalId_fkey"
        FOREIGN KEY ("festivalId") REFERENCES "Festival"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ContentEvent_contentId_fkey') THEN
        ALTER TABLE "ContentEvent"
        ADD CONSTRAINT "ContentEvent_contentId_fkey"
        FOREIGN KEY ("contentId") REFERENCES "DailyContent"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ContentEvent_assetId_fkey') THEN
        ALTER TABLE "ContentEvent"
        ADD CONSTRAINT "ContentEvent_assetId_fkey"
        FOREIGN KEY ("assetId") REFERENCES "ContentAsset"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
