import { PrismaClient, PaymentGateway, PaymentMethod, PaymentStatus, SubscriptionStatus, ContentTier } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting BrandX database seeding...');

  // 1. Seed Subscription Plans
  console.log('📦 Seeding Subscription Plans...');
  const plansData = [
    {
      name: 'Free Forever',
      code: 'free',
      price: 0,
      originalPrice: 0,
      currency: 'INR',
      billingCycle: 'free',
      billingInterval: 'free',
      durationDays: 3650,
      tagline: 'Ideal for new shopkeepers starting digital journey',
      isPopular: false,
      features: [
        '5 GST Invoices / month',
        'Daily Morning Suvichar poster',
        'Basic Khata ledger (up to 20 customers)',
        'Standard UPI QR standee',
      ],
      limits: {
        invoices: 5,
        posters: 10,
        aiCredits: 10,
        digitalDukaan: false,
        removeWatermark: false,
        customBranding: false,
        prioritySupport: false,
        nfcSmartCard: false,
      },
      status: 'active',
      isActive: true,
    },
    {
      name: 'Pro Monthly',
      code: 'pro_monthly',
      price: 349,
      originalPrice: 499,
      currency: 'INR',
      billingCycle: 'monthly',
      billingInterval: 'monthly',
      durationDays: 30,
      tagline: 'Best for growing vyaparis & retail stores',
      isPopular: true,
      features: [
        'Unlimited GST Invoices & Estimates',
        '365 Days Festival & Daily Status Marketing',
        'AI Copilot & Voice-to-Bill assistant',
        'Digital Dukaan online catalog',
        'Remove BrandX watermark',
      ],
      limits: {
        invoices: 'unlimited',
        posters: 'unlimited',
        aiCredits: 500,
        digitalDukaan: true,
        removeWatermark: true,
        customBranding: true,
        prioritySupport: true,
        nfcSmartCard: false,
      },
      status: 'active',
      isActive: true,
    },
    {
      name: 'Pro Annual',
      code: 'pro_yearly',
      price: 2999,
      originalPrice: 4188,
      currency: 'INR',
      billingCycle: 'yearly',
      billingInterval: 'yearly',
      durationDays: 365,
      tagline: 'Maximum savings — Save ₹1,189 annually',
      isPopular: false,
      features: [
        'All Pro Monthly features for 365 days',
        'Free NFC Digital Smart Card setup',
        'Priority WhatsApp & Call support',
        'Export Excel reports & CA audit summary',
      ],
      limits: {
        invoices: 'unlimited',
        posters: 'unlimited',
        aiCredits: 2000,
        digitalDukaan: true,
        removeWatermark: true,
        customBranding: true,
        prioritySupport: true,
        nfcSmartCard: true,
      },
      status: 'active',
      isActive: true,
    },
  ];

  for (const p of plansData) {
    await prisma.subscriptionPlan.upsert({
      where: { code: p.code },
      update: p,
      create: p,
    });
  }

  // Deactivate non-canonical plans
  const canonicalCodes = plansData.map((p) => p.code);
  await prisma.subscriptionPlan.updateMany({
    where: {
      code: { notIn: canonicalCodes },
      isActive: true,
    },
    data: {
      isActive: false,
      status: 'inactive',
    },
  });

  const isProduction = process.env.NODE_ENV === 'production';

  // Seed Referral Config defaults if missing
  console.log('⚙️ Checking Referral & Wallet configuration...');
  const existingReferralConfig = await prisma.referralConfig.findFirst();
  if (!existingReferralConfig) {
    await prisma.referralConfig.create({
      data: {
        minRewardCoins: 100,
        maxRewardCoins: 500,
        rewardStep: 50,
        rewardMode: 'RANDOM',
        fixedRewardCoins: 200,
        coinsPerInr: 100,
        minWithdrawalCoins: 10000,
        eligibilityCondition: 'ONBOARDING_COMPLETED',
      },
    });
    console.log('✅ Default ReferralConfig initialized.');
  }

  if (isProduction) {
    console.log('🔒 Production environment detected (NODE_ENV=production).');
    console.log('🛑 SKIPPING ALL DEMO DATA: Zero demo users, zero demo businesses, zero demo products, zero fake subscriptions.');
    console.log('✅ Production master lookup data seeding complete.');
    return;
  }

  // 2. Seed Super Admin User (DEVELOPMENT ONLY)
  console.log('👤 [DEV ONLY] Seeding Super Admin User...');
  const adminPasswordHash = await bcrypt.hash('Admin@BrandX2026', 10);
  const superAdmin = await prisma.adminUser.upsert({
    where: { email: 'admin@brandx.in' },
    update: { passwordHash: adminPasswordHash },
    create: {
      name: 'Abhishek Sharma',
      email: 'admin@brandx.in',
      phone: '9820123456',
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    },
  });

  // 3. Seed Demo Vyapari User & Business
  console.log('🏪 Seeding Demo Vyaparis & Businesses...');
  const demoUserPasswordHash = await bcrypt.hash('Vyapari@123', 10);

  const demoUser = await prisma.user.upsert({
    where: { mobile: '9820123456' },
    update: {
      isPro: true,
      email: 'rahul.sharma@gmail.com',
    },
    create: {
      name: 'Rahul Sharma',
      mobile: '9820123456',
      email: 'rahul.sharma@gmail.com',
      passwordHash: demoUserPasswordHash,
      language: 'hi',
      isPro: true,
      profileImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    },
  });

  const demoBusiness = await prisma.business.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      ownerId: demoUser.id,
      name: 'Sharma Studio & Cafe',
      ownerName: 'Rahul Sharma',
      category: 'Photographer & Cafe',
      businessType: 'Retail & Services',
      mobile: '9820123456',
      email: 'rahul.sharma@gmail.com',
      address: 'Shop 14, Galaxy Arcade, Bodakdev',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380015',
      gstin: '24AABCS1429B1Z8',
      pan: 'AABCS1429B',
      tagline: 'Best Photography & Specialty Brews in Ahmedabad 📸☕',
      upiId: 'sharmastudio@okaxis',
      upiLinked: true,
      bankName: 'HDFC Bank',
      accountNumber: '50200012345678',
      ifscCode: 'HDFC0001234',
      accountHolderName: 'Rahul Sharma',
      invoicePrefix: 'INV',
      nextInvoiceNumber: 90,
      isVerified: true,
      settings: {
        create: {
          autoShareWhatsapp: true,
          showGstOnBill: true,
          defaultGstRate: 18.0,
        },
      },
    },
  });

  // 4. Seed Products
  console.log('🛍️ Seeding Products...');
  const products = [
    {
      name: 'Pre-Wedding Studio Shoot & Album',
      sku: 'PHOTO-01',
      hsnCode: 'SAC 998381',
      category: 'Photography',
      type: 'SERVICE' as const,
      sellingPrice: 15000,
      gstPercent: 18,
    },
    {
      name: 'Framed Canvas Print 16x20',
      sku: 'PRINT-1620',
      hsnCode: 'HSN 4911',
      category: 'Prints',
      type: 'GOODS' as const,
      sellingPrice: 1500,
      gstPercent: 12,
      stockQty: 25,
    },
    {
      name: 'Artisan Cappuccino / Latte',
      sku: 'CAFE-01',
      hsnCode: 'SAC 996331',
      category: 'Cafe',
      type: 'GOODS' as const,
      sellingPrice: 180,
      gstPercent: 5,
      stockQty: 100,
    },
  ];

  for (const pr of products) {
    await prisma.product.create({
      data: {
        businessId: demoBusiness.id,
        name: pr.name,
        sku: pr.sku,
        hsnCode: pr.hsnCode,
        category: pr.category,
        type: pr.type,
        sellingPrice: pr.sellingPrice,
        gstPercent: pr.gstPercent,
        stockQty: pr.stockQty || 0,
      },
    });
  }

  // 5. Seed Demo Customers & Khata Transactions
  console.log('📖 Seeding Khata Customers...');
  const customer1 = await prisma.customer.create({
    data: {
      businessId: demoBusiness.id,
      name: 'Rajesh Patel',
      mobile: '9876543210',
      address: 'Satellite Road, Ahmedabad',
      gstin: '24AAPCS1234A1Z5',
      openingBalance: 0,
      currentBalance: 3200,
    },
  });

  await prisma.khataTransaction.createMany({
    data: [
      {
        businessId: demoBusiness.id,
        customerId: customer1.id,
        type: 'GIVE_UDHAR',
        amount: 4500,
        note: 'Studio portrait shoot and coffee order',
        billNumber: 'INV-2026-0042',
      },
      {
        businessId: demoBusiness.id,
        customerId: customer1.id,
        type: 'RECEIVE_JAMA',
        amount: 1300,
        note: 'Partial cash received',
        paymentMode: 'CASH',
      },
    ],
  });

  // 6. Seed Pro Monthly Active Subscription
  console.log('👑 Seeding Active Pro Subscription & Payment...');
  const proPlan = await prisma.subscriptionPlan.findUnique({ where: { code: 'pro_monthly' } });
  if (proPlan) {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 28);

    const sub = await prisma.subscription.create({
      data: {
        userId: demoUser.id,
        businessId: demoBusiness.id,
        planId: proPlan.id,
        amount: proPlan.price,
        currency: 'INR',
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date(),
        expiryDate: expiry,
        autoRenew: true,
        paymentProvider: PaymentGateway.RAZORPAY,
        providerSubscriptionId: 'pay_rzp_mock_demo_9820',
      },
    });

    await prisma.paymentTransaction.create({
      data: {
        orderId: 'order_bx_sep_2026_001',
        paymentId: 'pay_rzp_mock_demo_9820',
        userId: demoUser.id,
        businessId: demoBusiness.id,
        subscriptionId: sub.id,
        planId: proPlan.id,
        amount: proPlan.price,
        currency: 'INR',
        paymentMethod: PaymentMethod.UPI,
        maskedInstrument: 'UPI: rahul@okaxis',
        gateway: PaymentGateway.RAZORPAY,
        status: PaymentStatus.SUCCESS,
      },
    });
  }

  // 7. Seed Daily Status CMS Content
  console.log('🌅 Seeding Daily Status & Festival CMS...');
  await prisma.dailyContent.create({
    data: {
      date: new Date().toISOString().split('T')[0],
      title: 'शुभ बुधवार • श्री गणेश वंदना',
      headline: 'वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ। निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा॥',
      quoteHindi: 'भगवान श्री गणेश की कृपा से आपके व्यापार में रिद्धि-सिद्धि और धन-धान्य की वृद्धि हो।',
      category: 'suvichar',
      language: 'hi',
      imageUrl: 'https://images.unsplash.com/photo-1567591414240-e29124a9196b?w=800&auto=format&fit=crop&q=80',
      aspectRatio: '9:16',
      sharesCount: 4210,
      downloadsCount: 1980,
      tags: ['ganesha', 'morning', 'suvichar', 'wednesday'],
      authorAdminId: superAdmin.id,
    },
  });

  console.log('✅ BrandX Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
