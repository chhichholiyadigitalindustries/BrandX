import React from 'react';
import { Home, LogIn } from 'lucide-react';

interface NotFoundScreenProps {
  onGoHome: () => void;
  onOpenApp: () => void;
}

export function NotFoundScreen({ onGoHome, onOpenApp }: NotFoundScreenProps) {
  return (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl space-y-6">
        <img
          src="/brandx-logo.png"
          alt="BrandX Logo"
          className="h-16 w-auto mx-auto object-contain drop-shadow"
        />

        <div>
          <div className="text-5xl font-black text-blue-500 tracking-tight font-mono">404</div>
          <h1 className="text-xl font-bold text-white mt-2">Page Not Found</h1>
          <p className="text-xs text-slate-400 mt-1">
            The page you requested could not be found or may have been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={onGoHome}
            className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>BrandX Home</span>
          </button>
          <button
            onClick={onOpenApp}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <LogIn className="w-4 h-4 text-blue-400" />
            <span>Open Super App</span>
          </button>
        </div>
      </div>
    </div>
  );
}
