import { prisma } from '../config/database.js';
import { Customer, Prisma } from '@prisma/client';

export class CustomerRepository {
  async findById(id: string, businessId: string): Promise<Customer | null> {
    return prisma.customer.findFirst({
      where: { id, businessId },
    });
  }

  async findByMobile(mobile: string, businessId: string): Promise<Customer | null> {
    return prisma.customer.findFirst({
      where: { mobile, businessId },
    });
  }

  async create(data: Prisma.CustomerCreateInput): Promise<Customer> {
    return prisma.customer.create({ data });
  }

  async update(id: string, businessId: string, data: Prisma.CustomerUpdateInput): Promise<Customer> {
    const existing = await prisma.customer.findFirst({ where: { id, businessId } });
    if (!existing) {
      throw new Error('Customer not found or unauthorized business access');
    }
    return prisma.customer.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, businessId: string): Promise<Customer> {
    const existing = await prisma.customer.findFirst({ where: { id, businessId } });
    if (!existing) {
      throw new Error('Customer not found or unauthorized business access');
    }
    return prisma.customer.delete({
      where: { id },
    });
  }

  async list(
    businessId: string,
    params: {
      page: number;
      limit: number;
      search?: string;
      status?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{ customers: Customer[]; total: number }> {
    const { page, limit, search, status, sortBy = 'updatedAt', sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = { businessId };

    if (status && status !== 'all') {
      where.status = status as any;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.CustomerOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          khataTransactions: {
            orderBy: { transactionDate: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    return { customers, total };
  }

  async updateBalance(customerId: string, newBalance: number): Promise<Customer> {
    return prisma.customer.update({
      where: { id: customerId },
      data: { currentBalance: newBalance },
    });
  }
}

export const customerRepository = new CustomerRepository();
