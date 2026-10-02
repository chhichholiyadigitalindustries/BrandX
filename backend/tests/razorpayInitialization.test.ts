/**
 * BRANDX — Razorpay Initialization & Order Creation Test Suite
 *
 * Verifies:
 * 1. Environment variable resolution (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)
 * 2. Key format acceptance (rzp_test_... accepted, placeholder rejected)
 * 3. Strict production safety (no mock orders in production, clear controlled errors)
 * 4. Pro Monthly (₹349) order creation & SubscriptionPlan relation connect
 * 5. Pro Yearly (₹2,999) order creation & SubscriptionPlan relation connect
 * 6. Cryptographic payment signature verification & tampered signature rejection
 * 7. Verification that database records cleanup cleanly without leaving artifacts
 */

import { prisma } from '../src/config/database.js';
import { subscriptionService } from '../src/services/subscriptionService.js';
import { subscriptionRepository } from '../src/repositories/subscriptionRepository.js';
import { RazorpayPaymentProvider } from '../src/payments/providers/razorpay.provider.js';
import { PaymentStatus } from '@prisma/client';
import crypto from 'crypto';

export async function runRazorpayInitTests() {
  console.log('\n--- 🧪 Testing Razorpay Initialization & Order Flow ---');

  const provider = new RazorpayPaymentProvider();

  // =========================================================================
  // TEST 1: Environment Variable Resolution & Key Format Validation
  // =========================================================================
  console.log('\n▶ Test 1: Testing Key Resolution & Format Validation...');
  
  // Save original env values
  const origKeyId = process.env.RAZORPAY_KEY_ID;
  const origSecret = process.env.RAZORPAY_KEY_SECRET;
  const origNodeEnv = process.env.NODE_ENV;

  try {
    // 1a. Test resolution when RAZORPAY_KEY_ID is set
    process.env.RAZORPAY_KEY_ID = 'rzp_test_sandbox_sample_key_999';
    process.env.RAZORPAY_KEY_SECRET = 'sandbox_secret_sample_9876543210';
    if (provider.getKeyId() !== 'rzp_test_sandbox_sample_key_999') {
      throw new Error(`Expected getKeyId to return RAZORPAY_KEY_ID, got ${provider.getKeyId()}`);
    }
    if (!provider.isConfigured()) {
      throw new Error('Expected provider.isConfigured() to be true for valid rzp_test_ key');
    }
    console.log('   ✅ Valid rzp_test_ key is correctly accepted and resolved.');

    // 1b. Test rejection of placeholder and mock strings
    process.env.RAZORPAY_KEY_ID = 'rzp_test_placeholder';
    process.env.RAZORPAY_KEY_SECRET = 'rzp_test_placeholder_secret';
    if (provider.isConfigured()) {
      throw new Error('Expected provider.isConfigured() to be FALSE for placeholder key');
    }
    process.env.RAZORPAY_KEY_ID = 'rzp_test_mock_offline';
    process.env.RAZORPAY_KEY_SECRET = 'secret_mock_offline';
    if (provider.isConfigured()) {
      throw new Error('Expected provider.isConfigured() to be FALSE for mock key');
    }
    console.log('   ✅ Keys containing "placeholder" or "mock" are safely treated as unconfigured.');

    // 1c. Test production safety - must throw controlled error, NO mock order
    process.env.NODE_ENV = 'production';
    let prodErrorThrown = false;
    try {
      await provider.createOrder({
        amount: 349,
        currency: 'INR',
        receipt: 'rcpt_test_prod_check',
      });
    } catch (err: any) {
      prodErrorThrown = true;
      if (!err.message.includes('not initialized or configured')) {
        throw new Error(`Unexpected error message in production unconfigured check: ${err.message}`);
      }
      console.log(`   ✅ Controlled production error captured: "${err.message}"`);
    }

    if (!prodErrorThrown) {
      throw new Error('Provider failed to throw controlled error in production when unconfigured!');
    }
    console.log('✅ Test 1 Passed: Key resolution, format validation, and production safety verified.');
  } finally {
    // Restore env values
    if (origKeyId) process.env.RAZORPAY_KEY_ID = origKeyId; else delete process.env.RAZORPAY_KEY_ID;
    if (origSecret) process.env.RAZORPAY_KEY_SECRET = origSecret; else delete process.env.RAZORPAY_KEY_SECRET;
    if (origNodeEnv) process.env.NODE_ENV = origNodeEnv; else delete process.env.NODE_ENV;
  }

  // =========================================================================
  // Setup Test User for Subscription Flow Tests
  // =========================================================================
  const testMobile = `+9188888${Math.floor(10000 + Math.random() * 90000)}`;
  const testFirebaseUid = `test_razorpay_uid_${Date.now()}`;
  let testUserId = '';
  let testBusinessId = '';

  try {
    const user = await prisma.user.create({
      data: {
        mobile: testMobile,
        firebaseUid: testFirebaseUid,
        name: 'Razorpay Test User',
        status: 'ACTIVE',
        isPro: false,
      },
    });
    testUserId = user.id;

    // Use test mock environment for order creation verification
    process.env.NODE_ENV = 'test';
    process.env.ALLOW_MOCK_PAYMENT = 'true';
    process.env.RAZORPAY_KEY_ID = 'rzp_test_mock_offline_key';
    process.env.RAZORPAY_KEY_SECRET = 'mock_secret_key_for_testing_12345';

    // =========================================================================
    // TEST 2: Pro Monthly (₹349) Order Creation & Plan Linking
    // =========================================================================
    console.log('\n▶ Test 2: Pro Monthly (₹349) Order Creation & Plan Linking...');
    const monthlyOrder = await subscriptionService.createPaymentOrder(
      testUserId,
      undefined, // auto-creates business
      'pro_monthly'
    );

    if (monthlyOrder.amount !== 34900) {
      throw new Error(`Expected order.amount to be 34900 paise, got ${monthlyOrder.amount}`);
    }
    if (monthlyOrder.plan.price !== 349) {
      throw new Error(`Expected plan.price to be 349, got ${monthlyOrder.plan.price}`);
    }
    if (monthlyOrder.planName !== 'Pro Monthly') {
      throw new Error(`Expected planName "Pro Monthly", got ${monthlyOrder.planName}`);
    }

    const monthlyTx = await subscriptionRepository.findTransactionByOrderId(monthlyOrder.orderId);
    if (!monthlyTx) {
      throw new Error(`Transaction for order ${monthlyOrder.orderId} not found in database`);
    }
    if (monthlyTx.status !== PaymentStatus.PENDING) {
      throw new Error(`Expected transaction status PENDING, got ${monthlyTx.status}`);
    }
    if (!monthlyTx.planId) {
      throw new Error('Transaction planId is null! Expected foreign key connect to SubscriptionPlan');
    }
    testBusinessId = monthlyTx.businessId!;

    const linkedMonthlyPlan = await prisma.subscriptionPlan.findUnique({
      where: { id: monthlyTx.planId },
    });
    if (linkedMonthlyPlan?.code !== 'pro_monthly' || linkedMonthlyPlan.price !== 349) {
      throw new Error(`Linked plan mismatch: ${JSON.stringify(linkedMonthlyPlan)}`);
    }
    console.log(`✅ Test 2 Passed: Pro Monthly order created with connected planId "${monthlyTx.planId}" (₹349, 34,900 paise).`);

    // =========================================================================
    // TEST 3: Pro Yearly (₹2,999) Order Creation & Plan Linking
    // =========================================================================
    console.log('\n▶ Test 3: Pro Yearly (₹2,999) Order Creation & Plan Linking...');
    const yearlyOrder = await subscriptionService.createPaymentOrder(
      testUserId,
      testBusinessId,
      'pro_yearly'
    );

    if (yearlyOrder.amount !== 299900) {
      throw new Error(`Expected order.amount to be 299900 paise, got ${yearlyOrder.amount}`);
    }
    if (yearlyOrder.plan.price !== 2999) {
      throw new Error(`Expected plan.price to be 2999, got ${yearlyOrder.plan.price}`);
    }
    if (yearlyOrder.planName !== 'Pro Annual') {
      throw new Error(`Expected planName "Pro Annual", got ${yearlyOrder.planName}`);
    }

    const yearlyTx = await subscriptionRepository.findTransactionByOrderId(yearlyOrder.orderId);
    if (!yearlyTx) {
      throw new Error(`Transaction for order ${yearlyOrder.orderId} not found`);
    }
    const linkedYearlyPlan = await prisma.subscriptionPlan.findUnique({
      where: { id: yearlyTx.planId! },
    });
    if (linkedYearlyPlan?.code !== 'pro_yearly' || linkedYearlyPlan.price !== 2999) {
      throw new Error(`Linked plan mismatch: ${JSON.stringify(linkedYearlyPlan)}`);
    }
    console.log(`✅ Test 3 Passed: Pro Yearly order created with connected planId "${yearlyTx.planId}" (₹2,999, 299,900 paise).`);

    // =========================================================================
    // TEST 4: Signature Verification & Pro Activation
    // =========================================================================
    console.log('\n▶ Test 4: Signature Verification & Pro Activation...');
    const paymentId = `pay_${Date.now()}_test`;
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${monthlyOrder.orderId}|${paymentId}`)
      .digest('hex');

    const verifyResult = await subscriptionService.verifyAndActivateSubscription(
      testUserId,
      testBusinessId,
      {
        orderId: monthlyOrder.orderId,
        paymentId,
        signature,
        planCode: 'pro_monthly',
      }
    );

    if (!verifyResult.isPro) {
      throw new Error('User isPro was not updated to true after payment verification');
    }
    console.log('✅ Test 4 Passed: Payment signature verified and Pro subscription activated.');

    // =========================================================================
    // TEST 5: Tampered Signature Rejection
    // =========================================================================
    console.log('\n▶ Test 5: Tampered Signature Rejection...');
    let tamperedCaught = false;
    try {
      await subscriptionService.verifyAndActivateSubscription(
        testUserId,
        testBusinessId,
        {
          orderId: yearlyOrder.orderId,
          paymentId: `pay_tampered_${Date.now()}`,
          signature: 'completely_forged_signature_1234567890abcdef',
          planCode: 'pro_yearly',
        }
      );
    } catch (err: any) {
      tamperedCaught = true;
      console.log(`   ✅ Tampered signature correctly rejected: "${err.message}"`);
    }

    if (!tamperedCaught) {
      throw new Error('Tampered signature did not trigger verification rejection!');
    }
    console.log('✅ Test 5 Passed: Tampered signature safely rejected.');

    console.log('\n🎉 ALL RAZORPAY INITIALIZATION & ORDER FLOW TESTS PASSED SUCCESSFULLY!');
  } finally {
    // Clean up test data
    console.log('\n🧹 Cleaning up test database records...');
    if (testUserId) {
      await prisma.paymentTransaction.deleteMany({ where: { userId: testUserId } });
      await prisma.subscription.deleteMany({ where: { userId: testUserId } });
      await prisma.auditLog.deleteMany({ where: { actorId: testUserId } });
      if (testBusinessId) {
        await prisma.businessSettings.deleteMany({ where: { businessId: testBusinessId } });
        await prisma.business.deleteMany({ where: { id: testBusinessId } });
      }
      await prisma.user.deleteMany({ where: { id: testUserId } });
      console.log('✅ Test records cleaned up.');
    }
  }
}

// Direct execution
if (process.argv[1]?.endsWith('razorpayInitialization.test.ts') || process.argv[1]?.endsWith('razorpayInitialization.test.js')) {
  runRazorpayInitTests()
    .then(() => {
      console.log('Razorpay test suite finished with 0 errors.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Test suite failed:', err);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
