/**
 * BRANDX — Coin Wallet & Withdrawal Routes
 */

import { Router } from 'express';
import { walletController } from '../controllers/walletController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { withdrawalRateLimiter } from '../middleware/rateLimitMiddleware.js';

const router = Router();

// All wallet routes require authenticated user session
router.get('/', requireAuth, walletController.getWallet);
router.get('/summary', requireAuth, walletController.getWallet);
router.get('/transactions', requireAuth, walletController.getTransactions);
router.post('/withdrawals', withdrawalRateLimiter, requireAuth, walletController.requestWithdrawal);
router.get('/withdrawals', requireAuth, walletController.getUserWithdrawals);

export default router;
