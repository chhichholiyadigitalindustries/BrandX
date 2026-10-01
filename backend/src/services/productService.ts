import { prisma } from '../config/database.js';
import { productRepository } from '../repositories/productRepository.js';
import { categoryRepository } from '../repositories/categoryRepository.js';
import { Prisma, InventoryTransactionType, ProductUnit, TaxType } from '@prisma/client';

export interface CreateProductInput {
  name: string;
  itemCode?: string | null;
  sku?: string | null;
  barcode?: string | null;
  categoryId?: string | null;
  category?: string;
  description?: string | null;
  type?: 'GOODS' | 'SERVICE';
  sellingPrice: number;
  purchasePrice?: number | null;
  mrp?: number | null;
  hsnSac?: string | null;
  hsnCode?: string | null;
  gstRate?: number;
  gstPercent?: number;
  taxType?: TaxType;
  cessRate?: number | null;
  unit?: ProductUnit;
  secondaryUnit?: string | null;
  conversionFactor?: number | null;
  openingStock?: number;
  currentStock?: number;
  lowStockThreshold?: number;
  isActive?: boolean;
  isAvailable?: boolean;
  imageUrl?: string | null;
}

export interface UpdateProductInput extends Partial<CreateProductInput> {}

export class ProductService {
  /**
   * Helper to serialize Prisma Decimal fields to clean numbers
   */
  serializeProduct(product: any) {
    if (!product) return null;
    return {
      ...product,
      sellingPrice: product.sellingPrice !== null && product.sellingPrice !== undefined ? Number(product.sellingPrice) : 0,
      purchasePrice: product.purchasePrice !== null && product.purchasePrice !== undefined ? Number(product.purchasePrice) : null,
      mrp: product.mrp !== null && product.mrp !== undefined ? Number(product.mrp) : null,
      cessRate: product.cessRate !== null && product.cessRate !== undefined ? Number(product.cessRate) : null,
      openingStock: Number(product.openingStock ?? 0),
      currentStock: Number(product.currentStock ?? product.stockQty ?? 0),
      lowStockThreshold: Number(product.lowStockThreshold ?? 5),
      isLowStock: Number(product.currentStock ?? product.stockQty ?? 0) <= Number(product.lowStockThreshold ?? 5),
    };
  }

  async listProducts(
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
  ) {
    const { products, total } = await productRepository.list(businessId, params);
    return {
      products: products.map((p) => this.serializeProduct(p)),
      total,
    };
  }

  async getProduct(productId: string, businessId: string) {
    const product = await productRepository.findById(productId, businessId);
    if (!product) {
      throw new Error('Product not found');
    }
    return this.serializeProduct(product);
  }

