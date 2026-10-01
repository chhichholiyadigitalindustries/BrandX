-- BRANDX SAFE MIGRATION: Firebase Authentication User Mapping
-- Preserves all existing user records, businesses, and relational data

-- 1. Add firebaseUid column to User table if not exists
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firebaseUid" TEXT;

-- 2. Create unique index on firebaseUid
CREATE UNIQUE INDEX IF NOT EXISTS "User_firebaseUid_key" ON "User"("firebaseUid");

-- 3. Create performance index on firebaseUid
CREATE INDEX IF NOT EXISTS "User_firebaseUid_idx" ON "User"("firebaseUid");

-- 4. Allow nullable mobile for email/password-only authentications
ALTER TABLE "User" ALTER COLUMN "mobile" DROP NOT NULL;
