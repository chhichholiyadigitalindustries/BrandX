/**
 * BRANDX — Referral API Controller
 */

import { Request, Response } from 'express';
import { referralService } from '../services/referralService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class ReferralController {
  async getReferralStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || (req as any).user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
        return;
      }
      const data = await referralService.getUserReferralStats(userId);
      sendSuccess(res, data, 'Referral stats fetched successfully');
    } catch (err: any) {
      sendError(res, err.message, 400, 'REFERRAL_STATS_FAILED');
    }
  }

  async getReferralCode(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || (req as any).user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
        return;
      }
      const referralCode = await referralService.getOrCreateReferralCode(userId);
      const referralLink = referralService.getReferralLink(referralCode);
      sendSuccess(res, { referralCode, referralLink }, 'Referral code fetched successfully');
    } catch (err: any) {
      sendError(res, err.message, 400, 'REFERRAL_CODE_FAILED');
    }
  }

  async getReferralHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || (req as any).user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
        return;
      }
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const data = await referralService.getUserReferralHistory(userId, page, limit);
      sendSuccess(res, data, 'Referral history fetched successfully');
    } catch (err: any) {
      sendError(res, err.message, 400, 'REFERRAL_HISTORY_FAILED');
    }
  }

  async claimReferralCode(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || (req as any).user?.userId;
      const { referralCode } = req.body;

      if (!userId) {
        sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
        return;
      }
      if (!referralCode || typeof referralCode !== 'string') {
        sendError(res, 'Referral code is required.', 400, 'INVALID_INPUT');
        return;
      }

      const result = await referralService.registerReferral(referralCode, userId);
      sendSuccess(res, result, 'Referral code linked successfully', 201);
    } catch (err: any) {
      const msg = err.message || '';
      const status = msg.includes('DUPLICATE') || msg.includes('SELF_REFERRAL') ? 409 : 400;
      sendError(res, err.message, status, 'CLAIM_FAILED');
    }
  }
}

export const referralController = new ReferralController();
