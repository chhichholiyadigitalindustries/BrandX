/**
 * BRANDX — Centralized AI Copilot Service
 * Orchestrates prompts, Gemini server-side execution, Zod validation,
 * database usage tracking, and multi-tenant business privacy.
 */

import { prisma } from '../config/database.js';
import { geminiService } from './gemini.service.js';
import { aiQuotaService, AIQuotaStatus } from './aiQuota.service.js';
import {
  buildChatPrompt,
  buildReviewReplyPrompt,
  buildWhatsappCampaignPrompt,
  buildCaptionPrompt,
  buildBusinessInsightsPrompt,
  AggregatedBusinessMetrics,
  BRANDX_SYSTEM_INSTRUCTION,
} from '../ai/prompts/index.js';
import {
  structuredReviewReplyOutputSchema,
  structuredWhatsappCampaignOutputSchema,
  structuredCaptionOutputSchema,
  structuredBusinessInsightsOutputSchema,
} from '../validators/index.js';
import { logger } from '../utils/logger.js';

export class AIService {
  /**
   * 1. Multi-language AI Chat for Indian Vyaparis
   */
  async chat(
    userId: string,
    businessId: string,
    message: string,
    language: string = 'hinglish',
    customContext?: any
  ): Promise<{
    reply: string;
    language: string;
    model: string;
    usage: { inputTokens: number | null; outputTokens: number | null };
    quota: AIQuotaStatus;
  }> {
    const quota = await aiQuotaService.checkQuota(userId);

    // Fetch store profile if available to enrich shopkeeper context
    let shopContext = customContext;
    if (!shopContext && businessId) {
      const biz = await prisma.business.findUnique({
        where: { id: businessId },
        select: { name: true, category: true, city: true, ownerName: true, mobile: true, upiId: true },
      });
      if (biz) {
        shopContext = {
          name: biz.name,
          category: biz.category,
          city: biz.city,
          ownerName: biz.ownerName,
          phone: biz.mobile,
          upiId: biz.upiId || undefined,
        };
      }
    }

    const prompt = buildChatPrompt({
      message,
      language,
      businessContext: shopContext,
    });

    try {
      const result = await geminiService.generateText({
        prompt,
        systemInstruction: BRANDX_SYSTEM_INSTRUCTION,
      });

      await aiQuotaService.recordUsage({
        userId,
        businessId,
        feature: 'CHAT',
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        totalTokens: result.totalTokens,
        status: 'SUCCESS',
      });

      return {
        reply: result.text,
        language,
        model: result.model,
        usage: {
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        },
        quota: {
          ...quota,
          used: quota.used + 1,
          remaining: Math.max(0, quota.remaining - 1),
        },
      };
    } catch (err: any) {
      await aiQuotaService.recordUsage({
        userId,
        businessId,
        feature: 'CHAT',
        model: geminiService.getModelName(),
        status: err?.code === 'AI_TIMEOUT' ? 'TIMEOUT' : 'FAILED',
        errorCode: err?.code || 'ERROR',
      });
      throw err;
    }
  }

  /**
   * 2. Google Review Reply Generator
   */
  async generateReviewReply(
    userId: string,
    businessId: string,
    params: {
      review: string;
      rating: number;
      language?: string;
      businessName?: string;
      tone?: string;
    }
  ) {
    const quota = await aiQuotaService.checkQuota(userId);

    let bName = params.businessName;
    if (!bName && businessId) {
      const biz = await prisma.business.findUnique({
        where: { id: businessId },
        select: { name: true },
      });
      if (biz?.name) bName = biz.name;
    }

    const prompt = buildReviewReplyPrompt({
      review: params.review,
      rating: params.rating,
      language: params.language || 'hinglish',
      businessName: bName,
      tone: params.tone || 'friendly',
    });

    try {
      const { data, usage } = await geminiService.generateStructuredJson(
        { prompt, systemInstruction: BRANDX_SYSTEM_INSTRUCTION },
        structuredReviewReplyOutputSchema
      );

      await aiQuotaService.recordUsage({
        userId,
        businessId,
        feature: 'REVIEW_REPLY',
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        status: 'SUCCESS',
      });

      return {
        ...data,
        quota: {
          ...quota,
          used: quota.used + 1,
          remaining: Math.max(0, quota.remaining - 1),
        },
      };
    } catch (err: any) {
      await aiQuotaService.recordUsage({
        userId,
        businessId,
        feature: 'REVIEW_REPLY',
        model: geminiService.getModelName(),
        status: err?.code === 'AI_TIMEOUT' ? 'TIMEOUT' : 'FAILED',
        errorCode: err?.code || 'ERROR',
      });
      throw err;
    }
  }

