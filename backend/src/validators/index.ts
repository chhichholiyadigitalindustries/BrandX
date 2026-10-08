import { z } from 'zod';

// ------------------------------------------------------------
// AUTH VALIDATORS
// ------------------------------------------------------------

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid 10-digit Indian mobile number'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  businessName: z.string().optional(),
  businessCategory: z.string().optional(),
});

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Mobile or Email is required'),
  password: z.string().optional(),
  otp: z.string().optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const requestOtpSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid 10-digit Indian mobile number'),
});

export const verifyOtpSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid 10-digit Indian mobile number'),
  otp: z.string().min(4, 'OTP must be at least 4 digits'),
});

export const firebaseAuthSchema = z.object({
  idToken: z.string().min(1, 'Firebase ID token is required'),
  businessName: z.string().optional(),
  businessCategory: z.string().optional(),
  name: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().optional(),
  phoneVerified: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
});

// ------------------------------------------------------------
// SAFE MEDIA & URL VALIDATOR
// Supports absolute URLs (https://, http://), relative paths (/uploads/..., /api/v1/media/..., /brandx-logo.png), and MediaAsset keys/IDs.
// ------------------------------------------------------------

export const safeUrlSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (!val) return true;
      const lower = val.toLowerCase();
      if (lower.startsWith('javascript:') || lower.startsWith('vbscript:') || lower.includes('..')) {
        return false;
      }
      // Allow relative paths (/uploads/..., /api/v1/..., /brandx-logo.png)
      if (val.startsWith('/')) {
        return true;
      }
      // Allow MediaAsset keys
      if (/^(daily-content|daily-status|posters|festivals|logos|avatars|announcements|general|uploads)\/[a-zA-Z0-9_.-]+$/i.test(val)) {
        return true;
      }
      // Allow UUIDs
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) {
        return true;
      }
      try {
        const url = new URL(val);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'Must be a valid media URL, relative path, or media key' }
  )
  .optional()
  .or(z.literal(''));

export const updateUserProfileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal('')),
  profileImage: safeUrlSchema,
  language: z.enum(['hi', 'en']).optional(),
  timezone: z.string().optional(),
});

export const upiIdRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9.\-_]{2,64}$/;
export const upiIdSchema = z.string()
  .trim()
  .refine(val => !val || upiIdRegex.test(val), {
    message: 'Invalid UPI ID format (e.g. shop@okhdfcbank or 9876543210@paytm)',
  })
  .optional()
  .or(z.literal(''));

export const createBusinessSchema = z.object({
  name: z.string().min(2, 'Business name is required').optional(),
  businessName: z.string().min(2).optional(),
  ownerName: z.string().min(2, 'Owner name is required'),
  businessType: z.string().default('Retail').optional(),
  category: z.string().default('Retail & Kirana').optional(),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid 10-digit Indian mobile number'),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().min(2, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Invalid 6-digit Indian PIN code'),
  gstin: z.string().optional().or(z.literal('')),
  GSTIN: z.string().optional().or(z.literal('')),
  pan: z.string().optional().or(z.literal('')),
  PAN: z.string().optional().or(z.literal('')),
  tagline: z.string().optional().or(z.literal('')),
  logo: z.string().optional().or(z.literal('')),
  logoUrl: z.string().optional().or(z.literal('')),
  upiId: upiIdSchema,
  bankName: z.string().optional().or(z.literal('')),
  accountNumber: z.string().optional().or(z.literal('')),
  ifscCode: z.string().optional().or(z.literal('')),
  accountHolderName: z.string().optional().or(z.literal('')),
  invoicePrefix: z.string().max(10).optional(),
  nextInvoiceNumber: z.number().int().positive().optional(),
  invoiceTerms: z.string().optional().or(z.literal('')),
  signatureUrl: z.string().optional().or(z.literal('')),
  instagram: z.string().optional().or(z.literal('')),
}).refine(data => data.name || data.businessName, {
  message: 'Business name is required (use name or businessName)',
  path: ['name'],
});

