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

  // 2. Ensure Super Admin User exists
  console.log('👤 Ensuring Super Admin User exists...');
  const adminPasswordHash = await bcrypt.hash('Admin@BrandX2026', 10);
  await prisma.adminUser.upsert({
    where: { email: 'admin@brandx.in' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@brandx.in',
      phone: '8053520932',
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      avatarUrl: '/brandx-logo.png',
    },
  });

  console.log('✅ BrandX Production Seeding completed: ZERO demo data.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

