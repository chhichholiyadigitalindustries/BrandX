import { Router } from 'express';
import { mediaController } from '../controllers/mediaController.js';
import { requireUserOrAdminAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Upload requires user or admin session
router.post('/upload', requireUserOrAdminAuth, mediaController.uploadMedia);

// Public binary media stream for <img> and browser media rendering
router.get('/asset/:idOrKey', mediaController.streamMedia);
router.get('/:idOrKey', mediaController.streamMedia);
router.get('/*', mediaController.streamMedia);

export default router;
