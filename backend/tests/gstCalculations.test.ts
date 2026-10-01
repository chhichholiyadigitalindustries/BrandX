import { calculateInvoice, numberToIndianWords } from '../src/utils/gstCalculator.js';

export function testGstCalculations() {
  console.log('\n--- 🧪 Testing GST Calculation Engine ---');

  // Test 1: Intra-state 18% GST (Gujarat to Gujarat)
  const intraStateResult = calculateInvoice(
    [
      { name: 'Studio Shoot', qty: 1, rate: 10000, gstPercent: 18 },
      { name: 'Photo Frame', qty: 2, rate: 1000, gstPercent: 12 },
    ],
    {
      sellerState: 'Gujarat',
      buyerState: 'Gujarat',
      discountPercent: 0,
    }
  );

  if (intraStateResult.totals.taxableAmount !== 12000) {
    throw new Error(`Expected taxable 12000, got ${intraStateResult.totals.taxableAmount}`);
  }
  // 10000 * 9% CGST + 2000 * 6% CGST = 900 + 120 = 1020
  if (intraStateResult.totals.cgstAmount !== 1020 || intraStateResult.totals.sgstAmount !== 1020) {
    throw new Error(`Expected CGST/SGST 1020 each, got CGST: ${intraStateResult.totals.cgstAmount}, SGST: ${intraStateResult.totals.sgstAmount}`);
  }
  if (intraStateResult.totals.igstAmount !== 0) {
    throw new Error(`Expected IGST 0 for intra-state, got ${intraStateResult.totals.igstAmount}`);
  }
  if (intraStateResult.totals.totalAmount !== 14040) {
    throw new Error(`Expected totalAmount 14040, got ${intraStateResult.totals.totalAmount}`);
  }
  console.log('✅ Intra-state CGST & SGST calculated accurately (₹14,040).');

  // Test 2: Inter-state 18% GST (Gujarat to Maharashtra)
  const interStateResult = calculateInvoice(
    [{ name: 'Wholesale Fabric', qty: 10, rate: 1000, gstPercent: 18 }],
    {
      sellerState: 'Gujarat',
      buyerState: 'Maharashtra',
    }
  );

  if (interStateResult.totals.cgstAmount !== 0 || interStateResult.totals.sgstAmount !== 0) {
    throw new Error('Expected 0 CGST/SGST for inter-state supply');
  }
  if (interStateResult.totals.igstAmount !== 1800) {
    throw new Error(`Expected IGST 1800, got ${interStateResult.totals.igstAmount}`);
  }
  if (interStateResult.totals.totalAmount !== 11800) {
    throw new Error(`Expected total 11800, got ${interStateResult.totals.totalAmount}`);
  }
  console.log('✅ Inter-state IGST calculated accurately (₹11,800).');

  // Test 3: Number to Indian Words
  const words = numberToIndianWords(14040);
  if (!words.includes('Fourteen Thousand') && !words.includes('Forty')) {
    throw new Error(`Unexpected words output: ${words}`);
  }
  console.log(`✅ Number to Indian Words: "${words}".`);
}
