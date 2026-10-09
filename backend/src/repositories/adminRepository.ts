import { prisma } from '../config/database.js';
import { AdminUser, Prisma } from '@prisma/client';

const appRoleMap = new Map<string, string>();

export function mapRoleToDb(role?: string): string {
  return role || 'ADMIN';
}

export function mapRoleFromDb(row: any): string {
  if (row.id && appRoleMap.has(row.id)) return appRoleMap.get(row.id)!;
  if (row.email && appRoleMap.has(row.email)) return appRoleMap.get(row.email)!;
  if (row.avatarUrl?.startsWith('role:')) {
    return row.avatarUrl.replace('role:', '');
  }
  return row.role;
}

export class AdminRepository {
  async findByEmail(email: string): Promise<AdminUser | null> {
    try {
      const admin = await prisma.adminUser.findUnique({ where: { email } });
      if (admin) {
        return {
          ...admin,
          role: mapRoleFromDb(admin) as any,
        };
      }
    } catch {
      // Fallback
    }

    const rows = (await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, name, email, phone, designation, department, "passwordHash", role, status, "avatarUrl", "lastLogin", "createdAt", "updatedAt"
       FROM "AdminUser" WHERE email = $1 LIMIT 1`,
      email
    ).catch(() => [])) || [];

    if (rows.length > 0) {
      const row = rows[0];
      return {
        ...row,
        role: mapRoleFromDb(row) as any,
        isActive: row.status === 'ACTIVE',
        permissions: [],
        lastLoginAt: row.lastLogin,
        createdBy: null,
      } as AdminUser;
    }
    return null;
  }

  async findById(id: string): Promise<AdminUser | null> {
    try {
      const admin = await prisma.adminUser.findUnique({ where: { id } });
      if (admin) {
        return {
          ...admin,
          role: mapRoleFromDb(admin) as any,
        };
      }
    } catch {
      // Fallback
    }

    const rows = (await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, name, email, phone, designation, department, "passwordHash", role, status, "avatarUrl", "lastLogin", "createdAt", "updatedAt"
       FROM "AdminUser" WHERE id = $1 LIMIT 1`,
      id
    ).catch(() => [])) || [];

