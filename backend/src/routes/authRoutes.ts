import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { validateBody } from '../middleware/validateMiddleware.js';
import { authRateLimiter, otpRateLimiter } from '../middleware/rateLimitMiddleware.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  requestOtpSchema,
  verifyOtpSchema,
  firebaseAuthSchema,
} from '../validators/index.js';

const router = Router();

router.use(authRateLimiter);

router.post('/register', validateBody(registerSchema), authController.register);
router.post('/login', validateBody(loginSchema), authController.login);
router.post('/refresh-token', validateBody(refreshTokenSchema), authController.refreshToken);
router.post('/request-otp', otpRateLimiter, validateBody(requestOtpSchema), authController.requestOtp);
router.post('/verify-otp', otpRateLimiter, validateBody(verifyOtpSchema), authController.verifyOtp);
router.post('/firebase', validateBody(firebaseAuthSchema), authController.firebaseAuth);
router.post('/logout', authController.logout);

export default router;
