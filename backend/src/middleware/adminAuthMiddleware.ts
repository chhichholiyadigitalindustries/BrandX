import { Request, Response, NextFunction } from 'express';
import { verifyAdminToken, verifyAccessToken } from '../utils/jwt.js';
import { prisma } from '../config/database.js';
import { sendError } from '../utils/response.js';
import { AdminRole } from '@prisma/client';

import { adminRepository } from '../repositories/adminRepository.js';

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Admin authentication required', 401, 'ADMIN_UNAUTHORIZED');
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAdminToken(token);

    const admin = await adminRepository.findById(decoded.adminId);

    if (!admin) {
      sendError(res, 'Admin account not found', 401, 'ADMIN_NOT_FOUND');
      return;
    }

    if (admin.status === 'SUSPENDED' || admin.isActive === false) {
      sendError(res, 'Admin account is suspended or inactive', 403, 'ADMIN_INACTIVE');
      return;
    }

    req.adminUser = admin;
    next();
  } catch (error: any) {
    try {
      const userPayload = verifyAccessToken(token);
      if (userPayload?.userId) {
        sendError(
          res,
          'Access denied. Customer accounts cannot access admin portal APIs.',
          403,
          'FORBIDDEN_ADMIN_ACCESS'
        );
        return;
      }
    } catch {
      // Not a customer token
    }

    sendError(res, 'Invalid or expired admin session', 401, 'ADMIN_TOKEN_INVALID', error?.message);
  }
}

export function requireRoles(allowedRoles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.adminUser) {
      sendError(res, 'Admin authentication required', 401, 'ADMIN_UNAUTHORIZED');
      return;
    }

    // SUPER_ADMIN has full access across all administrative operations
    if (req.adminUser.role === 'SUPER_ADMIN') {
      return next();
    }

    if (!allowedRoles.includes(req.adminUser.role)) {
      sendError(
        res,
        `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]`,
        403,
        'FORBIDDEN_ROLE'
      );
      return;
    }

    next();
  };
}
