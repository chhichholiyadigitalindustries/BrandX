import { Router } from 'express';
import { invoiceController } from '../controllers/invoiceController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireBusinessAccess } from '../middleware/businessAuthMiddleware.js';
import { requireProSubscription, requireInvoiceCreationAccess } from '../middleware/subscriptionMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';
import { createInvoiceSchema, recordInvoicePaymentSchema } from '../validators/index.js';

const router = Router();

router.use(requireAuth);
router.use(requireBusinessAccess);

// Read endpoints
router.get('/', invoiceController.listInvoices);
router.get('/summary', invoiceController.getInvoiceSummary);
router.get('/:id', invoiceController.getInvoice);
router.get('/:id/payments', invoiceController.getInvoicePayments);
router.get('/:id/summary', invoiceController.getInvoiceSummary);

// Generation & mutation endpoints
router.post('/', requireInvoiceCreationAccess, validateBody(createInvoiceSchema), invoiceController.createInvoice);
router.post('/generate', requireInvoiceCreationAccess, validateBody(createInvoiceSchema), invoiceController.createInvoice);
router.post('/:id/issue', requireProSubscription, invoiceController.issueInvoice);
router.post('/:id/cancel', requireProSubscription, invoiceController.cancelInvoice);
router.post('/:id/payments', requireProSubscription, validateBody(recordInvoicePaymentSchema), invoiceController.recordPayment);

export default router;
