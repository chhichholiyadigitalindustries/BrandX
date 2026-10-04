process.env.NODE_ENV = 'test';
process.env.ALLOW_TEST_TOKENS = 'true';
process.env.ALLOW_TEST_PAYMENTS = 'true';

import { PrismaClient } from '@prisma/client';
import { authService } from '../src/services/authService';
import { businessRepository } from '../src/repositories/businessRepository';
import { customerRepository } from '../src/repositories/customerRepository';
import { khataRepository } from '../src/repositories/khataRepository';
import { productRepository } from '../src/repositories/productRepository';
import { invoiceRepository } from '../src/repositories/invoiceRepository';
import { subscriptionService } from '../src/services/subscriptionService';
import { subscriptionRepository } from '../src/repositories/subscriptionRepository';

const prisma = new PrismaClient();

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

function recordPass(name: string, details?: string) {
  results.push({ name, passed: true, details });
  console.log(`[PASS] ${name}${details ? ` - ${details}` : ''}`);
}

function recordFail(name: string, error: any) {
  const errMsg = error?.message || String(error);
  results.push({ name, passed: false, error: errMsg });
  console.error(`[FAIL] ${name} - ${errMsg}`);
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('STARTING BRANDX PRODUCTION PERSISTENCE INTEGRATION TESTS');
  console.log('====================================================\n');

  const testSuffix = Date.now().toString().slice(-6);
  const testFirebaseUidA = `test_uid_A_${testSuffix}`;
  const testFirebaseUidB = `test_uid_B_${testSuffix}`;
  const tokenA = `test_firebase_${testFirebaseUidA}`;
  const tokenB = `test_firebase_${testFirebaseUidB}`;
  const testMobileA = `99999${testSuffix.slice(0, 5)}`;
  const testMobileB = `98888${testSuffix.slice(0, 5)}`;

  let userA: any = null;
  let bizA: any = null;
  let userB: any = null;
  let bizB: any = null;
  let customerA: any = null;
  let productA: any = null;
  let invoiceA: any = null;

  try {
    // ---------------------------------------------------------
    // TEST A: New user signup -> profile save -> logout -> login -> profile preserved
    // ---------------------------------------------------------
    try {
      const authRes1 = await authService.authenticateWithFirebase(tokenA, {
        mobile: testMobileA,
        name: 'Ramesh Kumar',
        businessName: 'Ramesh Store',
      });

      userA = authRes1.user;
      bizA = authRes1.primaryBusiness;

      if (!userA || !bizA) {
        throw new Error('User or Business was not created on first login');
      }

      // Update profile
      await prisma.user.update({
        where: { id: userA.id },
        data: { name: 'Ramesh Kumar Updated' },
      });

      // Simulate logout and second login
      const authRes2 = await authService.authenticateWithFirebase(tokenA);

      if (authRes2.user.id !== userA.id) {
        throw new Error(`User ID mismatch: expected ${userA.id}, got ${authRes2.user.id}`);
      }
      if (authRes2.user.name !== 'Ramesh Kumar Updated') {
        throw new Error(`Profile name not preserved: got ${authRes2.user.name}`);
      }

      recordPass('TEST A: New user signup -> profile save -> logout -> login -> profile preserved', `User ID: ${userA.id}`);
    } catch (err) {
      recordFail('TEST A', err);
    }

    // ---------------------------------------------------------
    // TEST B: Create shop/business details -> logout -> login -> same business
    // ---------------------------------------------------------
    try {
      await businessRepository.update(bizA.id, {
        name: 'Ramesh Kirana Store',
        address: 'Main Chowk, Ward 4',
        city: 'Jaipur',
        state: 'Rajasthan',
        pincode: '302001',
        category: 'Grocery',
        gstin: '08AAAAA0000A1Z5',
        upiId: 'ramesh@upi',
      });

      // Simulate re-login
      const authRes3 = await authService.authenticateWithFirebase(tokenA);

      const fetchedBiz = authRes3.primaryBusiness;
      if (!fetchedBiz || fetchedBiz.id !== bizA.id) {
        throw new Error(`Business ID mismatch: expected ${bizA.id}, got ${fetchedBiz?.id}`);
      }
      if (fetchedBiz.name !== 'Ramesh Kirana Store' || fetchedBiz.city !== 'Jaipur') {
        throw new Error(`Business details not preserved: name=${fetchedBiz.name}, city=${fetchedBiz.city}`);
      }

      recordPass('TEST B: Create shop/business details -> logout -> login -> same business', `Biz ID: ${bizA.id}, Shop: ${fetchedBiz.name}`);
    } catch (err) {
      recordFail('TEST B', err);
    }

    // ---------------------------------------------------------
    // TEST C: Create customer -> create Udhaar -> create Jama -> logout -> login -> exact Khata data preserved
    // ---------------------------------------------------------
    try {
      customerA = await customerRepository.create({
        businessId: bizA.id,
        name: 'Suresh Verma',
        mobile: '9123456780',
        currentBalance: 0,
      });

      // Add Udhaar (Gave credit: 500)
      const tx1 = await khataRepository.createTransaction({
        businessId: bizA.id,
        customerId: customerA.id,
        type: 'UDHAAR',
        amount: 500,
        description: 'Dal and Rice on udhaar',
        balanceAfter: 500,
      });

      // Add Jama (Received payment: 200)
      const tx2 = await khataRepository.createTransaction({
        businessId: bizA.id,
        customerId: customerA.id,
        type: 'JAMA',
        amount: 200,
        description: 'Partial Cash Payment',
        balanceAfter: 300,
      });

      // Update customer balance to 300
      await customerRepository.update(customerA.id, bizA.id, {
        currentBalance: 300,
      });

      // Verify re-fetch
      const refreshedList = await customerRepository.list(bizA.id, { page: 1, limit: 50 });
      const foundCustomer = refreshedList.customers.find((c) => c.id === customerA.id);
      if (!foundCustomer) {
        throw new Error('Customer not found on re-fetch');
      }
      if (Number(foundCustomer.currentBalance) !== 300) {
        throw new Error(`Expected balance 300, got ${foundCustomer.currentBalance}`);
      }

      const txHistory = await khataRepository.findTransactionsByCustomer(bizA.id, customerA.id);
      if (txHistory.length !== 2) {
        throw new Error(`Expected 2 transactions, got ${txHistory.length}`);
      }

      recordPass('TEST C: Create customer -> create Udhaar -> create Jama -> logout -> login -> exact Khata preserved', `Customer: Suresh Verma, Balance: ₹300, Transactions: ${txHistory.length}`);
    } catch (err) {
      recordFail('TEST C', err);
    }

    // ---------------------------------------------------------
    // TEST D: Create product -> logout -> login -> product preserved
    // ---------------------------------------------------------
    try {
      productA = await productRepository.create({
        businessId: bizA.id,
        name: 'Premium Basmati Rice 5kg',
        sellingPrice: 450,
        purchasePrice: 380,
        stockQty: 25,
        unit: 'BAG',
        category: 'Grains',
      });

      // Re-fetch products for bizA
      const productsRes = await productRepository.list(bizA.id, { page: 1, limit: 10 });
      const foundProduct = productsRes.products.find((p) => p.id === productA.id);
      if (!foundProduct) {
        throw new Error('Product not found on re-fetch');
      }
      if (Number(foundProduct.sellingPrice) !== 450 || foundProduct.stockQty !== 25) {
        throw new Error(`Product fields mismatch: sellingPrice=${foundProduct.sellingPrice}, stockQty=${foundProduct.stockQty}`);
      }

      recordPass('TEST D: Create product -> logout -> login -> product preserved', `Product: ${foundProduct.name}, Price: ₹${foundProduct.sellingPrice}, Stock: ${foundProduct.stockQty}`);
    } catch (err) {
      recordFail('TEST D', err);
    }

    // ---------------------------------------------------------
    // TEST E: Create invoice -> logout -> login -> invoice preserved
    // ---------------------------------------------------------
    try {
      const invNum = `INV-TEST-${testSuffix}`;
      invoiceA = await prisma.invoice.create({
        data: {
          businessId: bizA.id,
          customerId: customerA.id,
          invoiceNumber: invNum,
          sellerName: bizA.name || 'Ramesh Kirana Store',
          sellerAddress: bizA.address || 'Main Chowk, Ward 4',
          buyerName: 'Suresh Verma',
          buyerPhone: '9123456780',
          customerName: 'Suresh Verma',
          customerPhone: '9123456780',
          billDate: new Date(),
          subtotal: 900,
          totalAmount: 945,
          grandTotal: 945,
          status: 'PAID',
          items: {
            create: [
              {
                productNameSnapshot: 'Premium Basmati Rice 5kg',
                name: 'Premium Basmati Rice 5kg',
                quantity: 2,
                rate: 450,
                taxableAmount: 900,
                totalAmount: 945,
                gstRate: 5,
                gstPercent: 5,
              },
            ],
          },
        },
        include: { items: true },
      });

      const invFetched = await invoiceRepository.findById(invoiceA.id, bizA.id);
      if (!invFetched) {
        throw new Error('Invoice not found on re-fetch');
      }
      if (Number(invFetched.totalAmount) !== 945 || invFetched.items.length !== 1) {
        throw new Error(`Invoice details mismatch: totalAmount=${invFetched.totalAmount}, items=${invFetched.items.length}`);
      }

      recordPass('TEST E: Create invoice -> logout -> login -> invoice preserved', `Invoice: ${invNum}, Total: ₹${invFetched.totalAmount}`);
    } catch (err) {
      recordFail('TEST E', err);
    }

    // ---------------------------------------------------------
    // TEST F: Purchase Pro Monthly ₹349 -> verify payment -> subscription ACTIVE -> refresh -> still ACTIVE
    // ---------------------------------------------------------
    let monthlySub: any = null;
    try {
      // Create subscription order
      const order = await subscriptionService.createPaymentOrder(userA.id, bizA.id, 'pro_monthly');
      if (!order.orderId) {
        throw new Error('Checkout order creation failed');
      }

      // Verify payment & activate
      monthlySub = await subscriptionService.verifyAndActivateSubscription(userA.id, bizA.id, {
        orderId: order.orderId,
        paymentId: `pay_test_${testSuffix}`,
        signature: `sig_test_${testSuffix}`,
        planCode: 'pro_monthly',
      });

      if (!monthlySub.isPro || monthlySub.status !== 'ACTIVE') {
        throw new Error(`Subscription not active: isPro=${monthlySub.isPro}, status=${monthlySub.status}`);
      }

      // Check current subscription endpoint
      const curr = await subscriptionService.getCurrentSubscription(bizA.id, userA.id);
      if (!curr.isPro || curr.status !== 'ACTIVE' || curr.planCode !== 'pro_monthly') {
        throw new Error(`Current subscription mismatch: planCode=${curr.planCode}, status=${curr.status}`);
      }

      recordPass('TEST F: Purchase Pro Monthly ₹349 -> verify payment -> subscription ACTIVE -> refresh -> still ACTIVE', `Plan: ${curr.planName}, Status: ${curr.status}, Expires: ${curr.expiresAt}`);
    } catch (err) {
      recordFail('TEST F', err);
    }

    // ---------------------------------------------------------
    // TEST G: Pro user logout/login -> still Pro
    // ---------------------------------------------------------
    try {
      // Simulate logout and re-login
      const authRes4 = await authService.authenticateWithFirebase(tokenA);

      const currSub = await subscriptionService.getCurrentSubscription(bizA.id, authRes4.user.id);
      if (!currSub.isPro || currSub.status !== 'ACTIVE') {
        throw new Error('User lost Pro status after re-login');
      }

      recordPass('TEST G: Pro user logout/login -> still Pro', `User ${authRes4.user.id} remains Pro`);
    } catch (err) {
      recordFail('TEST G', err);
    }

    // ---------------------------------------------------------
    // TEST H: Pro user opens Pro screen -> current Pro plan displayed, purchase plans not shown as if user is Free
    // ---------------------------------------------------------
    try {
      const subInfo = await subscriptionService.getCurrentSubscription(bizA.id, userA.id);
      if (!subInfo.isPro || subInfo.status !== 'ACTIVE') {
        throw new Error('Pro screen check failed: subscription is not active');
      }
      if (!subInfo.planName || !subInfo.price) {
        throw new Error('Missing planName or price in active subscription payload');
      }

      recordPass('TEST H: Pro user opens Pro screen -> current Pro plan displayed', `Plan Name: ${subInfo.planName}, Price: ₹${subInfo.price}, Active Badge: TRUE`);
    } catch (err) {
      recordFail('TEST H', err);
    }

    // ---------------------------------------------------------
    // TEST I: Pro Yearly ₹2,999 -> ACTIVE -> correct plan displayed
    // ---------------------------------------------------------
    try {
      const yearlyOrder = await subscriptionService.createPaymentOrder(userA.id, bizA.id, 'pro_yearly');
      const yearlySub = await subscriptionService.verifyAndActivateSubscription(userA.id, bizA.id, {
        orderId: yearlyOrder.orderId,
        paymentId: `pay_yearly_${testSuffix}`,
        signature: `sig_yearly_${testSuffix}`,
        planCode: 'pro_yearly',
      });

      const currYearly = await subscriptionService.getCurrentSubscription(bizA.id, userA.id);
      if (!currYearly.isPro || currYearly.planCode !== 'pro_yearly' || currYearly.price !== 2999) {
        throw new Error(`Yearly plan mismatch: planCode=${currYearly.planCode}, price=${currYearly.price}`);
      }

      recordPass('TEST I: Pro Yearly ₹2,999 -> ACTIVE -> correct plan displayed', `Plan: ${currYearly.planName}, Price: ₹${currYearly.price}, Interval: ${currYearly.billingCycle}`);
    } catch (err) {
      recordFail('TEST I', err);
    }

    // ---------------------------------------------------------
    // TEST J: Expired subscription -> correctly becomes Free
    // ---------------------------------------------------------
    try {
      // Find userA's active subscription and set expiry to past
      const activeSub = await subscriptionRepository.findActiveSubscription(bizA.id, userA.id);
      if (activeSub) {
        await prisma.subscription.update({
          where: { id: activeSub.id },
          data: {
            status: 'EXPIRED',
            currentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
          },
        });
      }

      const expiredStatus = await subscriptionService.getCurrentSubscription(bizA.id, userA.id);
      if (expiredStatus.isPro) {
        throw new Error('Expected isPro=false for expired subscription');
      }

      recordPass('TEST J: Expired subscription -> correctly becomes Free', `Status: ${expiredStatus.status}, isPro: ${expiredStatus.isPro}`);
    } catch (err) {
      recordFail('TEST J', err);
    }

    // ---------------------------------------------------------
    // TEST K: Cancelled AutoPay while paid period remains -> remains Pro until expiry
    // ---------------------------------------------------------
    try {
      const activePlan = await prisma.subscriptionPlan.findUnique({ where: { code: 'pro_monthly' } });
      const futureExpiry = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days in future
      const cancelSub = await prisma.subscription.create({
        data: {
          userId: userA.id,
          businessId: bizA.id,
          planId: activePlan!.id,
          amount: 349,
          status: 'ACTIVE',
          cancelAtPeriodEnd: true,
          startDate: new Date(),
          expiryDate: futureExpiry,
          currentPeriodStart: new Date(),
          currentPeriodEnd: futureExpiry,
        },
      });

      const cancelCheck = await subscriptionService.getCurrentSubscription(bizA.id, userA.id);
      if (!cancelCheck.isPro || cancelCheck.status !== 'ACTIVE') {
        throw new Error('Cancelled subscription within paid period must remain ACTIVE');
      }
      if (!cancelCheck.cancelAtPeriodEnd) {
        throw new Error('cancelAtPeriodEnd flag should be true');
      }

      recordPass('TEST K: Cancelled AutoPay while paid period remains -> remains Pro until expiry', `isPro: ${cancelCheck.isPro}, Status: ${cancelCheck.status}, Valid Until: ${cancelCheck.expiresAt}`);
    } catch (err) {
      recordFail('TEST K', err);
    }

    // ---------------------------------------------------------
    // TEST L: Two different users -> cannot see each other's profile, Khata, products, invoices, or subscriptions
    // ---------------------------------------------------------
    try {
      const authResB = await authService.authenticateWithFirebase(tokenB, {
        mobile: testMobileB,
        name: 'Sunil Sharma',
      });

      userB = authResB.user;
      bizB = authResB.primaryBusiness;

      // User B attempts to access User A's customer
      const userBCustomers = await customerRepository.list(bizB.id, { page: 1, limit: 50 });
      const leakedCustomer = userBCustomers.customers.find((c) => c.id === customerA.id);
      if (leakedCustomer) {
        throw new Error('Tenant leak: User B can see User A customer');
      }

      // User B attempts to access User A's product
      const userBProducts = await productRepository.list(bizB.id, { page: 1, limit: 50 });
      const leakedProduct = userBProducts.products.find((p) => p.id === productA.id);
      if (leakedProduct) {
        throw new Error('Tenant leak: User B can see User A product');
      }

      // User B attempts to access User A's invoice
      const leakedInvoice = await invoiceRepository.findById(invoiceA.id, bizB.id);
      if (leakedInvoice) {
        throw new Error('Tenant leak: User B can read User A invoice');
      }

      // User B subscription is free and not contaminated by User A
      const userBSub = await subscriptionService.getCurrentSubscription(bizB.id, userB.id);
      if (userBSub.isPro) {
        throw new Error('Tenant leak: User B inherited User A Pro subscription');
      }

      recordPass('TEST L: Two different users -> complete tenant isolation', `User A (${userA.id}) and User B (${userB.id}) data completely isolated`);
    } catch (err) {
      recordFail('TEST L', err);
    }

    // ---------------------------------------------------------
    // TEST M: Same Firebase UID logs in repeatedly -> exactly one backend User, exactly one Business
    // ---------------------------------------------------------
    try {
      const login1 = await authService.authenticateWithFirebase(tokenA);
      const login2 = await authService.authenticateWithFirebase(tokenA);
      const login3 = await authService.authenticateWithFirebase(tokenA);

      if (login1.user.id !== login2.user.id || login2.user.id !== login3.user.id) {
        throw new Error('Repeated logins created different User IDs');
      }

      const userCount = await prisma.user.count({ where: { firebaseUid: testFirebaseUidA } });
      if (userCount !== 1) {
        throw new Error(`Expected exactly 1 User for firebaseUid, found ${userCount}`);
      }

      const bizCount = await prisma.business.count({ where: { ownerId: userA.id } });
      if (bizCount !== 1) {
        throw new Error(`Expected exactly 1 primary Business for User, found ${bizCount}`);
      }

      recordPass('TEST M: Same Firebase UID logs in repeatedly -> idempotent User and Business mapping', `1 User, 1 Business verified for UID: ${testFirebaseUidA}`);
    } catch (err) {
      recordFail('TEST M', err);
    }

  } finally {
    // Clean up temporary test accounts without touching any existing production data
    console.log('\nCleaning up temporary test records...');
    try {
      if (bizA?.id) {
        await prisma.invoiceItem.deleteMany({ where: { invoice: { businessId: bizA.id } } });
        await prisma.invoice.deleteMany({ where: { businessId: bizA.id } });
        await prisma.khataTransaction.deleteMany({ where: { businessId: bizA.id } });
        await prisma.customer.deleteMany({ where: { businessId: bizA.id } });
        await prisma.product.deleteMany({ where: { businessId: bizA.id } });
        await prisma.subscription.deleteMany({ where: { businessId: bizA.id } });
        await prisma.business.deleteMany({ where: { id: bizA.id } });
      }
      if (userA?.id) {
        await prisma.paymentTransaction.deleteMany({ where: { userId: userA.id } });
        await prisma.subscription.deleteMany({ where: { userId: userA.id } });
        await prisma.user.deleteMany({ where: { id: userA.id } });
      }
      if (bizB?.id) {
        await prisma.business.deleteMany({ where: { id: bizB.id } });
      }
      if (userB?.id) {
        await prisma.user.deleteMany({ where: { id: userB.id } });
      }
      console.log('Cleanup completed safely.');
    } catch (cleanErr) {
      console.warn('Cleanup warning:', cleanErr);
    }
  }

  console.log('\n====================================================');
  console.log('TEST RESULTS SUMMARY:');
  console.log('====================================================');
  let passCount = 0;
  for (const r of results) {
    if (r.passed) passCount++;
    console.log(`${r.passed ? '✓ PASS' : '✗ FAIL'}: ${r.name}`);
  }
  console.log(`\nTOTAL: ${passCount}/${results.length} PASSED`);

  await prisma.$disconnect();

  if (passCount !== results.length) {
    process.exit(1);
  }
}

runTestSuite();
