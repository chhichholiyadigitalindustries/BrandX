import { Request, Response } from 'express';
import { productService } from '../services/productService.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/response.js';

export class ProductController {
  async listProducts(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const search = req.query.search as string;
      const category = req.query.category as string;
      const categoryId = req.query.categoryId as string;
      const lowStock = req.query.lowStock === 'true';
      const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
      const sortBy = req.query.sortBy as string;
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'asc';

      const { products, total } = await productService.listProducts(req.businessId!, {
        page,
        limit,
        search,
        category,
        categoryId,
        lowStock,
        isActive,
        sortBy,
        sortOrder,
      });

      sendPaginated(res, products, total, page, limit, 'Product catalog retrieved');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async getProduct(req: Request, res: Response): Promise<void> {
    try {
      const product = await productService.getProduct(req.params.id, req.businessId!);
      sendSuccess(res, product, 'Product details retrieved');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  }

  async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const product = await productService.createProduct(req.businessId!, req.body);
      sendSuccess(res, product, 'Product added to master catalog', 201);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      const product = await productService.updateProduct(req.params.id, req.businessId!, req.body);
      sendSuccess(res, product, 'Product updated successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const result = await productService.deleteProduct(req.params.id, req.businessId!);
      sendSuccess(res, result, result.message || 'Product removed from catalog');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  // ==========================================
  // STOCK CONTROLLER HANDLERS
  // ==========================================

  async changeStock(req: Request, res: Response): Promise<void> {
    try {
      const { type, quantity, note, referenceType, referenceId } = req.body;
      const result = await productService.addOrRemoveStock(req.params.id, req.businessId!, {
        type,
        quantity,
        note,
        referenceType,
        referenceId,
      });
      sendSuccess(res, result, 'Stock updated successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async adjustStock(req: Request, res: Response): Promise<void> {
    try {
      const { quantity, adjustmentType, reason, note } = req.body;
      const result = await productService.adjustStock(req.params.id, req.businessId!, {
        quantity,
        adjustmentType,
        reason,
        note,
      });
      sendSuccess(res, result, 'Stock adjusted successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async getStockSummary(req: Request, res: Response): Promise<void> {
    try {
      const summary = await productService.getStockSummary(req.params.id, req.businessId!);
      sendSuccess(res, summary, 'Stock summary retrieved');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  }

  async listStockHistory(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const { transactions, total } = await productService.listStockHistory(
        req.params.id,
        req.businessId!,
        { page, limit }
      );

      sendPaginated(res, transactions, total, page, limit, 'Stock history retrieved');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }
}

export const productController = new ProductController();