export const updateBusinessSchema = z.object({
  name: z.string().min(2).optional(),
  businessName: z.string().min(2).optional(),
  ownerName: z.string().min(2).optional(),
  businessType: z.string().optional(),
  category: z.string().optional(),
  mobile: z.string().regex(/^[6-9]\d{9}$/).optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().min(2).optional(),
  city: z.string().min(2).optional(),
  state: z.string().min(2).optional(),
  pincode: z.string().regex(/^\d{6}$/).optional(),
  gstin: z.string().optional().or(z.literal('')),
  GSTIN: z.string().optional().or(z.literal('')),
  pan: z.string().optional().or(z.literal('')),
  PAN: z.string().optional().or(z.literal('')),
  tagline: z.string().optional().or(z.literal('')),
  logo: z.string().optional().or(z.literal('')),
  logoUrl: z.string().optional().or(z.literal('')),
  upiId: upiIdSchema,
  bankName: z.string().optional().or(z.literal('')),
  accountNumber: z.string().optional().or(z.literal('')),
  ifscCode: z.string().optional().or(z.literal('')),
  accountHolderName: z.string().optional().or(z.literal('')),
  invoicePrefix: z.string().max(10).optional(),
  nextInvoiceNumber: z.number().int().positive().optional(),
  invoiceTerms: z.string().optional().or(z.literal('')),
  signatureUrl: z.string().optional().or(z.literal('')),
  instagram: z.string().optional().or(z.literal('')),
});

export const updateBusinessSettingsSchema = z.object({
  autoShareWhatsapp: z.boolean().optional(),
  showGstOnBill: z.boolean().optional(),
  defaultGstRate: z.number().min(0).max(28).optional(),
  thermalPrintWidth: z.enum(['58mm', '80mm']).optional(),
  currency: z.string().default('INR').optional(),
  themeColor: z.string().optional(),
});

// ------------------------------------------------------------
// CUSTOMERS & KHATA VALIDATORS
// ------------------------------------------------------------

export const createCustomerSchema = z.object({
  name: z.string().min(2, 'Customer name is required'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid 10-digit Indian mobile number').optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid 10-digit Indian mobile number').optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  gstin: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  openingBalance: z.number().default(0).optional(),
  balance: z.number().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']).default('ACTIVE').optional(),
}).refine(data => data.mobile || data.phone, {
  message: 'Mobile/phone number is required',
  path: ['mobile'],
});

export const updateCustomerSchema = z.object({
  name: z.string().min(2).optional(),
  mobile: z.string().regex(/^[6-9]\d{9}$/).optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  gstin: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  openingBalance: z.number().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']).optional(),
});

export const createKhataTxSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID').optional(),
  type: z.enum(['GIVE_UDHAR', 'RECEIVE_JAMA', 'UDHAAR', 'JAMA', 'give', 'receive', 'udhar', 'jama']),
  amount: z.number().positive('Amount must be greater than 0'),
  transactionDate: z.string().optional(),
  billNumber: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  note: z.string().optional().or(z.literal('')),
  paymentMode: z.string().default('CASH').optional(),
  reference: z.string().optional().or(z.literal('')),
  attachmentUrl: z.string().optional().or(z.literal('')),
});

export const updateKhataTxSchema = z.object({
  type: z.enum(['GIVE_UDHAR', 'RECEIVE_JAMA', 'UDHAAR', 'JAMA', 'give', 'receive', 'udhar', 'jama']).optional(),
  amount: z.number().positive().optional(),
  transactionDate: z.string().optional(),
  billNumber: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  note: z.string().optional().or(z.literal('')),
  paymentMode: z.string().optional(),
  reference: z.string().optional().or(z.literal('')),
  attachmentUrl: z.string().optional().or(z.literal('')),
});

export const createPaymentReminderSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID').optional(),
  amount: z.number().positive().optional(),
  upiId: z.string().optional(),
  reminderMessage: z.string().min(5).optional(),
  channel: z.enum(['WHATSAPP', 'SMS']).default('WHATSAPP').optional(),
});

