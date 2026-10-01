/**
 * BRANDX — AI Rate Limiting & Quota Management Service
 * Calculates real daily quota consumption from the database.
 */

import { prisma } from '../config/database.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { subscriptionService } from './subscriptionService.js';

export interface AIQuotaStatus {
  limit: number;
  used: number;
  remaining: number;
  period: 'daily';
  isPro: boolean;
}

export class AIQuotaService {
  /**
   * Resolves user tier and current daily AI quota usage
   */
  async getQuotaStatus(userId: string): Promise<AIQuotaStatus> {
    const currentSub = await subscriptionService.getCurrentSubscription(undefined, userId);
    const isPro = currentSub.isPro;
    const limit = isPro ? config.gemini.proDailyLimit : config.gemini.freeDailyLimit;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const used = await prisma.aIUsage.count({
      where: {
        userId,
        createdAt: { gte: startOfDay },
        status: 'SUCCESS',
      },
    });

    const remaining = Math.max(0, limit - used);

    return {
      limit,
      used,
      remaining,
      period: 'daily',
      isPro,
    };
  }

  /**
   * Enforces quota before executing an AI operation. Throws 429 if quota is exhausted.
   */
  async checkQuota(userId: string): Promise<AIQuotaStatus> {
    const quota = await this.getQuotaStatus(userId);

    if (quota.used >= quota.limit) {
      logger.warn(`User ${userId} exceeded AI quota (${quota.used}/${quota.limit})`);
      const err: any = new Error(
        `Aapka aaj ka daily AI quota (${quota.limit} requests) pura ho chuka hai. Kripya kal try karein ya BrandX Pro me upgrade karein!`
      );
      err.code = 'AI_QUOTA_EXCEEDED';
      err.status = 429;
      err.quota = quota;
      throw err;
    }

    return quota;
  }

  /**
   * Records an AI operation in the AIUsage table
   */
  async recordUsage(params: {
    userId: string;
    businessId?: string | null;
    feature: 'CHAT' | 'REVIEW_REPLY' | 'WHATSAPP_CAMPAIGN' | 'CAPTION' | 'BUSINESS_INSIGHTS' | 'OTHER' | string;
    model: string;
    requestId?: string | null;
    inputTokens?: number | null;
    outputTokens?: number | null;
    totalTokens?: number | null;
    status: 'SUCCESS' | 'FAILED' | 'RATE_LIMITED' | 'TIMEOUT';
    errorCode?: string | null;
  }) {
    try {
      return await prisma.aIUsage.create({
        data: {
          userId: params.userId,
          businessId: params.businessId || null,
          feature: params.feature,
          model: params.model,
          requestId: params.requestId || null,
          inputTokens: params.inputTokens ?? null,
          outputTokens: params.outputTokens ?? null,
          totalTokens: params.totalTokens ?? null,
          status: params.status,
          errorCode: params.errorCode || null,
        },
      });
    } catch (err: any) {
      logger.error('Failed to record AI usage record in database:', err?.message);
      return null;
    }
  }
}

export const aiQuotaService = new AIQuotaService();
