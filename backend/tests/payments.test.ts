import { paymentProvider } from '../src/integrations/paymentProvider.js';

export async function testPaymentAbstraction() {
  console.log('\n--- 🧪 Testing Payment Provider & Webhook Verification ---');

  // Test 1: Order creation
  const order = await paymentProvider.createOrder({
    amount: 199,
    currency: 'INR',
    receipt: 'rcpt_test_01',
    notes: { plan: 'pro_monthly' },
  });

  if (!order.orderId || order.amount !== 199) {
    throw new Error('Payment order creation failed');
  }
  console.log(`✅ Order created successfully: ${order.orderId} (₹${order.amount}).`);

  // Test 2: Payment verification
  const verification = await paymentProvider.verifyPayment({
    orderId: order.orderId,
    paymentId: 'pay_test_12345',
  });

  if (!verification.isValid || verification.status !== 'SUCCESS') {
    throw new Error('Payment verification failed');
  }
  console.log(`✅ Payment verification confirmed for ${verification.paymentId}.`);
}