// ------------------------------------------------------------
// PRODUCT CATEGORY VALIDATORS
// ------------------------------------------------------------

export const createProductCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  isActive: z.boolean().default(true).optional(),
});

export const updateProductCategorySchema = createProductCategorySchema.partial();

// ------------------------------------------------------------
// PRODUCT MASTER & INVENTORY VALIDATORS
// ------------------------------------------------------------

export const productUnitEnum = z.enum([
  'PCS', 'BOX', 'KG', 'GRAM', 'LITRE', 'ML', 'METER',
  'CM', 'FEET', 'DOZEN', 'PAIR', 'PACK', 'BAG', 'BOTTLE', 'SET', 'OTHER'
]);

export const taxTypeEnum = z.enum(['EXCLUSIVE', 'INCLUSIVE', 'EXEMPT']);

export const inventoryTransactionTypeEnum = z.enum([
  'OPENING_STOCK', 'STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT',
  'SALE', 'PURCHASE', 'RETURN_IN', 'RETURN_OUT'
]);

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  itemCode: z.string().max(100).optional().or(z.literal('')),
  sku: z.string().max(100).optional().or(z.literal('')),
  barcode: z.string().max(100).optional().or(z.literal('')),
  categoryId: z.string().optional().or(z.literal('')),
  category: z.string().default('General').optional(),
  description: z.string().max(2000).optional().or(z.literal('')),
  type: z.enum(['GOODS', 'SERVICE']).default('GOODS').optional(),

  // Pricing
  sellingPrice: z.number().nonnegative('Selling price cannot be negative'),
  purchasePrice: z.number().nonnegative('Purchase price cannot be negative').optional(),
  mrp: z.number().nonnegative('MRP cannot be negative').optional(),

  // GST / Tax
  hsnSac: z.string().max(20).optional().or(z.literal('')),
  hsnCode: z.string().max(20).optional().or(z.literal('')),
  gstRate: z.number().min(0).max(100).default(18).optional(),
  gstPercent: z.number().min(0).max(100).optional(),
  taxType: taxTypeEnum.default('EXCLUSIVE').optional(),
  cessRate: z.number().min(0).max(100).optional(),

  // Units
  unit: productUnitEnum.default('PCS').optional(),
  secondaryUnit: z.string().max(50).optional().or(z.literal('')),
  conversionFactor: z.number().positive().optional(),

  // Inventory
  openingStock: z.number().nonnegative('Opening stock cannot be negative').default(0).optional(),
  currentStock: z.number().optional(),
  stockQty: z.number().optional(),
  lowStockThreshold: z.number().nonnegative().default(5).optional(),

  // Status
  isActive: z.boolean().default(true).optional(),
  isAvailable: z.boolean().default(true).optional(),
  imageUrl: z.string().optional().or(z.literal('')),
});

export const updateProductSchema = createProductSchema.partial();

