/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ScreenId, BusinessProfile, InvoiceData, TemplateItem, KhataCustomer, StoreProduct, ExpenseItem } from './types';
import { INITIAL_BUSINESS, INITIAL_INVOICE, INITIAL_KHATA_CUSTOMERS, INITIAL_STORE_PRODUCTS, INITIAL_EXPENSES } from './data/mockData';
import { migrateFromLocalStorage, dbBulkPut, STORES, clearAllStores } from './utils/db';
import { authApi } from './services/authApi';
import { firebaseAuthService } from './services/firebaseAuthService';
import { businessApi, customerKhataApi, productApi } from './services/api';
import { subscriptionApi } from './services/subscriptionApi';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { ProFeatureGuard } from './components/ProFeatureGuard';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PlayStoreConsoleModal } from './components/PlayStoreConsoleModal';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { SplashScreen } from './components/SplashScreen';

// Screens
import { InvoiceScreen } from './screens/InvoiceScreen';
import { ProModal } from './screens/ProModal';
import { TemplatesScreen } from './screens/TemplatesScreen';
import { StandeeScreen } from './screens/StandeeScreen';
import { CopilotScreen } from './screens/CopilotScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { AuthScreen, AuthSuccessPayload } from './screens/AuthScreen';
import { PosterEditorScreen } from './screens/PosterEditorScreen';
import { KhataScreen } from './screens/KhataScreen';
import { DigitalStoreScreen } from './screens/DigitalStoreScreen';
import { PublicStoreView } from './components/PublicStoreView';
import { PublicCardView } from './components/PublicCardView';
import { ReferralScreen } from './screens/ReferralScreen';
import { WalletScreen } from './screens/WalletScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { AdminApp } from './admin/AdminApp';

