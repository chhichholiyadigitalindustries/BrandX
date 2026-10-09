/**
 * BRANDX Admin Dashboard Data Models & Type Definitions
 * Backend-ready TypeScript contracts for administration, CMS, users, analytics, and platform controls.
 */

export type AdminRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'COO'
  | 'CMO'
  | 'MANAGER'
  | 'ACCOUNTANT'
  | 'CONTENT_MANAGER'
  | 'SUPPORT'
  | 'FINANCE'
  | 'super_admin'
  | 'admin'
  | 'coo'
  | 'cmo'
  | 'manager'
  | 'accountant'
  | 'content_manager'
  | 'support'
  | 'finance';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  designation?: string;
  department?: string;
  avatarUrl?: string;
  phone?: string;
  status: 'active' | 'suspended' | 'pending' | 'ACTIVE' | 'SUSPENDED';
  isActive?: boolean;
  createdBy?: string | null;
  permissions?: string[];
  lastLogin?: string;
  createdAt?: string;
}

export interface PlatformUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  businessName: string;
  businessType: string;
  city: string;
  state: string;
  isPro: boolean;
  gstin?: string;
  avatarUrl?: string;
  registrationDate: string;
  lastActive: string;
  status: 'active' | 'suspended' | 'pending_kyc';
  invoicesCount: number;
  khataCustomersCount: number;
  postersSharedCount: number;
  aiRequestsCount: number;
}

export interface PlatformBusiness {
  id: string;
  ownerId: string;
  ownerName: string;
  name: string;
  tagline?: string;
  businessType: string;
  category: string;
  gstin?: string;
  panNumber?: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  upiId?: string;
  bankAccount?: {
    accountNumber: string;
    ifsc: string;
    bankName: string;
  };
  logoUrl?: string;
  registrationDate: string;
  status: 'verified' | 'unverified' | 'suspended';
  totalRevenueCalculated: number;
  invoicesCount: number;
}

export type PosterLanguage = 'hi' | 'en' | 'hinglish';

export interface AdminDailyStatus {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  headline: string;
  quoteHindi: string;
  quoteEnglish?: string;
  quoteHinglish?: string;
  language: PosterLanguage;
  category: 'suvichar' | 'morning' | 'festival' | 'business_tip' | 'motivation';
  imageUrl: string;
  thumbnailUrl: string;
  aspectRatio: '9:16' | '1:1' | '16:9';
  isActive: boolean;
  isPublished: boolean;
  publishDateTime: string;
  sharesCount: number;
  downloadsCount: number;
  tags: string[];
  authorAdminId: string;
  tier?: 'FREE' | 'PRO' | 'ENTERPRISE';
  status?: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'ARCHIVED';
  visibility?: 'PUBLIC' | 'PRO_ONLY' | 'PRIVATE';
  createdAt: string;
  updatedAt: string;
}

export interface AdminPoster {
  id: string;
  title: string;
  category:
    | 'Morning'
    | 'Suvichar'
    | 'Festival'
    | 'Business'
    | 'Offers'
    | 'Wedding'
    | 'Cafe'
    | 'Salon'
    | 'Restaurant'
    | 'Retail'
    | 'General';
  imageUrl: string;
  thumbnailUrl: string;
  headlineDefault: string;
  subheadlineDefault: string;
  aspectRatio: '1:1' | '9:16' | '16:9' | '4:5';
  isTrending?: boolean;
  isPremium?: boolean;
  status: 'published' | 'draft' | 'archived';
  scheduledDate?: string;
  sharesCount: number;
  downloadsCount: number;
  tags: string[];
  createdAt: string;
}

export interface AdminFestival {
  id: string;
  name: string;
  hindiName: string;
  date: string; // YYYY-MM-DD
  description: string;
  bannerImageUrl: string;
  postersCount: number;
  isActive: boolean;
  priority: number; // 1 = highest
  greetings: {
    hindi: string;
    english: string;
  };
  tags: string[];
}

