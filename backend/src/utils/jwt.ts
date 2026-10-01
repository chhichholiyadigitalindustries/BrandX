import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UserAuthPayload, AdminAuthPayload } from '../types/auth.js';

export function signAccessToken(payload: UserAuthPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.accessExpiresIn as any,
  });
}

export function signRefreshToken(payload: { userId: string; sessionId?: string }): string {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as any,
  });
}

export function verifyAccessToken(token: string): UserAuthPayload {
  return jwt.verify(token, config.jwt.secret) as UserAuthPayload;
}

export function verifyRefreshToken(token: string): { userId: string; sessionId?: string } {
  return jwt.verify(token, config.jwt.refreshSecret) as { userId: string; sessionId?: string };
}

export function signAdminToken(payload: AdminAuthPayload): string {
  return jwt.sign(payload, config.admin.jwtSecret, {
    expiresIn: '24h',
  });
}

export function verifyAdminToken(token: string): AdminAuthPayload {
  return jwt.verify(token, config.admin.jwtSecret) as AdminAuthPayload;
}
