/**
 * BRANDX — Business UPI Service
 * Single Backend Source of Truth for Merchant UPI details and QR payload generation.
 */
import QRCode from 'qrcode';
import { prisma } from '../config/database.js';
import { upiIdRegex } from '../validators/index.js';

export class UpiService {
  /**
   * Retrieves authenticated business's UPI payment details directly from PostgreSQL
   */
  async getBusinessUpiDetails(businessId: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, ownerName: true, upiId: true, upiLinked: true, mobile: true },
    });

    if (!business) {
      throw new Error('Business profile not found');
    }

    const cleanUpi = business.upiId ? business.upiId.trim() : null;
    const isValid = Boolean(cleanUpi && upiIdRegex.test(cleanUpi));

    return {
      businessId: business.id,
      businessName: business.name,
      ownerName: business.ownerName,
      upiId: cleanUpi,
      upiLinked: Boolean(cleanUpi && business.upiLinked),
      isValid,
    };
  }

  /**
   * Generates standard NPCI UPI URI and scannable QR data URL using saved business UPI ID
   */
  async generateBusinessUpiPayload(
    businessId: string,
    options: { amount?: number | null; note?: string | null } = {}
  ) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, upiId: true },
    });

    if (!business) {
      throw new Error('Business profile not found');
    }

    const upiId = business.upiId ? business.upiId.trim() : null;
    if (!upiId || !upiIdRegex.test(upiId)) {
      const err: any = new Error('Please add your UPI ID in Business Settings to generate your payment QR.');
      err.code = 'UPI_NOT_CONFIGURED';
      err.statusCode = 400;
      throw err;
    }

    const { amount, note } = options;
    const numAmount = typeof amount === 'number' && amount > 0 && !isNaN(amount) ? amount : null;
    const cleanAmountStr = numAmount ? numAmount.toFixed(2) : null;

    let upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(business.name)}&cu=INR`;
    if (cleanAmountStr) {
      upiString += `&am=${cleanAmountStr}`;
    }
    if (note && note.trim()) {
      upiString += `&tn=${encodeURIComponent(note.trim())}`;
    }

    // Generate machine-scannable QR Data URL (high contrast)
    const qrDataUrl = await QRCode.toDataURL(upiString, {
      width: 350,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    });

    return {
      upiString,
      upiId,
      businessName: business.name,
      amount: numAmount,
      qrDataUrl,
    };
  }

  /**
   * Updates and verifies merchant's UPI ID in PostgreSQL
   */
  async updateBusinessUpi(businessId: string, upiId: string) {
    const clean = upiId ? upiId.trim().toLowerCase() : '';
    if (!clean || !upiIdRegex.test(clean)) {
      throw new Error('Invalid UPI ID format (e.g. shop@okhdfcbank or 9876543210@paytm)');
    }

    const updated = await prisma.business.update({
      where: { id: businessId },
      data: {
        upiId: clean,
        upiLinked: true,
      },
      select: { id: true, name: true, upiId: true, upiLinked: true },
    });

    // Keep digital store in sync
    await prisma.digitalStore.updateMany({
      where: { businessId },
      data: { upiId: clean },
    }).catch(() => {});

    return updated;
  }
}

export const upiService = new UpiService();
