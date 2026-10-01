import { Request, Response } from 'express';
import { khataService } from '../services/khataService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class KhataController {
  async addTransaction(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.params.customerId || req.body.customerId;
      if (!customerId) {
        sendError(res, 'Customer ID is required', 400);
        return;
      }

      const payload = {
        ...req.body,
        customerId,
      };

      const result = await khataService.addTransaction(req.businessId!, req.user!.id, payload);
      sendSuccess(res, result, 'Khata entry recorded successfully', 201);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async listTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      const transactions = await khataService.listTransactions(req.businessId!, customerId, {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        skip: req.query.skip ? Number(req.query.skip) : undefined,
      });

      sendSuccess(res, transactions, 'Customer transactions retrieved');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  }

  async getCustomerSummary(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      const summary = await khataService.getCustomerSummary(req.businessId!, customerId);
      sendSuccess(res, summary, 'Khata summary calculated');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  }

  async getCustomerStatement(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      const statement = await khataService.getCustomerStatement(req.businessId!, customerId);
      sendSuccess(res, statement, 'Customer statement retrieved');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  }

  async updateTransaction(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await khataService.updateTransaction(id, req.businessId!, req.body);
      sendSuccess(res, result, 'Transaction updated successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async deleteTransaction(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await khataService.deleteTransaction(id, req.businessId!);
      sendSuccess(res, result, 'Transaction voided/deleted from khata');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async generateReminder(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      const amount = req.query.amount ? Number(req.query.amount) : undefined;
      const reminder = await khataService.generatePaymentReminder(req.businessId!, customerId, amount);
      sendSuccess(res, reminder, 'Payment reminder message generated');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const summary = await khataService.getSummary(req.businessId!);
      sendSuccess(res, summary, 'Business khata overall summary');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async createReminder(req: Request, res: Response): Promise<void> {
    try {
      const reminder = await khataService.createReminder(req.businessId!, req.body);
      sendSuccess(res, reminder, 'Payment reminder recorded');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }
}

export const khataController = new KhataController();
