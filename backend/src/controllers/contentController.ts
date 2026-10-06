import { Request, Response } from 'express';
import { contentService } from '../services/contentService.js';
import { storageProvider } from '../integrations/storageProvider.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/response.js';

export class ContentController {

  async getTodayContent(req: Request, res: Response): Promise<void> {
    try {
      const dateStr = req.query.date as string;
      const language = req.query.language as string;
      const categoryId = req.query.categoryId as string;
      const contentType = req.query.contentType as string;

      const today = await contentService.getTodayContent({
        dateStr,
        language,
        categoryId,
        contentType,
      });

      if (!today) {
        sendSuccess(res, null, 'Aaj ka content available nahi hai.');
        return;
      }

      sendSuccess(res, today, "Today's daily status content retrieved");
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async listDailyContent(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const date = req.query.date as string;
      const categoryId = req.query.categoryId as string;
      const festivalId = req.query.festivalId as string;
      const language = req.query.language as string;
      const contentType = req.query.contentType as string;
      const search = req.query.search as string;

      const { items, total } = await contentService.listPublishedDailyContent({
        page,
        limit,
        date,
        categoryId,
        festivalId,
        language,
        contentType,
        search,
      });

      sendPaginated(res, items, total, page, limit, 'Daily content list retrieved');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async getContentById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const content = await contentService.getPublishedContentById(id);
      sendSuccess(res, content, 'Daily content details');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  }

  async getContentByDate(req: Request, res: Response): Promise<void> {
    try {
      const { date } = req.params;
      const language = req.query.language as string;
      const contents = await contentService.getContentByDate(date, language);
      sendSuccess(res, contents, `Content for date ${date}`);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async getFestivalContent(req: Request, res: Response): Promise<void> {
    try {
      const { festivalId } = req.params;
      const festival = await contentService.getFestivalContent(festivalId);
      sendSuccess(res, festival, 'Festival content assets retrieved');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  }

  async getCalendarFeed(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const language = req.query.language as string;

      const feed = await contentService.getCalendarFeed({
        startDate,
        endDate,
        language,
      });
      sendSuccess(res, feed, '365-day festive & calendar feed');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async listFestivals(req: Request, res: Response): Promise<void> {
    try {
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
      const language = req.query.language as string;
      const festivals = await contentService.listFestivals({ year, language });
      sendSuccess(res, festivals, 'Festival calendar retrieved');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async listCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await contentService.listCategories();
      sendSuccess(res, categories, 'Content categories retrieved');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

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

      const posters = await contentService.listPosters({
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
      sendPaginated(res, posters.items, posters.total, page, limit, 'Poster library retrieved');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async trackEvent(req: Request, res: Response): Promise<void> {
    try {
      const { contentId, assetId, eventType, metadata } = req.body;
      const user = (req as any).user;
      const businessId = req.headers['x-business-id'] as string;

      const event = await contentService.trackEvent({
        contentId: contentId || undefined,
        assetId: assetId || undefined,
        userId: user?.id || undefined,
        businessId: businessId || undefined,
        eventType,
        metadata,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      });

      sendSuccess(res, { tracked: true, id: event.id }, 'Event tracked successfully', 201);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async streamMedia(req: Request, res: Response): Promise<void> {
    try {
      const key = (req.params as any)[0] || (req.params as any).key;
      if (!key) {
        res.status(400).send('Missing media key');
        return;
      }
      const asset = await storageProvider.getMediaAsset(key);
      if (!asset) {
        res.status(404).send('Media asset not found');
        return;
      }
      res.setHeader('Content-Type', asset.mimeType);
      res.setHeader('Content-Length', asset.buffer.length);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(asset.buffer);
    } catch (error: any) {
      res.status(500).send('Error streaming media: ' + error.message);
    }
  }
}

export const contentController = new ContentController();

