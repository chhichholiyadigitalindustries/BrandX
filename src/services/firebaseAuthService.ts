/**
 * BRANDX — Firebase Client Authentication Service
 * Handles Phone Number + OTP and Email + Password authentication flows via Firebase Client SDK.
 * Seamlessly interfaces with BrandX Backend (PostgreSQL + Express + Prisma) via ID Tokens.
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  signOut as fbSignOut,
  RecaptchaVerifier,
  ConfirmationResult,
  UserCredential,
  User,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth as staticAuth, isFirebaseConfigured, getFirebaseAuth } from '../config/firebase';

export interface PhoneOtpSession {
  confirmationResult: ConfirmationResult | null;
  phoneNumber: string;
}

class FirebaseAuthService {
  private recaptchaVerifier: RecaptchaVerifier | null = null;
  private recaptchaWidgetId: number | null = null;
  private currentConfirmationResult: ConfirmationResult | null = null;
  private isOtpSending: boolean = false;
  private currentContainerId: string = 'recaptcha-container';

  /**
   * Dynamically resolves the active Firebase Auth instance.
   * Prioritizes lazy initialization if static instance was not immediately available.
   */
  private get auth() {
    return getFirebaseAuth() || staticAuth;
  }

  /**
   * Check if Firebase client is ready and configured
   */
  isConfigured(): boolean {
    return isFirebaseConfigured && this.auth !== null;
  }

  /**
   * Reset the reCAPTCHA widget token without destroying or re-rendering DOM
   */
  resetRecaptchaWidget(): void {
    try {
      if (
        this.recaptchaWidgetId !== null &&
        typeof window !== 'undefined' &&
        (window as any).grecaptcha &&
        typeof (window as any).grecaptcha.reset === 'function'
      ) {
        (window as any).grecaptcha.reset(this.recaptchaWidgetId);
        console.info(`[BrandX] Recaptcha reset (widgetId: ${this.recaptchaWidgetId})`);
      }
    } catch (err) {
      console.warn('[BrandX] Recaptcha reset warning:', err);
    }
  }

  /**
   * Safely clear the RecaptchaVerifier instance and empty the DOM container
   */
  clearRecaptcha(containerId: string = 'recaptcha-container'): void {
    if (this.recaptchaVerifier) {
      try {
        this.recaptchaVerifier.clear();
        console.info('[BrandX] Recaptcha cleared');
      } catch (err) {
        console.warn('[BrandX] Recaptcha clear warning:', err);
      }
      this.recaptchaVerifier = null;
      this.recaptchaWidgetId = null;
    }

    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
    }
  }

  /**
   * Get an existing valid RecaptchaVerifier or safely initialize exactly one instance.
   * Ensures only ONE RecaptchaVerifier is attached to the container at any given time.
   */
  async getOrCreateRecaptchaVerifier(containerId: string = 'recaptcha-container'): Promise<RecaptchaVerifier | null> {
    const authInstance = this.auth;
    if (!this.isConfigured() || !authInstance) {
      console.warn('[BrandX] Firebase Auth not configured. Please ensure VITE_FIREBASE_API_KEY is set in .env.');
      return null;
    }

    this.currentContainerId = containerId;
    const container = document.getElementById(containerId);

    // If a valid verifier already exists and the container is in the DOM with rendered children, reuse it
    if (this.recaptchaVerifier && container && container.children.length > 0) {
      console.info('[BrandX] Recaptcha reused');
      return this.recaptchaVerifier;
    }

    // Otherwise safely clear any stale instance and sanitize the DOM container
    this.clearRecaptcha(containerId);

    const targetContainer = document.getElementById(containerId);
    if (!targetContainer) {
      console.error(`[BrandX] Recaptcha container element #${containerId} not found in DOM.`);
      return null;
    }

    // Ensure container is empty before rendering new RecaptchaVerifier to prevent
    // "reCAPTCHA has already been rendered in this element"
    targetContainer.innerHTML = '';

    try {
      this.recaptchaVerifier = new RecaptchaVerifier(authInstance, containerId, {
        size: 'invisible',
        callback: () => {
          console.info('[BrandX] reCAPTCHA verified successfully');
        },
        'expired-callback': () => {
          console.warn('[BrandX] reCAPTCHA expired, resetting widget');
          this.resetRecaptchaWidget();
        },
      });

      this.recaptchaWidgetId = await this.recaptchaVerifier.render();
      console.info(`[BrandX] Recaptcha initialized (widgetId: ${this.recaptchaWidgetId})`);
      return this.recaptchaVerifier;
    } catch (error: any) {
      console.error('[BrandX] Error creating RecaptchaVerifier:', error);
      this.clearRecaptcha(containerId);
      return null;
    }
  }

  /**
   * Backward-compatible synchronous/async helper for Recaptcha init
   */
  initRecaptcha(containerId: string = 'recaptcha-container'): RecaptchaVerifier | null {
    if (this.recaptchaVerifier) {
      return this.recaptchaVerifier;
    }
    // Asynchronously kick off verifier creation if not ready
    this.getOrCreateRecaptchaVerifier(containerId).catch((err) => {
      console.warn('[BrandX] initRecaptcha async error:', err);
    });
    return this.recaptchaVerifier;
  }

  /**
   * Request OTP via Firebase Phone Authentication
   * Normalizes Indian 10-digit mobile number with +91 country code
   * Safely handles first request, repeated requests, resends, and concurrency.
   */
  async sendPhoneOtp(
    mobileNumber: string,
    recaptchaContainerId: string = 'recaptcha-container',
    isResend: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    const authInstance = this.auth;
    if (!this.isConfigured() || !authInstance) {
      return {
        success: false,
        error: 'Firebase Authentication is not configured. Please verify that VITE_FIREBASE_API_KEY is configured in your .env file.',
      };
    }

    // Prevent duplicate concurrent OTP requests
    if (this.isOtpSending) {
      console.warn('[BrandX] OTP request already in progress');
      return {
        success: false,
        error: 'An OTP request is already in progress. Please wait a moment.',
      };
    }

    this.isOtpSending = true;

    // Format to E.164 (+91XXXXXXXXXX)
    const cleanDigits = mobileNumber.replace(/\D/g, '');
    const formattedPhone = cleanDigits.length === 10
      ? `+91${cleanDigits}`
      : cleanDigits.startsWith('91') && cleanDigits.length === 12
        ? `+${cleanDigits}`
        : cleanDigits.startsWith('+')
          ? mobileNumber
          : `+91${cleanDigits}`;

    // Mask phone number for secure logging without exposing full customer info
    const maskedPhone = formattedPhone.length > 6
      ? formattedPhone.slice(0, 3) + '****' + formattedPhone.slice(-4)
      : '***';

    try {
      console.info(`[BrandX] OTP request started for ${maskedPhone}`);

      // If verifier already exists and was previously rendered/used, reset widget token
      if (this.recaptchaVerifier && this.recaptchaWidgetId !== null) {
        this.resetRecaptchaWidget();
      }

      const verifier = await this.getOrCreateRecaptchaVerifier(recaptchaContainerId);
      if (!verifier) {
        throw new Error('Could not initialize reCAPTCHA security verification. Please reload the page.');
      }

      const confirmationResult = await signInWithPhoneNumber(authInstance, formattedPhone, verifier);
      this.currentConfirmationResult = confirmationResult;
      console.info(`[BrandX] OTP request completed successfully for ${maskedPhone}`);
      return { success: true };
    } catch (err: any) {
      console.error(`[BrandX] OTP request failed for ${maskedPhone}:`, err?.message || err);
      // Reset the widget so next retry or resend can trigger verification cleanly
      this.resetRecaptchaWidget();
      return {
        success: false,
        error: err?.message || 'Failed to send OTP via Firebase.',
      };
    } finally {
      this.isOtpSending = false;
    }
  }

  /**
   * Verify the received SMS OTP
   * Returns the Firebase ID Token to be sent to BrandX backend
   */
  async verifyPhoneOtp(
    otpCode: string
  ): Promise<{ success: boolean; idToken?: string; user?: User; error?: string }> {
    if (!this.currentConfirmationResult) {
      return {
        success: false,
        error: 'No active OTP verification session. Please request a new OTP.',
      };
    }

    try {
      const userCredential = await this.currentConfirmationResult.confirm(otpCode);
      const idToken = await userCredential.user.getIdToken();
      return {
        success: true,
        idToken,
        user: userCredential.user,
      };
    } catch (err: any) {
      console.error('[BrandX] Firebase verifyPhoneOtp error:', err);
      return {
        success: false,
        error: err.message || 'Invalid or expired OTP code.',
      };
    }
  }

  /**
   * Sign In with Email & Password via Firebase Auth
   */
  async signInWithEmail(
    email: string,
    password: string
  ): Promise<{ success: boolean; idToken?: string; user?: User; error?: string }> {
    const authInstance = this.auth;
    if (!this.isConfigured() || !authInstance) {
      return {
        success: false,
        error: 'Firebase Authentication is not configured. Please ensure VITE_FIREBASE_API_KEY is set in your .env file.',
      };
    }

    try {
      const userCredential = await signInWithEmailAndPassword(authInstance, email.trim(), password);
      const idToken = await userCredential.user.getIdToken();
      return {
        success: true,
        idToken,
        user: userCredential.user,
      };
    } catch (err: any) {
      console.error('[BrandX] Firebase signInWithEmail error:', err);
      return {
        success: false,
        error: err.message || 'Email authentication failed.',
      };
    }
  }

  /**
   * Sign Up with Email & Password via Firebase Auth
   */
  async signUpWithEmail(
    email: string,
    password: string
  ): Promise<{ success: boolean; idToken?: string; user?: User; error?: string }> {
    const authInstance = this.auth;
    if (!this.isConfigured() || !authInstance) {
      return {
        success: false,
        error: 'Firebase Authentication is not configured. Please ensure VITE_FIREBASE_API_KEY is set in your .env file.',
      };
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(authInstance, email.trim(), password);
      const idToken = await userCredential.user.getIdToken();
      return {
        success: true,
        idToken,
        user: userCredential.user,
      };
    } catch (err: any) {
      console.error('[BrandX] Firebase signUpWithEmail error:', err);
      return {
        success: false,
        error: err.message || 'Email registration failed.',
      };
    }
  }

  /**
   * Waits for Firebase Auth to initialize / restore session asynchronously
   */
  async waitForAuthReady(): Promise<User | null> {
    const authInstance = this.auth;
    if (!authInstance) return null;
    if (authInstance.currentUser) return authInstance.currentUser;
    if (typeof (authInstance as any).authStateReady === 'function') {
      try {
        await (authInstance as any).authStateReady();
        return authInstance.currentUser;
      } catch {}
    }
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(authInstance, (user) => {
        unsubscribe();
        resolve(user);
      });
      // Safety timeout after 2500ms
      setTimeout(() => resolve(authInstance?.currentUser || null), 2500);
    });
  }

  /**
   * Get current Firebase ID Token if user is logged in
   */
  async getCurrentIdToken(forceRefresh = false): Promise<string | null> {
    const authInstance = this.auth;
    if (!authInstance) return null;
    let user = authInstance.currentUser;
    if (!user) {
      user = await this.waitForAuthReady();
    }
    if (!user) return null;
    try {
      return await user.getIdToken(forceRefresh);
    } catch {
      return null;
    }
  }

  /**
   * Sign out of Firebase Auth
   */
  async signOut(): Promise<void> {
    this.currentConfirmationResult = null;
    const authInstance = this.auth;
    if (authInstance) {
      try {
        await fbSignOut(authInstance);
      } catch (err) {
        console.warn('[BrandX] Firebase signout error:', err);
      }
    }
  }
}

export const firebaseAuthService = new FirebaseAuthService();
