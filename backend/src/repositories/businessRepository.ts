import { prisma } from '../config/database.js';
import { Business, BusinessSettings, Prisma } from '@prisma/client';

export class BusinessRepository {
  async findById(id: string): Promise<(Business & { settings?: BusinessSettings | null }) | null> {
    return prisma.business.findUnique({
      where: { id },
      include: { settings: true },
    });
  }

  async findByOwnerId(ownerId: string): Promise<(Business & { settings?: BusinessSettings | null })[]> {
    return prisma.business.findMany({
      where: { ownerId },
      include: { settings: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Prisma.BusinessCreateInput): Promise<Business> {
    return prisma.business.create({
      data,
      include: { settings: true },
    });
  }

  async update(id: string, data: Prisma.BusinessUpdateInput): Promise<Business> {
    return prisma.business.update({
      where: { id },
      data,
      include: { settings: true },
    });
  }

  async delete(id: string): Promise<Business> {
    return prisma.business.delete({
      where: { id },
    });
  }

  async updateSettings(businessId: string, data: Prisma.BusinessSettingsUpdateInput): Promise<BusinessSettings> {
    return prisma.businessSettings.upsert({
      where: { businessId },
      update: data,
      create: {
        businessId,
        ...(data as any),
      },
    });
  }

  async getNextInvoiceNumber(businessId: string): Promise<{ prefix: string; nextNumber: number }> {
    return prisma.$transaction(async (tx) => {
      const biz = await tx.business.findUnique({
        where: { id: businessId },
        select: { invoicePrefix: true, nextInvoiceNumber: true },
      });

      if (!biz) throw new Error('Business not found');

      await tx.business.update({
        where: { id: businessId },
        data: { nextInvoiceNumber: { increment: 1 } },
      });

      return {
        prefix: biz.invoicePrefix,
        nextNumber: biz.nextInvoiceNumber,
      };
    });
  }

  async listAdmin(params: {
    page: number;
    limit: number;
    search?: string;
    city?: string;
  }): Promise<{ businesses: Business[]; total: number }> {
    const { page, limit, search, city } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.BusinessWhereInput = {};

    if (city) where.city = { equals: city, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { ownerName: { contains: search, mode: 'insensitive' } },
        { gstin: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.business.count({ where }),
    ]);

    return { businesses, total };
  }
}

export const businessRepository = new BusinessRepository();
