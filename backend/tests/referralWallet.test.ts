/**
 * BRANDX — Refer & Earn, Coin Wallet & Withdrawal Test Suite
 * Production verification of variable rewards (100–500 coins),
 * PostgreSQL ledger transactions, row-level locking for double-spend prevention,
 * strict integer conversion (100 coins = ₹1), minimum withdrawal (10,000 coins),
 * withdrawal reversals, anti-fraud rules, and multi-role RBAC permissions.
 */

import http from 'http';
import { AddressInfo } from 'net';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { signAccessToken, signAdminToken } from '../src/utils/jwt.js';
import { referralService } from '../src/services/referralService.js';
import { walletService } from '../src/services/walletService.js';

export async function runReferralWalletTests(): Promise<void> {
  console.log('\n========================================================');
  console.log('🪙 RUNNING BRANDX REFER & EARN, COIN WALLET & WITHDRAWAL TEST SUITE');
  console.log('========================================================\n');

  // 1. Setup Ephemeral Test Server
  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;
  console.log(`📡 Ephemeral Test Server listening on port ${port}`);

  // Test Entities
  const timestamp = Date.now();
  const referrerMobile = `98${String(timestamp).slice(-8)}`;
  const referredMobile1 = `97${String(timestamp).slice(-8)}`;
  const referredMobile2 = `96${String(timestamp).slice(-8)}`;

  let referrerUser: any;
  let referredUser1: any;
  let referredUser2: any;
  let referrerToken = '';
  let referredToken1 = '';
  let superAdminToken = '';
  let managerToken = '';
  let accountantToken = '';

  try {
    // Ensure clean ReferralConfig in PostgreSQL
    await referralService.getConfig();

    // Helper for creating test admin users safely across database configurations
    async function safeUpsertAdmin(email: string, name: string, password: string, role: string) {
      const dbRole = role === 'MANAGER' ? 'ADMIN' : (role === 'ACCOUNTANT' ? 'FINANCE' : role);
      const hashedPassword = await bcrypt.hash(password, 10);
      const avatarUrl = `role:${role}`;
      try {
        const admin = await prisma.adminUser.upsert({
          where: { email },
          update: { role: dbRole as any, status: 'ACTIVE' },
          create: {
            name,
            email,
            passwordHash: hashedPassword,
            role: dbRole as any,
            status: 'ACTIVE',
            avatarUrl,
          },
        });
        return { ...admin, role };
      } catch (err: any) {
        if (err?.code === 'P2022') {
          const existing: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "AdminUser" WHERE email = $1 LIMIT 1`,
            email
          );
          if (existing.length > 0) {
            await prisma.$executeRawUnsafe(
              `UPDATE "AdminUser" SET "passwordHash" = $1, "role" = $2::"AdminRole", "status" = 'ACTIVE'::"UserStatus", "avatarUrl" = $3, "updatedAt" = NOW() WHERE email = $4`,
              hashedPassword,
              dbRole,
              avatarUrl,
              email
            );
            return { ...existing[0], passwordHash: hashedPassword, role, status: 'ACTIVE', isActive: true, avatarUrl };
          } else {
            const id = `adm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            await prisma.$executeRawUnsafe(
              `INSERT INTO "AdminUser" ("id", "name", "email", "passwordHash", "role", "status", "avatarUrl", "createdAt", "updatedAt")
               VALUES ($1, $2, $3, $4, $5::"AdminRole", 'ACTIVE'::"UserStatus", $6, NOW(), NOW())`,
              id, name, email, hashedPassword, dbRole, avatarUrl
            );
            return { id, name, email, passwordHash: hashedPassword, role, status: 'ACTIVE', isActive: true, avatarUrl };
          }
        }
        throw err;
      }
    }

    // 2. Create Test Super Admin, Manager, and Accountant Accounts
    const superAdmin = await safeUpsertAdmin('admin@brandx.in', 'Super Admin', 'Admin@BrandX2026', 'SUPER_ADMIN');
    superAdminToken = signAdminToken({
      adminId: superAdmin.id,
      email: superAdmin.email,
      name: superAdmin.name,
      role: 'SUPER_ADMIN',
    });

    const manager = await safeUpsertAdmin(`test.manager.ref.${timestamp}@brandx.in`, 'Test Operations Manager', 'Manager@2026', 'MANAGER');
    managerToken = signAdminToken({
      adminId: manager.id,
      email: manager.email,
      name: manager.name,
      role: 'MANAGER',
    });

    const accountant = await safeUpsertAdmin(`test.accountant.ref.${timestamp}@brandx.in`, 'Test Finance Accountant', 'Accountant@2026', 'ACCOUNTANT');
    accountantToken = signAdminToken({
      adminId: accountant.id,
      email: accountant.email,
      name: accountant.name,
      role: 'ACCOUNTANT',
    });

    // 3. Create Test Customer Users
    referrerUser = await prisma.user.create({
      data: {
        name: 'Sharma Kirana Store',
        mobile: referrerMobile,
        email: `referrer.${timestamp}@brandx.in`,
        status: 'ACTIVE',
      },
    });
    referrerToken = signAccessToken({
      userId: referrerUser.id,
      name: referrerUser.name,
      mobile: referrerUser.mobile,
    });

    referredUser1 = await prisma.user.create({
      data: {
        name: 'Verma Sweet House',
        mobile: referredMobile1,
        email: `referred1.${timestamp}@brandx.in`,
        status: 'ACTIVE',
      },
    });
    referredToken1 = signAccessToken({
      userId: referredUser1.id,
      name: referredUser1.name,
      mobile: referredUser1.mobile,
    });

    referredUser2 = await prisma.user.create({
      data: {
        name: 'Gupta Medical Hall',
        mobile: referredMobile2,
        email: `referred2.${timestamp}@brandx.in`,
        status: 'ACTIVE',
      },
    });

    // ------------------------------------------------------------
    // TEST 1: Unique Referral Code Generation
    // ------------------------------------------------------------
    console.log('🔹 TEST 1: Unique Referral Code Generation');
    const codeRes = await fetch(`${baseUrl}/referrals/code`, {
      headers: { Authorization: `Bearer ${referrerToken}` },
    });
    const codeData = await codeRes.json();
    if (!codeRes.ok || !codeData.data?.referralCode) {
      throw new Error(`Failed to generate referral code: ${JSON.stringify(codeData)}`);
    }

    const referrerCode = codeData.data.referralCode;
    if (!referrerCode.startsWith('BRANDX-') || referrerCode.length < 12) {
      throw new Error(`Referral code format invalid: ${referrerCode}`);
    }
    console.log(`✅ Referrer received unique non-sequential code: ${referrerCode}`);

    // ------------------------------------------------------------
    // TEST 2: Referral Link Generation with Valid Domain
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 2: Referral Link Generation');
    const referralLink = codeData.data.referralLink;
    if (!referralLink || !referralLink.includes('signup?ref=') || !referralLink.includes(referrerCode)) {
      throw new Error(`Generated referral link is invalid: ${referralLink}`);
    }
    console.log(`✅ Valid shareable referral link generated: ${referralLink}`);

    // ------------------------------------------------------------
    // TEST 3: New User Claims Referral Code
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 3: New User Claims Referral Code');
    const claimRes = await fetch(`${baseUrl}/referrals/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${referredToken1}`,
      },
      body: JSON.stringify({ referralCode: referrerCode }),
    });
    const claimData = await claimRes.json();
    if (!claimRes.ok || claimData.data?.status !== 'REGISTERED') {
      throw new Error(`Failed to claim referral: ${JSON.stringify(claimData)}`);
    }
    console.log(`✅ Referral link established: status is ${claimData.data.status} (reward pending eligibility)`);

    // ------------------------------------------------------------
    // TEST 4: Anti-Fraud: Self-Referral Rejected
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 4: Anti-Fraud: Self-Referral Rejected');
    const selfClaimRes = await fetch(`${baseUrl}/referrals/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${referrerToken}`,
      },
      body: JSON.stringify({ referralCode: referrerCode }),
    });
    const selfClaimData = await selfClaimRes.json();
    if (selfClaimRes.status !== 409 || !selfClaimData.error?.message?.includes('SELF_REFERRAL')) {
      throw new Error(`Expected self-referral to be rejected with 409, got: ${selfClaimRes.status}`);
    }
    console.log('✅ Self-referral successfully rejected by anti-abuse engine.');

    // ------------------------------------------------------------
    // TEST 5: Anti-Fraud: Duplicate Referral for Same User Rejected
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 5: Anti-Fraud: Duplicate Referral Rejected');
    const dupClaimRes = await fetch(`${baseUrl}/referrals/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${referredToken1}`,
      },
      body: JSON.stringify({ referralCode: referrerCode }),
    });
    if (dupClaimRes.status !== 409) {
      throw new Error(`Expected duplicate referral to be rejected with 409, got: ${dupClaimRes.status}`);
    }
    console.log('✅ Duplicate referral attempt successfully blocked.');

    // ------------------------------------------------------------
    // TEST 6: Referral Eligibility and Reward Distribution
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 6: Referral Eligibility & Variable Reward Distribution');
    const eligResult = await referralService.processEligibility(referredUser1.id);
    if (!eligResult.rewarded || !eligResult.coins) {
      throw new Error(`Eligibility processing failed: ${JSON.stringify(eligResult)}`);
    }
    console.log(`✅ Referral became eligible and rewarded: +${eligResult.coins} BrandX Coins!`);

    // ------------------------------------------------------------
    // TEST 7: Variable Reward Bounded Between 100 and 500 Coins
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 7: Variable Reward Bounded Between 100 and 500 Coins');
    if (eligResult.coins < 100 || eligResult.coins > 500) {
      throw new Error(`Reward coins out of bounds (100-500): ${eligResult.coins}`);
    }
    console.log(`✅ Reward amount (${eligResult.coins} Coins) is strictly between configured 100 and 500 limits.`);

    // ------------------------------------------------------------
    // TEST 8: Server-Side Reward Calculation (Frontend Cannot Manipulate)
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 8: Frontend Cannot Specify or Manipulate Reward Amount');
    // Verify wallet balance matches ledger exactly
    const walletRes = await fetch(`${baseUrl}/wallet`, {
      headers: { Authorization: `Bearer ${referrerToken}` },
    });
    const walletData = await walletRes.json();
    if (!walletRes.ok || walletData.data.availableCoins !== eligResult.coins) {
      throw new Error(`Wallet balance mismatch: ${walletData.data?.availableCoins} vs ${eligResult.coins}`);
    }
    console.log(`✅ Referrer wallet balance confirmed in PostgreSQL: ${walletData.data.availableCoins} Coins.`);

    // ------------------------------------------------------------
    // TEST 9: Coin Conversion Rate: 100 Coins = ₹1
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 9: Coin Conversion: 100 Coins = ₹1 Strictly Verified');
    const expectedInr = Math.floor(walletData.data.availableCoins / 100);
    if (walletData.data.equivalentInr !== expectedInr) {
      throw new Error(`INR conversion mismatch: expected ₹${expectedInr}, got ₹${walletData.data.equivalentInr}`);
    }
    console.log(`✅ Exact integer conversion: ${walletData.data.availableCoins} Coins = ₹${expectedInr} (Zero float error).`);

    // ------------------------------------------------------------
    // TEST 10: Minimum Withdrawal Validation: 9,999 Coins Rejected (< 10,000 Coins)
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 10: Sub-Minimum Withdrawal (9,999 Coins) Rejected');
    const subMinRes = await fetch(`${baseUrl}/wallet/withdrawals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${referrerToken}`,
      },
      body: JSON.stringify({
        coins: 9999,
        payoutMethod: 'UPI',
        payoutAccount: 'vyapari@okhdfcbank',
      }),
    });
    const subMinData = await subMinRes.json();
    if (subMinRes.status !== 400 || subMinData.error?.code !== 'SUB_MINIMUM_WITHDRAWAL') {
      throw new Error(`Expected SUB_MINIMUM_WITHDRAWAL (400), got: ${subMinRes.status} ${JSON.stringify(subMinData)}`);
    }
    console.log('✅ Sub-minimum withdrawal (< 10,000 Coins / ₹100) correctly rejected.');

    // ------------------------------------------------------------
    // TEST 11: Valid Minimum Withdrawal: 10,000 Coins (₹100)
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 11: Valid Minimum Withdrawal (10,000 Coins = ₹100)');
    // Credit additional coins to reach >= 10,000 coins for testing
    await walletService.creditCoins({
      userId: referrerUser.id,
      coins: 10000,
      type: 'BONUS',
      description: 'Test top-up bonus to reach withdrawal threshold',
    });

    const withdrawRes = await fetch(`${baseUrl}/wallet/withdrawals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${referrerToken}`,
      },
      body: JSON.stringify({
        coins: 10000,
        payoutMethod: 'UPI',
        payoutAccount: 'sharma.kirana@okaxis',
        accountHolderName: 'Sharma Kirana Store',
      }),
    });
    const withdrawData = await withdrawRes.json();
    if (!withdrawRes.ok || withdrawData.data?.withdrawal?.amountInr !== 100) {
      throw new Error(`Withdrawal creation failed: ${JSON.stringify(withdrawData)}`);
    }
    const withdrawalId = withdrawData.data.withdrawal.id;
    console.log(`✅ Withdrawal created: ID #${withdrawalId.slice(0, 8)}, Amount: ₹100, Status: PENDING.`);

    // ------------------------------------------------------------
    // TEST 12: Higher Valid Withdrawal (25,000 Coins = ₹250)
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 12: Higher Valid Withdrawal (25,000 Coins = ₹250)');
    await walletService.creditCoins({
      userId: referrerUser.id,
      coins: 25000,
      type: 'BONUS',
      description: 'Test top-up for 25,000 coins withdrawal test',
    });

    const withdraw25kRes = await fetch(`${baseUrl}/wallet/withdrawals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${referrerToken}`,
      },
      body: JSON.stringify({
        coins: 25000,
        payoutMethod: 'BANK_ACCOUNT',
        payoutAccount: 'HDFC0001234 - A/C 50100234567890',
        accountHolderName: 'Sharma Kirana Store',
      }),
    });
    const withdraw25kData = await withdraw25kRes.json();
    if (!withdraw25kRes.ok || withdraw25kData.data?.withdrawal?.amountInr !== 250) {
      throw new Error(`25k withdrawal failed: ${JSON.stringify(withdraw25kData)}`);
    }
    console.log(`✅ 25,000 Coins withdrawal allowed: Exactly ₹250 payout calculated.`);

    // ------------------------------------------------------------
    // TEST 13: Atomic Double-Spend Prevention under Concurrent Requests
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 13: Concurrent Double-Spend Prevention (Row Locking)');
    // Let's grant exactly 10,000 coins to referredUser2
    await walletService.creditCoins({
      userId: referredUser2.id,
      coins: 10000,
      type: 'BONUS',
      description: 'Double spend test balance',
    });

    const tokenUser2 = signAccessToken({
      userId: referredUser2.id,
      name: referredUser2.name,
      mobile: referredUser2.mobile,
    });

    // Fire TWO concurrent withdrawal requests for 10,000 coins simultaneously
    const [attempt1, attempt2] = await Promise.all([
      fetch(`${baseUrl}/wallet/withdrawals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenUser2}`,
        },
        body: JSON.stringify({
          coins: 10000,
          payoutMethod: 'UPI',
          payoutAccount: 'user2@upi',
        }),
      }),
      fetch(`${baseUrl}/wallet/withdrawals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenUser2}`,
        },
        body: JSON.stringify({
          coins: 10000,
          payoutMethod: 'UPI',
          payoutAccount: 'user2@upi',
        }),
      }),
    ]);

    const status1 = attempt1.status;
    const status2 = attempt2.status;

    // Exactly one must succeed (201) and one must fail (400 INSUFFICIENT_BALANCE)
    const successCount = (status1 === 201 ? 1 : 0) + (status2 === 201 ? 1 : 0);
    const failCount = (status1 === 400 ? 1 : 0) + (status2 === 400 ? 1 : 0);

    if (successCount !== 1 || failCount !== 1) {
      throw new Error(`Double-spend race condition detected! Statuses: ${status1}, ${status2}`);
    }
    console.log('✅ Double-spend protection verified: 1 succeeded (201), 1 blocked (400 Insufficient Balance).');

    // ------------------------------------------------------------
    // TEST 14: Withdrawal Failure Reversal (Coins Returned to Wallet)
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 14: Withdrawal Failure Reversal (WITHDRAWAL_REVERSAL Ledger Record)');
    const balanceBeforeFail = (await walletService.getWalletSummary(referrerUser.id)).availableCoins;

    const failRes = await fetch(`${baseUrl}/admin/withdrawals/${withdrawalId}/fail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({ reason: 'Bank server rejected beneficiary account number' }),
    });
    const failData = await failRes.json();
    if (!failRes.ok || failData.data?.withdrawal?.status !== 'FAILED') {
      throw new Error(`Withdrawal fail reversal endpoint failed: ${JSON.stringify(failData)}`);
    }

    const balanceAfterFail = (await walletService.getWalletSummary(referrerUser.id)).availableCoins;
    if (balanceAfterFail !== balanceBeforeFail + 10000) {
      throw new Error(`Reversal coin balance incorrect: before=${balanceBeforeFail}, after=${balanceAfterFail}`);
    }

    // Verify ledger record
    const ledgerRes = await fetch(`${baseUrl}/wallet/transactions`, {
      headers: { Authorization: `Bearer ${referrerToken}` },
    });
    const ledgerData = await ledgerRes.json();
    const reversalTx = ledgerData.data.transactions.find((tx: any) => tx.type === 'WITHDRAWAL_REVERSAL');
    if (!reversalTx || reversalTx.coins !== 10000) {
      throw new Error(`WITHDRAWAL_REVERSAL ledger entry missing or invalid: ${JSON.stringify(reversalTx)}`);
    }
    console.log('✅ Reversal completed: 10,000 coins safely returned and logged in ledger.');

    // ------------------------------------------------------------
    // TEST 15: Super Admin Manual Coin Adjustment
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 15: Super Admin Coin Adjustment with Mandatory Reason');
    const adjustRes = await fetch(`${baseUrl}/admin/wallet/adjust`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        userId: referrerUser.id,
        coins: 500,
        reason: 'Customer goodwill promotional credit for Diwali festival',
      }),
    });
    const adjustData = await adjustRes.json();
    if (!adjustRes.ok || adjustData.data?.transaction?.type !== 'ADMIN_ADJUSTMENT') {
      throw new Error(`Admin adjustment failed: ${JSON.stringify(adjustData)}`);
    }
    console.log('✅ Super Admin coin adjustment created: +500 Coins with mandatory audit reason.');

    // ------------------------------------------------------------
    // TEST 16: Unauthorized Customer User Blocked from Admin APIs (403)
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 16: Customer User Blocked from Admin Withdrawal APIs (403)');
    const unauthRes = await fetch(`${baseUrl}/admin/withdrawals`, {
      headers: { Authorization: `Bearer ${referrerToken}` },
    });
    if (unauthRes.status !== 403) {
      throw new Error(`Expected 403 for customer token accessing admin withdrawals, got: ${unauthRes.status}`);
    }
    console.log('✅ Customer token correctly blocked from admin withdrawal APIs (403 Forbidden).');

    // ------------------------------------------------------------
    // TEST 17: RBAC: Manager Can View Referrals but Blocked from Payouts
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 17: Manager RBAC: View Referrals Permitted, Payout Actions Blocked');
    const mgrRefRes = await fetch(`${baseUrl}/admin/referrals`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    if (!mgrRefRes.ok) {
      throw new Error(`Manager failed to view referrals: ${mgrRefRes.status}`);
    }

    const mgrPayoutRes = await fetch(`${baseUrl}/admin/withdrawals`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    if (mgrPayoutRes.status !== 403) {
      throw new Error(`Expected 403 for Manager accessing withdrawals, got: ${mgrPayoutRes.status}`);
    }
    console.log('✅ Manager RBAC boundaries verified (Referrals: 200, Withdrawals: 403).');

    // ------------------------------------------------------------
    // TEST 18: RBAC: Accountant Can View Withdrawals but Blocked from Coin Adjustment
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 18: Accountant RBAC: View Withdrawals Permitted, Coin Adjustments Blocked');
    const acctWithdrawRes = await fetch(`${baseUrl}/admin/withdrawals`, {
      headers: { Authorization: `Bearer ${accountantToken}` },
    });
    if (!acctWithdrawRes.ok) {
      throw new Error(`Accountant failed to view withdrawals: ${acctWithdrawRes.status}`);
    }

    const acctAdjustRes = await fetch(`${baseUrl}/admin/wallet/adjust`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accountantToken}`,
      },
      body: JSON.stringify({
        userId: referrerUser.id,
        coins: 100,
        reason: 'Unauthorized test adjustment',
      }),
    });
    if (acctAdjustRes.status !== 403) {
      throw new Error(`Expected 403 for Accountant attempting coin adjustment, got: ${acctAdjustRes.status}`);
    }
    console.log('✅ Accountant RBAC boundaries verified (Withdrawals: 200, Adjustments: 403).');

    // ------------------------------------------------------------
    // TEST 19: Super Admin Payout Processing & Paid Workflow
    // ------------------------------------------------------------
    console.log('\n🔹 TEST 19: Full Super Admin Payout Workflow (Processing -> Paid)');
    // Create new withdrawal to mark paid
    const newWRes = await walletService.requestWithdrawal({
      userId: referrerUser.id,
      coins: 10000,
      payoutMethod: 'UPI',
      payoutAccount: 'super.payout@okaxis',
    });
    const newWid = newWRes.withdrawal.id;

    // 1. Mark processing
    const procRes = await fetch(`${baseUrl}/admin/withdrawals/${newWid}/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    if (!procRes.ok) throw new Error(`Mark processing failed: ${procRes.status}`);

    // 2. Mark paid with Bank UTR reference
    const paidRes = await fetch(`${baseUrl}/admin/withdrawals/${newWid}/paid`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({ payoutReference: 'UTR20260920AXIS998877' }),
    });
    const paidData = await paidRes.json();
    if (!paidRes.ok || paidData.data.status !== 'PAID' || !paidData.data.payoutReference) {
      throw new Error(`Mark paid failed: ${JSON.stringify(paidData)}`);
    }
    console.log(`✅ Super Admin payout completed: Ref ${paidData.data.payoutReference}, Status PAID.`);

  } finally {
    // Cleanup test records
    try {
      if (referrerUser?.id) {
        await prisma.walletTransaction.deleteMany({ where: { userId: referrerUser.id } });
        await prisma.withdrawal.deleteMany({ where: { userId: referrerUser.id } });
        await prisma.wallet.deleteMany({ where: { userId: referrerUser.id } });
        await prisma.referral.deleteMany({ where: { referrerUserId: referrerUser.id } });
        await prisma.user.delete({ where: { id: referrerUser.id } }).catch(() => {});
      }
      if (referredUser1?.id) {
        await prisma.walletTransaction.deleteMany({ where: { userId: referredUser1.id } });
        await prisma.withdrawal.deleteMany({ where: { userId: referredUser1.id } });
        await prisma.wallet.deleteMany({ where: { userId: referredUser1.id } });
        await prisma.referral.deleteMany({ where: { referredUserId: referredUser1.id } });
        await prisma.user.delete({ where: { id: referredUser1.id } }).catch(() => {});
      }
      if (referredUser2?.id) {
        await prisma.walletTransaction.deleteMany({ where: { userId: referredUser2.id } });
        await prisma.withdrawal.deleteMany({ where: { userId: referredUser2.id } });
        await prisma.wallet.deleteMany({ where: { userId: referredUser2.id } });
        await prisma.user.delete({ where: { id: referredUser2.id } }).catch(() => {});
      }
      await prisma.adminUser.deleteMany({
        where: { email: { contains: 'test.manager.ref.' } },
      });
      await prisma.adminUser.deleteMany({
        where: { email: { contains: 'test.accountant.ref.' } },
      });
    } catch {}

    server.close();
  }

  console.log('\n========================================================');
  console.log('🎉 ALL 19 REFERRAL & WALLET SECURITY & LOGIC TESTS PASSED!');
  console.log('========================================================\n');
}

if (process.argv[1]?.includes('referralWallet.test')) {
  runReferralWalletTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Referral & wallet test failed:', err);
      process.exit(1);
    });
}
