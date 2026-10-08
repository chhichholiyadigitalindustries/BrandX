/**
 * BRANDX — UPI QR & Payment Standee Routes
 * Centralized business UPI details and standee generator endpoints
 */
import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireBusinessAccess } from '../middleware/businessAuthMiddleware.js';
import { requireProSubscription } from '../middleware/subscriptionMiddleware.js';
import { upiService } from '../services/upiService.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

router.use(requireAuth);
router.use(requireBusinessAccess);

/**
 * GET /api/v1/upi/details
 * Retrieve authenticated business's UPI settings and linked VPA
 */
router.get('/details', async (req: Request, res: Response) => {
  try {
    const details = await upiService.getBusinessUpiDetails(req.businessId!);
    sendSuccess(res, details, 'Business UPI details retrieved');
  } catch (err: any) {
    sendError(res, err.message || 'Failed to retrieve UPI details', 400);
  }
});

/**
 * GET /api/v1/upi
 * Alias for retrieving UPI details
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const details = await upiService.getBusinessUpiDetails(req.businessId!);
    sendSuccess(res, details, 'Business UPI details retrieved');
  } catch (err: any) {
    sendError(res, err.message || 'Failed to retrieve UPI details', 400);
  }
});

/**
 * POST /api/v1/upi/generate-qr
 * Generate customized UPI payment string and QR standee metadata (Pro feature)
 */
router.post('/generate-qr', requireProSubscription, async (req: Request, res: Response) => {
  try {
    const { amount, note, theme } = req.body;
    const numAmount = amount !== undefined && amount !== null && amount !== '' ? parseFloat(amount) : null;

    const payload = await upiService.generateBusinessUpiPayload(req.businessId!, {
      amount: numAmount,
      note,
    });

    sendSuccess(res, {
      ...payload,
      theme: theme || 'classic',
    }, 'UPI QR Standee generated successfully');
  } catch (err: any) {
    const status = err.statusCode || (err.message?.includes('not found') ? 404 : 400);
    sendError(res, err.message || 'Failed to generate UPI QR', status);
  }
});

/**
 * POST /api/v1/upi/standee
 * Save or link custom UPI ID for business standee
 */
router.post('/standee', requireProSubscription, async (req: Request, res: Response) => {
  try {
    const { upiId } = req.body;
    if (!upiId || typeof upiId !== 'string') {
      sendError(res, 'Valid UPI ID is required', 400);
      return;
    }

    const updated = await upiService.updateBusinessUpi(req.businessId!, upiId);
    sendSuccess(res, updated, 'UPI Standee updated successfully');
  } catch (err: any) {
    sendError(res, err.message || 'Failed to update UPI standee', 400);
  }
});

/**
 * PATCH /api/v1/upi
 * Update authenticated business's UPI ID directly
 */
router.patch('/', async (req: Request, res: Response) => {
  try {
    const { upiId } = req.body;
    if (!upiId || typeof upiId !== 'string') {
      sendError(res, 'Valid UPI ID is required', 400);
      return;
    }

    const updated = await upiService.updateBusinessUpi(req.businessId!, upiId);
    sendSuccess(res, updated, 'Business UPI ID updated successfully');
  } catch (err: any) {
    sendError(res, err.message || 'Failed to update UPI ID', 400);
  }
});

// Wildcard fallback for any other POST /api/v1/upi/* requests
router.post('/*', requireProSubscription, (req: Request, res: Response) => {
  sendSuccess(res, { status: 'ok' }, 'Pro UPI Operation processed');
});

export default router;
