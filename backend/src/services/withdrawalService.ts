/**
 * BRANDX — Withdrawal Management Service
 * Manages withdrawal lifecycle (PENDING -> PROCESSING -> PAID / FAILED),
 * status transitions, and audit records for Super Admins and Accountants.
 */

import { prisma } from '../config/database.js';
import { walletService } from './walletService.js';
import { auditRepository } from '../repositories/auditRepository.js';

export class WithdrawalService {
  /**
   * Admin: List all withdrawal requests with search, status filters, and summary metrics.
   */
  async getAdminWithdrawals(query: { page?: number; limit?: number; status?: string; search?: string }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }
    if (query.search) {
      where.OR = [
        { payoutAccount: { contains: query.search, mode: 'insensitive' } },
        { payoutReference: { contains: query.search, mode: 'insensitive' } },
        { accountHolderName: { contains: query.search, mode: 'insensitive' } },
        { user: { name: { contains: query.search, mode: 'insensitive' } } },
        { user: { mobile: { contains: query.search } } },
      ];
    }

    const [total, items, pendingCount, paidCount, failedCount, paidSum, pendingSum] = await Promise.all([
      prisma.withdrawal.count({ where }),
      prisma.withdrawal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              mobile: true,
              email: true,
            },
          },
        },
      }),
      prisma.withdrawal.count({ where: { status: 'PENDING' } }),
      prisma.withdrawal.count({ where: { status: 'PAID' } }),
      prisma.withdrawal.count({ where: { status: 'FAILED' } }),
      prisma.withdrawal.aggregate({
        where: { status: 'PAID' },
        _sum: { amountInr: true },
      }),
      prisma.withdrawal.aggregate({
        where: { status: 'PENDING' },
        _sum: { amountInr: true },
      }),
    ]);

    return {
      withdrawals: items,
      summary: {
        totalRequests: total,
        totalPendingWithdrawals: pendingCount,
        totalPaidWithdrawals: paidCount,
        totalFailedWithdrawals: failedCount,
        totalPaidInr: paidSum._sum.amountInr || 0,
        totalPendingInr: pendingSum._sum.amountInr || 0,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mark a withdrawal as PROCESSING (Admin).
   */
  async markProcessing(withdrawalId: string, adminId: string) {
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new Error('Withdrawal request not found.');
    }
    if (withdrawal.status !== 'PENDING') {
      throw new Error(`Cannot mark withdrawal in ${withdrawal.status} as PROCESSING.`);
    }

    const updated = await prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: 'PROCESSING',
        processedByAdminId: adminId,
      },
    });

    await auditRepository.log({
      actorId: adminId,
      actorType: 'ADMIN',
      action: 'WITHDRAWAL_PROCESSING',
      entity: 'Withdrawal',
      entityId: withdrawalId,
      metadata: { withdrawalId, previousStatus: 'PENDING', newStatus: 'PROCESSING' },
    });

    return updated;
  }

  /**
   * Mark a withdrawal as PAID after payout provider confirmation.
   */
  async markPaid(withdrawalId: string, payoutReference: string, adminId: string) {
    if (!payoutReference || payoutReference.trim().length < 3) {
      throw new Error('Valid payout reference (e.g. Bank UTR / Transaction ID) is required.');
    }

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new Error('Withdrawal request not found.');
    }
    if (withdrawal.status === 'PAID') {
      throw new Error('Withdrawal is already marked as PAID.');
    }
    if (withdrawal.status === 'FAILED') {
      throw new Error('Cannot mark a failed withdrawal as PAID.');
    }

    const updated = await prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: 'PAID',
        payoutReference: payoutReference.trim(),
        processedAt: new Date(),
        processedByAdminId: adminId,
      },
    });

    // Notify user
    try {
      await prisma.notification.create({
        data: {
          userId: withdrawal.userId,
          title: '🎉 Payout Successful!',
          body: `Your ₹${withdrawal.amountInr} withdrawal has been processed via ${withdrawal.payoutMethod}. Ref: ${payoutReference.trim()}`,
          channel: 'IN_APP',
        },
      });
    } catch {}

    await auditRepository.log({
      actorId: adminId,
      actorType: 'ADMIN',
      action: 'WITHDRAWAL_PAID',
      entity: 'Withdrawal',
      entityId: withdrawalId,
      metadata: {
        withdrawalId,
        amountInr: withdrawal.amountInr,
        payoutReference: payoutReference.trim(),
      },
    });

    return updated;
  }

  /**
   * Mark a withdrawal as FAILED and trigger automatic coin reversal.
   */
  async markFailed(withdrawalId: string, reason: string, adminId: string) {
    if (!reason || reason.trim().length < 3) {
      throw new Error('A failure reason is mandatory when rejecting/failing a withdrawal.');
    }

    const result = await walletService.reverseWithdrawal(withdrawalId, reason.trim(), adminId);

    await auditRepository.log({
      actorId: adminId,
      actorType: 'ADMIN',
      action: 'WITHDRAWAL_FAILED_REVERSED',
      entity: 'Withdrawal',
      entityId: withdrawalId,
      metadata: {
        withdrawalId,
        coinsReturned: result.withdrawal.coins,
        reason: reason.trim(),
      },
    });

    return result;
  }
}

export const withdrawalService = new WithdrawalService();
