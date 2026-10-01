import React from 'react';

interface UpiQrCodeProps {
  className?: string;
  upiId?: string;
  amount?: number;
  logoUrl?: string;
}

export const UpiQrCode: React.FC<UpiQrCodeProps> = ({
  className = 'w-20 h-20',
  logoUrl,
}) => {
  return (
    <div
      className={`relative ${className} bg-white p-1.5 rounded-xl border border-gray-200 flex items-center justify-center shrink-0 shadow-xs`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      >
        {/* Finder pattern Top-Left */}
        <rect fill="#0f172a" height="26" rx="2" width="26" x="5" y="5" />
        <rect fill="#FFFFFF" height="20" rx="1" width="20" x="8" y="8" />
        <rect fill="#0f172a" height="14" rx="1" width="14" x="11" y="11" />

        {/* Finder pattern Top-Right */}
        <rect fill="#0f172a" height="26" rx="2" width="26" x="69" y="5" />
        <rect fill="#FFFFFF" height="20" rx="1" width="20" x="72" y="8" />
        <rect fill="#0f172a" height="14" rx="1" width="14" x="75" y="11" />

        {/* Finder pattern Bottom-Left */}
        <rect fill="#0f172a" height="26" rx="2" width="26" x="5" y="69" />
        <rect fill="#FFFFFF" height="20" rx="1" width="20" x="8" y="72" />
        <rect fill="#0f172a" height="14" rx="1" width="14" x="11" y="75" />

        {/* Data Modules */}
        <rect fill="#0f172a" height="6" width="6" x="36" y="7" />
        <rect fill="#0f172a" height="6" width="6" x="47" y="7" />
        <rect fill="#0f172a" height="6" width="6" x="58" y="7" />
        <rect fill="#0f172a" height="6" width="6" x="36" y="18" />
        <rect fill="#0f172a" height="6" width="6" x="47" y="18" />
        <rect fill="#0f172a" height="6" width="6" x="58" y="24" />
        <rect fill="#0f172a" height="6" width="6" x="7" y="36" />
        <rect fill="#0f172a" height="6" width="6" x="18" y="36" />
        <rect fill="#0f172a" height="6" width="6" x="29" y="36" />
        <rect fill="#0f172a" height="6" width="6" x="36" y="36" />
        <rect fill="#0f172a" height="6" width="6" x="58" y="36" />
        <rect fill="#0f172a" height="6" width="6" x="69" y="36" />
        <rect fill="#0f172a" height="6" width="6" x="87" y="36" />
        <rect fill="#0f172a" height="6" width="6" x="7" y="47" />
        <rect fill="#0f172a" height="6" width="6" x="24" y="47" />
        <rect fill="#0f172a" height="6" width="6" x="69" y="47" />
        <rect fill="#0f172a" height="6" width="6" x="80" y="47" />
        <rect fill="#0f172a" height="6" width="6" x="7" y="58" />
        <rect fill="#0f172a" height="6" width="6" x="18" y="58" />
        <rect fill="#0f172a" height="6" width="6" x="36" y="58" />
        <rect fill="#0f172a" height="6" width="6" x="58" y="58" />
        <rect fill="#0f172a" height="6" width="6" x="80" y="58" />
        <rect fill="#0f172a" height="6" width="6" x="36" y="69" />
        <rect fill="#0f172a" height="6" width="6" x="47" y="69" />
        <rect fill="#0f172a" height="6" width="6" x="69" y="69" />
        <rect fill="#0f172a" height="6" width="6" x="87" y="69" />
        <rect fill="#0f172a" height="6" width="6" x="36" y="80" />
        <rect fill="#0f172a" height="6" width="6" x="47" y="80" />
        <rect fill="#0f172a" height="6" width="6" x="58" y="80" />
        <rect fill="#0f172a" height="6" width="6" x="80" y="80" />

        {/* Center Cutout Background */}
        <rect fill="#FFFFFF" height="24" rx="4" width="24" x="38" y="38" />
      </svg>

      {/* Center Logo Image Badge */}
      <div className="absolute inset-0 m-auto w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white p-0.5 shadow-xs flex items-center justify-center border border-gray-200 overflow-hidden">
        <img
          alt="Brand Logo"
          className="w-full h-full object-contain rounded-md"
          src={logoUrl || '/brandx-logo.png'}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/brandx-logo.png';
          }}
        />
      </div>
    </div>
  );
};
