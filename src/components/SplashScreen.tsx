import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onFinish, 
  minDurationMs = 1800 
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFading(true);
      const exitTimer = setTimeout(() => {
        setIsVisible(false);
        if (onFinish) onFinish();
      }, 400);
      return () => clearTimeout(exitTimer);
    }, minDurationMs);

    return () => clearTimeout(timer);
  }, [minDurationMs, onFinish]);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#0B0F19] text-white transition-opacity duration-400 select-none ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background ambient glow matching BRANDX colors (Electric Blue, Purple, Cyan) */}
      <div className="absolute w-72 h-72 rounded-full bg-gradient-to-tr from-blue-600/30 via-purple-600/20 to-cyan-400/20 blur-3xl pointer-events-none animate-pulse" />

      <div className="relative flex flex-col items-center text-center px-6">
        {/* Official BX Monogram Logo */}
        <div className="relative mb-6">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-1 bg-gradient-to-tr from-blue-600 via-purple-500 to-cyan-400 shadow-2xl shadow-blue-500/30">
            <img 
              src="/brandx-logo.png" 
              alt="BRANDX Logo" 
              className="w-full h-full object-contain rounded-[22px] bg-[#0B0F19]"
            />
          </div>
        </div>

        {/* Brand Name */}
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-display text-white">
          BRAND<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400">X</span>
        </h1>

        {/* Tagline */}
        <p className="mt-2 text-sm font-semibold tracking-wide text-slate-400 uppercase letter-spacing-widest">
          Create. Brand. Grow.
        </p>

        {/* Subtle loading bar */}
        <div className="mt-8 w-32 h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-purple-500 rounded-full animate-[shimmer_1.5s_infinite_linear] w-full" />
        </div>
      </div>
    </div>
  );
};
