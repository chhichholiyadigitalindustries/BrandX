import React, { useRef } from 'react';
import { resolveShopName } from '../utils/posterShare';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  url: string;
  shopName: string;
  logoUrl?: string;
  type?: 'store' | 'card';
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  url,
  shopName,
  logoUrl,
  type = 'store',
}) => {
  const qrImageRef = useRef<HTMLImageElement>(null);

  if (!isOpen) return null;

  // High-res QR code URL from QR Server (size 400x400)
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=15&data=${encodeURIComponent(url)}`;

  const handleDownloadPng = async () => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 600;
      canvas.height = 750;

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, 750);
      gradient.addColorStop(0, '#0F172A');
      gradient.addColorStop(1, '#020617');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 600, 750);

      // Card Border
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 560, 710);

      // Title
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      const displayShopName = resolveShopName({ name: shopName } as any);
      ctx.fillText(displayShopName, 300, 75);

      // Subtitle
      ctx.fillStyle = '#94A3B8';
      ctx.font = '16px sans-serif';
      ctx.fillText(type === 'store' ? 'OFFICIAL DIGITAL DUKAAN' : 'SMART NFC VISITING CARD', 300, 110);

      // Fetch and draw QR Code
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = qrApiUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // White box for QR
      ctx.fillStyle = '#FFFFFF';
      ctx.roundRect ? ctx.roundRect(100, 140, 400, 400, 24) : ctx.fillRect(100, 140, 400, 400);
      ctx.fill();

      // Draw QR inside
      ctx.drawImage(img, 120, 160, 360, 360);

      // Call to action
      ctx.fillStyle = '#60A5FA';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(type === 'store' ? 'SCAN TO VIEW PRODUCTS & ORDER' : 'SCAN TO SAVE CONTACT DIRECTLY', 300, 590);

      // URL text
      ctx.fillStyle = '#CBD5E1';
      ctx.font = '14px monospace';
      ctx.fillText(url, 300, 630);

      // Footer brand
      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('POWERED BY BRANDX VYAPARI SUPER APP', 300, 690);

      // Trigger download
      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `${(shopName || 'brandx').replace(/\s+/g, '_')}_QR_Code.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      // Direct fallback
      window.open(qrApiUrl, '_blank');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0F172A] border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative space-y-5 text-center">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-white/5 hover:bg-white/10 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {/* Header */}
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-white">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>

        {/* QR Code Container */}
        <div className="bg-white p-4 rounded-2xl shadow-xl mx-auto w-fit border-4 border-blue-500/40">
          <img
            ref={qrImageRef}
            src={qrApiUrl}
            alt="High-Res QR Code"
            className="w-48 h-48 mx-auto"
          />
          <p className="text-[10px] font-black text-slate-900 mt-2 uppercase tracking-wider">
            {shopName || 'BRANDX'}
          </p>
        </div>

        {/* Link Info */}
        <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between text-xs">
          <span className="text-slate-300 truncate font-mono text-[11px] pr-2">{url}</span>
          <button
            onClick={handleCopyLink}
            className="px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg text-[10px] font-bold shrink-0 transition-all cursor-pointer"
          >
            Copy
          </button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            onClick={handleDownloadPng}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow transition-all active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Download PNG</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold rounded-xl border border-white/10 transition-all active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            <span>Print Standee</span>
          </button>
        </div>
      </div>
    </div>
  );
};
