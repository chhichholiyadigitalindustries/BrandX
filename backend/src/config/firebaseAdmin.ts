/**
 * BRANDX — Firebase Admin SDK Configuration & Token Verification
 * Verifies Firebase ID Tokens from Mobile Phone OTP & Email/Password authentications.
 */

import { initializeApp, getApps, cert, applicationDefault, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

let firebaseAdminApp: App | null = null;
let isFirebaseAdminInitialized = false;

function initializeFirebaseAdmin(): App | null {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    firebaseAdminApp = existingApps[0]!;
    isFirebaseAdminInitialized = true;
    return firebaseAdminApp;
  }

  const { projectId, clientEmail, privateKey: rawPrivateKey } = config.firebase;

  // Handle multiline private key with escaped newlines
  const privateKey = rawPrivateKey ? rawPrivateKey.replace(/\\n/g, '\n') : undefined;

  try {
    if (clientEmail && privateKey) {
      firebaseAdminApp = initializeApp({
        credential: cert({
          projectId: projectId || 'brandx-cdi-2026',
          clientEmail,
          privateKey,
        }),
      });
      isFirebaseAdminInitialized = true;
      logger.info(`🔥 Firebase Admin SDK initialized for project: ${projectId}`);
      return firebaseAdminApp;
    } else if (projectId && config.isProduction) {
      // In production environment, try Application Default Credentials (ADC)
      firebaseAdminApp = initializeApp({
        credential: applicationDefault(),
        projectId,
      });
      isFirebaseAdminInitialized = true;
      logger.info(`🔥 Firebase Admin SDK initialized with ADC for project: ${projectId}`);
      return firebaseAdminApp;
    } else {
      logger.info(`ℹ️ Firebase Admin SDK: No service account keys configured; running in development test mode.`);
      return null;
    }
  } catch (err: any) {
    logger.warn(`⚠️ Firebase Admin initialization warning: ${err.message}`);
    return null;
  }
}

// Initialize on module load
initializeFirebaseAdmin();

export interface VerifiedFirebaseUser {
  uid: string;
  email?: string;
  phone_number?: string;
  name?: string;
  picture?: string;
  auth_time?: number;
  email_verified?: boolean;
  firebase?: {
    sign_in_provider?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Cryptographically verifies a Firebase ID Token using Firebase Admin SDK.
 * In development/test environments, supports test tokens for automated test suites.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseUser> {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Firebase ID token is missing or invalid.');
  }

  const trimmedToken = idToken.trim();

  // Support local test tokens in non-production environments
  if (!config.isProduction && (trimmedToken.startsWith('test_firebase_') || trimmedToken.startsWith('mock_firebase_'))) {
    const parts = trimmedToken.split('_');
    const uid = parts.slice(2).join('_') || 'test_uid_default';
    return {
      uid,
      email: trimmedToken.includes('email') ? `${uid}@brandx-test.in` : undefined,
      phone_number: trimmedToken.includes('phone') ? '+919876543210' : undefined,
      name: `Test Vyapari ${uid.substring(0, 4)}`,
      email_verified: true,
    };
  }

  // Parse simulated base64 test token in dev/test
  if (!config.isProduction && trimmedToken.startsWith('eyJhbGciOiJSUzI1NiIs') && !isFirebaseAdminInitialized) {
    try {
      const parts = trimmedToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        if (payload.user_id || payload.sub || payload.uid) {
          return {
            uid: payload.user_id || payload.sub || payload.uid,
            email: payload.email,
            phone_number: payload.phone_number,
            name: payload.name,
            picture: payload.picture,
            email_verified: payload.email_verified,
          };
        }
      }
    } catch {
      // Fall through to real verifier
    }
  }

  if (!isFirebaseAdminInitialized && getApps().length === 0) {
    initializeFirebaseAdmin();
  }

  if (!isFirebaseAdminInitialized || !firebaseAdminApp) {
    throw new Error(
      'Firebase Admin SDK is not configured. Please set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in backend environment.'
    );
  }

  try {
    const auth = getAuth(firebaseAdminApp);
    const decoded = await auth.verifyIdToken(trimmedToken, true);
    return {
      uid: decoded.uid,
      email: decoded.email,
      phone_number: decoded.phone_number,
      name: decoded.name,
      picture: decoded.picture,
      auth_time: decoded.auth_time,
      email_verified: decoded.email_verified,
    };
  } catch (err: any) {
    logger.warn(`Firebase ID token verification failed: ${err.message}`);
    throw new Error(`Firebase token verification failed: ${err.message}`);
  }
}

export { firebaseAdminApp, isFirebaseAdminInitialized };
