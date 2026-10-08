/**
 * BRANDX — PRODUCTION INTEGRATION TESTS: UNIVERSAL USER-SPECIFIC UPI QR SYSTEM
 *
 * Verifies:
 * 1. Multi-tenant isolation: Business A (shopa@upi) vs Business B (shopb@upi)
 * 2. UPI QR Standee payload (general collection, merchant UPI ID)
 * 3. Billing / GST Invoice payload (fixed invoice amount, merchant UPI ID)
 * 4. Udhar Khata collection payload (outstanding balance, merchant UPI ID)
 * 5. Full URL decoding and parameter verification (pa, pn, am, cu, tn)
 * 6. Dynamic updates: updating UPI ID immediately regenerates all QRs
 * 7. Missing/invalid UPI ID handling
 * 8. Zero data loss: only isolated test records are created and safely removed
 */

import { prisma } from '../src/config/database.js';
import { upiService } from '../src/services/upiService.js';
import { upiIdRegex } from '../src/validators/index.js';

function parseUpiUri(uri: string): {
  protocol: string;
  host: string;
  pa: string | null;
  pn: string | null;
  am: string | null;
  cu: string | null;
  tn: string | null;
} {
  // uri format: upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...
  const url = new URL(uri);
  return {
    protocol: url.protocol,
    host: url.hostname || url.pathname.replace(/^\/\//, '').split('?')[0],
    pa: url.searchParams.get('pa'),
    pn: url.searchParams.get('pn'),
    am: url.searchParams.get('am'),
    cu: url.searchParams.get('cu'),
    tn: url.searchParams.get('tn'),
  };
}

export async function runUniversalUpiQrTests() {
  console.log('\n--------------------------------------------------------');
  console.log('⚡ RUNNING UNIVERSAL USER-SPECIFIC UPI QR TEST SUITE');
  console.log('--------------------------------------------------------');

  const testUserAId = `test_upi_user_a_${Date.now()}`;
  const testUserBId = `test_upi_user_b_${Date.now()}`;
  const testUserCId = `test_upi_user_c_${Date.now()}`;

  const testBizAId = `test_upi_biz_a_${Date.now()}`;
  const testBizBId = `test_upi_biz_b_${Date.now()}`;
  const testBizCId = `test_upi_biz_c_${Date.now()}`;

  try {
    // -----------------------------------------------------------------
    // TEST 1: UPI ID SYNTAX & VALIDATION
    // -----------------------------------------------------------------
    console.log('👉 [1/8] Testing UPI ID Regex and Format Validation...');
    const validUpiIds = [
      'shopa@upi',
      'royalstudio@okhdfcbank',
      'shree.ganesh.store_88@paytm',
      'kirana-merchant@icici',
      '9876543210@ybl',
      'brandx.user@axl',
    ];
    for (const validId of validUpiIds) {
      if (!upiIdRegex.test(validId)) {
        throw new Error(`Expected valid UPI ID "${validId}" to pass regex validation`);
      }
    }

    const invalidUpiIds = [
      '',
      'invalidupi',
      '@upi',
      'shop@',
      'shop@@upi',
      'shop with spaces@okhdfcbank',
      'a@b', // too short (< 2 chars)
    ];
    for (const invalidId of invalidUpiIds) {
      if (upiIdRegex.test(invalidId)) {
        throw new Error(`Expected invalid UPI ID "${invalidId}" to fail regex validation`);
      }
    }
    console.log('  ✅ UPI format validation passed for all valid and invalid cases.');

    // -----------------------------------------------------------------
    // TEST 2: SETUP ISOLATED MULTI-TENANT BUSINESSES IN DATABASE
    // -----------------------------------------------------------------
    console.log('👉 [2/8] Creating isolated test businesses (Business A, Business B, Business C)...');
    
    // User A & Business A (shopa@upi)
    await prisma.user.create({
      data: {
        id: testUserAId,
        name: 'Owner A',
        mobile: `9999${Date.now().toString().slice(-6)}1`,
        email: `test_upi_a_${Date.now()}@brandx.test`,
        status: 'ACTIVE',
      },
    });
    await prisma.business.create({
      data: {
        id: testBizAId,
        ownerId: testUserAId,
        name: 'Royal Studio & Prints',
        ownerName: 'Owner A',
        mobile: '9999900001',
        category: 'Photographer & Studio',
        address: 'Shop 101, Film City Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400065',
        upiId: 'shopa@upi',
        upiLinked: true,
        status: 'ACTIVE',
      },
    });

    // User B & Business B (shopb@upi)
    await prisma.user.create({
      data: {
        id: testUserBId,
        name: 'Owner B',
        mobile: `9999${Date.now().toString().slice(-6)}2`,
        email: `test_upi_b_${Date.now()}@brandx.test`,
        status: 'ACTIVE',
      },
    });
    await prisma.business.create({
      data: {
        id: testBizBId,
        ownerId: testUserBId,
        name: 'Sharma General Kirana',
        ownerName: 'Owner B',
        mobile: '9999900002',
        category: 'Retail & Kirana',
        address: 'Shop 12, Main Market',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
        upiId: 'shopb@upi',
        upiLinked: true,
        status: 'ACTIVE',
      },
    });

    // User C & Business C (No UPI ID configured)
    await prisma.user.create({
      data: {
        id: testUserCId,
        name: 'Owner C',
        mobile: `9999${Date.now().toString().slice(-6)}3`,
        email: `test_upi_c_${Date.now()}@brandx.test`,
        status: 'ACTIVE',
      },
    });
    await prisma.business.create({
      data: {
        id: testBizCId,
        ownerId: testUserCId,
        name: 'New Vyapari Store',
        ownerName: 'Owner C',
        mobile: '9999900003',
        category: 'Retail & Kirana',
        address: 'Shop 5, Station Road',
        city: 'Jaipur',
        state: 'Rajasthan',
        pincode: '302001',
        upiId: null,
        upiLinked: false,
        status: 'ACTIVE',
      },
    });
    console.log('  ✅ Isolated test businesses created successfully.');

    // -----------------------------------------------------------------
    // TEST 3: MULTI-TENANT ISOLATION CHECK
    // -----------------------------------------------------------------
    console.log('👉 [3/8] Testing backend single source of truth and cross-tenant isolation...');
    const detailsA = await upiService.getBusinessUpiDetails(testBizAId);
    const detailsB = await upiService.getBusinessUpiDetails(testBizBId);
    const detailsC = await upiService.getBusinessUpiDetails(testBizCId);

    if (detailsA.upiId !== 'shopa@upi') {
      throw new Error(`Business A expected UPI ID "shopa@upi", got "${detailsA.upiId}"`);
    }
    if (detailsB.upiId !== 'shopb@upi') {
      throw new Error(`Business B expected UPI ID "shopb@upi", got "${detailsB.upiId}"`);
    }
    if (detailsC.upiId !== null) {
      throw new Error(`Business C expected null UPI ID, got "${detailsC.upiId}"`);
    }

    // Cross-tenant verification
    if (detailsA.upiId === detailsB.upiId) {
      throw new Error('CRITICAL: Business A and Business B must have isolated UPI IDs!');
    }
    console.log('  ✅ Multi-tenant isolation verified: Business A has shopa@upi, Business B has shopb@upi.');

    // -----------------------------------------------------------------
    // TEST 4: UPI QR STANDEE GENERATION & DECODING
    // -----------------------------------------------------------------
    console.log('👉 [4/8] Generating Standee General Payment QR for Business A & B...');
    const standeeA = await upiService.generateBusinessUpiPayload(testBizAId);
    const standeeB = await upiService.generateBusinessUpiPayload(testBizBId);

    const parsedStandeeA = parseUpiUri(standeeA.upiString);
    if (parsedStandeeA.pa !== 'shopa@upi') {
      throw new Error(`Standee A expected pa=shopa@upi, got ${parsedStandeeA.pa}`);
    }
    if (parsedStandeeA.pn !== 'Royal Studio & Prints') {
      throw new Error(`Standee A expected pn="Royal Studio & Prints", got "${parsedStandeeA.pn}"`);
    }
    if (parsedStandeeA.cu !== 'INR') {
      throw new Error(`Standee A expected cu=INR, got ${parsedStandeeA.cu}`);
    }
    if (parsedStandeeA.am !== null) {
      throw new Error(`Standee A general payment QR should not have fixed amount, got ${parsedStandeeA.am}`);
    }
    if (!standeeA.qrDataUrl.startsWith('data:image/png;base64,')) {
      throw new Error('Standee A QR data URL is not valid Base64 PNG image');
    }

    const parsedStandeeB = parseUpiUri(standeeB.upiString);
    if (parsedStandeeB.pa !== 'shopb@upi') {
      throw new Error(`Standee B expected pa=shopb@upi, got ${parsedStandeeB.pa}`);
    }
    if (parsedStandeeB.pn !== 'Sharma General Kirana') {
      throw new Error(`Standee B expected pn="Sharma General Kirana", got "${parsedStandeeB.pn}"`);
    }
    console.log('  ✅ Standee QRs decoded successfully with correct merchant-specific payees.');

    // -----------------------------------------------------------------
    // TEST 5: BILLING / GST INVOICE PAYMENT QR GENERATION & RECALCULATION
    // -----------------------------------------------------------------
    console.log('👉 [5/8] Generating Billing / Invoice Payment QR with fixed amounts...');
    const invoiceAmountA = 1450.50;
    const invoiceA = await upiService.generateBusinessUpiPayload(testBizAId, {
      amount: invoiceAmountA,
      note: 'Invoice INV-1001',
    });
    const parsedInvA = parseUpiUri(invoiceA.upiString);

    if (parsedInvA.pa !== 'shopa@upi') {
      throw new Error(`Invoice A expected pa=shopa@upi, got ${parsedInvA.pa}`);
    }
    if (parsedInvA.am !== '1450.50') {
      throw new Error(`Invoice A expected am=1450.50, got ${parsedInvA.am}`);
    }
    if (parsedInvA.tn !== 'Invoice INV-1001') {
      throw new Error(`Invoice A expected tn="Invoice INV-1001", got "${parsedInvA.tn}"`);
    }

    // Recalculate amount change (e.g. discount added or items modified)
    const recalculatedAmountA = 1200.00;
    const updatedInvoiceA = await upiService.generateBusinessUpiPayload(testBizAId, {
      amount: recalculatedAmountA,
      note: 'Invoice INV-1001 (Recalculated)',
    });
    const parsedUpdatedInvA = parseUpiUri(updatedInvoiceA.upiString);
    if (parsedUpdatedInvA.am !== '1200.00') {
      throw new Error(`Recalculated Invoice A expected am=1200.00, got ${parsedUpdatedInvA.am}`);
    }

    // Invoice for Business B
    const invoiceB = await upiService.generateBusinessUpiPayload(testBizBId, {
      amount: 499.00,
      note: 'Invoice INV-B-001',
    });
    const parsedInvB = parseUpiUri(invoiceB.upiString);
    if (parsedInvB.pa !== 'shopb@upi' || parsedInvB.am !== '499.00') {
      throw new Error(`Invoice B expected pa=shopb@upi and am=499.00, got pa=${parsedInvB.pa}, am=${parsedInvB.am}`);
    }
    console.log('  ✅ Invoice payment QRs encode exact payable amounts and update dynamically.');

    // -----------------------------------------------------------------
    // TEST 6: UDHAR KHATA COLLECTION QR GENERATION
    // -----------------------------------------------------------------
    console.log('👉 [6/8] Generating Udhar Khata customer collection QR...');
    const khataDueAmount = 2850.00;
    const khataCustomerName = 'Ramesh Kumar';
    const khataA = await upiService.generateBusinessUpiPayload(testBizAId, {
      amount: khataDueAmount,
      note: `Khata ${khataCustomerName}`,
    });
    const parsedKhataA = parseUpiUri(khataA.upiString);

    if (parsedKhataA.pa !== 'shopa@upi') {
      throw new Error(`Khata A expected merchant pa=shopa@upi, got ${parsedKhataA.pa}`);
    }
    if (parsedKhataA.am !== '2850.00') {
      throw new Error(`Khata A expected am=2850.00, got ${parsedKhataA.am}`);
    }
    if (parsedKhataA.tn !== 'Khata Ramesh Kumar') {
      throw new Error(`Khata A expected tn="Khata Ramesh Kumar", got "${parsedKhataA.tn}"`);
    }
    console.log('  ✅ Khata collection QR correctly uses merchant payee with customer debt amount.');

    // -----------------------------------------------------------------
    // TEST 7: UPI ID DYNAMIC UPDATE & IMMEDIATE REGENERATION
    // -----------------------------------------------------------------
    console.log('👉 [7/8] Testing UPI ID update and instant cache refresh...');
    const newUpiIdA = 'royalstudio.new@okhdfcbank';
    await upiService.updateBusinessUpi(testBizAId, newUpiIdA);

    // Verify persistence in PostgreSQL
    const refreshedDetailsA = await upiService.getBusinessUpiDetails(testBizAId);
    if (refreshedDetailsA.upiId !== newUpiIdA) {
      throw new Error(`Refreshed details expected ${newUpiIdA}, got ${refreshedDetailsA.upiId}`);
    }

    // Verify newly generated QRs immediately adopt the updated UPI ID
    const newStandeeA = await upiService.generateBusinessUpiPayload(testBizAId);
    const parsedNewStandeeA = parseUpiUri(newStandeeA.upiString);
    if (parsedNewStandeeA.pa !== newUpiIdA) {
      throw new Error(`Updated Standee expected pa=${newUpiIdA}, got ${parsedNewStandeeA.pa}`);
    }

    const newInvoiceA = await upiService.generateBusinessUpiPayload(testBizAId, { amount: 750 });
    const parsedNewInvoiceA = parseUpiUri(newInvoiceA.upiString);
    if (parsedNewInvoiceA.pa !== newUpiIdA) {
      throw new Error(`Updated Invoice expected pa=${newUpiIdA}, got ${parsedNewInvoiceA.pa}`);
    }
    console.log('  ✅ Updating UPI ID immediately updates newly generated Standee, Billing, and Khata QRs.');

    // -----------------------------------------------------------------
    // TEST 8: ERROR HANDLING FOR MISSING & INVALID UPI IDS
    // -----------------------------------------------------------------
    console.log('👉 [8/8] Testing missing UPI ID and invalid update rejections...');
    let missingErrorCaught = false;
    try {
      await upiService.generateBusinessUpiPayload(testBizCId);
    } catch (err: any) {
      missingErrorCaught = true;
      if (!err.message.includes('Please add your UPI ID in Business Settings to generate your payment QR')) {
        throw new Error(`Unexpected error message for missing UPI: ${err.message}`);
      }
    }
    if (!missingErrorCaught) {
      throw new Error('Expected generateBusinessUpiPayload to throw when UPI ID is not configured!');
    }

    let invalidUpdateCaught = false;
    try {
      await upiService.updateBusinessUpi(testBizAId, 'invalid-without-at-sign');
    } catch (err: any) {
      invalidUpdateCaught = true;
    }
    if (!invalidUpdateCaught) {
      throw new Error('Expected updateBusinessUpi to reject invalid UPI format!');
    }
    console.log('  ✅ Proper error thrown when UPI ID is missing or invalid.');

    console.log('\n--------------------------------------------------------');
    console.log('🏆 ALL 8 UNIVERSAL UPI QR INTEGRATION TESTS PASSED!');
    console.log('--------------------------------------------------------');
  } finally {
    // -----------------------------------------------------------------
    // CLEANUP: ISOLATED TEST DATA ONLY (Zero production data touched)
    // -----------------------------------------------------------------
    try {
      await prisma.business.deleteMany({
        where: { id: { in: [testBizAId, testBizBId, testBizCId] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [testUserAId, testUserBId, testUserCId] } },
      });
    } catch (cleanErr) {
      console.warn('Test cleanup notice:', cleanErr);
    }
  }
}
