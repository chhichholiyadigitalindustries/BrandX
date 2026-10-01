import { prisma } from '../config/database.js';
import { Invoice, InvoiceItem, InvoicePayment, DocumentType, InvoiceStatus, Prisma } from '@prisma/client';
import { formatInvoiceNumber } from '../utils/invoiceNumberGenerator.js';

export class InvoiceRepository {
  async findById(
    id: string,
    businessId: string
  ): Promise<(Invoice & { items: InvoiceItem[]; payments: InvoicePayment[]; customer?: any }) | null> {
    return prisma.invoice.findFirst({
      where: { id, businessId },
      include: {
        items: true,
        payments: { orderBy: { paymentDate: 'desc' } },
        customer: true,
      },
    });
  }

  async findByInvoiceNumber(
    invoiceNumber: string,
    businessId: string
  ): Promise<(Invoice & { items: InvoiceItem[] }) | null> {
    return prisma.invoice.findFirst({
      where: { invoiceNumber, businessId },
      include: { items: true },
    });
  }

  async list(
    businessId: string,
    params: {
      page: number;
      limit: number;
      search?: string;
      status?: string;
      documentType?: string;
      paymentStatus?: string;
      customerId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{ invoices: (Invoice & { items: InvoiceItem[]; payments: InvoicePayment[] })[]; total: number }> {
    const { page, limit, search, status, documentType, paymentStatus, customerId, startDate, endDate } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = { businessId };

    if (status && status !== 'all') {
      where.status = status.toUpperCase() as any;
    }

    if (documentType && documentType !== 'all') {
      where.documentType = documentType.toUpperCase() as any;
    }

    if (paymentStatus && paymentStatus !== 'all') {
      where.paymentStatus = paymentStatus.toUpperCase() as any;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = startDate;
      if (endDate) where.invoiceDate.lte = endDate;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { invoiceNumber: { contains: q, mode: 'insensitive' } },
        { buyerName: { contains: q, mode: 'insensitive' } },
        { buyerPhone: { contains: q, mode: 'insensitive' } },
        { buyerGSTIN: { contains: q, mode: 'insensitive' } },
        { buyerGstin: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          items: true,
          payments: { orderBy: { paymentDate: 'desc' } },
        },
        skip,
        take: limit,
        orderBy: { invoiceDate: 'desc' },
      }),
      prisma.invoice.count({ where }),
    ]);

    return { invoices, total };
  }

  /**
   * Concurrency-safe atomic invoice number sequence generation
   */
  async getNextInvoiceNumber(
    tx: Prisma.TransactionClient,
    businessId: string,
    documentType: DocumentType,
    financialYear: string,
    prefix: string
  ): Promise<{ invoiceNumber: string; sequenceNumber: number }> {
    // 1. Find or create the sequence row for this business + docType + FY
    let seq = await tx.invoiceNumberSequence.findUnique({
      where: {
        businessId_documentType_financialYear: {
          businessId,
          documentType,
          financialYear,
        },
      },
    });

    if (!seq) {
      seq = await tx.invoiceNumberSequence.create({
        data: {
          businessId,
          documentType,
          prefix,
          nextNumber: 1,
          financialYear,
        },
      });
    }

    const assignedNumber = seq.nextNumber;

    // 2. Increment sequence atomically for next caller
    await tx.invoiceNumberSequence.update({
      where: { id: seq.id },
      data: { nextNumber: { increment: 1 } },
    });

    const formatted = formatInvoiceNumber(prefix, assignedNumber, financialYear);
    return { invoiceNumber: formatted, sequenceNumber: assignedNumber };
  }

  async create(
    data: Prisma.InvoiceCreateInput,
    tx?: Prisma.TransactionClient
  ): Promise<Invoice & { items: InvoiceItem[] }> {
    const client = tx || prisma;
    return client.invoice.create({
      data,
      include: { items: true },
    });
  }

  async update(
    id: string,
    businessId: string,
    data: Prisma.InvoiceUpdateInput,
    tx?: Prisma.TransactionClient
  ): Promise<Invoice & { items: InvoiceItem[] }> {
    const client = tx || prisma;
    const existing = await client.invoice.findFirst({ where: { id, businessId } });
    if (!existing) {
      throw new Error('Invoice not found or unauthorized business access');
    }
    return client.invoice.update({
      where: { id },
      data,
      include: { items: true },
    });
  }

  async recordPayment(
    invoiceId: string,
    payment: {
      amount: number | Prisma.Decimal;
      paymentMethod?: any;
      referenceNumber?: string | null;
      notes?: string | null;
      paymentDate?: Date;
    },
    tx?: Prisma.TransactionClient
  ): Promise<InvoicePayment> {
    const client = tx || prisma;
    const decimalAmount = payment.amount instanceof Prisma.Decimal
      ? payment.amount
      : new Prisma.Decimal(Number(payment.amount).toFixed(2));

    return client.invoicePayment.create({
      data: {
        invoiceId,
        amount: decimalAmount,
        paymentMethod: payment.paymentMethod || 'UPI',
        referenceNumber: payment.referenceNumber || null,
        transactionRef: payment.referenceNumber || null,
        notes: payment.notes || null,
        note: payment.notes || null,
        paymentDate: payment.paymentDate || new Date(),
      },
    });
  }
}

export const invoiceRepository = new InvoiceRepository();
