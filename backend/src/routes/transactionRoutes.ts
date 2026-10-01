import { Router } from 'express';
import { khataController } from '../controllers/khataController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireBusinessAccess } from '../middleware/businessAuthMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';
import { updateKhataTxSchema } from '../validators/index.js';

const router = Router();

router.use(requireAuth);
router.use(requireBusinessAccess);

router.patch('/:id', validateBody(updateKhataTxSchema), khataController.updateTransaction);
router.delete('/:id', khataController.deleteTransaction);

export default router;
