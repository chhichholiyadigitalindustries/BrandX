import { Router } from 'express';
import { storeController } from '../controllers/storeController.js';
import { cardController } from '../controllers/cardController.js';
import { waitlistController } from '../controllers/waitlistController.js';
import { publicRateLimiter } from '../middleware/rateLimitMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';
import { createWaitlistSchema } from '../validators/index.js';

const router = Router();

// Apply public rate limiting
router.use(publicRateLimiter);

// Public Digital Dukaan Storefront
router.get('/store/:slug', storeController.getPublicStore);

// Public Digital NFC Visiting Card
router.get('/card/:slug', cardController.getPublicCard);
router.get('/card/:slug/vcard', cardController.downloadVCard);

// Public VIP Early Access Waitlist
router.post('/waitlist', validateBody(createWaitlistSchema), waitlistController.joinWaitlist);
router.get('/waitlist/count', waitlistController.getWaitlistCount);

export default router;

