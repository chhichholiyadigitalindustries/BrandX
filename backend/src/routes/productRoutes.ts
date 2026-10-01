import { Router } from 'express';
import { productController } from '../controllers/productController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireBusinessAccess } from '../middleware/businessAuthMiddleware.js';
import { requireProSubscription } from '../middleware/subscriptionMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';
import {
  createProductSchema,
  updateProductSchema,
  stockChangeSchema,
  stockAdjustmentSchema,
} from '../validators/index.js';

const router = Router();

router.use(requireAuth);
router.use(requireBusinessAccess);

// Read endpoints
router.get('/', productController.listProducts);
router.get('/:id', productController.getProduct);
router.get('/:id/stock-summary', productController.getStockSummary);
router.get('/:id/stock-history', productController.listStockHistory);

// Pro-gated catalog mutations
router.post('/', requireProSubscription, validateBody(createProductSchema), productController.createProduct);
router.patch('/:id', requireProSubscription, validateBody(updateProductSchema), productController.updateProduct);
router.delete('/:id', requireProSubscription, productController.deleteProduct);

// Stock management & history routes (Pro features)
router.post('/:id/stock', requireProSubscription, validateBody(stockChangeSchema), productController.changeStock);
router.post('/:id/stock-adjustment', requireProSubscription, validateBody(stockAdjustmentSchema), productController.adjustStock);

export default router;