export const stockChangeSchema = z.object({
  type: inventoryTransactionTypeEnum.default('STOCK_IN'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  note: z.string().max(500).optional().or(z.literal('')),
  referenceType: z.string().max(100).optional().or(z.literal('')),
  referenceId: z.string().max(100).optional().or(z.literal('')),
});

export const stockAdjustmentSchema = z.object({
  quantity: z.number({ required_error: 'Quantity is required' }),
  adjustmentType: z.enum(['SET', 'ADD', 'SUBTRACT', 'STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT']).default('ADJUSTMENT'),
  reason: z.string().min(1, 'Reason or note is required for stock adjustment'),
  note: z.string().optional().or(z.literal('')),
});

// ------------------------------------------------------------
// INVOICE & GST BILLING VALIDATORS
// ------------------------------------------------------------

export const invoiceItemInputSchema = z.object({
  productId: z.string().uuid().optional(),
  name: z.string().min(1, 'Item name is required').optional(),
  productNameSnapshot: z.string().optional(),
  itemCode: z.string().optional().or(z.literal('')),
  code: z.string().optional().or(z.literal('')),
  hsnSac: z.string().optional().or(z.literal('')),
  hsnCode: z.string().optional().or(z.literal('')),
  type: z.enum(['GOODS', 'SERVICE']).default('GOODS'),
  quantity: z.number().positive('Quantity must be greater than 0').optional(),
  qty: z.number().positive('Quantity must be greater than 0').optional(),
  unit: z.string().optional(),
  rate: z.number().nonnegative('Rate cannot be negative').optional(),
  mrp: z.number().nonnegative().optional(),
  discountType: z.enum(['PERCENT', 'FIXED']).default('PERCENT').optional(),
  discountValue: z.number().nonnegative().default(0).optional(),
  discountAmount: z.number().nonnegative().default(0).optional(),
  discount: z.number().nonnegative().default(0).optional(),
  gstRate: z.number().min(0).max(100).default(18).optional(),
  gstPercent: z.number().min(0).max(100).default(18).optional(),
  cessRate: z.number().min(0).max(100).default(0).optional(),
}).refine(data => data.name || data.productNameSnapshot || data.productId, {
  message: 'Item name or product ID is required',
  path: ['name'],
});

export const createInvoiceSchema = z.object({
  customerId: z.string().uuid().optional().or(z.literal('')),
  documentType: z
    .enum([
      'GST_INVOICE',
      'RETAIL_BILL',
      'QUOTATION',
      'ESTIMATE',
      'DELIVERY_CHALLAN',
      'PROFORMA_INVOICE',
      'TAX_INVOICE',
      'ESTIMATE_QUOTATION',
    ])
    .default('GST_INVOICE'),
  status: z.enum(['DRAFT', 'ISSUED', 'PAID', 'PARTIALLY_PAID', 'UNPAID']).default('ISSUED').optional(),
  isGstBill: z.boolean().default(true).optional(),
  invoiceDate: z.string().optional(),
  billDate: z.string().optional(),
  dueDate: z.string().optional(),

  // Buyer information
  buyerName: z.string().optional(),
  customerName: z.string().optional(),
  buyerPhone: z.string().optional(),
  customerPhone: z.string().optional(),
  buyerEmail: z.string().email().optional().or(z.literal('')),
  buyerGSTIN: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid 15-character GSTIN format').optional().or(z.literal('')),
  buyerGstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid 15-character GSTIN format').optional().or(z.literal('')),
  buyerAddress: z.string().optional().or(z.literal('')),
  placeOfSupply: z.string().optional(),
  reverseCharge: z.boolean().default(false).optional(),

  // Items
  items: z.array(invoiceItemInputSchema).min(1, 'At least 1 invoice item is required'),

  // Discounts & terms
  discountCode: z.string().optional(),
  discountPercent: z.number().min(0).max(100).default(0).optional(),
  paymentMethod: z
    .enum(['UPI', 'CARD', 'NETBANKING', 'WALLET', 'EMI', 'CASH', 'QR', 'BANK_TRANSFER', 'CREDIT', 'OTHER'])
    .default('UPI')
    .optional(),
  paymentStatus: z.enum(['PAID', 'PARTIALLY_PAID', 'UNPAID', 'CANCELLED']).default('PAID').optional(),
  amountPaid: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  termsAndConditions: z.string().optional(),
  includeSignature: z.boolean().default(true).optional(),
});

export const updateInvoiceDraftSchema = z.object({
  customerId: z.string().uuid().optional().or(z.literal('')),
  documentType: z
    .enum([
      'GST_INVOICE',
      'RETAIL_BILL',
      'QUOTATION',
      'ESTIMATE',
      'DELIVERY_CHALLAN',
      'PROFORMA_INVOICE',
      'TAX_INVOICE',
      'ESTIMATE_QUOTATION',
    ])
    .optional(),
  dueDate: z.string().optional(),
  buyerName: z.string().optional(),
  buyerPhone: z.string().optional(),
  buyerEmail: z.string().email().optional().or(z.literal('')),
  buyerGSTIN: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).optional().or(z.literal('')),
  buyerAddress: z.string().optional().or(z.literal('')),
  placeOfSupply: z.string().optional(),
  reverseCharge: z.boolean().optional(),
  items: z.array(invoiceItemInputSchema).min(1).optional(),
  discountCode: z.string().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  paymentMethod: z
    .enum(['UPI', 'CARD', 'NETBANKING', 'WALLET', 'EMI', 'CASH', 'QR', 'BANK_TRANSFER', 'CREDIT', 'OTHER'])
    .optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  termsAndConditions: z.string().optional(),
  includeSignature: z.boolean().optional(),
});

