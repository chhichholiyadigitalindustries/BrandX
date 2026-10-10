import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { randomUUID } from 'crypto';

export class WaitlistController {
  async joinWaitlist(req: Request, res: Response): Promise<void> {
    try {
      const { name, phone, email, businessName, businessType, city } = req.body;
      const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);

      if (!cleanPhone || cleanPhone.length !== 10) {
        sendError(res, 'A valid 10-digit Indian phone number is required.', 400, 'INVALID_PHONE');
        return;
      }

      // Check if phone already in waitlist
      const existing = await prisma.waitlistEntry.findUnique({
        where: { phone: cleanPhone },
      });

      if (existing) {
        sendSuccess(
          res,
          {
            phone: cleanPhone,
            isExisting: true,
            createdAt: existing.createdAt,
          },
          'You are already on the VIP launch waitlist! We will notify you via WhatsApp as soon as early access opens.'
        );
        return;
      }

      const entry = await prisma.waitlistEntry.create({
        data: {
          id: randomUUID(),
          name: name?.trim() || null,
          phone: cleanPhone,
          email: email?.trim()?.toLowerCase() || null,
          businessName: businessName?.trim() || null,
          businessType: businessType?.trim() || null,
          city: city?.trim() || null,
        },
      });

      sendSuccess(
        res,
        {
          id: entry.id,
          name: entry.name,
          phone: entry.phone,
          businessName: entry.businessName,
          createdAt: entry.createdAt,
        },
        'Welcome to BrandX VIP Launch Waitlist! You will be among the first in India to receive early access.',
        201
      );
    } catch (error: any) {
      sendError(res, error.message || 'Failed to join waitlist', 500, 'WAITLIST_ERROR');
    }
  }

  async getWaitlistCount(_req: Request, res: Response): Promise<void> {
    try {
      const count = await prisma.waitlistEntry.count();
      sendSuccess(res, { count }, 'Waitlist count retrieved');
    } catch (error: any) {
      sendError(res, error.message || 'Failed to get waitlist count', 500, 'WAITLIST_ERROR');
    }
  }
}

export const waitlistController = new WaitlistController();
