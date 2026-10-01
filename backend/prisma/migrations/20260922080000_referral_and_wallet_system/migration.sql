-- ============================================================
-- BRANDX SAFE MIGRATION: Referral & Coin Wallet Ledger Architecture
-- Idempotent, non-destructive DDL ensuring PostgreSQL production readiness
-- ============================================================

-- 1. Create Enums if they do not already exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReferralStatus') THEN
        CREATE TYPE "ReferralStatus" AS ENUM (
            'CLICKED', 'REGISTERED', 'VERIFIED', 'ELIGIBLE', 'REWARDED', 'REJECTED'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WalletTransactionType') THEN
        CREATE TYPE "WalletTransactionType" AS ENUM (
            'REFERRAL_REWARD', 'WITHDRAWAL', 'WITHDRAWAL_REVERSAL', 'ADMIN_ADJUSTMENT', 'BONUS', 'EXPIRY'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WithdrawalStatus') THEN
        CREATE TYPE "WithdrawalStatus" AS ENUM (
            'PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PayoutMethod') THEN
        CREATE TYPE "PayoutMethod" AS ENUM (
            'UPI', 'BANK_ACCOUNT'
        );
    END IF;
END $$;

-- 2. Alter User table to support Referral Tracking & Verifications
ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "referralCode" TEXT,
    ADD COLUMN IF NOT EXISTS "referredByCode" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_referralCode_key" ON "User"("referralCode");
CREATE INDEX IF NOT EXISTS "User_referralCode_idx" ON "User"("referralCode");

-- 3. Create ReferralConfig Table
CREATE TABLE IF NOT EXISTS "ReferralConfig" (
    "id" TEXT NOT NULL,
    "minRewardCoins" INTEGER NOT NULL DEFAULT 100,
    "maxRewardCoins" INTEGER NOT NULL DEFAULT 500,
    "rewardStep" INTEGER NOT NULL DEFAULT 50,
    "rewardMode" TEXT NOT NULL DEFAULT 'RANDOM',
    "fixedRewardCoins" INTEGER NOT NULL DEFAULT 200,
    "coinsPerInr" INTEGER NOT NULL DEFAULT 100,
    "minWithdrawalCoins" INTEGER NOT NULL DEFAULT 10000,
    "eligibilityCondition" TEXT NOT NULL DEFAULT 'ONBOARDING_COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralConfig_pkey" PRIMARY KEY ("id")
);

-- 4. Create Referral Table
CREATE TABLE IF NOT EXISTS "Referral" (
    "id" TEXT NOT NULL,
    "referrerUserId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'REGISTERED',
    "rewardCoins" INTEGER NOT NULL DEFAULT 0,
    "rewardedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Referral_referredUserId_key" ON "Referral"("referredUserId");
CREATE INDEX IF NOT EXISTS "Referral_referrerUserId_idx" ON "Referral"("referrerUserId");
CREATE INDEX IF NOT EXISTS "Referral_referralCode_idx" ON "Referral"("referralCode");
CREATE INDEX IF NOT EXISTS "Referral_status_idx" ON "Referral"("status");
CREATE INDEX IF NOT EXISTS "Referral_createdAt_idx" ON "Referral"("createdAt");

-- Referral Foreign Keys
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Referral_referrerUserId_fkey') THEN
        ALTER TABLE "Referral"
            ADD CONSTRAINT "Referral_referrerUserId_fkey"
            FOREIGN KEY ("referrerUserId") REFERENCES "User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Referral_referredUserId_fkey') THEN
        ALTER TABLE "Referral"
            ADD CONSTRAINT "Referral_referredUserId_fkey"
            FOREIGN KEY ("referredUserId") REFERENCES "User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 5. Create Wallet Table
CREATE TABLE IF NOT EXISTS "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "availableCoins" INTEGER NOT NULL DEFAULT 0,
    "pendingCoins" INTEGER NOT NULL DEFAULT 0,
    "totalEarnedCoins" INTEGER NOT NULL DEFAULT 0,
    "totalWithdrawnCoins" INTEGER NOT NULL DEFAULT 0,
    "totalWithdrawnInr" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Wallet_userId_key" ON "Wallet"("userId");
CREATE INDEX IF NOT EXISTS "Wallet_userId_idx" ON "Wallet"("userId");

-- Wallet Foreign Key
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Wallet_userId_fkey') THEN
        ALTER TABLE "Wallet"
            ADD CONSTRAINT "Wallet_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 6. Create WalletTransaction Table
CREATE TABLE IF NOT EXISTS "WalletTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "coins" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "adminId" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WalletTransaction_userId_idx" ON "WalletTransaction"("userId");
CREATE INDEX IF NOT EXISTS "WalletTransaction_walletId_idx" ON "WalletTransaction"("walletId");
CREATE INDEX IF NOT EXISTS "WalletTransaction_type_idx" ON "WalletTransaction"("type");
CREATE INDEX IF NOT EXISTS "WalletTransaction_createdAt_idx" ON "WalletTransaction"("createdAt");

-- WalletTransaction Foreign Key
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WalletTransaction_userId_fkey') THEN
        ALTER TABLE "WalletTransaction"
            ADD CONSTRAINT "WalletTransaction_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 7. Create Withdrawal Table
CREATE TABLE IF NOT EXISTS "Withdrawal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "coins" INTEGER NOT NULL,
    "amountInr" INTEGER NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "payoutMethod" "PayoutMethod" NOT NULL DEFAULT 'UPI',
    "payoutAccount" TEXT NOT NULL,
    "accountHolderName" TEXT,
    "payoutReference" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "processedByAdminId" TEXT,
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Withdrawal_userId_idx" ON "Withdrawal"("userId");
CREATE INDEX IF NOT EXISTS "Withdrawal_status_idx" ON "Withdrawal"("status");
CREATE INDEX IF NOT EXISTS "Withdrawal_createdAt_idx" ON "Withdrawal"("createdAt");

-- Withdrawal Foreign Key
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Withdrawal_userId_fkey') THEN
        ALTER TABLE "Withdrawal"
            ADD CONSTRAINT "Withdrawal_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