export const recordInvoicePaymentSchema = z.object({
  amount: z.number().positive('Payment amount must be greater than 0'),
  paymentMethod: z
    .enum(['UPI', 'CARD', 'NETBANKING', 'WALLET', 'EMI', 'CASH', 'QR', 'BANK_TRANSFER', 'CREDIT', 'OTHER'])
    .default('UPI'),
  referenceNumber: z.string().optional().or(z.literal('')),
  transactionRef: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  note: z.string().optional().or(z.literal('')),
  paymentDate: z.string().optional(),
});

// ------------------------------------------------------------
// DIGITAL DUKAAN & DIGITAL CARD
// ------------------------------------------------------------

// ------------------------------------------------------------
// DIGITAL DUKAAN & DIGITAL CARD
// ------------------------------------------------------------


const socialLinksSchema = z
  .object({
    instagram: safeUrlSchema,
    facebook: safeUrlSchema,
    youtube: safeUrlSchema,
    linkedin: safeUrlSchema,
    twitter: safeUrlSchema,
    telegram: safeUrlSchema,
    whatsapp: safeUrlSchema,
  })
  .optional();

export const createDigitalStoreSchema = z.object({
  title: z.string().min(2, 'Store title must be at least 2 characters').max(100),
  tagline: z.string().max(160).optional().or(z.literal('')),
  description: z.string().max(1000).optional().or(z.literal('')),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric and hyphens').optional(),
  logoUrl: safeUrlSchema,
  coverImageUrl: safeUrlSchema,
  phone: z.string().min(10, 'Valid 10-digit phone number required'),
  whatsappNumber: z.string().optional().or(z.literal('')),
  whatsapp: z.string().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  pincode: z.string().optional().or(z.literal('')),
  mapUrl: safeUrlSchema,
  websiteUrl: safeUrlSchema,
  website: safeUrlSchema,
  upiId: z.string().optional().or(z.literal('')),
  businessHours: z.string().max(200).optional().or(z.literal('')),
  googleReviewUrl: safeUrlSchema,
  instagram: z.string().optional().or(z.literal('')),
  socialLinks: socialLinksSchema,
  theme: z.string().default('emerald'),
  isPublished: z.boolean().default(true),
});

export const updateDigitalStoreSchema = createDigitalStoreSchema.partial();

export const addStoreItemSchema = z.object({
  productId: z.string().uuid().optional().or(z.literal('')),
  name: z.string().min(2, 'Item name must be at least 2 characters'),
  displayName: z.string().optional().or(z.literal('')),
  price: z.number().min(0, 'Price must be non-negative'),
  displayPrice: z.number().min(0).optional(),
  originalPrice: z.number().min(0).optional(),
  description: z.string().max(1000).optional().or(z.literal('')),
  imageUrl: safeUrlSchema,
  category: z.string().default('General'),
  isAvailable: z.boolean().default(true),
  isVisible: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const updateStoreItemSchema = addStoreItemSchema.partial();

export const reorderStoreItemsSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int(),
    })
  ).min(1, 'At least one item required for reordering'),
});

