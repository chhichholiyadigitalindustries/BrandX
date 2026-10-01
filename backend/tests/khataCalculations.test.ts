import { computeKhataBalance } from '../src/utils/khataCalculator.js';
import { KhataTransactionType } from '@prisma/client';

export function testKhataCalculations() {
  console.log('\n--- 🧪 Testing Khata Balance Calculation Engine ---');

  // Initial opening balance = ₹500
  // Udhar given = ₹1,500 + ₹2,000 = ₹3,500
  // Jama received = ₹2,200
  // Expected final balance = 500 + 3500 - 2200 = ₹1,800
  const result = computeKhataBalance(500, [
    { type: KhataTransactionType.GIVE_UDHAR, amount: 1500 },
    { type: KhataTransactionType.GIVE_UDHAR, amount: 2000 },
    { type: KhataTransactionType.RECEIVE_JAMA, amount: 2200 },
  ]);

  if (result.totalUdhar !== 3500) {
    throw new Error(`Expected totalUdhar 3500, got ${result.totalUdhar}`);
  }
  if (result.totalJama !== 2200) {
    throw new Error(`Expected totalJama 2200, got ${result.totalJama}`);
  }
  if (result.currentBalance !== 1800) {
    throw new Error(`Expected currentBalance 1800, got ${result.currentBalance}`);
  }

  console.log('✅ Khata Balance calculated accurately (Udhar: ₹3500, Jama: ₹2200, Due: ₹1800).');
}
