/**
 * BRANDX — Safe Idempotent Production Subscription Plans Seeder
 *
 * Ensures canonical BrandX plans exist in PostgreSQL without deleting,
 * overwriting, or breaking any customer, subscription, or payment records.
 *
 * Pricing:
 * - Free Forever: ₹0 (3650 days)
 * - Pro Monthly:  ₹349 / month (30 days)
 * - Pro Yearly:   ₹2,999 / year (365 days)
 * Note: BrandX has ONLY Free, Pro Monthly, and Pro Yearly. No Business plan exists.
 */

import { prisma } from '../config/database.js';

export interface CanonicalPlanDefinition {
  name: string;
  code: string;
  price: number;
  originalPrice: number;
  currency: string;
  billingCycle: string;
  billingInterval: string;
  durationDays: number;
  tagline: string;
  isPopular: boolean;
  features: string[];
  limits: Record<string, any>;
  status: string;
  isActive: boolean;
}

export const CANONICAL_PRODUCTION_PLANS: CanonicalPlanDefinition[] = [
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
    isActive: true,
    status: 'active',
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
    isActive: true,
    status: 'active',
    features: [
      'Unlimited GST Invoices & Estimates',
      '365 Days Festival & Daily Status Marketing',
      'AI Copilot & Voice-to-Bill assistant',
      'Digital Dukaan online catalog',
      'Remove BrandX watermark',
      'Automated WhatsApp payment reminders',
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
    isActive: true,
    status: 'active',
    features: [
      'All Pro Monthly features for 365 days',
      'Free NFC Digital Smart Card setup',
      'Priority WhatsApp & Call support',
      'Export Excel reports & CA audit summary',
      'Save ₹1,189 every year',
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
  },
];

export async function seedProductionPlans() {
  console.log('🌱 Starting safe canonical SubscriptionPlan sync...');

  const results = [];

  for (const plan of CANONICAL_PRODUCTION_PLANS) {
    const existing = await prisma.subscriptionPlan.findUnique({
      where: { code: plan.code },
    });

    if (existing) {
      console.log(`ℹ️ Plan "${plan.code}" already exists (ID: ${existing.id}). Updating pricing & metadata...`);
      const updated = await prisma.subscriptionPlan.update({
        where: { id: existing.id },
        data: {
          name: plan.name,
          price: plan.price,
          originalPrice: plan.originalPrice,
          currency: plan.currency,
          billingCycle: plan.billingCycle,
          billingInterval: plan.billingInterval,
          durationDays: plan.durationDays,
          tagline: plan.tagline,
          isPopular: plan.isPopular,
          isActive: plan.isActive,
          features: plan.features,
          limits: plan.limits,
          status: plan.status,
        },
      });
      results.push({ action: 'UPDATED', plan: updated });
    } else {
      console.log(`➕ Creating missing canonical plan "${plan.code}" (Price: ₹${plan.price})...`);
      const created = await prisma.subscriptionPlan.create({
        data: {
          name: plan.name,
          code: plan.code,
          price: plan.price,
          originalPrice: plan.originalPrice,
          currency: plan.currency,
          billingCycle: plan.billingCycle,
          billingInterval: plan.billingInterval,
          durationDays: plan.durationDays,
          tagline: plan.tagline,
          isPopular: plan.isPopular,
          isActive: plan.isActive,
          features: plan.features,
          limits: plan.limits,
          status: plan.status,
        },
      });
      results.push({ action: 'CREATED', plan: created });
    }
  }

  // Safely deactivate any non-canonical or legacy plans (e.g. legacy business tier)
  const canonicalCodes = CANONICAL_PRODUCTION_PLANS.map((p) => p.code);
  const deactivated = await prisma.subscriptionPlan.updateMany({
    where: {
      code: { notIn: canonicalCodes },
      isActive: true,
    },
    data: {
      isActive: false,
      status: 'inactive',
    },
  });
  if (deactivated.count > 0) {
    console.log(`🔒 Deactivated ${deactivated.count} non-canonical / legacy plan(s).`);
  }

  // Ensure ReferralConfig default exists if not present
  const existingReferral = await prisma.referralConfig.findFirst();
  if (!existingReferral) {
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
    console.log('✅ Default ReferralConfig created.');
  }

  console.log(`✅ Canonical plans synchronization complete. Total: ${results.length} plans.`);
  return results;
}

// Direct execution support
if (process.argv[1]?.endsWith('seedProductionPlans.ts') || process.argv[1]?.endsWith('seedProductionPlans.js')) {
  seedProductionPlans()
    .then((plans) => {
      console.log('Plans summary:');
      plans.forEach(({ action, plan }) => {
        console.log(`  - [${action}] ${plan.code} | ${plan.name} | ₹${plan.price} | ${plan.durationDays} days | ID: ${plan.id}`);
      });
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Failed to seed production plans:', err);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
