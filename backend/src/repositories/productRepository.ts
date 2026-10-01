import { prisma } from '../config/database.js';
import { Product, InventoryTransaction, Prisma } from '@prisma/client';

export class ProductRepository {
  async findById(id: string, businessId: string): Promise<Product | null> {
    return prisma.product.findFirst({
      where: { id, businessId },
      include: {
        productCategory: true,
        _count: {
          select: {
            inventoryTransactions: true,
            invoiceItems: true,
            digitalStoreItems: true,
          },
        },
      },
    });
  }

  async findBySku(sku: string, businessId: string): Promise<Product | null> {
    return prisma.product.findFirst({
      where: {
        businessId,
        sku: { equals: sku, mode: 'insensitive' },
      },
    });
  }

  async findByBarcode(barcode: string, businessId: string): Promise<Product | null> {
    return prisma.product.findFirst({
      where: {
        businessId,
        barcode: { equals: barcode, mode: 'insensitive' },
      },
    });
  }

  async findByItemCode(itemCode: string, businessId: string): Promise<Product | null> {
    return prisma.product.findFirst({
      where: {
        businessId,
        itemCode: { equals: itemCode, mode: 'insensitive' },
      },
    });
  }

  async create(data: Prisma.ProductCreateInput): Promise<Product> {
    return prisma.product.create({
      data,
      include: {
        productCategory: true,
      },
    });
  }

  async update(id: string, businessId: string, data: Prisma.ProductUpdateInput): Promise<Product> {
    const existing = await prisma.product.findFirst({ where: { id, businessId } });
    if (!existing) {
      throw new Error('Product not found or unauthorized business access');
    }
    return prisma.product.update({
      where: { id },
      data,
      include: {
        productCategory: true,
      },
    });
  }

  async delete(id: string, businessId: string): Promise<Product> {
    const existing = await prisma.product.findFirst({ where: { id, businessId } });
    if (!existing) {
      throw new Error('Product not found or unauthorized business access');
    }
    return prisma.product.delete({
      where: { id },
    });
  }

  async list(
    businessId: string,
    params: {
      page: number;
      limit: number;
      search?: string;
      category?: string;
      categoryId?: string;
      lowStock?: boolean;
      isActive?: boolean;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{ products: Product[]; total: number }> {
    const { page, limit, search, category, categoryId, lowStock, isActive, sortBy, sortOrder } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = { businessId };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId;
    } else if (category && category !== 'all') {
      where.OR = [
        { category: { equals: category, mode: 'insensitive' } },
        { productCategory: { name: { equals: category, mode: 'insensitive' } } },
      ];
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.AND = [
        {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { sku: { contains: q, mode: 'insensitive' } },
            { itemCode: { contains: q, mode: 'insensitive' } },
            { barcode: { contains: q, mode: 'insensitive' } },
            { hsnSac: { contains: q, mode: 'insensitive' } },
            { hsnCode: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    // Determine sorting
    const validSortFields = ['name', 'sellingPrice', 'currentStock', 'createdAt', 'updatedAt'];
    const orderField = validSortFields.includes(sortBy || '') ? sortBy! : 'name';
    const direction: Prisma.SortOrder = sortOrder === 'desc' ? 'desc' : 'asc';
    const orderBy: Prisma.ProductOrderByWithRelationInput = { [orderField]: direction };

    const [allMatching, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: lowStock ? undefined : skip,
        take: lowStock ? undefined : limit,
        orderBy,
        include: {
          productCategory: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    if (lowStock) {
      // Filter products where currentStock <= lowStockThreshold
      const lowStockProducts = allMatching.filter((p) => p.currentStock <= p.lowStockThreshold);
      const paginatedLowStock = lowStockProducts.slice(skip, skip + limit);
      return { products: paginatedLowStock, total: lowStockProducts.length };
    }

    return { products: allMatching, total };
  }

  // ==========================================
  // INVENTORY TRANSACTIONS REPOSITORY
  // ==========================================

  async createInventoryTransaction(
    data: Prisma.InventoryTransactionCreateInput
  ): Promise<InventoryTransaction> {
    return prisma.inventoryTransaction.create({ data });
  }

  async listStockHistory(
    productId: string,
    businessId: string,
    params: { page: number; limit: number }
  ): Promise<{ transactions: InventoryTransaction[]; total: number }> {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryTransactionWhereInput = {
      productId,
      businessId,
    };

    const [transactions, total] = await Promise.all([
      prisma.inventoryTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.inventoryTransaction.count({ where }),
    ]);

    return { transactions, total };
  }
}

export const productRepository = new ProductRepository();