    if (rows.length > 0) {
      const row = rows[0];
      return {
        ...row,
        role: mapRoleFromDb(row) as any,
        isActive: row.status === 'ACTIVE',
        permissions: [],
        lastLoginAt: row.lastLogin,
        createdBy: null,
      } as AdminUser;
    }
    return null;
  }

  async create(data: Prisma.AdminUserCreateInput): Promise<AdminUser> {
    const id = data.id || crypto.randomUUID();
    const roleStr = (data.role as string) || 'ADMIN';
    const dbRole = mapRoleToDb(roleStr);
    if (roleStr !== dbRole) {
      appRoleMap.set(id, roleStr);
      appRoleMap.set(data.email, roleStr);
    }
    const avatarUrl = data.avatarUrl || (roleStr !== dbRole ? `role:${roleStr}` : null);

    try {
      const created = await prisma.adminUser.create({
        data: {
          ...data,
          role: dbRole as any,
          avatarUrl: avatarUrl || undefined,
        },
      });
      return {
        ...created,
        role: roleStr as any,
      };
    } catch {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "AdminUser" ("id", "name", "email", "phone", "designation", "department", "passwordHash", "role", "status", "avatarUrl", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, CAST($8 AS "AdminRole"), CAST($9 AS "UserStatus"), $10, NOW(), NOW())`,
        id,
        data.name,
        data.email,
        data.phone || null,
        data.designation || null,
        data.department || null,
        data.passwordHash,
        dbRole,
        (data.status as string) || 'ACTIVE',
        avatarUrl
      );
      return {
        id,
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        designation: data.designation || null,
        department: data.department || null,
        passwordHash: data.passwordHash,
        role: roleStr as any,
        status: data.status || 'ACTIVE',
        isActive: true,
        avatarUrl,
        lastLogin: null,
        lastLoginAt: null,
        createdBy: null,
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as AdminUser;
    }
  }

  async update(id: string, data: Prisma.AdminUserUpdateInput): Promise<AdminUser> {
    try {
      return await prisma.adminUser.update({ where: { id }, data });
    } catch {
      const updates: string[] = ['"updatedAt" = NOW()'];
      const values: any[] = [id];
      let idx = 2;

      if (data.name !== undefined) {
        updates.push(`"name" = $${idx++}`);
        values.push(data.name);
      }
      if (data.email !== undefined) {
        updates.push(`"email" = $${idx++}`);
        values.push(data.email);
      }
      if (data.phone !== undefined) {
        updates.push(`"phone" = $${idx++}`);
        values.push(data.phone);
      }
      if (data.designation !== undefined) {
        updates.push(`"designation" = $${idx++}`);
        values.push(data.designation);
      }
      if (data.department !== undefined) {
        updates.push(`"department" = $${idx++}`);
        values.push(data.department);
      }
      if (data.passwordHash !== undefined) {
        updates.push(`"passwordHash" = $${idx++}`);
        values.push(data.passwordHash);
      }
      if (data.role !== undefined) {
        const roleStr = data.role as string;
        const dbRole = mapRoleToDb(roleStr);
        if (roleStr !== dbRole) {
          appRoleMap.set(id, roleStr);
        }
        updates.push(`"role" = CAST($${idx++} AS "AdminRole")`);
        values.push(dbRole);
      }
      if (data.status !== undefined) {
        updates.push(`"status" = CAST($${idx++} AS "UserStatus")`);
        values.push(data.status);
      }
      if (data.isActive !== undefined) {
        updates.push(`"isActive" = $${idx++}`);
        values.push(data.isActive);
      }
      if (data.avatarUrl !== undefined) {
        updates.push(`"avatarUrl" = $${idx++}`);
        values.push(data.avatarUrl);
      }
      if (data.lastLogin !== undefined) {
        updates.push(`"lastLogin" = $${idx++}`);
        values.push(data.lastLogin);
      }

      await prisma.$executeRawUnsafe(
        `UPDATE "AdminUser" SET ${updates.join(', ')} WHERE id = $1`,
        ...values
      );
      return (await this.findById(id))!;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.adminUser.delete({ where: { id } });
      return true;
    } catch {
      await prisma.$executeRawUnsafe(`DELETE FROM "AdminUser" WHERE id = $1`, id);
      return true;
    }
  }

  async listAdminUsers(): Promise<AdminUser[]> {
    try {
      const users = await prisma.adminUser.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return users.map((u) => ({
        ...u,
        role: mapRoleFromDb(u) as any,
      }));
    } catch {
      const rows = (await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, name, email, phone, designation, department, "passwordHash", role, status, "avatarUrl", "lastLogin", "createdAt", "updatedAt"
         FROM "AdminUser" ORDER BY "createdAt" DESC`
      ).catch(() => [])) || [];
      return rows.map((r) => ({
        ...r,
        role: mapRoleFromDb(r) as any,
        isActive: r.status === 'ACTIVE',
        permissions: [],
        lastLoginAt: r.lastLogin,
        createdBy: null,
      })) as AdminUser[];
    }
  }

  async getExecutiveOverview(): Promise<{
    totalUsers: number;
    newUsersToday: number;
    totalBusinesses: number;
    totalInvoicesGenerated: number;
    invoicesToday: number;
    totalKhataTransactions: number;
    aiRequestsCount: number;
    proSubscribersCount: number;
    activeProCount: number;
    totalRevenueGross: number;
    totalRefunds: number;
    failedPaymentsCount: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const [
        totalUsers,
        newUsersToday,
        totalBusinesses,
        totalInvoicesGenerated,
        invoicesToday,
        totalKhataTransactions,
        aiRequestsCount,
        proSubscribersCount,
        activeProCount,
        payments,
        refunds,
        failedPaymentsCount,
      ] = await Promise.all([
        prisma.user.count().catch(() => 0),
        prisma.user.count({ where: { createdAt: { gte: today } } }).catch(() => 0),
        prisma.business.count().catch(() => 0),
        prisma.invoice.count().catch(() => 0),
        prisma.invoice.count({ where: { createdAt: { gte: today } } }).catch(() => 0),
        prisma.khataTransaction.count().catch(() => 0),
        prisma.aIUsageLog.count().catch(() => 0),
        prisma.subscription.count().catch(() => 0),
        prisma.subscription.count({ where: { status: 'ACTIVE' } }).catch(() => 0),
        prisma.paymentTransaction
          .findMany({
            where: { status: { in: ['SUCCESS', 'CAPTURED'] as any } },
            select: { amount: true },
          })
          .catch(async () => {
            const rows = (await prisma
              .$queryRawUnsafe<any[]>(`SELECT amount FROM "PaymentTransaction" WHERE status IN ('SUCCESS', 'CAPTURED')`)
              .catch(() => [])) || [];
            return rows;
          }),
        prisma.refundRecord
          .findMany({
            where: { status: 'COMPLETED' },
            select: { amount: true },
          })
          .catch(async () => {
            const rows = (await prisma
              .$queryRawUnsafe<any[]>(
                `SELECT amount FROM "RefundRecord" WHERE status = 'COMPLETED' OR status = 'PROCESSED'`
              )
              .catch(() => [])) || [];
            return rows;
          }),
        prisma.paymentTransaction.count({ where: { status: 'FAILED' } }).catch(() => 0),
      ]);

      const totalRevenueGross = (payments as any[]).reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
      const totalRefunds = (refunds as any[]).reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0);

      return {
        totalUsers,
        newUsersToday,
        totalBusinesses,
        totalInvoicesGenerated,
        invoicesToday,
        totalKhataTransactions,
        aiRequestsCount,
        proSubscribersCount,
        activeProCount,
        totalRevenueGross,
        totalRefunds,
        failedPaymentsCount,
      };
    } catch {
      return {
        totalUsers: 0,
        newUsersToday: 0,
        totalBusinesses: 0,
        totalInvoicesGenerated: 0,
        invoicesToday: 0,
        totalKhataTransactions: 0,
        aiRequestsCount: 0,
        proSubscribersCount: 0,
        activeProCount: 0,
        totalRevenueGross: 0,
        totalRefunds: 0,
        failedPaymentsCount: 0,
      };
    }
  }
}

export const adminRepository = new AdminRepository();