export const createDigitalCardSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100).optional(),
  name: z.string().min(2).max(100).optional(),
  designation: z.string().max(100).optional().or(z.literal('')),
  companyName: z.string().min(2).max(100).optional(),
  company: z.string().min(2).max(100).optional(),
  phone: z.string().min(10, 'Valid 10-digit phone number required').optional(),
  mobile: z.string().min(10).optional(),
  email: z.string().email().optional().or(z.literal('')),
  whatsapp: z.string().optional().or(z.literal('')),
  website: safeUrlSchema,
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  pincode: z.string().optional().or(z.literal('')),
  profileImageUrl: safeUrlSchema,
  logoUrl: safeUrlSchema,
  bio: z.string().max(1000).optional().or(z.literal('')),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric and hyphens').optional(),
  upiId: z.string().optional().or(z.literal('')),
  socialLinks: socialLinksSchema,
  theme: z.string().default('executive'),
  isPublished: z.boolean().default(true),
});

export const updateDigitalCardSchema = createDigitalCardSchema.partial();

// ------------------------------------------------------------
// AI BIZ COPILOT
// ------------------------------------------------------------

export const aiChatSchema = z.object({
  message: z.string().min(1, 'Message is required').max(3000, 'Message cannot exceed 3000 characters'),
  language: z.enum(['hindi', 'hinglish', 'english']).default('hinglish').optional(),
  context: z
    .object({
      businessName: z.string().optional(),
      category: z.string().optional(),
      city: z.string().optional(),
      ownerName: z.string().optional(),
      phone: z.string().optional(),
      upiId: z.string().optional(),
    })
    .optional(),
});

export const aiReviewReplySchema = z.object({
  review: z.string().min(1, 'Review text is required').max(2000),
  rating: z.coerce.number().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5'),
  language: z.string().default('hinglish').optional(),
  businessName: z.string().optional(),
  tone: z.enum(['professional', 'friendly', 'short', 'premium']).default('friendly').optional(),
});

export const aiWhatsappCampaignSchema = z.object({
  purpose: z.string().min(1, 'Campaign purpose is required').max(200),
  festival: z.string().max(100).optional().or(z.literal('')),
  businessType: z.string().max(100).optional().or(z.literal('')),
  language: z.string().default('hinglish').optional(),
  offer: z.string().max(200).optional().or(z.literal('')),
  businessName: z.string().optional(),
  contactPhone: z.string().optional(),
  upiId: z.string().optional(),
  address: z.string().optional(),
});

export const aiCaptionSchema = z.object({
  topic: z.string().min(1, 'Topic is required').max(500),
  businessName: z.string().optional(),
  language: z.string().default('hinglish').optional(),
  platform: z.enum(['whatsapp', 'instagram', 'facebook', 'poster', 'general']).default('whatsapp').optional(),
});

export const aiBusinessInsightsSchema = z.object({
  language: z.string().default('hinglish').optional(),
  timeframe: z.enum(['last_30_days', 'all_time']).default('last_30_days').optional(),
});

export const aiGenerateSchema = z.object({
  type: z.enum(['POSTER_CAPTION', 'REVIEW_REPLY', 'WHATSAPP_REMINDER', 'VOICE_TO_BILL']),
  prompt: z.string().min(1, 'Prompt is required'),
  params: z.record(z.any()).optional(),
});

// Structured Gemini Output Schemas
export const structuredReviewReplyOutputSchema = z.object({
  reply: z.string().min(1),
  language: z.string().default('hinglish'),
  tone: z.string().default('friendly'),
  rating: z.number().default(5),
});

export const structuredWhatsappCampaignOutputSchema = z.object({
  campaignTitle: z.string().min(1),
  message: z.string().min(1),
  cta: z.string().min(1),
  caption: z.string().optional(),
});

export const structuredCaptionOutputSchema = z.object({
  headline: z.string().min(1),
  caption: z.string().min(1),
  hashtags: z.array(z.string()).default([]),
  platform: z.string().default('whatsapp'),
  language: z.string().default('hinglish'),
});

export const structuredBusinessInsightsOutputSchema = z.object({
  summary: z.string().min(1),
  khataInsights: z.string().min(1),
  salesInsights: z.string().min(1),
  stockInsights: z.string().min(1),
  actionableSuggestions: z.array(z.string()).min(1),
  disclaimer: z.string().min(1),
});

