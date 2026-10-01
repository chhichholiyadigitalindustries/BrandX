/**
 * BRANDX — AI Controller
 * Exposes authenticated endpoints for AI Copilot, Review Reply, WhatsApp Campaign,
 * Caption Generation, and Privacy-Safe Business Insights.
 */

import { Request, Response } from 'express';
import { aiService } from '../services/aiService.js';
import { aiQuotaService } from '../services/aiQuota.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class AIController {
  /**
   * POST /api/v1/ai/chat
   */
  async chat(req: Request, res: Response): Promise<void> {
    try {
      const { message, language, context } = req.body;
      const userId = req.user?.id;
      const businessId = req.businessId;

      if (!userId || !businessId) {
        sendError(res, 'Authentication and active business required', 401, 'UNAUTHORIZED');
        return;
      }

      const result = await aiService.chat(userId, businessId, message, language, context);
      sendSuccess(res, result, 'AI response generated successfully');
    } catch (error: any) {
      const status = error.status || 500;
      const code = error.code || 'AI_CHAT_FAILED';
      sendError(res, error.message, status, code, error.quota ? { quota: error.quota } : undefined);
    }
  }

  /**
   * POST /api/v1/ai/generate-review-reply
   */
  async generateReviewReply(req: Request, res: Response): Promise<void> {
    try {
      const { review, rating, language, businessName, tone } = req.body;
      const userId = req.user?.id;
      const businessId = req.businessId;

      if (!userId || !businessId) {
        sendError(res, 'Authentication and active business required', 401, 'UNAUTHORIZED');
        return;
      }

      const result = await aiService.generateReviewReply(userId, businessId, {
        review,
        rating,
        language,
        businessName,
        tone,
      });

      sendSuccess(res, result, 'Review reply generated successfully');
    } catch (error: any) {
      const status = error.status || 500;
      const code = error.code || 'AI_REVIEW_REPLY_FAILED';
      sendError(res, error.message, status, code, error.quota ? { quota: error.quota } : undefined);
    }
  }

  /**
   * POST /api/v1/ai/generate-whatsapp-campaign
   */
  async generateWhatsappCampaign(req: Request, res: Response): Promise<void> {
    try {
      const { purpose, festival, businessType, businessName, language, offer, contactPhone, upiId, address } = req.body;
      const userId = req.user?.id;
      const businessId = req.businessId;

      if (!userId || !businessId) {
        sendError(res, 'Authentication and active business required', 401, 'UNAUTHORIZED');
        return;
      }

      const result = await aiService.generateWhatsappCampaign(userId, businessId, {
        purpose,
        festival,
        businessType,
        businessName,
        language,
        offer,
        contactPhone,
        upiId,
        address,
      });

      sendSuccess(res, result, 'WhatsApp campaign generated successfully');
    } catch (error: any) {
      const status = error.status || 500;
      const code = error.code || 'AI_WHATSAPP_CAMPAIGN_FAILED';
      sendError(res, error.message, status, code, error.quota ? { quota: error.quota } : undefined);
    }
  }

  /**
   * POST /api/v1/ai/generate-caption
   */
  async generateCaption(req: Request, res: Response): Promise<void> {
    try {
      const { topic, businessName, language, platform } = req.body;
      const userId = req.user?.id;
      const businessId = req.businessId;

      if (!userId || !businessId) {
        sendError(res, 'Authentication and active business required', 401, 'UNAUTHORIZED');
        return;
      }

      const result = await aiService.generateCaption(userId, businessId, {
        topic,
        businessName,
        language,
        platform,
      });

      sendSuccess(res, result, 'Caption generated successfully');
    } catch (error: any) {
      const status = error.status || 500;
      const code = error.code || 'AI_CAPTION_FAILED';
      sendError(res, error.message, status, code, error.quota ? { quota: error.quota } : undefined);
    }
  }

  /**
   * POST /api/v1/ai/business-insights
   */
  async businessInsights(req: Request, res: Response): Promise<void> {
    try {
      const { language, timeframe } = req.body;
      const userId = req.user?.id;
      const businessId = req.businessId;

      if (!userId || !businessId) {
        sendError(res, 'Authentication and active business required', 401, 'UNAUTHORIZED');
        return;
      }

      const result = await aiService.getBusinessInsights(userId, businessId, language, timeframe);
      sendSuccess(res, result, 'Business insights generated successfully');
    } catch (error: any) {
      const status = error.status || 500;
      const code = error.code || 'AI_INSIGHTS_FAILED';
      sendError(res, error.message, status, code, error.quota ? { quota: error.quota } : undefined);
    }
  }

  /**
   * GET /api/v1/ai/quota
   */
  async getQuota(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
        return;
      }

      const quota = await aiQuotaService.getQuotaStatus(userId);
      sendSuccess(res, quota, 'AI quota retrieved');
    } catch (error: any) {
      sendError(res, error.message, 500, 'AI_QUOTA_FETCH_FAILED');
    }
  }

  /**
   * POST /api/v1/ai/generate (Legacy)
   */
  async generate(req: Request, res: Response): Promise<void> {
    try {
      const { type, prompt, params } = req.body;
      const result = await aiService.generate(req.user?.id, req.businessId, type, prompt, params);
      sendSuccess(res, result, 'Creative prompt generated');
    } catch (error: any) {
      const status = error.status || 500;
      sendError(res, error.message, status, 'AI_GENERATION_FAILED');
    }
  }
}

export const aiController = new AIController();
