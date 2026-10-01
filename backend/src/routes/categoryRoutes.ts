import { Router } from 'express';
import { categoryController } from '../controllers/categoryController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireBusinessAccess } from '../middleware/businessAuthMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';
import { createProductCategorySchema, updateProductCategorySchema } from '../validators/index.js';

const router = Router();

router.use(requireAuth);
router.use(requireBusinessAccess);

router.get('/', categoryController.listCategories);
router.get('/:id', categoryController.getCategory);
router.post('/', validateBody(createProductCategorySchema), categoryController.createCategory);
router.patch('/:id', validateBody(updateProductCategorySchema), categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

export default router;