// ------------------------------------------------------------
// PRO SUBSCRIPTIONS & PAYMENTS
// ------------------------------------------------------------

export const checkoutSubscriptionSchema = z.object({
  planCode: z.string().min(1, 'planCode is required'),
  gateway: z.string().default('RAZORPAY').optional(),
});

export const createOrderSchema = checkoutSubscriptionSchema;

export const verifySubscriptionPaymentSchema = z.object({
  orderId: z.string().min(1, 'orderId is required'),
  paymentId: z.string().min(1, 'paymentId is required'),
  signature: z.string().optional(),
  planCode: z.string().optional(),
});

export const verifyPaymentSchema = verifySubscriptionPaymentSchema;

export const cancelSubscriptionSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const adminCreatePlanSchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  price: z.coerce.number().min(0),
  originalPrice: z.coerce.number().min(0).optional(),
  currency: z.string().default('INR').optional(),
  billingInterval: z.enum(['free', 'monthly', 'yearly', 'lifetime']).default('monthly').optional(),
  durationDays: z.coerce.number().int().positive().default(30).optional(),
  features: z.array(z.string()).default([]).optional(),
  limits: z.record(z.any()).default({}).optional(),
  isActive: z.boolean().default(true).optional(),
  isPopular: z.boolean().default(false).optional(),
  status: z.enum(['active', 'archived', 'draft']).default('active').optional(),
});

export const adminUpdatePlanSchema = adminCreatePlanSchema.partial();

export const adminRefundSchema = z.object({
  paymentId: z.string().optional(),
  transactionId: z.string().optional(),
  amount: z.coerce.number().positive('Refund amount must be greater than 0'),
  reason: z.string().max(500).optional(),
}).refine((data) => !!(data.paymentId || data.transactionId), {
  message: 'Either paymentId or transactionId is required',
});

// ------------------------------------------------------------
// ADMIN AUTH & PLATFORM MANAGEMENT
// ------------------------------------------------------------

export const adminLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const createAdminUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.preprocess((val) => (typeof val === 'string' ? val.trim().toLowerCase() : val), z.string().email('Valid email required')),
  phone: z.preprocess((val) => (typeof val === 'string' && val.trim() === '' ? undefined : val), z.string().trim().optional()),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'CONTENT_MANAGER', 'SUPPORT', 'FINANCE']).default('MANAGER'),
});

export const updateAdminStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
  isActive: z.boolean().optional(),
  reason: z.string().optional(),
});

export const updateAdminRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'ACCOUNTANT', 'CONTENT_MANAGER', 'SUPPORT', 'FINANCE']),
});

export const updateAdminProfileSchema = z.object({
  name: z.preprocess((val) => (typeof val === 'string' ? val.trim() : val), z.string().min(2, 'Name must be at least 2 characters')).optional(),
  email: z.preprocess((val) => (typeof val === 'string' ? val.trim().toLowerCase() : val), z.string().email('Valid email required')).optional(),
  phone: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : typeof val === 'string' ? val.trim() : val),
    z.string().nullable().optional()
  ),
  avatarUrl: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : typeof val === 'string' ? val.trim() : val),
    z.string().nullable().optional()
  ),
});

export const changeAdminPasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export const updatePlatformUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']),
  reason: z.string().optional(),
});

export const updateRefundStatusSchema = z.object({
  status: z.enum(['REQUESTED', 'PROCESSING', 'COMPLETED', 'REJECTED']),
  adminNotes: z.string().optional(),
});

// ------------------------------------------------------------
// 365-DAY DAILY STATUS, FESTIVAL & POSTER CMS
// ------------------------------------------------------------

export const contentTypeEnum = z.enum([
  'MORNING_GREETING',
  'SUVICHAR',
  'FESTIVAL',
  'BUSINESS',
  'MOTIVATIONAL',
  'SALE',
  'ANNOUNCEMENT',
  'CUSTOM',
]);

