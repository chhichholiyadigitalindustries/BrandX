import { Router } from 'express';
import { storeController } from '../controllers/storeController.js';
import { cardController } from '../controllers/cardController.js';
import { publicRateLimiter } from '../middleware/rateLimitMiddleware.js';

const router = Router();

// Apply public rate limiting
router.use(publicRateLimiter);

// Public Digital Dukaan Storefront
router.get('/store/:slug', storeController.getPublicStore);

// Public Digital NFC Visiting Card
router.get('/card/:slug', cardController.getPublicCard);
router.get('/card/:slug/vcard', cardController.downloadVCard);

export default router;
