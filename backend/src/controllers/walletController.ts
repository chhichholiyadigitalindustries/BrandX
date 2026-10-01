/**
 * BRANDX — Coin Wallet & Withdrawal Controller
 */

import { Request, Response } from 'express';
import { walletService } from '../services/walletService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class WalletController {
  async getWallet(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || (req as any).user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
        return;
      }
      const data = await walletService.getWalletSummary(userId);
      sendSuccess(res, data, 'Wallet summary fetched successfully');
    } catch (err: any) {
      sendError(res, err.message, 400, 'WALLET_FETCH_FAILED');
    }
  }

  async getTransactions(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || (req as any).user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
        return;
      }
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const type = typeof req.query.type === 'string' ? req.query.type : undefined;

      const data = await walletService.getTransactions(userId, page, limit, type);
      sendSuccess(res, data, 'Wallet transactions fetched successfully');
    } catch (err: any) {
      sendError(res, err.message, 400, 'TRANSACTIONS_FETCH_FAILED');
    }
  }

  async requestWithdrawal(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || (req as any).user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
        return;
      }

      const { coins, payoutMethod, payoutAccount, accountHolderName } = req.body;

      if (!coins || !Number.isInteger(Number(coins))) {
        sendError(res, 'A valid integer coin amount is required.', 400, 'INVALID_COINS');
        return;
      }
      if (!payoutAccount || typeof payoutAccount !== 'string' || payoutAccount.trim().length < 3) {
        sendError(res, 'A valid payout account or UPI ID is required.', 400, 'INVALID_PAYOUT_ACCOUNT');
        return;
      }

      const validMethod = payoutMethod === 'BANK_ACCOUNT' ? 'BANK_ACCOUNT' : 'UPI';

      const result = await walletService.requestWithdrawal({
        userId,
        coins: Number(coins),
        payoutMethod: validMethod,
        payoutAccount: payoutAccount.trim(),
        accountHolderName: accountHolderName ? String(accountHolderName).trim() : undefined,
      });

      sendSuccess(res, result, 'Withdrawal request created successfully', 201);
    } catch (err: any) {
      const msg = err.message || '';
      let code = 'WITHDRAWAL_FAILED';
      let status = 400;

      if (msg.includes('INSUFFICIENT_WALLET_BALANCE')) {
        code = 'INSUFFICIENT_BALANCE';
        status = 400;
      } else if (msg.includes('MINIMUM_WITHDRAWAL_NOT_MET')) {
        code = 'SUB_MINIMUM_WITHDRAWAL';
        status = 400;
      }

      sendError(res, err.message, status, code);
    }
  }

  async getUserWithdrawals(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
        return;
      }
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const data = await walletService.getUserWithdrawals(userId, page, limit);
      sendSuccess(res, data, 'User withdrawals fetched successfully');
    } catch (err: any) {
      sendError(res, err.message, 400, 'WITHDRAWALS_FETCH_FAILED');
    }
  }
}

export const walletController = new WalletController();
