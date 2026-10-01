/**
 * BRANDX — Firebase Client Configuration
 * Initializes Firebase Authentication for client-side Phone OTP and Email/Password sign-in.
 * Connected Project: brandx-cdi-2026 (alias: brandx)
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

/**
 * Sanitizes dashboard/environment variable values:
 * - Trims accidental whitespace or newlines
 * - Strips accidental surrounding quotes ("value" or 'value') from dashboard copies
 */
const cleanEnv = (val?: string): string => {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '');
};

const firebaseConfig = {
  apiKey: cleanEnv(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: cleanEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) || 'brandx-cdi-2026.firebaseapp.com',
  projectId: cleanEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID) || 'brandx-cdi-2026',
  storageBucket: cleanEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) || 'brandx-cdi-2026.firebasestorage.app',
  messagingSenderId: cleanEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: cleanEnv(import.meta.env.VITE_FIREBASE_APP_ID),
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== 'YOUR_FIREBASE_API_KEY' &&
  !firebaseConfig.apiKey.includes('REPLACE_WITH') &&
  firebaseConfig.projectId
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (app) return app;
  try {
    if (getApps().length > 0) {
      app = getApp();
      return app;
    }
    if (isFirebaseConfigured) {
      app = initializeApp(firebaseConfig);
      return app;
    }
  } catch (error) {
    console.warn('[BrandX] Firebase App initialization error:', error);
  }
  return null;
}

export function getFirebaseAuth(): Auth | null {
  if (auth) return auth;
  try {
    const currentApp = getFirebaseApp();
    if (currentApp) {
      auth = getAuth(currentApp);
      return auth;
    }
  } catch (error) {
    console.warn('[BrandX] Firebase Auth initialization error:', error);
  }
  return null;
}

// Eager initialization attempt at module load time
try {
  if (isFirebaseConfigured || getApps().length > 0) {
    getFirebaseAuth();
    if (auth) {
      console.info(`[BrandX] 🔥 Firebase Client configured: ${isFirebaseConfigured} (Project: ${firebaseConfig.projectId})`);
    }
  } else {
    console.warn(`[BrandX] ⚠️ Firebase Client configured: false. VITE_FIREBASE_API_KEY is not set in .env. Project: ${firebaseConfig.projectId}`);
  }
} catch (error) {
  console.warn('[BrandX] ⚠️ Firebase Client initialization warning:', error);
}

export { app, auth, firebaseConfig };

