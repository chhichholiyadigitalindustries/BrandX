/**
 * BRANDX — Subscription & Payment Transaction Integration Test Suite
 *
 * Verifies:
 * 1. Pro Monthly (₹349) initiation, pending transaction & activation (new user)
 * 2. Pro Yearly (₹2,999) upgrade & activation (existing user)
 * 3. Idempotent duplicate verification handling
 * 4. Failed/tampered signature handling
 * 5. Missing/invalid plan error handling (clean application error, no Prisma crash)
 */

import { prisma } from '../src/config/database.js';
import { subscriptionService } from '../src/services/subscriptionService.js';
import { subscriptionRepository } from '../src/repositories/subscriptionRepository.js';
import { PaymentStatus, SubscriptionStatus } from '@prisma/client';
import crypto from 'crypto';

export async function runSubscriptionPaymentFlowTests() {
  console.log('\n--- 🧪 Testing Complete Subscription Payment Flow ---');

  const testMobile = `+9199999${Math.floor(10000 + Math.random() * 90000)}`;
  const testFirebaseUid = `test_uid_${Date.now()}`;
  let testUserId = '';
  let testBusinessId = '';

  try {
    // Setup test user
    const user = await prisma.user.create({
      data: {
        mobile: testMobile,
        firebaseUid: testFirebaseUid,
        name: 'Test Vyapari',
        status: 'ACTIVE',
        isPro: false,
      },
    });
    testUserId = user.id;
    console.log(`👤 Created test user: ${user.id} (${user.mobile})`);

    // =========================================================================
    // TEST 1: Pro Monthly Initiation & PaymentTransaction Creation (New User)
    // =========================================================================
    console.log('\n▶ Test 1: Pro Monthly Initiation (₹349) for New User...');
    const monthlyOrder = await subscriptionService.initiateSubscription(
      undefined, // No businessId passed, tests auto-creation
      testUserId,
      'pro_monthly'
    );

    if (monthlyOrder.plan.price !== 349) {
      throw new Error(`Expected price 349, got ${monthlyOrder.plan.price}`);
    }
    if (monthlyOrder.amount !== 34900) {
      throw new Error(`Expected amount in paise 34900, got ${monthlyOrder.amount}`);
    }

    const pendingTx = await subscriptionRepository.findTransactionByOrderId(monthlyOrder.orderId);
    if (!pendingTx) {
      throw new Error(`Pending transaction for order ${monthlyOrder.orderId} not found`);
    }
    if (pendingTx.status !== PaymentStatus.PENDING) {
      throw new Error(`Expected status PENDING, got ${pendingTx.status}`);
    }
    if (!pendingTx.planId) {
      throw new Error('PaymentTransaction.planId is null! Expected connected planId');
    }
    if (pendingTx.amount !== 349) {
      throw new Error(`Expected transaction amount 349, got ${pendingTx.amount}`);
    }

    testBusinessId = pendingTx.businessId!;
    console.log(`✅ Test 1 Passed: Order ${monthlyOrder.orderId} created with connected planId ${pendingTx.planId} (₹349).`);

    // =========================================================================
    // TEST 2: Pro Monthly Verification & Pro Activation
    // =========================================================================
    console.log('\n▶ Test 2: Pro Monthly Verification & Activation...');
    const paymentId1 = `pay_${Date.now()}_test1`;
    // Generate valid HMAC signature matching Razorpay paymentService logic
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || 'test_secret_key_mock_fallback';
    const signaturePayload1 = `${monthlyOrder.orderId}|${paymentId1}`;
    const validSignature1 = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(signaturePayload1)
      .digest('hex');

    const activatedSub1 = await subscriptionService.verifyAndActivateSubscription(
      testUserId,
      testBusinessId,
      {
        orderId: monthlyOrder.orderId,
        paymentId: paymentId1,
        signature: validSignature1,
        planCode: 'pro_monthly',
      }
    );

    if (!activatedSub1.isPro) {
      throw new Error('User was not marked isPro: true after activation');
    }

    const updatedUser = await prisma.user.findUnique({ where: { id: testUserId } });
    if (!updatedUser?.isPro) {
      throw new Error('Database User.isPro is not true');
    }

    const capturedTx = await subscriptionRepository.findTransactionByOrderId(monthlyOrder.orderId);
    if (capturedTx?.status !== PaymentStatus.CAPTURED) {
      throw new Error(`Expected transaction status CAPTURED, got ${capturedTx?.status}`);
    }

    const activeDbSub = await prisma.subscription.findFirst({
      where: { userId: testUserId, status: SubscriptionStatus.ACTIVE },
      include: { plan: true },
    });
    if (!activeDbSub) {
      throw new Error('No active subscription record found in database');
    }
    if (activeDbSub.plan.code !== 'pro_monthly') {
      throw new Error(`Expected active plan pro_monthly, got ${activeDbSub.plan.code}`);
    }
    console.log(`✅ Test 2 Passed: User activated Pro Monthly. Period: 30 days. Plan ID: ${activeDbSub.planId}`);

    // =========================================================================
    // TEST 3: Idempotent Duplicate Verification Handling
    // =========================================================================
    console.log('\n▶ Test 3: Idempotent duplicate verification...');
    const duplicateVerifyResult = await subscriptionService.verifyAndActivateSubscription(
      testUserId,
      testBusinessId,
      {
        orderId: monthlyOrder.orderId,
        paymentId: paymentId1,
        signature: validSignature1,
        planCode: 'pro_monthly',
      }
    );

    if (!duplicateVerifyResult.isPro) {
      throw new Error('Duplicate verification did not return active Pro subscription');
    }
    const totalSubsCount = await prisma.subscription.count({
      where: { userId: testUserId },
    });
    if (totalSubsCount !== 1) {
      throw new Error(`Expected 1 subscription, got ${totalSubsCount}`);
    }
    console.log('✅ Test 3 Passed: Duplicate verification handled idempotently without creating duplicate records.');

    // =========================================================================
    // TEST 4: Pro Yearly (₹2,999) Upgrade for Existing User
    // =========================================================================
    console.log('\n▶ Test 4: Pro Yearly Upgrade (₹2,999) for Existing User...');
    const yearlyOrder = await subscriptionService.initiateSubscription(
      testBusinessId,
      testUserId,
      'pro_yearly'
    );

    if (yearlyOrder.plan.price !== 2999) {
      throw new Error(`Expected price 2999, got ${yearlyOrder.plan.price}`);
    }
    if (yearlyOrder.amount !== 299900) {
      throw new Error(`Expected amount in paise 299900, got ${yearlyOrder.amount}`);
    }

    const paymentId2 = `pay_${Date.now()}_test2`;
    const signaturePayload2 = `${yearlyOrder.orderId}|${paymentId2}`;
    const validSignature2 = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(signaturePayload2)
      .digest('hex');

    const activatedSub2 = await subscriptionService.verifyAndActivateSubscription(
      testUserId,
      testBusinessId,
      {
        orderId: yearlyOrder.orderId,
        paymentId: paymentId2,
        signature: validSignature2,
        planCode: 'pro_yearly',
      }
    );

    if (!activatedSub2.isPro) {
      throw new Error('User is not Pro after yearly upgrade');
    }

    // Check old monthly subscription is marked EXPIRED
    const expiredOldSub = await prisma.subscription.findUnique({
      where: { id: activeDbSub.id },
    });
    if (expiredOldSub?.status !== SubscriptionStatus.EXPIRED) {
      throw new Error(`Expected previous monthly sub to be EXPIRED, got ${expiredOldSub?.status}`);
    }

    // Check new yearly subscription is ACTIVE
    const activeYearlySub = await prisma.subscription.findFirst({
      where: { userId: testUserId, status: SubscriptionStatus.ACTIVE },
      include: { plan: true },
    });
    if (!activeYearlySub || activeYearlySub.plan.code !== 'pro_yearly') {
      throw new Error('New yearly subscription is not active');
    }
    console.log(`✅ Test 4 Passed: Successfully upgraded to Pro Annual (₹2,999). Old subscription expired cleanly.`);

    // =========================================================================
    // TEST 5: Failed Payment / Tampered Signature Handling
    // =========================================================================
    console.log('\n▶ Test 5: Failed/Tampered Signature Handling...');
    const failOrder = await subscriptionService.initiateSubscription(
      testBusinessId,
      testUserId,
      'pro_monthly'
    );

    let caughtError = false;
    try {
      await subscriptionService.verifyAndActivateSubscription(
        testUserId,
        testBusinessId,
        {
          orderId: failOrder.orderId,
          paymentId: `pay_tampered_${Date.now()}`,
          signature: 'invalid_tampered_signature_12345',
          planCode: 'pro_monthly',
        }
      );
    } catch (err: any) {
      caughtError = true;
      console.log(`   Captured controlled error: ${err.message}`);
    }

    if (!caughtError) {
      throw new Error('Tampered signature did not throw verification error');
    }

    const failedTx = await subscriptionRepository.findTransactionByOrderId(failOrder.orderId);
    if (failedTx?.status !== PaymentStatus.FAILED) {
      throw new Error(`Expected transaction to be marked FAILED, got ${failedTx?.status}`);
    }
    console.log('✅ Test 5 Passed: Tampered signature rejected and transaction marked FAILED.');

    // =========================================================================
    // TEST 6: Missing / Invalid Plan Error Handling (Controlled Application Error)
    // =========================================================================
    console.log('\n▶ Test 6: Controlled Error on Non-Existent Plan Code...');
    let caughtMissingPlan = false;
    try {
      await subscriptionService.initiateSubscription(
        testBusinessId,
        testUserId,
        'non_existent_plan_xyz'
      );
    } catch (err: any) {
      caughtMissingPlan = true;
      if (!err.message.includes('not found') && !err.message.includes('Invalid plan code')) {
        throw new Error(`Unexpected error message: ${err.message}`);
      }
      console.log(`   Captured clean application error: ${err.message}`);
    }

    if (!caughtMissingPlan) {
      throw new Error('Non-existent plan did not throw validation error');
    }
    console.log('✅ Test 6 Passed: Missing plan produced clear controlled error without Prisma crash.');

    console.log('\n🎉 ALL SUBSCRIPTION PAYMENT FLOW TESTS PASSED SUCCESSFULLY!');
  } finally {
    // Clean up test records
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
      console.log('✅ Test database records cleaned up cleanly.');
    }
  }
}

// Direct execution
if (process.argv[1]?.endsWith('subscriptionPaymentFlow.test.ts') || process.argv[1]?.endsWith('subscriptionPaymentFlow.test.js')) {
  runSubscriptionPaymentFlowTests()
    .then(() => {
      console.log('Test suite completed successfully.');
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
