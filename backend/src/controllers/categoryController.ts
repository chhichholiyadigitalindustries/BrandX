import { Request, Response } from 'express';
import { categoryService } from '../services/categoryService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class CategoryController {
  async listCategories(req: Request, res: Response): Promise<void> {
    try {
      const search = req.query.search as string;
      const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

      const categories = await categoryService.listCategories(req.businessId!, {
        search,
        isActive,
      });

      sendSuccess(res, categories, 'Product categories retrieved');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async getCategory(req: Request, res: Response): Promise<void> {
    try {
      const category = await categoryService.getCategory(req.params.id, req.businessId!);
      sendSuccess(res, category, 'Product category retrieved');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  }

  async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const category = await categoryService.createCategory(req.businessId!, req.body);
      sendSuccess(res, category, 'Product category created', 201);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const category = await categoryService.updateCategory(req.params.id, req.businessId!, req.body);
      sendSuccess(res, category, 'Product category updated');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const result = await categoryService.deleteCategory(req.params.id, req.businessId!);
      sendSuccess(res, result, 'Product category deleted or deactivated');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }
}

export const categoryController = new CategoryController();
