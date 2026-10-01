export type ScreenId = 
  | 'invoice'        // Screen 1: Tax Invoice & Billing Suite
  | 'pro-modal'      // Screen 2: Unlock Pro
  | 'templates'      // Screen 3: Template Library & Daily Status Feed
  | 'standee'        // Screen 4: UPI Payment & Standee Studio
  | 'copilot'        // Screen 5: AI Copilot & Voice Assistant
  | 'onboarding'     // Screen 6: Business Profile Setup
  | 'auth'           // Screen 7: Sign In & Sign Up Auth
  | 'login'          // Alias for Auth
  | 'editor'         // Screen 8: Create Studio - Poster Editor
  | 'khata'          // Screen 9: Customer Khata & Udhar-Bahi Ledger
  | 'dukaan'         // Screen 10: Digital Dukaan & NFC Digital Card
  | 'referrals'      // Screen 11: Refer & Earn Rewards
  | 'wallet'         // Screen 12: Coin Wallet & Cash Payout
  | 'settings';      // Screen 13: Settings, Security & Legal Center

export interface BusinessProfile {
  id?: string;
  name: string;
  hasGst?: boolean;
  gstin: string;
  pan?: string;
  businessType?: string;
  category: string;
  ownerName: string;
  phone: string;
  mobile?: string;
  email?: string;
  authMethod?: 'google' | 'phone';
  address: string;
  city: string;
  state?: string;
  pincode: string;
  instagram: string;
  tagline?: string;
  upiLinked: boolean;
  upiId: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  accountHolderName?: string;
  logoUrl?: string;
  isVerified: boolean;
  storeSlug?: string;
  invoicePrefix?: string;
  nextInvoiceNumber?: number;
  invoiceTerms?: string;
  signatureUrl?: string;
}

export type DocumentType = 'Tax Invoice' | 'Estimate / Quotation' | 'Delivery Challan' | 'Proforma Invoice';

export interface InvoiceItem {
  id: string;
  name: string;
  code: string; // SAC or HSN
  type: 'Service' | 'Goods';
  qty: number;
  rate: number;
  gstPercent: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  billDate: string;
  dueDate: string;
  customerName: string;
  customerPhone: string;
  customerType: string;
  documentType?: DocumentType;
  isGstBill?: boolean;
  items: InvoiceItem[];
  discountCode: string;
  discountPercent: number;
  paymentMethod: 'UPI' | 'Cash' | 'Mark Paid' | 'Unpaid';
  whatsappDirectShare: boolean;
  includeSignature?: boolean;
}

export interface CatalogItem {
  id: string;
  name: string;
  code: string;
  category: string;
  type: 'Service' | 'Goods';
  defaultRate: number;
  defaultGst: number;
  barcode?: string;
  stockQty?: number;
  lowStockThreshold?: number;
}

export interface KhataTransaction {
  id: string;
  customerId: string;
  type: 'give' | 'receive'; // 'give' = Udhar (You gave goods/credit), 'receive' = Jama (Customer paid)
  amount: number;
  date: string;
  billNumber?: string;
  note?: string;
}

export interface KhataCustomer {
  id: string;
  name: string;
  phone: string;
  avatarUrl?: string;
  totalDue: number; // Positive = Customer owes money (Udhar), 0 = Settled, Negative = Advance
  lastTransactionDate: string;
  transactions: KhataTransaction[];
}

export type ExpenseCategory = 
  | 'Rent' 
  | 'Electricity & Bills' 
  | 'Staff Salary' 
  | 'Supplier / Stock'
  | 'Tea & Refreshment' 
  | 'Transport & Fuel' 
  | 'Marketing' 
  | 'Maintenance' 
  | 'Other';

export interface ExpenseItem {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string; // YYYY-MM-DD
  paymentMode: 'Cash' | 'UPI' | 'Bank Transfer';
  note?: string;
  receiptImageUrl?: string;
}

export interface ProductCategoryItem {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  productCount?: number;
}

export interface StoreProduct {
  id: string;
  name: string;
  category: string;
  categoryId?: string;
  price: number;
  sellingPrice?: number;
  purchasePrice?: number;
  mrp?: number;
  originalPrice?: number;
  imageUrl: string;
  description: string;
  isAvailable: boolean;
  isActive?: boolean;
  type?: 'GOODS' | 'SERVICE';
  itemCode?: string;
  sku?: string;
  barcode?: string;
  hsnSac?: string;
  hsnCode?: string;
  gstRate?: number;
  gstPercent?: number;
  taxType?: 'EXCLUSIVE' | 'INCLUSIVE' | 'EXEMPT';
  cessRate?: number;
  unit?: string;
  secondaryUnit?: string;
  conversionFactor?: number;
  openingStock?: number;
  currentStock?: number;
  stockQty?: number;
  lowStockThreshold?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DailyCalendarItem {
  id: string;
  title: string;
  category: 'Festival' | 'Jayanti & National' | 'Daily Suvichar' | 'Motivation' | 'Flash Sale';
  dateLabel: string;
  imageUrl: string;
  headline: string;
  subheadline: string;
  quoteHindi?: string;
  badge?: string;
}

export interface TemplateItem {
  id: string;
  title: string;
  category: string;
  categoryIcon: string;
  tier: 'PRO' | 'FREE';
  format: '1:1 Sq' | 'Story 9:16' | 'Card' | '4:5 Feed';
  usedCount?: string;
  imageUrl: string;
  promptText?: string;
  headlineDefault?: string;
  subheadlineDefault?: string;
}

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'copilot';
  timestamp: string;
  text: string;
  generatedCreative?: {
    tag: string;
    title: string;
    image: string;
    headline: string;
    body: string;
    hashtags: string[];
    readability: string;
    characters: number;
  };
}

export type ProPlanType = 'trial' | 'monthly' | 'yearly';

export interface ProSubscriptionInfo {
  isPro: boolean;
  plan: ProPlanType;
  expiresAt: string;
  autoPayEnabled: boolean;
  autoPayApp?: string;
}

export interface GeminiSettings {
  apiKey: string;
  isCustomKey: boolean;
  model?: string;
}

