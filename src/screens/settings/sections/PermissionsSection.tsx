import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../../context/LanguageContext';

interface AppPermission {
  id: string;
  name: string;
  nameHindi: string;
  icon: string;
  category: string;
  status: 'granted' | 'denied' | 'prompt' | 'managed-by-browser';
  whyNeeded: string;
  whyNeededHindi: string;
  howToChange: string;
  howToChangeHindi: string;
}

export const PermissionsSection: React.FC = () => {
  const { isHindi } = useLanguage();

  const [permissionsList, setPermissionsList] = useState<AppPermission[]>([
    {
      id: 'camera',
      name: 'Camera',
      nameHindi: 'कैमरा',
      icon: 'photo_camera',
      category: 'Hardware',
      status: 'prompt',
      whyNeeded: 'Used when you choose to scan physical vendor receipts/barcodes or capture live store photos for marketing posters.',
      whyNeededHindi: 'सप्लायर के बिल/बारकोड स्कैन करने या दुकान की फोटो खींचकर पोस्टर बनाने के लिए।',
      howToChange: 'Device Settings > Apps > BrandX > Permissions > Camera, or tap the Lock icon in browser URL bar.',
      howToChangeHindi: 'डिवाइस सेटिंग्स > ऐप्स > BrandX > अनुमतियाँ > कैमरा, या ब्राउज़र URL में लॉक आइकन पर टैप करें।',
    },
    {
      id: 'microphone',
      name: 'Microphone',
      nameHindi: 'माइक्रोफ़ोन (वॉइस इनपुट)',
      icon: 'mic',
      category: 'Hardware',
      status: 'prompt',
      whyNeeded: 'Used exclusively when you activate AI Voice Copilot or Voice-to-Bill assistant to dictate bill items hands-free.',
      whyNeededHindi: 'AI वॉइस कोपायलट या बोलकर बिल बनाने (Voice Billing) के लिए वॉइस कमांड रिकॉर्ड करने हेतु।',
      howToChange: 'Device Settings > Apps > BrandX > Permissions > Microphone, or tap the Lock icon in browser URL bar.',
      howToChangeHindi: 'डिवाइस सेटिंग्स > ऐप्स > BrandX > अनुमतियाँ > माइक्रोफ़ोन, या ब्राउज़र में साइट सेटिंग्स बदलें।',
    },
    {
      id: 'notifications',
      name: 'Notifications',
      nameHindi: 'सूचनाएं (Notifications)',
      icon: 'notifications',
      category: 'System',
      status: 'prompt',
      whyNeeded: 'Used for daily status greeting reminders, customer payment alerts, and billing completion updates.',
      whyNeededHindi: 'दैनिक त्योहार स्टेटस रिमाइंडर, कस्टमर पेमेंट अलर्ट और महत्वपूर्ण बिलिंग सूचनाओं के लिए।',
      howToChange: 'Device Settings > Apps > BrandX > Notifications > Allow, or tap Lock icon in URL bar > Notifications.',
      howToChangeHindi: 'डिवाइस सेटिंग्स > ऐप्स > BrandX > सूचनाएं > चालू करें, या ब्राउज़र नोटिफिकेशन टॉगल करें।',
    },
    {
      id: 'storage',
      name: 'Photos, Files & Storage',
      nameHindi: 'फ़ोटो, फ़ाइलें और स्टोरेज',
      icon: 'folder_open',
      category: 'Storage',
      status: 'granted',
      whyNeeded: 'Used to save GST Tax Invoices (PDF/JPG), UPI payment QR standees, and festival graphics directly to your device gallery or downloads folder.',
      whyNeededHindi: 'GST इनवॉइस PDF, QR स्टैंडी और त्योहार पोस्टर्स को डिवाइस गैलरी में सेव करने के लिए।',
      howToChange: 'Device Settings > Apps > BrandX > Permissions > Photos and Videos / Storage.',
      howToChangeHindi: 'डिवाइस सेटिंग्स > ऐप्स > BrandX > अनुमतियाँ > फ़ोटो और वीडियो / स्टोरेज।',
    },
    {
      id: 'contacts',
      name: 'Contacts (Optional)',
      nameHindi: 'संपर्क (वैकल्पिक)',
      icon: 'contacts',
      category: 'Utility',
      status: 'prompt',
      whyNeeded: 'Allows optionally selecting a customer\'s mobile number from your address book when creating an invoice or Khata record without manual typing.',
      whyNeededHindi: 'बिल या खाता बनाते समय ग्राहक का फ़ोन नंबर संपर्क सूची से आसानी से चुनने के लिए (वैकल्पिक)।',
      howToChange: 'Device Settings > Apps > BrandX > Permissions > Contacts.',
      howToChangeHindi: 'डिवाइस सेटिंग्स > ऐप्स > BrandX > अनुमतियाँ > संपर्क।',
    },
  ]);

  // Query actual browser permission states where standard navigator API is supported
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      // Check Notifications
      if ('Notification' in window) {
        const notifState = Notification.permission as 'granted' | 'denied' | 'default';
        setPermissionsList((prev) =>
          prev.map((p) =>
            p.id === 'notifications'
              ? { ...p, status: notifState === 'default' ? 'prompt' : notifState }
              : p
          )
        );
      }

      // Check Camera / Mic if supported
      try {
        navigator.permissions.query({ name: 'camera' as any }).then((res) => {
          setPermissionsList((prev) =>
            prev.map((p) =>
              p.id === 'camera' ? { ...p, status: res.state as any } : p
            )
          );
        }).catch(() => {});

        navigator.permissions.query({ name: 'microphone' as any }).then((res) => {
          setPermissionsList((prev) =>
            prev.map((p) =>
              p.id === 'microphone' ? { ...p, status: res.state as any } : p
            )
          );
        }).catch(() => {});
      } catch {}
    }
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'granted':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Granted</span>
          </span>
        );
      case 'denied':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800/80 px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>Blocked / Denied</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/80 px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>On Demand</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header Banner */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
            <span className="material-symbols-outlined text-[30px]">tune</span>
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white">
              {isHindi ? 'ऐप अनुमतियाँ व डेटा नियंत्रण' : 'App Permissions & Data Controls'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isHindi
                ? 'BrandX केवल वही अनुमतियाँ मांगता है जो व्यावसायिक उपयोग के लिए आवश्यक हैं।'
                : 'BrandX requests only essential permissions required for shopkeeping tasks.'}
            </p>
          </div>
        </div>

        <span className="text-[11px] font-bold text-indigo-300 bg-indigo-950/60 border border-indigo-800 px-3 py-1 rounded-full shrink-0">
          5 Core Permissions
        </span>
      </div>

      {/* 2. Principle Card */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-2 text-xs text-slate-300">
        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-400 text-[18px]">gavel</span>
          <span>{isHindi ? 'हमारा सिद्धांत: न्यूनतम अनुमतियाँ' : 'Our Policy: Zero Unnecessary Access'}</span>
        </h4>
        <p className="leading-relaxed text-slate-400 text-[11px]">
          We never request background location tracking, call history logs, SMS inbox reading, or device biometric credentials. Every permission is requested only at the exact moment you invoke the corresponding business feature.
        </p>
      </div>

      {/* 3. Detailed Permissions List */}
      <div className="space-y-3">
        {permissionsList.map((perm) => (
          <div
            key={perm.id}
            className="p-4 sm:p-5 rounded-3xl bg-slate-900/70 border border-slate-800/80 shadow-lg space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 text-blue-400 flex items-center justify-center border border-slate-700">
                  <span className="material-symbols-outlined text-[22px]">{perm.icon}</span>
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <span>{isHindi ? perm.nameHindi : perm.name}</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded-md bg-slate-800 text-slate-400 font-mono">
                      {perm.category}
                    </span>
                  </h4>
                  <span className="text-[10px] text-slate-500">ID: {perm.id}</span>
                </div>
              </div>

              {getStatusBadge(perm.status)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800/60 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                  {isHindi ? 'BrandX को इसकी आवश्यकता क्यों है:' : 'Why BrandX Needs It:'}
                </span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {isHindi ? perm.whyNeededHindi : perm.whyNeeded}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                  {isHindi ? 'सेटिंग्स में कैसे बदलें:' : 'How to Change in Settings:'}
                </span>
                <p className="text-slate-400 text-[11px] font-mono leading-relaxed bg-slate-950/60 p-2 rounded-xl border border-slate-800/50">
                  {isHindi ? perm.howToChangeHindi : perm.howToChange}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
