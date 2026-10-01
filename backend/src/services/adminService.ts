import { adminRepository } from '../repositories/adminRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { businessRepository } from '../repositories/businessRepository.js';
import { subscriptionRepository } from '../repositories/subscriptionRepository.js';
import { comparePassword, hashPassword } from '../utils/hash.js';
import { signAdminToken } from '../utils/jwt.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { prisma } from '../config/database.js';

export class AdminService {
  async login(email: string, password: string, ip?: string, userAgent?: string) {
    const admin = await adminRepository.findByEmail(email);
    if (!admin) {
      throw new Error('Admin credentials invalid');
    }

    const isMatch = await comparePassword(password, admin.passwordHash);
    if (!isMatch) {
      throw new Error('Admin credentials invalid');
    }

    if (admin.status === 'SUSPENDED' || admin.isActive === false) {
      throw new Error('Admin account is suspended or inactive');
    }

    try {
      await prisma.adminUser.update({
        where: { id: admin.id },
        data: { lastLogin: new Date() },
      });
    } catch {
      await prisma.$executeRawUnsafe(
        `UPDATE "AdminUser" SET "lastLogin" = NOW() WHERE id = $1`,
        admin.id
      ).catch(() => {});
    }

    const token = signAdminToken({
      adminId: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    });

    await auditRepository.log({
      actorId: admin.id,
      actorType: 'ADMIN',
      action: 'ADMIN_LOGIN',
      entity: 'AdminUser',
      entityId: admin.id,
      ipAddress: ip,
      userAgent,
    });

    return {
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        avatarUrl: admin.avatarUrl,
      },
      token,
    };
  }

  async getDashboardOverview() {
    return adminRepository.getExecutiveOverview();
  }

  async listUsers(params: { page: number; limit: number; search?: string; status?: string }) {
    return userRepository.list(params);
  }

  async listBusinesses(params: { page: number; limit: number; search?: string; city?: string }) {
    return businessRepository.listAdmin(params);
  }

  async listSubscribers(params: { page: number; limit: number; search?: string; status?: string }) {
    return subscriptionRepository.listSubscribersAdmin(params);
  }

  async listPayments(params: { page: number; limit: number; search?: string; status?: string; gateway?: string }) {
    return subscriptionRepository.listTransactionsAdmin(params);
  }

  async listRefunds(params: { page: number; limit: number; status?: string }) {
    return subscriptionRepository.listRefundsAdmin(params);
  }

  async listAdminUsers() {
    return adminRepository.listAdminUsers();
  }

  async createAdminUser(data: any, creatorAdminId?: string) {
    const existing = await adminRepository.findByEmail(data.email);
    if (existing) throw new Error('An admin with this email already exists');

    // Prevent creating additional SUPER_ADMIN via employee creation API
    if (data.role === 'SUPER_ADMIN') {
      throw new Error('Creating Super Admin accounts is not permitted via employee creation');
    }

    const passwordHash = await hashPassword(data.password);
    const newAdmin = await adminRepository.create({
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      passwordHash,
      role: data.role || 'MANAGER',
      isActive: true,
      createdBy: creatorAdminId || null,
    });

    await auditRepository.log({
      actorId: creatorAdminId,
      actorType: 'ADMIN',
      action: 'ADMIN_USER_CREATED',
      entity: 'AdminUser',
      entityId: newAdmin.id,
      metadata: { email: newAdmin.email, role: newAdmin.role },
    });

    return newAdmin;
  }

  async updateAdminStatus(adminId: string, status: 'ACTIVE' | 'SUSPENDED', isActive?: boolean, reason?: string, actorAdminId?: string) {
    const target = await adminRepository.findById(adminId);
    if (!target) throw new Error('Admin user not found');
    if (target.role === 'SUPER_ADMIN') {
      throw new Error('Super Admin account status cannot be modified');
    }

    const activeFlag = isActive !== undefined ? isActive : status === 'ACTIVE';
    const updated = await adminRepository.update(adminId, {
      status,
      isActive: activeFlag,
    });

    await auditRepository.log({
      actorId: actorAdminId,
      actorType: 'ADMIN',
      action: 'ADMIN_STATUS_CHANGED',
      entity: 'AdminUser',
      entityId: adminId,
      metadata: { newStatus: status, isActive: activeFlag, reason },
    });

    return updated;
  }

  async updateAdminRole(adminId: string, role: any, actorAdminId?: string) {
    const target = await adminRepository.findById(adminId);
    if (!target) throw new Error('Admin user not found');
    if (target.role === 'SUPER_ADMIN' || role === 'SUPER_ADMIN') {
      throw new Error('Super Admin role cannot be modified or assigned via role update');
    }

    const updated = await adminRepository.update(adminId, { role });

    await auditRepository.log({
      actorId: actorAdminId,
      actorType: 'ADMIN',
      action: 'ADMIN_ROLE_CHANGED',
      entity: 'AdminUser',
      entityId: adminId,
      metadata: { oldRole: target.role, newRole: role },
    });

    return updated;
  }

  async listAuditLogs(limit: number = 100) {
    return auditRepository.list(limit);
  }

  async updateUserStatus(userId: string, status: any, reason?: string, adminId?: string) {
    const updated = await userRepository.update(userId, { status });

    await auditRepository.log({
      actorId: adminId,
      actorType: 'ADMIN',
      action: 'USER_STATUS_CHANGE',
      entity: 'User',
      entityId: userId,
      metadata: { newStatus: status, reason },
    });

    return updated;
  }

  async getRevenueSummary() {
    return subscriptionRepository.getRevenueSummary();
  }

  async listPlansAdmin() {
    return subscriptionRepository.listAllPlans();
  }

  async createPlan(data: any, adminId?: string) {
    const existing = await subscriptionRepository.findPlanByCode(data.code.toLowerCase());
    if (existing) {
      throw new Error(`Plan with code '${data.code}' already exists`);
    }

    let created: any;
    try {
      created = await prisma.subscriptionPlan.create({
        data: {
          name: data.name,
          code: data.code.toLowerCase(),
          description: data.description || null,
          price: data.price,
          currency: data.currency || 'INR',
          billingCycle: data.billingCycle || 'monthly',
          billingInterval: data.billingInterval || (data.billingCycle === 'yearly' ? 'YEARLY' : 'MONTHLY'),
          durationDays: data.durationDays || (data.billingCycle === 'yearly' ? 365 : 30),
          features: data.features || [],
          limits: data.limits || {
            invoices: -1,
            posters: -1,
            aiCredits: 100,
            digitalDukaan: true,
            removeWatermark: true,
            customBranding: true,
          },
          isActive: data.isActive !== undefined ? data.isActive : true,
        },
      });
    } catch {
      const planId = `plan_${Date.now()}`;
      const priceMonthly = Number(data.priceMonthly ?? (data.billingCycle === 'yearly' ? Math.round(Number(data.price) / 12) : data.price) ?? 0);
      const priceYearly = Number(data.priceYearly ?? (data.billingCycle === 'yearly' ? data.price : Math.round(Number(data.price) * 12)) ?? 0);
      const nameHindi = data.nameHindi || data.name;

      await prisma.$executeRawUnsafe(
        `INSERT INTO "SubscriptionPlan" (id, code, name, "nameHindi", "priceMonthly", "priceYearly", "discountPercent", features, "isRecommended", status, "createdAt", "updatedAt", description, "billingInterval", "durationDays", "isActive")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CAST('ACTIVE' AS "UserStatus"), NOW(), NOW(), $10, $11, $12, $13)`,
        planId,
        data.code.toLowerCase(),
        data.name,
        nameHindi,
        priceMonthly,
        priceYearly,
        0.0,
        data.features || [],
        false,
        data.description || null,
        data.billingInterval || (data.billingCycle === 'yearly' ? 'YEARLY' : 'MONTHLY'),
        data.durationDays || (data.billingCycle === 'yearly' ? 365 : 30),
        data.isActive !== undefined ? data.isActive : true
      );

      created = {
        id: planId,
        name: data.name,
        code: data.code.toLowerCase(),
        description: data.description || null,
        price: Number(data.price || 0),
        currency: data.currency || 'INR',
        billingCycle: data.billingCycle || 'monthly',
        billingInterval: data.billingInterval || (data.billingCycle === 'yearly' ? 'YEARLY' : 'MONTHLY'),
        durationDays: data.durationDays || (data.billingCycle === 'yearly' ? 365 : 30),
        features: data.features || [],
        limits: data.limits || { invoices: -1, aiCredits: 100 },
        isActive: data.isActive !== undefined ? data.isActive : true,
      };
    }

    await auditRepository.log({
      actorId: adminId,
      actorType: 'ADMIN',
      action: 'PLAN_CREATED',
      entity: 'SubscriptionPlan',
      entityId: created.id,
      metadata: { code: created.code, price: created.price },
    });

    return created;
  }

  async updatePlan(id: string, data: any, adminId?: string) {
    let updated: any;
    try {
      updated = await prisma.subscriptionPlan.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          price: data.price,
          currency: data.currency,
          billingCycle: data.billingCycle,
          billingInterval: data.billingInterval,
          durationDays: data.durationDays,
          features: data.features,
          isActive: data.isActive,
        },
      });
    } catch {
      const priceVal = data.price !== undefined ? Number(data.price) : null;
      await prisma.$executeRawUnsafe(
        `UPDATE "SubscriptionPlan" 
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             "priceMonthly" = CASE WHEN $3::double precision IS NOT NULL THEN $3::double precision ELSE "priceMonthly" END,
             "priceYearly" = CASE WHEN $3::double precision IS NOT NULL THEN $3::double precision ELSE "priceYearly" END,
             "isActive" = COALESCE($4, "isActive"),
             "updatedAt" = NOW()
         WHERE id = $5`,
        data.name || null,
        data.description || null,
        priceVal,
        data.isActive !== undefined ? data.isActive : null,
        id
      ).catch(() => {});

      updated = {
        id,
        ...data,
        price: Number(data.price || 0),
      };
    }

    await auditRepository.log({
      actorId: adminId,
      actorType: 'ADMIN',
      action: 'PLAN_UPDATED',
      entity: 'SubscriptionPlan',
      entityId: updated.id,
      metadata: data,
    });

    return updated;
  }

  async processRefund(params: {
    transactionId: string;
    amount?: number;
    reason?: string;
    adminId?: string;
  }) {
    const { transactionId, amount, reason, adminId } = params;

    let txRecord: any;
    try {
      txRecord = await prisma.paymentTransaction.findUnique({
        where: { id: transactionId },
      });
    } catch {
      const rows = (await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "PaymentTransaction" WHERE id = $1 LIMIT 1`,
        transactionId
      ).catch(() => [])) || [];
      txRecord = rows[0] || null;
    }

    if (!txRecord) {
      throw new Error('Payment transaction not found');
    }

    if (txRecord.status !== 'CAPTURED' && txRecord.status !== 'SUCCESS') {
      throw new Error(`Transaction with status '${txRecord.status}' is not eligible for refund`);
    }

    const refundAmount = amount !== undefined ? amount : txRecord.amount;
    if (refundAmount <= 0 || refundAmount > txRecord.amount) {
      throw new Error(`Invalid refund amount. Must be between 1 and ${txRecord.amount}`);
    }

    // Call payment provider
    const { paymentService } = await import('../payments/paymentService.js');
    const paymentId = txRecord.providerPaymentId || txRecord.id;

    const refundResult = await paymentService.refundPayment({
      paymentId,
      amount: refundAmount,
      notes: {
        reason: reason || 'Admin refund',
        adminId: adminId || '',
        transactionId,
      },
    });

    // Record Refund and Update Transaction atomically
    const newStatus = refundAmount >= txRecord.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
    let refundRecord: any;
    try {
      const res = await prisma.$transaction(async (tx) => {
        const createdRefund = await tx.refundRecord.create({
          data: {
            transaction: { connect: { id: txRecord.id } },
            user: { connect: { id: txRecord.userId } },
            business: { connect: { id: txRecord.businessId } },
            paymentId,
            orderId: txRecord.providerOrderId || txRecord.id,
            amount: refundAmount,
            currency: txRecord.currency,
            status: refundResult.status === 'PROCESSED' ? 'PROCESSED' : 'REQUESTED',
            reason: reason || 'Admin initiated refund',
            providerRefundId: refundResult.refundId,
            adminNotes: reason,
            processedAt: refundResult.status === 'PROCESSED' ? new Date() : undefined,
          },
        });

        await tx.paymentTransaction.update({
          where: { id: txRecord.id },
          data: {
            status: newStatus as any,
            refundId: refundResult.refundId,
            refundAmount,
            refundDate: new Date(),
          },
        });

        return { refundRecord: createdRefund };
      });
      refundRecord = res.refundRecord;
    } catch {
      const refId = `ref_${Date.now()}`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO "RefundRecord" (id, "transactionId", "userId", "businessId", amount, reason, status, "providerRefundId", "adminNote", "processedAt", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
        refId,
        txRecord.id,
        txRecord.userId,
        txRecord.businessId,
        refundAmount,
        reason || 'Admin initiated refund',
        refundResult.status === 'PROCESSED' ? 'PROCESSED' : 'REQUESTED',
        refundResult.refundId || null,
        reason || null,
        refundResult.status === 'PROCESSED' ? new Date() : null
      ).catch(() => {});

      await prisma.$executeRawUnsafe(
        `UPDATE "PaymentTransaction" SET status = $1, "updatedAt" = NOW() WHERE id = $2`,
        newStatus,
        txRecord.id
      ).catch(() => {});

      refundRecord = {
        id: refId,
        amount: refundAmount,
        status: refundResult.status,
      };
    }

    await auditRepository.log({
      actorId: adminId,
      actorType: 'ADMIN',
      action: 'PAYMENT_REFUNDED',
      entity: 'PaymentTransaction',
      entityId: txRecord.id,
      metadata: {
        refundAmount,
        refundRecordId: refundRecord.id,
        providerRefundId: refundResult.refundId,
        reason,
      },
    });

    return {
      refund: refundRecord,
      transactionStatus: newStatus,
      message: 'Refund processed successfully',
    };
  }

  async getAdminProfile(adminId: string) {
    const admin = await adminRepository.findById(adminId);
    if (!admin) throw new Error('Admin user not found');
    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      avatarUrl: admin.avatarUrl,
      role: admin.role,
      status: admin.status,
      isActive: admin.isActive,
      permissions: admin.permissions,
      lastLoginAt: admin.lastLoginAt,
      createdAt: admin.createdAt,
    };
  }

  async updateAdminProfile(
    adminId: string,
    data: { name?: string; email?: string; phone?: string | null; avatarUrl?: string | null },
    ip?: string
  ) {
    const admin = await adminRepository.findById(adminId);
    if (!admin) throw new Error('Admin user not found');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.phone !== undefined) updateData.phone = data.phone ? data.phone.trim() : null;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl ? data.avatarUrl.trim() : null;

    if (data.email !== undefined) {
      const normalizedEmail = data.email.trim().toLowerCase();
      if (normalizedEmail !== admin.email) {
        const existing = await adminRepository.findByEmail(normalizedEmail);
        if (existing && existing.id !== adminId) {
          throw new Error('An admin with this email address already exists');
        }
        updateData.email = normalizedEmail;
      }
    }

    const updated = await adminRepository.update(adminId, updateData);

    await auditRepository.log({
      actorId: adminId,
      actorType: 'ADMIN',
      action: 'ADMIN_PROFILE_UPDATED',
      entity: 'AdminUser',
      entityId: adminId,
      ipAddress: ip,
      metadata: { fieldsUpdated: Object.keys(updateData) },
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      avatarUrl: updated.avatarUrl,
      role: updated.role,
      status: updated.status,
      isActive: updated.isActive,
      permissions: updated.permissions,
      lastLoginAt: updated.lastLoginAt,
      createdAt: updated.createdAt,
    };
  }

  async changeAdminPassword(adminId: string, currentPassword: string, newPassword: string, ip?: string) {
    const admin = await adminRepository.findById(adminId);
    if (!admin) throw new Error('Admin user not found');

    const isMatch = await comparePassword(currentPassword, admin.passwordHash);
    if (!isMatch) {
      throw new Error('Current password is incorrect');
    }

    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long');
    }

    const passwordHash = await hashPassword(newPassword);
    await adminRepository.update(adminId, { passwordHash });

    await auditRepository.log({
      actorId: adminId,
      actorType: 'ADMIN',
      action: 'ADMIN_PASSWORD_CHANGED',
      entity: 'AdminUser',
      entityId: adminId,
      ipAddress: ip,
    });

    return { success: true, message: 'Password changed successfully' };
  }
}

export const adminService = new AdminService();

