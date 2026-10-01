import React, { useState, useEffect } from 'react';

interface NfcWriterModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardUrl: string;
  cardName: string;
}

export const NfcWriterModal: React.FC<NfcWriterModalProps> = ({
  isOpen,
  onClose,
  cardUrl,
  cardName,
}) => {
  const [isSupported, setIsSupported] = useState(false);
  const [writeStatus, setWriteStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsSupported('NDEFReader' in window);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(cardUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartNfcWrite = async () => {
    if (!isSupported) return;

    setWriteStatus('scanning');
    setErrorMessage(null);

    try {
      const NDEFReader = (window as any).NDEFReader;
      const ndef = new NDEFReader();

      // Initiate scan / write session
      await ndef.write({
        records: [
          {
            recordType: 'url',
            data: cardUrl,
          },
        ],
      });

      setWriteStatus('success');
    } catch (err: any) {
      setWriteStatus('error');
      if (err.name === 'NotAllowedError') {
        setErrorMessage('NFC permission was denied by browser. Please allow NFC in site settings.');
      } else if (err.name === 'NotSupportedError') {
        setErrorMessage('NFC is not supported or is turned off in your phone settings.');
      } else {
        setErrorMessage(err.message || 'Failed to write NFC tag. Please try again.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0F172A] border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl relative space-y-5 text-left">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-white/5 hover:bg-white/10 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <span className="material-symbols-outlined text-[22px]">contactless</span>
            </span>
            <div>
              <h3 className="text-base font-extrabold text-white">Program NFC Visiting Card</h3>
              <p className="text-xs text-slate-400">Write your digital card URL onto a physical NFC card or sticker</p>
            </div>
          </div>
        </div>

        {/* Status Indicator */}
        {isSupported ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-center">
              {writeStatus === 'idle' && (
                <>
                  <div className="w-16 h-16 rounded-full bg-indigo-600/20 border-2 border-indigo-500/40 flex items-center justify-center mx-auto text-indigo-400">
                    <span className="material-symbols-outlined text-[32px] animate-pulse">contactless</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Web NFC is Supported on your Device!</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Tap the button below and hold your blank NFC tag near the back of your phone.
                    </p>
                  </div>
                  <button
                    onClick={handleStartNfcWrite}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow transition-all active:scale-95 cursor-pointer"
                  >
                    Start NFC Write 📡
                  </button>
                </>
              )}

              {writeStatus === 'scanning' && (
                <div className="space-y-2 py-3">
                  <div className="w-16 h-16 rounded-full bg-blue-600/20 border-2 border-blue-400 flex items-center justify-center mx-auto text-blue-400 animate-spin">
                    <span className="material-symbols-outlined text-[32px]">sync</span>
                  </div>
                  <h4 className="text-xs font-bold text-blue-300">Ready to Tap!</h4>
                  <p className="text-[11px] text-slate-300">
                    Hold your physical NFC tag or card firmly against the back of this phone until you hear a chime...
                  </p>
                </div>
              )}

              {writeStatus === 'success' && (
                <div className="space-y-2 py-2 text-emerald-400">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-[32px]">check_circle</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">NFC Card Programmed Successfully! 🎉</h4>
                  <p className="text-[11px] text-slate-300">
                    Your physical card is now live. Anyone who taps it will instantly see your Digital Card!
                  </p>
                </div>
              )}

              {writeStatus === 'error' && (
                <div className="space-y-2 py-2 text-rose-400">
                  <div className="w-14 h-14 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-[32px]">error</span>
                  </div>
                  <h4 className="text-xs font-bold text-rose-300">NFC Write Incomplete</h4>
                  <p className="text-[11px] text-slate-400">{errorMessage}</p>
                  <button
                    onClick={handleStartNfcWrite}
                    className="py-1.5 px-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/10"
                  >
                    Retry Tap
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Clear, helpful instructions for non-Web NFC browsers (iOS / desktop) */
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <span className="material-symbols-outlined text-[16px] text-amber-400">info</span>
                <span>Writing NFC via Browser Notice</span>
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                Direct in-browser NFC writing is only supported on Chromium Android. For Apple iPhones or other browsers,
                you can easily write this link to your NFC card using any free NFC app.
              </p>
            </div>

            {/* Step-by-step instructions */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                How to write in 3 easy steps:
              </h4>
              <ol className="text-[11px] text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                <li>
                  <span className="font-semibold text-white">Copy your Card URL</span> using the button below.
                </li>
                <li>
                  Open <span className="font-semibold text-indigo-300">NFC Tools</span> (Free on Google Play &amp; Apple App Store).
                </li>
                <li>
                  Tap <span className="font-semibold text-emerald-300">Write &gt; Add a record &gt; Custom URL / URI</span>, paste the link, and tap your physical NFC card!
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* Stable URL Box */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Your Stable NFC Tap URL
          </label>
          <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
            <span className="text-slate-200 font-mono text-[11px] truncate pr-2">{cardUrl}</span>
            <button
              onClick={handleCopy}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {copied ? 'Copied! ✓' : 'Copy URL'}
            </button>
          </div>
        </div>

        {/* Close footer */}
        <div className="pt-1">
          <button
            onClick={onClose}
            className="w-full py-2 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
