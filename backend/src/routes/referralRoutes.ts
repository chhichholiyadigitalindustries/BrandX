/**
 * BRANDX — Referral Routes
 */

import { Router } from 'express';
import { referralController } from '../controllers/referralController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// All referral user routes require authenticated user session
router.get('/me', requireAuth, referralController.getReferralStats);
router.get('/code', requireAuth, referralController.getReferralCode);
router.get('/history', requireAuth, referralController.getReferralHistory);
router.post('/claim', requireAuth, referralController.claimReferralCode);

export default router;
