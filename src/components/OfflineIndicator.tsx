import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      id="offline-banner"
      className="fixed bottom-20 left-4 right-4 md:left-6 md:right-auto md:w-96 z-50 flex items-center gap-3 rounded-xl bg-amber-600 px-4 py-3 text-sm font-medium text-white shadow-xl shadow-amber-900/30 animate-in fade-in slide-in-from-bottom duration-200"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-700">
        <WifiOff className="w-4 h-4 text-white animate-pulse" />
      </span>
      <div className="flex-1 text-xs">
        <p className="font-semibold text-amber-100">Offline Mode Active</p>
        <p className="text-amber-200/90 text-[11px]">Bahi-khata and cached posters are fully usable offline.</p>
      </div>
    </div>
  );
};
