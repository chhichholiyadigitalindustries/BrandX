import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import businessRoutes from './businessRoutes.js';
import customerRoutes from './customerRoutes.js';
import khataRoutes from './khataRoutes.js';
import productRoutes from './productRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import invoiceRoutes from './invoiceRoutes.js';
import storeRoutes from './storeRoutes.js';
import cardRoutes from './cardRoutes.js';
import publicRoutes from './publicRoutes.js';
import contentRoutes from './contentRoutes.js';
import aiRoutes from './aiRoutes.js';
import subscriptionRoutes from './subscriptionRoutes.js';
import adminRoutes from './adminRoutes.js';
import webhookRoutes from './webhookRoutes.js';
import transactionRoutes from './transactionRoutes.js';
import upiRoutes from './upiRoutes.js';
import referralRoutes from './referralRoutes.js';
import walletRoutes from './walletRoutes.js';

import { prisma, isPostgresConnected } from '../config/database.js';
import { config } from '../config/index.js';

const router = Router();

export async function healthCheckHandler(req: any, res: any) {
  let isDbAlive = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    isDbAlive = true;
  } catch {
    isDbAlive = !config.isProduction && isPostgresConnected;
  }

  const isHealthy = isDbAlive;
  const statusCode = isHealthy ? 200 : config.isProduction ? 503 : 200;

  res.status(statusCode).json({
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'BrandX Backend API',
    database: isDbAlive ? 'connected' : 'offline',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
}

// Health check endpoint (safe for public/monitoring probes, zero credential leaks)
router.get('/health', healthCheckHandler);

// Mount modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/businesses', businessRoutes);
router.use('/customers', customerRoutes);
router.use('/transactions', transactionRoutes);
router.use('/khata', khataRoutes);
router.use('/products', productRoutes);
router.use('/catalog', productRoutes);
router.use('/product-categories', categoryRoutes);
router.use('/categories', categoryRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/public', publicRoutes);
router.use('/digital-store', storeRoutes);
router.use('/store', storeRoutes);
router.use('/digital-card', cardRoutes);
router.use('/card', cardRoutes);
router.use('/upi', upiRoutes);
router.use('/content', contentRoutes);
router.use('/daily-content', contentRoutes);
router.use('/ai', aiRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/subscription', subscriptionRoutes);
router.use('/referrals', referralRoutes);
router.use('/wallet', walletRoutes);
router.use('/admin', adminRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/payments', webhookRoutes);

export default router;
