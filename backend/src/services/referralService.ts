/**
 * BRANDX — Refer & Earn Service
 * PostgreSQL-backed referral engine with anti-fraud constraints,
 * unique code generation, and server-side variable reward distribution (100–500 coins).
 */

import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { walletService } from './walletService.js';
import { config } from '../config/index.js';

const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export interface ReferralConfigData {
  id?: string;
  minRewardCoins: number;
  maxRewardCoins: number;
  rewardStep: number;
  rewardMode: string; // "RANDOM" | "FIXED" | "ADMIN"
  fixedRewardCoins: number;
  coinsPerInr: number;
  minWithdrawalCoins: number;
  eligibilityCondition: string;
}

export class ReferralService {
  /**
   * Fetch active referral configuration from PostgreSQL, or seed defaults.
   */
  async getConfig(): Promise<ReferralConfigData> {
    let cfg = await prisma.referralConfig.findFirst();
    if (!cfg) {
      cfg = await prisma.referralConfig.create({
        data: {
          minRewardCoins: 100,
          maxRewardCoins: 500,
          rewardStep: 50,
          rewardMode: 'RANDOM',
          fixedRewardCoins: 200,
          coinsPerInr: 100,
          minWithdrawalCoins: 10000,
          eligibilityCondition: 'ONBOARDING_COMPLETED',
        },
      });
    }
    return cfg;
  }

  /**
   * Update referral configuration (Super Admin).
   */
  async updateConfig(input: Partial<ReferralConfigData>): Promise<ReferralConfigData> {
    const existing = await this.getConfig();

    const minReward = input.minRewardCoins ?? existing.minRewardCoins;
    const maxReward = input.maxRewardCoins ?? existing.maxRewardCoins;

    if (minReward < 50 || maxReward > 2000 || minReward > maxReward) {
      throw new Error('Invalid reward range. Minimum must be <= Maximum and within allowed bounds (50-2000).');
    }

    const updated = await prisma.referralConfig.update({
      where: { id: existing.id },
      data: {
        minRewardCoins: minReward,
        maxRewardCoins: maxReward,
        rewardStep: input.rewardStep ?? existing.rewardStep,
        rewardMode: input.rewardMode ?? existing.rewardMode,
        fixedRewardCoins: input.fixedRewardCoins ?? existing.fixedRewardCoins,
        coinsPerInr: input.coinsPerInr ?? existing.coinsPerInr,
        minWithdrawalCoins: input.minWithdrawalCoins ?? existing.minWithdrawalCoins,
        eligibilityCondition: input.eligibilityCondition ?? existing.eligibilityCondition,
      },
    });

    return updated;
  }

  /**
   * Compute server-side variable reward amount (100–500 coins by default).
   * The client never specifies this value.
   */
  async calculateRewardAmount(): Promise<number> {
    const cfg = await this.getConfig();

    if (cfg.rewardMode === 'FIXED') {
      return cfg.fixedRewardCoins;
    }

    const min = cfg.minRewardCoins;
    const max = cfg.maxRewardCoins;
    const step = cfg.rewardStep > 0 ? cfg.rewardStep : 50;

    const possibleSteps: number[] = [];
    for (let c = min; c <= max; c += step) {
      possibleSteps.push(c);
    }
    if (!possibleSteps.includes(max)) {
      possibleSteps.push(max);
    }

    const randomIndex = crypto.randomInt(0, possibleSteps.length);
    return possibleSteps[randomIndex];
  }

  /**
   * Generate an easy-to-read, non-guessable, unique referral code (e.g. BRANDX-AB12CD).
   */
  generateCode(): string {
    let suffix = '';
    for (let i = 0; i < 6; i++) {
      const idx = crypto.randomInt(0, CODE_ALPHABET.length);
      suffix += CODE_ALPHABET[idx];
    }
    return `BRANDX-${suffix}`;
  }

