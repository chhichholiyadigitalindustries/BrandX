import { khataRepository } from '../repositories/khataRepository.js';
import { customerRepository } from '../repositories/customerRepository.js';
import { computeKhataBalance } from '../utils/khataCalculator.js';
import { prisma } from '../config/database.js';
import { KhataTransactionType } from '@prisma/client';

function normalizeTxType(type: string): KhataTransactionType {
  const t = (type || '').toUpperCase();
  if (t === 'GIVE' || t === 'UDHAR' || t === 'UDHAAR' || t === 'GIVE_UDHAR') return 'UDHAAR';
  if (t === 'RECEIVE' || t === 'JAMA' || t === 'RECEIVE_JAMA') return 'JAMA';
  return 'UDHAAR';
}

export class KhataService {
  async addTransaction(businessId: string, userId: string, data: any) {
    const customerId = data.customerId;
    const customer = await customerRepository.findById(customerId, businessId);
    if (!customer) throw new Error('Customer not found in this business');

    const txType = normalizeTxType(data.type);
    const amount = Number(data.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Valid transaction amount greater than 0 is required');
    }

    const description = data.description || data.note || '';

    const result = await prisma.$transaction(async (tx) => {
      const newTx = await tx.khataTransaction.create({
        data: {
          businessId,
          customerId,
          type: txType,
          amount,
          transactionDate: data.transactionDate ? new Date(data.transactionDate) : new Date(),
          billNumber: data.billNumber || null,
          description: description || null,
          note: description || null,
          paymentMode: data.paymentMode || 'CASH',
          reference: data.reference || null,
          attachmentUrl: data.attachmentUrl || null,
          createdById: userId,
        },
      });

      // Recalculate and update current running balance
      const allCustomerTxs = await tx.khataTransaction.findMany({
        where: { customerId, businessId },
        select: { type: true, amount: true },
      });

      const { currentBalance, totalUdhar, totalJama } = computeKhataBalance(customer.openingBalance, allCustomerTxs);

      await tx.customer.update({
        where: { id: customerId },
        data: {
          currentBalance,
          balance: currentBalance,
        },
      });

      return {
        transaction: newTx,
        newBalance: currentBalance,
        totalUdhar,
        totalJama,
      };
    });

    return result;
  }

  async listTransactions(
    businessId: string,
    customerId: string,
    params?: {
      startDate?: string;
      endDate?: string;
      limit?: number;
      skip?: number;
    }
  ) {
    const customer = await customerRepository.findById(customerId, businessId);
    if (!customer) throw new Error('Customer not found in this business');

    const options: any = {};
    if (params?.startDate) options.startDate = new Date(params.startDate);
    if (params?.endDate) options.endDate = new Date(params.endDate);
    if (params?.limit) options.limit = Number(params.limit);
    if (params?.skip) options.skip = Number(params.skip);

    return khataRepository.findTransactionsByCustomer(businessId, customerId, options);
  }

  async getCustomerSummary(businessId: string, customerId: string) {
    const customer = await customerRepository.findById(customerId, businessId);
    if (!customer) throw new Error('Customer not found in this business');

    const transactions = await khataRepository.findTransactionsByCustomer(businessId, customerId);
    const { totalUdhar, totalJama, currentBalance } = computeKhataBalance(
      customer.openingBalance,
      transactions
    );

    const lastTx = transactions.length > 0 ? transactions[0] : null;

    return {
      customerId: customer.id,
      customerName: customer.name,
      mobile: customer.mobile,
      openingBalance: customer.openingBalance,
      totalUdhar,
      totalJama,
      currentBalance,
      transactionCount: transactions.length,
      lastTransactionDate: lastTx ? lastTx.transactionDate : null,
      status: currentBalance > 0 ? 'DUE' : currentBalance === 0 ? 'SETTLED' : 'ADVANCE',
    };
  }

  async getCustomerStatement(businessId: string, customerId: string) {
    const summary = await this.getCustomerSummary(businessId, customerId);
    const transactions = await khataRepository.findTransactionsByCustomer(businessId, customerId);

    return {
      customer: {
        id: summary.customerId,
        name: summary.customerName,
        mobile: summary.mobile,
        openingBalance: summary.openingBalance,
      },
      summary: {
        totalUdhar: summary.totalUdhar,
        totalJama: summary.totalJama,
        currentBalance: summary.currentBalance,
        transactionsCount: summary.transactionCount,
        lastTransactionDate: summary.lastTransactionDate,
      },
      transactions,
    };
  }