  /**
   * 3. WhatsApp Campaign Generator
   */
  async generateWhatsappCampaign(
    userId: string,
    businessId: string,
    params: {
      purpose: string;
      festival?: string;
      businessType?: string;
      businessName?: string;
      language?: string;
      offer?: string;
      contactPhone?: string;
      upiId?: string;
      address?: string;
    }
  ) {
    const quota = await aiQuotaService.checkQuota(userId);

    // Auto-populate missing business details from database profile
    let bName = params.businessName;
    let bType = params.businessType;
    let phone = params.contactPhone;
    let upi = params.upiId;
    let addr = params.address;

    if (businessId && (!bName || !phone || !upi || !addr)) {
      const biz = await prisma.business.findUnique({
        where: { id: businessId },
        select: { name: true, businessType: true, category: true, mobile: true, upiId: true, address: true, city: true },
      });
      if (biz) {
        if (!bName) bName = biz.name;
        if (!bType) bType = biz.category || biz.businessType;
        if (!phone) phone = biz.mobile;
        if (!upi && biz.upiId) upi = biz.upiId;
        if (!addr) addr = `${biz.address}, ${biz.city}`;
      }
    }

    const prompt = buildWhatsappCampaignPrompt({
      purpose: params.purpose,
      festival: params.festival,
      businessType: bType,
      businessName: bName,
      language: params.language || 'hinglish',
      offer: params.offer,
      contactPhone: phone,
      upiId: upi,
      address: addr,
    });

    try {
      const { data, usage } = await geminiService.generateStructuredJson(
        { prompt, systemInstruction: BRANDX_SYSTEM_INSTRUCTION },
        structuredWhatsappCampaignOutputSchema
      );

      await aiQuotaService.recordUsage({
        userId,
        businessId,
        feature: 'WHATSAPP_CAMPAIGN',
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        status: 'SUCCESS',
      });

      return {
        ...data,
        quota: {
          ...quota,
          used: quota.used + 1,
          remaining: Math.max(0, quota.remaining - 1),
        },
      };
    } catch (err: any) {
      await aiQuotaService.recordUsage({
        userId,
        businessId,
        feature: 'WHATSAPP_CAMPAIGN',
        model: geminiService.getModelName(),
        status: err?.code === 'AI_TIMEOUT' ? 'TIMEOUT' : 'FAILED',
        errorCode: err?.code || 'ERROR',
      });
      throw err;
    }
  }

  /**
   * 4. Social Media & Poster Caption Generator
   */
  async generateCaption(
    userId: string,
    businessId: string,
    params: {
      topic: string;
      businessName?: string;
      language?: string;
      platform?: string;
    }
  ) {
    const quota = await aiQuotaService.checkQuota(userId);

    let bName = params.businessName;
    if (!bName && businessId) {
      const biz = await prisma.business.findUnique({
        where: { id: businessId },
        select: { name: true },
      });
      if (biz?.name) bName = biz.name;
    }

    const prompt = buildCaptionPrompt({
      topic: params.topic,
      businessName: bName,
      language: params.language || 'hinglish',
      platform: (params.platform as any) || 'whatsapp',
    });

    try {
      const { data, usage } = await geminiService.generateStructuredJson(
        { prompt, systemInstruction: BRANDX_SYSTEM_INSTRUCTION },
        structuredCaptionOutputSchema
      );

      await aiQuotaService.recordUsage({
        userId,
        businessId,
        feature: 'CAPTION',
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        status: 'SUCCESS',
      });

      return {
        ...data,
        quota: {
          ...quota,
          used: quota.used + 1,
          remaining: Math.max(0, quota.remaining - 1),
        },
      };
    } catch (err: any) {
      await aiQuotaService.recordUsage({
        userId,
        businessId,
        feature: 'CAPTION',
        model: geminiService.getModelName(),
        status: err?.code === 'AI_TIMEOUT' ? 'TIMEOUT' : 'FAILED',
        errorCode: err?.code || 'ERROR',
      });
      throw err;
    }
  }

