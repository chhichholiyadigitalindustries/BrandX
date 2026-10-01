import { KhataTransactionType } from '@prisma/client';

export interface RawKhataTx {
  type: KhataTransactionType | string;
  amount: number;
}

export function computeKhataBalance(
  openingBalance: number,
  transactions: RawKhataTx[]
): {
  totalUdhar: number;
  totalJama: number;
  currentBalance: number;
} {
  let totalUdhar = 0;
  let totalJama = 0;

  for (const tx of transactions) {
    const amt = Math.max(0, Number(tx.amount) || 0);
    const txTypeStr = String(tx.type).toUpperCase();
    if (txTypeStr === 'GIVE_UDHAR' || txTypeStr === 'UDHAAR' || txTypeStr === 'GIVE' || txTypeStr === 'UDHAR') {
      totalUdhar += amt;
    } else if (txTypeStr === 'RECEIVE_JAMA' || txTypeStr === 'JAMA' || txTypeStr === 'RECEIVE') {
      totalJama += amt;
    }
  }

  // Current balance: Opening balance + Udhar given - Jama received
  // Positive = Customer owes money, Negative = Advance deposited by customer
  const currentBalance = Number((openingBalance + totalUdhar - totalJama).toFixed(2));

  return {
    totalUdhar: Number(totalUdhar.toFixed(2)),
    totalJama: Number(totalJama.toFixed(2)),
    currentBalance,
  };
}