export function AppContent({ onOpenAdmin }: { onOpenAdmin?: () => void } = {}) {
  // Start directly on Auth / Login screen if not authenticated
  const [currentScreen, setCurrentScreen] = useState<ScreenId>(() => {
    return authApi.isAuthenticated() ? 'templates' : 'auth';
  });
  
  // State with LocalStorage & IndexedDB Persistence
  const [business, setBusiness] = useState<BusinessProfile>(() => {
    try {
      const saved = localStorage.getItem('brandx_business_profile') || localStorage.getItem('brandkit_business_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.logoUrl || parsed.logoUrl.includes('lh3.googleusercontent.com/aida/')) {
          parsed.logoUrl = '/brandx-logo.png';
        }
        return parsed;
      }
    } catch {}
    return INITIAL_BUSINESS;
  });

  const [invoice, setInvoice] = useState<InvoiceData>(() => {
    try {
      const saved = localStorage.getItem('brandx_current_invoice') || localStorage.getItem('brandkit_current_invoice');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_INVOICE;
  });

  const [customers, setCustomers] = useState<KhataCustomer[]>(() => {
    try {
      const saved = localStorage.getItem('brandx_khata_customers') || localStorage.getItem('brandkit_khata_customers');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_KHATA_CUSTOMERS;
  });

  const [products, setProducts] = useState<StoreProduct[]>(() => {
    try {
      const saved = localStorage.getItem('brandx_store_products') || localStorage.getItem('brandkit_store_products');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_STORE_PRODUCTS;
  });

  const [expenses, setExpenses] = useState<ExpenseItem[]>(() => {
    try {
      const saved = localStorage.getItem('brandx_expenses');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_EXPENSES;
  });

  // Track Pro subscription state (persisted in localStorage)
  const [isProUser, setIsProUser] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('brandx_pro_status') || localStorage.getItem('brandkit_pro_status');
      if (saved) {
        const parsed = JSON.parse(saved);
        return !!parsed.isPro;
      }
    } catch {}
    return false;
  });

  // Auto-migrate local data to IndexedDB & restore BrandX session via Firebase/JWT token exchange
  useEffect(() => {
    migrateFromLocalStorage();

    const loadAuthenticatedData = async () => {
      // Ensure BrandX JWT is present & unexpired, or exchange from Firebase user session
      const token = await authApi.ensureValidToken();
      if (!token) return;

      // If user was on auth screen but has valid session, transition to home/templates
      setCurrentScreen((prev) => (prev === 'auth' || prev === 'login' ? 'templates' : prev));

      // Fetch authenticated tenant data from PostgreSQL
      try {
        const res = await businessApi.listBusinesses();
        if (res.success && res.data && res.data.length > 0) {
          const biz = res.data[0];
          businessApi.syncLocalProfile(biz);
          setBusiness((prev) => ({
            ...prev,
            id: biz.id,
            name: biz.name || biz.businessName || prev.name,
            ownerName: biz.ownerName || prev.ownerName,
            category: biz.category || biz.businessType || prev.category,
            phone: biz.mobile || biz.phone || prev.phone,
            email: biz.email || prev.email,
            address: biz.address || prev.address,
            city: biz.city || prev.city,
            state: biz.state || prev.state,
            pincode: biz.pincode || prev.pincode,
            gstin: biz.gstin || prev.gstin,
            pan: biz.pan || prev.pan,
            upiId: biz.upiId || prev.upiId,
            logoUrl: biz.logoUrl || biz.logo || prev.logoUrl,
          }));
        }
      } catch {}

      try {
        const res = await customerKhataApi.listCustomers();
        if (res.success && res.data && Array.isArray(res.data)) {
          const mapped = res.data.map((c) => customerKhataApi.backendToFrontendCustomer(c));
          setCustomers(mapped);
        }
      } catch {}

      try {
        const res = await productApi.listProducts({ limit: 100 });
        if (res.success && res.data && Array.isArray(res.data)) {
          const mapped = res.data.map((p) => productApi.backendToStoreProduct(p));
          setProducts(mapped);
        }
      } catch {}

      try {
        const sub = await subscriptionApi.getCurrentSubscription();
        setIsProUser(sub.isPro);
        if (sub.isPro) {
          localStorage.setItem(
            'brandx_pro_status',
            JSON.stringify({
              isPro: true,
              plan: sub.plan?.code?.includes('year') ? 'yearly' : 'monthly',
              expiresAt: sub.expiryDate,
              autoPayEnabled: true,
            })
          );
        } else {
          localStorage.removeItem('brandx_pro_status');
        }
      } catch {}
    };

    loadAuthenticatedData();
  }, []);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {}
    try {
      await firebaseAuthService.signOut();
    } catch {}
    try {
      await clearAllStores();
    } catch {}
    authApi.clearSession();
    setBusiness(INITIAL_BUSINESS);
    setInvoice(INITIAL_INVOICE);
    setCustomers([]);
    setProducts([]);
    setExpenses([]);
    setIsProUser(false);
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('brandx_') || key.startsWith('brandkit_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      window.dispatchEvent(new CustomEvent('brandx:subscription-updated', { detail: { isPro: false } }));
    } catch {}
    setCurrentScreen('auth');
  };

  // Sync to LocalStorage & IndexedDB
  useEffect(() => {
    try {
      localStorage.setItem('brandx_business_profile', JSON.stringify(business));
    } catch {}
  }, [business]);

  useEffect(() => {
    try {
      localStorage.setItem('brandx_current_invoice', JSON.stringify(invoice));
    } catch {}
  }, [invoice]);

  useEffect(() => {
    try {
      localStorage.setItem('brandx_khata_customers', JSON.stringify(customers));
      dbBulkPut(STORES.CUSTOMERS, customers);
    } catch {}
  }, [customers]);

  useEffect(() => {
    try {
      localStorage.setItem('brandx_store_products', JSON.stringify(products));
      dbBulkPut(STORES.PRODUCTS, products);
    } catch {}
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem('brandx_expenses', JSON.stringify(expenses));
      dbBulkPut(STORES.EXPENSES, expenses);
    } catch {}
  }, [expenses]);

  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [isPlayStoreModalOpen, setIsPlayStoreModalOpen] = useState(false);
  const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
  const [editorHeadline, setEditorHeadline] = useState<string>('');
  const [editorBody, setEditorBody] = useState<string>('');

  // Handle successful Google or Mobile OTP Authentication
  const handleAuthSuccess = (payload: AuthSuccessPayload) => {
    setBusiness((prev) => ({
      ...prev,
      ownerName: payload.ownerName || prev.ownerName,
      name: payload.businessName || prev.name,
      phone: payload.phone || prev.phone,
      email: payload.email || prev.email,
      authMethod: payload.authMethod || prev.authMethod,
      category: payload.category || prev.category,
      logoUrl: payload.avatarUrl || prev.logoUrl,
    }));

    // Step 2: Open profile setup page so business can verify shop & bank details
    setCurrentScreen('onboarding');

    // Step 3: Refresh Pro status from server
    subscriptionApi.getCurrentSubscription()
      .then((sub) => {
        setIsProUser(sub.isPro);
        if (sub.isPro) {
          localStorage.setItem('brandx_pro_status', JSON.stringify({
            isPro: true,
            plan: sub.plan?.code?.includes('year') ? 'yearly' : 'monthly',
            expiresAt: sub.expiryDate,
            autoPayEnabled: true,
          }));
        } else {
          localStorage.removeItem('brandx_pro_status');
        }
      })
      .catch(() => {});

    // Step 4: Fetch fresh business, khata, and products from backend
    businessApi.listBusinesses().then((res) => {
      if (res.success && res.data && res.data.length > 0) {
        const biz = res.data[0];
        businessApi.syncLocalProfile(biz);
        setBusiness((prev) => ({
          ...prev,
          id: biz.id,
          name: biz.name || biz.businessName || prev.name,
          ownerName: biz.ownerName || prev.ownerName,
          category: biz.category || biz.businessType || prev.category,
          phone: biz.mobile || biz.phone || prev.phone,
          email: biz.email || prev.email,
          address: biz.address || prev.address,
          city: biz.city || prev.city,
          state: biz.state || prev.state,
          pincode: biz.pincode || prev.pincode,
          gstin: biz.gstin || prev.gstin,
          pan: biz.pan || prev.pan,
          upiId: biz.upiId || prev.upiId,
          logoUrl: biz.logoUrl || biz.logo || prev.logoUrl,
        }));
      }
    }).catch(() => {});

    customerKhataApi.listCustomers().then((res) => {
      if (res.success && res.data && Array.isArray(res.data)) {
        const mapped = res.data.map((c) => customerKhataApi.backendToFrontendCustomer(c));
        setCustomers(mapped);
      } else {
        setCustomers([]);
      }
    }).catch(() => { setCustomers([]); });

    productApi.listProducts({ limit: 100 }).then((res) => {
      if (res.success && res.data && Array.isArray(res.data)) {
        const mapped = res.data.map((p) => productApi.backendToStoreProduct(p));
        setProducts(mapped);
      } else {
        setProducts([]);
      }
    }).catch(() => { setProducts([]); });
  };

  // Handle template selection from Template Library
  const handleSelectTemplate = (template: TemplateItem) => {
    setSelectedTemplate(template);
    setEditorHeadline(template.headlineDefault || template.title);
    setEditorBody(template.subheadlineDefault || 'Special festive offer for our valued customers. Book your session today!');
    setCurrentScreen('editor');
  };

  // Handle opening poster editor with specific text from AI Copilot
  const handleOpenPosterEditorFromCopilot = (headline?: string, body?: string) => {
    if (headline) setEditorHeadline(headline);
    if (body) setEditorBody(body);
    setCurrentScreen('editor');
  };

  // Calculate total revenue from billing & khata collections for P&L
  const totalSalesRevenue = (invoice?.items || []).reduce((acc, it) => acc + (it.qty * it.rate), 0);
  const totalJamaRevenue = customers.reduce((acc, c) => {
    const jama = c.transactions
      .filter((t) => t.type === 'receive')
      .reduce((sum, t) => sum + t.amount, 0);
    return acc + jama;
  }, 0);
  const combinedRevenue = totalSalesRevenue + totalJamaRevenue;

  // Handle Voice-to-Bill generation from AI Copilot
  const handleOpenInvoiceWithData = (
    customerName: string,
    customerPhone: string,
    items: any[],
    discountPercent: number = 0
  ) => {
    setInvoice((prev) => ({
      ...prev,
      customerName: customerName || prev.customerName,
      customerPhone: customerPhone || prev.customerPhone,
      items: items.length > 0 ? items : prev.items,
      discountPercent: discountPercent !== undefined ? discountPercent : prev.discountPercent,
      invoiceNumber: `INV-${Date.now().toString().slice(-4)}`,
      billDate: new Date().toISOString().split('T')[0],
    }));
    setCurrentScreen('invoice');
  };

  // Full-screen modes that hide standard header/footer
  const isFullScreenMode =
    currentScreen === 'auth' ||
    currentScreen === 'login' ||
    currentScreen === 'onboarding' ||
    currentScreen === 'editor';

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Brand-consistent In-App Splash Screen */}
      <SplashScreen minDurationMs={1500} />

      {/* Play Store & PWA In-App Install Smart Banner */}
      <PWAInstallBanner onOpenPlayStoreModal={() => setIsPlayStoreModalOpen(true)} />

      {/* Offline Status Floating Indicator */}
      <OfflineIndicator />

      {/* Top Persistent App Header (on non-fullscreen views) */}
      {!isFullScreenMode && (
        <Header
          currentScreen={currentScreen}
          onNavigate={(screen) => setCurrentScreen(screen)}
          onOpenPro={() => setIsProModalOpen(true)}
          onOpenAdmin={onOpenAdmin}
          onOpenPlayStore={() => setIsPlayStoreModalOpen(true)}
          onLogout={handleLogout}
          business={business}
          isPro={isProUser}
        />
      )}

      {/* Active Screen Rendering */}
      <main className="flex-1 flex flex-col pt-16">
        {/* 1. Auth Screen (Initial Landing Screen) */}
        {(currentScreen === 'auth' || currentScreen === 'login') && (
          <AuthScreen
            onAuthSuccess={handleAuthSuccess}
            currentBusiness={business}
            initialMode="signin"
            onOpenAdmin={onOpenAdmin}
          />
        )}

        {/* 2. Onboarding / Business Profile KYC (Step 2 in Flow) */}
        {currentScreen === 'onboarding' && (
          <OnboardingScreen
            business={business}
            onSaveBusiness={setBusiness}
            onContinue={() => setCurrentScreen('templates')}
            onOpenPrivacyPolicy={() => setIsPrivacyPolicyOpen(true)}
            onOpenPlayStore={() => setIsPlayStoreModalOpen(true)}
          />
        )}

        {/* 3. Home: Poster & Banner Templates Studio (Step 3 in Flow) */}
        {currentScreen === 'templates' && (
          <TemplatesScreen
            business={business}
            customers={customers}
            invoice={invoice}
            products={products}
            onNavigate={(screen) => setCurrentScreen(screen)}
            onSelectTemplate={handleSelectTemplate}
            onOpenPro={() => setIsProModalOpen(true)}
          />
        )}

        {/* 4. Tax Invoice & Retail Bill Generator (PRO Gated) */}
        {currentScreen === 'invoice' && (
          <ProFeatureGuard
            featureName="Billing & GST Invoicing"
            featureDescription="Generate professional GST invoices, thermal POS receipts, and invoice PDFs with your shop branding."
            onOpenPro={() => setIsProModalOpen(true)}
          >
            <InvoiceScreen
              business={business}
              invoice={invoice}
              products={products}
              onUpdateInvoice={setInvoice}
              onOpenPro={() => setIsProModalOpen(true)}
              onNavigateToBusiness={() => setCurrentScreen('onboarding')}
              isPro={isProUser}
            />
          </ProFeatureGuard>
        )}

        {/* 5. Customer Khata & Udhar-Bahi Ledger & Dukan Kharcha */}
        {currentScreen === 'khata' && (
          <KhataScreen
            business={business}
            customers={customers}
            onUpdateCustomers={setCustomers}
            onOpenPro={() => setIsProModalOpen(true)}
            expenses={expenses}
            onUpdateExpenses={setExpenses}
            totalRevenue={combinedRevenue}
            onUpdateBusiness={setBusiness}
          />
        )}

        {/* 6. Digital Dukaan & NFC Smart Visiting Card (PRO Gated) */}
        {currentScreen === 'dukaan' && (
          <ProFeatureGuard
            featureName="Digital Dukaan & Smart Visiting Card"
            featureDescription="Showcase your product catalog online, generate NFC smart cards, and receive customer orders on WhatsApp."
            onOpenPro={() => setIsProModalOpen(true)}
          >
            <DigitalStoreScreen
              business={business}
              products={products}
              onUpdateProducts={setProducts}
              onOpenPro={() => setIsProModalOpen(true)}
            />
          </ProFeatureGuard>
        )}

        {/* 7. UPI QR Standee Maker (PRO Gated) */}
        {currentScreen === 'standee' && (
          <ProFeatureGuard
            featureName="UPI QR & Payment Standee Studio"
            featureDescription="Create custom high-resolution payment QR standees with your shop branding for direct UPI payments."
            onOpenPro={() => setIsProModalOpen(true)}
          >
            <StandeeScreen
              business={business}
              onOpenPro={() => setIsProModalOpen(true)}
            />
          </ProFeatureGuard>
        )}

        {/* 8. Biz AI Marketing Copilot */}
        {currentScreen === 'copilot' && (
          <CopilotScreen
            business={business}
            onOpenPosterEditor={handleOpenPosterEditorFromCopilot}
            onOpenInvoiceWithData={handleOpenInvoiceWithData}
          />
        )}

        {/* 9. Poster Editor Canvas */}
        {currentScreen === 'editor' && (
          <PosterEditorScreen
            business={business}
            initialTemplate={selectedTemplate}
            initialHeadline={editorHeadline}
            initialBody={editorBody}
            onBack={() => setCurrentScreen('templates')}
            onOpenPro={() => setIsProModalOpen(true)}
          />
        )}

        {/* 10. Refer & Earn Screen */}
        {currentScreen === 'referrals' && (
          <ReferralScreen
            onBack={() => setCurrentScreen('templates')}
            onOpenWallet={() => setCurrentScreen('wallet')}
          />
        )}

        {/* 11. Coin Wallet & Cash Payout Screen */}
        {currentScreen === 'wallet' && (
          <WalletScreen
            onBack={() => setCurrentScreen('templates')}
            onOpenReferrals={() => setCurrentScreen('referrals')}
          />
        )}

        {/* 12. Pro Screen Modal View */}
        {currentScreen === 'pro-modal' && (
          <div className="min-h-screen flex items-center justify-center p-4">
            <ProModal
              isOpen={true}
              onClose={() => setCurrentScreen('templates')}
              onSuccess={() => {
                setIsProUser(true);
                setCurrentScreen('templates');
              }}
            />
          </div>
        )}

        {/* 13. Settings, Security, Privacy & Legal Center */}
        {currentScreen === 'settings' && (
          <SettingsScreen
            business={business}
            onUpdateBusiness={setBusiness}
            isPro={isProUser}
            onOpenPro={() => setIsProModalOpen(true)}
            onNavigate={(screen) => setCurrentScreen(screen)}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Global Pro Modal (Accessible from any screen via header badge) */}
      {currentScreen !== 'pro-modal' && (
        <ProModal
          isOpen={isProModalOpen}
          onClose={() => setIsProModalOpen(false)}
          onSuccess={() => {
            setIsProUser(true);
            setIsProModalOpen(false);
          }}
        />
      )}

      {/* Google Play Store & TWA Console Readiness Modal */}
      <PlayStoreConsoleModal
        isOpen={isPlayStoreModalOpen}
        onClose={() => setIsPlayStoreModalOpen(false)}
        onOpenPrivacyPolicy={() => {
          setIsPlayStoreModalOpen(false);
          setIsPrivacyPolicyOpen(true);
        }}
      />

      {/* Google Play Data Safety & Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={isPrivacyPolicyOpen}
        onClose={() => setIsPrivacyPolicyOpen(false)}
      />

      {/* Bottom Navigation Bar */}
      {!isFullScreenMode && (
        <BottomNav
          currentScreen={currentScreen}
          onNavigate={(screen) => setCurrentScreen(screen)}
          onOpenPro={() => setIsProModalOpen(true)}
        />
      )}
    </div>
  );
}

