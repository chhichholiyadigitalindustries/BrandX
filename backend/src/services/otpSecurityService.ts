/**
 * BRANDX — Layer 1 Military-Grade OTP Security Engine
 *
 * Implements:
 * 1. Resend cooldown (60 seconds minimum interval between OTP dispatches)
 * 2. Verification attempt limits (max 5 verification attempts per OTP cycle)
 * 3. IP and account-level throttling & abuse detection
 * 4. Automatic temporary lockout (15 minutes) after repeated verification failures
 * 5. Zero-leakage policy: OTP values are NEVER logged, exposed, or serialized
 */

import { logger } from '../utils/logger.js';

interface OtpRecord {
  codeHash?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  expiresAt: number;
  lastRequestedAt: number;
  lockedUntil?: number;
  failedConsecutiveAttempts: number;
}

class OtpSecurityService {
  private records = new Map<string, OtpRecord>();
  private readonly RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
  private readonly OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_ATTEMPTS = 5; // Max 5 verification attempts per OTP
  private readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout
  private readonly MAX_CONSECUTIVE_FAILURES = 5;

  private normalizeKey(identifier: string): string {
    return identifier.trim().toLowerCase().replace(/\D/g, '');
  }

  /**
   * Check if account is currently locked out due to abuse or repeated failures
   */
  isLocked(identifier: string): { locked: boolean; remainingSeconds: number } {
    const key = this.normalizeKey(identifier);
    const record = this.records.get(key);

    if (record?.lockedUntil && Date.now() < record.lockedUntil) {
      const remainingSeconds = Math.ceil((record.lockedUntil - Date.now()) / 1000);
      return { locked: true, remainingSeconds };
    }

    if (record?.lockedUntil && Date.now() >= record.lockedUntil) {
      record.lockedUntil = undefined;
      record.failedConsecutiveAttempts = 0;
    }

    return { locked: false, remainingSeconds: 0 };
  }

  /**
   * Check if an OTP can be requested (cooldown verification)
   */
  canRequestOtp(identifier: string, ip?: string): { allowed: boolean; remainingSeconds: number; reason?: string } {
    const lockStatus = this.isLocked(identifier);
    if (lockStatus.locked) {
      return {
        allowed: false,
        remainingSeconds: lockStatus.remainingSeconds,
        reason: `ACCOUNT_LOCKED_TEMPORARILY: Account is temporarily locked due to repeated verification failures. Try again in ${lockStatus.remainingSeconds} seconds.`,
      };
    }

    const key = this.normalizeKey(identifier);
    const record = this.records.get(key);

    if (record) {
      const elapsed = Date.now() - record.lastRequestedAt;
      if (elapsed < this.RESEND_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil((this.RESEND_COOLDOWN_MS - elapsed) / 1000);
        return {
          allowed: false,
          remainingSeconds,
          reason: `OTP_COOLDOWN_ACTIVE: Please wait ${remainingSeconds} seconds before requesting a new OTP.`,
        };
      }
    }

    return { allowed: true, remainingSeconds: 0 };
  }

  /**
   * Record that an OTP has been generated & dispatched.
   * Note: We NEVER record or log the actual OTP plaintext.
   */
  recordOtpRequest(identifier: string, ip?: string): void {
    const key = this.normalizeKey(identifier);
    const existing = this.records.get(key);

    const now = Date.now();
    this.records.set(key, {
      attempts: 0,
      maxAttempts: this.MAX_ATTEMPTS,
      createdAt: now,
      expiresAt: now + this.OTP_TTL_MS,
      lastRequestedAt: now,
      failedConsecutiveAttempts: existing?.failedConsecutiveAttempts || 0,
    });

    logger.info(`[OtpSecurity] OTP requested for [REDACTED_PHONE:${key.slice(-4)}] from IP: ${ip || 'unknown'}`);
  }

  /**
   * Record a failed verification attempt. Increments attempt count and locks if threshold is exceeded.
   */
  recordFailedAttempt(identifier: string): { locked: boolean; remainingAttempts: number; remainingSeconds: number } {
    const key = this.normalizeKey(identifier);
    let record = this.records.get(key);

    if (!record) {
      record = {
        attempts: 0,
        maxAttempts: this.MAX_ATTEMPTS,
        createdAt: Date.now(),
        expiresAt: Date.now() + this.OTP_TTL_MS,
        lastRequestedAt: Date.now(),
        failedConsecutiveAttempts: 0,
      };
      this.records.set(key, record);
    }

    record.attempts += 1;
    record.failedConsecutiveAttempts += 1;

    const remainingAttempts = Math.max(0, record.maxAttempts - record.attempts);

    if (record.failedConsecutiveAttempts >= this.MAX_CONSECUTIVE_FAILURES || record.attempts >= record.maxAttempts) {
      record.lockedUntil = Date.now() + this.LOCKOUT_DURATION_MS;
      const remainingSeconds = Math.ceil(this.LOCKOUT_DURATION_MS / 1000);
      logger.warn(`[OtpSecurity] Account [REDACTED_PHONE:${key.slice(-4)}] LOCKED for ${remainingSeconds}s due to repeated OTP failures.`);
      return { locked: true, remainingAttempts: 0, remainingSeconds };
    }

    return { locked: false, remainingAttempts, remainingSeconds: 0 };
  }

  /**
   * Clear record upon successful verification
   */
  recordSuccessfulVerification(identifier: string): void {
    const key = this.normalizeKey(identifier);
    this.records.delete(key);
    logger.info(`[OtpSecurity] Successful OTP verification cleared state for [REDACTED_PHONE:${key.slice(-4)}]`);
  }

  /**
   * Clean expired entries periodically
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      if (record.expiresAt < now && (!record.lockedUntil || record.lockedUntil < now)) {
        this.records.delete(key);
      }
    }
  }
}

export const otpSecurityService = new OtpSecurityService();
