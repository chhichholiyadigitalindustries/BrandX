import React, { useState } from 'react';
import { ScreenId, BusinessProfile } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { resolveImageUrl } from '../../utils/imageUrl';

// Sub-sections
import { MyAccountSection } from './sections/MyAccountSection';
import { BusinessProfileSection } from './sections/BusinessProfileSection';
import { SecurityCenterSection } from './sections/SecurityCenterSection';
import { PrivacyCenterSection } from './sections/PrivacyCenterSection';
import { AiNoticeSection } from './sections/AiNoticeSection';
import { SharingNoticeSection } from './sections/SharingNoticeSection';
import { PermissionsSection } from './sections/PermissionsSection';
import { LegalCenterSection } from './sections/LegalCenterSection';
import { AccountDataControlSection } from './sections/AccountDataControlSection';
import { SubscriptionSection } from './sections/SubscriptionSection';
import { HelpSupportSection } from './sections/HelpSupportSection';
import { AboutSection } from './sections/AboutSection';

export type SettingsTabId =
  | 'account'
  | 'business'
  | 'security'
  | 'privacy'
  | 'ai-notice'
  | 'sharing-notice'
  | 'permissions'
  | 'legal'
  | 'account-data'
  | 'subscription'
  | 'help'
  | 'about';

interface SettingsScreenProps {
  business: BusinessProfile;
  onUpdateBusiness: (updated: BusinessProfile) => void;
  isPro: boolean;
  onOpenPro: () => void;
  onNavigate: (screen: ScreenId) => void;
  onLogout: () => void;
  initialTab?: SettingsTabId;
}

