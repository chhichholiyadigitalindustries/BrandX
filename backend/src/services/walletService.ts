/**
 * BRANDX — Coin Wallet & Ledger Service
 * PostgreSQL-backed wallet engine with strict integer arithmetic (100 coins = ₹1),
 * atomic double-spend protection via SELECT FOR UPDATE, and immutable ledger logging.
 */

import { prisma } from '../config/database.js';
import { auditRepository } from '../repositories/auditRepository.js';

export interface CreditCoinsParams {
  userId: string;
  coins: number;
  type: 'REFERRAL_REWARD' | 'BONUS' | 'ADMIN_ADJUSTMENT' | 'WITHDRAWAL_REVERSAL';
  referenceType?: string;
  referenceId?: string;
  description: string;
  adminId?: string;
  reason?: string;
}

export interface WithdrawalRequestParams {
  userId: string;
  coins: number;
  payoutMethod: 'UPI' | 'BANK_ACCOUNT';
  payoutAccount: string;
  accountHolderName?: string;
}

export class WalletService {
  /**
   * Fetch or create a user's wallet.
   */
  async getOrCreateWallet(userId: string) {
    let wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId,
          availableCoins: 0,
          pendingCoins: 0,
          totalEarnedCoins: 0,
          totalWithdrawnCoins: 0,
          totalWithdrawnInr: 0,
        },
      });
    }

    return wallet;
  }

  /**
   * Get user wallet balance, INR equivalents, and withdrawal rules.
   */
  async getWalletSummary(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);

    // Fetch live referral config for conversion rates & limits
    let cfg = await prisma.referralConfig.findFirst();
    const coinsPerInr = cfg?.coinsPerInr || 100;
    const minWithdrawalCoins = cfg?.minWithdrawalCoins || 10000;

    // Strict integer division without float rounding issues
    const equivalentInr = Math.floor(wallet.availableCoins / coinsPerInr);
    const minWithdrawalInr = Math.floor(minWithdrawalCoins / coinsPerInr);
    const totalEarnedInr = Math.floor(wallet.totalEarnedCoins / coinsPerInr);

    return {
      availableCoins: wallet.availableCoins,
      equivalentInr,
      pendingCoins: wallet.pendingCoins,
      totalEarnedCoins: wallet.totalEarnedCoins,
      totalEarnedInr,
      totalWithdrawnCoins: wallet.totalWithdrawnCoins,
      totalWithdrawnInr: wallet.totalWithdrawnInr,
      coinsPerInr,
      minWithdrawalCoins,
      minWithdrawalInr,
      canWithdraw: wallet.availableCoins >= minWithdrawalCoins,
    };
  }

  /**
   * Credit coins atomically to user wallet with immutable ledger entry.
   */
  async creditCoins(params: CreditCoinsParams) {
    const { userId, coins, type, referenceType, referenceId, description, adminId, reason } = params;

    if (!Number.isInteger(coins) || coins <= 0) {
      throw new Error('Coins to credit must be a positive integer.');
    }

    return prisma.$transaction(
      async (tx) => {
      // 1. Acquire row-level lock on user's wallet
      await tx.$executeRaw`
        INSERT INTO "public"."Wallet" ("id", "userId", "availableCoins", "pendingCoins", "totalEarnedCoins", "totalWithdrawnCoins", "totalWithdrawnInr", "version", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), ${userId}, 0, 0, 0, 0, 0, 0, NOW(), NOW())
        ON CONFLICT ("userId") DO NOTHING;
      `;

      const [walletRow] = await tx.$queryRaw<Array<{ id: string; availableCoins: number; totalEarnedCoins: number }>>`
        SELECT "id", "availableCoins", "totalEarnedCoins"
        FROM "public"."Wallet"
        WHERE "userId" = ${userId}
        FOR UPDATE;
      `;

      if (!walletRow) {
        throw new Error('Wallet not found for user.');
      }

      const newAvailable = walletRow.availableCoins + coins;
      const newTotalEarned =
        type === 'WITHDRAWAL_REVERSAL'
          ? walletRow.totalEarnedCoins // Don't inflate lifetime earnings on reversal
          : walletRow.totalEarnedCoins + coins;

      // 2. Update wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { id: walletRow.id },
        data: {
          availableCoins: newAvailable,
          totalEarnedCoins: newTotalEarned,
          version: { increment: 1 },
        },
      });

      // 3. Create immutable ledger record
      const ledgerEntry = await tx.walletTransaction.create({
        data: {
          userId,
          walletId: walletRow.id,
          type,
          coins,
          balanceAfter: newAvailable,
          referenceType,
          referenceId,
          description,
          status: 'COMPLETED',
          adminId,
          reason,
        },
      });

      return { wallet: updatedWallet, transaction: ledgerEntry };
    }, { maxWait: 15000, timeout: 30000 });
  }

  /**
   * Request withdrawal with strict atomic row-locking to prevent concurrent double-spending.
   */
  async requestWithdrawal(params: WithdrawalRequestParams) {
    const { userId, coins, payoutMethod, payoutAccount, accountHolderName } = params;

    // 1. Validation
    if (!Number.isInteger(coins) || coins <= 0) {
      throw new Error('Withdrawal coins must be a positive integer.');
    }

    let cfg = await prisma.referralConfig.findFirst();
    const coinsPerInr = cfg?.coinsPerInr || 100;
    const minWithdrawalCoins = cfg?.minWithdrawalCoins || 10000;

    if (coins < minWithdrawalCoins) {
      const minInr = Math.floor(minWithdrawalCoins / coinsPerInr);
      throw new Error(
        `MINIMUM_WITHDRAWAL_NOT_MET: Minimum withdrawal is ${minWithdrawalCoins.toLocaleString('en-IN')} Coins (₹${minInr}).`
      );
    }

    if (!payoutAccount || payoutAccount.trim().length < 3) {
      throw new Error('Valid payout account (UPI ID or Bank Account) is required.');
    }

    const cleanAccount = payoutAccount.trim();
    const amountInr = Math.floor(coins / coinsPerInr);

    // 2. Atomic Database Transaction with Row Lock
    const result = await prisma.$transaction(
      async (tx) => {
      // Ensure wallet exists
      await tx.$executeRaw`
        INSERT INTO "public"."Wallet" ("id", "userId", "availableCoins", "pendingCoins", "totalEarnedCoins", "totalWithdrawnCoins", "totalWithdrawnInr", "version", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), ${userId}, 0, 0, 0, 0, 0, 0, NOW(), NOW())
        ON CONFLICT ("userId") DO NOTHING;
      `;

      // Acquire exclusive row lock
      const [walletRow] = await tx.$queryRaw<Array<{ id: string; availableCoins: number; totalWithdrawnCoins: number }>>`
        SELECT "id", "availableCoins", "totalWithdrawnCoins"
        FROM "public"."Wallet"
        WHERE "userId" = ${userId}
        FOR UPDATE;
      `;

      if (!walletRow || walletRow.availableCoins < coins) {
        throw new Error(
          `INSUFFICIENT_WALLET_BALANCE: Available coins (${walletRow?.availableCoins || 0}) are less than requested withdrawal (${coins}).`
        );
      }

      const newBalance = walletRow.availableCoins - coins;

      // Deduct coins atomically
      const updatedWallet = await tx.wallet.update({
        where: { id: walletRow.id },
        data: {
          availableCoins: newBalance,
          totalWithdrawnCoins: walletRow.totalWithdrawnCoins + coins,
          version: { increment: 1 },
        },
      });

      // Create withdrawal record
      const withdrawal = await tx.withdrawal.create({
        data: {
          userId,
          coins,
          amountInr,
          status: 'PENDING',
          payoutMethod,
          payoutAccount: cleanAccount,
          accountHolderName: accountHolderName?.trim() || null,
        },
      });

      // Record ledger debit
      const ledgerEntry = await tx.walletTransaction.create({
        data: {
          userId,
          walletId: walletRow.id,
          type: 'WITHDRAWAL',
          coins: -coins,
          balanceAfter: newBalance,
          referenceType: 'WITHDRAWAL',
          referenceId: withdrawal.id,
          description: `Withdrawal request of ₹${amountInr} (${coins.toLocaleString('en-IN')} Coins via ${payoutMethod})`,
          status: 'COMPLETED',
        },
      });

      return {
        withdrawal,
        wallet: updatedWallet,
        transaction: ledgerEntry,
      };
    }, { maxWait: 15000, timeout: 30000 });

    // Notify user asynchronously after financial transaction has safely committed
    try {
      await prisma.notification.create({
        data: {
          userId,
          title: '💸 Withdrawal Request Submitted',
          body: `Withdrawal request of ₹${amountInr} (${coins.toLocaleString('en-IN')} Coins) has been submitted for review.`,
          channel: 'IN_APP',
        },
      });
    } catch {}

    return result;
  }

  /**
   * Reverse a failed or rejected withdrawal, safely returning coins to the user's wallet with ledger audit.
   */
  async reverseWithdrawal(withdrawalId: string, reason?: string, adminId?: string) {
    const result = await prisma.$transaction(
      async (tx) => {
      const withdrawal = await tx.withdrawal.findUnique({
        where: { id: withdrawalId },
      });

      if (!withdrawal) {
        throw new Error('Withdrawal request not found.');
      }

      if (withdrawal.status === 'PAID') {
        throw new Error('Cannot reverse a withdrawal that has already been marked as PAID.');
      }
      if (withdrawal.status === 'FAILED' || withdrawal.status === 'CANCELLED') {
        throw new Error(`Withdrawal is already in ${withdrawal.status} status.`);
      }

      // 1. Lock wallet row
      const [walletRow] = await tx.$queryRaw<Array<{ id: string; availableCoins: number; totalWithdrawnCoins: number }>>`
        SELECT "id", "availableCoins", "totalWithdrawnCoins"
        FROM "public"."Wallet"
        WHERE "userId" = ${withdrawal.userId}
        FOR UPDATE;
      `;

      if (!walletRow) {
        throw new Error('Wallet not found for withdrawal user.');
      }

      const returnedCoins = withdrawal.coins;
      const newAvailable = walletRow.availableCoins + returnedCoins;
      const newTotalWithdrawn = Math.max(0, walletRow.totalWithdrawnCoins - returnedCoins);

      // 2. Return coins to wallet
      await tx.wallet.update({
        where: { id: walletRow.id },
        data: {
          availableCoins: newAvailable,
          totalWithdrawnCoins: newTotalWithdrawn,
          version: { increment: 1 },
        },
      });

      // 3. Update withdrawal status to FAILED
      const updatedWithdrawal = await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'FAILED',
          failureReason: reason || 'Payout processing failed by payout administrator.',
          processedAt: new Date(),
          processedByAdminId: adminId || null,
        },
      });

      // 4. Create ledger reversal entry
      const ledgerEntry = await tx.walletTransaction.create({
        data: {
          userId: withdrawal.userId,
          walletId: walletRow.id,
          type: 'WITHDRAWAL_REVERSAL',
          coins: returnedCoins,
          balanceAfter: newAvailable,
          referenceType: 'WITHDRAWAL',
          referenceId: withdrawal.id,
          description: `Reversal of failed withdrawal #${withdrawal.id.slice(0, 8)} (+${returnedCoins} Coins returned)`,
          status: 'COMPLETED',
          adminId,
          reason,
        },
      });

      return {
        withdrawal: updatedWithdrawal,
        transaction: ledgerEntry,
      };
    }, { maxWait: 15000, timeout: 30000 });

    // Notify user asynchronously after financial transaction has safely committed
    try {
      await prisma.notification.create({
        data: {
          userId: result.withdrawal.userId,
          title: '⚠️ Withdrawal Could Not Be Processed',
          body: `Your withdrawal of ₹${result.withdrawal.amountInr} could not be processed. Coins have been returned to your wallet.`,
          channel: 'IN_APP',
        },
      });
    } catch {}

    return result;
  }

  /**
   * Super Admin coin adjustment (Credit or Debit) with mandatory reason and audit record.
   */
  async adminAdjustCoins(params: { userId: string; coins: number; reason: string; adminId: string }) {
    const { userId, coins, reason, adminId } = params;

    if (!reason || reason.trim().length < 5) {
      throw new Error('A mandatory descriptive reason (minimum 5 characters) is required for admin adjustments.');
    }
    if (!coins || !Number.isInteger(coins)) {
      throw new Error('Coin adjustment amount must be a non-zero integer.');
    }

    const result = await prisma.$transaction(
      async (tx) => {
      // Ensure wallet exists
      await tx.$executeRaw`
        INSERT INTO "public"."Wallet" ("id", "userId", "availableCoins", "pendingCoins", "totalEarnedCoins", "totalWithdrawnCoins", "totalWithdrawnInr", "version", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), ${userId}, 0, 0, 0, 0, 0, 0, NOW(), NOW())
        ON CONFLICT ("userId") DO NOTHING;
      `;

      const [walletRow] = await tx.$queryRaw<Array<{ id: string; availableCoins: number; totalEarnedCoins: number }>>`
        SELECT "id", "availableCoins", "totalEarnedCoins"
        FROM "public"."Wallet"
        WHERE "userId" = ${userId}
        FOR UPDATE;
      `;

      if (!walletRow) {
        throw new Error('User wallet could not be loaded.');
      }

      if (coins < 0 && walletRow.availableCoins + coins < 0) {
        throw new Error(
          `INSUFFICIENT_COINS_FOR_DEBIT: User has only ${walletRow.availableCoins} coins, cannot debit ${Math.abs(coins)}.`
        );
      }

      const newAvailable = walletRow.availableCoins + coins;
      const newTotalEarned = coins > 0 ? walletRow.totalEarnedCoins + coins : walletRow.totalEarnedCoins;

      const updatedWallet = await tx.wallet.update({
        where: { id: walletRow.id },
        data: {
          availableCoins: newAvailable,
          totalEarnedCoins: newTotalEarned,
          version: { increment: 1 },
        },
      });

      const ledgerEntry = await tx.walletTransaction.create({
        data: {
          userId,
          walletId: walletRow.id,
          type: 'ADMIN_ADJUSTMENT',
          coins,
          balanceAfter: newAvailable,
          referenceType: 'ADMIN',
          referenceId: adminId,
          description: `Admin manual adjustment: ${reason.trim()}`,
          status: 'COMPLETED',
          adminId,
          reason: reason.trim(),
        },
      });

      return { wallet: updatedWallet, transaction: ledgerEntry };
    }, { maxWait: 15000, timeout: 30000 });

    // Audit log
    await auditRepository.log({
      actorId: adminId,
      actorType: 'ADMIN',
      action: 'ADMIN_COIN_ADJUSTMENT',
      entity: 'Wallet',
      entityId: userId,
      metadata: {
        userId,
        coins,
        reason: reason.trim(),
        balanceAfter: result.transaction.balanceAfter,
      },
    });

    return result;
  }

  /**
   * Get user's wallet ledger transaction history.
   */
  async getTransactions(userId: string, page = 1, limit = 20, type?: string) {
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (type && type !== 'ALL') {
      where.type = type;
    }

    const [total, transactions] = await Promise.all([
      prisma.walletTransaction.count({ where }),
      prisma.walletTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user's withdrawal request history.
   */
  async getUserWithdrawals(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [total, withdrawals] = await Promise.all([
      prisma.withdrawal.count({ where: { userId } }),
      prisma.withdrawal.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      withdrawals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const walletService = new WalletService();
