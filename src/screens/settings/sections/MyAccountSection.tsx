import React, { useState } from 'react';
import { BusinessProfile } from '../../../types';
import { authApi } from '../../../services/authApi';
import { firebaseAuthService } from '../../../services/firebaseAuthService';
import { auth } from '../../../config/firebase';
import { updatePassword, sendEmailVerification } from 'firebase/auth';
import { useLanguage } from '../../../context/LanguageContext';
import { resolveImageUrl } from '../../../utils/imageUrl';

interface MyAccountSectionProps {
  business: BusinessProfile;
  onUpdateBusiness: (updated: BusinessProfile) => void;
  onDeleteAccountRequest: () => void;
  onLogout: () => void;
}

export const MyAccountSection: React.FC<MyAccountSectionProps> = ({
  business,
  onUpdateBusiness,
  onDeleteAccountRequest,
  onLogout,
}) => {
  const { isHindi } = useLanguage();
  const currentUser = auth?.currentUser;
  const storedUser = authApi.getStoredUser();

  const [name, setName] = useState(business.ownerName || storedUser?.name || 'Vyapari');
  const [email, setEmail] = useState(business.email || storedUser?.email || currentUser?.email || '');
  const [mobile] = useState(business.phone || business.mobile || storedUser?.mobile || currentUser?.phoneNumber || '');
  
  // Verification states
  const isPhoneVerified = !!(currentUser?.phoneNumber || storedUser?.mobile || business.phone);
  const isEmailVerified = !!currentUser?.emailVerified;

  // Edit / Action states
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Email verification trigger
  const [sendingVerification, setSendingVerification] = useState(false);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      // 1. Update backend user profile if possible
      await authApi.updateMe({
        name: name.trim(),
        email: email.trim() || undefined,
      });

      // 2. Update local business profile
      const updatedBiz = {
        ...business,
        ownerName: name.trim(),
        email: email.trim(),
      };
      onUpdateBusiness(updatedBiz);

      setSaveMessage({
        type: 'success',
        text: isHindi ? 'प्रोफ़ाइल सफलतापूर्वक अपडेट हो गई।' : 'Account profile updated successfully.',
      });
      setIsEditing(false);
    } catch (err: any) {
      setSaveMessage({
        type: 'error',
        text: err?.message || (isHindi ? 'अपडेट करने में विफल।' : 'Failed to update profile.'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendEmailVerification = async () => {
    if (!currentUser) return;
    setSendingVerification(true);
    try {
      await sendEmailVerification(currentUser);
      alert(
        isHindi
          ? `सत्यापन ईमेल ${currentUser.email} पर भेजा गया है। कृपया अपना इनबॉक्स चेक करें।`
          : `Verification link sent to ${currentUser.email}. Please check your inbox.`
      );
    } catch (err: any) {
      alert(err?.message || 'Failed to send verification email.');
    } finally {
      setSendingVerification(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordMsg({
        type: 'error',
        text: isHindi ? 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।' : 'Password must be at least 6 characters.',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({
        type: 'error',
        text: isHindi ? 'पासवर्ड मेल नहीं खाते।' : 'Passwords do not match.',
      });
      return;
    }

    setPasswordLoading(true);
    setPasswordMsg(null);
    try {
      if (currentUser) {
        await updatePassword(currentUser, newPassword);
        setPasswordMsg({
          type: 'success',
          text: isHindi ? 'पासवर्ड सफलतापूर्वक बदल दिया गया।' : 'Password updated successfully.',
        });
        setTimeout(() => {
          setShowPasswordModal(false);
          setNewPassword('');
          setConfirmPassword('');
          setPasswordMsg(null);
        }, 1500);
      } else {
        throw new Error(isHindi ? 'कोई सक्रिय पासवर्ड सत्र नहीं मिला।' : 'No active password session found.');
      }
    } catch (err: any) {
      if (err?.code === 'auth/requires-recent-login') {
        setPasswordMsg({
          type: 'error',
          text: isHindi
            ? 'सुरक्षा कारणों से, पासवर्ड बदलने के लिए कृपया पुनः लॉगिन करें।'
            : 'For security, please log out and log back in before updating your password.',
        });
      } else {
        setPasswordMsg({
          type: 'error',
          text: err?.message || 'Failed to update password.',
        });
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-0.5 shadow-lg flex items-center justify-center overflow-hidden">
                <img
                  src={resolveImageUrl(business.logoUrl)}
                  alt={name}
                  className="w-full h-full object-cover rounded-2xl bg-slate-950"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/brandx-logo.png';
                  }}
                />
              </div>
              <span
                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] ${
                  isPhoneVerified ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-slate-950'
                }`}
                title={isPhoneVerified ? 'Account Active' : 'Pending Verification'}
              >
                ✓
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-white">{name}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-cyan-300 font-bold border border-blue-500/30">
                  {isHindi ? 'व्यापारी खाता' : 'Merchant Account'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{business.name || 'BrandX Business User'}</p>
              <p className="text-[11px] text-slate-500 font-mono mt-1">
                {mobile ? mobile : email ? email : 'ID: ' + (business.id || 'N/A')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                <span>{isHindi ? 'एडिट करें' : 'Edit Profile'}</span>
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-bold transition cursor-pointer"
              >
                {isHindi ? 'रद्द करें' : 'Cancel'}
              </button>
            )}
          </div>
        </div>

        {/* Status message */}
        {saveMessage && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              saveMessage.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {saveMessage.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{saveMessage.text}</span>
          </div>
        )}
      </div>

      {/* Account Details Form */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-5">
        <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-400 text-[18px]">person</span>
          <span>{isHindi ? 'व्यक्तिगत व खाता विवरण' : 'Personal & Account Details'}</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              {isHindi ? 'पूरा नाम (Profile Name)' : 'Full Name (Profile Name)'}
            </label>
            <input
              type="text"
              value={name}
              disabled={!isEditing}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs font-medium focus:border-blue-500 focus:outline-hidden disabled:opacity-75 disabled:cursor-not-allowed"
              placeholder="e.g. Ramesh Kumar"
            />
          </div>

          {/* Mobile Number & Verification Status */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300">
                {isHindi ? 'मोबाइल नंबर (Phone OTP)' : 'Mobile Number (Phone OTP)'}
              </label>
              {isPhoneVerified ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full">
                  <span className="material-symbols-outlined text-[12px]">verified</span>
                  {isHindi ? 'सत्यापित (Verified)' : 'Verified'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded-full">
                  <span className="material-symbols-outlined text-[12px]">warning</span>
                  {isHindi ? 'अपुष्ट (Unverified)' : 'Unverified'}
                </span>
              )}
            </div>
            <input
              type="tel"
              value={mobile || 'Not Linked'}
              disabled={true}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 text-xs font-mono disabled:opacity-75 cursor-not-allowed"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              {isHindi
                ? 'मोबाइल नंबर आपके प्राथमिक ऑथेंटिकेशन और SMS OTP से सुरक्षित है।'
                : 'Mobile number is bound to your primary phone authentication.'}
            </p>
          </div>

          {/* Email Address & Verification Status */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300">
                {isHindi ? 'ईमेल पता (Email Address)' : 'Email Address'}
              </label>
              <div className="flex items-center gap-2">
                {isEmailVerified ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full">
                    <span className="material-symbols-outlined text-[12px]">verified</span>
                    {isHindi ? 'सत्यापित (Verified)' : 'Verified'}
                  </span>
                ) : email ? (
                  <button
                    onClick={handleSendEmailVerification}
                    disabled={sendingVerification}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-950/60 border border-cyan-800/80 px-2 py-0.5 rounded-full cursor-pointer"
                  >
                    <span>{sendingVerification ? 'Sending...' : isHindi ? 'ईमेल सत्यापित करें' : 'Verify Email'}</span>
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-500">
                    {isHindi ? 'वैकल्पिक' : 'Optional'}
                  </span>
                )}
              </div>
            </div>
            <input
              type="email"
              value={email}
              disabled={!isEditing}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs font-medium focus:border-blue-500 focus:outline-hidden disabled:opacity-75 disabled:cursor-not-allowed"
              placeholder="e.g. business@gmail.com"
            />
          </div>
        </div>

        {isEditing && (
          <div className="pt-2 flex justify-end">
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{isHindi ? 'सेव हो रहा है...' : 'Saving to Database...'}</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>{isHindi ? 'परिवर्तन सहेजें' : 'Save Changes'}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Account Security & Actions */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
        <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-purple-400 text-[18px]">lock_reset</span>
          <span>{isHindi ? 'सुरक्षा व खाता नियंत्रण' : 'Security & Account Actions'}</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Change Password */}
          <button
            onClick={() => setShowPasswordModal(true)}
            className="p-3.5 rounded-2xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 flex items-center gap-3 text-left transition group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30">
              <span className="material-symbols-outlined text-[20px]">key</span>
            </div>
            <div>
              <span className="text-xs font-bold text-white block group-hover:text-purple-300">
                {isHindi ? 'पासवर्ड बदलें' : 'Change Password'}
              </span>
              <span className="text-[10px] text-slate-400">
                {isHindi ? 'पासवर्ड सुरक्षा अपडेट करें' : 'Update credentials'}
              </span>
            </div>
          </button>

          {/* Sign Out */}
          <button
            onClick={onLogout}
            className="p-3.5 rounded-2xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 flex items-center gap-3 text-left transition group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </div>
            <div>
              <span className="text-xs font-bold text-white block group-hover:text-blue-300">
                {isHindi ? 'लॉगआउट करें' : 'Log Out'}
              </span>
              <span className="text-[10px] text-slate-400">
                {isHindi ? 'सत्र समाप्त करें' : 'End current session'}
              </span>
            </div>
          </button>

          {/* Delete Account */}
          <button
            onClick={onDeleteAccountRequest}
            className="p-3.5 rounded-2xl bg-rose-950/20 hover:bg-rose-900/30 border border-rose-900/40 flex items-center gap-3 text-left transition group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
              <span className="material-symbols-outlined text-[20px]">delete_forever</span>
            </div>
            <div>
              <span className="text-xs font-bold text-rose-300 block group-hover:text-rose-200">
                {isHindi ? 'खाता हटाएं' : 'Delete Account'}
              </span>
              <span className="text-[10px] text-rose-400/80">
                {isHindi ? 'डेटा हटाने का अनुरोध' : 'Permanent deletion'}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowPasswordModal(false)}
        >
          <div
            className="bg-[#131B2E] border border-white/20 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-in text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-400 text-[22px]">key</span>
                <h3 className="font-extrabold text-base text-white">
                  {isHindi ? 'नया पासवर्ड बनाएं' : 'Update Password'}
                </h3>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {isHindi ? 'नया पासवर्ड' : 'New Password'}
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-purple-500 focus:outline-hidden"
                  placeholder="Min 6 characters"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {isHindi ? 'पासवर्ड की पुष्टि करें' : 'Confirm New Password'}
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-purple-500 focus:outline-hidden"
                  placeholder="Re-enter password"
                />
              </div>

              {passwordMsg && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    passwordMsg.type === 'success'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {passwordMsg.type === 'success' ? 'check_circle' : 'error'}
                  </span>
                  <span>{passwordMsg.text}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 cursor-pointer"
                >
                  {isHindi ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {passwordLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{isHindi ? 'अपडेट हो रहा है...' : 'Updating...'}</span>
                    </>
                  ) : (
                    <span>{isHindi ? 'पासवर्ड सेव करें' : 'Save Password'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
