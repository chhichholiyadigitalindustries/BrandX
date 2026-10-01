/**
 * BRANDX Admin Login Screen (/admin/login)
 * Modern protected authentication portal with email, password, remember me, loading states.
 */

import React, { useState } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';

export const AdminLoginScreen: React.FC = () => {
  const { login } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await login(email, password, rememberMe);
      if (!res.success) {
        setErrorMessage(res.error || 'Login failed. Please check your credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070A12] text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#0E1424] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 animate-scale-in">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#005338] to-[#008f62] flex items-center justify-center shadow-lg border border-white/20 mb-3">
            <span className="font-black text-white text-2xl tracking-wider">BX</span>
          </div>
          <h1 className="font-black text-2xl text-white tracking-tight">BRANDX ADMIN</h1>
          <p className="text-xs text-emerald-400 font-semibold mt-1">Super App Central Administration Portal</p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-shake">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              Admin Email ID
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">
                mail
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@brandx.in"
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/15 rounded-2xl text-sm text-white placeholder-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">
                lock
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-11 pr-11 py-3 bg-white/5 border border-white/15 rounded-2xl text-sm text-white placeholder-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-gray-300 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded text-emerald-500 focus:ring-0 focus:outline-none bg-white/10 border-white/20"
              />
              <span>Remember session</span>
            </label>
            <span className="text-gray-400 hover:text-emerald-400 cursor-pointer transition-colors">
              Need help?
            </span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#005338] via-[#00744e] to-[#008f62] hover:brightness-110 active:scale-[0.99] text-white font-extrabold text-sm shadow-xl shadow-emerald-950/50 border border-emerald-400/40 flex items-center justify-center gap-2 transition-all mt-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Authenticating Secure Portal...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">key</span>
                <span>Enter Admin Console</span>
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-white/10 text-center">
          <p className="text-[11px] text-gray-400">
            For testing: Type <code className="text-emerald-300 bg-white/10 px-1 py-0.5 rounded">admin@brandx.in</code>{' '}
            and password <code className="text-emerald-300 bg-white/10 px-1 py-0.5 rounded">admin123</code>
          </p>
          <div className="mt-3">
            <button
              onClick={() => (window.location.href = '/')}
              className="text-xs text-gray-400 hover:text-white transition-colors underline"
              type="button"
            >
              ← Return to BrandX User App
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
