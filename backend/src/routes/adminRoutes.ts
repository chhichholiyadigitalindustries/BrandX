import { Router } from 'express';
import { adminController } from '../controllers/adminController.js';
import { adminDailyContentController } from '../controllers/adminDailyContentController.js';
import { requireAdmin, requireRoles } from '../middleware/adminAuthMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';
import {
  adminLoginSchema,
  createAdminUserSchema,
  updatePlatformUserStatusSchema,
  createDailyContentSchema,
  updateDailyContentSchema,
  scheduleDailyContentSchema,
  createFestivalSchema,
  updateFestivalSchema,
  createContentCategorySchema,
  updateContentCategorySchema,
  createContentAssetSchema,
  updateContentAssetSchema,
  adminCreatePlanSchema,
  adminUpdatePlanSchema,
  adminRefundSchema,
  updateAdminStatusSchema,
  updateAdminRoleSchema,
  updateAdminProfileSchema,
  changeAdminPasswordSchema,
} from '../validators/index.js';

import { adminRateLimiter } from '../middleware/rateLimitMiddleware.js';

const router = Router();

// Admin Authentication (Public)
router.post('/auth/login', validateBody(adminLoginSchema), adminController.login);

// Protected Admin Portal APIs
router.use(requireAdmin);
router.use(adminRateLimiter);

// Admin Self-Profile & Credentials Management (All authenticated admin roles)
router.get('/profile', adminController.getProfile);
router.patch('/profile', validateBody(updateAdminProfileSchema), adminController.updateProfile);
router.post('/profile/password', validateBody(changeAdminPasswordSchema), adminController.changePassword);

