-- CreateTable
CREATE TABLE IF NOT EXISTS "WaitlistEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "phone" TEXT NOT NULL UNIQUE,
    "email" TEXT,
    "businessName" TEXT,
    "businessType" TEXT,
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WaitlistEntry_phone_idx" ON "WaitlistEntry"("phone");
