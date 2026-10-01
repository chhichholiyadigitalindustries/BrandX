import dotenv from 'dotenv';
import { validateEnvironment } from './envValidator.js';
dotenv.config();

// Enforce production security rules and configuration completeness
validateEnvironment();

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT || '5000', 10),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  corsOrigin: (process.env.CORS_ORIGIN || 'https://brandx-frontend.onrender.com,http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean),

  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/brandx_db?schema=public',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'brandx_jwt_secret_key_2026_dev_fallback',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'brandx_jwt_refresh_secret_key_2026_dev_fallback',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  admin: {
    jwtSecret: process.env.ADMIN_JWT_SECRET || 'brandx_admin_secret_key_2026_dev_fallback',
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    maxOutputTokens: parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS || '2048', 10),
    timeoutMs: parseInt(process.env.GEMINI_TIMEOUT_MS || '30000', 10),
    freeDailyLimit: parseInt(process.env.AI_FREE_DAILY_LIMIT || '20', 10),
    proDailyLimit: parseInt(process.env.AI_PRO_DAILY_LIMIT || '100', 10),
  },

  storage: {
    driver: (process.env.STORAGE_DRIVER || 'local') as 'local' | 's3',
    bucket: process.env.STORAGE_BUCKET || 'brandx-media-assets',
    region: process.env.STORAGE_REGION || 'ap-south-1',
    accessKey: process.env.STORAGE_ACCESS_KEY || '',
    secretKey: process.env.STORAGE_SECRET_KEY || '',
    endpoint: process.env.STORAGE_ENDPOINT,
  },

  payment: {
    gateway: (process.env.PAYMENT_PROVIDER || process.env.PAYMENT_GATEWAY || 'razorpay').toLowerCase() as
      | 'razorpay'
      | 'cashfree'
      | 'phonepe'
      | 'stripe'
      | 'mock',
    providerKey: process.env.PAYMENT_KEY_ID || process.env.PAYMENT_PROVIDER_KEY || 'rzp_test_placeholder',
    providerSecret: process.env.PAYMENT_KEY_SECRET || process.env.PAYMENT_PROVIDER_SECRET || 'rzp_test_placeholder_secret',
    webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || 'whsec_placeholder',
    currency: process.env.PAYMENT_CURRENCY || 'INR',
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'brandx-cdi-2026',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
  },
};