export const contentEventTypeEnum = z.enum([
  'VIEW',
  'DOWNLOAD',
  'SHARE',
  'WHATSAPP_CLICK',
  'FAVORITE',
]);

export const aspectRatioEnum = z.enum([
  '9:16',
  '1:1',
  '4:5',
  '16:9',
  'A4',
]);

export const createDailyContentSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(200),
  description: z.string().max(1000).optional().or(z.literal('')),
  contentText: z.string().max(2000).optional().or(z.literal('')),
  headline: z.string().max(255).optional().or(z.literal('')),
  quoteHindi: z.string().optional().or(z.literal('')),
  quoteEnglish: z.string().optional().or(z.literal('')),
  quoteHinglish: z.string().optional().or(z.literal('')),
  imageUrl: z.string().min(1, 'Image URL is required'),
  thumbnailUrl: z.string().optional().or(z.literal('')),
  contentType: contentTypeEnum.default('SUVICHAR'),
  language: z.string().default('hi'),
  categoryId: z.string().uuid().optional().or(z.literal('')),
  festivalId: z.string().uuid().optional().or(z.literal('')),
  contentDate: z.string().optional(),
  date: z.string().optional(),
  aspectRatio: aspectRatioEnum.default('9:16'),
  isPublished: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  publishAt: z.string().optional(),
  expiresAt: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export const updateDailyContentSchema = createDailyContentSchema.partial();

export const scheduleDailyContentSchema = z.object({
  publishAt: z.string().min(1, 'publishAt is required'),
  expiresAt: z.string().optional(),
});

export const createFestivalSchema = z.object({
  name: z.string().min(2, 'Festival name required').max(100),
  hindiName: z.string().max(100).optional().or(z.literal('')),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric and hyphens').optional(),
  description: z.string().max(1000).optional().or(z.literal('')),
  festivalDate: z.string(),
  date: z.string().optional(),
  year: z.number().int().min(2020).max(2100).default(2026),
  language: z.string().default('hi'),
  imageUrl: z.string().optional().or(z.literal('')),
  bannerUrl: z.string().optional().or(z.literal('')),
  priority: z.number().int().default(1),
  tags: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export const updateFestivalSchema = createFestivalSchema.partial();

export const createContentCategorySchema = z.object({
  name: z.string().min(2, 'Category name required').max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric and hyphens').optional(),
  description: z.string().max(500).optional().or(z.literal('')),
  icon: z.string().default('category'),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const updateContentCategorySchema = createContentCategorySchema.partial();

export const createContentAssetSchema = z.object({
  title: z.string().min(2, 'Title required').max(200),
  description: z.string().max(1000).optional().or(z.literal('')),
  imageUrl: z.string().min(1, 'Image URL required'),
  thumbnailUrl: z.string().optional().or(z.literal('')),
  contentType: contentTypeEnum.default('BUSINESS'),
  categoryId: z.string().uuid().optional().or(z.literal('')),
  festivalId: z.string().uuid().optional().or(z.literal('')),
  language: z.string().default('hi'),
  aspectRatio: aspectRatioEnum.default('1:1'),
  format: z.string().default('1:1 Sq'),
  tier: z.enum(['FREE', 'PRO']).default('FREE'),
  tags: z.array(z.string()).default([]),
  isPublished: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});

export const updateContentAssetSchema = createContentAssetSchema.partial();

export const trackContentEventSchema = z.object({
  contentId: z.string().uuid().optional().or(z.literal('')),
  assetId: z.string().uuid().optional().or(z.literal('')),
  eventType: contentEventTypeEnum,
  metadata: z.record(z.any()).optional(),
});

// ------------------------------------------------------------
// LAYER 1 IDENTITY & PASSWORD SECURITY SCHEMAS
// ------------------------------------------------------------

export const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const requestPasswordResetSchema = z.object({
  email: z.string().email('Valid email address is required'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: strongPasswordSchema,
});

