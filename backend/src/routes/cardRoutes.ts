import { Router } from 'express';
import { cardController } from '../controllers/cardController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireBusinessAccess } from '../middleware/businessAuthMiddleware.js';
import { requireProSubscription } from '../middleware/subscriptionMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';
import { publicRateLimiter } from '../middleware/rateLimitMiddleware.js';
import { createDigitalCardSchema, updateDigitalCardSchema } from '../validators/index.js';

const router = Router();

// Public endpoints aliases
router.get('/public/:slug', publicRateLimiter, cardController.getPublicCard);
router.get('/public/:slug/vcard', publicRateLimiter, cardController.downloadVCard);

// Authenticated Card Management
router.get('/', requireAuth, requireBusinessAccess, cardController.getMyCard);
router.get('/me', requireAuth, requireBusinessAccess, cardController.getMyCard);
router.post('/', requireAuth, requireBusinessAccess, requireProSubscription, validateBody(createDigitalCardSchema), cardController.createCard);
router.patch('/me', requireAuth, requireBusinessAccess, requireProSubscription, validateBody(updateDigitalCardSchema), cardController.updateCard);
router.post('/publish', requireAuth, requireBusinessAccess, requireProSubscription, cardController.publishCard);
router.post('/unpublish', requireAuth, requireBusinessAccess, requireProSubscription, cardController.unpublishCard);

// ID-parameterized routes
router.get('/:id', requireAuth, requireBusinessAccess, cardController.getCardById);
router.patch('/:id', requireAuth, requireBusinessAccess, requireProSubscription, validateBody(updateDigitalCardSchema), cardController.updateCard);
router.post('/:id/publish', requireAuth, requireBusinessAccess, requireProSubscription, cardController.publishCard);
router.post('/:id/unpublish', requireAuth, requireBusinessAccess, requireProSubscription, cardController.unpublishCard);

export default router;
