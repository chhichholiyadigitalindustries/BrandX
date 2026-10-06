import { Router } from 'express';
import { contentController } from '../controllers/contentController.js';
import { validateBody } from '../middleware/validateMiddleware.js';
import { trackContentEventSchema } from '../validators/index.js';

const router = Router();

// Specific routes first to prevent :id param capturing
router.get('/today', contentController.getTodayContent);
router.get('/calendar', contentController.getCalendarFeed);
router.get('/festivals', contentController.listFestivals);
router.get('/festivals/:festivalId', contentController.getFestivalContent);
router.get('/categories', contentController.listCategories);
router.get('/posters', contentController.listPosters);
router.get('/date/:date', contentController.getContentByDate);
router.get('/media/*', contentController.streamMedia);

// Event tracking
router.post('/events', validateBody(trackContentEventSchema), contentController.trackEvent);

// General list & ID routes
router.get('/', contentController.listDailyContent);
router.get('/:id', contentController.getContentById);

export default router;
