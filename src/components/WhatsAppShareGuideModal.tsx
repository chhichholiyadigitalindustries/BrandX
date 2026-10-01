import React, { useState } from 'react';

interface WhatsAppShareGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  caption?: string;
  imageUrl?: string;
  title?: string;
  phoneNumber?: string;
}

export const WhatsAppShareGuideModal: React.FC<WhatsAppShareGuideModalProps> = ({
  isOpen,
  onClose,
  caption = '',
  imageUrl = '',
  title = 'Poster Image',
  phoneNumber,
}) => {
  const [copiedCaption, setCopiedCaption] = useState(false);

  if (!isOpen) return null;

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2500);
    } catch {
      // Fallback copy
      const ta = document.createElement('textarea');
      ta.value = caption;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2500);
    }
  };

  const handleOpenWhatsAppAgain = () => {
    const cleanPhone = (phoneNumber || '').replace(/\D/g, '');
    const phoneParam = cleanPhone ? `phone=91${cleanPhone}&` : '';
    const waUrl = `https://api.whatsapp.com/send?${phoneParam}text=${encodeURIComponent(caption)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="relative w-full max-w-md bg-[#131B2E] text-white rounded-3xl shadow-2xl border border-white/15 overflow-hidden animate-scale-in flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0F172A]/80">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg">
              💬
            </span>
            <div>
              <h3 className="font-extrabold text-sm text-white">WhatsApp Web Share Guide</h3>
              <p className="text-[10px] text-slate-400">Desktop / PC Sharing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex flex-col gap-4">
          
          {/* Status Alert: Copied to Clipboard */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
              <span className="material-symbols-outlined text-[24px]">content_paste</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-emerald-300">
                Image Clipboard me Copy ho chuki hai! 📋
              </p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                WhatsApp Web me bas <strong className="text-white bg-white/20 px-1.5 py-0.5 rounded font-mono text-[10px]">Ctrl + V</strong> dabayein aur image send ho jayegi.
              </p>
            </div>
          </div>

          {/* Poster Preview + Steps */}
          <div className="flex gap-3.5 items-center p-3 rounded-2xl bg-white/5 border border-white/10">
            {imageUrl && (
              <div className="w-20 h-24 rounded-xl overflow-hidden bg-black/40 shrink-0 border border-white/15 shadow">
                <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="space-y-2 text-xs flex-1">
              <div className="flex items-start gap-2">
                <span className="w-4.5 h-4.5 rounded-full bg-blue-500/20 text-blue-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <p className="text-[11px] text-slate-300">
                  WhatsApp Web tab par jayein (dusre tab me open hai)
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4.5 h-4.5 rounded-full bg-blue-500/20 text-blue-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <p className="text-[11px] text-slate-300">
                  Chat box me click karke <strong className="text-cyan-300 font-mono">Ctrl + V (Paste)</strong> dabayein
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4.5 h-4.5 rounded-full bg-blue-500/20 text-blue-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <p className="text-[11px] text-slate-300">
                  {title.toLowerCase().includes('invoice') ? 'Invoice' : 'Poster'} image HD preview ke sath attach ho jayegi!
                </p>
              </div>
            </div>
          </div>

          {/* Info note regarding browser limitation */}
          <p className="text-[10px] text-slate-400 leading-relaxed text-center px-1">
            💡 <em>Note: WhatsApp Web security policies ke karan direct URL se file upload allow nahi karta. Isliye clipboard paste (Ctrl+V) sabse tez aur direct tareeka hai.</em>
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-1">
            {caption && (
              <button
                type="button"
                onClick={handleCopyCaption}
                className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  copiedCaption
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {copiedCaption ? 'check' : 'content_copy'}
                </span>
                <span>{copiedCaption ? 'Caption Copied! ✓' : '📋 Copy Caption Text'}</span>
              </button>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleOpenWhatsAppAgain}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                <span>Open WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-600/20 cursor-pointer"
              >
                <span>Theek Hai (Done)</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