  async updateTransaction(id: string, businessId: string, data: any) {
    const existing = await khataRepository.findTransactionById(id, businessId);
    if (!existing) throw new Error('Transaction not found in this business');

    const updateData: any = {};
    if (data.type) updateData.type = normalizeTxType(data.type);
    if (data.amount !== undefined) updateData.amount = Number(data.amount);
    if (data.transactionDate) updateData.transactionDate = new Date(data.transactionDate);
    if (data.description !== undefined || data.note !== undefined) {
      const desc = data.description || data.note || null;
      updateData.description = desc;
      updateData.note = desc;
    }
    if (data.paymentMode !== undefined) updateData.paymentMode = data.paymentMode;
    if (data.billNumber !== undefined) updateData.billNumber = data.billNumber;
    if (data.reference !== undefined) updateData.reference = data.reference;

    const result = await prisma.$transaction(async (tx) => {
      const updatedTx = await tx.khataTransaction.update({
        where: { id },
        data: updateData,
      });

      const customer = await tx.customer.findUnique({ where: { id: existing.customerId } });
      const allCustomerTxs = await tx.khataTransaction.findMany({
        where: { customerId: existing.customerId, businessId },
        select: { type: true, amount: true },
      });

      const { currentBalance } = computeKhataBalance(customer?.openingBalance || 0, allCustomerTxs);

      await tx.customer.update({
        where: { id: existing.customerId },
        data: { currentBalance, balance: currentBalance },
      });

      return { transaction: updatedTx, newBalance: currentBalance };
    });

    return result;
  }

  async deleteTransaction(id: string, businessId: string) {
    const existing = await khataRepository.findTransactionById(id, businessId);
    if (!existing) throw new Error('Transaction not found in this business');

    const result = await prisma.$transaction(async (tx) => {
      await tx.khataTransaction.delete({
        where: { id },
      });

      const customer = await tx.customer.findUnique({ where: { id: existing.customerId } });
      const allCustomerTxs = await tx.khataTransaction.findMany({
        where: { customerId: existing.customerId, businessId },
        select: { type: true, amount: true },
      });

      const { currentBalance } = computeKhataBalance(customer?.openingBalance || 0, allCustomerTxs);

      await tx.customer.update({
        where: { id: existing.customerId },
        data: { currentBalance, balance: currentBalance },
      });

      return { deleted: true, newBalance: currentBalance };
    });

    return result;
  }

  async getSummary(businessId: string) {
    return khataRepository.getKhataSummary(businessId);
  }

  async generatePaymentReminder(businessId: string, customerId: string, customAmount?: number) {
    const [business, customer] = await Promise.all([
      prisma.business.findUnique({
        where: { id: businessId },
        select: { name: true, ownerName: true, upiId: true, mobile: true },
      }),
      customerRepository.findById(customerId, businessId),
    ]);

    if (!business) throw new Error('Business profile not found');
    if (!customer) throw new Error('Customer not found');

    const amountDue = customAmount !== undefined ? customAmount : customer.currentBalance;
    const formattedAmount = `₹${Math.max(0, amountDue).toLocaleString('en-IN')}`;
    const shopName = business.name || 'Apki Dukan';
    const upiId = business.upiId || '';

    const hindiMessage = `Namaste ${customer.name},\n` +
      `Aapke khate mein ${formattedAmount} baki hai.\n` +
      `Kripya payment kar dein.\n\n` +
      `Shop: ${shopName}\n` +
      (upiId ? `UPI: ${upiId}\n\n` : '\n') +
      `Dhanyavaad.`;

    const englishMessage = `Hello ${customer.name},\n` +
      `Your outstanding balance at ${shopName} is ${formattedAmount}.\n` +
      `Kindly settle the pending payment.\n\n` +
      (upiId ? `Pay via UPI: ${upiId}\n\n` : '') +
      `Thank you!`;

    const upiPaymentLink = upiId
      ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shopName)}&am=${Math.max(0, amountDue)}&cu=INR`
      : null;

    return {
      customerId: customer.id,
      customerName: customer.name,
      customerMobile: customer.mobile,
      outstandingAmount: amountDue,
      shopName,
      upiId,
      upiPaymentLink,
      reminderMessage: hindiMessage,
      englishMessage,
      whatsappUrl: `https://wa.me/91${customer.mobile.replace(/\D/g, '')}?text=${encodeURIComponent(hindiMessage)}`,
    };
  }

  async createReminder(businessId: string, data: any) {
    const customer = await customerRepository.findById(data.customerId, businessId);
    if (!customer) throw new Error('Customer not found');

    return khataRepository.createReminder({
      business: { connect: { id: businessId } },
      customer: { connect: { id: data.customerId } },
      amount: data.amount,
      upiId: data.upiId || null,
      reminderMessage: data.reminderMessage,
      channel: data.channel || 'WHATSAPP',
      status: 'SENT',
      sentAt: new Date(),
    });
  }
}

export const khataService = new KhataService();
