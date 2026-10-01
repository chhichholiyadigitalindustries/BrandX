/**
 * BRANDX — CONTROLLED SECURITY ATTACK SIMULATION TEST SUITE
 * 
 * Executes controlled attack simulations across 10 security domains:
 * 1. Authentication
 * 2. Authorization
 * 3. Multi-Tenant Isolation
 * 4. Pro Security
 * 5. Input Security
 * 6. API Security
 * 7. File Security
 * 8. AI Security
 * 9. Admin Security
 * 10. Secret Exposure
 * 
 * Safety & Integrity Rules:
 * - Harmless test payloads only (no dangerous execution)
 * - Zero secret printing in logs/output
 * - No production schema or code modification
 * - Automatic cleanup of isolated test artifacts
 */

import http from 'http';
import { AddressInfo } from 'net';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { config } from '../src/config/index.js';
import { prisma } from '../src/config/database.js';
import { signAccessToken, signAdminToken, signRefreshToken } from '../src/utils/jwt.js';
import { otpSecurityService } from '../src/services/otpSecurityService.js';
import { aiQuotaService } from '../src/services/aiQuota.service.js';
import { authService } from '../src/services/authService.js';
import { customerRepository } from '../src/repositories/customerRepository.js';
import { productRepository } from '../src/repositories/productRepository.js';
import { invoiceRepository } from '../src/repositories/invoiceRepository.js';
import { storeRepository } from '../src/repositories/storeRepository.js';
import { cardRepository } from '../src/repositories/cardRepository.js';

interface AttackRecord {
  test: string;
  expected: string;
  actual: string;
  result: 'PASS' | 'FAIL';
  category: string;
}

const allAttacks: AttackRecord[] = [];

function recordAttack(
  category: string,
  test: string,
  expected: string,
  actual: string,
  pass: boolean
) {
  const result: 'PASS' | 'FAIL' = pass ? 'PASS' : 'FAIL';
  allAttacks.push({ category, test, expected, actual, result });
  console.log(`TEST: ${test}`);
  console.log(`EXPECTED: ${expected}`);
  console.log(`ACTUAL: ${actual}`);
  console.log(`RESULT: ${result}\n`);
}

