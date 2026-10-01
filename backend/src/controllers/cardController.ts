import { Request, Response } from 'express';
import { cardService } from '../services/cardService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class CardController {
  async getMyCard(req: Request, res: Response): Promise<void> {
    try {
      const card = await cardService.getCardByBusinessId(req.businessId!);
      sendSuccess(res, card, 'Digital Visiting Card retrieved successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async getCardById(req: Request, res: Response): Promise<void> {
    try {
      const card = await cardService.getCardById(req.params.id, req.businessId!);
      sendSuccess(res, card, 'Digital Visiting Card retrieved successfully');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  }

  async createCard(req: Request, res: Response): Promise<void> {
    try {
      const card = await cardService.updateCard(req.businessId!, req.body);
      sendSuccess(res, card, 'Digital Visiting Card created successfully', 201);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async updateCard(req: Request, res: Response): Promise<void> {
    try {
      const card = await cardService.updateCard(req.businessId!, req.body);
      sendSuccess(res, card, 'Digital Visiting Card updated successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async publishCard(req: Request, res: Response): Promise<void> {
    try {
      let id = req.params.id;
      if (!id) {
        const card = await cardService.getCardByBusinessId(req.businessId!);
        id = card?.id || '';
      }
      if (!id) throw new Error('Digital Visiting Card not found');
      const card = await cardService.setPublishStatus(id, req.businessId!, true);
      sendSuccess(res, card, 'Digital Visiting Card is now live and published! 🚀');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async unpublishCard(req: Request, res: Response): Promise<void> {
    try {
      let id = req.params.id;
      if (!id) {
        const card = await cardService.getCardByBusinessId(req.businessId!);
        id = card?.id || '';
      }
      if (!id) throw new Error('Digital Visiting Card not found');
      const card = await cardService.setPublishStatus(id, req.businessId!, false);
      sendSuccess(res, card, 'Digital Visiting Card is now offline (unpublished)');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async getPublicCard(req: Request, res: Response): Promise<void> {
    try {
      const card = await cardService.getPublicCardBySlug(req.params.slug);
      sendSuccess(res, card, 'Public Digital Visiting Card');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  }

  async downloadVCard(req: Request, res: Response): Promise<void> {
    try {
      const card = await cardService.getPublicCardBySlug(req.params.slug);
      const origin = `${req.protocol}://${req.get('host')}`;
      const vCardData = cardService.generateVCard(card, origin);

      const rawName = (card as any).fullName || (card as any).name || 'contact';
      const safeName = String(rawName).replace(/[^a-zA-Z0-9_-]/g, '_');
      res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}.vcf"`);
      res.send(vCardData);
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  }
}

export const cardController = new CardController();
