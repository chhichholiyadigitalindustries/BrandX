export interface CustomerStatementSummary {
  customerId: string;
  customerName: string;
  customerMobile: string;
  openingBalance: number;
  totalUdhar: number;
  totalJama: number;
  currentBalance: number; // Positive = Customer owes, Negative = Advance
  totalTransactionsCount: number;
}