interface SettingsGroup {
  groupTitle: string;
  groupTitleHindi: string;
  items: {
    id: SettingsTabId;
    label: string;
    labelHindi: string;
    icon: string;
    description: string;
    badge?: string;
  }[];
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  business,
  onUpdateBusiness,
  isPro,
  onOpenPro,
  onNavigate,
  onLogout,
  initialTab = 'account',
}) => {
  const { isHindi } = useLanguage();
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);
  const [legalTargetDoc, setLegalTargetDoc] = useState<string>('terms');

  const groups: SettingsGroup[] = [
    {
      groupTitle: 'Account & Business',
      groupTitleHindi: 'खाता और व्यवसाय',
      items: [
        {
          id: 'account',
          label: 'My Account',
          labelHindi: 'मेरा खाता',
          icon: 'account_circle',
          description: 'Profile name, mobile, email, verification & credentials',
        },
        {
          id: 'business',
          label: 'Business Profile',
          labelHindi: 'व्यापार प्रोफ़ाइल',
          icon: 'storefront',
          description: 'Shop identity, GSTIN, PAN, UPI ID & invoice details',
        },
        {
          id: 'subscription',
          label: 'Subscription & Plans',
          labelHindi: 'सब्सक्रिप्शन व प्लान',
          icon: 'workspace_premium',
          description: 'Free vs Pro, pricing ₹349/mo & billing history',
          badge: isPro ? 'PRO VIP' : undefined,
        },
      ],
    },
    {
      groupTitle: 'Trust & Privacy',
      groupTitleHindi: 'सुरक्षा और गोपनीयता',
      items: [
        {
          id: 'security',
          label: 'Security Center',
          labelHindi: 'सुरक्षा केंद्र',
          icon: 'shield',
          description: 'Truthful technical controls, session info & safety tips',
        },
        {
          id: 'privacy',
          label: 'Privacy Center',
          labelHindi: 'प्राइवेसी केंद्र',
          icon: 'privacy_tip',
          description: 'What data is processed, why it is used & DPDPA rights',
        },
        {
          id: 'ai-notice',
          label: 'AI Usage & Data Notice',
          labelHindi: 'AI उपयोग व डेटा नोटिस',
          icon: 'auto_awesome',
          description: 'Prompt safety, AI accuracy caveats & data processing rules',
        },
        {
          id: 'sharing-notice',
          label: 'WhatsApp / Sharing Notice',
          labelHindi: 'व्हाट्सएप शेयरिंग नोटिस',
          icon: 'share',
          description: 'User-controlled sharing & recipient verification guidelines',
        },
        {
          id: 'permissions',
          label: 'Data & Permissions',
          labelHindi: 'ऐप अनुमतियाँ',
          icon: 'tune',
          description: 'Camera, mic, notifications, files & how to change them',
        },
      ],
    },
    {
      groupTitle: 'Compliance & Control',
      groupTitleHindi: 'कानूनी और डेटा नियंत्रण',
      items: [
        {
          id: 'legal',
          label: 'Legal Center',
          labelHindi: 'कानूनी केंद्र',
          icon: 'gavel',
          description: 'Terms, Privacy, Acceptable Use, AI, Billing & IP notices',
        },
        {
          id: 'account-data',
          label: 'Account & Data Control',
          labelHindi: 'डेटा नियंत्रण व विलोपन',
          icon: 'manage_accounts',
          description: 'Export archive readiness, offline cache clear & account deletion',
        },
      ],
    },
    {
      groupTitle: 'Assistance & Info',
      groupTitleHindi: 'सहायता और जानकारी',
      items: [
        {
          id: 'help',
          label: 'Help & Support',
          labelHindi: 'सहायता व संपर्क',
          icon: 'support_agent',
          description: 'FAQs, email help desk, grievance officer & bug reporter',
        },
        {
          id: 'about',
          label: 'About BrandX',
          labelHindi: 'BrandX के बारे में',
          icon: 'info',
          description: 'App version v1.0.0, operating entity & legal policies',
        },
      ],
    },
  ];

  const handleNavigateToLegalDoc = (docId: string) => {
    setLegalTargetDoc(docId);
    setActiveTab('legal');
  };

  return (
    <div className="flex-1 bg-[#0B0F19] text-white min-h-[calc(100vh-4rem)] pb-24">
      {/* Top Breadcrumb Header */}
      <div className="border-b border-slate-800 bg-[#0F172A]/80 backdrop-blur-md px-4 py-3 sticky top-16 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('templates')}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition flex items-center gap-1 text-xs font-bold cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>{isHindi ? 'होम' : 'Home'}</span>
            </button>
            <span className="text-slate-600 text-xs">/</span>
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-blue-400">settings</span>
              <span>{isHindi ? 'सेटिंग्स, प्राइवेसी व लीगल' : 'Settings & Privacy'}</span>
            </span>
          </div>

          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            BrandX MSME Suite • v1.0.0
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Navigation Sidebar (Desktop) / Horizontal selector (Mobile) */}
          <aside className="lg:col-span-4 space-y-6">
            {/* Quick Profile Summary Card */}
            <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex items-center gap-3.5">
              <img
                src={resolveImageUrl(business.logoUrl)}
                alt={business.name}
                className="w-12 h-12 rounded-2xl object-cover ring-2 ring-blue-500/30 bg-slate-950 shrink-0"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/brandx-logo.png';
                }}
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-black text-white truncate">
                  {business.name || 'My Business'}
                </h3>
                <p className="text-xs text-slate-400 truncate">
                  {business.ownerName || 'Merchant'}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] text-emerald-400 font-semibold">Active Session</span>
                </div>
              </div>
            </div>

            {/* Navigation Groups */}
            <div className="p-2 sm:p-3 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-5">
              {groups.map((grp, gIdx) => (
                <div key={gIdx} className="space-y-1.5">
                  <h4 className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    {isHindi ? grp.groupTitleHindi : grp.groupTitle}
                  </h4>

                  <div className="space-y-1">
                    {grp.items.map((item) => {
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id);
                            // Scroll to content on mobile
                            if (window.innerWidth < 1024) {
                              window.scrollTo({ top: 180, behavior: 'smooth' });
                            }
                          }}
                          className={`w-full px-3 py-2.5 rounded-2xl text-left flex items-center justify-between gap-3 transition cursor-pointer group ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`material-symbols-outlined text-[20px] shrink-0 ${
                                isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                              }`}
                            >
                              {item.icon}
                            </span>
                            <div className="truncate">
                              <span className="text-xs font-bold block leading-tight">
                                {isHindi ? item.labelHindi : item.label}
                              </span>
                              <span
                                className={`text-[10px] truncate block ${
                                  isActive ? 'text-blue-100' : 'text-slate-500'
                                }`}
                              >
                                {item.description}
                              </span>
                            </div>
                          </div>

                          {item.badge && (
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase shrink-0 ${
                                isActive
                                  ? 'bg-amber-400 text-amber-950'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Logout Button in sidebar */}
              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={onLogout}
                  className="w-full px-3 py-2 rounded-2xl text-left flex items-center gap-2.5 text-rose-400 hover:bg-rose-950/40 text-xs font-bold transition cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  <span>{isHindi ? 'खाता लॉगआउट करें' : 'Log Out Account'}</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Right Content Area */}
          <main className="lg:col-span-8 min-w-0">
            {/* 1. My Account */}
            {activeTab === 'account' && (
              <MyAccountSection
                business={business}
                onUpdateBusiness={onUpdateBusiness}
                onDeleteAccountRequest={() => setActiveTab('account-data')}
                onLogout={onLogout}
              />
            )}

            {/* 2. Business Profile */}
            {activeTab === 'business' && (
              <BusinessProfileSection
                business={business}
                onUpdateBusiness={onUpdateBusiness}
              />
            )}

            {/* 3. Security Center */}
            {activeTab === 'security' && (
              <SecurityCenterSection
                onOpenChangePassword={() => setActiveTab('account')}
                onLogout={onLogout}
              />
            )}

            {/* 4. Privacy Center */}
            {activeTab === 'privacy' && <PrivacyCenterSection />}

            {/* 5. AI & Gemini Data Notice */}
            {activeTab === 'ai-notice' && <AiNoticeSection />}

            {/* 6. WhatsApp / Sharing Notice */}
            {activeTab === 'sharing-notice' && <SharingNoticeSection />}

            {/* 7. Data & Permissions */}
            {activeTab === 'permissions' && <PermissionsSection />}

            {/* 8. Legal Center */}
            {activeTab === 'legal' && (
              <LegalCenterSection initialDocId={legalTargetDoc} />
            )}

            {/* 9. Account & Data Control */}
            {activeTab === 'account-data' && (
              <AccountDataControlSection
                businessId={business.id}
                onLogout={onLogout}
              />
            )}

            {/* 10. Subscription */}
            {activeTab === 'subscription' && (
              <SubscriptionSection
                isPro={isPro}
                onOpenPro={onOpenPro}
                onNavigateToLegal={handleNavigateToLegalDoc}
              />
            )}

            {/* 11. Help & Support */}
            {activeTab === 'help' && (
              <HelpSupportSection onNavigateToLegal={handleNavigateToLegalDoc} />
            )}

            {/* 12. About */}
            {activeTab === 'about' && (
              <AboutSection onNavigateToLegal={handleNavigateToLegalDoc} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
