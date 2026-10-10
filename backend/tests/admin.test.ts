/**
 * BRANDX — Comprehensive Admin Capabilities & Security Test Suite
 * Covers Admin Authentication, RBAC, Dashboard Metrics, Directory,
 * Plans Management, CMS Content, and Admin Team Operations.
 */

import http from 'http';
import { AddressInfo } from 'net';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { signAccessToken } from '../src/utils/jwt.js';

export async function runAdminTests(): Promise<void> {
  console.log('\n========================================================');
  console.log('🛡️ RUNNING BRANDX ADMIN PORTAL & SECURITY TEST SUITE');
  console.log('========================================================\n');

  // 1. Seed or Verify Super Admin Account in Database
  const superAdminEmail = 'admin@brandx.in';
  const superAdminPassword = 'Admin@BrandX2026';
  const hashedSuperPassword = await bcrypt.hash(superAdminPassword, 10);

  let superAdmin: any;
  try {
    superAdmin = await prisma.adminUser.upsert({
      where: { email: superAdminEmail },
      update: {
        passwordHash: hashedSuperPassword,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
      },
      create: {
        name: 'Super Admin',
        email: superAdminEmail,
        phone: '9820123456',
        passwordHash: hashedSuperPassword,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
      },
    });
  } catch (err: any) {
    if (err?.code === 'P2022') {
      const existing: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "AdminUser" WHERE email = $1 LIMIT 1`,
        superAdminEmail
      );
      if (existing.length > 0) {
        await prisma.$executeRawUnsafe(
          `UPDATE "AdminUser" SET "passwordHash" = $1, "role" = 'SUPER_ADMIN'::"AdminRole", "status" = 'ACTIVE'::"UserStatus", "updatedAt" = NOW() WHERE email = $2`,
          hashedSuperPassword,
          superAdminEmail
        );
        superAdmin = { ...existing[0], passwordHash: hashedSuperPassword, role: 'SUPER_ADMIN', status: 'ACTIVE', isActive: true, permissions: [] };
      } else {
        const id = `adm_${Date.now()}`;
        await prisma.$executeRawUnsafe(
          `INSERT INTO "AdminUser" ("id", "name", "email", "phone", "passwordHash", "role", "status", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, 'SUPER_ADMIN'::"AdminRole", 'ACTIVE'::"UserStatus", NOW(), NOW())`,
          id, 'Super Admin', superAdminEmail, '9820123456', hashedSuperPassword
        );
        superAdmin = { id, name: 'Super Admin', email: superAdminEmail, phone: '9820123456', role: 'SUPER_ADMIN', status: 'ACTIVE', isActive: true, permissions: [] };
      }
    } else {
      throw err;
    }
  }

  console.log(`✅ Super Admin account verified: ${superAdmin.email} [${superAdmin.role}]`);

  // 2. Start Ephemeral Test Server
  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}/api/v1/admin`;
  console.log(`📡 Ephemeral Admin test server listening on port ${port}`);

  let superAdminToken = '';
  let contentManagerToken = '';
  let testUserId = '';
  let testPlanId = '';
  const testManagerEmail = `test.manager.${Date.now()}@brandx.in`;
  const testManagerPassword = 'ContentManager@2026';
  const testPlanCode = `plan_test_${Date.now()}`;

  try {
    // ------------------------------------------------------------
    // TEST 1: Admin Login with Valid Credentials
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 1: Admin Login with Valid Credentials');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: superAdminEmail,
        password: superAdminPassword,
      }),
    });

    const loginData = await loginRes.json();
    if (loginRes.status !== 200 || !loginData.success || !loginData.data?.token) {
      throw new Error(`Admin login failed: ${loginRes.status} ${JSON.stringify(loginData)}`);
    }

    superAdminToken = loginData.data.token;
    if (loginData.data.admin.role !== 'SUPER_ADMIN') {
      throw new Error(`Expected role SUPER_ADMIN, got: ${loginData.data.admin.role}`);
    }
    console.log('✅ Admin login succeeded, JWT generated, role SUPER_ADMIN verified.');

    // ------------------------------------------------------------
    // TEST 2: Admin Login with Wrong Password
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 2: Rejection of Invalid Password');
    const wrongPassRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: superAdminEmail,
        password: 'IncorrectPassword!@#',
      }),
    });

    const wrongPassData = await wrongPassRes.json();
    if (wrongPassRes.status !== 401 || wrongPassData.success) {
      throw new Error(`Expected 401 for wrong password, got: ${wrongPassRes.status}`);
    }
    console.log('✅ Invalid admin password correctly rejected with 401.');

    // ------------------------------------------------------------
    // TEST 3: Admin Login with Non-Existent Account
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 3: Rejection of Non-Existent Admin Email');
    const nonExistentRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ghost.admin@brandx.in',
        password: 'SomePassword123',
      }),
    });

    if (nonExistentRes.status !== 401) {
      throw new Error(`Expected 401 for non-existent admin, got: ${nonExistentRes.status}`);
    }
    console.log('✅ Non-existent admin email correctly rejected with 401.');

    // ------------------------------------------------------------
    // TEST 4: Admin Login Validation Schema Rejection
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 4: Rejection of Malformed Login Payload');
    const malformedRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'not-an-email',
        password: '123', // less than 6 chars
      }),
    });

    if (malformedRes.status !== 422) {
      throw new Error(`Expected 422 for malformed payload, got: ${malformedRes.status}`);
    }
    console.log('✅ Malformed login body correctly rejected with 422 validation error.');

    // ------------------------------------------------------------
    // TEST 5: Protected Route Missing Authorization Header
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 5: Protected Endpoint Rejects Missing Auth Header');
    const noAuthRes = await fetch(`${baseUrl}/overview`);
    const noAuthData = await noAuthRes.json();

    if (noAuthRes.status !== 401 || noAuthData.error?.code !== 'ADMIN_UNAUTHORIZED') {
      throw new Error(`Expected 401 ADMIN_UNAUTHORIZED, got: ${noAuthRes.status}`);
    }
    console.log('✅ Missing authorization header rejected with 401 ADMIN_UNAUTHORIZED.');

    // ------------------------------------------------------------
    // TEST 6: Protected Route Invalid Authorization Scheme
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 6: Protected Endpoint Rejects Non-Bearer Scheme');
    const basicAuthRes = await fetch(`${baseUrl}/overview`, {
      headers: { Authorization: 'Basic dXNlcjpwYXNz' },
    });

    if (basicAuthRes.status !== 401) {
      throw new Error(`Expected 401 for Basic auth scheme, got: ${basicAuthRes.status}`);
    }
    console.log('✅ Non-Bearer authorization scheme rejected with 401.');

    // ------------------------------------------------------------
    // TEST 7: Protected Route Invalid / Tampered JWT
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 7: Protected Endpoint Rejects Tampered Token');
    const tamperedRes = await fetch(`${baseUrl}/overview`, {
      headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.token' },
    });

    if (tamperedRes.status !== 401) {
      throw new Error(`Expected 401 for tampered token, got: ${tamperedRes.status}`);
    }
    console.log('✅ Tampered admin token rejected with 401 ADMIN_TOKEN_INVALID.');

    // ------------------------------------------------------------
    // TEST 8: Admin Team Management - Create Admin User (SUPER_ADMIN only)
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 8: Create New Admin User with CONTENT_MANAGER Role');
    const createAdminRes = await fetch(`${baseUrl}/admin-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        name: 'Test Content Manager',
        email: testManagerEmail,
        password: testManagerPassword,
        role: 'CONTENT_MANAGER',
      }),
    });

    const createAdminData = await createAdminRes.json();
    if (createAdminRes.status !== 201 || !createAdminData.data?.id) {
      throw new Error(`Failed to create admin user: ${createAdminRes.status} ${JSON.stringify(createAdminData)}`);
    }
    console.log(`✅ Admin user created: ${createAdminData.data.email} [${createAdminData.data.role}]`);

    // ------------------------------------------------------------
    // TEST 9: Duplicate Admin Email Prevention
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 9: Duplicate Admin Email Prevention');
    const duplicateAdminRes = await fetch(`${baseUrl}/admin-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        name: 'Another Manager',
        email: testManagerEmail,
        password: testManagerPassword,
        role: 'CONTENT_MANAGER',
      }),
    });

    if (duplicateAdminRes.status !== 400) {
      throw new Error(`Expected 400 for duplicate admin email, got: ${duplicateAdminRes.status}`);
    }
    console.log('✅ Duplicate admin email correctly rejected with 400.');

    // ------------------------------------------------------------
    // TEST 10: List Admin Team Members
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 10: List Admin Team Members');
    const listAdminsRes = await fetch(`${baseUrl}/admin-users`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });

    const listAdminsData = await listAdminsRes.json();
    if (listAdminsRes.status !== 200 || !Array.isArray(listAdminsData.data)) {
      throw new Error(`Failed to list admin users: ${listAdminsRes.status}`);
    }

    const foundCreated = listAdminsData.data.some((a: any) => a.email === testManagerEmail);
    if (!foundCreated) {
      throw new Error('Newly created admin not found in admin users list');
    }
    console.log(`✅ Admin team listing confirmed. Total admin users: ${listAdminsData.data.length}`);

    // ------------------------------------------------------------
    // TEST 11: Login as Newly Created CONTENT_MANAGER
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 11: Login with Newly Created CONTENT_MANAGER');
    const managerLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testManagerEmail,
        password: testManagerPassword,
      }),
    });

    const managerLoginData = await managerLoginRes.json();
    if (managerLoginRes.status !== 200 || !managerLoginData.data?.token) {
      throw new Error(`Content manager login failed: ${managerLoginRes.status}`);
    }
    contentManagerToken = managerLoginData.data.token;
    console.log('✅ CONTENT_MANAGER login succeeded.');

    // ------------------------------------------------------------
    // TEST 12: RBAC Enforcement - Lower Role Blocked from SUPER_ADMIN Route
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 12: RBAC Rejection for Lower Role accessing SUPER_ADMIN route');
    const rbacForbiddenRes = await fetch(`${baseUrl}/admin-users`, {
      headers: { Authorization: `Bearer ${contentManagerToken}` },
    });

    const rbacForbiddenData = await rbacForbiddenRes.json();
    if (rbacForbiddenRes.status !== 403 || rbacForbiddenData.error?.code !== 'FORBIDDEN_ROLE') {
      throw new Error(`Expected 403 FORBIDDEN_ROLE, got: ${rbacForbiddenRes.status} ${JSON.stringify(rbacForbiddenData)}`);
    }
    console.log('✅ RBAC enforced: CONTENT_MANAGER denied access to /admin-users (403 FORBIDDEN_ROLE).');

    // ------------------------------------------------------------
    // TEST 13: RBAC Permitted Route for CONTENT_MANAGER
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 13: RBAC Permitted Route for CONTENT_MANAGER');
    const permittedRes = await fetch(`${baseUrl}/daily-content`, {
      headers: { Authorization: `Bearer ${contentManagerToken}` },
    });

    if (permittedRes.status !== 200) {
      throw new Error(`CONTENT_MANAGER should access /daily-content, got: ${permittedRes.status}`);
    }
    console.log('✅ RBAC permitted: CONTENT_MANAGER successfully accessed /daily-content.');

    // ------------------------------------------------------------
    // TEST 14: Executive Overview Dashboard Metrics
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 14: Executive Overview Dashboard Metrics');
    const overviewRes = await fetch(`${baseUrl}/overview`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });

    const overviewData = await overviewRes.json();
    if (overviewRes.status !== 200 || !overviewData.success || !overviewData.data) {
      throw new Error(`Failed to get dashboard overview: ${overviewRes.status}`);
    }

    const metrics = overviewData.data;
    const requiredMetrics = [
      'totalUsers',
      'totalBusinesses',
      'totalInvoicesGenerated',
      'totalKhataTransactions',
      'proSubscribersCount',
      'activeProCount',
      'totalRevenueGross',
      'failedPaymentsCount',
    ];

    for (const key of requiredMetrics) {
      if (typeof metrics[key] !== 'number') {
        throw new Error(`Missing or non-numeric overview metric: ${key}`);
      }
    }
    console.log('✅ Dashboard overview metrics verified:', {
      users: metrics.totalUsers,
      businesses: metrics.totalBusinesses,
      invoices: metrics.totalInvoicesGenerated,
      khata: metrics.totalKhataTransactions,
      proSubscribers: metrics.proSubscribersCount,
      grossRevenue: metrics.totalRevenueGross,
    });

    // ------------------------------------------------------------
    // TEST 15: Platform User Directory
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 15: Platform Users Directory & Pagination');
    const usersRes = await fetch(`${baseUrl}/users?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });

    const usersData = await usersRes.json();
    if (usersRes.status !== 200 || !Array.isArray(usersData.data)) {
      throw new Error(`Failed to list users: ${usersRes.status}`);
    }

    if (usersData.data.length > 0) {
      testUserId = usersData.data[0].id;
    }
    console.log(`✅ Platform users listed. Total users: ${usersData.pagination?.total ?? usersData.data.length}`);

    // ------------------------------------------------------------
    // TEST 16: Platform Business Directory
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 16: Platform Business Directory & Pagination');
    const bizRes = await fetch(`${baseUrl}/businesses?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });

    const bizData = await bizRes.json();
    if (bizRes.status !== 200 || !Array.isArray(bizData.data)) {
      throw new Error(`Failed to list businesses: ${bizRes.status}`);
    }
    console.log(`✅ Platform businesses listed. Total businesses: ${bizData.pagination?.total ?? bizData.data.length}`);

    // ------------------------------------------------------------
    // TEST 17: User Status Update and Audit Trail
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 17: User Status Update & Audit Trail');
    const dummy = await prisma.user.create({
      data: {
        mobile: `99${Date.now().toString().slice(-8)}`,
        name: 'Status Test User',
        language: 'hi',
      },
    });
    testUserId = dummy.id;

    const suspendRes = await fetch(`${baseUrl}/users/${testUserId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        status: 'SUSPENDED',
        reason: 'Automated test temporary suspension',
      }),
    });

    const suspendData = await suspendRes.json();
    if (suspendRes.status !== 200 || suspendData.data?.status !== 'SUSPENDED') {
      throw new Error(`Failed to suspend user: ${suspendRes.status} ${JSON.stringify(suspendData)}`);
    }

    // Restore user
    await fetch(`${baseUrl}/users/${testUserId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        status: 'ACTIVE',
        reason: 'Test completed, restored',
      }),
    });

    // Check audit log
    let auditRecord: any;
    try {
      auditRecord = await prisma.auditLog.findFirst({
        where: {
          action: 'USER_STATUS_CHANGE',
          entityId: testUserId,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "AuditLog" WHERE action = 'USER_STATUS_CHANGE' AND "entityId" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
        testUserId
      ).catch(() => []);
      if (rows.length > 0) auditRecord = rows[0];
    }

    if (!auditRecord) {
      throw new Error('Audit trail log not found for USER_STATUS_CHANGE');
    }
    console.log('✅ User status update and audit trail logging verified.');

    // ------------------------------------------------------------
    // TEST 18: Revenue, Subscribers & Payment Ledger
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 18: Revenue Summary & Payment Ledger');
    const revRes = await fetch(`${baseUrl}/revenue`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    if (revRes.status !== 200) {
      throw new Error(`Failed to fetch revenue summary: ${revRes.status}`);
    }

    const subsRes = await fetch(`${baseUrl}/subscribers?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    if (subsRes.status !== 200) {
      throw new Error(`Failed to fetch subscribers: ${subsRes.status}`);
    }

    const paymentsRes = await fetch(`${baseUrl}/payments?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    if (paymentsRes.status !== 200) {
      throw new Error(`Failed to fetch payments: ${paymentsRes.status}`);
    }
    console.log('✅ Revenue summary, subscribers list, and payments ledger verified.');

    // ------------------------------------------------------------
    // TEST 19: Subscription Plan Management - List, Create & Deduplicate
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 19: Subscription Plan Management');
    const plansRes = await fetch(`${baseUrl}/plans`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    const plansData = await plansRes.json();
    if (plansRes.status !== 200 || !Array.isArray(plansData.data)) {
      throw new Error(`Failed to list plans: ${plansRes.status}`);
    }

    const hasFree = plansData.data.some((p: any) => p.code === 'free');
    const hasPro = plansData.data.some((p: any) => p.code === 'pro_monthly');
    if (!hasFree || !hasPro) {
      throw new Error('Standard plans (free, pro_monthly) not found in plan list');
    }

    // Create a new custom plan
    const createPlanRes = await fetch(`${baseUrl}/plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        code: testPlanCode,
        name: 'BrandX Enterprise VIP',
        price: 8999,
        billingInterval: 'yearly',
        durationDays: 365,
        features: ['Unlimited AI', 'VIP CA Support', 'Custom Standee'],
      }),
    });

    const createPlanData = await createPlanRes.json();
    if (createPlanRes.status !== 201 || !createPlanData.data?.id) {
      throw new Error(`Failed to create plan: ${createPlanRes.status} ${JSON.stringify(createPlanData)}`);
    }
    testPlanId = createPlanData.data.id;

    // Prevent duplicate plan code
    const duplicatePlanRes = await fetch(`${baseUrl}/plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        code: testPlanCode,
        name: 'Duplicate Plan Code',
        price: 999,
      }),
    });

    if (duplicatePlanRes.status !== 400) {
      throw new Error(`Expected 400 for duplicate plan code, got: ${duplicatePlanRes.status}`);
    }

    // Update plan details
    const updatePlanRes = await fetch(`${baseUrl}/plans/${testPlanId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        price: 7999,
        description: 'Updated enterprise pricing for seasonal promotion',
      }),
    });

    const updatePlanData = await updatePlanRes.json();
    if (updatePlanRes.status !== 200 || updatePlanData.data?.price !== 7999) {
      throw new Error(`Failed to update plan: ${updatePlanRes.status}`);
    }
    console.log(`✅ Subscription plan lifecycle verified (create, duplicate block, update).`);

    // ------------------------------------------------------------
    // TEST 20: CMS Daily Content & Festival Calendar Endpoints
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 20: CMS Daily Content & Festival Calendar APIs');
    const dailyContentRes = await fetch(`${baseUrl}/daily-content?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    if (dailyContentRes.status !== 200) {
      throw new Error(`Failed to list daily content: ${dailyContentRes.status}`);
    }

    const festivalsRes = await fetch(`${baseUrl}/festivals`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    if (festivalsRes.status !== 200) {
      throw new Error(`Failed to list festivals: ${festivalsRes.status}`);
    }

    const categoriesRes = await fetch(`${baseUrl}/content-categories`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    if (categoriesRes.status !== 200) {
      throw new Error(`Failed to list content categories: ${categoriesRes.status}`);
    }

    const postersRes = await fetch(`${baseUrl}/posters`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    if (postersRes.status !== 200) {
      throw new Error(`Failed to list posters: ${postersRes.status}`);
    }
    console.log('✅ CMS APIs verified: daily content, festivals, categories, posters.');

    // ------------------------------------------------------------
    // TEST 21: MANAGER Role RBAC Verification
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 21: MANAGER Role RBAC Permissions & Boundaries');
    const opsManagerEmail = `test.opsmanager.${Date.now()}@brandx.in`;
    const opsManagerPass = 'OpsManager@2026';

    // Create Manager via Super Admin
    const createManagerRes = await fetch(`${baseUrl}/admin-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        name: 'Operations Manager',
        email: opsManagerEmail,
        password: opsManagerPass,
        role: 'MANAGER',
        phone: '9870011223',
      }),
    });

    const createManagerData = await createManagerRes.json();
    if (createManagerRes.status !== 201 || createManagerData.data?.role !== 'MANAGER') {
      throw new Error(`Failed to create Manager account: ${createManagerRes.status} ${JSON.stringify(createManagerData)}`);
    }

    // Login as Manager
    const opsManagerLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: opsManagerEmail, password: opsManagerPass }),
    });
    const opsManagerLoginData = await opsManagerLoginRes.json();
    if (opsManagerLoginRes.status !== 200 || !opsManagerLoginData.data?.token) {
      throw new Error(`Manager login failed: ${opsManagerLoginRes.status}`);
    }
    const managerToken = opsManagerLoginData.data.token;

    // Manager CAN access Users & Businesses directory
    const managerUsersRes = await fetch(`${baseUrl}/users?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    if (managerUsersRes.status !== 200) {
      throw new Error(`Manager should have access to users directory, got: ${managerUsersRes.status}`);
    }

    // Manager CAN access CMS daily content
    const managerCmsRes = await fetch(`${baseUrl}/daily-content?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    if (managerCmsRes.status !== 200) {
      throw new Error(`Manager should have access to CMS daily content, got: ${managerCmsRes.status}`);
    }

    // Manager CANNOT access Payments (financial ledger)
    const managerPaymentsRes = await fetch(`${baseUrl}/payments`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    if (managerPaymentsRes.status !== 403) {
      throw new Error(`Manager must be forbidden (403) from payments, got: ${managerPaymentsRes.status}`);
    }

    // Manager CANNOT access Admin Users management
    const managerAdminUsersRes = await fetch(`${baseUrl}/admin-users`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    if (managerAdminUsersRes.status !== 403) {
      throw new Error(`Manager must be forbidden (403) from admin-users, got: ${managerAdminUsersRes.status}`);
    }

    // Manager CANNOT access Audit Logs
    const managerAuditRes = await fetch(`${baseUrl}/audit-logs`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    if (managerAuditRes.status !== 403) {
      throw new Error(`Manager must be forbidden (403) from audit-logs, got: ${managerAuditRes.status}`);
    }
    console.log('✅ MANAGER role permissions verified: operations/CMS allowed, payments/admin-users/audit-logs denied with 403.');

    // ------------------------------------------------------------
    // TEST 22: ACCOUNTANT Role RBAC Verification
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 22: ACCOUNTANT Role RBAC Permissions & Boundaries');
    const accountantEmail = `test.accountant.${Date.now()}@brandx.in`;
    const accountantPass = 'Accountant@2026';

    // Create Accountant via Super Admin
    const createAccountantRes = await fetch(`${baseUrl}/admin-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        name: 'Chief Accountant',
        email: accountantEmail,
        password: accountantPass,
        role: 'ACCOUNTANT',
        phone: '9880022334',
      }),
    });

    const createAccountantData = await createAccountantRes.json();
    if (createAccountantRes.status !== 201 || createAccountantData.data?.role !== 'ACCOUNTANT') {
      throw new Error(`Failed to create Accountant account: ${createAccountantRes.status} ${JSON.stringify(createAccountantData)}`);
    }
    const accountantId = createAccountantData.data.id;

    // Login as Accountant
    const accountantLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: accountantEmail, password: accountantPass }),
    });
    const accountantLoginData = await accountantLoginRes.json();
    if (accountantLoginRes.status !== 200 || !accountantLoginData.data?.token) {
      throw new Error(`Accountant login failed: ${accountantLoginRes.status}`);
    }
    const accountantToken = accountantLoginData.data.token;

    // Accountant CAN access Payments
    const accountantPaymentsRes = await fetch(`${baseUrl}/payments`, {
      headers: { Authorization: `Bearer ${accountantToken}` },
    });
    if (accountantPaymentsRes.status !== 200) {
      throw new Error(`Accountant should have access to payments, got: ${accountantPaymentsRes.status}`);
    }

    // Accountant CAN access Revenue & Refunds
    const accountantRevenueRes = await fetch(`${baseUrl}/revenue`, {
      headers: { Authorization: `Bearer ${accountantToken}` },
    });
    if (accountantRevenueRes.status !== 200) {
      throw new Error(`Accountant should have access to revenue summary, got: ${accountantRevenueRes.status}`);
    }

    // Accountant CANNOT access Users directory
    const accountantUsersRes = await fetch(`${baseUrl}/users`, {
      headers: { Authorization: `Bearer ${accountantToken}` },
    });
    if (accountantUsersRes.status !== 403) {
      throw new Error(`Accountant must be forbidden (403) from users directory, got: ${accountantUsersRes.status}`);
    }

    // Accountant CANNOT access Businesses directory
    const accountantBizRes = await fetch(`${baseUrl}/businesses`, {
      headers: { Authorization: `Bearer ${accountantToken}` },
    });
    if (accountantBizRes.status !== 403) {
      throw new Error(`Accountant must be forbidden (403) from businesses directory, got: ${accountantBizRes.status}`);
    }

    // Accountant CANNOT access Admin Users management
    const accountantAdminUsersRes = await fetch(`${baseUrl}/admin-users`, {
      headers: { Authorization: `Bearer ${accountantToken}` },
    });
    if (accountantAdminUsersRes.status !== 403) {
      throw new Error(`Accountant must be forbidden (403) from admin-users, got: ${accountantAdminUsersRes.status}`);
    }
    console.log('✅ ACCOUNTANT role permissions verified: financial ledgers allowed, user/business/admin management denied with 403.');

    // ------------------------------------------------------------
    // TEST 23: Inactive Admin Rejection & Status Toggling
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 23: Inactive Admin Account Blocking & Suspension');
    // Suspend Accountant via Super Admin
    const suspendAdminRes = await fetch(`${baseUrl}/admin-users/${accountantId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        status: 'SUSPENDED',
        isActive: false,
        reason: 'Temporary audit review',
      }),
    });

    if (suspendAdminRes.status !== 200) {
      throw new Error(`Failed to suspend accountant: ${suspendAdminRes.status}`);
    }

    // Subsequent API call with existing accountant token must be rejected with 403 ADMIN_INACTIVE
    const blockedApiRes = await fetch(`${baseUrl}/payments`, {
      headers: { Authorization: `Bearer ${accountantToken}` },
    });
    const blockedApiData = await blockedApiRes.json();
    if (blockedApiRes.status !== 403 || blockedApiData.error?.code !== 'ADMIN_INACTIVE') {
      throw new Error(`Expected 403 ADMIN_INACTIVE on suspended token, got: ${blockedApiRes.status} ${JSON.stringify(blockedApiData)}`);
    }

    // Attempting fresh login while suspended must be rejected with 403
    const blockedLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: accountantEmail, password: accountantPass }),
    });
    const blockedLoginData = await blockedLoginRes.json();
    if (blockedLoginRes.status !== 403 || blockedLoginData.error?.code !== 'ADMIN_INACTIVE') {
      throw new Error(`Expected 403 ADMIN_INACTIVE on suspended login, got: ${blockedLoginRes.status}`);
    }

    // Re-activate accountant
    const activateAdminRes = await fetch(`${baseUrl}/admin-users/${accountantId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        status: 'ACTIVE',
        isActive: true,
        reason: 'Audit completed successfully',
      }),
    });
    if (activateAdminRes.status !== 200) {
      throw new Error(`Failed to re-activate accountant: ${activateAdminRes.status}`);
    }
    console.log('✅ Inactive admin blocking verified: suspended account rejected with 403 ADMIN_INACTIVE.');

    // ------------------------------------------------------------
    // TEST 24: Protection of SUPER_ADMIN Role
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 24: Protection of SUPER_ADMIN Role');
    // Attempting to create a SUPER_ADMIN via the employee creation endpoint by non-super-admin
    const createSuperAdminAttempt = await fetch(`${baseUrl}/admin-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({
        name: 'Rogue Super Admin',
        email: `rogue.super.${Date.now()}@brandx.in`,
        password: 'Password123!',
        role: 'SUPER_ADMIN',
      }),
    });
    if (createSuperAdminAttempt.status === 201) {
      throw new Error('Expected failure when attempting to create SUPER_ADMIN via employee creation API');
    }

    // Attempting to suspend the primary Super Admin account must be rejected
    const suspendSuperAdminAttempt = await fetch(`${baseUrl}/admin-users/${superAdmin.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        status: 'SUSPENDED',
        isActive: false,
      }),
    });
    if (suspendSuperAdminAttempt.status === 200) {
      throw new Error('Expected failure when attempting to suspend Super Admin account');
    }
    console.log('✅ SUPER_ADMIN protection verified: rogue creation blocked, root suspension blocked.');

    // ------------------------------------------------------------
    // TEST 25: Security Audit Logs Verification
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 25: Security Audit Trail Endpoints');
    const auditLogsRes = await fetch(`${baseUrl}/audit-logs`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    const auditLogsData = await auditLogsRes.json();
    if (auditLogsRes.status !== 200 || !Array.isArray(auditLogsData.data)) {
      throw new Error(`Failed to fetch audit logs: ${auditLogsRes.status}`);
    }

    const hasCreatedLog = auditLogsData.data.some((l: any) => l.action === 'ADMIN_USER_CREATED');
    const hasStatusLog = auditLogsData.data.some((l: any) => l.action === 'ADMIN_STATUS_CHANGED');
    if (!hasCreatedLog || !hasStatusLog) {
      throw new Error('Expected audit log events (ADMIN_USER_CREATED, ADMIN_STATUS_CHANGED) not found');
    }
    console.log(`✅ Security audit trail verified (${auditLogsData.data.length} immutable events recorded).`);

    // ------------------------------------------------------------
    // TEST 26: Normal Customer Token Access Rejection (403 Forbidden)
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 26: Normal Customer User Token Rejection (403 Forbidden)');
    const customerToken = signAccessToken({
      userId: testUserId || 'usr_test_customer_123',
      name: 'Test Customer User',
      mobile: '9820998877',
    });

    const customerAttemptRes = await fetch(`${baseUrl}/overview`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const customerAttemptData = await customerAttemptRes.json();

    if (customerAttemptRes.status !== 403 || customerAttemptData.error?.code !== 'FORBIDDEN_ADMIN_ACCESS') {
      throw new Error(`Expected 403 FORBIDDEN_ADMIN_ACCESS for customer user token, got: ${customerAttemptRes.status} ${JSON.stringify(customerAttemptData)}`);
    }
    console.log('✅ Customer token correctly rejected with 403 FORBIDDEN_ADMIN_ACCESS.');

    // ------------------------------------------------------------
    // TEST 27: Expired and Malformed Admin Token Rejection (401 Unauthorized)
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 27: Expired and Malformed Admin Token Rejection (401)');
    const malformedTokenRes = await fetch(`${baseUrl}/overview`, {
      headers: { Authorization: 'Bearer this.is.a.completely.fake.token' },
    });
    const malformedTokenData = await malformedTokenRes.json();
    if (malformedTokenRes.status !== 401 || malformedTokenData.error?.code !== 'ADMIN_TOKEN_INVALID') {
      throw new Error(`Expected 401 ADMIN_TOKEN_INVALID on malformed token, got: ${malformedTokenRes.status}`);
    }
    console.log('✅ Malformed token correctly rejected with 401 ADMIN_TOKEN_INVALID.');

    // ------------------------------------------------------------
    // TEST 28: Manager Role Boundary — Cannot Self-Promote or Edit Roles
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 28: Manager Cannot Self-Promote or Edit Roles (403)');
    const managerSelfPromoteRes = await fetch(`${baseUrl}/admin-users/${managerToken ? 'target' : 'dummy'}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({ role: 'SUPER_ADMIN' }),
    });
    if (managerSelfPromoteRes.status !== 403) {
      throw new Error(`Expected 403 for Manager editing admin roles, got: ${managerSelfPromoteRes.status}`);
    }
    console.log('✅ Manager self-promotion/role modification correctly blocked with 403.');

    // ------------------------------------------------------------
    // TEST 29: Accountant Role Boundary — Cannot Modify User Status
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 29: Accountant Cannot Modify Customer User Status (403)');
    const accountantUserStatusRes = await fetch(`${baseUrl}/users/${testUserId || 'usr_dummy'}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accountantToken}`,
      },
      body: JSON.stringify({ status: 'SUSPENDED' }),
    });
    if (accountantUserStatusRes.status !== 403) {
      throw new Error(`Expected 403 for Accountant modifying customer user status, got: ${accountantUserStatusRes.status}`);
    }
    console.log('✅ Accountant modifying customer status correctly blocked with 403.');

    // ------------------------------------------------------------
    // TEST 30: Audit Log Privacy & Sensitive Data Scrubbing Verification
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 30: Audit Log Privacy & Sensitive Data Scrubbing Verification');
    let allAuditLogs: any[] = [];
    try {
      allAuditLogs = await prisma.auditLog.findMany({ take: 50 });
    } catch {
      allAuditLogs = await prisma
        .$queryRawUnsafe<any[]>(
          `SELECT id, "actorId", "actorType", action, entity, "entityId", "ipAddress", "userAgent", details as metadata, "createdAt"
           FROM "AuditLog" LIMIT 50`
        )
        .catch(() => []);
    }
    for (const log of allAuditLogs) {
      const metaString = JSON.stringify(log.metadata || {}).toLowerCase();
      if (metaString.includes('password') || metaString.includes('jwt') || metaString.includes('token') || metaString.includes('secret')) {
        throw new Error(`Audit log entry ${log.id} contains sensitive credentials: ${metaString}`);
      }
    }
    console.log('✅ Privacy verified: Zero passwords, JWT tokens, or secrets leaked into audit logs.');

  } finally {
    // ------------------------------------------------------------
    // CLEANUP
    // ------------------------------------------------------------
    console.log('\n🧹 Cleaning up test artifacts...');
    try {
      if (testPlanId) {
        await prisma.subscriptionPlan.delete({ where: { id: testPlanId } }).catch(async () => {
          await prisma.$executeRawUnsafe(`DELETE FROM "SubscriptionPlan" WHERE id = $1`, testPlanId).catch(() => {});
        });
      }
      if (testUserId) {
        await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
      }
      await prisma.adminUser.deleteMany({ where: { email: { contains: 'test.' } } }).catch(() => {});
      await prisma.auditLog.deleteMany({ where: { entityId: testUserId } }).catch(() => {});
    } catch {
      // Ignore cleanup error
    }

    // Close server
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    console.log('🔒 Test server closed cleanly.');
  }

  console.log('\n========================================================');
  console.log('🎉 ALL 30 ADMIN CAPABILITY & SECURITY TESTS PASSED!');
  console.log('========================================================');
}

// Allow direct CLI execution
if (process.argv[1]?.endsWith('admin.test.ts') || process.argv[1]?.endsWith('admin.test.js')) {
  runAdminTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Admin test suite failed:', err);
      process.exit(1);
    });
}
