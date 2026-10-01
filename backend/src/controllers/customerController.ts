import { Request, Response } from 'express';
import { customerService } from '../services/customerService.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/response.js';

export class CustomerController {
  async listCustomers(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const search = req.query.search as string;

      const { customers, total } = await customerService.listCustomers(req.businessId!, {
        page,
        limit,
        search,
      });

      sendPaginated(res, customers, total, page, limit, 'Customers retrieved');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async getCustomer(req: Request, res: Response): Promise<void> {
    try {
      const customer = await customerService.getCustomer(req.params.id, req.businessId!);
      sendSuccess(res, customer, 'Customer retrieved');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  }

  async createCustomer(req: Request, res: Response): Promise<void> {
    try {
      const customer = await customerService.createCustomer(req.businessId!, req.body);
      sendSuccess(res, customer, 'Customer added to digital khata', 201);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async updateCustomer(req: Request, res: Response): Promise<void> {
    try {
      const customer = await customerService.updateCustomer(req.params.id, req.businessId!, req.body);
      sendSuccess(res, customer, 'Customer updated');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async deleteCustomer(req: Request, res: Response): Promise<void> {
    try {
      await customerService.deleteCustomer(req.params.id, req.businessId!);
      sendSuccess(res, { deleted: true }, 'Customer removed from khata');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }
}

export const customerController = new CustomerController();
