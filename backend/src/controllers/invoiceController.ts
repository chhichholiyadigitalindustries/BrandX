import { Request, Response } from 'express';
import { invoiceService } from '../services/invoiceService.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/response.js';

export class InvoiceController {
  async listInvoices(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const documentType = req.query.documentType as string;
      const paymentStatus = req.query.paymentStatus as string;
      const customerId = req.query.customerId as string;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const { invoices, total } = await invoiceService.listInvoices(req.businessId!, {
        page,
        limit,
        search,
        status,
        documentType,
        paymentStatus,
        customerId,
        startDate,
        endDate,
      });

      sendPaginated(res, invoices, total, page, limit, 'Invoices retrieved');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async getInvoice(req: Request, res: Response): Promise<void> {
    try {
      const invoice = await invoiceService.getInvoice(req.params.id, req.businessId!);
      sendSuccess(res, invoice, 'Invoice details retrieved');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  }

  async createInvoice(req: Request, res: Response): Promise<void> {
    try {
      const invoice = await invoiceService.createInvoice(req.businessId!, req.user!.id, req.body);
      sendSuccess(res, invoice, 'GST invoice generated successfully', 201);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async issueInvoice(req: Request, res: Response): Promise<void> {
    try {
      const invoice = await invoiceService.issueInvoice(req.params.id, req.businessId!, req.user!.id);
      sendSuccess(res, invoice, 'Invoice issued successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async cancelInvoice(req: Request, res: Response): Promise<void> {
    try {
      const invoice = await invoiceService.cancelInvoice(
        req.params.id,
        req.businessId!,
        req.user!.id,
        req.body?.reason
      );
      sendSuccess(res, invoice, 'Invoice cancelled and stock/Khata reversed');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async recordPayment(req: Request, res: Response): Promise<void> {
    try {
      const result = await invoiceService.recordPayment(req.params.id, req.businessId!, req.user!.id, req.body);
      sendSuccess(res, result, 'Payment recorded on invoice');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  async getInvoicePayments(req: Request, res: Response): Promise<void> {
    try {
      const invoice = await invoiceService.getInvoice(req.params.id, req.businessId!);
      sendSuccess(res, invoice.payments, 'Payment history retrieved');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  }

  async getInvoiceSummary(req: Request, res: Response): Promise<void> {
    try {
      const summary = await invoiceService.getInvoiceSummary(req.businessId!);
      sendSuccess(res, summary, 'Invoice summary metrics retrieved');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }
}

export const invoiceController = new InvoiceController();
