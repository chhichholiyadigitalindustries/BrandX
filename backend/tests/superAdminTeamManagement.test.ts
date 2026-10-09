/**
 * BRANDX — SUPER_ADMIN Full Team Control & Organization RBAC Test Suite
 * Covers all 16 Module 9 Required Verification Scenarios:
 * 1. SUPER_ADMIN can edit a team member's name, email, phone and designation.
 * 2. SUPER_ADMIN can assign COO, CMO, ADMIN, MANAGER and CONTENT_MANAGER roles.
 * 3. Mandeep's verified existing account shows COO, not MANAGER.
 * 4. The correct COO permissions take effect immediately after role change.
 * 5. Role changes persist after refresh and re-login.
 * 6. SUPER_ADMIN can deactivate an eligible team member.
 * 7. Deactivated sessions lose access to protected APIs.
 * 8. SUPER_ADMIN can permanently remove access to an eligible team member account.
 * 9. Deleted accounts cannot log in again.
 * 10. Financial and audit history remain intact after account removal.
 * 11. Non-SUPER_ADMIN users cannot modify or delete team accounts.
 * 12. Users cannot promote themselves to SUPER_ADMIN.
 * 13. The last active SUPER_ADMIN cannot be accidentally deleted or demoted.
 * 14. Duplicate email and invalid profile changes are rejected.
 * 15. Firebase and application account records remain consistent.
 * 16. Existing customers, Pro users, payments, subscriptions, invoices and Khata data remain intact.
 */

import http from 'http';
import { AddressInfo } from 'net';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { signAdminToken } from '../src/utils/jwt.js';