export default function App() {
  const parsePublicRoute = (): { type: 'store' | 'card'; slug: string } | null => {
    if (typeof window === 'undefined') return null;
    const path = window.location.pathname;
    const hash = window.location.hash;
    const search = window.location.search;

    // Path patterns: /store/:slug or /card/:slug
    const storePathMatch = path.match(/^\/store\/([a-zA-Z0-9_-]+)/);
    if (storePathMatch) return { type: 'store', slug: storePathMatch[1] };

    const cardPathMatch = path.match(/^\/card\/([a-zA-Z0-9_-]+)/);
    if (cardPathMatch) return { type: 'card', slug: cardPathMatch[1] };

    // Hash patterns: #store/:slug or #card/:slug
    const storeHashMatch = hash.match(/^#\/?store\/([a-zA-Z0-9_-]+)/);
    if (storeHashMatch) return { type: 'store', slug: storeHashMatch[1] };

    const cardHashMatch = hash.match(/^#\/?card\/([a-zA-Z0-9_-]+)/);
    if (cardHashMatch) return { type: 'card', slug: cardHashMatch[1] };

    // Search query parameters: ?store=:slug or ?card=:slug
    const params = new URLSearchParams(search);
    const storeParam = params.get('store');
    if (storeParam) return { type: 'store', slug: storeParam };

    const cardParam = params.get('card');
    if (cardParam) return { type: 'card', slug: cardParam };

    return null;
  };

  const [publicRoute, setPublicRoute] = useState<{ type: 'store' | 'card'; slug: string } | null>(parsePublicRoute);

  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        window.location.pathname.startsWith('/admin') ||
        window.location.hash.startsWith('#admin') ||
        window.location.search.includes('mode=admin')
      );
    }
    return false;
  });

  useEffect(() => {
    const handleUrlChange = () => {
      setPublicRoute(parsePublicRoute());
      if (typeof window !== 'undefined') {
        setIsAdminRoute(
          window.location.pathname.startsWith('/admin') ||
          window.location.hash.startsWith('#admin') ||
          window.location.search.includes('mode=admin')
        );
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const handleOpenAdmin = () => {
    try {
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', '/admin');
      }
    } catch {}
    setIsAdminRoute(true);
  };

  // Public Routes (No authentication required)
  if (publicRoute) {
    if (publicRoute.type === 'store') {
      return <PublicStoreView slug={publicRoute.slug} />;
    }
    if (publicRoute.type === 'card') {
      return <PublicCardView slug={publicRoute.slug} />;
    }
  }

  // Admin Portal
  if (isAdminRoute) {
    return <AdminApp />;
  }

  // Authenticated Main BrandX Super App
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppContent onOpenAdmin={handleOpenAdmin} />
      </LanguageProvider>
    </ThemeProvider>
  );
}