// Dashboard overview (All admin roles)
router.get('/overview', requireRoles(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT']), adminController.getOverview);

// User and business directory (Super Admin, Admin, Manager - Accountant excluded)
router.get('/users', requireRoles(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), adminController.listUsers);
router.patch('/users/:userId/status', requireRoles(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), validateBody(updatePlatformUserStatusSchema), adminController.updateUserStatus);
router.get('/businesses', requireRoles(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), adminController.listBusinesses);

// Pro subscription & revenue management
router.get('/revenue', requireRoles(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'FINANCE']), adminController.getRevenueSummary);
router.get('/subscribers', requireRoles(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'FINANCE']), adminController.listSubscribers);
router.get('/payments', requireRoles(['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'FINANCE']), adminController.listPayments);
router.get('/refunds', requireRoles(['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'FINANCE']), adminController.listRefunds);
router.post(
  '/refunds',
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'FINANCE']),
  validateBody(adminRefundSchema),
  adminController.processRefund
);

// Subscription Plans Management
router.get('/plans', requireRoles(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT']), adminController.listPlans);
router.post(
  '/plans',
  requireRoles(['SUPER_ADMIN', 'ADMIN']),
  validateBody(adminCreatePlanSchema),
  adminController.createPlan
);
router.patch(
  '/plans/:id',
  requireRoles(['SUPER_ADMIN', 'ADMIN']),
  validateBody(adminUpdatePlanSchema),
  adminController.updatePlan
);

// ============================================================
// DAILY CONTENT CMS (RBAC Protected: SUPER_ADMIN, ADMIN, CONTENT_MANAGER, MANAGER)
// ============================================================

router.post(
  '/daily-content/upload-image',
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER', 'MANAGER']),
  adminDailyContentController.uploadImage
);

router.post(
  '/daily-content',
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER', 'MANAGER']),
  validateBody(createDailyContentSchema),
  adminDailyContentController.createDailyContent
);

router.get(
  '/daily-content',
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER', 'MANAGER', 'SUPPORT']),
  adminDailyContentController.listDailyContent
);

router.get(
  '/daily-content/:id',
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER', 'MANAGER', 'SUPPORT']),
  adminDailyContentController.getDailyContentById
);

router.patch(
  '/daily-content/:id',
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER', 'MANAGER']),
  validateBody(updateDailyContentSchema),
  adminDailyContentController.updateDailyContent
);

router.delete(
  '/daily-content/:id',
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER', 'MANAGER']),
  adminDailyContentController.deleteDailyContent
);

router.post(
  '/daily-content/:id/publish',
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER', 'MANAGER']),
  adminDailyContentController.publishDailyContent
);

router.post(
  '/daily-content/:id/unpublish',
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER', 'MANAGER']),
  adminDailyContentController.unpublishDailyContent
);

router.post(
  '/daily-content/:id/schedule',
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER', 'MANAGER']),
  validateBody(scheduleDailyContentSchema),
  adminDailyContentController.scheduleDailyContent
);

// ============================================================
// FESTIVALS CMS
// ============================================================

router.get('/festivals', adminDailyContentController.listFestivals);

router.post(
  '/festivals',
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER', 'MANAGER']),
  validateBody(createFestivalSchema),
  adminDailyContentController.createFestival
);

router.patch(
  '/festivals/:id',
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER', 'MANAGER']),
  validateBody(updateFestivalSchema),
  adminDailyContentController.updateFestival
);

router.delete(
  '/festivals/:id',
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER', 'MANAGER']),
  adminDailyContentController.deleteFestival
);

// ============================================================
// CONTENT CATEGORIES CMS
// ============================================================

router.get('/content-categories', adminDailyContentController.listCategories);

router.post(
  '/content-categories',
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER', 'MANAGER']),
  validateBody(createContentCategorySchema),
  adminDailyContentController.createCategory
);

router.patch(
  '/content-categories/:id',
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER', 'MANAGER']),
  validateBody(updateContentCategorySchema),
  adminDailyContentController.updateCategory
);

router.delete(
  '/content-categories/:id',
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER', 'MANAGER']),
  adminDailyContentController.deleteCategory
);

// ============================================================
// POSTER TEMPLATE / ASSET CMS
// ============================================================

router.get('/posters', adminDailyContentController.listPosters);

router.post(
  '/posters',
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER', 'MANAGER']),
  validateBody(createContentAssetSchema),
  adminDailyContentController.createPoster
);

router.patch(
  '/posters/:id',
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER', 'MANAGER']),
  validateBody(updateContentAssetSchema),
  adminDailyContentController.updatePoster
);

router.delete(
  '/posters/:id',
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER', 'MANAGER']),
  adminDailyContentController.deletePoster
);

// Legacy routes for backward compatibility
router.post('/content/daily', requireRoles(['SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER', 'MANAGER']), adminController.createDailyContent);
router.post('/content/posters', requireRoles(['SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER', 'MANAGER']), adminController.createPosterTemplate);
router.post('/content/festivals', requireRoles(['SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER', 'MANAGER']), adminController.createFestival);

// Admin team management (SUPER_ADMIN only)
router.get('/admin-users', requireRoles(['SUPER_ADMIN']), adminController.listAdminUsers);
router.post('/admin-users', requireRoles(['SUPER_ADMIN']), validateBody(createAdminUserSchema), adminController.createAdminUser);
router.patch('/admin-users/:id/status', requireRoles(['SUPER_ADMIN']), validateBody(updateAdminStatusSchema), adminController.updateAdminStatus);
router.patch('/admin-users/:id/role', requireRoles(['SUPER_ADMIN']), validateBody(updateAdminRoleSchema), adminController.updateAdminRole);

// Audit logs (SUPER_ADMIN only)
router.get('/audit-logs', requireRoles(['SUPER_ADMIN']), adminController.listAuditLogs);

// Referrals & Reward Configuration (Super Admin & Manager)
router.get('/referrals', requireRoles(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), adminController.listReferrals);
router.get('/referrals/config', requireRoles(['SUPER_ADMIN', 'ADMIN']), adminController.getReferralConfig);
router.put('/referrals/config', requireRoles(['SUPER_ADMIN', 'ADMIN']), adminController.updateReferralConfig);

// Withdrawals Management (Super Admin & Accountant)
router.get('/withdrawals', requireRoles(['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'FINANCE']), adminController.listWithdrawals);
router.post('/withdrawals/:id/process', requireRoles(['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'FINANCE']), adminController.markWithdrawalProcessing);
router.post('/withdrawals/:id/paid', requireRoles(['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'FINANCE']), adminController.markWithdrawalPaid);
router.post('/withdrawals/:id/fail', requireRoles(['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'FINANCE']), adminController.markWithdrawalFailed);

// Manual Coin Adjustment (SUPER_ADMIN only)
router.post('/wallet/adjust', requireRoles(['SUPER_ADMIN', 'ADMIN']), adminController.adjustWalletCoins);

export default router;