export interface AdminInvoiceRecord {
  id: string;
  invoiceNumber: string;
  businessId: string;
  businessName: string;
  customerName: string;
  customerPhone?: string;
  date: string;
  amount: number;
  gstAmount: number;
  documentType: 'Tax Invoice' | 'Estimate / Quotation' | 'Bill of Supply' | 'Delivery Challan';
  paymentMode: 'Cash' | 'UPI' | 'Card' | 'Credit' | 'Bank Transfer';
  status: 'paid' | 'pending' | 'cancelled';
}

export interface AdminKhataMetrics {
  totalAccounts: number;
  activeAccounts: number;
  totalUdharGiven: number;
  totalJamaReceived: number;
  netPendingMarketBalance: number;
  dailyTransactionsCount: number;
  settlementRatePercent: number;
}

export interface AdminAICopilotMetrics {
  totalRequests: number;
  todayRequests: number;
  monthlyRequests: number;
  voiceToBillRequests: number;
  captionGenerations: number;
  reviewReplies: number;
  whatsappCampaigns: number;
  activeAiUsers: number;
  averageResponseTimeMs: number;
  errorRatePercent: number;
}

export interface AdminAnnouncement {
  id: string;
  title: string;
  message: string;
  bannerUrl?: string;
  actionUrl?: string;
  actionLabel?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  targetAudience: 'all' | 'free_users' | 'pro_users' | 'retailers';
  startDate: string;
  endDate: string;
  status: 'active' | 'scheduled' | 'expired' | 'draft';
  viewsCount: number;
  clicksCount: number;
  createdAt: string;
}

export interface AdminReportFilter {
  reportType: 'users' | 'businesses' | 'invoices' | 'khata' | 'posters' | 'ai_usage';
  startDate: string;
  endDate: string;
  state?: string;
  status?: string;
  format: 'csv' | 'json' | 'pdf';
}

export interface AdminSettings {
  general: {
    appName: string;
    tagline: string;
    supportEmail: string;
    supportPhone: string;
    playStoreUrl: string;
    appVersion: string;
  };
  branding: {
    primaryColor: string;
    accentColor: string;
    logoUrl: string;
    faviconUrl: string;
  };
  content: {
    autoPublishDailyStatus: boolean;
    dailyStatusPublishTime: string; // "05:00"
    watermarkEnabled: boolean;
    watermarkText: string;
  };
  featureFlags: {
    dailyStatus: boolean;
    posterMaker: boolean;
    aiCopilot: boolean;
    digitalDukaan: boolean;
    nfcCards: boolean;
    qrStudio: boolean;
    gstBilling: boolean;
    khataLedger: boolean;
    voiceToBill: boolean;
  };
  aiConfig: {
    geminiModel: string;
    maxDailyFreePrompts: number;
    voiceAudioEnabled: boolean;
  };
  security: {
    requireTwoFactorForAdmins: boolean;
    sessionTimeoutMinutes: number;
    maintenanceMode: boolean;
  };
}

export interface AdminDashboardOverview {
  totalUsers: number;
  newUsersToday: number;
  activeUsersToday: number;
  totalBusinesses: number;
  totalInvoicesGenerated: number;
  invoicesToday: number;
  totalKhataTransactions: number;
  postersSharedCount: number;
  postersSharedToday: number;
  aiRequestsCount: number;
  aiRequestsToday: number;
  userGrowthPercent: number;
  revenueGrowthPercent: number;
  chartUserRegistrations: Array<{ label: string; value: number }>;
  chartDailyActiveUsers: Array<{ label: string; value: number }>;
  chartInvoiceGeneration: Array<{ label: string; value: number }>;
  chartAiUsage: Array<{ label: string; value: number }>;
  chartContentEngagement: Array<{ label: string; value: number }>;
}

export * from './payment';
