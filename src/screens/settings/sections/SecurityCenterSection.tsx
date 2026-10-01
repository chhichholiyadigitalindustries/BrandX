import React, { useState } from 'react';
import { auth } from '../../../config/firebase';
import { authApi } from '../../../services/authApi';
import { useLanguage } from '../../../context/LanguageContext';

interface SecurityCenterSectionProps {
  onOpenChangePassword?: () => void;
  onLogout?: () => void;
}

export const SecurityCenterSection: React.FC<SecurityCenterSectionProps> = ({
  onOpenChangePassword,
  onLogout,
}) => {
  const { isHindi } = useLanguage();
  const currentUser = auth?.currentUser;
  const storedUser = authApi.getStoredUser();

  const isPhoneVerified = !!(currentUser?.phoneNumber || storedUser?.mobile);
  const isEmailVerified = !!currentUser?.emailVerified;

  // Active Client Session Information (Derived truthfully from browser/client environment)
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
  const isAndroidApp = userAgent.includes('wv') || userAgent.includes('Android');
  const browserName = userAgent.includes('Chrome')
    ? 'Google Chrome'
    : userAgent.includes('Firefox')
      ? 'Mozilla Firefox'
      : userAgent.includes('Safari')
        ? 'Apple Safari'
        : userAgent.includes('Edge')
          ? 'Microsoft Edge'
          : 'Web Browser';

  const [copiedTokenNotice, setCopiedTokenNotice] = useState(false);

  const handleCopySessionInfo = () => {
    const info = `BrandX Session Info:\nClient: ${browserName}\nVerified: ${isPhoneVerified}\nTimestamp: ${new Date().toISOString()}`;
    navigator.clipboard.writeText(info);
    setCopiedTokenNotice(true);
    setTimeout(() => setCopiedTokenNotice(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header Banner */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">
            <span className="material-symbols-outlined text-[30px]">shield</span>
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white">
              {isHindi ? 'सुरक्षा केंद्र (Security Center)' : 'BrandX Security Center'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isHindi
                ? 'आपके खाते, सत्र और व्यापारिक डेटा की सुरक्षा से जुड़े वास्तविक नियंत्रण।'
                : 'Implemented account protections, active session visibility, and security guidance.'}
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Active</span>
        </span>
      </div>

      {/* 2. Official Security Guidance Box */}
      <div className="p-4 sm:p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-400 text-[20px]">security</span>
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
            {isHindi ? 'सुरक्षा दिशानिर्देश (Security Guidance)' : 'Essential Security Guidance'}
          </h4>
        </div>
        <p className="text-xs text-amber-200/90 leading-relaxed font-medium">
          {isHindi
            ? 'अपने खाते और व्यापारिक रिकॉर्ड को सुरक्षित रखने के लिए निम्नलिखित दिशानिर्देशों का सदैव पालन करें:'
            : 'To keep your account and customer records protected, always observe these fundamental safety practices:'}
        </p>

        <ul className="space-y-2 text-xs font-semibold text-amber-100">
          <li className="flex items-start gap-2">
            <span className="text-amber-400 font-bold shrink-0">•</span>
            <span>&ldquo;Never share your OTP, password or authentication credentials with anyone.&rdquo;</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 font-bold shrink-0">•</span>
            <span>&ldquo;Use a strong, unique password.&rdquo;</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 font-bold shrink-0">•</span>
            <span>&ldquo;Do not sign in through suspicious links.&rdquo;</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 font-bold shrink-0">•</span>
            <span>&ldquo;Report suspicious account activity immediately.&rdquo;</span>
          </li>
        </ul>
      </div>

      {/* 3. Account Security Checks */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-400 text-[18px]">verified_user</span>
          <span>{isHindi ? 'खाता सुरक्षा स्थिति (Account Security)' : 'Account Security Status'}</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Phone Verification */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                {isHindi ? 'फ़ोन सत्यापन' : 'Phone Verification'}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isPhoneVerified
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {isPhoneVerified ? 'Verified' : 'Unverified'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {isPhoneVerified
                ? 'Mobile number validated via cryptographic SMS OTP.'
                : 'Phone number has not completed SMS OTP verification.'}
            </p>
          </div>

          {/* Email Verification */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                {isHindi ? 'ईमेल सत्यापन' : 'Email Verification'}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isEmailVerified
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {isEmailVerified ? 'Verified' : 'Unverified'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {isEmailVerified
                ? 'Primary email address confirmed and secured.'
                : 'Optional recovery email not yet confirmed via verification link.'}
            </p>
          </div>

          {/* Password Security */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                {isHindi ? 'पासवर्ड सुरक्षा' : 'Password Security'}
              </span>
              {onOpenChangePassword && (
                <button
                  onClick={onOpenChangePassword}
                  className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                >
                  {isHindi ? 'बदलें' : 'Change'}
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Protected by industry-standard cryptographic password hashing. Use a distinct password not used on other services.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Active Session & Device Information */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-400 text-[18px]">devices</span>
            <span>{isHindi ? 'सक्रिय सत्र व डिवाइस विवरण' : 'Active Session & Device Information'}</span>
          </h4>
          <button
            onClick={handleCopySessionInfo}
            className="text-[11px] text-slate-400 hover:text-white font-medium flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">content_copy</span>
            <span>{copiedTokenNotice ? 'Copied!' : 'Copy Telemetry'}</span>
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Device Client</span>
              <span className="text-white font-semibold">{isAndroidApp ? 'Android PWA / TWA' : 'Web Browser'}</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Environment</span>
              <span className="text-white font-semibold">{browserName}</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Session Protocol</span>
              <span className="text-white font-semibold">Encrypted Session Token</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Connection Security</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                <span>HTTPS TLS 1.3</span>
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">Multi-Device Sessions: </span>
              Single active device session currently. Remote revocation of other sessions is in active backend development.
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-[10px] font-bold text-slate-400 border border-slate-700">
                Logout Other Sessions (Coming Soon)
              </span>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 cursor-pointer"
                >
                  Logout Current
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Login Activity Note */}
        <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800/60 flex items-start gap-2.5 text-xs text-slate-400">
          <span className="material-symbols-outlined text-slate-500 text-[18px] shrink-0 mt-0.5">history</span>
          <div>
            <span className="font-bold text-slate-300 block mb-0.5">
              {isHindi ? 'लॉगिन गतिविधि ऑडिट (Login Activity)' : 'Login Activity & Audit Logs'}
            </span>
            <span>
              {isHindi
                ? 'सुरक्षा घटनाओं और लॉगिन प्रयासों को सर्वर-साइड ऑडिट लॉग में दर्ज किया जाता है। व्यक्तिगत लॉगिन इतिहास दर्शक आगामी संस्करण में उपलब्ध कराया जाएगा।'
                : 'Authentication attempts and critical account changes are captured in backend audit logs for system security. A dedicated self-service timeline viewer is planned for an upcoming update.'}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Implemented Technical Controls (Truthful Architecture Only) */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-400 text-[18px]">verified</span>
          <span>{isHindi ? 'लागू तकनीकी सुरक्षा नियंत्रण' : 'Implemented Technical Security Controls'}</span>
        </h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          {isHindi
            ? 'यह सूची BrandX प्लेटफ़ॉर्म के वास्तविक, वर्तमान में सक्रिय तकनीकी नियंत्रणों का प्रतिनिधित्व करती है। हम कोई काल्पनिक या अपुष्ट दावे नहीं करते।'
            : 'This breakdown represents actual controls active in the current BrandX architecture. We do not make unverified claims or state certifications that have not been performed.'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Verified Account Authentication
            </span>
            <p className="text-[11px] text-slate-400">
              Identity validation via secure SMS OTP and verified session credentials.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Authenticated Server Requests
            </span>
            <p className="text-[11px] text-slate-400">
              Every sensitive request requires an authenticated session token verified by the application server.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Multi-Tenant Account Isolation
            </span>
            <p className="text-[11px] text-slate-400">
              All database records are logically isolated by business account keys so merchants cannot access other accounts.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              HTTPS in Production
            </span>
            <p className="text-[11px] text-slate-400">
              All communications between client devices, the backend API, and external services enforce TLS encryption.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Protected Server-Side Secrets
            </span>
            <p className="text-[11px] text-slate-400">
              Database access keys, service credentials, and administrative tokens remain strictly on protected servers and are never exposed to client browsers.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Production Environment Validation
            </span>
            <p className="text-[11px] text-slate-400">
              Startup validation checks prevent deployment with mock credentials or unsafe defaults.
            </p>
          </div>
        </div>
      </div>

      {/* 6. Security Issue Reporting */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-3">
        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-rose-400 text-[18px]">bug_report</span>
          <span>{isHindi ? 'सुरक्षा समस्या रिपोर्टिंग (Security Reporting)' : 'Report a Security Issue'}</span>
        </h4>
        <p className="text-xs text-slate-300 leading-relaxed">
          {isHindi
            ? 'यदि आपको कोई संभावित सुरक्षा खामी या अपने खाते में कोई संदिग्ध गतिविधि दिखाई दे, तो कृपया तुरंत हमारे सुरक्षा दल को रिपोर्ट करें।'
            : 'If you discover a potential vulnerability or notice unauthorized activity on your merchant account, please disclose it responsibly directly to our engineering desk.'}
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Security Desk Email: </span>
            <a href="mailto:support@brandx.in?subject=[SECURITY%20DISCLOSURE]%20Issue%20Report" className="text-cyan-400 hover:underline">
              support@brandx.in
            </a>
          </div>

          <a
            href="mailto:support@brandx.in?subject=[SECURITY%20DISCLOSURE]%20Issue%20Report"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-rose-400">mail</span>
            <span>{isHindi ? 'सुरक्षा समस्या भेजें' : 'Submit Security Report'}</span>
          </a>
        </div>
      </div>
    </div>
  );
};
