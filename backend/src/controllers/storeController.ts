import { Request, Response } from 'express';
import { storeService } from '../services/storeService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class StoreController {
  async getMyStore(req: Request, res: Response): Promise<void> {
    try {
      const store = await storeService.getStoreByBusinessId(req.businessId!);
      sendSuccess(res, store, 'Digital Dukaan retrieved successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async getStoreById(req: Request, res: Response): Promise<void> {
    try {
      const store = await storeService.getStoreById(req.params.id, req.businessId!);
      sendSuccess(res, store, 'Digital Dukaan retrieved successfully');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  }

  async createStore(req: Request, res: Response): Promise<void> {
    try {
      const store = await storeService.updateStore(req.businessId!, req.body);
      sendSuccess(res, store, 'Digital Dukaan created successfully', 201);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async updateStore(req: Request, res: Response): Promise<void> {
    try {
      const store = await storeService.updateStore(req.businessId!, req.body);
      sendSuccess(res, store, 'Digital Dukaan updated successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async publishStore(req: Request, res: Response): Promise<void> {
    try {
      let id = req.params.id;
      if (!id) {
        const store = await storeService.getStoreByBusinessId(req.businessId!);
        id = store?.id || '';
      }
      if (!id) throw new Error('Digital Store not found');
      const store = await storeService.setPublishStatus(id, req.businessId!, true);
      sendSuccess(res, store, 'Digital Dukaan is now live and published! 🚀');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async unpublishStore(req: Request, res: Response): Promise<void> {
    try {
      let id = req.params.id;
      if (!id) {
        const store = await storeService.getStoreByBusinessId(req.businessId!);
        id = store?.id || '';
      }
      if (!id) throw new Error('Digital Store not found');
      const store = await storeService.setPublishStatus(id, req.businessId!, false);
      sendSuccess(res, store, 'Digital Dukaan is now offline (unpublished)');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async getPublicStore(req: Request, res: Response): Promise<void> {
    try {
      const store = await storeService.getPublicStoreBySlug(req.params.slug);
      sendSuccess(res, store, 'Public Digital Dukaan storefront');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  }

  async addStoreItem(req: Request, res: Response): Promise<void> {
    try {
      const item = await storeService.addStoreItem(req.businessId!, req.body);
      sendSuccess(res, item, 'Item added to Digital Dukaan showcase', 201);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async updateStoreItem(req: Request, res: Response): Promise<void> {
    try {
      const item = await storeService.updateStoreItem(req.businessId!, req.params.itemId, req.body);
      sendSuccess(res, item, 'Showcase item updated successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async deleteStoreItem(req: Request, res: Response): Promise<void> {
    try {
      await storeService.deleteStoreItem(req.businessId!, req.params.itemId);
      sendSuccess(res, { deleted: true }, 'Item removed from showcase (catalog item preserved)');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async reorderStoreItems(req: Request, res: Response): Promise<void> {
    try {
      const result = await storeService.reorderStoreItems(req.businessId!, req.body.items);
      sendSuccess(res, result, 'Showcase items reordered successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }
}

export const storeController = new StoreController();
