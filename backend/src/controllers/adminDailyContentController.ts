import { Request, Response } from 'express';
import { contentService } from '../services/contentService.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/response.js';

export class AdminDailyContentController {
  // ============================================================
  // DAILY CONTENT MANAGEMENT
  // ============================================================

  async listDailyContent(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const search = req.query.search as string;
      const categoryId = req.query.categoryId as string;
      const festivalId = req.query.festivalId as string;
      const language = req.query.language as string;
      const contentType = req.query.contentType as string;
      const isPublished = req.query.isPublished !== undefined ? req.query.isPublished === 'true' : undefined;
      const isFeatured = req.query.isFeatured !== undefined ? req.query.isFeatured === 'true' : undefined;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const { items, total } = await contentService.adminListDailyContent({
        page,
        limit,
        search,
        categoryId,
        festivalId,
        language,
        contentType,
        isPublished,
        isFeatured,
        startDate,
        endDate,
      });

      sendPaginated(res, items, total, page, limit, 'Daily content list retrieved');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async getDailyContentById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const content = await contentService.adminGetDailyContentById(id);
      sendSuccess(res, content, 'Daily content details');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  }

  async createDailyContent(req: Request, res: Response): Promise<void> {
    try {
      const adminUser = req.adminUser!;
      const created = await contentService.adminCreateDailyContent(
        req.body,
        adminUser,
        req.ip,
        req.headers['user-agent']
      );
      sendSuccess(res, created, 'Daily content created successfully', 201);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async updateDailyContent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminUser = req.adminUser!;
      const updated = await contentService.adminUpdateDailyContent(
        id,
        req.body,
        adminUser,
        req.ip,
        req.headers['user-agent']
      );
      sendSuccess(res, updated, 'Daily content updated successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async deleteDailyContent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminUser = req.adminUser!;
      const deleted = await contentService.adminDeleteDailyContent(
        id,
        adminUser,
        req.ip,
        req.headers['user-agent']
      );
      sendSuccess(res, deleted, 'Daily content deleted successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async publishDailyContent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminUser = req.adminUser!;
      const updated = await contentService.adminPublishDailyContent(
        id,
        adminUser,
        req.ip,
        req.headers['user-agent']
      );
      sendSuccess(res, updated, 'Daily content published successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async unpublishDailyContent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminUser = req.adminUser!;
      const updated = await contentService.adminUnpublishDailyContent(
        id,
        adminUser,
        req.ip,
        req.headers['user-agent']
      );
      sendSuccess(res, updated, 'Daily content unpublished successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async scheduleDailyContent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { publishAt, expiresAt } = req.body;
      const adminUser = req.adminUser!;
      const updated = await contentService.adminScheduleDailyContent(
        id,
        { publishAt, expiresAt },
        adminUser,
        req.ip,
        req.headers['user-agent']
      );
      sendSuccess(res, updated, 'Daily content scheduled successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async uploadImage(req: Request, res: Response): Promise<void> {
    try {
      const { imageBase64, fileName, mimeType, folder } = req.body;
      if (!imageBase64) {
        sendError(res, 'imageBase64 is required in request body', 400);
        return;
      }

      // Strip data:image/...;base64, header if present
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      const safeName = fileName || `poster_${Date.now()}.png`;
      const detectedMime = mimeType || 'image/png';

      const result = await contentService.uploadContentImage(
        buffer,
        safeName,
        detectedMime,
        folder || 'daily-content'
      );

      sendSuccess(res, result, 'Image uploaded successfully', 201);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  // ============================================================
  // FESTIVALS CMS
  // ============================================================

  async listFestivals(req: Request, res: Response): Promise<void> {
    try {
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
      const language = req.query.language as string;
      const festivals = await contentService.listFestivals({ year, language });
      sendSuccess(res, festivals, 'Festivals retrieved');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async createFestival(req: Request, res: Response): Promise<void> {
    try {
      const adminUser = req.adminUser!;
      const festival = await contentService.adminCreateFestival(
        req.body,
        adminUser,
        req.ip,
        req.headers['user-agent']
      );
      sendSuccess(res, festival, 'Festival created successfully', 201);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async updateFestival(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminUser = req.adminUser!;
      const festival = await contentService.adminUpdateFestival(
        id,
        req.body,
        adminUser,
        req.ip,
        req.headers['user-agent']
      );
      sendSuccess(res, festival, 'Festival updated successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async deleteFestival(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminUser = req.adminUser!;
      const festival = await contentService.adminDeleteFestival(
        id,
        adminUser,
        req.ip,
        req.headers['user-agent']
      );
      sendSuccess(res, festival, 'Festival deleted successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  // ============================================================
  // CONTENT CATEGORIES CMS
  // ============================================================

  async listCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await contentService.listCategories();
      sendSuccess(res, categories, 'Categories retrieved');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const adminUser = req.adminUser!;
      const category = await contentService.adminCreateCategory(
        req.body,
        adminUser,
        req.ip,
        req.headers['user-agent']
      );
      sendSuccess(res, category, 'Content category created successfully', 201);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminUser = req.adminUser!;
      const category = await contentService.adminUpdateCategory(id, req.body, adminUser);
      sendSuccess(res, category, 'Content category updated successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const category = await contentService.adminDeleteCategory(id);
      sendSuccess(res, category, 'Content category deleted successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  // ============================================================
  // POSTER ASSETS CMS
  // ============================================================

  async listPosters(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 30;
      const categoryId = req.query.categoryId as string;
      const festivalId = req.query.festivalId as string;
      const language = req.query.language as string;
      const contentType = req.query.contentType as string;
      const aspectRatio = req.query.aspectRatio as string;
      const tier = req.query.tier as string;
      const search = req.query.search as string;

      const { items, total } = await contentService.listPosters({
        page,
        limit,
        categoryId,
        festivalId,
        language,
        contentType,
        aspectRatio,
        tier,
        search,
      });

      sendPaginated(res, items, total, page, limit, 'Posters retrieved');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async createPoster(req: Request, res: Response): Promise<void> {
    try {
      const adminUser = req.adminUser!;
      const poster = await contentService.adminCreateAsset(
        req.body,
        adminUser,
        req.ip,
        req.headers['user-agent']
      );
      sendSuccess(res, poster, 'Poster created successfully', 201);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async updatePoster(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminUser = req.adminUser!;
      const poster = await contentService.adminUpdateAsset(id, req.body, adminUser);
      sendSuccess(res, poster, 'Poster updated successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async deletePoster(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const poster = await contentService.adminDeleteAsset(id);
      sendSuccess(res, poster, 'Poster deleted successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }
}

export const adminDailyContentController = new AdminDailyContentController();
