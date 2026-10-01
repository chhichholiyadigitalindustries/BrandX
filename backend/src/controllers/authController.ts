import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { config } from '../config/index.js';
import { otpSecurityService } from '../services/otpSecurityService.js';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body, req.ip, req.headers['user-agent']);
      sendSuccess(res, result, 'Registration successful', 201);
    } catch (error: any) {
      sendError(res, error.message, 400, 'REGISTRATION_FAILED');
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { identifier, password } = req.body;
      const result = await authService.login(identifier, password, req.ip, req.headers['user-agent']);
      sendSuccess(res, result, 'Login successful');
    } catch (error: any) {
      sendError(res, error.message, 401, 'LOGIN_FAILED');
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);
      sendSuccess(res, result, 'Token refreshed successfully');
    } catch (error: any) {
      sendError(res, error.message, 401, 'REFRESH_TOKEN_INVALID');
    }
  }

  async requestOtp(req: Request, res: Response): Promise<void> {
    if (config.isProduction) {
      sendError(
        res,
        'Direct OTP simulation is disabled in production. Use Firebase Phone Authentication via /auth/firebase.',
        403,
        'OTP_SIMULATION_DISABLED'
      );
      return;
    }
    const { mobile } = req.body;

    // Layer 1 Security: check cooldown and account lockout
    const canRequest = otpSecurityService.canRequestOtp(mobile, req.ip);
    if (!canRequest.allowed) {
      sendError(res, canRequest.reason || 'OTP request rate limited', 429, 'OTP_RATE_LIMITED');
      return;
    }

    otpSecurityService.recordOtpRequest(mobile, req.ip);
    sendSuccess(res, { mobile, sent: true }, 'OTP sent to mobile number');
  }

  async verifyOtp(req: Request, res: Response): Promise<void> {
    if (config.isProduction) {
      sendError(
        res,
        'Direct OTP simulation is disabled in production. Use Firebase Phone Authentication via /auth/firebase.',
        403,
        'OTP_SIMULATION_DISABLED'
      );
      return;
    }
    const { mobile, otp } = req.body;

    // Layer 1 Security: check account lockout
    const lockCheck = otpSecurityService.isLocked(mobile);
    if (lockCheck.locked) {
      sendError(
        res,
        `Account temporarily locked due to repeated verification failures. Please wait ${lockCheck.remainingSeconds} seconds.`,
        429,
        'ACCOUNT_LOCKED_TEMPORARILY'
      );
      return;
    }

    // Verify OTP code (1234 or 123456 in dev/test environment)
    if (otp !== '1234' && otp !== '123456') {
      const failStatus = otpSecurityService.recordFailedAttempt(mobile);
      if (failStatus.locked) {
        sendError(
          res,
          `Too many failed attempts. Account locked for 15 minutes.`,
          429,
          'ACCOUNT_LOCKED_TEMPORARILY'
        );
        return;
      }
      sendError(
        res,
        `Invalid OTP entered. ${failStatus.remainingAttempts} attempts remaining.`,
        400,
        'INVALID_OTP'
      );
      return;
    }

    // Clear failed attempts upon successful verification
    otpSecurityService.recordSuccessfulVerification(mobile);

    // Handle OTP verification with automatic login in dev/test
    try {
      const result = await authService.login(mobile, undefined, req.ip, req.headers['user-agent']);
      sendSuccess(res, result, 'OTP verified successfully');
    } catch {
      // If user doesn't exist yet, return registration token
      sendSuccess(
        res,
        {
          isNewUser: true,
          mobile,
        },
        'OTP verified. Please complete shop registration.'
      );
    }
  }

  /**
   * POST /api/v1/auth/firebase
   * Authenticate with Firebase ID Token from Phone OTP or Email/Password
   */
  async firebaseAuth(req: Request, res: Response): Promise<void> {
    try {
      // Token can be passed in Authorization header or in request body
      let token = req.body?.idToken;
      const authHeader = req.headers.authorization;
      if (!token && authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }

      if (!token) {
        sendError(res, 'Firebase ID token is required', 400, 'TOKEN_MISSING');
        return;
      }

      const { businessName, businessCategory, name, mobile, email, phoneVerified, emailVerified, referralCode } = req.body || {};
      const result = await authService.authenticateWithFirebase(
        token,
        { businessName, category: businessCategory, name, mobile, email, phoneVerified, emailVerified, referralCode },
        req.ip,
        req.headers['user-agent']
      );

      sendSuccess(
        res,
        result,
        result.isNewUser ? 'Firebase registration successful' : 'Firebase login successful',
        result.isNewUser ? 201 : 200
      );
    } catch (error: any) {
      const isConflict = error.message && error.message.includes('ACCOUNT_CONFLICT');
      const statusCode = isConflict ? 409 : 401;
      const errorCode = isConflict ? 'ACCOUNT_CONFLICT' : 'FIREBASE_AUTH_FAILED';
      sendError(res, error.message, statusCode, errorCode);
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body || {};
      const userId = (req as any).user?.userId;
      const result = await authService.logout(refreshToken, userId);
      sendSuccess(res, result, 'Logged out successfully');
    } catch (error: any) {
      sendError(res, error.message, 400, 'LOGOUT_FAILED');
    }
  }
}

export const authController = new AuthController();