  async createProduct(businessId: string, data: CreateProductInput) {
    const trimmedName = data.name.trim();

    // 1. Uniqueness validations within business scope
    if (data.sku && data.sku.trim()) {
      const existingSku = await productRepository.findBySku(data.sku.trim(), businessId);
      if (existingSku) {
        throw new Error(`Product with SKU "${data.sku.trim()}" already exists`);
      }
    }

    if (data.barcode && data.barcode.trim()) {
      const existingBarcode = await productRepository.findByBarcode(data.barcode.trim(), businessId);
      if (existingBarcode) {
        throw new Error(`Product with barcode "${data.barcode.trim()}" already exists`);
      }
    }

    if (data.itemCode && data.itemCode.trim()) {
      const existingCode = await productRepository.findByItemCode(data.itemCode.trim(), businessId);
      if (existingCode) {
        throw new Error(`Product with Item Code "${data.itemCode.trim()}" already exists`);
      }
    }

    // 2. Validate category if provided
    let categoryName = data.category || 'General';
    if (data.categoryId && data.categoryId.trim()) {
      const cat = await categoryRepository.findById(data.categoryId.trim(), businessId);
      if (cat) {
        categoryName = cat.name;
      }
    }

    const openingStock = Math.max(0, Number(data.openingStock) || 0);
    const lowStockThreshold = data.lowStockThreshold !== undefined ? Math.max(0, Number(data.lowStockThreshold)) : 5;
    const gstRateVal = data.gstRate !== undefined ? Number(data.gstRate) : (data.gstPercent !== undefined ? Number(data.gstPercent) : 18.0);
    const hsnVal = (data.hsnSac || data.hsnCode || '').trim() || null;

    // 3. Database transaction: Create product & initial stock entry
    const createdProduct = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.create({
        data: {
          business: { connect: { id: businessId } },
          productCategory: data.categoryId?.trim() ? { connect: { id: data.categoryId.trim() } } : undefined,
          name: trimmedName,
          itemCode: data.itemCode?.trim() || null,
          sku: data.sku?.trim() || null,
          barcode: data.barcode?.trim() || null,
          category: categoryName,
          description: data.description?.trim() || null,
          type: data.type || 'GOODS',
          sellingPrice: new Prisma.Decimal(data.sellingPrice.toFixed(2)),
          purchasePrice: data.purchasePrice !== undefined && data.purchasePrice !== null ? new Prisma.Decimal(data.purchasePrice.toFixed(2)) : null,
          mrp: data.mrp !== undefined && data.mrp !== null ? new Prisma.Decimal(data.mrp.toFixed(2)) : null,
          hsnSac: hsnVal,
          hsnCode: hsnVal,
          gstRate: gstRateVal,
          gstPercent: gstRateVal,
          taxType: data.taxType || 'EXCLUSIVE',
          cessRate: data.cessRate !== undefined && data.cessRate !== null ? new Prisma.Decimal(data.cessRate.toFixed(2)) : null,
          unit: data.unit || 'PCS',
          secondaryUnit: data.secondaryUnit?.trim() || null,
          conversionFactor: data.conversionFactor ? Number(data.conversionFactor) : null,
          openingStock: openingStock,
          currentStock: openingStock,
          stockQty: Math.round(openingStock),
          lowStockThreshold: lowStockThreshold,
          isActive: data.isActive !== undefined ? data.isActive : true,
          isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
          imageUrl: data.imageUrl?.trim() || null,
        },
        include: {
          productCategory: true,
        },
      });

      // Record initial opening stock transaction if greater than 0
      if (openingStock > 0) {
        await tx.inventoryTransaction.create({
          data: {
            businessId,
            productId: prod.id,
            type: 'OPENING_STOCK',
            quantity: openingStock,
            previousStock: 0,
            newStock: openingStock,
            referenceType: 'OPENING_STOCK',
            note: 'Initial opening stock upon product creation',
          },
        });
      }

      // Record in AuditLog
      try {
        await tx.auditLog.create({
          data: {
            action: 'PRODUCT_CREATED',
            entity: 'Product',
            entityId: prod.id,
            metadata: {
              businessId,
              productName: prod.name,
              sellingPrice: data.sellingPrice,
              openingStock,
            },
          },
        });
      } catch {
        try {
          await tx.$executeRawUnsafe(
            `INSERT INTO "AuditLog" ("id", "actorId", "actorType", "action", "entity", "entityId", "details", "createdAt")
             VALUES (gen_random_uuid(), $1, 'USER'::"ActorType", 'PRODUCT_CREATED', 'Product', $2, ($3::text)::jsonb, NOW())`,
            businessId,
            prod.id,
            JSON.stringify({
              businessId,
              productName: prod.name,
              sellingPrice: data.sellingPrice,
              openingStock,
            })
          );
        } catch {
          // Non-blocking audit log recording
        }
      }

      return prod;
    });

    return this.serializeProduct(createdProduct);
  }

  async updateProduct(productId: string, businessId: string, data: UpdateProductInput) {
    const product = await productRepository.findById(productId, businessId);
    if (!product) {
      throw new Error('Product not found');
    }

    // Uniqueness checks
    if (data.sku && data.sku.trim() && data.sku.trim().toLowerCase() !== (product.sku || '').toLowerCase()) {
      const existing = await productRepository.findBySku(data.sku.trim(), businessId);
      if (existing && existing.id !== productId) {
        throw new Error(`Product with SKU "${data.sku.trim()}" already exists`);
      }
    }

    if (data.barcode && data.barcode.trim() && data.barcode.trim().toLowerCase() !== (product.barcode || '').toLowerCase()) {
      const existing = await productRepository.findByBarcode(data.barcode.trim(), businessId);
      if (existing && existing.id !== productId) {
        throw new Error(`Product with barcode "${data.barcode.trim()}" already exists`);
      }
    }

    if (data.itemCode && data.itemCode.trim() && data.itemCode.trim().toLowerCase() !== (product.itemCode || '').toLowerCase()) {
      const existing = await productRepository.findByItemCode(data.itemCode.trim(), businessId);
      if (existing && existing.id !== productId) {
        throw new Error(`Product with Item Code "${data.itemCode.trim()}" already exists`);
      }
    }

    const updatePayload: Prisma.ProductUpdateInput = {};

    if (data.name) updatePayload.name = data.name.trim();
    if (data.itemCode !== undefined) updatePayload.itemCode = data.itemCode?.trim() || null;
    if (data.sku !== undefined) updatePayload.sku = data.sku?.trim() || null;
    if (data.barcode !== undefined) updatePayload.barcode = data.barcode?.trim() || null;
    if (data.description !== undefined) updatePayload.description = data.description?.trim() || null;
    if (data.type) updatePayload.type = data.type;
    if (data.sellingPrice !== undefined) updatePayload.sellingPrice = new Prisma.Decimal(data.sellingPrice.toFixed(2));
    if (data.purchasePrice !== undefined) {
      updatePayload.purchasePrice = data.purchasePrice !== null ? new Prisma.Decimal(data.purchasePrice.toFixed(2)) : null;
    }
    if (data.mrp !== undefined) {
      updatePayload.mrp = data.mrp !== null ? new Prisma.Decimal(data.mrp.toFixed(2)) : null;
    }
    if (data.hsnSac !== undefined || data.hsnCode !== undefined) {
      const hsn = (data.hsnSac || data.hsnCode || '').trim() || null;
      updatePayload.hsnSac = hsn;
      updatePayload.hsnCode = hsn;
    }
    if (data.gstRate !== undefined || data.gstPercent !== undefined) {
      const gst = data.gstRate !== undefined ? Number(data.gstRate) : Number(data.gstPercent);
      updatePayload.gstRate = gst;
      updatePayload.gstPercent = gst;
    }
    if (data.taxType) updatePayload.taxType = data.taxType;
    if (data.cessRate !== undefined) {
      updatePayload.cessRate = data.cessRate !== null ? new Prisma.Decimal(data.cessRate.toFixed(2)) : null;
    }
    if (data.unit) updatePayload.unit = data.unit;
    if (data.secondaryUnit !== undefined) updatePayload.secondaryUnit = data.secondaryUnit?.trim() || null;
    if (data.conversionFactor !== undefined) updatePayload.conversionFactor = data.conversionFactor;
    if (data.lowStockThreshold !== undefined) updatePayload.lowStockThreshold = Math.max(0, Number(data.lowStockThreshold));
    if (data.isActive !== undefined) updatePayload.isActive = data.isActive;
    if (data.isAvailable !== undefined) updatePayload.isAvailable = data.isAvailable;
    if (data.imageUrl !== undefined) updatePayload.imageUrl = data.imageUrl?.trim() || null;

    if (data.categoryId !== undefined) {
      if (data.categoryId && data.categoryId.trim()) {
        const cat = await categoryRepository.findById(data.categoryId.trim(), businessId);
        if (cat) {
          updatePayload.productCategory = { connect: { id: cat.id } };
          updatePayload.category = cat.name;
        }
      } else {
        updatePayload.productCategory = { disconnect: true };
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id: productId },
        data: updatePayload,
        include: { productCategory: true },
      });

      try {
        await tx.auditLog.create({
          data: {
            action: 'PRODUCT_UPDATED',
            entity: 'Product',
            entityId: productId,
            metadata: { businessId, changes: Object.keys(updatePayload) },
          },
        });
      } catch {
        try {
          await tx.$executeRawUnsafe(
            `INSERT INTO "AuditLog" ("id", "actorId", "actorType", "action", "entity", "entityId", "details", "createdAt")
             VALUES (gen_random_uuid(), $1, 'USER'::"ActorType", 'PRODUCT_UPDATED', 'Product', $2, ($3::text)::jsonb, NOW())`,
            businessId,
            productId,
            JSON.stringify({ businessId, changes: Object.keys(updatePayload) })
          );
        } catch {
          // Non-blocking audit log recording
        }
      }

      return p;
    });

    return this.serializeProduct(updated);
  }

  async deleteProduct(productId: string, businessId: string) {
    const product = await productRepository.findById(productId, businessId);
    if (!product) {
      throw new Error('Product not found');
    }

    const txCount = (product as any)._count?.inventoryTransactions || 0;
    const invItemCount = (product as any)._count?.invoiceItems || 0;
    const storeItemCount = (product as any)._count?.digitalStoreItems || 0;

    // If historical references exist, use soft delete (deactivate)
    if (txCount > 0 || invItemCount > 0 || storeItemCount > 0) {
      const deactivated = await prisma.product.update({
        where: { id: productId },
        data: {
          isActive: false,
          isAvailable: false,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: 'PRODUCT_DEACTIVATED',
          entity: 'Product',
          entityId: productId,
          metadata: { businessId, reason: 'Soft deleted due to existing records' },
        },
      });

      return {
        deleted: true,
        softDeleted: true,
        message: 'Product has historic transaction records and was deactivated successfully.',
        product: this.serializeProduct(deactivated),
      };
    }

    // Permanent delete if no references exist
    await prisma.product.delete({
      where: { id: productId },
    });

    await prisma.auditLog.create({
      data: {
        action: 'PRODUCT_DELETED',
        entity: 'Product',
        entityId: productId,
        metadata: { businessId, productName: product.name },
      },
    });

    return {
      deleted: true,
      softDeleted: false,
      message: 'Product permanently removed from catalog.',
    };
  }

  // ==========================================
  // STOCK MANAGEMENT SERVICES
  // ==========================================

  async addOrRemoveStock(
    productId: string,
    businessId: string,
    data: {
      type: InventoryTransactionType;
      quantity: number;
      note?: string;
      referenceType?: string;
      referenceId?: string;
    }
  ) {
    const qty = Number(data.quantity);
    if (!qty || qty <= 0) {
      throw new Error('Stock quantity must be greater than 0');
    }

    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, businessId },
      });

      if (!product) {
        throw new Error('Product not found');
      }

      const previousStock = product.currentStock;
      const isStockIncrease = ['OPENING_STOCK', 'STOCK_IN', 'PURCHASE', 'RETURN_IN'].includes(data.type);
      const newStock = isStockIncrease ? previousStock + qty : previousStock - qty;

      if (newStock < 0) {
        throw new Error(`Insufficient stock for "${product.name}". Available: ${previousStock}, Requested deduction: ${qty}`);
      }

      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          currentStock: newStock,
          stockQty: Math.round(newStock),
        },
        include: { productCategory: true },
      });

      const invTx = await tx.inventoryTransaction.create({
        data: {
          businessId,
          productId,
          type: data.type,
          quantity: qty,
          previousStock,
          newStock,
          referenceType: data.referenceType || null,
          referenceId: data.referenceId || null,
          note: data.note?.trim() || null,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'STOCK_ADJUSTED',
          entity: 'Product',
          entityId: productId,
          metadata: {
            businessId,
            type: data.type,
            quantity: qty,
            previousStock,
            newStock,
          },
        },
      });

      return {
        product: this.serializeProduct(updatedProduct),
        transaction: invTx,
      };
    });
  }

  async adjustStock(
    productId: string,
    businessId: string,
    data: {
      quantity: number;
      adjustmentType: 'SET' | 'ADD' | 'SUBTRACT' | 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT';
      reason: string;
      note?: string;
    }
  ) {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, businessId },
      });

      if (!product) {
        throw new Error('Product not found');
      }

      const previousStock = product.currentStock;
      let newStock = previousStock;

      if (data.adjustmentType === 'SET' || data.adjustmentType === 'ADJUSTMENT') {
        newStock = Math.max(0, Number(data.quantity));
      } else if (data.adjustmentType === 'ADD' || data.adjustmentType === 'STOCK_IN') {
        newStock = previousStock + Math.max(0, Number(data.quantity));
      } else if (data.adjustmentType === 'SUBTRACT' || data.adjustmentType === 'STOCK_OUT') {
        newStock = Math.max(0, previousStock - Math.max(0, Number(data.quantity)));
      }

      const diffQuantity = Math.abs(newStock - previousStock);

      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          currentStock: newStock,
          stockQty: Math.round(newStock),
        },
        include: { productCategory: true },
      });

      const invTx = await tx.inventoryTransaction.create({
        data: {
          businessId,
          productId,
          type: 'ADJUSTMENT',
          quantity: diffQuantity,
          previousStock,
          newStock,
          referenceType: 'MANUAL_ADJUSTMENT',
          note: `${data.reason}${data.note ? ' - ' + data.note.trim() : ''}`,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'STOCK_ADJUSTED',
          entity: 'Product',
          entityId: productId,
          metadata: {
            businessId,
            adjustmentType: data.adjustmentType,
            reason: data.reason,
            previousStock,
            newStock,
          },
        },
      });

      return {
        product: this.serializeProduct(updatedProduct),
        transaction: invTx,
      };
    });
  }

  async getStockSummary(productId: string, businessId: string) {
    const product = await productRepository.findById(productId, businessId);
    if (!product) {
      throw new Error('Product not found');
    }

    const transactions = await prisma.inventoryTransaction.findMany({
      where: { productId, businessId },
      select: { type: true, quantity: true },
    });

    let totalStockIn = 0;
    let totalStockOut = 0;

    for (const t of transactions) {
      if (['OPENING_STOCK', 'STOCK_IN', 'PURCHASE', 'RETURN_IN'].includes(t.type)) {
        totalStockIn += t.quantity;
      } else if (['STOCK_OUT', 'SALE', 'RETURN_OUT'].includes(t.type)) {
        totalStockOut += t.quantity;
      }
    }

    const currentStock = product.currentStock;
    const lowStockThreshold = product.lowStockThreshold;

    return {
      productId: product.id,
      productName: product.name,
      currentStock,
      openingStock: product.openingStock,
      totalStockIn,
      totalStockOut,
      lowStockThreshold,
      isLowStock: currentStock <= lowStockThreshold,
      unit: product.unit,
    };
  }

  async listStockHistory(productId: string, businessId: string, params: { page: number; limit: number }) {
    const product = await productRepository.findById(productId, businessId);
    if (!product) {
      throw new Error('Product not found');
    }

    return productRepository.listStockHistory(productId, businessId, params);
  }
}

export const productService = new ProductService();
