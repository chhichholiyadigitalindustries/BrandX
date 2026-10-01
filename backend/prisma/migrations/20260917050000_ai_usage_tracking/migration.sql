-- ============================================================
-- BRANDX: AI USAGE TRACKING & RATE LIMITING MIGRATION
-- Safe, non-destructive migration creating AIUsage table and indexes
-- ============================================================

-- CreateTable
CREATE TABLE IF NOT EXISTS "AIUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT,
    "feature" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "requestId" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "totalTokens" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIUsage_userId_idx" ON "AIUsage"("userId");
CREATE INDEX IF NOT EXISTS "AIUsage_businessId_idx" ON "AIUsage"("businessId");
CREATE INDEX IF NOT EXISTS "AIUsage_feature_idx" ON "AIUsage"("feature");
CREATE INDEX IF NOT EXISTS "AIUsage_createdAt_idx" ON "AIUsage"("createdAt");
CREATE INDEX IF NOT EXISTS "AIUsage_status_idx" ON "AIUsage"("status");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AIUsage_userId_fkey'
    ) THEN
        ALTER TABLE "AIUsage" ADD CONSTRAINT "AIUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AIUsage_businessId_fkey'
    ) THEN
        ALTER TABLE "AIUsage" ADD CONSTRAINT "AIUsage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
