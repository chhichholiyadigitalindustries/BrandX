import { Router } from 'express';
import { userController } from '../controllers/userController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';
import { updateUserProfileSchema } from '../validators/index.js';

const router = Router();

router.use(requireAuth);

router.get('/me', userController.getMe);
router.patch('/me', validateBody(updateUserProfileSchema), userController.updateMe);

export default router;
