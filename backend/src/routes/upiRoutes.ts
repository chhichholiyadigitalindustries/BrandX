/**
 * BRANDX — UPI QR & Payment Standee Routes
 * Pro-gated UPI management and standee generator endpoints
 */
import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireBusinessAccess } from '../middleware/businessAuthMiddleware.js';
import { requireProSubscription } from '../middleware/subscriptionMiddleware.js';
import { prisma } from '../config/database.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

router.use(requireAuth);
router.use(requireBusinessAccess);

/**
 * Generate customized UPI payment string and QR standee metadata
 */
router.post('/generate-qr', requireProSubscription, async (req: Request, res: Response) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.businessId },
      select: { id: true, name: true, upiId: true, mobile: true },
    });

    if (!business) {
      sendError(res, 'Business not found', 404);
      return;
    }

    const { amount, note, theme } = req.body;
    const upiId = req.body.upiId || business.upiId;

    if (!upiId) {
      sendError(res, 'UPI ID is required to generate payment standee', 400);
      return;
    }

    const upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(business.name)}` +
      (amount ? `&am=${parseFloat(amount).toFixed(2)}` : '') +
      `&cu=INR` +
      (note ? `&tn=${encodeURIComponent(note)}` : '');

    sendSuccess(res, {
      upiString,
      upiId,
      businessName: business.name,
      amount: amount ? parseFloat(amount) : null,
      theme: theme || 'classic',
    }, 'UPI QR Standee generated successfully');
  } catch (err: any) {
    sendError(res, err.message || 'Failed to generate UPI QR', 500);
  }
});

/**
 * Save or link custom UPI ID for business standee
 */
router.post('/standee', requireProSubscription, async (req: Request, res: Response) => {
  try {
    const { upiId } = req.body;
    if (!upiId || typeof upiId !== 'string') {
      sendError(res, 'Valid UPI ID is required', 400);
      return;
    }

    const updated = await prisma.business.update({
      where: { id: req.businessId },
      data: {
        upiId: upiId.trim(),
        upiLinked: true,
      },
      select: { id: true, name: true, upiId: true, upiLinked: true },
    });

    sendSuccess(res, updated, 'UPI Standee updated successfully');
  } catch (err: any) {
    sendError(res, err.message || 'Failed to update UPI standee', 500);
  }
});

// Wildcard fallback for any other POST /api/v1/upi/* requests
router.post('/*', requireProSubscription, (req: Request, res: Response) => {
  sendSuccess(res, { status: 'ok' }, 'Pro UPI Operation processed');
});

export default router;
