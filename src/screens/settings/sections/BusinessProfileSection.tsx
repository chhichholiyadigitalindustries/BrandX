import React, { useState } from 'react';
import { BusinessProfile } from '../../../types';
import { businessApi } from '../../../services/businessApi';
import { useLanguage } from '../../../context/LanguageContext';
import { resolveImageUrl } from '../../../utils/imageUrl';
import { mediaApi } from '../../../services/mediaApi';

interface BusinessProfileSectionProps {
  business: BusinessProfile;
  onUpdateBusiness: (updated: BusinessProfile) => void;
}

const BUSINESS_CATEGORIES = [
  'Retail Store / किराना',
  'Garments & Clothing / वस्त्र',
  'Electronics & Mobile / इलेक्ट्रॉनिक्स',
  'Restaurant & Cafe / खान-पान',
  'Hardware & Electrical / हार्डवेयर',
  'Pharmacy & Medical / मेडिकल',
  'Salon & Beauty / सैलून',
  'Automobile & Garage / ऑटोमोबाइल',
  'Services & Consulting / सेवा व्यवसाय',
  'Wholesale & Distribution / थोक व्यापार',
  'Other / अन्य',
];

export const BusinessProfileSection: React.FC<BusinessProfileSectionProps> = ({
  business,
  onUpdateBusiness,
}) => {
  const { isHindi } = useLanguage();

  const [formData, setFormData] = useState({
    name: business.name || '',
    category: business.category || 'Retail Store / किराना',
    ownerName: business.ownerName || '',
    mobile: business.phone || business.mobile || '',
    email: business.email || '',
    address: business.address || '',
    city: business.city || '',
    state: business.state || '',
    pincode: business.pincode || '',
    gstin: business.gstin || '',
    pan: business.pan || '',
    upiId: business.upiId || '',
    logoUrl: business.logoUrl || '/brandx-logo.png',
    invoicePrefix: business.invoicePrefix || 'INV',
    invoiceTerms: business.invoiceTerms || 'Goods once sold cannot be returned. Thank you for your business!',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    setStatusMessage(null);
    try {
      const res = await mediaApi.uploadImage(file, 'logos', 'business', business.id);
      handleChange('logoUrl', res.url);
      setStatusMessage({
        type: 'success',
        text: isHindi ? 'लोगो सफलतापूर्वक अपलोड हो गया! सहेजने के लिए "सेव करें" दबाएं।' : 'Logo uploaded successfully! Click Save to apply changes.',
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || (isHindi ? 'लोगो अपलोड विफल रहा।' : 'Failed to upload logo.'),
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    // Validate GSTIN format if provided (15 characters)
    if (formData.gstin && formData.gstin.trim().length > 0 && formData.gstin.trim().length !== 15) {
      setIsSaving(false);
      setStatusMessage({
        type: 'error',
        text: isHindi ? 'कृपया 15 अक्षरों का मान्य GSTIN दर्ज करें।' : 'Please enter a valid 15-character GSTIN.',
      });
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        businessName: formData.name.trim(),
        category: formData.category,
        businessType: formData.category,
        ownerName: formData.ownerName.trim(),
        mobile: formData.mobile.trim(),
        email: formData.email.trim() || undefined,
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        gstin: formData.gstin.trim().toUpperCase(),
        pan: formData.pan.trim().toUpperCase(),
        upiId: formData.upiId.trim(),
        logoUrl: formData.logoUrl,
        invoicePrefix: formData.invoicePrefix.trim().toUpperCase(),
        invoiceTerms: formData.invoiceTerms.trim(),
      };

      // Call real backend API if business ID exists
      if (business.id) {
        const res = await businessApi.updateBusiness(business.id, payload);
        if (!res.success) {
          throw new Error(res.error?.message || 'Backend rejected profile update');
        }
      }

      // Merge and persist into local business state and storage cache
      const updatedBusiness: BusinessProfile = {
        ...business,
        ...payload,
        hasGst: !!payload.gstin,
        upiLinked: !!payload.upiId,
      };

      onUpdateBusiness(updatedBusiness);

      setStatusMessage({
        type: 'success',
        text: isHindi
          ? 'बिज़नेस प्रोफ़ाइल सुरक्षित रूप से डेटाबेस में सहेजी गई!'
          : 'Business profile successfully updated in database!',
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || (isHindi ? 'सहेजने में विफलता हुई।' : 'Failed to save business details.'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Banner */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
            <span className="material-symbols-outlined text-[30px]">storefront</span>
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white">
              {isHindi ? 'व्यापारिक प्रोफ़ाइल व KYC' : 'Business Profile & KYC'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isHindi
                ? 'सभी इनवॉइस, बिल, UPI स्टैंडी और डिजिटल दुकान पर यही विवरण दिखाई देगा।'
                : 'Details displayed on customer GST bills, invoices, standees, and storefront.'}
            </p>
          </div>
        </div>

        {business.id && (
          <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800 self-start sm:self-auto">
            Tenant ID: {business.id.slice(0, 8)}...
          </span>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-6">
        {statusMessage && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {statusMessage.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* 1. Basic Shop Info */}
        <div className="space-y-4">
          <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-400 text-[16px]">domain</span>
            <span>{isHindi ? '1. दुकान / फर्म का विवरण' : '1. Shop & Firm Identity'}</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Business Logo Upload */}
            <div className="md:col-span-2 p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-20 h-20 rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0 shadow-inner group">
                <img
                  src={resolveImageUrl(formData.logoUrl)}
                  alt="Business Logo"
                  className="w-full h-full object-contain p-1"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/brandx-logo.png';
                  }}
                />
                {isUploadingLogo && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <span className="material-symbols-outlined text-emerald-400 animate-spin text-[24px]">progress_activity</span>
                  </div>
                )}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="text-xs font-bold text-white mb-0.5">
                  {isHindi ? 'दुकान का लोगो / ट्रेडमार्क' : 'Shop / Business Logo'}
                </p>
                <p className="text-[11px] text-slate-400 mb-3">
                  {isHindi
                    ? 'यह लोगो आपके बिलों, पोस्टर्स और UPI स्टैंडी पर प्रिंट होगा (PNG, JPG, WebP - अधिकतम 10MB)'
                    : 'This logo will be printed on all invoices, marketing posters, and UPI standees (PNG, JPG, WebP max 10MB)'}
                </p>
                <label className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold cursor-pointer transition-colors">
                  <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                  <span>{isUploadingLogo ? (isHindi ? 'अपलोड हो रहा है...' : 'Uploading...') : (isHindi ? 'नया लोगो अपलोड करें' : 'Upload New Logo')}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={isUploadingLogo}
                    onChange={handleLogoFileChange}
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isHindi ? 'फर्म / दुकान का नाम *' : 'Business / Shop Name *'}
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs font-semibold focus:border-blue-500 focus:outline-hidden"
                placeholder="e.g. Sharma Kirana & General Store"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isHindi ? 'व्यापार श्रेणी (Category) *' : 'Business Category *'}
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs font-semibold focus:border-blue-500 focus:outline-hidden"
              >
                {BUSINESS_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-slate-900 text-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isHindi ? 'व्यापारी / प्रोप्राइटर का नाम *' : 'Owner / Proprietor Name *'}
              </label>
              <input
                type="text"
                required
                value={formData.ownerName}
                onChange={(e) => handleChange('ownerName', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs font-semibold focus:border-blue-500 focus:outline-hidden"
                placeholder="e.g. Ramesh Sharma"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isHindi ? 'व्यवसाय का लोगो URL' : 'Business Logo URL'}
              </label>
              <input
                type="text"
                value={formData.logoUrl}
                onChange={(e) => handleChange('logoUrl', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs font-mono focus:border-blue-500 focus:outline-hidden"
                placeholder="/brandx-logo.png or https://..."
              />
            </div>
          </div>
        </div>

        {/* 2. Tax & Financial Details (GSTIN, PAN, UPI) */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400 text-[16px]">account_balance</span>
            <span>{isHindi ? '2. टैक्स व भुगतान विवरण (GST, PAN & UPI)' : '2. Tax & Payment Credentials'}</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isHindi ? 'GSTIN (15 अक्षर)' : 'GSTIN (15 Digits)'}
              </label>
              <input
                type="text"
                maxLength={15}
                value={formData.gstin}
                onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs font-mono tracking-wider focus:border-emerald-500 focus:outline-hidden uppercase"
                placeholder="07AAAAA0000A1Z5"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                {isHindi ? 'GST बिलों पर स्वतः प्रिंट होगा' : 'Printed on Tax Invoices'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isHindi ? 'PAN नंबर' : 'PAN Number'}
              </label>
              <input
                type="text"
                maxLength={10}
                value={formData.pan}
                onChange={(e) => handleChange('pan', e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs font-mono tracking-wider focus:border-emerald-500 focus:outline-hidden uppercase"
                placeholder="ABCDE1234F"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isHindi ? 'UPI ID (VPA) *' : 'UPI ID (VPA) *'}
              </label>
              <input
                type="text"
                value={formData.upiId}
                onChange={(e) => handleChange('upiId', e.target.value.trim())}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs font-mono focus:border-emerald-500 focus:outline-hidden"
                placeholder="merchant@okhdfcbank"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                {isHindi ? 'QR कोड व बिल पेमेंट के लिए' : 'Used for QR Standee & Bill payments'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Address & Location */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-400 text-[16px]">location_on</span>
            <span>{isHindi ? '3. दुकान का पता व स्थान' : '3. Shop Address & Location'}</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isHindi ? 'दुकान का पूरा पता *' : 'Full Shop Address *'}
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-hidden"
                placeholder="Shop No. 12, Main Market"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isHindi ? 'शहर / ज़िला *' : 'City / District *'}
              </label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs focus:border-amber-500 focus:outline-hidden"
                placeholder="e.g. New Delhi"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isHindi ? 'पिन कोड *' : 'PIN Code *'}
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={formData.pincode}
                onChange={(e) => handleChange('pincode', e.target.value.replace(/\D/g, ''))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs font-mono focus:border-amber-500 focus:outline-hidden"
                placeholder="110001"
              />
            </div>
          </div>
        </div>

        {/* 4. Invoice & Billing Configuration */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-400 text-[16px]">receipt_long</span>
            <span>{isHindi ? '4. इनवॉइस व बिलिंग सेटिंग' : '4. Invoicing & Billing Settings'}</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isHindi ? 'इनवॉइस प्रीफ़िक्स (Invoice Prefix)' : 'Invoice Prefix'}
              </label>
              <input
                type="text"
                maxLength={6}
                value={formData.invoicePrefix}
                onChange={(e) => handleChange('invoicePrefix', e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs font-mono uppercase focus:border-indigo-500 focus:outline-hidden"
                placeholder="INV"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isHindi ? 'इनवॉइस नियम व शर्तें (Footer Terms)' : 'Invoice Terms & Conditions (Footer)'}
              </label>
              <input
                type="text"
                value={formData.invoiceTerms}
                onChange={(e) => handleChange('invoiceTerms', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs focus:border-indigo-500 focus:outline-hidden"
                placeholder="Goods once sold will not be taken back."
              />
            </div>
          </div>
        </div>

        {/* Save CTA */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            {isHindi ? 'परिवर्तन तुरंत आपके सुरक्षित क्लाउड खाते में सिंक होंगे।' : 'Changes sync directly to your secure cloud account.'}
          </p>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{isHindi ? 'डेटाबेस में सहेजा जा रहा है...' : 'Saving to Database...'}</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">cloud_sync</span>
                <span>{isHindi ? 'प्रोफ़ाइल सहेजें' : 'Save Business Profile'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
