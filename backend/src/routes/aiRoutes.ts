/**
 * BRANDX — AI Copilot REST API Routes
 * Mounted at /api/v1/ai
 */

import { Router } from 'express';
import { aiController } from '../controllers/aiController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireBusinessAccess } from '../middleware/businessAuthMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';
import { aiRateLimiter } from '../middleware/rateLimitMiddleware.js';
import {
  aiChatSchema,
  aiReviewReplySchema,
  aiWhatsappCampaignSchema,
  aiCaptionSchema,
  aiBusinessInsightsSchema,
  aiGenerateSchema,
} from '../validators/index.js';

const router = Router();

// Global DDoS / brute-force protection
router.use(aiRateLimiter);

// Strict authentication & business isolation
router.use(requireAuth);
router.use(requireBusinessAccess);

// Required AI Endpoints
router.post('/chat', validateBody(aiChatSchema), aiController.chat);
router.post('/generate-review-reply', validateBody(aiReviewReplySchema), aiController.generateReviewReply);
router.post('/generate-whatsapp-campaign', validateBody(aiWhatsappCampaignSchema), aiController.generateWhatsappCampaign);
router.post('/generate-caption', validateBody(aiCaptionSchema), aiController.generateCaption);
router.post('/business-insights', validateBody(aiBusinessInsightsSchema), aiController.businessInsights);
router.get('/quota', aiController.getQuota);

// Legacy backward compatibility
router.post('/generate', validateBody(aiGenerateSchema), aiController.generate);

export default router;
