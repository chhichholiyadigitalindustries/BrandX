import { Router } from 'express';
import { storeController } from '../controllers/storeController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireBusinessAccess } from '../middleware/businessAuthMiddleware.js';
import { requireProSubscription } from '../middleware/subscriptionMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';
import { publicRateLimiter } from '../middleware/rateLimitMiddleware.js';
import {
  createDigitalStoreSchema,
  updateDigitalStoreSchema,
  addStoreItemSchema,
  updateStoreItemSchema,
  reorderStoreItemsSchema,
} from '../validators/index.js';

const router = Router();

// Public storefront alias
router.get('/public/:slug', publicRateLimiter, storeController.getPublicStore);

// Authenticated Store Management
router.get('/', requireAuth, requireBusinessAccess, storeController.getMyStore);
router.get('/me', requireAuth, requireBusinessAccess, storeController.getMyStore);
router.post('/', requireAuth, requireBusinessAccess, requireProSubscription, validateBody(createDigitalStoreSchema), storeController.createStore);
router.patch('/me', requireAuth, requireBusinessAccess, requireProSubscription, validateBody(updateDigitalStoreSchema), storeController.updateStore);
router.post('/publish', requireAuth, requireBusinessAccess, requireProSubscription, storeController.publishStore);
router.post('/unpublish', requireAuth, requireBusinessAccess, requireProSubscription, storeController.unpublishStore);

// Showcase Items CRUD (Pro-gated)
router.post('/items', requireAuth, requireBusinessAccess, requireProSubscription, validateBody(addStoreItemSchema), storeController.addStoreItem);
router.patch('/items/:itemId', requireAuth, requireBusinessAccess, requireProSubscription, validateBody(updateStoreItemSchema), storeController.updateStoreItem);
router.delete('/items/:itemId', requireAuth, requireBusinessAccess, requireProSubscription, storeController.deleteStoreItem);
router.post('/items/reorder', requireAuth, requireBusinessAccess, requireProSubscription, validateBody(reorderStoreItemsSchema), storeController.reorderStoreItems);

// ID-parameterized routes
router.get('/:id', requireAuth, requireBusinessAccess, storeController.getStoreById);
router.patch('/:id', requireAuth, requireBusinessAccess, requireProSubscription, validateBody(updateDigitalStoreSchema), storeController.updateStore);
router.post('/:id/publish', requireAuth, requireBusinessAccess, requireProSubscription, storeController.publishStore);
router.post('/:id/unpublish', requireAuth, requireBusinessAccess, requireProSubscription, storeController.unpublishStore);
router.post('/:id/items', requireAuth, requireBusinessAccess, requireProSubscription, validateBody(addStoreItemSchema), storeController.addStoreItem);
router.patch('/:id/items/:itemId', requireAuth, requireBusinessAccess, requireProSubscription, validateBody(updateStoreItemSchema), storeController.updateStoreItem);
router.delete('/:id/items/:itemId', requireAuth, requireBusinessAccess, requireProSubscription, storeController.deleteStoreItem);
router.post('/:id/items/reorder', requireAuth, requireBusinessAccess, requireProSubscription, validateBody(reorderStoreItemsSchema), storeController.reorderStoreItems);

export default router;
