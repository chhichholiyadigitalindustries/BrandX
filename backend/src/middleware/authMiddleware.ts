/**
 * BRANDX — Authentication Middleware (Dual-Auth: BrandX JWT & Firebase ID Token)
 */
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { verifyFirebaseIdToken } from '../config/firebaseAdmin.js';
import { prisma } from '../config/database.js';
import { sendError } from '../utils/response.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Authentication token required', 401, 'UNAUTHORIZED');
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    sendError(res, 'Authentication token required', 401, 'UNAUTHORIZED');
    return;
  }

  let user: any = null;

  // 1. Attempt BrandX native JWT verification
  try {
    const decodedJwt = verifyAccessToken(token);
    user = await prisma.user.findUnique({
      where: { id: decodedJwt.userId },
      select: {
        id: true,
        mobile: true,
        email: true,
        name: true,
        isPro: true,
        status: true,
      },
    });
  } catch (jwtErr) {
    // 2. If not a valid BrandX JWT, attempt Firebase ID Token verification
    try {
      const decodedFirebase = await verifyFirebaseIdToken(token);
      if (decodedFirebase.uid) {
        user = await (prisma.user as any).findUnique({
          where: { firebaseUid: decodedFirebase.uid },
          select: {
            id: true,
            mobile: true,
            email: true,
            name: true,
            isPro: true,
            status: true,
          },
        });

        // If not found by firebaseUid, try matching by email or phone
        if (!user && decodedFirebase.email) {
          user = await prisma.user.findUnique({
            where: { email: decodedFirebase.email.toLowerCase() },
            select: {
              id: true,
              mobile: true,
              email: true,
              name: true,
              isPro: true,
              status: true,
            },
          });
        }
      }
    } catch {
      // Both verifications failed
    }
  }

  if (!user) {
    sendError(res, 'Invalid or expired authentication token', 401, 'TOKEN_EXPIRED');
    return;
  }

  if (user.status === 'SUSPENDED') {
    sendError(res, 'Your account has been suspended. Please contact BrandX support.', 403, 'ACCOUNT_SUSPENDED');
    return;
  }

  req.user = user;
  next();
}
