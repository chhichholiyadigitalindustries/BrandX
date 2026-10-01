import { prisma } from '../config/database.js';
import { ProductCategory, Prisma } from '@prisma/client';

export class CategoryRepository {
  async findById(id: string, businessId: string): Promise<ProductCategory | null> {
    return prisma.productCategory.findFirst({
      where: { id, businessId },
      include: {
        _count: { select: { products: true } },
      },
    });
  }

  async findByName(name: string, businessId: string): Promise<ProductCategory | null> {
    return prisma.productCategory.findFirst({
      where: {
        businessId,
        name: { equals: name, mode: 'insensitive' },
      },
    });
  }

  async create(data: Prisma.ProductCategoryCreateInput): Promise<ProductCategory> {
    return prisma.productCategory.create({ data });
  }

  async update(id: string, businessId: string, data: Prisma.ProductCategoryUpdateInput): Promise<ProductCategory> {
    const existing = await this.findById(id, businessId);
    if (!existing) {
      throw new Error('Product category not found or unauthorized business access');
    }
    return prisma.productCategory.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, businessId: string): Promise<ProductCategory> {
    const existing = await this.findById(id, businessId);
    if (!existing) {
      throw new Error('Product category not found or unauthorized business access');
    }
    return prisma.productCategory.delete({
      where: { id },
    });
  }

  async list(
    businessId: string,
    params?: {
      search?: string;
      isActive?: boolean;
    }
  ): Promise<ProductCategory[]> {
    const where: Prisma.ProductCategoryWhereInput = { businessId };

    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    if (params?.search) {
      where.name = { contains: params.search, mode: 'insensitive' };
    }

    return prisma.productCategory.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { products: true } },
      },
    });
  }
}

export const categoryRepository = new CategoryRepository();
