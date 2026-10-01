import { AdminRole, UserStatus } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        mobile: string;
        email?: string | null;
        name: string;
        isPro: boolean;
        status: UserStatus;
      };
      adminUser?: {
        id: string;
        email: string;
        name: string;
        role: AdminRole;
        status: UserStatus;
        phone?: string | null;
        avatarUrl?: string | null;
        permissions?: string[];
      };
      businessId?: string;
    }
  }
}

export {};
