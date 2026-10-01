import { Request, Response } from 'express';
import { adminService } from '../services/adminService.js';
import { contentService } from '../services/contentService.js';
import { referralService } from '../services/referralService.js';
import { walletService } from '../services/walletService.js';
import { withdrawalService } from '../services/withdrawalService.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/response.js';

export class AdminController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await adminService.login(email, password, req.ip, req.headers['user-agent']);
      sendSuccess(res, result, 'Admin login successful');
    } catch (error: any) {
      if (error.message?.includes('suspended or inactive')) {
        sendError(res, error.message, 403, 'ADMIN_INACTIVE');
        return;
      }
      sendError(res, error.message, 401, 'ADMIN_AUTH_FAILED');
    }
  }

  async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const overview = await adminService.getDashboardOverview();
      sendSuccess(res, overview, 'Platform overview statistics');
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  }

  async listUsers(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const search = req.query.search as string;
      const status = req.query.status as string;

      const { users, total } = await adminService.listUsers({ page, limit, search, status });
      sendPaginated(res, users, total, page, limit, 'Platform users');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async listBusinesses(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const search = req.query.search as string;
      const city = req.query.city as string;

      const { businesses, total } = await adminService.listBusinesses({ page, limit, search, city });
      sendPaginated(res, businesses, total, page, limit, 'Platform businesses');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async listSubscribers(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const search = req.query.search as string;
      const status = req.query.status as string;

      const { subscribers, total } = await adminService.listSubscribers({ page, limit, search, status });
      sendPaginated(res, subscribers, total, page, limit, 'Pro subscribers');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async listPayments(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const gateway = req.query.gateway as string;

      const { transactions, total } = await adminService.listPayments({ page, limit, search, status, gateway });
      sendPaginated(res, transactions, total, page, limit, 'Payment ledger');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async listRefunds(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const status = req.query.status as string;

      const { refunds, total } = await adminService.listRefunds({ page, limit, status });
      sendPaginated(res, refunds, total, page, limit, 'Refunds records');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async getRevenueSummary(req: Request, res: Response): Promise<void> {
    try {
      const summary = await adminService.getRevenueSummary();
      sendSuccess(res, summary, 'Revenue summary retrieved');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async listPlans(req: Request, res: Response): Promise<void> {
    try {
      const plans = await adminService.listPlansAdmin();
      sendSuccess(res, plans, 'Subscription plans retrieved');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async createPlan(req: Request, res: Response): Promise<void> {
    try {
      const plan = await adminService.createPlan(req.body, req.adminUser?.id);
      sendSuccess(res, plan, 'Subscription plan created successfully', 201);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async updatePlan(req: Request, res: Response): Promise<void> {
    try {
      const plan = await adminService.updatePlan(req.params.id, req.body, req.adminUser?.id);
      sendSuccess(res, plan, 'Subscription plan updated successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async processRefund(req: Request, res: Response): Promise<void> {
    try {
      const result = await adminService.processRefund({
        transactionId: req.body.transactionId || req.body.paymentId,
        amount: req.body.amount,
        reason: req.body.reason,
        adminId: req.adminUser?.id,
      });
      sendSuccess(res, result, 'Refund processed successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async createDailyContent(req: Request, res: Response): Promise<void> {
    try {
      const content = await contentService.createDailyContent(req.body, req.adminUser!.id);
      sendSuccess(res, content, 'Daily status published to all vyaparis', 201);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async createPosterTemplate(req: Request, res: Response): Promise<void> {
    try {
      const poster = await contentService.createPosterTemplate(req.body);
      sendSuccess(res, poster, 'Poster template added to library', 201);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async createFestival(req: Request, res: Response): Promise<void> {
    try {
      const festival = await contentService.createFestival(req.body);
      sendSuccess(res, festival, 'Festival added to calendar', 201);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async listAdminUsers(req: Request, res: Response): Promise<void> {
    try {
      const admins = await adminService.listAdminUsers();
      sendSuccess(res, admins, 'Admin team members');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async createAdminUser(req: Request, res: Response): Promise<void> {
    try {
      const newAdmin = await adminService.createAdminUser(req.body, req.adminUser?.id);
      sendSuccess(res, newAdmin, 'New admin user created', 201);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async updateAdminStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status, isActive, reason } = req.body;
      const updated = await adminService.updateAdminStatus(
        req.params.id,
        status,
        isActive,
        reason,
        req.adminUser?.id
      );
      sendSuccess(res, updated, 'Admin status updated successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async updateAdminRole(req: Request, res: Response): Promise<void> {
    try {
      const { role } = req.body;
      const updated = await adminService.updateAdminRole(
        req.params.id,
        role,
        req.adminUser?.id
      );
      sendSuccess(res, updated, 'Admin role updated successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async listAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 100;
      const logs = await adminService.listAuditLogs(limit);
      sendSuccess(res, logs, 'Audit trail logs retrieved');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async updateUserStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status, reason } = req.body;
      const updated = await adminService.updateUserStatus(req.params.userId, status, reason, req.adminUser!.id);
      sendSuccess(res, updated, 'User status updated');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  // ------------------------------------------------------------
  // REFERRALS & REWARD CONFIGURATION
  // ------------------------------------------------------------
  async listReferrals(req: Request, res: Response): Promise<void> {
    try {
      const data = await referralService.getAdminReferrals(req.query);
      sendSuccess(res, data, 'Referrals retrieved');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async getReferralConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = await referralService.getConfig();
      sendSuccess(res, config, 'Referral configuration retrieved');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async updateReferralConfig(req: Request, res: Response): Promise<void> {
    try {
      const updated = await referralService.updateConfig(req.body);
      sendSuccess(res, updated, 'Referral configuration updated');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  // ------------------------------------------------------------
  // WITHDRAWAL MANAGEMENT & COIN ADJUSTMENT
  // ------------------------------------------------------------
  async listWithdrawals(req: Request, res: Response): Promise<void> {
    try {
      const data = await withdrawalService.getAdminWithdrawals(req.query);
      sendSuccess(res, data, 'Withdrawals retrieved');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async markWithdrawalProcessing(req: Request, res: Response): Promise<void> {
    try {
      const updated = await withdrawalService.markProcessing(req.params.id, req.adminUser!.id);
      sendSuccess(res, updated, 'Withdrawal marked as processing');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async markWithdrawalPaid(req: Request, res: Response): Promise<void> {
    try {
      const { payoutReference } = req.body;
      const updated = await withdrawalService.markPaid(req.params.id, payoutReference, req.adminUser!.id);
      sendSuccess(res, updated, 'Withdrawal marked as paid successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async markWithdrawalFailed(req: Request, res: Response): Promise<void> {
    try {
      const { reason } = req.body;
      const result = await withdrawalService.markFailed(req.params.id, reason, req.adminUser!.id);
      sendSuccess(res, result, 'Withdrawal failed and coins reversed to user wallet');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async adjustWalletCoins(req: Request, res: Response): Promise<void> {
    try {
      const { userId, coins, reason } = req.body;
      const result = await walletService.adminAdjustCoins({
        userId,
        coins: Number(coins),
        reason,
        adminId: req.adminUser!.id,
      });
      sendSuccess(res, result, 'Coins adjusted successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  // ------------------------------------------------------------
  // ADMIN SELF-PROFILE & CREDENTIAL MANAGEMENT
  // ------------------------------------------------------------
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const adminId = req.adminUser!.id;
      const profile = await adminService.getAdminProfile(adminId);
      sendSuccess(res, profile, 'Admin profile retrieved');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const adminId = req.adminUser!.id;
      const updated = await adminService.updateAdminProfile(adminId, req.body, req.ip);
      sendSuccess(res, updated, 'Admin profile updated successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const adminId = req.adminUser!.id;
      const { currentPassword, newPassword } = req.body;
      const result = await adminService.changeAdminPassword(adminId, currentPassword, newPassword, req.ip);
      sendSuccess(res, result, 'Admin password changed successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }
}

export const adminController = new AdminController();

