import { Router } from 'express';
import { khataController } from '../controllers/khataController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireBusinessAccess } from '../middleware/businessAuthMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';
import { createKhataTxSchema, createPaymentReminderSchema } from '../validators/index.js';

const router = Router();

router.use(requireAuth);
router.use(requireBusinessAccess);

router.post('/transactions', validateBody(createKhataTxSchema), khataController.addTransaction);
router.get('/customers/:customerId/statement', khataController.getCustomerStatement);
router.get('/summary', khataController.getSummary);
router.post('/reminders', validateBody(createPaymentReminderSchema), khataController.createReminder);

export default router;
