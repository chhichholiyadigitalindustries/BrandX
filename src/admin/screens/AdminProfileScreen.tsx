/**
 * BRANDX Admin Profile & Security Screen (/admin/profile)
 * Allows authenticated admin users across all roles to edit their:
 * - Logo / Avatar image (File upload or direct URL)
 * - Full Name
 * - Official Email Address
 * - Phone / Mobile Number
 * - Password (Current password check + bcrypt hash)
 */

import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminAuthService } from '../services/adminAuthService';
import { imageUploadService } from '../services/imageUploadService';
import { useAdminToast } from '../components/AdminToast';
import { resolveImageUrl } from '../../utils/imageUrl';

export const AdminProfileScreen: React.FC = () => {
  const { admin, updateAdmin, refreshAdmin } = useAdminAuth();
  const { showToast } = useAdminToast();

  // Profile fields state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Status states
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  useEffect(() => {
    if (admin) {
      setName(admin.name || '');
      setEmail(admin.email || '');
      setPhone(admin.phone || '');
      const rawAvatar = admin.avatarUrl || '';
      setAvatarUrl(rawAvatar.startsWith('role:') ? '' : rawAvatar);
    }
  }, [admin]);

  // Handle Logo / Avatar Upload
  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Immediate local preview so the admin immediately sees the newly selected image
      const objectUrl = URL.createObjectURL(file);
      setAvatarUrl(objectUrl);
      setIsUploadingAvatar(true);
      try {
        const res = await imageUploadService.uploadImage(file, 'avatars');
        setAvatarUrl(res.url);
        showToast('Logo/Avatar photo uploaded! Click "Save Changes" to apply.', 'info');
      } catch (err: any) {
        showToast(err.message || 'Image upload failed', 'error');
      } finally {
        setIsUploadingAvatar(false);
      }
    }
  };

  // Handle Profile Update Submission
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    if (!cleanName || cleanName.length < 2) {
      showToast('Name must be at least 2 characters long', 'error');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      showToast('Please enter a valid official email address', 'error');
      return;
    }

    if (cleanPhone && cleanPhone.length > 0 && !/^[0-9+\s-]{10,15}$/.test(cleanPhone)) {
      showToast('Please enter a valid phone number (min 10 digits)', 'error');
      return;
    }

    const cleanAvatar = avatarUrl.trim();
    if (cleanAvatar.startsWith('blob:')) {
      showToast('Please wait for image upload to complete before saving', 'error');
      return;
    }

    setIsSavingProfile(true);
    const res = await adminAuthService.updateProfile({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone || null,
      avatarUrl: cleanAvatar.startsWith('role:') ? null : (cleanAvatar || null),
    });
    setIsSavingProfile(false);

    if (res.success && res.data) {
      updateAdmin(res.data);
      const updatedAvatar = res.data.avatarUrl || '';
      setAvatarUrl(updatedAvatar.startsWith('role:') ? '' : updatedAvatar);
      showToast('Admin profile updated successfully in PostgreSQL!');
    } else {
      showToast(res.error || 'Failed to update profile', 'error');
    }
  };

  // Handle Password Change Submission
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      showToast('Please enter your current password', 'error');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      showToast('New password must be at least 6 characters long', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    if (currentPassword === newPassword) {
      showToast('New password must be different from current password', 'error');
      return;
    }

    setIsChangingPassword(true);
    const res = await adminAuthService.changePassword({
      currentPassword,
      newPassword,
    });
    setIsChangingPassword(false);

    if (res.success) {
      showToast('Password changed successfully! Keep your new credentials safe.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      showToast(res.error || 'Failed to change password', 'error');
    }
  };

  const roleName = (admin?.role || 'SUPER_ADMIN').toUpperCase();
  const isSuper = roleName === 'SUPER_ADMIN' || roleName === 'ADMIN';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner Card */}
      <div className="bg-[#0E1424] rounded-3xl border border-white/10 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar & Upload Trigger */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-2 border-white/20 shadow-xl bg-[#131b2e] flex items-center justify-center">
              {avatarUrl && !avatarUrl.startsWith('role:') ? (
                <img
                  key={avatarUrl || 'profile-avatar'}
                  src={avatarUrl.startsWith('blob:') || avatarUrl.startsWith('data:') ? avatarUrl : resolveImageUrl(avatarUrl)}
                  alt={admin?.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/brandx-logo.png';
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-3xl font-extrabold text-white">
                  {name ? name.slice(0, 2).toUpperCase() : 'BX'}
                </div>
              )}
            </div>

            <label
              title="Upload New Logo / Photo"
              className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center cursor-pointer shadow-lg border border-white/20 transition-transform active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isUploadingAvatar ? 'hourglass_top' : 'photo_camera'}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarFileUpload}
                disabled={isUploadingAvatar}
                className="hidden"
              />
            </label>
          </div>

          {/* Profile Overview Meta */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h2 className="text-xl sm:text-2xl font-black text-white">{name || 'Administrator'}</h2>
              <span
                className={`px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase border ${
                  isSuper
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {roleName.replace('_', ' ')}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active Account
              </span>
            </div>

            <p className="text-xs text-gray-400 font-mono flex items-center justify-center sm:justify-start gap-2">
              <span className="material-symbols-outlined text-[16px] text-gray-500">mail</span>
              <span>{email || 'admin@brandx.in'}</span>
              {phone && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="material-symbols-outlined text-[16px] text-gray-500">call</span>
                  <span>{phone}</span>
                </>
              )}
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-[11px] text-gray-400 border-t border-white/5">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-emerald-400">verified_user</span>
                <span>Role: <strong>{roleName}</strong></span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-amber-400">database</span>
                <span>PostgreSQL Cloud Sync</span>
              </span>
              {admin?.createdAt && (
                <span className="text-gray-500">
                  Member since {new Date(admin.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
          <span>Personal &amp; Contact Info</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('password')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'password'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">lock_reset</span>
          <span>Security &amp; Password</span>
        </button>
      </div>

      {/* TAB 1: Profile Details Form */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#0E1424] rounded-3xl border border-white/10 p-6 shadow-xl space-y-5">
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400">badge</span>
                Edit Profile Information
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Update your name, contact phone number, and official administrative email.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Full Legal Name
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-[18px]">
                    person
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Official Email Address
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-[18px]">
                    alternate_email
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@brandx.in"
                    className="w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  Used for administrative 2FA notifications and portal sign-in.
                </p>
              </div>

              <div>
                <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Mobile / Phone Number
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-[18px]">
                    call
                  </span>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  Direct contact number for urgent operational escalations.
                </p>
              </div>

              <div>
                <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Avatar / Brand Logo Image URL
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-[18px]">
                    image
                  </span>
                  <input
                    type="text"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://... or upload photo above"
                    className="w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white font-extrabold text-xs shadow-lg flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingProfile ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving to Database...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    <span>Save Profile Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Info Box */}
          <div className="space-y-4">
            <div className="bg-[#0E1424] rounded-3xl border border-white/10 p-5 shadow-xl space-y-3 text-xs">
              <h4 className="font-extrabold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">shield</span>
                Role &amp; Permissions
              </h4>
              <p className="text-gray-400 leading-relaxed">
                Your role <strong className="text-white">[{roleName}]</strong> is cryptographically signed in your JWT access token.
              </p>
              <div className="p-3 bg-white/5 rounded-2xl border border-white/5 space-y-1.5 text-[11px]">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">RBAC Level:</span>
                  <span className="text-emerald-400 font-bold">{isSuper ? 'Full Platform Control' : 'Staff Operator'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Audit Logging:</span>
                  <span className="text-blue-400 font-mono">ENABLED</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-400">Encryption:</span>
                  <span className="text-amber-400 font-mono">Bcrypt (10 Rounds)</span>
                </div>
              </div>
            </div>

            <div className="bg-[#0E1424] rounded-3xl border border-white/10 p-5 shadow-xl space-y-3 text-xs">
              <h4 className="font-extrabold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400">image</span>
                Photo Guidelines
              </h4>
              <ul className="text-gray-400 space-y-2 list-disc list-inside text-[11px]">
                <li>Square aspect ratio (1:1) recommended.</li>
                <li>PNG, JPG, or WebP format.</li>
                <li>Maximum file size 5MB.</li>
                <li>Updates immediately on top bar &amp; sidebar upon save.</li>
              </ul>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: Change Password Form */}
      {activeTab === 'password' && (
        <form onSubmit={handleChangePassword} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#0E1424] rounded-3xl border border-white/10 p-6 shadow-xl space-y-5">
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400">lock</span>
                Change Admin Password
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Verify your current password and choose a strong permanent password (min 6 characters).
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Current Password */}
              <div>
                <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-[18px]">
                    key
                  </span>
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showCurrentPass ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  New Password (min 6 characters)
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-[18px]">
                    lock_open
                  </span>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Create strong new password"
                    className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showNewPass ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-[18px]">
                    lock_clock
                  </span>
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showConfirmPass ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-[11px] text-rose-400 mt-1">Passwords do not match</p>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white font-extrabold text-xs shadow-lg flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isChangingPassword ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">security</span>
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Security Advice */}
          <div className="bg-[#0E1424] rounded-3xl border border-white/10 p-5 shadow-xl space-y-3 text-xs">
            <h4 className="font-extrabold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400">lock_person</span>
              Password Safety Rules
            </h4>
            <ul className="text-gray-400 space-y-2 list-disc list-inside text-[11px] leading-relaxed">
              <li>Use a minimum of 6 characters.</li>
              <li>Include uppercase, lowercase, numbers, and symbols for maximum strength.</li>
              <li>Never share your admin password with other operators or team members.</li>
              <li>Password changes are permanently recorded in the immutable audit log.</li>
            </ul>
          </div>
        </form>
      )}
    </div>
  );
};
