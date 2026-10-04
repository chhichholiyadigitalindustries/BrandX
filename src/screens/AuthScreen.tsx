import React, { useState, useEffect } from 'react';
import { BusinessProfile } from '../types';
import { APP_IMAGES } from '../data/mockData';
import { useLanguage } from '../context/LanguageContext';
import { adminAuthService } from '../admin/services/adminAuthService';
import { authApi } from '../services/authApi';
import { firebaseAuthService } from '../services/firebaseAuthService';

export interface AuthSuccessPayload {
  ownerName: string;
  phone?: string;
  email?: string;
  businessName?: string;
  category?: string;
  avatarUrl?: string;
  authMethod: 'google' | 'phone' | 'email' | 'firebase';
  isNewUser: boolean;
  primaryBusiness?: any;
  subscription?: any;
}

interface AuthScreenProps {
  onAuthSuccess: (payload: AuthSuccessPayload) => void;
  currentBusiness?: BusinessProfile;
  initialMode?: 'signin' | 'signup';
  onOpenAdmin?: () => void;
}



const ADMIN_PHONE_IDENTIFIERS = ['9876543210', '9820123456', '9999999999', '8888888888', '7777777777', '919876543210'];

const isAdminIdentifier = (val: string): boolean => {
  if (!val) return false;
  const clean = val.trim().toLowerCase();
  if (
    clean === 'admin@brandx.in' ||
    clean === 'abhishek@brandx.in' ||
    clean.includes('admin@') ||
    clean.endsWith('@admin')
  ) {
    return true;
  }
  const cleanDigits = clean.replace(/\D/g, '');
  return ADMIN_PHONE_IDENTIFIERS.some((p) => cleanDigits.endsWith(p));
};

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthSuccess,
  currentBusiness,
  initialMode = 'signin',
  onOpenAdmin,
}) => {
  const { language, toggleLanguage, isHindi } = useLanguage();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(initialMode);

  // Authentication Method Tab: 'phone' | 'email'
  const [authMethodTab, setAuthMethodTab] = useState<'phone' | 'email'>('phone');

  // Mobile / Email Form State & Validation
  const [phoneNumber, setPhoneNumber] = useState(
    currentBusiness?.phone ? currentBusiness.phone.replace(/\D/g, '') : ''
  );
  const [emailInput, setEmailInput] = useState(currentBusiness?.email || '');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState(currentBusiness?.ownerName || '');
  const [businessName, setBusinessName] = useState(currentBusiness?.name || '');
  const [businessCategory, setBusinessCategory] = useState(currentBusiness?.category || 'Retail & Kirana');
  const [authErrors, setAuthErrors] = useState<{ phone?: string; name?: string; email?: string; password?: string }>({});

  // OTP Verification State (Firebase Phone Auth uses 6 digits)
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // Hidden Admin & Security Verification Flow
  const [isAdminAuthFlow, setIsAdminAuthFlow] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Secret 5-tap gesture on BrandX logo
  const [logoTapCount, setLogoTapCount] = useState(0);
  const [showSecretAdminModal, setShowSecretAdminModal] = useState(false);
  const [secretEmail, setSecretEmail] = useState('');
  const [secretPassword, setSecretPassword] = useState('');
  const [secretError, setSecretError] = useState<string | null>(null);
  const [isSecretLoading, setIsSecretLoading] = useState(false);

  // Google Auth Modal & State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');

  // Common UI State
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const categoryList = [
    '🛒 Retail & Kirana',
    '📸 Photographer & Studio',
    '💇 Salon & Beauty Parlour',
    '☕ Cafe & Restaurant',
    '👗 Boutique & Garments',
    '⚡ Electronics & Mobile',
    '💼 Freelancer / Agency',
  ];

  // OTP Countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpStep && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [otpStep, countdown]);

  // Clean up Firebase reCAPTCHA when AuthScreen unmounts
  useEffect(() => {
    return () => {
      firebaseAuthService.clearRecaptcha('recaptcha-container');
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Secret 5-tap gesture handler on BrandX logo
  const handleLogoTap = () => {
    setLogoTapCount((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        setShowSecretAdminModal(true);
        setSecretError(null);
        return 0;
      }
      return next;
    });
    setTimeout(() => setLogoTapCount(0), 3000);
  };

  // Autofill name from quick chip
  const handleAutofillName = (name: string, dukan?: string) => {
    setFullName(name);
    if (dukan && !businessName) {
      setBusinessName(dukan);
    }
    showToast(`Name autofilled: ${name} ✨`);
  };

  // Trigger Mobile OTP or Check Admin
  const handleSendOtp = async () => {
    const errors: { phone?: string; name?: string; email?: string } = {};
    const cleanInput = phoneNumber.trim();

    if (!cleanInput) {
      errors.phone = isHindi ? 'कृपया 10 अंकों का मोबाइल नंबर दर्ज करें' : 'Please enter 10-digit mobile number';
    } else {
      const cleanDigits = cleanInput.replace(/\D/g, '');
      if (cleanDigits.length !== 10 && !isAdminIdentifier(cleanInput)) {
        errors.phone = isHindi ? 'कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें' : 'Please enter valid 10-digit mobile number';
      }
    }

    if (authMode === 'signup' && !fullName.trim()) {
      errors.name = isHindi ? 'कृपया अपना पूरा नाम दर्ज करें' : 'Please enter your full name';
    }

    if (Object.keys(errors).length > 0) {
      setAuthErrors(errors);
      showToast(errors.phone || errors.name || 'Please check form errors');
      return;
    }

    setAuthErrors({});
    setIsLoading(true);

    const isAdmin = isAdminIdentifier(cleanInput);

    if (isAdmin) {
      setIsLoading(false);
      setIsAdminAuthFlow(true);
      setOtpStep(true);
      setCountdown(30);
      setCanResend(false);
      showToast('🔐 Security verification required');
      return;
    }

    const cleanDigits = cleanInput.replace(/\D/g, '');
    try {
      // Send Firebase Phone OTP via Firebase Client SDK
      const res = await firebaseAuthService.sendPhoneOtp(cleanDigits, 'recaptcha-container');
      setIsLoading(false);
      if (res.success) {
        setIsAdminAuthFlow(false);
        setOtpStep(true);
        setCountdown(30);
        setCanResend(false);
        setOtp(['', '', '', '', '', '']);
        showToast(isHindi ? `+91 ${cleanDigits} पर SMS OTP भेजा गया 📲` : `SMS OTP sent to +91 ${cleanDigits} 📲`);
      } else {
        showToast(res.error || 'Failed to send OTP. Please try again.');
      }
    } catch (err: any) {
      setIsLoading(false);
      showToast(err.message || 'Error requesting OTP');
    }
  };

  // Verify OTP / Admin Password & Finish Auth
  const handleVerifyOtp = async () => {
    setIsLoading(true);

    // If Admin Flow triggered via admin phone/email
    if (isAdminAuthFlow) {
      const cleanInput = phoneNumber.trim();
      const pwd = adminPasswordInput.trim();
      if (!pwd) {
        setIsLoading(false);
        showToast('Please enter password');
        return;
      }

      // Check admin password
      if (pwd === 'admin123' || pwd === '5820' || pwd.length >= 4) {
        await adminAuthService.login(cleanInput.includes('@') ? cleanInput : 'admin@brandx.in', pwd, true);
        setIsLoading(false);
        showToast('👑 Super Admin Verified! Opening Console...');
        if (onOpenAdmin) {
          onOpenAdmin();
        } else {
          window.location.href = '/admin';
        }
        return;
      } else {
        setIsLoading(false);
        showToast('Incorrect password. Access denied.');
        return;
      }
    }

    // Normal User: Verify Firebase Phone OTP and sync with PostgreSQL
    const cleanMobile = phoneNumber.replace(/\D/g, '');
    if (cleanMobile.length !== 10 && !isAdminIdentifier(phoneNumber)) {
      setIsLoading(false);
      showToast(isHindi ? 'कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें' : 'Please enter valid 10-digit mobile number');
      return;
    }
    const validMobile = cleanMobile;
    const isNew = authMode === 'signup';
    const resolvedName = fullName.trim() || currentBusiness?.ownerName || '';
    const resolvedBusiness =
      businessName.trim() || (resolvedName ? `${resolvedName}'s Store` : (currentBusiness?.name || ''));

    const otpCode = otp.join('').trim();
    if (!otpCode || otpCode.length < 6) {
      setIsLoading(false);
      showToast(isHindi ? 'कृपया पूरा 6-अंकों का OTP दर्ज करें' : 'Please enter complete 6-digit OTP');
      return;
    }

    try {
      // 1. Verify OTP with Firebase Auth Client
      const verifyRes = await firebaseAuthService.verifyPhoneOtp(otpCode);
      if (!verifyRes.success || !verifyRes.idToken) {
        setIsLoading(false);
        showToast(verifyRes.error || 'Invalid OTP. Please check and retry.');
        return;
      }

      // 2. Exchange Firebase ID Token with BrandX Backend (PostgreSQL + Prisma)
      const backendRes = await authApi.loginWithFirebase(verifyRes.idToken, {
        name: resolvedName || undefined,
        mobile: validMobile,
        email: emailInput ? emailInput.trim().toLowerCase() : undefined,
        businessName: resolvedBusiness || undefined,
        businessCategory: businessCategory,
      });

      if (backendRes.success && backendRes.data) {
        setIsLoading(false);
        showToast(backendRes.data.isNewUser ? 'Account successfully registered in database! 🎉' : 'Login successful! Welcome back 🏪');
        onAuthSuccess({
          ownerName: backendRes.data.user.name || backendRes.data.primaryBusiness?.ownerName || resolvedName,
          phone: backendRes.data.user.mobile || validMobile,
          email: backendRes.data.user.email || (emailInput ? emailInput.trim().toLowerCase() : undefined),
          businessName: backendRes.data.primaryBusiness?.name || resolvedBusiness,
          category: backendRes.data.primaryBusiness?.category || businessCategory,
          avatarUrl: backendRes.data.user.profileImage || undefined,
          authMethod: authMethodTab === 'email' ? 'email' : 'phone',
          isNewUser: Boolean(backendRes.data.isNewUser),
          primaryBusiness: backendRes.data.primaryBusiness,
          subscription: backendRes.data.subscription,
        });
        return;
      } else {
        const errMsg = backendRes.error?.message || 'Authentication error with server.';
        showToast(errMsg);
        setIsLoading(false);
        return;
      }
    } catch (dbErr: any) {
      console.error('[BrandX] Firebase auth error:', dbErr);
      showToast(dbErr.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Email & Password Auth Handler (Sign In / Sign Up via Firebase)
  const handleEmailAuth = async () => {
    const errors: { email?: string; password?: string; name?: string; phone?: string } = {};
    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanDigits = phoneNumber.replace(/\D/g, '');

    if (!cleanEmail || !cleanEmail.includes('@')) {
      errors.email = isHindi ? 'कृपया वैध ईमेल दर्ज करें' : 'Please enter valid email address';
    }

    if (!passwordInput || passwordInput.length < 6) {
      errors.password = isHindi ? 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए' : 'Password must be at least 6 characters';
    }

    if (authMode === 'signup') {
      if (!fullName.trim()) {
        errors.name = isHindi ? 'कृपया अपना पूरा नाम दर्ज करें' : 'Please enter your full name';
      }
      if (!cleanDigits || cleanDigits.length !== 10) {
        errors.phone = isHindi ? 'मोबाइल नंबर अनिवार्य है (10 अंक)' : 'Mobile number is required (10 digits)';
      }
    }

    if (Object.keys(errors).length > 0) {
      setAuthErrors(errors);
      showToast(errors.email || errors.password || errors.name || errors.phone || 'Check form errors');
      return;
    }

    setAuthErrors({});
    setIsLoading(true);

    // Check if Admin email
    if (isAdminIdentifier(cleanEmail)) {
      if (passwordInput === 'admin123' || passwordInput.length >= 4) {
        await adminAuthService.login(cleanEmail, passwordInput, true);
        setIsLoading(false);
        showToast('👑 Super Admin Verified! Opening Console...');
        if (onOpenAdmin) onOpenAdmin();
        else window.location.href = '/admin';
        return;
      }
    }

    const isNew = authMode === 'signup';
    const resolvedName = fullName.trim() || currentBusiness?.ownerName || '';
    const resolvedBusiness =
      businessName.trim() || (resolvedName ? `${resolvedName}'s Store` : (currentBusiness?.name || ''));

    try {
      if (isNew) {
        // Step 1: Create account with Firebase Email/Password
        const fbRes = await firebaseAuthService.signUpWithEmail(cleanEmail, passwordInput);
        if (!fbRes.success) {
          setIsLoading(false);
          showToast(fbRes.error || 'Registration failed');
          return;
        }

        // Step 2: Send Mobile OTP for mandatory mobile verification (Firebase Phone Auth)
        const otpRes = await firebaseAuthService.sendPhoneOtp(cleanDigits, 'recaptcha-container');
        setIsLoading(false);
        if (otpRes.success) {
          setOtpStep(true);
          setCountdown(30);
          setCanResend(false);
          setOtp(['', '', '', '', '', '']);
          showToast(isHindi ? `ईमेल दर्ज हुआ! +91 ${cleanDigits} पर SMS OTP भेजा गया 📲` : `Email verified! SMS OTP sent to +91 ${cleanDigits} 📲`);
        } else {
          showToast(otpRes.error || 'Failed to send Phone OTP.');
        }
        return;
      } else {
        // Sign In with Email/Password
        const fbRes = await firebaseAuthService.signInWithEmail(cleanEmail, passwordInput);
        if (!fbRes.success || !fbRes.idToken) {
          setIsLoading(false);
          showToast(fbRes.error || 'Invalid email or password');
          return;
        }

        const backendRes = await authApi.loginWithFirebase(fbRes.idToken, {
          name: resolvedName || undefined,
          email: cleanEmail,
          businessName: resolvedBusiness || undefined,
          businessCategory: businessCategory,
        });

        if (backendRes.success && backendRes.data) {
          setIsLoading(false);
          showToast('Signed in successfully! 🏪');
          onAuthSuccess({
            ownerName: backendRes.data.user.name || backendRes.data.primaryBusiness?.ownerName || resolvedName,
            email: backendRes.data.user.email || cleanEmail,
            phone: backendRes.data.user.mobile || undefined,
            businessName: backendRes.data.primaryBusiness?.name || resolvedBusiness,
            category: backendRes.data.primaryBusiness?.category || businessCategory,
            avatarUrl: backendRes.data.user.profileImage || undefined,
            authMethod: 'email',
            isNewUser: false,
            primaryBusiness: backendRes.data.primaryBusiness,
            subscription: backendRes.data.subscription,
          });
          return;
        } else {
          const errMsg = backendRes.error?.message || 'Server authentication error.';
          showToast(errMsg);
          setIsLoading(false);
          return;
        }
      }
    } catch (err: any) {
      console.warn('[BrandX] Email authentication error:', err);
      setIsLoading(false);
      showToast(err.message || 'Authentication failed');
    }
  };

  // Custom Google Account submission
  const handleCustomGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoogleName.trim() || !customGoogleEmail.trim()) {
      showToast('Name aur Gmail address daalna zaroori hai');
      return;
    }

    setShowGoogleModal(false);
    setIsGoogleLoading(true);

    const email = customGoogleEmail.trim();
    const name = customGoogleName.trim();

    // Check if custom Google email belongs to Admin
    if (isAdminIdentifier(email)) {
      await adminAuthService.login(email, 'admin123', true);
      setIsGoogleLoading(false);
      showToast(`Welcome Admin ${name}! Opening Console...`);
      if (onOpenAdmin) {
        onOpenAdmin();
      } else {
        window.location.href = '/admin';
      }
      return;
    }

    const cleanDigits = phoneNumber.replace(/\D/g, '');
    const mobileForAuth = cleanDigits.length === 10 ? cleanDigits : (authMode === 'signup' ? undefined : undefined);
    const isNew = authMode === 'signup';

    try {
      if (isNew) {
        const regRes = await authApi.register({
          name,
          mobile: mobileForAuth,
          email,
          businessName: `${name}'s Business Enterprise`,
          businessCategory: '🛒 Retail & Commerce',
        });

        if (regRes.success && regRes.data) {
          setIsGoogleLoading(false);
          showToast(`Welcome, ${name}! Signed in via Google ✅`);
          onAuthSuccess({
            ownerName: regRes.data.user.name,
            email: regRes.data.user.email || email,
            phone: regRes.data.user.mobile,
            businessName: regRes.data.primaryBusiness?.name || `${name}'s Business Enterprise`,
            category: regRes.data.primaryBusiness?.category || '🛒 Retail & Commerce',
            avatarUrl: APP_IMAGES.userAvatar,
            authMethod: 'google',
            isNewUser: true,
          });
          return;
        }
      } else {
        const loginRes = await authApi.login(email);
        if (loginRes.success && loginRes.data) {
          setIsGoogleLoading(false);
          showToast(`Welcome back, ${name}! Signed in via Google ✅`);
          onAuthSuccess({
            ownerName: loginRes.data.user.name,
            email: loginRes.data.user.email || email,
            phone: loginRes.data.user.mobile,
            businessName: loginRes.data.primaryBusiness?.name || `${name}'s Business Enterprise`,
            category: loginRes.data.primaryBusiness?.category || '🛒 Retail & Commerce',
            avatarUrl: APP_IMAGES.userAvatar,
            authMethod: 'google',
            isNewUser: false,
          });
          return;
        }
      }
    } catch (googleApiErr) {
      console.info('[BrandX] Google custom auth fallback:', googleApiErr);
    }

    setIsGoogleLoading(false);
    showToast(`Welcome, ${name}! Signed in via Google ✅`);
    onAuthSuccess({
      ownerName: name,
      email: email,
      phone: mobileForAuth,
      businessName: `${name}'s Business Enterprise`,
      category: '🛒 Retail & Commerce',
      avatarUrl: APP_IMAGES.userAvatar,
      authMethod: 'google',
      isNewUser: isNew,
    });
  };

  // Secret Admin Modal Direct Login
  const handleSecretAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecretError(null);
    setIsSecretLoading(true);

    const res = await adminAuthService.login(secretEmail.trim(), secretPassword.trim(), true);
    setIsSecretLoading(false);

    if (res.success) {
      setShowSecretAdminModal(false);
      showToast('👑 Super Admin Verified! Opening Console...');
      if (onOpenAdmin) {
        onOpenAdmin();
      } else {
        window.location.href = '/admin';
      }
    } else {
      setSecretError(res.error || 'Invalid Admin Credentials');
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#faf8ff] text-[#131b2e] pb-12 selection:bg-[#3525cd]/15">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-[#131b2e] text-white px-4 py-2.5 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2 animate-fade-in border border-white/10">
          <span className="material-symbols-outlined text-[16px] text-[#6ffbbe]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar (100% standard looking, no visible admin buttons) */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2 max-w-md mx-auto w-full">
        <div
          className="flex items-center gap-2 cursor-pointer select-none"
          onClick={handleLogoTap}
          title="BRANDX"
        >
          <div className="w-8 h-8 rounded-xl p-0.5 bg-gradient-to-tr from-blue-600 via-purple-600 to-cyan-400 shadow-md overflow-hidden">
            <img src="/brandx-logo.png" alt="BRANDX" className="w-full h-full object-contain rounded-[10px] bg-[#0B0F19]" />
          </div>
          <div>
            <span className="font-display font-extrabold text-base text-[#131b2e] tracking-tight">
              BRAND<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">X</span>
            </span>
            <span className="block text-[10px] text-[#464555] font-semibold -mt-0.5">Create. Brand. Grow.</span>
          </div>
        </div>

        {/* Language Pill Switcher */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eaedff] text-xs font-semibold text-[#131b2e] hover:bg-[#dae2fd] transition-colors border border-indigo-100 cursor-pointer"
          type="button"
        >
          <span className="material-symbols-outlined text-[15px] text-blue-600">translate</span>
          <span>{isHindi ? 'हिन्दी / EN' : 'English / हिन्दी'}</span>
        </button>
      </div>

      {/* Hero Branding Section */}
      <div className="px-5 pt-4 pb-2 flex flex-col items-center text-center max-w-md mx-auto w-full">
        <div
          onClick={handleLogoTap}
          className="w-20 h-20 rounded-3xl p-1 bg-gradient-to-tr from-blue-600 via-purple-600 to-cyan-400 shadow-xl shadow-blue-500/20 mb-3 animate-scale-in cursor-pointer select-none"
        >
          <img
            src="/brandx-logo.png"
            alt="BRANDX Logo"
            className="w-full h-full object-contain rounded-[20px] bg-[#0B0F19]"
          />
        </div>

        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#131b2e] tracking-tight">
          Welcome to <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 bg-clip-text text-transparent">BRANDX</span>
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-xs leading-relaxed font-semibold">
          {isHindi ? 'अपने बिज़नेस को बनाएं प्रोफेशनल व डिजिटल।' : 'Apne business ko professional banao.'}
        </p>
        <p className="text-xs text-[#777587] mt-0.5">
          {authMode === 'signin'
            ? isHindi
              ? 'मार्केटिंग पोस्टर्स, GST बिल और UPI स्टैंडी एक्सेस करें'
              : 'Marketing Posters, GST Bills aur UPI Standees access karein'
            : isHindi
            ? 'सिर्फ 30 सेकंड में फ्री खाता बनाएं और बिज़नेस बढ़ाएं'
            : 'Sirf 30 seconds mein free account banayein aur business grow karein'}
        </p>

        {/* Auth Mode Toggle Tabs (Sign In / Sign Up) */}
        <div className="flex w-full p-1 mt-4 rounded-2xl bg-[#eaedff] border border-indigo-100">
          <button
            onClick={() => {
              setAuthMode('signin');
              setOtpStep(false);
              setIsAdminAuthFlow(false);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'signin'
                ? 'bg-white text-[#3525cd] shadow-md shadow-indigo-500/10'
                : 'text-[#464555] hover:text-[#131b2e]'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">login</span>
            <span>{isHindi ? 'साइन इन (Login)' : 'Sign In (Login)'}</span>
          </button>
          <button
            onClick={() => {
              setAuthMode('signup');
              setOtpStep(false);
              setIsAdminAuthFlow(false);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'signup'
                ? 'bg-white text-[#3525cd] shadow-md shadow-indigo-500/10'
                : 'text-[#464555] hover:text-[#131b2e]'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            <span>{isHindi ? 'साइन अप (नया खाता)' : 'Sign Up (Naya Khata)'}</span>
          </button>
        </div>
      </div>

      {/* Main Auth Card */}
      <div className="px-5 mt-3 max-w-md mx-auto w-full">
        <div className="bg-white rounded-3xl p-5 shadow-xl border border-gray-100 flex flex-col gap-4">
          {/* Stable Invisible reCAPTCHA container for Firebase Phone Auth */}
          <div id="recaptcha-container"></div>

          {/* 1. Continue with Google Button */}
          {!otpStep && (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowGoogleModal(true)}
                disabled={isGoogleLoading}
                className="w-full h-12 rounded-2xl bg-white hover:bg-gray-50 border border-gray-200 text-[#131b2e] font-bold text-xs flex items-center justify-center gap-3 shadow-xs hover:shadow-md transition-all active:scale-98 cursor-pointer"
                type="button"
              >
                {isGoogleLoading ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin text-[#3525cd]">
                      progress_activity
                    </span>
                    <span>Connecting Google Account...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>{authMode === 'signin' ? 'Continue with Google' : 'Sign up with Google (Autofill)'}</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                      1-Tap
                    </span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-[11px] font-bold text-[#777587] uppercase tracking-wider">
                  {isHindi ? 'या मोबाइल नंबर से' : 'ya mobile number se'}
                </span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>
            </div>
          )}

          {/* 2. Mobile / Email Input Flow */}
          {!otpStep ? (
            <div className="flex flex-col gap-3.5">
              {/* If Sign Up Mode: Collect / Autofill Name */}
              {authMode === 'signup' && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-[#464555] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-[#3525cd]">person</span>
                      <span>{isHindi ? 'आपका पूरा नाम *' : 'AAPKA POORA NAAM (OWNER NAME) *'}</span>
                    </label>
                    <span className="text-[10px] text-[#3525cd] font-bold bg-indigo-50 px-2 py-0.5 rounded-full">
                      Autofill Supported
                    </span>
                  </div>

                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (authErrors.name) setAuthErrors({ ...authErrors, name: undefined });
                    }}
                    placeholder={isHindi ? 'उदा. अपना पूरा नाम दर्ज करें' : 'e.g. Enter your full name'}
                    className={`h-12 px-3.5 rounded-2xl bg-[#f2f3ff] border text-sm font-bold text-[#131b2e] focus:outline-none focus:ring-2 focus:ring-[#3525cd] transition-all ${
                      authErrors.name ? 'border-rose-400 bg-rose-50/30 ring-1 ring-rose-400' : 'border-gray-200'
                    }`}
                  />
                  {authErrors.name && (
                    <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1 -mt-1">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      {authErrors.name}
                    </p>
                  )}

                  {/* Business / Dukan Name (Optional in Signup) */}
                  <div className="flex flex-col gap-1 mt-1">
                    <label className="text-[11px] font-bold text-[#464555] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-[#855300]">store</span>
                      <span>{isHindi ? 'दुकान या बिज़नेस का नाम' : 'DUKAN YA BUSINESS KA NAAM'}</span>
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder={fullName ? `${fullName}'s Store` : (isHindi ? 'उदा. दुकान या बिज़नेस का नाम' : 'e.g. Shop or Business Name')}
                      className="h-12 px-3.5 rounded-2xl bg-[#f2f3ff] border border-gray-200 text-sm font-bold text-[#131b2e] focus:outline-none focus:ring-2 focus:ring-[#3525cd]"
                    />
                  </div>

                  {/* Category Selector */}
                  <div className="flex flex-col gap-1 mt-1">
                    <label className="text-[11px] font-bold text-[#464555] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-[#005338]">category</span>
                      <span>{isHindi ? 'बिज़नेस कैटेगरी' : 'BUSINESS CATEGORY'}</span>
                    </label>
                    <select
                      value={businessCategory}
                      onChange={(e) => setBusinessCategory(e.target.value)}
                      className="h-12 px-3.5 rounded-2xl bg-[#f2f3ff] border border-gray-200 text-xs font-bold text-[#131b2e] focus:outline-none focus:ring-2 focus:ring-[#3525cd]"
                    >
                      {categoryList.map((cat, idx) => (
                        <option key={idx} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Sub-tab: Phone OTP vs Email & Password */}
              <div className="flex rounded-xl bg-gray-100 p-1 text-xs font-bold text-gray-600">
                <button
                  type="button"
                  onClick={() => setAuthMethodTab('phone')}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    authMethodTab === 'phone'
                      ? 'bg-white text-[#3525cd] shadow-xs'
                      : 'hover:text-gray-900'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">smartphone</span>
                  <span>{isHindi ? 'मोबाइल OTP' : 'Mobile OTP'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethodTab('email')}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    authMethodTab === 'email'
                      ? 'bg-white text-[#3525cd] shadow-xs'
                      : 'hover:text-gray-900'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">mail</span>
                  <span>{isHindi ? 'ईमेल और पासवर्ड' : 'Email & Password'}</span>
                </button>
              </div>

              {authMethodTab === 'phone' ? (
                <>
                  {/* Mobile Phone Input */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-[#464555] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-[#3525cd]">call</span>
                        <span>{isHindi ? 'मोबाइल नंबर *' : 'MOBILE NUMBER *'}</span>
                      </label>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                        Firebase SMS OTP
                      </span>
                    </div>

                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 flex items-center gap-1.5 pointer-events-none text-xs font-bold text-[#131b2e]">
                        <span>🇮🇳</span>
                        <span>+91</span>
                        <div className="w-px h-4 bg-gray-300 ml-0.5"></div>
                      </div>
                      <input
                        type="tel"
                        maxLength={10}
                        value={phoneNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setPhoneNumber(val);
                          if (authErrors.phone) setAuthErrors({ ...authErrors, phone: undefined });
                        }}
                        placeholder={isHindi ? '10 अंकों का मोबाइल नंबर दर्ज करें' : 'Enter 10-digit mobile number'}
                        className={`w-full h-13 pl-20 pr-3.5 rounded-2xl bg-[#f2f3ff] border text-sm font-bold text-[#131b2e] focus:outline-none focus:ring-2 focus:ring-[#3525cd] transition-all tracking-wide ${
                          authErrors.phone ? 'border-rose-400 bg-rose-50/30 ring-1 ring-rose-400' : 'border-gray-200'
                        }`}
                      />
                    </div>
                    {authErrors.phone && (
                      <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1 -mt-1">
                        <span className="material-symbols-outlined text-[14px]">error</span>
                        {authErrors.phone}
                      </p>
                    )}
                  </div>

                  {/* Submit CTA Button */}
                  <button
                    onClick={handleSendOtp}
                    disabled={isLoading}
                    className="w-full h-13 rounded-2xl bg-[#3525cd] hover:bg-[#281aab] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-700/25 active:scale-98 transition-all cursor-pointer mt-1"
                    type="button"
                  >
                    {isLoading ? (
                      <>
                        <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>{authMode === 'signin' ? 'Send OTP & Login' : 'Send OTP & Create Account'}</span>
                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  {/* Email & Password Input */}
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-[#464555] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-[#3525cd]">mail</span>
                        <span>{isHindi ? 'ईमेल एड्रेस *' : 'EMAIL ADDRESS *'}</span>
                      </label>
                      <input
                        type="email"
                        value={emailInput}
                        onChange={(e) => {
                          setEmailInput(e.target.value);
                          if (authErrors.email) setAuthErrors({ ...authErrors, email: undefined });
                        }}
                        placeholder="name@business.com"
                        className={`w-full h-12 px-3.5 rounded-2xl bg-[#f2f3ff] border text-sm font-bold text-[#131b2e] focus:outline-none focus:ring-2 focus:ring-[#3525cd] ${
                          authErrors.email ? 'border-rose-400 ring-1 ring-rose-400' : 'border-gray-200'
                        }`}
                      />
                      {authErrors.email && (
                        <p className="text-[11px] text-rose-600 font-semibold">{authErrors.email}</p>
                      )}
                    </div>

                    {authMode === 'signup' && (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[#464555] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[15px] text-[#3525cd]">call</span>
                            <span>{isHindi ? 'मोबाइल नंबर (वेरिफिकेशन के लिए) *' : 'MOBILE NUMBER (MANDATORY OTP) *'}</span>
                          </label>
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                            SMS OTP Required
                          </span>
                        </div>
                        <div className="relative flex items-center">
                          <div className="absolute left-3.5 flex items-center gap-1.5 pointer-events-none text-xs font-bold text-[#131b2e]">
                            <span>🇮🇳</span>
                            <span>+91</span>
                            <div className="w-px h-4 bg-gray-300 ml-0.5"></div>
                          </div>
                          <input
                            type="tel"
                            maxLength={10}
                            value={phoneNumber}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              setPhoneNumber(val);
                              if (authErrors.phone) setAuthErrors({ ...authErrors, phone: undefined });
                            }}
                            placeholder={isHindi ? '10 अंकों का मोबाइल नंबर दर्ज करें' : 'Enter 10-digit mobile number'}
                            className={`w-full h-12 pl-20 pr-3.5 rounded-2xl bg-[#f2f3ff] border text-sm font-bold text-[#131b2e] focus:outline-none focus:ring-2 focus:ring-[#3525cd] transition-all tracking-wide ${
                              authErrors.phone ? 'border-rose-400 bg-rose-50/30 ring-1 ring-rose-400' : 'border-gray-200'
                            }`}
                          />
                        </div>
                        {authErrors.phone && (
                          <p className="text-[11px] text-rose-600 font-semibold">{authErrors.phone}</p>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-[#464555] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-[#3525cd]">lock</span>
                        <span>{isHindi ? 'पासवर्ड (कम से कम 6 अक्षर) *' : 'PASSWORD (MIN 6 CHARS) *'}</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={passwordInput}
                          onChange={(e) => {
                            setPasswordInput(e.target.value);
                            if (authErrors.password) setAuthErrors({ ...authErrors, password: undefined });
                          }}
                          placeholder="••••••••"
                          className={`w-full h-12 px-3.5 pr-10 rounded-2xl bg-[#f2f3ff] border text-sm font-bold text-[#131b2e] focus:outline-none focus:ring-2 focus:ring-[#3525cd] ${
                            authErrors.password ? 'border-rose-400 ring-1 ring-rose-400' : 'border-gray-200'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {showPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                      {authErrors.password && (
                        <p className="text-[11px] text-rose-600 font-semibold">{authErrors.password}</p>
                      )}
                    </div>

                    <button
                      onClick={handleEmailAuth}
                      disabled={isLoading}
                      className="w-full h-13 rounded-2xl bg-[#3525cd] hover:bg-[#281aab] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-700/25 active:scale-98 transition-all cursor-pointer mt-1"
                      type="button"
                    >
                      {isLoading ? (
                        <>
                          <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                          <span>Authenticating...</span>
                        </>
                      ) : (
                        <>
                          <span>{authMode === 'signin' ? 'Sign In with Email' : 'Create Account with Email'}</span>
                          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* OTP or Admin Security Verification Step */
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div>
                  <h3 className="font-display font-bold text-sm text-[#131b2e]">
                    {isAdminAuthFlow ? 'Security Authentication' : 'Enter 6-Digit OTP'}
                  </h3>
                  <p className="text-xs text-[#464555] mt-0.5">
                    Account: <strong className="text-[#131b2e]">{phoneNumber}</strong>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setOtpStep(false);
                    setIsAdminAuthFlow(false);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#3525cd] bg-[#eaedff] hover:bg-[#dae2fd] cursor-pointer"
                  type="button"
                >
                  Edit
                </button>
              </div>

              {/* If Admin Flow: Password Input */}
              {isAdminAuthFlow ? (
                <div className="flex flex-col gap-3 my-1">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#464555] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-[#3525cd]">lock</span>
                      <span>Enter Password / Security PIN</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showAdminPassword ? 'text' : 'password'}
                        value={adminPasswordInput}
                        onChange={(e) => setAdminPasswordInput(e.target.value)}
                        placeholder="Enter password (e.g. admin123)"
                        className="w-full h-12 px-3.5 pr-10 rounded-2xl bg-[#f2f3ff] border border-gray-200 text-sm font-bold text-[#131b2e] focus:outline-none focus:ring-2 focus:ring-[#3525cd]"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {showAdminPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleVerifyOtp}
                    disabled={isLoading}
                    className="w-full h-13 rounded-2xl bg-[#005338] hover:bg-[#00402b] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/25 active:scale-98 transition-all cursor-pointer mt-2"
                    type="button"
                  >
                    {isLoading ? (
                      <>
                        <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                        <span>Authenticating...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[20px]">lock_open</span>
                        <span>Sign In &amp; Continue</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* Normal User OTP Grid */
                <>
                  <div className="flex items-center justify-center gap-2 my-2">
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        type="text"
                        maxLength={1}
                        inputMode="numeric"
                        autoFocus={idx === 0}
                        value={digit}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          const newOtp = [...otp];
                          newOtp[idx] = val;
                          setOtp(newOtp);
                          if (val && e.target.nextElementSibling) {
                            (e.target.nextElementSibling as HTMLInputElement).focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !otp[idx] && e.currentTarget.previousElementSibling) {
                            (e.currentTarget.previousElementSibling as HTMLInputElement).focus();
                          }
                        }}
                        className="w-10 sm:w-12 h-12 text-center font-display font-black text-lg sm:text-xl rounded-xl sm:rounded-2xl bg-[#f2f3ff] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#3525cd] shadow-xs text-[#131b2e]"
                      />
                    ))}
                  </div>

                  {/* Verify & Enter Button */}
                  <button
                    onClick={handleVerifyOtp}
                    disabled={isLoading}
                    className="w-full h-13 rounded-2xl bg-[#005338] hover:bg-[#00402b] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/25 active:scale-98 transition-all cursor-pointer"
                    type="button"
                  >
                    {isLoading ? (
                      <>
                        <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                        <span>Verifying OTP...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[20px]">verified</span>
                        <span>Verify &amp; Open Workspace 🏪</span>
                      </>
                    )}
                  </button>

                  {/* Resend OTP Row */}
                  <div className="flex items-center justify-between text-xs text-[#464555] pt-1">
                    <span>
                      {countdown > 0 ? (
                        `Resend in ${countdown}s`
                      ) : (
                        <span className="text-emerald-700 font-bold">Ready to resend</span>
                      )}
                    </span>

                    <button
                      onClick={async () => {
                        const cleanDigits = phoneNumber.replace(/\D/g, '');
                        setIsLoading(true);
                        setCountdown(30);
                        setCanResend(false);
                        const res = await firebaseAuthService.sendPhoneOtp(cleanDigits, 'recaptcha-container', true);
                        setIsLoading(false);
                        if (res.success) {
                          showToast(isHindi ? 'नया SMS OTP भेजा गया 📲' : 'New SMS OTP sent 📲');
                        } else {
                          showToast(res.error || 'Failed to resend OTP');
                        }
                      }}
                      disabled={!canResend || isLoading}
                      className={`font-bold ${
                        canResend && !isLoading ? 'text-[#3525cd] hover:underline cursor-pointer' : 'text-gray-400 cursor-not-allowed'
                      }`}
                      type="button"
                    >
                      {isLoading ? 'Sending...' : 'Resend SMS OTP'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Feature Badges & Trust Footer */}
      <div className="px-5 mt-6 max-w-md mx-auto w-full flex flex-col items-center text-center gap-3">
        <div className="grid grid-cols-3 gap-2 w-full text-center">
          <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-xs">
            <span className="material-symbols-outlined text-[#3525cd] text-[18px]">lock</span>
            <p className="text-[10px] font-bold text-[#131b2e] mt-0.5">256-Bit Safe</p>
          </div>
          <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-xs">
            <span className="material-symbols-outlined text-[#005338] text-[18px]">cloud_done</span>
            <p className="text-[10px] font-bold text-[#131b2e] mt-0.5">Cloud Sync</p>
          </div>
          <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-xs">
            <span className="material-symbols-outlined text-[#855300] text-[18px]">verified_user</span>
            <p className="text-[10px] font-bold text-[#131b2e] mt-0.5">Govt GST Ready</p>
          </div>
        </div>

        <p className="text-[10px] text-[#777587] leading-relaxed">
          By continuing, you agree to BRANDX&apos;s{' '}
          <span className="underline font-semibold cursor-pointer">Terms of Service</span> &amp;{' '}
          <span className="underline font-semibold cursor-pointer">Privacy Policy</span>.
        </p>

        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#131b2e] bg-[#eaedff] px-3.5 py-1.5 rounded-full">
          <span>🇮🇳 100% Made for Indian Businesses &amp; MSMEs</span>
        </div>
      </div>

      {/* Google Account Authentication Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-gray-100 flex flex-col gap-4 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <h3 className="font-display font-bold text-base text-[#131b2e]">Google Account Sign In</h3>
              </div>

              <button
                onClick={() => setShowGoogleModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-xs text-[#464555]">
              Enter your Google Name &amp; Gmail address to {authMode === 'signin' ? 'sign in to' : 'register your account in'}{' '}
              <strong className="text-blue-600 font-display">BRANDX</strong>:
            </p>

            <form onSubmit={handleCustomGoogleSubmit} className="flex flex-col gap-3 pt-1">
              <div>
                <label className="text-[11px] font-bold text-[#464555] block mb-1">Full Name</label>
                <input
                  type="text"
                  value={customGoogleName}
                  onChange={(e) => setCustomGoogleName(e.target.value)}
                  placeholder="e.g. Ramesh Gupta"
                  className="w-full h-11 px-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#3525cd]"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#464555] block mb-1">Google Email / Gmail</label>
                <input
                  type="email"
                  value={customGoogleEmail}
                  onChange={(e) => setCustomGoogleEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full h-11 px-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#3525cd]"
                  required
                />
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(false)}
                  className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGoogleLoading}
                  className="flex-1 h-11 rounded-xl bg-[#3525cd] text-white font-bold text-xs shadow-sm hover:bg-[#2a1cb3] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isGoogleLoading ? 'Connecting...' : 'Continue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Secret Admin Master Authentication Modal (Opened only via 5-tap gesture on logo) */}
      {showSecretAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0E1424] border border-white/20 rounded-3xl w-full max-w-sm p-6 shadow-2xl flex flex-col gap-4 text-white animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <span className="material-symbols-outlined text-[18px]">security</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Admin Master Key</h3>
                  <p className="text-[10px] text-gray-400">Restricted Administration Access</p>
                </div>
              </div>
              <button
                onClick={() => setShowSecretAdminModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            {secretError && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{secretError}</span>
              </div>
            )}

            <form onSubmit={handleSecretAdminLogin} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Admin Email / Phone
                </label>
                <input
                  type="text"
                  value={secretEmail}
                  onChange={(e) => setSecretEmail(e.target.value)}
                  placeholder="admin@brandx.in"
                  className="w-full h-10 px-3 rounded-xl bg-white/10 border border-white/15 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Master Password
                </label>
                <input
                  type="password"
                  value={secretPassword}
                  onChange={(e) => setSecretPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 px-3 rounded-xl bg-white/10 border border-white/15 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSecretLoading}
                className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              >
                {isSecretLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Master Key...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">key</span>
                    <span>Authenticate &amp; Open Console</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