  /**
   * Get or atomically create a user's unique referral code.
   */
  async getOrCreateReferralCode(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    if (user?.referralCode) {
      return user.referralCode;
    }

    let code = this.generateCode();
    let attempts = 0;
    while (attempts < 10) {
      try {
        const updated = await prisma.user.update({
          where: { id: userId },
          data: { referralCode: code },
          select: { referralCode: true },
        });
        if (updated.referralCode) return updated.referralCode;
      } catch (err: any) {
        if (err.code === 'P2002') {
          // Collision on unique constraint; try another
          code = this.generateCode();
          attempts++;
        } else {
          throw err;
        }
      }
    }

    throw new Error('Failed to generate unique referral code. Please try again.');
  }

  /**
   * Construct shareable referral link using configured production domain.
   */
  getReferralLink(referralCode: string): string {
    const baseUrl =
      process.env.APP_URL ||
      process.env.FRONTEND_URL ||
      (config as any)?.appUrl ||
      'https://brandx.app';
    return `${baseUrl.replace(/\/+$/, '')}/signup?ref=${encodeURIComponent(referralCode)}`;
  }

  /**
   * Register a referral attachment when a new user signs up or claims a code.
   * Anti-abuse protections:
   * 1. Self-referral prohibited.
   * 2. Duplicate referrals for the same referred user prohibited via unique database constraint.
   * 3. Validates referral code exists.
   */
  async registerReferral(referrerCode: string, referredUserId: string): Promise<any> {
    const cleanCode = referrerCode.trim().toUpperCase();

    // 1. Check if user has already been referred
    const existing = await prisma.referral.findUnique({
      where: { referredUserId },
    });
    if (existing) {
      throw new Error('DUPLICATE_REFERRAL_NOT_ALLOWED: User account is already linked to a referral.');
    }

    // 2. Lookup referrer
    const referrer = await prisma.user.findUnique({
      where: { referralCode: cleanCode },
      select: { id: true, status: true },
    });

    if (!referrer) {
      throw new Error('INVALID_REFERRAL_CODE: Referral code does not exist.');
    }

    // 3. Prevent self-referral
    if (referrer.id === referredUserId) {
      throw new Error('SELF_REFERRAL_NOT_ALLOWED: You cannot use your own referral code.');
    }

    // 4. Create initial referral record in REGISTERED status
    const referral = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: referredUserId },
        data: { referredByCode: cleanCode },
      });

      return tx.referral.create({
        data: {
          referrerUserId: referrer.id,
          referredUserId,
          referralCode: cleanCode,
          status: 'REGISTERED',
          rewardCoins: 0,
        },
      });
    });

    return referral;
  }

  /**
   * Complete eligibility check and reward referrer when referred user completes onboarding/verification.
   */
  async processEligibility(referredUserId: string): Promise<{ rewarded: boolean; coins?: number; referralId?: string }> {
    const referral = await prisma.referral.findUnique({
      where: { referredUserId },
    });

    if (!referral) {
      return { rewarded: false };
    }

    // Already rewarded or rejected
    if (referral.status === 'REWARDED') {
      return { rewarded: false, coins: referral.rewardCoins, referralId: referral.id };
    }
    if (referral.status === 'REJECTED') {
      return { rewarded: false };
    }

    // Server-side variable reward amount (100–500 coins)
    const rewardCoins = await this.calculateRewardAmount();

    // Credit coins to referrer's wallet inside database transaction
    await walletService.creditCoins({
      userId: referral.referrerUserId,
      coins: rewardCoins,
      type: 'REFERRAL_REWARD',
      referenceType: 'REFERRAL',
      referenceId: referral.id,
      description: `Referral reward for inviting a new vyapari (+${rewardCoins} Coins)`,
    });

    // Mark referral as REWARDED
    const updated = await prisma.referral.update({
      where: { id: referral.id },
      data: {
        status: 'REWARDED',
        rewardCoins,
        rewardedAt: new Date(),
      },
    });

    // Trigger in-app notification to referrer
    try {
      await prisma.notification.create({
        data: {
          userId: referral.referrerUserId,
          title: '🎁 Referral Reward Credited!',
          body: `Referral reward credited: +${rewardCoins} BrandX Coins! Your friend completed onboarding.`,
          channel: 'IN_APP',
        },
      });
    } catch {
      // Non-critical notification failure
    }

    return { rewarded: true, coins: rewardCoins, referralId: updated.id };
  }

  /**
   * Get user's referral dashboard overview.
   */
  async getUserReferralStats(userId: string) {
    const referralCode = await this.getOrCreateReferralCode(userId);
    const referralLink = this.getReferralLink(referralCode);
    const cfg = await this.getConfig();

    const [total, rewarded, pending, earnedSum] = await Promise.all([
      prisma.referral.count({ where: { referrerUserId: userId } }),
      prisma.referral.count({ where: { referrerUserId: userId, status: 'REWARDED' } }),
      prisma.referral.count({
        where: {
          referrerUserId: userId,
          status: { in: ['REGISTERED', 'VERIFIED', 'ELIGIBLE'] },
        },
      }),
      prisma.referral.aggregate({
        where: { referrerUserId: userId, status: 'REWARDED' },
        _sum: { rewardCoins: true },
      }),
    ]);

    const coinsEarned = earnedSum._sum.rewardCoins || 0;
    const coinsPending = pending * cfg.minRewardCoins; // Conservative estimate for UI

    return {
      referralCode,
      referralLink,
      minRewardCoins: cfg.minRewardCoins,
      maxRewardCoins: cfg.maxRewardCoins,
      coinsPerInr: cfg.coinsPerInr,
      stats: {
        totalReferrals: total,
        successfulReferrals: rewarded,
        pendingReferrals: pending,
        coinsEarned,
        coinsPending,
      },
    };
  }

  /**
   * Get referral history with privacy-masked friend identities.
   */
  async getUserReferralHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      prisma.referral.count({ where: { referrerUserId: userId } }),
      prisma.referral.findMany({
        where: { referrerUserId: userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          referredUser: {
            select: {
              name: true,
              mobile: true,
              createdAt: true,
            },
          },
        },
      }),
    ]);

    const history = items.map((item) => {
      const u = item.referredUser;
      let displayName = 'New Vyapari';
      if (u?.name) {
        const parts = u.name.trim().split(' ');
        displayName = parts[0] + (parts[1] ? ` ${parts[1][0]}.` : '');
      } else if (u?.mobile) {
        displayName = `Vyapari (***${u.mobile.slice(-4)})`;
      }

      return {
        id: item.id,
        userDisplayName: displayName,
        status: item.status,
        rewardCoins: item.rewardCoins,
        rewardedAt: item.rewardedAt,
        createdAt: item.createdAt,
      };
    });

    return {
      history,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Admin: List all referrals across the system.
   */
  async getAdminReferrals(query: { page?: number; limit?: number; status?: string; search?: string }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }
    if (query.search) {
      where.OR = [
        { referralCode: { contains: query.search, mode: 'insensitive' } },
        { referrer: { name: { contains: query.search, mode: 'insensitive' } } },
        { referrer: { mobile: { contains: query.search } } },
      ];
    }

    const [total, items, totalRewarded, totalCoinsAgg] = await Promise.all([
      prisma.referral.count({ where }),
      prisma.referral.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          referrer: { select: { id: true, name: true, mobile: true, email: true } },
          referredUser: { select: { id: true, name: true, mobile: true, email: true } },
        },
      }),
      prisma.referral.count({ where: { status: 'REWARDED' } }),
      prisma.referral.aggregate({
        where: { status: 'REWARDED' },
        _sum: { rewardCoins: true },
      }),
    ]);

    return {
      referrals: items,
      summary: {
        totalReferrals: total,
        successfulReferrals: totalRewarded,
        totalCoinsIssued: totalCoinsAgg._sum.rewardCoins || 0,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const referralService = new ReferralService();
