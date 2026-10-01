import rateLimit from 'express-rate-limit';

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests from this IP. Please try again in a few minutes.',
    },
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // Limit sensitive auth actions (login/OTP/register)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT',
      message: 'Too many login attempts. Please wait 15 minutes before trying again.',
    },
  },
});

export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 AI prompts per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'AI_RATE_LIMIT',
      message: 'AI assistant rate limit reached. Please wait a moment.',
    },
  },
});

export const publicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 120, // 120 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'PUBLIC_RATE_LIMIT',
      message: 'Too many requests to this public resource. Please try again later.',
    },
  },
});

export const paymentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 payment operations per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'PAYMENT_RATE_LIMIT',
      message: 'Too many payment requests. Please wait a few minutes before trying again.',
    },
  },
});

export const withdrawalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15, // 15 withdrawal requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'WITHDRAWAL_RATE_LIMIT',
      message: 'Too many withdrawal requests. Please wait a few minutes before trying again.',
    },
  },
});

export const otpRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // Limit OTP requests to 10 per 10 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'OTP_RATE_LIMIT',
      message: 'Too many OTP requests from this network. Please wait a few minutes before trying again.',
    },
  },
});

export const passwordResetRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 password reset attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'PASSWORD_RESET_RATE_LIMIT',
      message: 'Too many password reset requests. Please wait 15 minutes before trying again.',
    },
  },
});

export const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // 150 administrative API operations per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'ADMIN_RATE_LIMIT',
      message: 'Administrative API rate limit reached. Please pause operations momentarily.',
    },
  },
});

export const expensiveOpsRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25, // 25 heavy operations (PDF export, ledger sync, bulk report)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'EXPENSIVE_OPS_RATE_LIMIT',
      message: 'Heavy operation rate limit reached. Please wait before exporting or generating further reports.',
    },
  },
});



