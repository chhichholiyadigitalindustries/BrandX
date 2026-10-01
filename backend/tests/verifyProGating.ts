/**
 * Automated Verification of Backend Pro Feature Gating & Tenant Isolation
 */
import { prisma } from '../src/config/database.js';
import { authService } from '../src/services/authService.js';
import { subscriptionService } from '../src/services/subscriptionService.js';
import http from 'http';

function makeRequest(options: http.RequestOptions, body?: any): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 0, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode || 0, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('🧪 Starting Pro Gating & Tenant Isolation Test...');

  // 1. Create a Free Test User
  const freeToken = 'test_firebase_free_user_' + Date.now();
  const freeAuth = await authService.authenticateWithFirebase(freeToken, {
    name: 'Free Vyapari',
    businessName: 'Free Test Shop',
  });

  const freeAccessToken = freeAuth.tokens.accessToken;
  const freeBizId = freeAuth.primaryBusiness!.id;

  console.log('Created Free user:', freeAuth.user.id, 'Business:', freeBizId);

  // 2. Test POST /api/v1/invoices with Free User
  const invRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/invoices',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${freeAccessToken}`,
      'x-business-id': freeBizId,
    },
  }, {
    customerName: 'Test Customer',
    items: [{ name: 'Item 1', rate: 100, quantity: 1 }],
  });

  console.log('Free user POST /api/v1/invoices status:', invRes.status, invRes.body);
  if (invRes.status !== 403 || invRes.body?.code !== 'PRO_REQUIRED') {
    throw new Error(`Expected 403 PRO_REQUIRED on /invoices, got ${invRes.status}: ${JSON.stringify(invRes.body)}`);
  }
  console.log('✅ Invoices correctly blocked with 403 PRO_REQUIRED for Free user');

  // 3. Test POST /api/v1/products with Free User
  const prodRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/products',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${freeAccessToken}`,
      'x-business-id': freeBizId,
    },
  }, {
    name: 'Test Product',
    price: 150,
  });

  console.log('Free user POST /api/v1/products status:', prodRes.status, prodRes.body);
  if (prodRes.status !== 403 || prodRes.body?.code !== 'PRO_REQUIRED') {
    throw new Error(`Expected 403 PRO_REQUIRED on /products, got ${prodRes.status}: ${JSON.stringify(prodRes.body)}`);
  }
  console.log('✅ Products correctly blocked with 403 PRO_REQUIRED for Free user');

  // 4. Test POST /api/v1/upi/generate-qr with Free User
  const upiRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/upi/generate-qr',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${freeAccessToken}`,
      'x-business-id': freeBizId,
    },
  }, {
    upiId: 'test@upi',
  });

  console.log('Free user POST /api/v1/upi/generate-qr status:', upiRes.status, upiRes.body);
  if (upiRes.status !== 403 || upiRes.body?.code !== 'PRO_REQUIRED') {
    throw new Error(`Expected 403 PRO_REQUIRED on /upi/generate-qr, got ${upiRes.status}: ${JSON.stringify(upiRes.body)}`);
  }
  console.log('✅ UPI QR standee correctly blocked with 403 PRO_REQUIRED for Free user');

  // 5. Test POST /api/v1/digital-card with Free User
  const cardRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/digital-card',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${freeAccessToken}`,
      'x-business-id': freeBizId,
    },
  }, {
    name: 'Free Card',
    mobile: '9876543210',
  });

  console.log('Free user POST /api/v1/digital-card status:', cardRes.status, cardRes.body);
  if (cardRes.status !== 403 || cardRes.body?.code !== 'PRO_REQUIRED') {
    throw new Error(`Expected 403 PRO_REQUIRED on /digital-card, got ${cardRes.status}: ${JSON.stringify(cardRes.body)}`);
  }
  console.log('✅ Digital Card correctly blocked with 403 PRO_REQUIRED for Free user');

  // 6. Test with Pro User (Upgrade user to Pro)
  await prisma.user.update({
    where: { id: freeAuth.user.id },
    data: { isPro: true },
  });

  const proProdRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/products',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${freeAccessToken}`,
      'x-business-id': freeBizId,
    },
  }, {
    name: 'Pro Product Item',
    sellingPrice: 250,
  });

  console.log('Pro user POST /api/v1/products status:', proProdRes.status, proProdRes.body);
  if (proProdRes.status !== 201) {
    throw new Error(`Expected 201 for Pro user on /products, got ${proProdRes.status}`);
  }
  console.log('✅ Pro user successfully authorized to create products!');

  // Cleanup test user
  await prisma.business.deleteMany({ where: { ownerId: freeAuth.user.id } });
  await prisma.user.delete({ where: { id: freeAuth.user.id } });

  console.log('🎉 ALL PRO GATING TESTS PASSED!');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
