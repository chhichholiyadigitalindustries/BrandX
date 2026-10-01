import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
  title?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title,
}) => {
  const { isHindi } = useLanguage();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [hasTorchSupport, setHasTorchSupport] = useState(false);

  // Play audio beep on successful barcode scan
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  };

  // Start Camera Stream
  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    stopCamera();
    setCameraError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setHasCameraPermission(true);

      // Check for torch/flash capability
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? (track.getCapabilities() as any) : {};
      if (capabilities.torch) {
        setHasTorchSupport(true);
      }
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      setHasCameraPermission(false);
      setCameraError(err?.message || 'Unable to access device camera.');
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Toggle Torch/Flash
  const toggleFlash = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextState = !isFlashOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }],
      });
      setIsFlashOn(nextState);
    } catch (e) {
      console.warn('Flashlight toggle failed:', e);
    }
  };

  // Switch between front and back cameras
  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Continuous Barcode Detection loop using BarcodeDetector if available
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    let isScanning = true;
    let scanInterval: any = null;

    if ('BarcodeDetector' in window) {
      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
      });

      scanInterval = setInterval(async () => {
        if (!isScanning || !videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const barcodes = await barcodeDetector.detect(videoRef.current);
          if (barcodes.length > 0 && barcodes[0].rawValue) {
            isScanning = false;
            playBeep();
            stopCamera();
            onScanSuccess(barcodes[0].rawValue);
          }
        } catch {}
      }, 300);
    }

    return () => {
      isScanning = false;
      if (scanInterval) clearInterval(scanInterval);
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCodeInput.trim()) return;
    playBeep();
    stopCamera();
    onScanSuccess(manualCodeInput.trim());
  };

  const handleQuickDemoScan = (code: string) => {
    playBeep();
    stopCamera();
    onScanSuccess(code);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#131B2E] border border-white/20 rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 border-b border-white/10 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">barcode_scanner</span>
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight">
                {title || (isHindi ? 'बारकोड / क्यूआर स्कैनर' : 'Camera Barcode Scanner')}
              </h3>
              <p className="text-[10px] text-slate-400">Point camera at product barcode or scan code</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Video Viewport with Red Aiming Reticle */}
        <div className="relative w-full aspect-4/3 bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Scanner Reticle Overlay */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
            <div className="relative w-64 h-40 border-2 border-blue-400/80 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.3)]">
              {/* Corner marks */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400" />

              {/* Animated Red Laser Scan Line */}
              <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_#ef4444] animate-bounce top-1/2" />
            </div>
            <span className="text-[11px] font-bold text-white/80 bg-black/60 px-3 py-1 rounded-full mt-3 backdrop-blur-xs">
              {isHindi ? 'बारकोड को फ्रेम के बीच में रखें' : 'Align barcode within frame'}
            </span>
          </div>

          {/* Fallback info when camera permission is unavailable */}
          {hasCameraPermission === false && (
            <div className="absolute inset-0 bg-[#0B0F19]/90 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <span className="material-symbols-outlined text-4xl text-amber-400">videocam_off</span>
              <p className="text-xs text-slate-300">
                {cameraError || (isHindi ? 'कैमरा अनुमति उपलब्ध नहीं है' : 'Camera permission not granted')}
              </p>
              <button
                onClick={() => startCamera()}
                className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl"
              >
                {isHindi ? 'पुनः प्रयास करें' : 'Retry Camera'}
              </button>
            </div>
          )}

          {/* Camera Controls Bar */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 z-10">
            {hasTorchSupport && (
              <button
                onClick={toggleFlash}
                className={`p-2 rounded-xl backdrop-blur-md transition-all ${
                  isFlashOn ? 'bg-amber-400 text-black font-bold' : 'bg-black/60 text-white'
                }`}
                title="Toggle Torch"
              >
                <span className="material-symbols-outlined text-base">flashlight_on</span>
              </button>
            )}
            <button
              onClick={toggleCameraFacing}
              className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-md"
              title="Flip Camera"
            >
              <span className="material-symbols-outlined text-base">flip_camera_android</span>
            </button>
          </div>
        </div>

        {/* Manual Barcode & Quick Demo Section */}
        <div className="p-4 space-y-3 bg-[#0F172A] border-t border-white/10 text-white">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder={isHindi ? 'बारकोड नंबर टाइप करें (उदा. 890100100101)' : 'Enter barcode manually (e.g. 890100100101)'}
              value={manualCodeInput}
              onChange={(e) => setManualCodeInput(e.target.value)}
              className="flex-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow shrink-0"
            >
              {isHindi ? 'जोड़ें' : 'Scan'}
            </button>
          </form>

          {/* Quick Demo Barcodes for Quick Testing */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {isHindi ? 'त्वरित डेमो उत्पाद (क्लिक करें):' : 'Tap to test demo product barcodes:'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Studio Portrait (890100100101)', code: '890100100101' },
                { label: 'Wedding Video (890100100102)', code: '890100100102' },
                { label: 'Canvas Frame (890100100103)', code: '890100100103' },
                { label: 'Cappuccino (890100100104)', code: '890100100104' },
                { label: 'Passport Photo (890100100106)', code: '890100100106' },
              ].map((demo) => (
                <button
                  key={demo.code}
                  onClick={() => handleQuickDemoScan(demo.code)}
                  className="px-2 py-1 rounded-lg bg-white/5 hover:bg-blue-600/30 text-[10px] font-mono text-slate-300 hover:text-white border border-white/10 transition-colors"
                >
                  {demo.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
