/**
 * BRANDX — Firebase Client Configuration
 * Initializes Firebase Authentication for client-side Phone OTP and Email/Password sign-in.
 * Connected Project: brandx-cdi-2026 (alias: brandx)
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'brandx-cdi-2026.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'brandx-cdi-2026',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'brandx-cdi-2026.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== 'YOUR_FIREBASE_API_KEY' &&
  firebaseConfig.projectId
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

try {
  if (getApps().length > 0) {
    app = getApp();
    auth = getAuth(app);
    console.info(`[BrandX] 🔥 Firebase Client configured: ${isFirebaseConfigured} (Project: ${firebaseConfig.projectId})`);
  } else if (isFirebaseConfigured) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    console.info(`[BrandX] 🔥 Firebase Client configured: ${isFirebaseConfigured} (Project: ${firebaseConfig.projectId})`);
  } else {
    console.warn(`[BrandX] ⚠️ Firebase Client configured: false. VITE_FIREBASE_API_KEY is not set in .env. Project: ${firebaseConfig.projectId}`);
  }
} catch (error) {
  console.warn('[BrandX] ⚠️ Firebase Client initialization warning:', error);
}

export { app, auth, firebaseConfig };
