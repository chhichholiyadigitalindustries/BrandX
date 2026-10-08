import React, { useState, useEffect } from 'react';
import { resolveImageUrl } from '../utils/imageUrl';
import { buildUpiPaymentUri, generateUpiQrDataUrl, validateUpiId, normalizeUpiId } from '../utils/upiQr';

interface UpiQrCodeProps {
  className?: string;
  upiId?: string | null;
  merchantName?: string | null;
  amount?: number | null;
  note?: string | null;
  logoUrl?: string | null;
  showMissingPrompt?: boolean;
  missingText?: string;
  onMissingClick?: () => void;
}

export const UpiQrCode: React.FC<UpiQrCodeProps> = ({
  className = 'w-24 h-24',
  upiId,
  merchantName = 'Merchant',
  amount,
  note,
  logoUrl,
  showMissingPrompt = true,
  missingText,
  onMissingClick,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cleanUpi = normalizeUpiId(upiId);
  const validation = validateUpiId(cleanUpi);

  useEffect(() => {
    let isMounted = true;

    if (!cleanUpi || !validation.isValid) {
      setQrDataUrl(null);
      setError(validation.error || 'UPI ID not set');
      return;
    }

    const uri = buildUpiPaymentUri(cleanUpi, merchantName || 'Merchant', amount, note);

    generateUpiQrDataUrl(uri, {
      width: 350,
      margin: 1,
      errorCorrectionLevel: 'M',
      darkColor: '#0F172A',
      lightColor: '#FFFFFF',
    })
      .then((dataUrl) => {
        if (isMounted) {
          setQrDataUrl(dataUrl);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('[UpiQrCode] QR generation error:', err);
          setError('Failed to generate QR');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [cleanUpi, merchantName, amount, note, validation.isValid]);

  // Fallback state when UPI ID is missing or invalid
  if (!cleanUpi || !validation.isValid || !qrDataUrl) {
    if (!showMissingPrompt) return null;

    return (
      <div
        onClick={onMissingClick}
        data-testid="upi-qr-missing"
        className={`relative ${className} bg-slate-50 p-2 rounded-xl border border-dashed border-amber-300 flex flex-col items-center justify-center text-center select-none ${
          onMissingClick ? 'cursor-pointer hover:bg-amber-50/50' : ''
        }`}
      >
        <span className="material-symbols-outlined text-amber-500 text-[20px]">qr_code_2</span>
        <p className="text-[9px] font-bold text-slate-700 mt-0.5 leading-tight">
          {missingText || 'UPI Not Configured'}
        </p>
        <p className="text-[8px] text-slate-500 leading-tight mt-0.5">
          Add in Profile Settings
        </p>
      </div>
    );
  }

  const currentUri = buildUpiPaymentUri(cleanUpi, merchantName || 'Merchant', amount, note);

  return (
    <div
      data-testid="upi-qr-code"
      data-upi-id={cleanUpi}
      data-upi-uri={currentUri}
      className={`relative ${className} bg-white p-1 rounded-xl border border-gray-200 flex items-center justify-center shrink-0 shadow-xs overflow-hidden`}
    >
      <img
        src={qrDataUrl}
        alt={`UPI Payment QR for ${merchantName || 'Merchant'}`}
        className="w-full h-full object-contain"
      />

      {/* Center Logo Image Badge */}
      {logoUrl && (
        <div className="absolute inset-0 m-auto w-[22%] h-[22%] rounded-md bg-white p-0.5 shadow-xs flex items-center justify-center border border-gray-200 overflow-hidden pointer-events-none">
          <img
            alt="Brand Logo"
            className="w-full h-full object-contain rounded-xs"
            src={resolveImageUrl(logoUrl || '/brandx-logo.png')}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/brandx-logo.png';
            }}
          />
        </div>
      )}
    </div>
  );
};
