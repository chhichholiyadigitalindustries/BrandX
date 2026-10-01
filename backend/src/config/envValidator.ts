/**
 * BRANDX — Centralized Environment Validation Layer
 * Enforces production security, fail-fast startup checks, and secret hygiene.
 */

import { z } from 'zod';

const DevFallbackPatterns = [
  'dev_fallback',
  'change_in_prod',
  'placeholder',
  'super_secret',
  'example',
];

function isSafeProductionSecret(val?: string): boolean {
  if (!val || val.length < 32) return false;
  const lower = val.toLowerCase();
  return !DevFallbackPatterns.some((pattern) => lower.includes(pattern));
}

export function validateEnvironment(): void {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Development / Test warning banner
    return;
  }

  const errors: string[] = [];

  // 1. PostgreSQL Database URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://'))) {
    errors.push('DATABASE_URL is missing or is not a valid PostgreSQL connection string.');
  } else {
    const urlLower = databaseUrl.toLowerCase();
    if (
      urlLower.includes('localhost') ||
      urlLower.includes('127.0.0.1') ||
      urlLower.includes('0.0.0.0') ||
      urlLower.includes('host.docker.internal')
    ) {
      errors.push(
        'DATABASE_URL in production cannot point to localhost/127.0.0.1. A managed PostgreSQL database (e.g. AWS RDS, Neon, Supabase, Cloud SQL) is required.'
      );
    }
  }

  // 2. JWT Secrets
  const jwtSecret = process.env.JWT_SECRET;
  if (!isSafeProductionSecret(jwtSecret)) {
    errors.push(
      'JWT_SECRET must be a strong random secret with at least 32 characters, and cannot be a default/fallback string.'
    );
  }

  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!isSafeProductionSecret(jwtRefreshSecret)) {
    errors.push(
      'JWT_REFRESH_SECRET must be a strong random secret with at least 32 characters, and cannot be a default/fallback string.'
    );
  }

  // 3. Admin JWT Secret
  const adminJwtSecret = process.env.ADMIN_JWT_SECRET;
  if (!isSafeProductionSecret(adminJwtSecret)) {
    errors.push(
      'ADMIN_JWT_SECRET must be a strong random secret with at least 32 characters, and cannot be a default/fallback string.'
    );
  }

  // 4. CORS Origins
  const corsOrigin = process.env.CORS_ORIGIN;
  if (!corsOrigin || corsOrigin.includes('*')) {
    errors.push(
      'CORS_ORIGIN must be explicitly configured with trusted production domains and cannot contain wildcard "*" in production.'
    );
  }

  // 5. Firebase Admin (for token verification)
  const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!firebaseClientEmail && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    errors.push(
      'FIREBASE_CLIENT_EMAIL or GOOGLE_APPLICATION_CREDENTIALS is required for server-side Firebase ID token verification.'
    );
  }
  if (!firebasePrivateKey && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    errors.push(
      'FIREBASE_PRIVATE_KEY or GOOGLE_APPLICATION_CREDENTIALS is required for server-side Firebase ID token verification.'
    );
  }

  // 6. Google Gemini AI API Key (Server-side only)
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey || geminiApiKey.trim().length === 0 || geminiApiKey.includes('placeholder') || geminiApiKey.includes('your_gemini')) {
    errors.push(
      'GEMINI_API_KEY is required for server-side Google Gemini AI features and cannot be missing or a placeholder in production.'
    );
  }

  if (errors.length > 0) {
    console.error('\n========================================================');
    console.error('❌ [FATAL] PRODUCTION ENVIRONMENT CONFIGURATION ERRORS:');
    console.error('========================================================');
    errors.forEach((err, idx) => {
      console.error(` ${idx + 1}. ${err}`);
    });
    console.error('========================================================');
    console.error('Server execution halted to prevent insecure production deployment.\n');

    throw new Error(`Production environment validation failed with ${errors.length} error(s).`);
  }
}
