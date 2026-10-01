import { prisma } from '../config/database.js';
import { KhataTransaction, PaymentReminder, Prisma } from '@prisma/client';

export class KhataRepository {
  async createTransaction(data: Prisma.KhataTransactionCreateInput): Promise<KhataTransaction> {
    return prisma.khataTransaction.create({
      data,
      include: { customer: true },
    });
  }

  async findTransactionsByCustomer(
    businessId: string,
    customerId: string,
    params?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      skip?: number;
    }
  ): Promise<KhataTransaction[]> {
    const where: Prisma.KhataTransactionWhereInput = {
      businessId,
      customerId,
    };

    if (params?.startDate || params?.endDate) {
      where.transactionDate = {};
      if (params.startDate) where.transactionDate.gte = params.startDate;
      if (params.endDate) where.transactionDate.lte = params.endDate;
    }

    return prisma.khataTransaction.findMany({
      where,
      orderBy: { transactionDate: 'desc' },
      take: params?.limit || 100,
      skip: params?.skip || 0,
    });
  }

  async getKhataSummary(businessId: string): Promise<{
    totalUdharDue: number;
    totalJamaReceived: number;
    activeCustomersCount: number;
    recentTransactionsCount: number;
  }> {
    const [customers, txs] = await Promise.all([
      prisma.customer.findMany({
        where: { businessId, status: 'ACTIVE' },
        select: { currentBalance: true },
      }),
      prisma.khataTransaction.findMany({
        where: { businessId },
        select: { type: true, amount: true },
      }),
    ]);

    let totalUdharDue = 0;
    for (const c of customers) {
      if (c.currentBalance > 0) totalUdharDue += c.currentBalance;
    }

    let totalJamaReceived = 0;
    for (const t of txs) {
      if (t.type === 'RECEIVE_JAMA') totalJamaReceived += t.amount;
    }

    return {
      totalUdharDue: Number(totalUdharDue.toFixed(2)),
      totalJamaReceived: Number(totalJamaReceived.toFixed(2)),
      activeCustomersCount: customers.length,
      recentTransactionsCount: txs.length,
    };
  }

  async findTransactionById(id: string, businessId: string): Promise<KhataTransaction | null> {
    return prisma.khataTransaction.findFirst({
      where: { id, businessId },
      include: { customer: true },
    });
  }

  async updateTransaction(
    id: string,
    businessId: string,
    data: Prisma.KhataTransactionUpdateInput
  ): Promise<KhataTransaction> {
    const existing = await this.findTransactionById(id, businessId);
    if (!existing) {
      throw new Error('Khata transaction not found or unauthorized business access');
    }
    return prisma.khataTransaction.update({
      where: { id },
      data,
      include: { customer: true },
    });
  }

  async deleteTransaction(id: string, businessId: string): Promise<KhataTransaction> {
    const existing = await this.findTransactionById(id, businessId);
    if (!existing) {
      throw new Error('Khata transaction not found or unauthorized business access');
    }
    return prisma.khataTransaction.delete({
      where: { id },
    });
  }

  async createReminder(data: Prisma.PaymentReminderCreateInput): Promise<PaymentReminder> {
    return prisma.paymentReminder.create({ data });
  }

  async listReminders(businessId: string, limit = 20): Promise<PaymentReminder[]> {
    return prisma.paymentReminder.findMany({
      where: { businessId },
      include: { customer: true },
      orderBy: { generatedAt: 'desc' },
      take: limit,
    });
  }
}

export const khataRepository = new KhataRepository();