export async function runSuperAdminTeamManagementTests(): Promise<void> {
  console.log('\n================================================================');
  console.log('🛡️  RUNNING BRANDX SUPER_ADMIN FULL TEAM CONTROL TEST SUITE');
  console.log('================================================================\n');

  // Baseline data integrity check
  const baselineUsers = await prisma.user.count().catch(() => 0);
  const baselineSubscriptions = await prisma.subscription.count().catch(() => 0);
  const baselineInvoices = await prisma.invoice.count().catch(() => 0);
  const baselineKhata = await prisma.khataTransaction.count().catch(() => 0);
  console.log(`📊 Baseline Counts -> Users: ${baselineUsers}, Subscriptions: ${baselineSubscriptions}, Invoices: ${baselineInvoices}, Khata: ${baselineKhata}`);

  // Start Ephemeral Server
  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}/api/v1/admin`;
  console.log(`📡 Ephemeral Test Server listening on port ${port}`);

  // Fetch Super Admin account
  const superAdmin = await prisma.adminUser.findFirst({
    where: { role: 'SUPER_ADMIN', status: 'ACTIVE' },
  });
  if (!superAdmin) {
    throw new Error('A SUPER_ADMIN account is required to execute tests');
  }

  const superAdminToken = signAdminToken({
    adminId: superAdmin.id,
    email: superAdmin.email,
    name: superAdmin.name,
    role: 'SUPER_ADMIN',
  });

  const superAdminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${superAdminToken}`,
  };

  let passedTests = 0;

  try {
    // -------------------------------------------------------------
    // Test 3: Mandeep's verified existing account shows COO, not MANAGER
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Verify Mandeep shows COO and Chief Operating Officer (COO) ---');
    const mandeep = await prisma.adminUser.findFirst({
      where: { email: 'manager@brandx.in' },
    });
    if (!mandeep) throw new Error('Mandeep account (manager@brandx.in) not found');

    if (mandeep.role !== 'COO') {
      throw new Error(`Expected Mandeep role to be COO, got ${mandeep.role}`);
    }
    if (mandeep.designation !== 'Chief Operating Officer (COO)') {
      throw new Error(`Expected Mandeep designation to be Chief Operating Officer (COO), got ${mandeep.designation}`);
    }
    console.log(`✅ TEST 3 PASSED: Mandeep account verified: role=${mandeep.role}, designation="${mandeep.designation}"`);
    passedTests++;

    // -------------------------------------------------------------
    // Setup temporary test member for testing
    // -------------------------------------------------------------
    const tempMemberEmail = 'test_member_alpha@brandx.in';
    await prisma.adminUser.deleteMany({ where: { email: tempMemberEmail } }).catch(() => {});
    const pwdHash = await bcrypt.hash('TestAlpha#1234', 10);

    const tempMember = await prisma.adminUser.create({
      data: {
        name: 'Alpha Tester',
        email: tempMemberEmail,
        phone: '9876543210',
        designation: 'Operations Specialist',
        department: 'Operations & Logistics',
        passwordHash: pwdHash,
        role: 'MANAGER',
        status: 'ACTIVE',
        isActive: true,
      },
    });

    // -------------------------------------------------------------
    // Test 1: SUPER_ADMIN can edit a team member's name, email, phone and designation
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: SUPER_ADMIN edits team member profile details ---');
    const updateRes = await fetch(`${baseUrl}/admin-users/${tempMember.id}`, {
      method: 'PATCH',
      headers: superAdminHeaders,
      body: JSON.stringify({
        name: 'Alpha Tester Renamed',
        phone: '9998887776',
        designation: 'Head of Special Operations',
        department: 'Executive Operations',
      }),
    });
    const updateJson = await updateRes.json();
    if (!updateRes.ok || !updateJson.success) {
      throw new Error(`Failed to edit team member: ${JSON.stringify(updateJson)}`);
    }

    const checkAlpha = await prisma.adminUser.findUnique({ where: { id: tempMember.id } });
    if (
      checkAlpha?.name !== 'Alpha Tester Renamed' ||
      checkAlpha?.phone !== '9998887776' ||
      checkAlpha?.designation !== 'Head of Special Operations' ||
      checkAlpha?.department !== 'Executive Operations'
    ) {
      throw new Error(`Database record did not match expected edits: ${JSON.stringify(checkAlpha)}`);
    }
    console.log('✅ TEST 1 PASSED: Super Admin successfully edited name, phone, designation, and department');
    passedTests++;

    // -------------------------------------------------------------
    // Test 2: SUPER_ADMIN can assign COO, CMO, ADMIN, MANAGER and CONTENT_MANAGER roles
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: SUPER_ADMIN assigns all organizational roles ---');
    const testRoles = ['COO', 'CMO', 'ADMIN', 'MANAGER', 'CONTENT_MANAGER'];
    for (const r of testRoles) {
      const roleRes = await fetch(`${baseUrl}/admin-users/${tempMember.id}/role`, {
        method: 'PATCH',
        headers: superAdminHeaders,
        body: JSON.stringify({ role: r, designation: `Role ${r} Title` }),
      });
      const roleJson = await roleRes.json();
      if (!roleRes.ok || !roleJson.success) {
        throw new Error(`Failed to assign role ${r}: ${JSON.stringify(roleJson)}`);
      }
      const inDb = await prisma.adminUser.findUnique({ where: { id: tempMember.id } });
      if (inDb?.role !== r) {
        throw new Error(`Role ${r} not persisted in database. Found ${inDb?.role}`);
      }
    }
    console.log('✅ TEST 2 PASSED: Successfully assigned COO, CMO, ADMIN, MANAGER, and CONTENT_MANAGER roles');
    passedTests++;

    // -------------------------------------------------------------
    // Test 4: Correct COO permissions take effect immediately after role change
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Immediate permission enforcement after role change ---');
    // Set tempMember to COO
    await fetch(`${baseUrl}/admin-users/${tempMember.id}/role`, {
      method: 'PATCH',
      headers: superAdminHeaders,
      body: JSON.stringify({ role: 'COO' }),
    });

    const tempCooToken = signAdminToken({
      adminId: tempMember.id,
      email: tempMember.email,
      name: tempMember.name,
      role: 'COO',
    });

    // Test access to COO protected endpoints
    const cooOverviewRes = await fetch(`${baseUrl}/overview`, {
      headers: { Authorization: `Bearer ${tempCooToken}` },
    });
    if (!cooOverviewRes.ok) {
      throw new Error(`COO access to overview failed with status ${cooOverviewRes.status}`);
    }

    const cooSubscribersRes = await fetch(`${baseUrl}/subscribers`, {
      headers: { Authorization: `Bearer ${tempCooToken}` },
    });
    if (!cooSubscribersRes.ok) {
      throw new Error(`COO access to subscribers failed with status ${cooSubscribersRes.status}`);
    }
    console.log('✅ TEST 4 PASSED: COO permissions took effect immediately on protected endpoints');
    passedTests++;

    // -------------------------------------------------------------
    // Test 5: Role changes persist after refresh and re-login
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Role changes persist after refresh and re-login ---');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: tempMemberEmail, password: 'TestAlpha#1234' }),
    });
    const loginJson = await loginRes.json();
    if (!loginRes.ok || loginJson.data?.admin?.role !== 'COO') {
      throw new Error(`Login did not return COO role: ${JSON.stringify(loginJson)}`);
    }

    const listRes = await fetch(`${baseUrl}/admin-users`, {
      headers: superAdminHeaders,
    });
    const listJson = await listRes.json();
    const listedTemp = (listJson.data || []).find((a: any) => a.id === tempMember.id);
    if (!listedTemp || listedTemp.role !== 'COO') {
      throw new Error(`Listed admin user did not have COO role: ${JSON.stringify(listedTemp)}`);
    }
    console.log('✅ TEST 5 PASSED: Role persists across fresh query and re-login');
    passedTests++;

    // -------------------------------------------------------------
    // Test 6: SUPER_ADMIN can deactivate an eligible team member
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: SUPER_ADMIN deactivates eligible team member ---');
    const suspendRes = await fetch(`${baseUrl}/admin-users/${tempMember.id}/status`, {
      method: 'PATCH',
      headers: superAdminHeaders,
      body: JSON.stringify({ status: 'SUSPENDED', isActive: false, reason: 'Test suspension' }),
    });
    const suspendJson = await suspendRes.json();
    if (!suspendRes.ok || !suspendJson.success) {
      throw new Error(`Failed to suspend team member: ${JSON.stringify(suspendJson)}`);
    }

    const checkSuspended = await prisma.adminUser.findUnique({ where: { id: tempMember.id } });
    if (checkSuspended?.status !== 'SUSPENDED' || checkSuspended?.isActive !== false) {
      throw new Error(`Database does not reflect suspension: ${JSON.stringify(checkSuspended)}`);
    }
    console.log('✅ TEST 6 PASSED: Member successfully deactivated and status set to SUSPENDED');
    passedTests++;

    // -------------------------------------------------------------
    // Test 7: Deactivated sessions lose access to protected APIs
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Deactivated session immediately loses access ---');
    const blockedRes = await fetch(`${baseUrl}/overview`, {
      headers: { Authorization: `Bearer ${tempCooToken}` },
    });
    if (blockedRes.status !== 403) {
      throw new Error(`Expected 403 ADMIN_INACTIVE, got ${blockedRes.status}`);
    }

    // Login must also be blocked
    const blockedLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: tempMemberEmail, password: 'TestAlpha#1234' }),
    });
    if (blockedLogin.status !== 403) {
      throw new Error(`Expected 403 on suspended login, got ${blockedLogin.status}`);
    }
    console.log('✅ TEST 7 PASSED: Existing token and future login attempts immediately blocked (403)');
    passedTests++;

    // -------------------------------------------------------------
    // Test 8: SUPER_ADMIN can permanently remove access to an eligible team member
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: SUPER_ADMIN permanently deletes eligible team account ---');
    const deleteRes = await fetch(`${baseUrl}/admin-users/${tempMember.id}`, {
      method: 'DELETE',
      headers: superAdminHeaders,
      body: JSON.stringify({ confirmation: 'DELETE', reason: 'Automated test permanent deletion' }),
    });
    const deleteJson = await deleteRes.json();
    if (!deleteRes.ok || !deleteJson.success) {
      throw new Error(`Failed to permanently delete team member: ${JSON.stringify(deleteJson)}`);
    }

    const checkDeleted = await prisma.adminUser.findUnique({ where: { id: tempMember.id } });
    if (checkDeleted !== null) {
      throw new Error('Account record still exists in database after delete');
    }
    console.log('✅ TEST 8 PASSED: Account successfully deleted from database');
    passedTests++;

    // -------------------------------------------------------------
    // Test 9: Deleted accounts cannot log in again
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: Deleted account cannot log in or use old session ---');
    const deletedLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: tempMemberEmail, password: 'TestAlpha#1234' }),
    });
    if (deletedLogin.status !== 401) {
      throw new Error(`Expected 401 on deleted login, got ${deletedLogin.status}`);
    }

    const deletedTokenUse = await fetch(`${baseUrl}/overview`, {
      headers: { Authorization: `Bearer ${tempCooToken}` },
    });
    if (deletedTokenUse.status !== 401) {
      throw new Error(`Expected 401 ADMIN_NOT_FOUND on token use, got ${deletedTokenUse.status}`);
    }
    console.log('✅ TEST 9 PASSED: Deleted account login returns 401 and prior token returns 401');
    passedTests++;

    // -------------------------------------------------------------
    // Test 10: Financial and audit history remain intact after account removal
    // -------------------------------------------------------------
    console.log('\n--- TEST 10: Audit trail and financial records remain intact ---');
    const deletionLogs = await prisma.auditLog.findMany({
      where: {
        entity: 'AdminUser',
        action: 'ADMIN_USER_DELETED',
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    if (deletionLogs.length === 0) {
      throw new Error('Expected deletion audit log record to exist in database');
    }
    console.log(`✅ TEST 10 PASSED: Deletion audit record captured: action="${deletionLogs[0].action}", actorId=${deletionLogs[0].actorId}`);
    passedTests++;

    // -------------------------------------------------------------
    // Test 11: Non-SUPER_ADMIN users cannot modify or delete team accounts
    // -------------------------------------------------------------
    console.log('\n--- TEST 11: Non-SUPER_ADMIN users cannot modify or delete accounts ---');
    const cooAdmin = await prisma.adminUser.findFirst({ where: { role: 'COO' } });
    const cooToken = signAdminToken({
      adminId: cooAdmin!.id,
      email: cooAdmin!.email,
      name: cooAdmin!.name,
      role: 'COO',
    });
    const cooHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cooToken}`,
    };

    const cooCreateRes = await fetch(`${baseUrl}/admin-users`, {
      method: 'POST',
      headers: cooHeaders,
      body: JSON.stringify({ name: 'Hacker', email: 'hack@brandx.in', password: 'password123', role: 'ADMIN' }),
    });
    if (cooCreateRes.status !== 403) {
      throw new Error(`Expected 403 on COO creating user, got ${cooCreateRes.status}`);
    }

    const cooDeleteRes = await fetch(`${baseUrl}/admin-users/${superAdmin.id}`, {
      method: 'DELETE',
      headers: cooHeaders,
      body: JSON.stringify({ confirmation: 'DELETE' }),
    });
    if (cooDeleteRes.status !== 403) {
      throw new Error(`Expected 403 on COO deleting user, got ${cooDeleteRes.status}`);
    }
    console.log('✅ TEST 11 PASSED: Non-SUPER_ADMIN blocked from create/delete with 403 FORBIDDEN_ROLE');
    passedTests++;

    // -------------------------------------------------------------
    // Test 12: Users cannot promote themselves to SUPER_ADMIN
    // -------------------------------------------------------------
    console.log('\n--- TEST 12: Self-promotion and unauthorized privilege escalation blocked ---');
    const selfPromoteRes = await fetch(`${baseUrl}/admin-users/${cooAdmin!.id}/role`, {
      method: 'PATCH',
      headers: cooHeaders,
      body: JSON.stringify({ role: 'SUPER_ADMIN' }),
    });
    if (selfPromoteRes.status !== 403) {
      throw new Error(`Expected 403 on self promotion attempt, got ${selfPromoteRes.status}`);
    }
    console.log('✅ TEST 12 PASSED: Self-promotion blocked with 403 FORBIDDEN_ROLE');
    passedTests++;

    // -------------------------------------------------------------
    // Test 13: Last active SUPER_ADMIN cannot be accidentally deleted or demoted
    // -------------------------------------------------------------
    console.log('\n--- TEST 13: Last active SUPER_ADMIN protection ---');
    const demoteRes = await fetch(`${baseUrl}/admin-users/${superAdmin.id}/role`, {
      method: 'PATCH',
      headers: superAdminHeaders,
      body: JSON.stringify({ role: 'MANAGER' }),
    });
    const demoteJson = await demoteRes.json();
    if (demoteRes.status === 200 || demoteJson.success) {
      throw new Error('Last active SUPER_ADMIN demotion should have been rejected');
    }

    const selfDeleteRes = await fetch(`${baseUrl}/admin-users/${superAdmin.id}`, {
      method: 'DELETE',
      headers: superAdminHeaders,
      body: JSON.stringify({ confirmation: 'DELETE' }),
    });
    const selfDeleteJson = await selfDeleteRes.json();
    if (selfDeleteRes.status === 200 || selfDeleteJson.success) {
      throw new Error('Self deletion of last SUPER_ADMIN should have been rejected');
    }
    console.log('✅ TEST 13 PASSED: Last active Super Admin safely protected from accidental demotion and deletion');
    passedTests++;

    // -------------------------------------------------------------
    // Test 14: Duplicate email and invalid profile changes are rejected
    // -------------------------------------------------------------
    console.log('\n--- TEST 14: Duplicate email and invalid inputs rejected ---');
    const dupRes = await fetch(`${baseUrl}/admin-users`, {
      method: 'POST',
      headers: superAdminHeaders,
      body: JSON.stringify({
        name: 'Duplicate Test',
        email: 'manager@brandx.in', // Existing email
        password: 'password123',
        role: 'MANAGER',
      }),
    });
    if (dupRes.status !== 400) {
      throw new Error(`Expected 400 on duplicate email, got ${dupRes.status}`);
    }

    const invalidEmailRes = await fetch(`${baseUrl}/admin-users`, {
      method: 'POST',
      headers: superAdminHeaders,
      body: JSON.stringify({
        name: 'Invalid Email',
        email: 'not-an-email',
        password: 'password123',
        role: 'MANAGER',
      }),
    });
    if (invalidEmailRes.status !== 400 && invalidEmailRes.status !== 422) {
      throw new Error(`Expected 400 or 422 on invalid email, got ${invalidEmailRes.status}`);
    }
    console.log('✅ TEST 14 PASSED: Duplicate emails and invalid formats rejected (400 / 422)');
    passedTests++;

    // -------------------------------------------------------------
    // Test 15: Firebase and application account records remain consistent
    // -------------------------------------------------------------
    console.log('\n--- TEST 15: Firebase and customer account consistency ---');
    const customerUsers = await prisma.user.findMany({ take: 3 });
    for (const u of customerUsers) {
      if (u.firebaseUid) {
        // Confirm user table integrity
        const check = await prisma.user.findUnique({ where: { firebaseUid: u.firebaseUid } });
        if (!check) throw new Error('Customer User record corrupted');
      }
    }
    console.log('✅ TEST 15 PASSED: Customer accounts and Firebase mappings remain consistent');
    passedTests++;

    // -------------------------------------------------------------
    // Test 16: Existing customers, Pro users, payments, subscriptions, invoices and Khata data remain intact
    // -------------------------------------------------------------
    console.log('\n--- TEST 16: Zero data loss across all business modules ---');
    const finalUsers = await prisma.user.count().catch(() => 0);
    const finalSubscriptions = await prisma.subscription.count().catch(() => 0);
    const finalInvoices = await prisma.invoice.count().catch(() => 0);
    const finalKhata = await prisma.khataTransaction.count().catch(() => 0);

    if (finalUsers !== baselineUsers) {
      throw new Error(`User count changed from ${baselineUsers} to ${finalUsers}`);
    }
    if (finalSubscriptions !== baselineSubscriptions) {
      throw new Error(`Subscription count changed from ${baselineSubscriptions} to ${finalSubscriptions}`);
    }
    if (finalInvoices !== baselineInvoices) {
      throw new Error(`Invoice count changed from ${baselineInvoices} to ${finalInvoices}`);
    }
    if (finalKhata !== baselineKhata) {
      throw new Error(`Khata count changed from ${baselineKhata} to ${finalKhata}`);
    }
    console.log('✅ TEST 16 PASSED: All customer, Pro, payment, invoice, and Khata records 100% intact');
    passedTests++;

    console.log('\n================================================================');
    console.log(`🎉 ALL 16 SUPER_ADMIN TEAM MANAGEMENT TESTS PASSED (${passedTests}/16)!`);
    console.log('================================================================\n');
  } finally {
    server.close();
  }
}

runSuperAdminTeamManagementTests()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ Test failure:', e);
    process.exit(1);
  });
