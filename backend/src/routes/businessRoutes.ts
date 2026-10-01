import { Router } from 'express';
import { businessController } from '../controllers/businessController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';
import {
  createBusinessSchema,
  updateBusinessSchema,
  updateBusinessSettingsSchema,
} from '../validators/index.js';

const router = Router();

router.use(requireAuth);

router.get('/', businessController.listMyBusinesses);
router.get('/:id', businessController.getBusiness);
router.post('/', validateBody(createBusinessSchema), businessController.createBusiness);
router.patch('/:id', validateBody(updateBusinessSchema), businessController.updateBusiness);
router.patch('/:id/settings', validateBody(updateBusinessSettingsSchema), businessController.updateSettings);
router.delete('/:id', businessController.deleteBusiness);

export default router;