  /**
   * 5. Business Insights (Privacy-Safe Aggregation)
   */
  async getBusinessInsights(
    userId: string,
    businessId: string,
    language: string = 'hinglish',
    timeframe: string = 'last_30_days'
  ) {
    const quota = await aiQuotaService.checkQuota(userId);

    const biz = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, category: true, city: true },
    });

    if (!biz) {
      const err: any = new Error('Business not found');
      err.status = 404;
      throw err;
    }

    // 1. Khata aggregates (NO PII)
    const customers = await prisma.customer.findMany({
      where: { businessId },
      select: { currentBalance: true },
    });

    let totalCustomers = customers.length;
    let debtorCustomersCount = 0;
    let totalOutstandingUdhaar = 0;
    let totalAdvanceJama = 0;

    for (const c of customers) {
      if (c.currentBalance > 0) {
        debtorCustomersCount++;
        totalOutstandingUdhaar += c.currentBalance;
      } else if (c.currentBalance < 0) {
        totalAdvanceJama += Math.abs(c.currentBalance);
      }
    }

    // 2. Invoice aggregates (NO PII)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [allInvoices, recentInvoices, unpaidInvoicesCount] = await Promise.all([
      prisma.invoice.aggregate({
        where: { businessId, status: { not: 'CANCELLED' } },
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: { businessId, status: { not: 'CANCELLED' }, createdAt: { gte: thirtyDaysAgo } },
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.count({
        where: { businessId, status: { in: ['UNPAID', 'PARTIALLY_PAID'] } },
      }),
    ]);

    // 3. Product & Stock aggregates
    const [totalProducts, lowStockCount, outOfStockCount] = await Promise.all([
      prisma.product.count({ where: { businessId, isActive: true } }),
      prisma.product.count({
        where: {
          businessId,
          isActive: true,
          type: 'GOODS',
          currentStock: { gt: 0, lte: 5 },
        },
      }),
      prisma.product.count({
        where: {
          businessId,
          isActive: true,
          type: 'GOODS',
          currentStock: { lte: 0 },
        },
      }),
    ]);

    const metrics: AggregatedBusinessMetrics = {
      businessName: biz.name,
      category: biz.category,
      city: biz.city,
      khata: {
        totalCustomers,
        debtorCustomersCount,
        totalOutstandingUdhaar,
        totalAdvanceJama,
      },
      invoices: {
        totalInvoices: allInvoices._count.id || 0,
        totalRevenue: Number(allInvoices._sum.totalAmount || 0),
        recentInvoicesCount30Days: recentInvoices._count.id || 0,
        recentRevenue30Days: Number(recentInvoices._sum.totalAmount || 0),
        unpaidInvoicesCount,
      },
      inventory: {
        totalProducts,
        lowStockCount,
        outOfStockCount,
      },
    };

    const prompt = buildBusinessInsightsPrompt(metrics, language);

    try {
      const { data, usage } = await geminiService.generateStructuredJson(
        { prompt, systemInstruction: BRANDX_SYSTEM_INSTRUCTION },
        structuredBusinessInsightsOutputSchema
      );

      await aiQuotaService.recordUsage({
        userId,
        businessId,
        feature: 'BUSINESS_INSIGHTS',
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        status: 'SUCCESS',
      });

      return {
        metrics,
        insights: data,
        quota: {
          ...quota,
          used: quota.used + 1,
          remaining: Math.max(0, quota.remaining - 1),
        },
      };
    } catch (err: any) {
      await aiQuotaService.recordUsage({
        userId,
        businessId,
        feature: 'BUSINESS_INSIGHTS',
        model: geminiService.getModelName(),
        status: err?.code === 'AI_TIMEOUT' ? 'TIMEOUT' : 'FAILED',
        errorCode: err?.code || 'ERROR',
      });
      throw err;
    }
  }

  /**
   * Legacy generator for backward compatibility
   */
  async generate(
    userId?: string,
    businessId?: string,
    type?: string,
    promptText?: string,
    params?: any
  ) {
    if (userId) await aiQuotaService.checkQuota(userId);

    const prompt = promptText || 'Generate business creative';
    let systemInstruction = BRANDX_SYSTEM_INSTRUCTION;

    if (type === 'POSTER_CAPTION') {
      systemInstruction =
        'Generate 3 catchy, high-conversion Hindi & English marketing captions with emojis and hashtags for an Indian retail shop or service.';
    } else if (type === 'REVIEW_REPLY') {
      systemInstruction =
        'Draft a warm, polite 5-star Google Review reply thanking the customer and inviting them back.';
    } else if (type === 'WHATSAPP_REMINDER') {
      systemInstruction =
        'Draft a respectful payment reminder WhatsApp message for a customer whose digital khata bill is due.';
    } else if (type === 'VOICE_TO_BILL') {
      systemInstruction =
        'Parse spoken business orders into structured JSON item lists with name, qty, rate, and GST.';
    }

    const { text, inputTokens, outputTokens, totalTokens, model } = await geminiService.generateText({
      prompt: `${prompt}\nExtra Context: ${JSON.stringify(params || {})}`,
      systemInstruction,
    });

    if (userId) {
      await aiQuotaService.recordUsage({
        userId,
        businessId,
        feature: type || 'OTHER',
        model,
        inputTokens,
        outputTokens,
        totalTokens,
        status: 'SUCCESS',
      });
    }

    return {
      text,
      tokensUsed: totalTokens || 0,
    };
  }
}

export const aiService = new AIService();
