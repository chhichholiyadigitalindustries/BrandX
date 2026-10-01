import { Router } from 'express';
import { customerController } from '../controllers/customerController.js';
import { khataController } from '../controllers/khataController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireBusinessAccess } from '../middleware/businessAuthMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';
import {
  createCustomerSchema,
  updateCustomerSchema,
  createKhataTxSchema,
} from '../validators/index.js';

const router = Router();

router.use(requireAuth);
router.use(requireBusinessAccess);

// Customer CRUD
router.get('/', customerController.listCustomers);
router.get('/:id', customerController.getCustomer);
router.post('/', validateBody(createCustomerSchema), customerController.createCustomer);
router.patch('/:id', validateBody(updateCustomerSchema), customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);

// Customer-scoped Khata Transactions & Statements
router.post('/:customerId/transactions', validateBody(createKhataTxSchema), khataController.addTransaction);
router.get('/:customerId/transactions', khataController.listTransactions);
router.get('/:customerId/khata-summary', khataController.getCustomerSummary);
router.get('/:customerId/statement', khataController.getCustomerStatement);
router.get('/:customerId/reminder', khataController.generateReminder);
router.post('/:customerId/reminder', khataController.generateReminder);

export default router;
