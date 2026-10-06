import React, { useState } from 'react';
import { BusinessProfile } from '../types';
import { APP_IMAGES } from '../data/mockData';
import { useLanguage } from '../context/LanguageContext';
import { businessApi } from '../services/businessApi';
import { resolveImageUrl } from '../utils/imageUrl';
import { mediaApi } from '../services/mediaApi';

interface OnboardingScreenProps {
  business: BusinessProfile;
  onSaveBusiness: (profile: BusinessProfile) => void;
  onContinue: () => void;
  onOpenPrivacyPolicy?: () => void;
  onOpenPlayStore?: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  business,
  onSaveBusiness,
  onContinue,
  onOpenPrivacyPolicy,
  onOpenPlayStore,
}) => {
  const { t, isHindi } = useLanguage();
  const [formData, setFormData] = useState<BusinessProfile>({
    ...business,
    bankName: business.bankName || '',
    accountNumber: business.accountNumber || '',
    ifscCode: business.ifscCode || '',
    accountHolderName: business.accountHolderName || business.ownerName || '',
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(business.logoUrl || null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'payment'>('profile');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    name?: string;
    ownerName?: string;
    address?: string;
    city?: string;
    pincode?: string;
    upiId?: string;
    gstin?: string;
  }>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const categories = [
    '🛒 Retail & Kirana',
    '📸 Photographer & Studio',
    '💇 Salon & Spa',
    '☕ Cafe & Bakery',
    '👗 Boutique & Clothes',
    '⚡ Electronics & Mobile',
    '🏋️ Gym & Fitness',
    '💼 Freelancer / Agency',
  ];

  const popularBanks = [
    'State Bank of India (SBI)',
    'HDFC Bank',
    'ICICI Bank',
    'Punjab National Bank (PNB)',
    'Axis Bank',
    'Bank of Baroda',
    'Kotak Mahindra Bank',
    'Paytm Payments Bank',
    'Airtel Payments Bank',
  ];

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const localUrl = URL.createObjectURL(file);
      setLogoPreview(localUrl);
      showToast('Uploading shop logo... ⏳');
      try {
        const uploadRes = await mediaApi.uploadImage(file, 'logos', 'business');
        setFormData((prev) => ({ ...prev, logoUrl: uploadRes.url }));
        setLogoPreview(uploadRes.url);
        showToast('Shop logo uploaded and saved! 📸');
      } catch (err: any) {
        console.error('Logo upload error:', err);
        showToast(err.message || 'Failed to upload logo.');
      }
    }
  };

  const validateForm = (): boolean => {
    const errs: typeof errors = {};

    if (!formData.name.trim()) {
      errs.name = isHindi ? 'कृपया दुकान या व्यवसाय का नाम दर्ज करें' : 'Shop / Business name is required';
    }
    if (!formData.ownerName.trim()) {
      errs.ownerName = isHindi ? 'कृपया मालिक का पूरा नाम दर्ज करें' : 'Owner full name is required';
    }
    if (!formData.address.trim()) {
      errs.address = isHindi ? 'कृपया दुकान का पता दर्ज करें' : 'Address is required';
    }
    if (!formData.city.trim()) {
      errs.city = isHindi ? 'शहर का नाम दर्ज करें' : 'City is required';
    }

    const pin = formData.pincode ? formData.pincode.replace(/\D/g, '') : '';
    if (pin && pin.length !== 6) {
      errs.pincode = isHindi ? 'पिनकोड 6 अंकों का होना चाहिए' : 'Pincode must be exactly 6 digits';
    }

    if (formData.hasGst && formData.gstin) {
      if (formData.gstin.trim().length !== 15) {
        errs.gstin = isHindi ? 'GSTIN 15 अक्षरों का होना चाहिए' : 'GSTIN must be exactly 15 characters';
      }
    }

    if (activeTab === 'payment' || formData.upiId) {
      if (!formData.upiId.trim() || !formData.upiId.includes('@')) {
        errs.upiId = isHindi ? 'मान्य UPI ID दर्ज करें (उदा. shop@okaxis)' : 'Valid UPI ID required (e.g. shop@okaxis)';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showToast(isHindi ? 'कृपया आवश्यक फ़ील्ड भरें' : 'Please fix the required fields');
      return;
    }

    setIsSaving(true);

    try {
      if (business?.id && !business.id.startsWith('temp_')) {
        await businessApi.updateBusiness(business.id, {
          name: formData.name,
          ownerName: formData.ownerName,
          category: formData.category,
          mobile: formData.phone || formData.mobile,
          email: formData.email,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          gstin: formData.hasGst ? formData.gstin : undefined,
          pan: formData.pan,
          logoUrl: formData.logoUrl,
          upiId: formData.upiId,
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          ifscCode: formData.ifscCode,
          accountHolderName: formData.accountHolderName,
          invoicePrefix: formData.invoicePrefix || 'INV',
          invoiceTerms: formData.invoiceTerms,
        });
      } else {
        const createRes = await businessApi.createBusiness({
          name: formData.name,
          ownerName: formData.ownerName,
          category: formData.category,
          mobile: formData.phone || formData.mobile || '',
          email: formData.email,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode || '',
          gstin: formData.hasGst ? formData.gstin : undefined,
          pan: formData.pan,
          logoUrl: formData.logoUrl,
          upiId: formData.upiId,
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          ifscCode: formData.ifscCode,
          accountHolderName: formData.accountHolderName,
          invoicePrefix: formData.invoicePrefix || 'INV',
          invoiceTerms: formData.invoiceTerms,
        });

        if (createRes.success && createRes.data?.id) {
          formData.id = createRes.data.id;
        }
      }
    } catch (apiErr) {
      console.info('[BrandX] Business profile saved with local sync:', apiErr);
    }

    setIsSaving(false);
    setIsSuccess(true);
    onSaveBusiness(formData);
    showToast('Profile & Payment details saved successfully! ✅');
    setTimeout(() => {
      setIsSuccess(false);
      onContinue();
    }, 600);
  };

  return (
    <div className="flex flex-col w-full pb-36 bg-[#faf8ff] text-[#131b2e] min-h-screen selection:bg-[#3525cd]/15">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-[#131b2e] text-white px-4 py-2.5 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2 animate-fade-in border border-white/10">
          <span className="material-symbols-outlined text-[16px] text-[#6ffbbe]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Heading */}
      <div className="px-4 pt-5 pb-4 bg-gradient-to-b from-[#eaedff] to-[#faf8ff] border-b border-indigo-100/60 shadow-xs">
        <div className="max-w-lg mx-auto w-full flex flex-col gap-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffddb8] text-[#422200] w-max text-xs font-bold shadow-2xs">
            <span className="material-symbols-outlined text-[15px]">storefront</span>
            <span>{isHindi ? 'व्यापार प्रोफ़ाइल & भुगतान सेटअप' : 'Business Profile & KYC Setup'}</span>
          </div>
          
          <h1 className="font-display font-extrabold text-2xl text-[#131b2e] tracking-tight mt-0.5">
            {isHindi ? 'अपनी दुकान की जानकारी सेट करें 🏪' : 'Setup Your Business Profile 🏪'}
          </h1>
          <p className="text-xs text-[#464555] leading-relaxed font-medium">
            {isHindi 
              ? 'ये विवरण आपके GST इनवॉइस, UPI स्टैंडी और मार्केटिंग पोस्टर्स पर प्रिंट होंगे।' 
              : 'These details will appear on your GST tax invoices, UPI standees, and marketing banners.'}
          </p>

          {/* Quick Sub-Navigation Tabs */}
          <div className="flex w-full p-1 mt-3 rounded-2xl bg-white shadow-xs border border-indigo-100">
            <button
              onClick={() => setActiveTab('profile')}
              type="button"
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-[#3525cd] text-white shadow-sm shadow-indigo-500/20'
                  : 'text-[#464555] hover:text-[#131b2e]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">business</span>
              <span>1. {isHindi ? 'दुकान & पता' : 'Shop & Address'}</span>
            </button>
            <button
              onClick={() => setActiveTab('payment')}
              type="button"
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'payment'
                  ? 'bg-[#005338] text-white shadow-sm shadow-emerald-700/20'
                  : 'text-[#464555] hover:text-[#131b2e]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">account_balance</span>
              <span>2. {isHindi ? 'UPI & बैंक खाता' : 'UPI & Bank'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Form Content Container */}
      <div className="px-4 py-4 flex flex-col gap-5 max-w-lg mx-auto w-full">

        {/* TAB 1: Dukan & Address Details */}
        {activeTab === 'profile' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            
            {/* Storefront Logo / Photo Uploader */}
            <div className="p-4 rounded-3xl bg-white shadow-xs border border-gray-100 flex flex-col items-center text-center relative overflow-hidden">
              <label className="relative group cursor-pointer flex flex-col items-center">
                <div className="w-24 h-24 rounded-2xl bg-[#f2f3ff] flex flex-col items-center justify-center text-[#3525cd] transition-all shadow-inner group-hover:bg-[#eaedff] overflow-hidden border-2 border-dashed border-indigo-200">
                  {logoPreview ? (
                    <img
                      src={resolveImageUrl(logoPreview)}
                      alt="Shop Logo"
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-[36px] text-[#3525cd]">
                      add_a_photo
                    </span>
                  )}
                </div>
                <span className="mt-2 text-xs font-bold text-[#3525cd] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                  {logoPreview ? (isHindi ? 'लोगो बदलें' : 'Change Shop Logo') : (isHindi ? '+ लोगो / फोटो जोड़ें' : '+ Add Logo / Photo')}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleImageChange}
                />
              </label>
              <p className="mt-1 text-[11px] text-[#464555]">
                {isHindi ? 'बिल और इनवॉइस के हेडर पर आपकी दुकान का लोगो दिखेगा' : 'Appears on invoice headers and QR standees'}
              </p>
            </div>

            {/* Non-Editable / Locked Credentials Card (Phone & Email) */}
            <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex flex-col gap-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-amber-700">lock</span>
                  <span>{isHindi ? 'सुरक्षित प्रमाणित क्रेडेंशियल्स' : 'Locked Verified Credentials'}</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full">
                  Verified
                </span>
              </div>
              <p className="text-[11px] text-amber-900/80 leading-tight">
                {isHindi 
                  ? 'आपका पंजीकृत मोबाइल नंबर और ईमेल सुरक्षा कारणों से लॉक हैं।' 
                  : 'Your registered mobile phone number and Google account are security-protected.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                {/* Verified Mobile Number */}
                <div className="p-2.5 rounded-xl bg-white border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0">
                      phone_iphone
                    </span>
                    <div className="min-w-0">
                      <span className="text-[10px] text-gray-400 font-bold block uppercase">Mobile Number</span>
                      <span className="text-xs font-bold text-[#131b2e] truncate">
                        {formData.phone ? `+91 ${formData.phone}` : 'Not set'}
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <span className="material-symbols-outlined text-[12px]">verified</span>
                    <span>Verified</span>
                  </span>
                </div>

                {/* Email Section: Verified for Email auth, Editable & Optional for Phone auth */}
                {formData.authMethod === 'email' && formData.email ? (
                  <div className="p-2.5 rounded-xl bg-white border border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-[18px] text-blue-600 shrink-0">
                        mail
                      </span>
                      <div className="min-w-0">
                        <span className="text-[10px] text-gray-400 font-bold block uppercase">Email Address</span>
                        <span className="text-xs font-bold text-[#131b2e] truncate">
                          {formData.email}
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <span className="material-symbols-outlined text-[12px]">verified</span>
                      <span>Verified</span>
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-white border border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="material-symbols-outlined text-[18px] text-gray-400 shrink-0">
                        mail
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between pr-2">
                          <span className="text-[10px] text-gray-400 font-bold block uppercase">Email (Optional)</span>
                          <span className="text-[10px] font-semibold text-gray-400">Optional</span>
                        </div>
                        <input
                          type="email"
                          value={formData.email || ''}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value.trim().toLowerCase() })}
                          placeholder="Add email (Optional)"
                          className="w-full text-xs font-bold text-[#131b2e] bg-transparent focus:outline-none placeholder-gray-400"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Editable Fields Form with Validation */}
            <div className="bg-white rounded-3xl p-5 shadow-xs border border-gray-100 flex flex-col gap-4">
              
              {/* Business Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#464555] flex items-center justify-between">
                  <span>
                    {isHindi ? 'दुकान या बिज़नेस का नाम' : 'BUSINESS / SHOP NAME'} <span className="text-[#ba1a1a]">*</span>
                  </span>
                  <span className="text-[#3525cd] font-semibold text-[10px]">Printed on Bills</span>
                </label>
                <div className={`flex items-center rounded-2xl bg-[#f2f3ff] border px-3.5 h-12 focus-within:ring-2 focus-within:ring-[#3525cd]/40 transition-all ${
                  errors.name ? 'border-rose-500' : 'border-gray-200'
                }`}>
                  <span className="material-symbols-outlined text-[20px] text-[#464555] mr-2">
                    storefront
                  </span>
                  <input
                    className="w-full bg-transparent text-sm font-bold text-[#131b2e] focus:outline-none"
                    placeholder="e.g. My Business / Store Name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (errors.name) setErrors({ ...errors, name: undefined });
                    }}
                  />
                </div>
                {errors.name && <p className="text-[10px] text-rose-500 mt-0.5">{errors.name}</p>}
              </div>

              {/* Owner / Vyapari Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#464555]">
                  {isHindi ? 'मालिक / व्यापारी का नाम' : 'OWNER FULL NAME'} <span className="text-[#ba1a1a]">*</span>
                </label>
                <div className={`flex items-center rounded-2xl bg-[#f2f3ff] border px-3.5 h-12 focus-within:ring-2 focus-within:ring-[#3525cd]/40 transition-all ${
                  errors.ownerName ? 'border-rose-500' : 'border-gray-200'
                }`}>
                  <span className="material-symbols-outlined text-[20px] text-[#464555] mr-2">badge</span>
                  <input
                    className="w-full bg-transparent text-sm font-bold text-[#131b2e] focus:outline-none"
                    placeholder="e.g. Enter your name"
                    type="text"
                    value={formData.ownerName}
                    onChange={(e) => {
                      setFormData({ ...formData, ownerName: e.target.value });
                      if (errors.ownerName) setErrors({ ...errors, ownerName: undefined });
                    }}
                  />
                </div>
                {errors.ownerName && <p className="text-[10px] text-rose-500 mt-0.5">{errors.ownerName}</p>}
              </div>

              {/* Business Category Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-[#464555]">
                  {isHindi ? 'बिज़नेस श्रेणी' : 'BUSINESS CATEGORY'} <span className="text-[#ba1a1a]">*</span>
                </label>
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {categories.map((cat, idx) => {
                    const isSelected = formData.category === cat;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat })}
                        className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#3525cd] text-white shadow-sm'
                            : 'bg-[#eaedff] text-[#131b2e] hover:bg-[#dae2fd]'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Address / Dukan ka Pata */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#464555]">
                  {isHindi ? 'दुकान का पूरा पता' : 'FULL SHOP ADDRESS'} <span className="text-[#ba1a1a]">*</span>
                </label>
                <div className={`flex items-center rounded-2xl bg-[#f2f3ff] border px-3.5 h-12 focus-within:ring-2 focus-within:ring-[#3525cd]/40 transition-all ${
                  errors.address ? 'border-rose-500' : 'border-gray-200'
                }`}>
                  <span className="material-symbols-outlined text-[20px] text-[#464555] mr-2">
                    pin_drop
                  </span>
                  <input
                    className="w-full bg-transparent text-sm font-semibold text-[#131b2e] focus:outline-none"
                    placeholder="Shop / Building No, Market, Landmark"
                    type="text"
                    value={formData.address}
                    onChange={(e) => {
                      setFormData({ ...formData, address: e.target.value });
                      if (errors.address) setErrors({ ...errors, address: undefined });
                    }}
                  />
                </div>
                {errors.address && <p className="text-[10px] text-rose-500 mt-0.5">{errors.address}</p>}
              </div>

              {/* City & Pincode */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#464555]">
                    {isHindi ? 'शहर' : 'CITY'} <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <div className={`flex items-center rounded-2xl bg-[#f2f3ff] border px-3.5 h-12 focus-within:ring-2 focus-within:ring-[#3525cd]/40 transition-all ${
                    errors.city ? 'border-rose-500' : 'border-gray-200'
                  }`}>
                    <input
                      className="w-full bg-transparent text-sm font-semibold text-[#131b2e] focus:outline-none"
                      placeholder="e.g. Ahmedabad"
                      type="text"
                      value={formData.city}
                      onChange={(e) => {
                        setFormData({ ...formData, city: e.target.value });
                        if (errors.city) setErrors({ ...errors, city: undefined });
                      }}
                    />
                  </div>
                  {errors.city && <p className="text-[10px] text-rose-500 mt-0.5">{errors.city}</p>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#464555]">
                    {isHindi ? 'पिनकोड' : 'PINCODE'}
                  </label>
                  <div className={`flex items-center rounded-2xl bg-[#f2f3ff] border px-3.5 h-12 focus-within:ring-2 focus-within:ring-[#3525cd]/40 transition-all ${
                    errors.pincode ? 'border-rose-500' : 'border-gray-200'
                  }`}>
                    <input
                      className="w-full bg-transparent text-sm font-semibold text-[#131b2e] focus:outline-none"
                      placeholder="6 digit PIN"
                      maxLength={6}
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => {
                        setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '') });
                        if (errors.pincode) setErrors({ ...errors, pincode: undefined });
                      }}
                    />
                  </div>
                  {errors.pincode && <p className="text-[10px] text-rose-500 mt-0.5">{errors.pincode}</p>}
                </div>
              </div>

              {/* GST Registered Toggle & GSTIN Input */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/40 border border-indigo-100 flex flex-col gap-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#131b2e] block">
                      {isHindi ? 'क्या आपके पास GST Number (GSTIN) है?' : 'Do you have a GST Number (GSTIN)?'}
                    </span>
                    <span className="text-[11px] text-[#464555]">
                      {formData.hasGst ? (isHindi ? 'GST टैक्स इनवॉइस बनेंगे' : 'GST Tax Invoices enabled') : (isHindi ? 'सरल नॉन-जीएसटी बिल बनेंगे' : 'Simple Non-GST retail bills (0% tax)')}
                    </span>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={!!formData.hasGst}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          hasGst: e.target.checked,
                          gstin: e.target.checked ? formData.gstin : '',
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3525cd]"></div>
                  </label>
                </div>

                {formData.hasGst ? (
                  <div className="flex flex-col gap-1 pt-1 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-[#464555]">GOVT GST NUMBER (GSTIN)</label>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                        GST Enabled
                      </span>
                    </div>
                    <div className={`flex items-center rounded-2xl bg-white border px-3.5 h-12 focus-within:ring-2 focus-within:ring-[#3525cd]/40 transition-all ${
                      errors.gstin ? 'border-rose-500' : 'border-indigo-200'
                    }`}>
                      <span className="material-symbols-outlined text-[20px] text-[#3525cd] mr-2">
                        verified_user
                      </span>
                      <input
                        className="w-full bg-transparent text-sm font-bold text-[#131b2e] focus:outline-none uppercase tracking-wider"
                        placeholder="e.g. 24AABCS1429B1Z8"
                        type="text"
                        maxLength={15}
                        value={formData.gstin}
                        onChange={(e) => {
                          setFormData({ ...formData, gstin: e.target.value.toUpperCase() });
                          if (errors.gstin) setErrors({ ...errors, gstin: undefined });
                        }}
                      />
                    </div>
                    {errors.gstin && <p className="text-[10px] text-rose-500 mt-0.5">{errors.gstin}</p>}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold">
                    <span className="material-symbols-outlined text-[18px] text-emerald-700">check_circle</span>
                    <span>Non-GST Mode: Bina GST ke simple retail bills generate honge</span>
                  </div>
                )}
              </div>

              {/* Instagram Handle */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[#464555]">INSTAGRAM HANDLE</label>
                  <span className="text-[10px] text-gray-400 font-semibold">Optional</span>
                </div>
                <div className="flex items-center rounded-2xl bg-[#f2f3ff] border border-gray-200 px-3.5 h-12 focus-within:ring-2 focus-within:ring-[#3525cd]/40 transition-all">
                  <span className="material-symbols-outlined text-[20px] text-[#464555] mr-2">
                    alternate_email
                  </span>
                  <input
                    className="w-full bg-transparent text-sm font-semibold text-[#131b2e] focus:outline-none"
                    placeholder="yourshop.official"
                    type="text"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Next Tab Action Button */}
            <button
              onClick={() => {
                if (validateForm()) {
                  setActiveTab('payment');
                }
              }}
              className="w-full h-12 rounded-2xl bg-[#eaedff] hover:bg-[#dae2fd] text-[#3525cd] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              type="button"
            >
              <span>{isHindi ? 'आगे बढ़ें: पेमेंट & बैंक विवरण' : 'Next: Payment & Bank Details'}</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        )}

        {/* TAB 2: Payment & Bank Account Details */}
        {activeTab === 'payment' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            
            {/* Header Highlight for Payments */}
            <div className="p-4 rounded-3xl bg-gradient-to-tr from-[#005338] to-[#007a53] text-white shadow-md flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-200">
                  Customer Settlement Account
                </span>
                <span className="material-symbols-outlined text-[22px] text-emerald-300">
                  account_balance_wallet
                </span>
              </div>
              <h3 className="font-display font-extrabold text-lg text-white">
                {isHindi ? 'पेमेंट जिसपर मँगवाएँगे 💸' : 'Where Customers Will Pay You 💸'}
              </h3>
              <p className="text-xs text-emerald-100 leading-relaxed">
                {isHindi 
                  ? 'आपके बिल्स पर यही UPI QR कोड जनरेट होगा और पेमेंट सीधा आपके खाते में आएगी।' 
                  : 'This UPI ID will appear on all your invoices, table standees, and digital dukaan.'}
              </p>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-xs border border-gray-100 flex flex-col gap-4">
              
              {/* Primary UPI ID */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[#464555] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-emerald-700">qr_code_2</span>
                    <span>PRIMARY UPI ID / VPA <span className="text-[#ba1a1a]">*</span></span>
                  </label>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    GPay / PhonePe / Paytm
                  </span>
                </div>

                <div className={`flex items-center rounded-2xl bg-[#f2f3ff] border px-3.5 h-12 focus-within:ring-2 focus-within:ring-emerald-600/40 transition-all ${
                  errors.upiId ? 'border-rose-500' : 'border-gray-200'
                }`}>
                  <input
                    className="w-full bg-transparent text-sm font-bold text-[#131b2e] focus:outline-none"
                    placeholder="e.g. yourname@okhdfcbank or yourshop@paytm"
                    type="text"
                    value={formData.upiId}
                    onChange={(e) => {
                      setFormData({ ...formData, upiId: e.target.value.toLowerCase().trim() });
                      if (errors.upiId) setErrors({ ...errors, upiId: undefined });
                    }}
                  />
                  {formData.upiId.includes('@') && (
                    <span className="material-symbols-outlined text-emerald-600 text-[20px] shrink-0">
                      check_circle
                    </span>
                  )}
                </div>
                {errors.upiId && <p className="text-[10px] text-rose-500 mt-0.5">{errors.upiId}</p>}
              </div>

              {/* Account Holder Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#464555]">
                  BANK ACCOUNT HOLDER NAME
                </label>
                <div className="flex items-center rounded-2xl bg-[#f2f3ff] border border-gray-200 px-3.5 h-12 focus-within:ring-2 focus-within:ring-emerald-600/40 transition-all">
                  <span className="material-symbols-outlined text-[20px] text-[#464555] mr-2">person</span>
                  <input
                    className="w-full bg-transparent text-sm font-bold text-[#131b2e] focus:outline-none"
                    placeholder="Passbook account name"
                    type="text"
                    value={formData.accountHolderName}
                    onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                  />
                </div>
              </div>

              {/* Bank Name Selector */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#464555]">BANK NAME</label>
                <select
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="h-12 px-3.5 rounded-2xl bg-[#f2f3ff] border border-gray-200 text-xs font-bold text-[#131b2e] focus:outline-none focus:ring-2 focus:ring-emerald-600/40"
                >
                  {popularBanks.map((bank, idx) => (
                    <option key={idx} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bank Account Number */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#464555]">BANK ACCOUNT NUMBER</label>
                <div className="flex items-center rounded-2xl bg-[#f2f3ff] border border-gray-200 px-3.5 h-12 focus-within:ring-2 focus-within:ring-emerald-600/40 transition-all">
                  <span className="material-symbols-outlined text-[20px] text-[#464555] mr-2">
                    account_balance
                  </span>
                  <input
                    className="w-full bg-transparent text-sm font-semibold text-[#131b2e] focus:outline-none tracking-wider"
                    placeholder="Enter bank account number"
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
              </div>

              {/* Bank IFSC Code */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#464555]">BANK IFSC CODE</label>
                <div className="flex items-center rounded-2xl bg-[#f2f3ff] border border-gray-200 px-3.5 h-12 focus-within:ring-2 focus-within:ring-emerald-600/40 transition-all">
                  <span className="material-symbols-outlined text-[20px] text-[#464555] mr-2">password</span>
                  <input
                    className="w-full bg-transparent text-sm font-semibold text-[#131b2e] focus:outline-none uppercase tracking-wider"
                    placeholder="e.g. HDFC0001234"
                    type="text"
                    maxLength={11}
                    value={formData.ifscCode}
                    onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>
            </div>

            {/* Back to Profile Tab Button */}
            <button
              onClick={() => setActiveTab('profile')}
              className="w-full h-11 rounded-2xl bg-gray-100 hover:bg-gray-200 text-[#464555] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>{isHindi ? 'दुकान & पता विवरण देखें' : 'Back to Shop & Address Details'}</span>
            </button>
          </div>
        )}

        {/* Data Safety & Policy Badges */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-emerald-600">verified</span>
              100% Secure Cloud Synced Storage
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              NPCI Compliant
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Aapka bank account aur UPI data local storage mein securely store hota hai aur bills/standees generate karne ke kaam aata hai.
          </p>
          {onOpenPrivacyPolicy && (
            <button
              type="button"
              onClick={onOpenPrivacyPolicy}
              className="text-blue-600 hover:text-blue-800 text-xs font-semibold underline text-left cursor-pointer"
            >
              Privacy Policy &amp; Data Safety
            </button>
          )}
        </div>
      </div>

      {/* Sticky Bottom Actions Bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md px-4 pt-3 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.08)] border-t border-gray-100 flex flex-col gap-2 z-40">
        <div className="max-w-lg mx-auto w-full flex flex-col gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-13 rounded-2xl bg-[#3525cd] hover:bg-[#281ca8] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 active:scale-98 transition-all cursor-pointer"
            type="button"
          >
            {isSaving ? (
              <>
                <span className="material-symbols-outlined text-[20px] animate-spin">
                  progress_activity
                </span>
                <span>Saving Profile &amp; Payment Details...</span>
              </>
            ) : isSuccess ? (
              <>
                <span className="material-symbols-outlined text-[20px] text-[#6ffbbe]">
                  check_circle
                </span>
                <span>Profile Saved! Entering Studio 🚀</span>
              </>
            ) : (
              <>
                <span>Save Profile &amp; Enter Studio 🚀</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-center">
            <button
              onClick={onContinue}
              className="text-xs text-[#464555] hover:text-[#3525cd] transition-colors py-1 px-2 font-semibold cursor-pointer"
              type="button"
            >
              Skip for now &amp; Go to Home Studio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
