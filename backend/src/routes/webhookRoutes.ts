import { Router } from 'express';
import { webhookController } from '../controllers/webhookController.js';

const router = Router();

// Gateway webhook endpoints
router.post('/payment', webhookController.handlePaymentWebhook);
router.post('/razorpay', (req, res) => {
  (req.params as any).provider = 'RAZORPAY';
  webhookController.handlePaymentWebhook(req, res);
});
router.post('/:provider', webhookController.handlePaymentWebhook);

export default router;