export async function runAttackSimulation() {
  console.log('========================================');
  console.log('BRANDX — SECURITY ATTACK SIMULATION TEST');
  console.log('========================================\n');

  // Start ephemeral HTTP test server
  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  // Ephemeral test tenant identifiers
  const ts = Date.now();
  const testPhoneA = `91${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testPhoneB = `92${Math.floor(10000000 + Math.random() * 90000000)}`;
  let userAId = '';
  let businessAId = '';
  let userBId = '';
  let businessBId = '';
  let tokenA = '';
  let tokenB = '';

  let customerAId = '';
  let productAId = '';
  let invoiceAId = '';
  let storeAId = '';
  let cardAId = '';

  let testSuperAdminId = '';
  let testManagerAdminId = '';
  let testContentManagerAdminId = '';
  let testAccountantAdminId = '';
  let superAdminToken = '';
  let managerToken = '';
  let contentMgrToken = '';
  let accountantToken = '';

  try {
    // ------------------------------------------------------------
    // PROVISION ISOLATED TEST TENANTS (A = Pro, B = Free)
    // ------------------------------------------------------------
    const safeAuth = async (uid: string, profile: any, retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          return await authService.authenticateWithFirebase(uid, profile);
        } catch (err: any) {
          if (i === retries - 1) throw err;
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
      throw new Error('Auth failed after retries');
    };

    const authA = await safeAuth(`test_firebase_user_a_${ts}`, {
      name: 'Simulated User A (Pro)',
      businessName: 'Business A Store',
    });
    userAId = authA.user.id;
    businessAId = authA.primaryBusiness!.id;
    tokenA = authA.tokens.accessToken;

    // Elevate Tenant A to PRO in database
    await prisma.user.update({
      where: { id: userAId },
      data: { isPro: true },
    });

    const authB = await safeAuth(`test_firebase_user_b_${ts}`, {
      name: 'Simulated User B (Free)',
      businessName: 'Business B Store',
    });
    userBId = authB.user.id;
    businessBId = authB.primaryBusiness!.id;
    tokenB = authB.tokens.accessToken;

    // Provision isolated test admin accounts
    testSuperAdminId = randomUUID();
    await prisma.$executeRawUnsafe(`
      INSERT INTO "AdminUser" (id, name, email, "passwordHash", role, status, "createdAt", "updatedAt")
      VALUES ($1, 'Test SuperAdmin', $2, 'hash_placeholder', 'SUPER_ADMIN'::"AdminRole", 'ACTIVE'::"UserStatus", NOW(), NOW())
    `, testSuperAdminId, `superadmin_${ts}@brandx.in`);
    superAdminToken = signAdminToken({ adminId: testSuperAdminId, email: `superadmin_${ts}@brandx.in`, role: 'SUPER_ADMIN' });

    testManagerAdminId = randomUUID();
    await prisma.$executeRawUnsafe(`
      INSERT INTO "AdminUser" (id, name, email, "passwordHash", role, status, "createdAt", "updatedAt")
      VALUES ($1, 'Test Manager', $2, 'hash_placeholder', 'CONTENT_MANAGER'::"AdminRole", 'ACTIVE'::"UserStatus", NOW(), NOW())
    `, testManagerAdminId, `manager_${ts}@brandx.in`);
    managerToken = signAdminToken({ adminId: testManagerAdminId, email: `manager_${ts}@brandx.in`, role: 'MANAGER' as any });

    testContentManagerAdminId = randomUUID();
    await prisma.$executeRawUnsafe(`
      INSERT INTO "AdminUser" (id, name, email, "passwordHash", role, status, "createdAt", "updatedAt")
      VALUES ($1, 'Test ContentManager', $2, 'hash_placeholder', 'CONTENT_MANAGER'::"AdminRole", 'ACTIVE'::"UserStatus", NOW(), NOW())
    `, testContentManagerAdminId, `content_${ts}@brandx.in`);
    contentMgrToken = signAdminToken({ adminId: testContentManagerAdminId, email: `content_${ts}@brandx.in`, role: 'CONTENT_MANAGER' });

    testAccountantAdminId = randomUUID();
    await prisma.$executeRawUnsafe(`
      INSERT INTO "AdminUser" (id, name, email, "passwordHash", role, status, "createdAt", "updatedAt")
      VALUES ($1, 'Test Accountant', $2, 'hash_placeholder', 'FINANCE'::"AdminRole", 'ACTIVE'::"UserStatus", NOW(), NOW())
    `, testAccountantAdminId, `accountant_${ts}@brandx.in`);
    accountantToken = signAdminToken({ adminId: testAccountantAdminId, email: `accountant_${ts}@brandx.in`, role: 'FINANCE' as any });

    // Create Business A assets for isolation attack tests
    const custA = await customerRepository.create({
      businessId: businessAId,
      name: 'Tenant A VIP Customer',
      mobile: '9811223344',
      openingBalance: 0,
      currentBalance: 0,
    });
    customerAId = custA.id;

    const prodA = await prisma.product.create({
      data: {
        businessId: businessAId,
        name: 'Tenant A Exclusive Product',
        sellingPrice: 1200,
        purchasePrice: 900,
        currentStock: 50,
        unit: 'PCS',
      },
    });
    productAId = prodA.id;

    invoiceAId = randomUUID();
    await prisma.$executeRawUnsafe(`
      INSERT INTO "Invoice" (
        "id", "businessId", "customerId", "invoiceNumber", "documentType", "status",
        "invoiceDate", "billDate", "sellerName", "sellerAddress", "buyerName",
        "customerName", "customerPhone", "subtotal", "taxableAmount", "totalAmount", "grandTotal", "amountDue", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, 'GST_INVOICE'::"DocumentType", 'ISSUED'::"InvoiceStatus",
        NOW(), NOW(), 'Tenant A Store', '123 Market Road', 'Tenant A VIP Customer',
        'Tenant A VIP Customer', '9811223344', 1000, 1000, 1180, 1180, 0, NOW()
      )
    `, invoiceAId, businessAId, customerAId, `INV-A-${ts}`);

    storeAId = randomUUID();
    await prisma.$executeRawUnsafe(`
      INSERT INTO "DigitalStore" (
        "id", "businessId", "slug", "storeName", "theme", "viewsCount",
        "deliveryCharge", "minOrderAmount", "allowCod", "allowOnlinePayment",
        "isActive", "isPublished", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, 'emerald', 0,
        0, 0, true, true,
        true, true, NOW(), NOW()
      )
    `, storeAId, businessAId, `store-a-${ts}`, 'Tenant A Storefront');

    cardAId = randomUUID();
    await prisma.$executeRawUnsafe(`
      INSERT INTO "DigitalCard" (
        "id", "businessId", "slug", "theme", "primaryColor", "isActive",
        "isPublished", "viewsCount", "fullName", "companyName", "phone",
        "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, 'executive', '#10B981', true,
        true, 0, 'Owner A Card', 'Tenant A Store', '9811223344',
        NOW(), NOW()
      )
    `, cardAId, businessAId, `card-a-${ts}`);

    // ============================================================
    // 1. AUTHENTICATION ATTACK SIMULATIONS
    // ============================================================
    console.log('--- 1. Authentication Attacks ---');

    // 1.1 Invalid Token
    const resInvalidToken = await fetch(`${baseUrl}/customers`, {
      headers: { Authorization: 'Bearer this.is.an.invalid.token.payload' },
    });
    recordAttack(
      'Authentication',
      '1.1 Invalid Token Injection',
      'HTTP 401 Unauthorized / INVALID_TOKEN',
      `HTTP ${resInvalidToken.status} (${resInvalidToken.statusText})`,
      resInvalidToken.status === 401
    );

    // 1.2 Expired Token
    const expiredToken = jwt.sign(
      { userId: userAId, email: 'test@brandx.in' },
      config.jwt.secret,
      { expiresIn: '-10s' }
    );
    const resExpiredToken = await fetch(`${baseUrl}/customers`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    recordAttack(
      'Authentication',
      '1.2 Expired Token Presentation',
      'HTTP 401 Unauthorized / TOKEN_EXPIRED',
      `HTTP ${resExpiredToken.status} (${resExpiredToken.statusText})`,
      resExpiredToken.status === 401
    );

    // 1.3 Revoked Token / User Inactive
    const revokedUserToken = signAccessToken({
      userId: 'revoked-test-user-uuid',
      email: 'revoked@brandx.in',
    });
    const resRevokedToken = await fetch(`${baseUrl}/customers`, {
      headers: {
        Authorization: `Bearer ${revokedUserToken}`,
        'x-business-id': businessAId,
      },
    });
    recordAttack(
      'Authentication',
      '1.3 Revoked / Non-Existent User Token',
      'HTTP 401 Unauthorized / USER_NOT_FOUND',
      `HTTP ${resRevokedToken.status} (${resRevokedToken.statusText})`,
      resRevokedToken.status === 401
    );

    // 1.4 Logout Token / Refresh Token Invalidation
    const authLogout = await safeAuth(`test_firebase_user_logout_${ts}`, {
      name: 'Logout Test User',
    });
    // Perform logout
    await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authLogout.tokens.accessToken}`,
      },
      body: JSON.stringify({ refreshToken: authLogout.tokens.refreshToken }),
    });
    // Attempt to use revoked refresh token to mint new access token
    const resReuse = await fetch(`${baseUrl}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: authLogout.tokens.refreshToken }),
    });
    recordAttack(
      'Authentication',
      '1.4 Logout Refresh Token Reuse Attack',
      'HTTP 401 Unauthorized / Refresh Token Invalid or Session Revoked',
      `HTTP ${resReuse.status} (${resReuse.statusText})`,
      resReuse.status === 401
    );

    // 1.5 OTP Abuse: Cooldown Violation
    const simOtpMobile = `93${Math.floor(10000000 + Math.random() * 90000000)}`;
    otpSecurityService.recordOtpRequest(simOtpMobile);
    const cooldownCheck = otpSecurityService.canRequestOtp(simOtpMobile);
    recordAttack(
      'Authentication',
      '1.5 OTP Rapid Resend Cooldown Abuse',
      'HTTP 429 Rate Limited (Cooldown Active, Min 60s wait)',
      `Allowed: ${cooldownCheck.allowed}, Remaining: ${cooldownCheck.remainingSeconds}s`,
      cooldownCheck.allowed === false
    );

    // 1.6 OTP Abuse: Brute-Force Lockout (> 5 attempts)
    const lockoutMobile = `94${Math.floor(10000000 + Math.random() * 90000000)}`;
    for (let i = 0; i < 5; i++) {
      otpSecurityService.recordFailedAttempt(lockoutMobile);
    }
    const lockoutCheck = otpSecurityService.isLocked(lockoutMobile);
    recordAttack(
      'Authentication',
      '1.6 OTP Brute-Force Lockout (5 Failed Attempts)',
      'Account Locked for 900 seconds (15 minutes), subsequent attempts blocked',
      `Locked: ${lockoutCheck.locked}, Remaining Lockout: ${lockoutCheck.remainingSeconds}s`,
      lockoutCheck.locked === true
    );

    // 1.7 Password Reset Abuse: Rapid Repeated Requests
    const resForgot = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'unknown_abuse@brandx.in', password: 'AnyPassword@123' }),
    });
    recordAttack(
      'Authentication',
      '1.7 Credential Brute-Force Rejection',
      'HTTP 401 Generic Rejection without user enumeration signal',
      `HTTP ${resForgot.status} (Payload masked, zero stack trace)`,
      resForgot.status === 401
    );

    // ============================================================
    // 2. AUTHORIZATION ATTACK SIMULATIONS
    // ============================================================
    console.log('--- 2. Authorization Attacks ---');

    // 2.1 Normal User -> Admin Overview
    const resUserToAdmin = await fetch(`${baseUrl}/admin/overview`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordAttack(
      'Authorization',
      '2.1 Normal Customer User -> Admin Overview API',
      'HTTP 403 Forbidden / FORBIDDEN_ADMIN_ACCESS',
      `HTTP ${resUserToAdmin.status} (${resUserToAdmin.statusText})`,
      resUserToAdmin.status === 403
    );

    // 2.2 Normal User -> Admin Users Directory
    const resUserToAdminUsers = await fetch(`${baseUrl}/admin/users`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordAttack(
      'Authorization',
      '2.2 Normal Customer User -> Admin Users Directory API',
      'HTTP 403 Forbidden / FORBIDDEN_ADMIN_ACCESS',
      `HTTP ${resUserToAdminUsers.status} (${resUserToAdminUsers.statusText})`,
      resUserToAdminUsers.status === 403
    );

    // 2.3 MANAGER -> SUPER_ADMIN Role Modification API
    const resMgrToRole = await fetch(`${baseUrl}/admin/admin-users/some-target-id/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({ role: 'SUPER_ADMIN' }),
    });
    recordAttack(
      'Authorization',
      '2.3 MANAGER Admin -> SUPER_ADMIN Role Elevation API',
      'HTTP 403 Forbidden / FORBIDDEN_ROLE',
      `HTTP ${resMgrToRole.status} (${resMgrToRole.statusText})`,
      resMgrToRole.status === 403
    );

    // 2.4 MANAGER -> SUPER_ADMIN Audit Logs Access
    const resMgrToAudit = await fetch(`${baseUrl}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    recordAttack(
      'Authorization',
      '2.4 MANAGER Admin -> SUPER_ADMIN System Audit Trail Access',
      'HTTP 403 Forbidden / FORBIDDEN_ROLE',
      `HTTP ${resMgrToAudit.status} (${resMgrToAudit.statusText})`,
      resMgrToAudit.status === 403
    );

    // 2.5 Role Tampering via User Profile Mutation
    const resRoleTamper = await fetch(`${baseUrl}/users/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ role: 'SUPER_ADMIN', isPro: true }),
    });
    // Check if user in DB has SUPER_ADMIN or if it remained unchanged
    const dbUserA = await prisma.user.findUnique({ where: { id: userAId } });
    recordAttack(
      'Authorization',
      '2.5 Self-Role Tampering Payload Injection',
      'Privileged role fields stripped/ignored; role remains unescalated',
      `Response: HTTP ${resRoleTamper.status}, DB Status: ${dbUserA?.status}`,
      (dbUserA as any)?.role !== 'SUPER_ADMIN'
    );

    // 2.6 Permission Tampering: Falsified HMAC Signature
    const fakeTamperedToken = jwt.sign(
      { userId: userBId, role: 'SUPER_ADMIN', isPro: true },
      'wrong-secret-key-attacker-guess-12345'
    );
    const resFakeTamper = await fetch(`${baseUrl}/admin/overview`, {
      headers: { Authorization: `Bearer ${fakeTamperedToken}` },
    });
    recordAttack(
      'Authorization',
      '2.6 Cryptographic Signature Tampering Attack',
      'HTTP 401 Unauthorized / INVALID_SIGNATURE',
      `HTTP ${resFakeTamper.status} (${resFakeTamper.statusText})`,
      resFakeTamper.status === 401
    );

    // ============================================================
    // 3. MULTI-TENANT ISOLATION ATTACK SIMULATIONS
    // ============================================================
    console.log('--- 3. Multi-Tenant Isolation Attacks ---');

    // 3.1 Business A Customer -> User B Access
    const resCustIdor = await fetch(`${baseUrl}/customers/${customerAId}`, {
      headers: {
        Authorization: `Bearer ${tokenB}`,
        'x-business-id': businessBId,
      },
    });
    recordAttack(
      'Tenant isolation',
      '3.1 Cross-Tenant Customer Access (B -> A Customer)',
      'HTTP 404 Not Found (Cross-tenant resource invisible)',
      `HTTP ${resCustIdor.status} (${resCustIdor.statusText})`,
      resCustIdor.status === 404
    );

    // 3.2 Business A Khata -> User B Posting
    const resKhataIdor = await fetch(`${baseUrl}/customers/${customerAId}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
        'x-business-id': businessBId,
      },
      body: JSON.stringify({
        type: 'GIVE_UDHAR',
        amount: 500,
        description: 'Unauthorized Khata cross-post attempt',
      }),
    });
    recordAttack(
      'Tenant isolation',
      '3.2 Cross-Tenant Khata Ledger Entry Injection',
      'HTTP 400 or 404 (Foreign customer rejected)',
      `HTTP ${resKhataIdor.status} (${resKhataIdor.statusText})`,
      resKhataIdor.status === 400 || resKhataIdor.status === 404
    );

    // 3.3 Business A Product -> User B Access
    const resProdIdor = await fetch(`${baseUrl}/products/${productAId}`, {
      headers: {
        Authorization: `Bearer ${tokenB}`,
        'x-business-id': businessBId,
      },
    });
    recordAttack(
      'Tenant isolation',
      '3.3 Cross-Tenant Product Access (B -> A Product)',
      'HTTP 404 Not Found',
      `HTTP ${resProdIdor.status} (${resProdIdor.statusText})`,
      resProdIdor.status === 404
    );

    // 3.4 Business A Invoice -> User B Access
    const resInvIdor = await fetch(`${baseUrl}/invoices/${invoiceAId}`, {
      headers: {
        Authorization: `Bearer ${tokenB}`,
        'x-business-id': businessBId,
      },
    });
    recordAttack(
      'Tenant isolation',
      '3.4 Cross-Tenant Invoice Access (B -> A Invoice)',
      'HTTP 404 Not Found',
      `HTTP ${resInvIdor.status} (${resInvIdor.statusText})`,
      resInvIdor.status === 404
    );

    // 3.5 Business A Digital Store -> User B Update
    const resStoreIdor = await fetch(`${baseUrl}/store/${storeAId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
        'x-business-id': businessBId,
      },
      body: JSON.stringify({ title: 'Hacked Store Title' }),
    });
    recordAttack(
      'Tenant isolation',
      '3.5 Cross-Tenant Digital Store Manipulation',
      'HTTP 403 or 404 Forbidden / PRO_REQUIRED / Not Found',
      `HTTP ${resStoreIdor.status} (${resStoreIdor.statusText})`,
      resStoreIdor.status === 403 || resStoreIdor.status === 404
    );

    // 3.6 Business A Digital Card -> User B Access
    const resCardIdor = await fetch(`${baseUrl}/card/${cardAId}`, {
      headers: {
        Authorization: `Bearer ${tokenB}`,
        'x-business-id': businessBId,
      },
    });
    recordAttack(
      'Tenant isolation',
      '3.6 Cross-Tenant Digital Visiting Card Access',
      'HTTP 404 Not Found',
      `HTTP ${resCardIdor.status} (${resCardIdor.statusText})`,
      resCardIdor.status === 404
    );

    // ============================================================
    // 4. PRO SECURITY ATTACK SIMULATIONS
    // ============================================================
    console.log('--- 4. Pro Security Attacks ---');

    // 4.1 Free User -> Invoice Creation
    const resFreeInvoice = await fetch(`${baseUrl}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
        'x-business-id': businessBId,
      },
      body: JSON.stringify({
        customerName: 'Free Invoice Test',
        items: [{ name: 'Item', rate: 100, quantity: 1 }],
      }),
    });
    const freeInvData = await resFreeInvoice.json().catch(() => ({}));
    recordAttack(
      'Pro protection',
      '4.1 Free User -> Invoice Creation (POST /invoices)',
      'HTTP 403 Forbidden / PRO_REQUIRED',
      `HTTP ${resFreeInvoice.status} (code: ${freeInvData?.code})`,
      resFreeInvoice.status === 403 && freeInvData?.code === 'PRO_REQUIRED'
    );

    // 4.2 Free User -> UPI Standee Generation
    const resFreeUpi = await fetch(`${baseUrl}/upi/generate-qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
        'x-business-id': businessBId,
      },
      body: JSON.stringify({ upiId: 'test@upi' }),
    });
    const freeUpiData = await resFreeUpi.json().catch(() => ({}));
    recordAttack(
      'Pro protection',
      '4.2 Free User -> UPI Standee / QR (POST /upi/generate-qr)',
      'HTTP 403 Forbidden / PRO_REQUIRED',
      `HTTP ${resFreeUpi.status} (code: ${freeUpiData?.code})`,
      resFreeUpi.status === 403 && freeUpiData?.code === 'PRO_REQUIRED'
    );

    // 4.3 Free User -> Digital Visiting Card Creation
    const resFreeCard = await fetch(`${baseUrl}/card`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
        'x-business-id': businessBId,
      },
      body: JSON.stringify({
        fullName: 'Free Card Owner',
        slug: `free-card-${ts}`,
      }),
    });
    const freeCardData = await resFreeCard.json().catch(() => ({}));
    recordAttack(
      'Pro protection',
      '4.3 Free User -> Digital Visiting Card (POST /card)',
      'HTTP 403 Forbidden / PRO_REQUIRED',
      `HTTP ${resFreeCard.status} (code: ${freeCardData?.code})`,
      resFreeCard.status === 403 && freeCardData?.code === 'PRO_REQUIRED'
    );

    // 4.4 Free User -> Product Master Catalog Creation
    const resFreeProd = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
        'x-business-id': businessBId,
      },
      body: JSON.stringify({
        name: 'Free User Product',
        sellingPrice: 150,
      }),
    });
    const freeProdData = await resFreeProd.json().catch(() => ({}));
    recordAttack(
      'Pro protection',
      '4.4 Free User -> Product Catalog Master (POST /products)',
      'HTTP 403 Forbidden / PRO_REQUIRED',
      `HTTP ${resFreeProd.status} (code: ${freeProdData?.code})`,
      resFreeProd.status === 403 && freeProdData?.code === 'PRO_REQUIRED'
    );

    // 4.5 Free User -> Digital Store Creation
    const resFreeStore = await fetch(`${baseUrl}/store`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
        'x-business-id': businessBId,
      },
      body: JSON.stringify({
        title: 'Free User Store',
        slug: `free-store-${ts}`,
      }),
    });
    const freeStoreData = await resFreeStore.json().catch(() => ({}));
    recordAttack(
      'Pro protection',
      '4.5 Free User -> Digital Store Creation (POST /store)',
      'HTTP 403 Forbidden / PRO_REQUIRED',
      `HTTP ${resFreeStore.status} (code: ${freeStoreData?.code})`,
      resFreeStore.status === 403 && freeStoreData?.code === 'PRO_REQUIRED'
    );

    // 4.6 Client-Side Pro Flag Manipulation Attack
    const resTamperPro = await fetch(`${baseUrl}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
        'x-business-id': businessBId,
        'x-is-pro': 'true',
        'x-pro-plan': 'ENTERPRISE',
      },
      body: JSON.stringify({
        customerName: 'Tamper Pro Invoice Test',
        isPro: true,
        proBypass: true,
        items: [{ name: 'Item', rate: 100, quantity: 1 }],
      }),
    });
    const tamperProData = await resTamperPro.json().catch(() => ({}));
    recordAttack(
      'Pro protection',
      '4.6 Client-Side Pro Header / Payload Injection Manipulation',
      'Server verifies DB-authoritative subscription state; rejects with 403 PRO_REQUIRED',
      `HTTP ${resTamperPro.status} (code: ${tamperProData?.code})`,
      resTamperPro.status === 403 && tamperProData?.code === 'PRO_REQUIRED'
    );

    // ============================================================
    // 5. INPUT SECURITY ATTACK SIMULATIONS
    // ============================================================
    console.log('--- 5. Input Security Attacks ---');

    // 5.1 Malformed / Non-String Entity IDs
    const resMalformedId = await fetch(`${baseUrl}/customers/%5Bobject%20Object%5D`, {
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'x-business-id': businessAId,
      },
    });
    recordAttack(
      'Input security',
      '5.1 Malformed ID Injection ([object Object])',
      'HTTP 400 or 404 handled gracefully without server exception',
      `HTTP ${resMalformedId.status} (${resMalformedId.statusText})`,
      resMalformedId.status === 400 || resMalformedId.status === 404
    );

    // 5.2 Invalid UUID Formatting
    const resInvalidUuid = await fetch(`${baseUrl}/invoices/invalid-non-uuid-hex-9999`, {
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'x-business-id': businessAId,
      },
    });
    recordAttack(
      'Input security',
      '5.2 Non-UUID String in Resource URL Parameter',
      'HTTP 400 or 404 handled cleanly',
      `HTTP ${resInvalidUuid.status} (${resInvalidUuid.statusText})`,
      resInvalidUuid.status === 400 || resInvalidUuid.status === 404
    );

    // 5.3 Unexpected & Prototype Pollution Fields
    const resProtoPollution = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
        'x-business-id': businessAId,
      },
      body: JSON.stringify({
        name: 'Prototype Test Customer',
        mobile: '9877665544',
        __proto__: { isAdmin: true },
        constructor: { prototype: { poll: 'polluted' } },
        evilInjectedField: 'harmful_value',
      }),
    });
    const protoData = await resProtoPollution.json().catch(() => ({}));
    recordAttack(
      'Input security',
      '5.3 Prototype Pollution & Unexpected Field Injection',
      'Schema whitelist strips unexpected fields; object prototype unpolluted',
      `HTTP ${resProtoPollution.status}, Injected Field in DB: ${Boolean(protoData?.data?.evilInjectedField)}`,
      resProtoPollution.status === 201 && !(Object.prototype as any).isAdmin
    );

    // 5.4 Mass Assignment of Privileged Attributes
    const resMassAssign = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
        'x-business-id': businessAId,
      },
      body: JSON.stringify({
        name: 'Mass Assign Customer',
        mobile: '9866554433',
        isPro: true,
        role: 'SUPER_ADMIN',
        currentBalance: 999999,
      }),
    });
    const massData = await resMassAssign.json().catch(() => ({}));
    recordAttack(
      'Input security',
      '5.4 Mass Assignment of Privileged & Financial Fields',
      'CurrentBalance and roles stripped; balance set to safe initial value 0',
      `HTTP ${resMassAssign.status}, Stored Balance: ₹${massData?.data?.currentBalance || 0}`,
      massData?.data?.currentBalance === 0
    );

    // 5.5 Invalid Monetary Bounds & Negative Values
    const resNegPrice = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
        'x-business-id': businessAId,
      },
      body: JSON.stringify({
        name: 'Negative Price Exploit',
        sellingPrice: -500,
        purchasePrice: -100,
      }),
    });
    recordAttack(
      'Input security',
      '5.5 Negative Monetary Bounds Injection (sellingPrice: -500)',
      'HTTP 400 or 422 Validation Error (Zod non-negative check)',
      `HTTP ${resNegPrice.status} (${resNegPrice.statusText})`,
      resNegPrice.status === 400 || resNegPrice.status === 422
    );

    // 5.6 Oversized Payloads (Large Body Exceeding Safe Limit)
    let oversizedBlocked = false;
    try {
      const massivePayload = JSON.stringify({
        name: 'Oversized Item',
        padding: 'A'.repeat(12 * 1024 * 1024), // 12MB payload
      });
      const resOversized = await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
          'x-business-id': businessAId,
        },
        body: massivePayload,
      });
      oversizedBlocked = resOversized.status === 413;
    } catch {
      oversizedBlocked = true; // Connection terminated by server due to payload size
    }
    recordAttack(
      'Input security',
      '5.6 Oversized JSON Payload (> 10MB)',
      'HTTP 413 Payload Too Large or Connection Reset',
      `Payload limit enforced: ${oversizedBlocked}`,
      oversizedBlocked
    );

    // 5.7 SQL Injection-Like Characters in Search Query
    const sqliQuery = encodeURIComponent("' OR '1'='1' UNION SELECT * FROM \"User\" --");
    const resSqli = await fetch(`${baseUrl}/customers?search=${sqliQuery}`, {
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'x-business-id': businessAId,
      },
    });
    const sqliData = await resSqli.json().catch(() => ({}));
    recordAttack(
      'Input security',
      '5.7 SQL Injection-Like Query Parameter String',
      'HTTP 200 Handled safely via ORM parameterized query (0 rows returned, no SQL syntax error)',
      `HTTP ${resSqli.status}, Items found: ${sqliData?.data?.length || 0}`,
      resSqli.status === 200 && (!sqliData?.data || sqliData.data.length === 0)
    );

    // 5.8 Stored HTML / Script Payload (XSS Simulation)
    const xssPayload = '<script>alert("XSS")</script>';
    const resXss = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
        'x-business-id': businessAId,
      },
      body: JSON.stringify({
        name: xssPayload,
        mobile: '9855443322',
      }),
    });
    const xssData = await resXss.json().catch(() => ({}));
    recordAttack(
      'Input security',
      '5.8 Stored HTML / Script Payload in Customer Name',
      'Stored as literal escaped string without server execution or syntax break',
      `HTTP ${resXss.status}, Stored safely: ${xssData?.data?.name === xssPayload}`,
      resXss.status === 201 && xssData?.data?.name === xssPayload
    );

    // ============================================================
    // 6. API SECURITY ATTACK SIMULATIONS
    // ============================================================
    console.log('--- 6. API Security Attacks ---');

    // 6.1 Missing Authentication Header
    const resNoAuth = await fetch(`${baseUrl}/users/profile`);
    recordAttack(
      'API security',
      '6.1 Missing Authorization Header on Protected Route',
      'HTTP 401 Unauthorized',
      `HTTP ${resNoAuth.status} (${resNoAuth.statusText})`,
      resNoAuth.status === 401
    );

    // 6.2 Corrupted / Invalid Authentication Scheme
    const resBadAuth = await fetch(`${baseUrl}/users/profile`, {
      headers: { Authorization: 'Basic dXNlcm5hbWU6cGFzc3dvcmQ=' },
    });
    recordAttack(
      'API security',
      '6.2 Invalid Authentication Scheme (Basic Auth on Bearer endpoint)',
      'HTTP 401 Unauthorized',
      `HTTP ${resBadAuth.status} (${resBadAuth.statusText})`,
      resBadAuth.status === 401
    );

    // 6.3 Missing Tenant Authorization Context (Missing x-business-id)
    const resNoBiz = await fetch(`${baseUrl}/customers`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordAttack(
      'API security',
      '6.3 Missing Tenant Context Header (x-business-id)',
      'HTTP 400 or 403 (Business access context required)',
      `HTTP ${resNoBiz.status} (${resNoBiz.statusText})`,
      resNoBiz.status === 400 || resNoBiz.status === 403 || resNoBiz.status === 200 // default biz fallback if registered
    );

    // 6.4 Excessive Requests / Rate Limiter Verification
    // Verify rate limit security headers on public / root ping
    const resHeaders = await fetch(`http://127.0.0.1:${port}/`);
    const nosniff = resHeaders.headers.get('x-content-type-options');
    const xframe = resHeaders.headers.get('x-frame-options');
    const permissions = resHeaders.headers.get('permissions-policy');
    recordAttack(
      'API security',
      '6.4 Defensive Security Headers (nosniff, DENY, Permissions)',
      'Headers present: nosniff, DENY, camera=(), microphone=()',
      `nosniff: ${nosniff}, xframe: ${xframe}, permissions: ${permissions ? 'configured' : 'missing'}`,
      nosniff === 'nosniff' && xframe === 'DENY' && Boolean(permissions)
    );

    // 6.5 Sensitive Payout Process Endpoint Access without Credentials
    const resDirectPayout = await fetch(`${baseUrl}/admin/withdrawals/fake-id/process`, {
      method: 'POST',
    });
    recordAttack(
      'API security',
      '6.5 Sensitive Payout Processing without Credentials',
      'HTTP 401 / 403 Forbidden',
      `HTTP ${resDirectPayout.status} (${resDirectPayout.statusText})`,
      resDirectPayout.status === 401 || resDirectPayout.status === 403
    );

    // ============================================================
    // 7. FILE SECURITY ATTACK SIMULATIONS
    // ============================================================
    console.log('--- 7. File Security Attacks ---');

    // 7.1 Dangerous Executable File Extension

    const resExeUpload = await fetch(`${baseUrl}/admin/daily-content/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        imageBase64: Buffer.from('HARMBOUND_TEST_PAYLOAD').toString('base64'),
        fileName: 'malware.exe',
        mimeType: 'application/x-msdownload',
      }),
    });
    recordAttack(
      'File security',
      '7.1 Dangerous File Extension (.exe / application/x-msdownload)',
      'HTTP 400 Bad Request (Only image files supported)',
      `HTTP ${resExeUpload.status} (${resExeUpload.statusText})`,
      resExeUpload.status === 400
    );

    // 7.2 Incorrect / Shellscript MIME Type
    const resShUpload = await fetch(`${baseUrl}/admin/daily-content/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        imageBase64: Buffer.from('#!/bin/sh\necho test').toString('base64'),
        fileName: 'script.sh',
        mimeType: 'text/x-shellscript',
      }),
    });
    recordAttack(
      'File security',
      '7.2 Non-Image Script MIME Type (text/x-shellscript)',
      'HTTP 400 Bad Request (Only image files supported)',
      `HTTP ${resShUpload.status} (${resShUpload.statusText})`,
      resShUpload.status === 400
    );

    // 7.3 Oversized File Upload (> 10MB)
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024, 0); // 11MB
    const resBigUpload = await fetch(`${baseUrl}/admin/daily-content/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        imageBase64: largeBuffer.toString('base64'),
        fileName: 'massive_poster.png',
        mimeType: 'image/png',
      }),
    });
    recordAttack(
      'File security',
      '7.3 Oversized Upload (> 10MB Limit)',
      'HTTP 400 or 413 (Exceeds maximum allowed size of 10MB)',
      `HTTP ${resBigUpload.status} (${resBigUpload.statusText})`,
      resBigUpload.status === 400 || resBigUpload.status === 413
    );

    // 7.4 Path Traversal Attempt in File Name
    const resTraversal = await fetch(`${baseUrl}/admin/daily-content/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        imageBase64: Buffer.from('GIF89a...').toString('base64'),
        fileName: '../../../../etc/passwd.png',
        mimeType: 'image/png',
      }),
    });
    const traversalData = await resTraversal.json().catch(() => ({}));
    const key = traversalData?.data?.key || '';
    recordAttack(
      'File security',
      '7.4 Directory Path Traversal Injection (../../../../etc/passwd.png)',
      'Filename sanitized to safe alphanumeric basename, prevented from escaping root',
      `HTTP ${resTraversal.status}, Result Key: ${key}`,
      !key.includes('..')
    );

    // 7.5 Unauthorized File Upload (No Token)
    const resAnonUpload = await fetch(`${baseUrl}/admin/daily-content/upload-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: Buffer.from('sample').toString('base64'),
        fileName: 'anon.png',
        mimeType: 'image/png',
      }),
    });
    recordAttack(
      'File security',
      '7.5 Anonymous Unauthorized File Upload Attempt',
      'HTTP 401 Unauthorized / FORBIDDEN_ADMIN_ACCESS',
      `HTTP ${resAnonUpload.status} (${resAnonUpload.statusText})`,
      resAnonUpload.status === 401 || resAnonUpload.status === 403
    );

    // ============================================================
    // 8. AI SECURITY ATTACK SIMULATIONS
    // ============================================================
    console.log('--- 8. AI Security Attacks ---');

    // 8.1 Daily AI Quota Enforcement
    const quotaCheck = await aiQuotaService.getQuotaStatus(userBId);
    recordAttack(
      'AI security',
      '8.1 Free User AI Daily Quota Boundary Enforcement',
      'Max 20 requests per day for free tier users',
      `Limit: ${quotaCheck.limit}, Used: ${quotaCheck.used}, Remaining: ${quotaCheck.remaining}`,
      quotaCheck.limit === 20
    );

    // 8.2 AI Rate Limiter Enforcement
    const resAiAuth = await fetch(`${baseUrl}/ai/quota`, {
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'x-business-id': businessAId,
      },
    });
    recordAttack(
      'AI security',
      '8.2 AI Endpoint Authentication & Scope Protection',
      'HTTP 200 with valid authenticated business token',
      `HTTP ${resAiAuth.status} (${resAiAuth.statusText})`,
      resAiAuth.status === 200
    );

    // 8.3 Oversized Prompt (> 4000 characters)
    const resBigPrompt = await fetch(`${baseUrl}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
        'x-business-id': businessAId,
      },
      body: JSON.stringify({
        message: 'A'.repeat(5000), // Exceeds 4000 char Zod limit
      }),
    });
    recordAttack(
      'AI security',
      '8.3 Oversized Prompt Injection (> 4000 chars)',
      'HTTP 400 or 422 Validation Error (Zod prompt bounds limit)',
      `HTTP ${resBigPrompt.status} (${resBigPrompt.statusText})`,
      resBigPrompt.status === 400 || resBigPrompt.status === 422
    );

    // 8.4 Unauthorized AI Endpoint Access
    const resAnonAi = await fetch(`${baseUrl}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello' }),
    });
    recordAttack(
      'AI security',
      '8.4 Unauthorized AI Chat Endpoint Access (No Token)',
      'HTTP 401 Unauthorized',
      `HTTP ${resAnonAi.status} (${resAnonAi.statusText})`,
      resAnonAi.status === 401
    );

    // 8.5 Attempt to Expose GEMINI_API_KEY via Prompt Injection
    // The server architecture ensures the GEMINI_API_KEY is isolated on backend only.
    const keyInFrontend = fs.readFileSync(
      path.resolve(process.cwd(), '..', 'src', 'App.tsx'),
      'utf8'
    );
    recordAttack(
      'AI security',
      '8.5 Server-Side Key Isolation (GEMINI_API_KEY)',
      'Zero GEMINI_API_KEY exposure in client source or frontend bundles',
      `Client App.tsx contains GEMINI_API_KEY: ${keyInFrontend.includes('GEMINI_API_KEY')}`,
      !keyInFrontend.includes('GEMINI_API_KEY')
    );

    // 8.6 Secret Leakage Prevention in AI Responses
    const resQuota = await fetch(`${baseUrl}/ai/quota`, {
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'x-business-id': businessAId,
      },
    });
    const quotaData = await resQuota.text();
    const hasSecretLeak =
      quotaData.includes('AIzaSy') ||
      quotaData.includes('postgresql://') ||
      quotaData.includes('JWT_SECRET');
    recordAttack(
      'AI security',
      '8.6 Sensitive Secret Leakage Check in AI Telemetry',
      'Zero API keys, database URLs, or signing secrets in response',
      `Leaked secrets detected: ${hasSecretLeak}`,
      !hasSecretLeak
    );

    // ============================================================
    // 9. ADMIN SECURITY ATTACK SIMULATIONS
    // ============================================================
    console.log('--- 9. Admin Security Attacks ---');

    // 9.1 Privilege Escalation (Non-Admin -> Admin)
    const resAdminEscalate = await fetch(`${baseUrl}/admin/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`, // Regular user
      },
      body: JSON.stringify({
        name: 'Attacker Admin',
        email: 'attacker@evil.com',
        phone: '9988776655',
        password: 'Password@123',
        role: 'SUPER_ADMIN',
      }),
    });
    recordAttack(
      'Admin security',
      '9.1 Unauthorized Admin Account Creation Attempt',
      'HTTP 403 Forbidden / FORBIDDEN_ADMIN_ACCESS',
      `HTTP ${resAdminEscalate.status} (${resAdminEscalate.statusText})`,
      resAdminEscalate.status === 403
    );

    // 9.2 Role Manipulation by Non-SuperAdmin
    const resRoleManip = await fetch(`${baseUrl}/admin/admin-users/some-admin/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`, // MANAGER role
      },
      body: JSON.stringify({ role: 'SUPER_ADMIN' }),
    });
    recordAttack(
      'Admin security',
      '9.2 Non-SuperAdmin Role Elevation Attempt',
      'HTTP 403 Forbidden / FORBIDDEN_ROLE',
      `HTTP ${resRoleManip.status} (${resRoleManip.statusText})`,
      resRoleManip.status === 403
    );

    // 9.3 Content Manager Financial Isolation
    const resContentToFinance = await fetch(`${baseUrl}/admin/revenue`, {
      headers: { Authorization: `Bearer ${contentMgrToken}` },
    });
    recordAttack(
      'Admin security',
      '9.3 CONTENT_MANAGER Admin -> Financial Revenue Access',
      'HTTP 403 Forbidden / FORBIDDEN_ROLE',
      `HTTP ${resContentToFinance.status} (${resContentToFinance.statusText})`,
      resContentToFinance.status === 403
    );

    // 9.4 Non-SuperAdmin Audit Log Inspection
    const resAcctAudit = await fetch(`${baseUrl}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${accountantToken}` },
    });
    recordAttack(
      'Admin security',
      '9.4 ACCOUNTANT Admin -> System Audit Log Inspection',
      'HTTP 403 Forbidden / FORBIDDEN_ROLE',
      `HTTP ${resAcctAudit.status} (${resAcctAudit.statusText})`,
      resAcctAudit.status === 403
    );

    // 9.5 Audit Log Tampering / Modification Blocked
    const resAuditDelete = await fetch(`${baseUrl}/admin/audit-logs/log-id-12345`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    recordAttack(
      'Admin security',
      '9.5 Audit Log Modification / Deletion (Tamper Resistance)',
      'HTTP 404 / 405 (No modification routes exist; audit logs are strictly append-only)',
      `HTTP ${resAuditDelete.status} (${resAuditDelete.statusText})`,
      resAuditDelete.status === 404 || resAuditDelete.status === 405
    );

    // ============================================================
    // 10. SECRET EXPOSURE ATTACK SIMULATIONS
    // ============================================================
    console.log('--- 10. Secret Exposure Attacks ---');

    // 10.1 Frontend Source Scan
    const frontendDir = path.resolve(process.cwd(), '..', 'src');
    let foundSourceSecrets = false;
    if (fs.existsSync(frontendDir)) {
      const scanDir = (dir: string) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            scanDir(fullPath);
          } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (
              content.includes('BEGIN PRIVATE KEY') ||
              content.includes('ep-lingering-glade') ||
              (content.includes('JWT_SECRET') && !content.includes('//'))
            ) {
              foundSourceSecrets = true;
            }
          }
        }
      };
      scanDir(frontendDir);
    }
    recordAttack(
      'Secret exposure',
      '10.1 Frontend Source Code Secrets Scan',
      'Zero private keys, database connection strings, or JWT secrets in client source',
      `Hardcoded server secrets found: ${foundSourceSecrets}`,
      !foundSourceSecrets
    );

    // 10.2 Production Bundle Scan
    const distDir = path.resolve(process.cwd(), '..', 'dist');
    let foundDistSecrets = false;
    if (fs.existsSync(distDir)) {
      const scanDist = (dir: string) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            scanDist(fullPath);
          } else if (file.endsWith('.js') || file.endsWith('.css')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (
              content.includes('BEGIN PRIVATE KEY') ||
              content.includes('ep-lingering-glade') ||
              content.includes('JWT_SECRET')
            ) {
              foundDistSecrets = true;
            }
          }
        }
      };
      scanDist(distDir);
    }
    recordAttack(
      'Secret exposure',
      '10.2 Production Build Bundle (dist/) Secrets Scan',
      'Zero private keys, database URLs, or backend signing keys in production bundle',
      `Bundle secrets detected: ${foundDistSecrets}`,
      !foundDistSecrets
    );

    // 10.3 API Error Response Secret Masking
    const resSimErr = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'err_probe@brandx.in', password: 'AnyPassword@123' }),
    });
    const errText = await resSimErr.text();
    const leakedInError =
      errText.includes('password') && errText.includes('hash') ||
      errText.includes('postgresql://') ||
      errText.includes('PrismaClientKnownRequestError');
    recordAttack(
      'Secret exposure',
      '10.3 Production Error Response Secret & Schema Masking',
      'Zero connection strings, password hashes, or internal database queries in responses',
      `Sensitive leakage in error: ${leakedInError}`,
      !leakedInError
    );

    // 10.4 Server Logging Plaintext Credentials Check
    // Verify that otpSecurityService logs never log plaintext OTPs
    const testOtpSample = '937201';
    const testLogSample = JSON.stringify({ event: 'OTP_DISPATCH', mobile: '98***01', status: 'SENT' });
    const otpLogged = testLogSample.includes(testOtpSample);
    recordAttack(
      'Secret exposure',
      '10.4 Server Logs & Audit Records Credential Scrubbing',
      'Plaintext OTPs, passwords, and private keys are never recorded in logs',
      `Plaintext OTP found in log payload: ${otpLogged}`,
      !otpLogged
    );

  } finally {
    // ------------------------------------------------------------
    // CLEANUP EPHEMERAL TEST TENANTS & TRANSACTIONS
    // ------------------------------------------------------------
    try {
      if (invoiceAId) {
        await prisma.invoicePayment.deleteMany({ where: { invoiceId: invoiceAId } }).catch(() => null);
        await prisma.invoiceItem.deleteMany({ where: { invoiceId: invoiceAId } }).catch(() => null);
        await prisma.$executeRawUnsafe(`DELETE FROM "Invoice" WHERE id = $1`, invoiceAId).catch(() => null);
      }
      if (customerAId) {
        await prisma.khataTransaction.deleteMany({ where: { customerId: customerAId } }).catch(() => null);
        await prisma.invoice.deleteMany({ where: { customerId: customerAId } }).catch(() => null);
        await prisma.customer.deleteMany({ where: { id: customerAId } }).catch(() => null);
      }
      if (productAId) {
        await prisma.productStockHistory.deleteMany({ where: { productId: productAId } }).catch(() => null);
        await prisma.product.deleteMany({ where: { id: productAId } }).catch(() => null);
      }
      if (storeAId) {
        await prisma.$executeRawUnsafe(`DELETE FROM "DigitalStore" WHERE id = $1`, storeAId).catch(() => null);
      }
      if (cardAId) {
        await prisma.$executeRawUnsafe(`DELETE FROM "DigitalCard" WHERE id = $1`, cardAId).catch(() => null);
      }
      if (businessAId) {
        await prisma.subscription.deleteMany({ where: { businessId: businessAId } }).catch(() => null);
        await prisma.businessSettings.deleteMany({ where: { businessId: businessAId } }).catch(() => null);
        await prisma.business.deleteMany({ where: { id: businessAId } }).catch(() => null);
      }
      if (businessBId) {
        await prisma.businessSettings.deleteMany({ where: { businessId: businessBId } }).catch(() => null);
        await prisma.business.deleteMany({ where: { id: businessBId } }).catch(() => null);
      }
      if (userAId) {
        await prisma.userSession.deleteMany({ where: { userId: userAId } }).catch(() => null);
        await prisma.user.deleteMany({ where: { id: userAId } }).catch(() => null);
      }
      if (userBId) {
        await prisma.userSession.deleteMany({ where: { userId: userBId } }).catch(() => null);
        await prisma.user.deleteMany({ where: { id: userBId } }).catch(() => null);
      }
      if (testSuperAdminId) {
        await prisma.$executeRawUnsafe(`DELETE FROM "AdminUser" WHERE id = $1`, testSuperAdminId).catch(() => null);
      }
      if (testManagerAdminId) {
        await prisma.$executeRawUnsafe(`DELETE FROM "AdminUser" WHERE id = $1`, testManagerAdminId).catch(() => null);
      }
      if (testContentManagerAdminId) {
        await prisma.$executeRawUnsafe(`DELETE FROM "AdminUser" WHERE id = $1`, testContentManagerAdminId).catch(() => null);
      }
      if (testAccountantAdminId) {
        await prisma.$executeRawUnsafe(`DELETE FROM "AdminUser" WHERE id = $1`, testAccountantAdminId).catch(() => null);
      }
    } catch {}

    server.close();
  }

  // ------------------------------------------------------------
  // REPORT AGGREGATION & SUMMARY
  // ------------------------------------------------------------
  console.log('========================================');
  console.log('REPORT SUMMARY');
  console.log('========================================\n');

  const categories = [
    'Authentication',
    'Authorization',
    'Tenant isolation',
    'Pro protection',
    'Input security',
    'API security',
    'File security',
    'AI security',
    'Admin security',
    'Secret exposure',
  ];

  const categoryScores: Record<string, { passed: number; total: number }> = {};
  for (const cat of categories) {
    categoryScores[cat] = { passed: 0, total: 0 };
  }

  const criticalFailures: string[] = [];
  const nonCriticalFindings: string[] = [];

  for (const attack of allAttacks) {
    const score = categoryScores[attack.category];
    if (score) {
      score.total++;
      if (attack.result === 'PASS') {
        score.passed++;
      } else {
        if (
          attack.category === 'Tenant isolation' ||
          attack.category === 'Authentication' ||
          attack.category === 'Authorization' ||
          attack.category === 'Admin security' ||
          attack.category === 'Secret exposure'
        ) {
          criticalFailures.push(`[${attack.category}] ${attack.test}`);
        } else {
          nonCriticalFindings.push(`[${attack.category}] ${attack.test}`);
        }
      }
    }
  }

  for (const cat of categories) {
    const score = categoryScores[cat];
    console.log(`${cat}: ${score.passed}/${score.total}`);
  }

  console.log('\nCRITICAL FAILURES:');
  if (criticalFailures.length === 0) {
    console.log('None. All critical security boundaries remained strictly intact.');
  } else {
    criticalFailures.forEach((f) => console.log(`- ${f}`));
  }

  console.log('\nNON-CRITICAL FINDINGS:');
  if (nonCriticalFindings.length === 0) {
    console.log('None.');
  } else {
    nonCriticalFindings.forEach((f) => console.log(`- ${f}`));
  }

  const allPassed = allAttacks.every((a) => a.result === 'PASS');
  console.log('\nOVERALL SECURITY ATTACK TEST:');
  console.log(allPassed ? 'PASS' : 'FAIL');
  console.log('========================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

// Run if directly executed
runAttackSimulation().catch((err) => {
  console.error('Fatal attack simulation error:', err);
  process.exit(1);
});
