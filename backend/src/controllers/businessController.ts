import { Request, Response } from 'express';
import { businessService } from '../services/businessService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class BusinessController {
  async listMyBusinesses(req: Request, res: Response): Promise<void> {
    try {
      const businesses = await businessService.listUserBusinesses(req.user!.id);
      sendSuccess(res, businesses, 'Businesses retrieved');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async getBusiness(req: Request, res: Response): Promise<void> {
    try {
      const business = await businessService.getBusiness(req.params.id, req.user!.id);
      sendSuccess(res, business, 'Business details retrieved');
    } catch (error: any) {
      const status = error.message.includes('access denied') ? 403 : 404;
      sendError(res, error.message, status);
    }
  }

  async createBusiness(req: Request, res: Response): Promise<void> {
    try {
      const business = await businessService.createBusiness(req.user!.id, req.body);
      sendSuccess(res, business, 'Business created successfully', 201);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async updateBusiness(req: Request, res: Response): Promise<void> {
    try {
      const business = await businessService.updateBusiness(req.params.id, req.user!.id, req.body);
      sendSuccess(res, business, 'Business updated successfully');
    } catch (error: any) {
      const status = error.message.includes('access denied') ? 403 : 400;
      sendError(res, error.message, status);
    }
  }

  async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const settings = await businessService.updateSettings(req.params.id, req.user!.id, req.body);
      sendSuccess(res, settings, 'Settings updated successfully');
    } catch (error: any) {
      const status = error.message.includes('access denied') ? 403 : 400;
      sendError(res, error.message, status);
    }
  }

  async deleteBusiness(req: Request, res: Response): Promise<void> {
    try {
      await businessService.deleteBusiness(req.params.id, req.user!.id);
      sendSuccess(res, null, 'Business deleted successfully');
    } catch (error: any) {
      const status = error.message.includes('access denied') ? 403 : 400;
      sendError(res, error.message, status);
    }
  }
}

export const businessController = new BusinessController();
