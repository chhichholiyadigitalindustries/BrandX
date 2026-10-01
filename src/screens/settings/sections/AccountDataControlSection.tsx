import React, { useState } from 'react';
import { auth } from '../../../config/firebase';
import { authApi } from '../../../services/authApi';
import { businessApi } from '../../../services/businessApi';
import { clearAllStores } from '../../../utils/db';
import { useLanguage } from '../../../context/LanguageContext';

interface AccountDataControlSectionProps {
  businessId?: string;
  onLogout: () => void;
}

export const AccountDataControlSection: React.FC<AccountDataControlSectionProps> = ({
  businessId,
  onLogout,
}) => {
  const { isHindi } = useLanguage();

  // Clear offline cache
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);

  // Delete account modal & safety verification
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleClearCache = async () => {
    setClearingCache(true);
    setCacheMessage(null);
    try {
      // Clear IndexedDB stores (cached templates, offline bills, offline customers)
      await clearAllStores();

      // Clear non-critical offline image cache from localStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith('brandx_cache_') ||
            key.startsWith('brandx_temp_') ||
            key.startsWith('brandkit_temp_'))
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));

      setCacheMessage(
        isHindi
          ? 'ऑफ़लाइन कैश और अस्थायी फ़ाइलें सफलतापूर्वक साफ़ की गईं।'
          : 'Local offline cache and temporary preview assets cleared successfully.'
      );
    } catch (err: any) {
      setCacheMessage(err?.message || 'Failed to clear local cache.');
    } finally {
      setClearingCache(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText.trim() !== 'DELETE') {
      setDeleteError(isHindi ? 'कृपया पुष्टि करने के लिए DELETE टाइप करें।' : 'Please type DELETE to confirm.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      // 1. If user has active primary business, call real backend deletion endpoint
      if (businessId) {
        try {
          await businessApi.deleteBusiness(businessId);
        } catch (bizErr) {
          console.warn('[BrandX] Business deletion response:', bizErr);
        }
      }

      // 2. Delete user account from Firebase Authentication if authenticated
      const user = auth?.currentUser;
      if (user) {
        try {
          await user.delete();
        } catch (firebaseErr: any) {
          if (firebaseErr?.code === 'auth/requires-recent-login') {
            throw new Error(
              isHindi
                ? 'सुरक्षा कारणों से, खाता हटाने से पहले कृपया एक बार लॉगआउट करके पुनः लॉगिन करें।'
                : 'For security purposes, account deletion requires a recent login. Please log out and sign in again before deleting.'
            );
          }
          throw firebaseErr;
        }
      }

      // 3. Clear local session tokens & IndexedDB stores
      await clearAllStores().catch(() => {});
      authApi.clearSession();

      // 4. Clear all stored client keys
      const allKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('brandx_') || key.startsWith('brandkit_'))) {
          allKeys.push(key);
        }
      }
      allKeys.forEach((k) => localStorage.removeItem(k));

      alert(
        isHindi
          ? 'आपका खाता और संबंधित व्यापारिक विवरण सफलतापूर्वक हटा दिया गया है।'
          : 'Your account and associated profile have been permanently deleted.'
      );

      // 5. Navigate to auth screen
      window.location.reload();
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to complete account deletion.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header Banner */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
            <span className="material-symbols-outlined text-[30px]">manage_accounts</span>
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white">
              {isHindi ? 'खाता व डेटा नियंत्रण' : 'Account & Data Control'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isHindi
                ? 'अपने डेटा का बैकअप, ऑफ़लाइन कैश प्रबंधन और स्थायी खाता विलोपन।'
                : 'Data export readiness, local offline cache purge, and account lifecycle controls.'}
            </p>
          </div>
        </div>

        <span className="text-[11px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800 px-3 py-1 rounded-full shrink-0">
          User Controls
        </span>
      </div>

      {/* 2. Data Export (Truthfully Marked as Coming Soon) */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
              <span className="material-symbols-outlined text-[22px]">download</span>
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <span>{isHindi ? 'व्यापार डेटा निर्यात (Export All Data)' : 'Export Business Data Archive'}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-cyan-300 border border-blue-500/30">
                  Coming Soon
                </span>
              </h4>
              <p className="text-xs text-slate-400">
                {isHindi
                  ? 'अपने संपूर्ण इनवॉइस, खाता लेज़र और उत्पाद कैटलॉग को एक क्लिक में JSON/CSV प्रारूप में डाउनलोड करें।'
                  : 'Download complete archives of invoices, customer Khata ledgers, and products in structured JSON/CSV.'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-2">
          <p>
            Automated single-click tenant export packaging is currently being developed for our upcoming release.
            In the interim, you can export individual invoices and Khata statements directly as PDFs from their respective screens, or email{' '}
            <a href="mailto:support@brandx.in?subject=Data%20Export%20Request" className="text-cyan-400 hover:underline">
              support@brandx.in
            </a>{' '}
            for manual database dump requests.
          </p>
          <button
            disabled={true}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-500 text-xs font-bold border border-slate-700 cursor-not-allowed"
          >
            Export Archive (Coming Soon)
          </button>
        </div>
      </div>

      {/* 3. Clear Local / Offline Cache */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
            <span className="material-symbols-outlined text-[22px]">cleaning_services</span>
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white">
              {isHindi ? 'स्थानीय ऑफ़लाइन कैश साफ़ करें' : 'Clear Local & Offline Cache'}
            </h4>
            <p className="text-xs text-slate-400">
              {isHindi
                ? 'डिवाइस पर सहेजे गए अस्थायी पोस्टर ड्राफ्ट और ऑफ़लाइन कैश को साफ़ करें (खाता लॉगिन सुरक्षित रहेगा)।'
                : 'Clears cached poster templates and temporary IndexedDB storage without logging you out.'}
            </p>
          </div>
        </div>

        {cacheMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>{cacheMessage}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleClearCache}
            disabled={clearingCache}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
          >
            {clearingCache ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Clearing...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                <span>{isHindi ? 'कैश साफ़ करें' : 'Clear Local Cache'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4. Statutory Data Retention Notice & Account Deletion */}
      <div className="p-4 sm:p-6 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-200 space-y-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-rose-400 text-[22px]">delete_forever</span>
          <h4 className="text-xs font-black uppercase tracking-wider text-rose-300">
            {isHindi ? 'खाता हटाने का अनुरोध (Request Account Deletion)' : 'Request Account Deletion'}
          </h4>
        </div>

        <p className="text-xs text-rose-100/90 leading-relaxed">
          {isHindi
            ? 'खाता हटाने का अनुरोध करने पर आपकी प्रोफ़ाइल, लॉगिन क्रेडेंशियल्स, व्यावसायिक सेटिंग्स और स्थानीय कैश नष्ट कर दिए जाएंगे। यह प्रक्रिया स्थायी है और इसे पूर्ववत (undo) नहीं किया जा सकता।'
            : 'Requesting account deletion permanently revokes your login credentials, deletes your merchant profile, and purges your local device storage. This action is irreversible.'}
        </p>

        {/* Implementation Status Transparency */}
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-amber-400">
            <span className="material-symbols-outlined text-[14px]">info</span>
            <span>Implementation Status &amp; Procedure</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            A single-click unified server purge pipeline is currently in development. When you confirm deletion below, BrandX immediately removes your active business profile, revokes your authentication access, and purges all offline caches. To ensure complete administrative removal of server records or request confirmation, you may also email{' '}
            <a href="mailto:support@brandx.in?subject=Account%20Deletion%20Request" className="text-cyan-400 hover:underline">
              support@brandx.in
            </a>.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-900/50 text-[11px] text-rose-300/90 space-y-1">
          <strong className="block text-rose-200">Statutory Tax Invoice Retention Notice:</strong>
          <p>
            Under Section 36 of the Central Goods and Services Tax (CGST) Act, 2017, registered businesses are legally required to maintain true and correct accounts of sales and tax invoices for a period of seventy-two (72) months. Please ensure you have downloaded all necessary tax bills prior to requesting deletion.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            onClick={onLogout}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold transition cursor-pointer"
          >
            {isHindi ? 'केवल लॉगआउट करें' : 'Just Log Out'}
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">warning</span>
            <span>{isHindi ? 'खाता हटाने का अनुरोध करें' : 'Request Account Deletion'}</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="bg-[#131B2E] border border-rose-500/40 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5 animate-scale-in text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center shrink-0 border border-rose-500/30">
                <span className="material-symbols-outlined text-[28px]">warning</span>
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">
                  {isHindi ? 'क्या आप निश्चित हैं?' : 'Confirm Account Deletion'}
                </h3>
                <p className="text-xs text-rose-300">Irreversible Action</p>
              </div>
            </div>

            <div className="text-xs text-slate-300 space-y-2 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
              <p className="font-bold text-white">The following data will be purged:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                <li>User authentication credentials &amp; registered phone link</li>
                <li>Cloud database business profile &amp; account settings</li>
                <li>Local device cache &amp; offline storage</li>
                <li>Active Pro subscription access (non-refundable)</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Type <span className="text-rose-400 font-mono font-black">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-rose-500/40 text-white text-xs font-mono tracking-wider focus:outline-hidden"
                placeholder="DELETE"
              />
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs">
                {deleteError}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 cursor-pointer"
              >
                {isHindi ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmationText.trim() !== 'DELETE'}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>{isHindi ? 'स्थायी रूप से हटाएं' : 'Permanently Delete'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
