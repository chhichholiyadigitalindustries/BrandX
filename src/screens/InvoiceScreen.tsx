import React, { useState, useEffect } from 'react';
import { InvoiceData, BusinessProfile, InvoiceItem, DocumentType, StoreProduct } from '../types';
import { InvoicePreviewModal } from '../components/InvoicePreviewModal';
import { useLanguage } from '../context/LanguageContext';
import { EmptyState } from '../components/EmptyState';
import { ConfirmModal } from '../components/ConfirmModal';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { invoiceApi, BackendInvoice } from '../services/invoiceApi';
import { customerKhataApi, BackendCustomer } from '../services/customerKhataApi';

interface InvoiceScreenProps {
  business: BusinessProfile;
  invoice: InvoiceData;
  products?: StoreProduct[];
  onUpdateInvoice: (data: InvoiceData) => void;
  onNavigateToBusiness: () => void;
  isPro?: boolean;
  onOpenPro?: () => void;
}

const INDIAN_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

export const InvoiceScreen: React.FC<InvoiceScreenProps> = ({
  business,
  invoice,
  products = [],
  onUpdateInvoice,
  onNavigateToBusiness,
  isPro = false,
  onOpenPro,
}) => {
  const { t, isHindi } = useLanguage();

  // Top Tabs: 'create' (Create Bill / POS) | 'history' (Invoices History)
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  // Modals
  const [showPreview, setShowPreview] = useState(false);
  const [previewingInvoice, setPreviewingInvoice] = useState<any>(null);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showCatalogDrawer, setShowCatalogDrawer] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InvoiceItem | null>(null);

  // Payment Recording Modal
  const [payingInvoice, setPayingInvoice] = useState<BackendInvoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Cancellation Modal
  const [cancellingInvoice, setCancellingInvoice] = useState<BackendInvoice | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // History state
  const [invoicesList, setInvoicesList] = useState<BackendInvoice[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [historyDocFilter, setHistoryDocFilter] = useState('all');
  const [summaryData, setSummaryData] = useState<any>(null);

  // Customers
  const [customers, setCustomers] = useState<BackendCustomer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Creation State
  const [isSaving, setIsSaving] = useState(false);
  const [amountPaidInput, setAmountPaidInput] = useState<string>('');
  const [placeOfSupply, setPlaceOfSupply] = useState<string>(business.state || 'Gujarat');
  const [buyerGstin, setBuyerGstin] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch customers on mount
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await customerKhataApi.listCustomers({ limit: 100 });
        if (res.success && res.data) {
          setCustomers(res.data);
        }
      } catch (err) {
        console.error('Error fetching customers:', err);
      }
    };
    fetchCustomers();
  }, []);

  // Fetch invoices history whenever history tab is active
  const loadInvoicesHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const [listRes, sumRes] = await Promise.all([
        invoiceApi.listInvoices({
          search: historySearch || undefined,
          status: historyStatusFilter !== 'all' ? historyStatusFilter : undefined,
          documentType: historyDocFilter !== 'all' ? historyDocFilter : undefined,
          limit: 50,
        }),
        invoiceApi.getInvoiceSummary(),
      ]);

      if (listRes.success && listRes.data) {
        setInvoicesList(listRes.data);
      }
      if (sumRes.success && sumRes.data) {
        setSummaryData(sumRes.data);
      }
    } catch (err) {
      console.error('Error loading invoices history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadInvoicesHistory();
    }
  }, [activeTab, historyStatusFilter, historyDocFilter]);

  const handleSearchHistory = (e: React.FormEvent) => {
    e.preventDefault();
    loadInvoicesHistory();
  };

  // Calculations for Create Bill
  const currentDocType = invoice.documentType || 'Tax Invoice';
  const isRetailOrEstimate =
    currentDocType === 'Estimate / Quotation' ||
    (invoice.documentType as any) === 'RETAIL_BILL' ||
    (invoice.documentType as any) === 'QUOTATION' ||
    (invoice.documentType as any) === 'ESTIMATE';

  const isGstEnabled = invoice.isGstBill !== undefined
    ? invoice.isGstBill
    : (!isRetailOrEstimate && business.hasGst !== false && !!business.gstin);

  const subtotal = invoice.items.reduce((acc, item) => acc + item.qty * item.rate, 0);
  const discount = invoice.discountPercent ? (subtotal * invoice.discountPercent) / 100 : 0;
  const taxableBase = Math.max(0, subtotal - discount);

  const isInterState = placeOfSupply && business.state && placeOfSupply.trim().toLowerCase() !== business.state.trim().toLowerCase();

  const rawTax = isGstEnabled
    ? invoice.items.reduce((acc, item) => acc + (item.qty * item.rate * item.gstPercent) / 100, 0)
    : 0;
  const adjustedTax = subtotal > 0 ? (rawTax * taxableBase) / subtotal : 0;
  const cgst = isGstEnabled && !isInterState ? adjustedTax / 2 : 0;
  const sgst = isGstEnabled && !isInterState ? adjustedTax / 2 : 0;
  const igst = isGstEnabled && isInterState ? adjustedTax : 0;
  const grandTotal = Math.round(taxableBase + adjustedTax);

  // New Item Form State & Validation
  const [newItemName, setNewItemName] = useState('');
  const [newItemRate, setNewItemRate] = useState('2000');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemGst, setNewItemGst] = useState(isGstEnabled ? '18' : '0');
  const [newItemCode, setNewItemCode] = useState(isGstEnabled ? 'SAC 998311' : 'RET-01');
  const [newItemType, setNewItemType] = useState<'Service' | 'Goods'>('Service');
  const [itemFormErrors, setItemFormErrors] = useState<{ name?: string; rate?: string; qty?: string }>({});

  const handleDocumentTypeChange = (docType: DocumentType) => {
    const shouldEnableGst = docType === 'Tax Invoice' || docType === 'Proforma Invoice';
    onUpdateInvoice({
      ...invoice,
      documentType: docType,
      isGstBill: shouldEnableGst,
      items: invoice.items.map((it) => ({
        ...it,
        gstPercent: shouldEnableGst ? it.gstPercent || 18 : 0,
      })),
    });
    showToast(`Document Mode: ${docType} 📑`);
  };

  const toggleGstMode = (enabled: boolean) => {
    onUpdateInvoice({
      ...invoice,
      isGstBill: enabled,
      items: invoice.items.map((it) => ({
        ...it,
        gstPercent: enabled ? it.gstPercent || 18 : 0,
      })),
    });
    showToast(enabled ? 'GST Tax Invoice mode enabled! 🧾' : 'Non-GST Retail Bill mode enabled! ✅');
  };

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    if (!customerId) return;
    const match = customers.find((c) => c.id === customerId);
    if (match) {
      onUpdateInvoice({
        ...invoice,
        customerName: match.name,
        customerPhone: match.mobile || match.phone || '',
        customerType: 'Regular Client',
      });
      if (match.address) {
        const parts = match.address.split(',');
        const stateGuess = parts[parts.length - 1]?.trim();
        const foundState = INDIAN_STATES.find((s) => s.toLowerCase() === stateGuess.toLowerCase());
        if (foundState) setPlaceOfSupply(foundState);
      }
      showToast(`Selected Customer: ${match.name} 👤`);
    }
  };

  // Add Custom Item Form
  const validateItemForm = (): boolean => {
    const errors: { name?: string; rate?: string; qty?: string } = {};
    if (!newItemName.trim()) {
      errors.name = isHindi ? 'आइटम का नाम आवश्यक है' : 'Item name is required';
    }
    const rateVal = parseFloat(newItemRate);
    if (isNaN(rateVal) || rateVal < 0) {
      errors.rate = isHindi ? 'मान्य दर (₹ >= 0) दर्ज करें' : 'Please enter a valid rate (₹ >= 0)';
    }
    const qtyVal = parseInt(newItemQty);
    if (isNaN(qtyVal) || qtyVal < 1) {
      errors.qty = isHindi ? 'मात्रा कम से कम 1 होनी चाहिए' : 'Quantity must be at least 1';
    }

    setItemFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateItemForm()) return;

    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      name: newItemName.trim(),
      code: newItemCode.trim(),
      type: newItemType,
      qty: Math.max(1, parseInt(newItemQty) || 1),
      rate: Math.max(0, parseFloat(newItemRate) || 0),
      gstPercent: isGstEnabled ? parseFloat(newItemGst) || 18 : 0,
    };

    onUpdateInvoice({
      ...invoice,
      items: [...invoice.items, newItem],
    });

    setNewItemName('');
    setItemFormErrors({});
    setShowAddItemModal(false);
    showToast(`"${newItem.name}" added to invoice!`);
  };

  // Add Item from Real Product Catalog
  const handleAddFromCatalog = (prod: StoreProduct) => {
    const newItem: InvoiceItem = {
      id: prod.id,
      name: prod.name,
      code: prod.hsnSac || prod.hsnCode || prod.itemCode || (isGstEnabled ? 'HSN 998311' : 'RET-01'),
      type: prod.type === 'GOODS' ? 'Goods' : 'Service',
      qty: 1,
      rate: prod.sellingPrice ?? prod.price ?? 0,
      gstPercent: isGstEnabled ? prod.gstRate ?? prod.gstPercent ?? 18 : 0,
    };

    onUpdateInvoice({
      ...invoice,
      items: [...invoice.items, newItem],
    });
    setShowCatalogDrawer(false);
    showToast(`"${prod.name}" added from Catalog! 📦`);
  };

  const handleBarcodeScanned = (scannedCode: string) => {
    setShowBarcodeScanner(false);
    const trimmed = scannedCode.trim().toLowerCase();
    const match = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === trimmed) ||
        (p.itemCode && p.itemCode.toLowerCase() === trimmed) ||
        (p.sku && p.sku.toLowerCase() === trimmed) ||
        p.id === scannedCode
    );

    if (match) {
      const existing = invoice.items.find((i) => i.name.toLowerCase() === match.name.toLowerCase());
      if (existing) {
        onUpdateInvoice({
          ...invoice,
          items: invoice.items.map((i) => (i.id === existing.id ? { ...i, qty: i.qty + 1 } : i)),
        });
        showToast(`"${match.name}" Qty increased to ${existing.qty + 1} 📦`);
      } else {
        const newItem: InvoiceItem = {
          id: match.id,
          name: match.name,
          code: match.hsnSac || match.hsnCode || match.itemCode || (isGstEnabled ? 'HSN 998311' : 'RET-01'),
          type: match.type === 'GOODS' ? 'Goods' : 'Service',
          qty: 1,
          rate: match.sellingPrice ?? match.price ?? 0,
          gstPercent: isGstEnabled ? match.gstRate ?? match.gstPercent ?? 18 : 0,
        };
        onUpdateInvoice({
          ...invoice,
          items: [...invoice.items, newItem],
        });
        showToast(`Scanned & Added: "${match.name}" (₹${newItem.rate}) 📷`);
      }
    } else {
      setNewItemCode(scannedCode);
      setNewItemName(`Item ${scannedCode}`);
      setItemFormErrors({});
      setShowAddItemModal(true);
      showToast(`Scanned Barcode: ${scannedCode}. Enter details.`);
    }
  };

  const handleConfirmDeleteItem = () => {
    if (!itemToDelete) return;
    const updated = invoice.items.filter((i) => i.id !== itemToDelete.id);
    onUpdateInvoice({ ...invoice, items: updated });
    showToast(`Removed "${itemToDelete.name}" from bill`);
    setItemToDelete(null);
  };

  // Convert Document Type for Backend
  const mapDocTypeToBackend = (dt: string): any => {
    switch (dt) {
      case 'Tax Invoice':
        return 'GST_INVOICE';
      case 'Retail Bill':
        return 'RETAIL_BILL';
      case 'Estimate / Quotation':
        return 'QUOTATION';
      case 'Delivery Challan':
        return 'DELIVERY_CHALLAN';
      case 'Proforma Invoice':
        return 'PROFORMA_INVOICE';
      default:
        return 'GST_INVOICE';
    }
  };

  // Save / Issue Bill to Real Backend API
  const handleSaveInvoice = async (statusToSave: 'DRAFT' | 'ISSUED') => {
    if (invoice.items.length === 0) {
      showToast('⚠️ Please add at least one item to bill.');
      return;
    }

    setIsSaving(true);
    try {
      const amountPaidVal = amountPaidInput !== '' ? parseFloat(amountPaidInput) : (invoice.paymentMethod === 'Unpaid' ? 0 : grandTotal);

      const payload = {
        customerId: selectedCustomerId || undefined,
        documentType: mapDocTypeToBackend(currentDocType),
        status: statusToSave,
        isGstBill: isGstEnabled,
        buyerName: invoice.customerName || 'Cash Customer',
        buyerPhone: invoice.customerPhone || undefined,
        buyerGSTIN: buyerGstin.trim() ? buyerGstin.trim().toUpperCase() : undefined,
        placeOfSupply,
        items: invoice.items.map((it) => ({
          productId: it.id.startsWith('item-') ? undefined : it.id,
          name: it.name,
          productNameSnapshot: it.name,
          code: it.code,
          hsnSac: it.code,
          type: it.type === 'Goods' ? 'GOODS' : 'SERVICE',
          quantity: it.qty,
          qty: it.qty,
          rate: it.rate,
          gstRate: isGstEnabled ? it.gstPercent || 18 : 0,
        })),
        discountCode: invoice.discountCode || undefined,
        discountPercent: invoice.discountPercent || 0,
        paymentMethod: invoice.paymentMethod === 'Cash' ? 'CASH' : invoice.paymentMethod === 'Unpaid' ? 'CREDIT' : 'UPI',
        amountPaid: isNaN(amountPaidVal) ? grandTotal : amountPaidVal,
        notes: invoice.notes || undefined,
        termsAndConditions: invoice.terms || undefined,
      };

      const res = await invoiceApi.createInvoice(payload as any);
      if (res.success && res.data) {
        showToast(statusToSave === 'DRAFT' ? '💾 Draft Invoice Saved!' : '🎉 Invoice Generated & Stock Updated!');
        setPreviewingInvoice(res.data);
        setShowPreview(true);
        // Switch to history tab to see newly generated bill
        setActiveTab('history');
      } else {
        showToast(`❌ Failed: ${res.message || 'Error generating invoice'}`);
      }
    } catch (err: any) {
      showToast(`❌ Error: ${err.message || 'Failed'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Record Payment on an Invoice
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;

    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast('⚠️ Please enter a valid payment amount > 0');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const res = await invoiceApi.recordPayment(payingInvoice.id, {
        amount: amt,
        paymentMethod: paymentMode,
        referenceNumber: paymentRef.trim() || undefined,
        notes: paymentNote.trim() || undefined,
      });

      if (res.success) {
        showToast(`✅ Payment of ₹${amt.toLocaleString('en-IN')} recorded successfully!`);
        setPayingInvoice(null);
        setPaymentAmount('');
        setPaymentRef('');
        setPaymentNote('');
        loadInvoicesHistory();
      } else {
        showToast(`❌ ${res.message || 'Payment recording failed'}`);
      }
    } catch (err: any) {
      showToast(`❌ Error: ${err.message || 'Failed'}`);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Cancel an Invoice
  const handleConfirmCancelInvoice = async () => {
    if (!cancellingInvoice) return;
    setIsCancelling(true);
    try {
      const res = await invoiceApi.cancelInvoice(cancellingInvoice.id, cancelReason);
      if (res.success) {
        showToast(`✅ Invoice #${cancellingInvoice.invoiceNumber} cancelled & stock restored!`);
        setCancellingInvoice(null);
        setCancelReason('');
        loadInvoicesHistory();
      } else {
        showToast(`❌ ${res.message || 'Failed to cancel invoice'}`);
      }
    } catch (err: any) {
      showToast(`❌ Error: ${err.message || 'Failed'}`);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="flex flex-col w-full pb-32 bg-[#0B0F19] text-white min-h-screen">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-60 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-2xl flex items-center gap-2 border border-white/20 animate-bounce">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-4xl mx-auto w-full px-4 pt-4 space-y-4">
        {/* Navigation Tabs: Create Bill / POS vs Invoices History */}
        <div className="flex bg-[#131B2E] p-1.5 rounded-2xl border border-white/10 shadow-lg">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            <span>{isHindi ? '⚡ नया बिल बनाएं' : '⚡ Create New Bill / POS'}</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">history</span>
            <span>{isHindi ? '📑 बिल इतिहास' : '📑 Invoices History'}</span>
            {invoicesList.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white">
                {invoicesList.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: CREATE INVOICE / BILL */}
        {activeTab === 'create' && (
          <div className="space-y-4 animate-fade-in">
            {/* Document Type Selector Bar */}
            <div className="bg-[#131B2E] p-2 rounded-2xl border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
                  {t.document}:
                </span>
                {(
                  ['Tax Invoice', 'Retail Bill', 'Estimate / Quotation', 'Delivery Challan', 'Proforma Invoice'] as DocumentType[]
                ).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleDocumentTypeChange(type)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      currentDocType === type
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleGstMode(!isGstEnabled)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isGstEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-700/50 text-slate-300 border border-slate-600'
                  }`}
                >
                  {isGstEnabled ? t.gstActive : t.nonGst}
                </button>

                <button
                  onClick={() => {
                    setPreviewingInvoice(null);
                    setShowPreview(true);
                  }}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">visibility</span>
                  <span>{t.previewPrint}</span>
                </button>
              </div>
            </div>

            {/* Business Identity Bar */}
            <div className="bg-[#131B2E] border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-lg shrink-0">
                  <span className="material-symbols-outlined text-[24px]">storefront</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm font-bold text-white">{business.name}</h2>
                    <span className="material-symbols-outlined text-blue-400 text-[16px]">verified</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isGstEnabled && business.gstin ? `Shop GSTIN: ${business.gstin}` : 'Non-GST Retail Vyapar'} • {business.city}, {business.state}
                  </p>
                </div>
              </div>

              <button
                onClick={onNavigateToBusiness}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                <span>Profile</span>
              </button>
            </div>

            {/* Customer & Billing Metadata Form */}
            <div className="bg-[#131B2E] border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
              <div className="flex flex-wrap items-center justify-between border-b border-white/10 pb-3 gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span>👤</span> {t.customerInfo}
                </span>

                {/* Quick select from digital khata customer master */}
                {customers.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">Khata Master:</span>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => handleSelectCustomer(e.target.value)}
                      className="bg-[#1E293B] border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500 font-semibold"
                    >
                      <option value="">-- Choose Existing Khata Customer --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.mobile || c.phone})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300">{t.customerName}</label>
                  <input
                    type="text"
                    value={invoice.customerName}
                    onChange={(e) => onUpdateInvoice({ ...invoice, customerName: e.target.value })}
                    placeholder="e.g. Rajesh Patel"
                    className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300">{t.whatsappNumber}</label>
                  <input
                    type="tel"
                    value={invoice.customerPhone}
                    maxLength={10}
                    onChange={(e) =>
                      onUpdateInvoice({ ...invoice, customerPhone: e.target.value.replace(/\D/g, '') })
                    }
                    placeholder="9876543210"
                    className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300">Buyer GSTIN (Optional B2B)</label>
                  <input
                    type="text"
                    value={buyerGstin}
                    maxLength={15}
                    onChange={(e) => setBuyerGstin(e.target.value.toUpperCase())}
                    placeholder="24AAAAA0000A1Z5"
                    className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300">Place of Supply (State)</label>
                  <select
                    value={placeOfSupply}
                    onChange={(e) => setPlaceOfSupply(e.target.value)}
                    className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st} {st === business.state ? '(Intra-state: CGST+SGST)' : '(Inter-state: IGST)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300">{t.billDate}</label>
                  <input
                    type="date"
                    value={invoice.billDate}
                    onChange={(e) => onUpdateInvoice({ ...invoice, billDate: e.target.value })}
                    className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300">{t.paymentStatus} Mode</label>
                  <select
                    value={invoice.paymentMethod}
                    onChange={(e) => onUpdateInvoice({ ...invoice, paymentMethod: e.target.value as any })}
                    className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="UPI">UPI (GPay / PhonePe / Paytm / QR)</option>
                    <option value="Cash">Cash Settlement</option>
                    <option value="Card">Card / Debit / Credit</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT / IMPS</option>
                    <option value="Unpaid">Unpaid / Udhar (Digital Khata)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Line Items Table & Catalog Quick-Add */}
            <div className="bg-[#131B2E] border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span>📦</span> {t.itemsServices} ({invoice.items.length})
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBarcodeScanner(true)}
                    className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Scan Product Barcode"
                  >
                    <span className="material-symbols-outlined text-[16px]">barcode_scanner</span>
                    <span>{isHindi ? 'बारकोड 📷' : 'Scan Barcode 📷'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCatalogDrawer(!showCatalogDrawer)}
                    className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">menu_book</span>
                    <span>{t.itemCatalog}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setItemFormErrors({});
                      setShowAddItemModal(true);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span>{t.addCustomItem}</span>
                  </button>
                </div>
              </div>

              {/* Quick Item Catalog Drawer */}
              {showCatalogDrawer && (
                <div className="p-3.5 rounded-2xl bg-[#1E293B] border border-indigo-500/30 space-y-2.5 animate-slide-down">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
                      ⚡ Tap any item to instantly add to invoice:
                    </span>
                    <button
                      onClick={() => setShowCatalogDrawer(false)}
                      className="text-slate-400 hover:text-white text-xs cursor-pointer"
                    >
                      Close
                    </button>
                  </div>

                  {products.length === 0 ? (
                    <div className="text-center py-6 px-4 bg-[#131B2E] rounded-xl border border-white/5 space-y-2">
                      <span className="text-2xl">🛍️</span>
                      <p className="text-xs font-semibold text-slate-300">
                        {isHindi ? 'कोई उत्पाद कैटलॉग में नहीं मिला' : 'No items found in your product catalog'}
                      </p>
                      <button
                        onClick={() => {
                          setShowCatalogDrawer(false);
                          setItemFormErrors({});
                          setShowAddItemModal(true);
                        }}
                        className="mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg cursor-pointer"
                      >
                        + {t.addCustomItem}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {products.map((prod) => (
                        <button
                          key={prod.id}
                          onClick={() => handleAddFromCatalog(prod)}
                          className="p-2.5 rounded-xl bg-[#131B2E] hover:bg-blue-950/60 border border-white/10 hover:border-blue-500/50 text-left transition-all group cursor-pointer"
                        >
                          <div className="text-[11px] font-bold text-white group-hover:text-blue-400 truncate">
                            {prod.name}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                            <span className="font-mono text-emerald-400 font-bold">
                              ₹{prod.sellingPrice ?? prod.price}
                            </span>
                            <span>{prod.category} • {prod.gstRate ?? prod.gstPercent ?? 18}% GST</span>
                          </div>
                          {(prod.stockQty !== undefined || prod.currentStock !== undefined) && (
                            <div className="text-[9px] text-slate-500 mt-0.5">
                              Stock: {prod.currentStock ?? prod.stockQty ?? 0} {prod.unit || 'PCS'}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Line Items List or Empty State */}
              {invoice.items.length === 0 ? (
                <EmptyState
                  emoji="📦"
                  title={t.noItems}
                  description={t.noItemsSub}
                  actionLabel={t.addCustomItem}
                  onAction={() => {
                    setItemFormErrors({});
                    setShowAddItemModal(true);
                  }}
                  secondaryActionLabel={t.itemCatalog}
                  onSecondaryAction={() => setShowCatalogDrawer(true)}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 text-[10px] uppercase font-bold">
                        <th className="py-2">Item Name</th>
                        {isGstEnabled && <th className="py-2">HSN/SAC</th>}
                        <th className="py-2 text-center">Qty</th>
                        <th className="py-2 text-right">Rate (₹)</th>
                        {isGstEnabled && <th className="py-2 text-right">GST %</th>}
                        <th className="py-2 text-right">Total (₹)</th>
                        <th className="py-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {invoice.items.map((it) => {
                        const base = it.qty * it.rate;
                        const itemGst = isGstEnabled ? (base * it.gstPercent) / 100 : 0;
                        const total = base + itemGst;
                        return (
                          <tr key={it.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 font-semibold text-white">
                              {it.name}
                              <span className="block text-[10px] text-slate-400">{it.type}</span>
                            </td>
                            {isGstEnabled && <td className="py-3 font-mono text-slate-400">{it.code}</td>}
                            <td className="py-3 text-center font-bold">{it.qty}</td>
                            <td className="py-3 text-right font-mono">₹{it.rate}</td>
                            {isGstEnabled && (
                              <td className="py-3 text-right text-slate-400 font-mono">{it.gstPercent}%</td>
                            )}
                            <td className="py-3 text-right font-bold text-white font-mono">
                              ₹{total.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 text-center">
                              <button
                                onClick={() => setItemToDelete(it)}
                                className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                                title="Remove item"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totals Calculation Summary Box */}
              <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div className="space-y-3 w-full sm:w-72">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300">{t.discount} (%)</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        placeholder="Code"
                        value={invoice.discountCode}
                        onChange={(e) => onUpdateInvoice({ ...invoice, discountCode: e.target.value })}
                        className="w-24 bg-[#1E293B] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white uppercase font-bold"
                      />
                      <input
                        type="number"
                        placeholder="0%"
                        value={invoice.discountPercent || ''}
                        onChange={(e) =>
                          onUpdateInvoice({ ...invoice, discountPercent: parseFloat(e.target.value) || 0 })
                        }
                        className="w-20 bg-[#1E293B] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300">
                      Amount Paid Now (₹):
                    </label>
                    <input
                      type="number"
                      placeholder={`Full (₹${grandTotal})`}
                      value={amountPaidInput}
                      onChange={(e) => setAmountPaidInput(e.target.value)}
                      className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                    />
                    {amountPaidInput !== '' && parseFloat(amountPaidInput) < grandTotal && (
                      <p className="text-[10px] text-amber-400 mt-1 font-semibold">
                        ⚠️ Outstanding ₹{(grandTotal - (parseFloat(amountPaidInput) || 0)).toLocaleString('en-IN')} will be booked as Digital Khata Udhaar!
                      </p>
                    )}
                  </div>
                </div>

                <div className="w-full sm:w-72 space-y-1.5 text-xs bg-slate-900/60 p-4 rounded-2xl border border-white/10">
                  <div className="flex justify-between text-slate-300">
                    <span>{t.subtotal}:</span>
                    <span className="font-mono">₹{subtotal.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-400 font-semibold">
                      <span>Discount ({invoice.discountPercent}%):</span>
                      <span className="font-mono">-₹{discount.toFixed(2)}</span>
                    </div>
                  )}
                  {isGstEnabled ? (
                    isInterState ? (
                      <div className="flex justify-between text-slate-400">
                        <span>IGST (Inter-State):</span>
                        <span className="font-mono">₹{igst.toFixed(2)}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-slate-400">
                          <span>CGST (9%):</span>
                          <span className="font-mono">₹{cgst.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>SGST (9%):</span>
                          <span className="font-mono">₹{sgst.toFixed(2)}</span>
                        </div>
                      </>
                    )
                  ) : (
                    <div className="flex justify-between text-emerald-400 font-semibold">
                      <span>GST (0% Non-GST):</span>
                      <span className="font-mono">₹0.00</span>
                    </div>
                  )}
                  <div className="border-t border-white/10 pt-2 flex justify-between items-baseline">
                    <span className="font-bold text-sm text-white">{t.grandTotal}:</span>
                    <span className="font-black text-lg text-emerald-400 font-mono">
                      ₹{grandTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveInvoice('DRAFT')}
                  className="py-3 px-5 bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">save_as</span>
                  <span>Save Draft</span>
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveInvoice('ISSUED')}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                  <span>{isSaving ? 'Issuing Bill...' : '⚡ Issue Invoice & Deduct Stock'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPreviewingInvoice(null);
                    setShowPreview(true);
                  }}
                  className="py-3 px-5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">visibility</span>
                  <span>{t.previewPrint}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INVOICES HISTORY & SUMMARY */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-fade-in">
            {/* Summary Metrics Bar */}
            {summaryData && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#131B2E] border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Bills</span>
                  <div className="text-xl font-bold text-white mt-0.5">{summaryData.totalInvoices}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#131B2E] border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Billed</span>
                  <div className="text-xl font-bold text-blue-400 font-mono mt-0.5">
                    ₹{summaryData.totalBilled.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#131B2E] border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Collected</span>
                  <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">
                    ₹{summaryData.totalCollected.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#131B2E] border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Outstanding Due</span>
                  <div className="text-xl font-bold text-rose-400 font-mono mt-0.5">
                    ₹{summaryData.totalOutstanding.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            )}

            {/* Filter and Search Bar */}
            <div className="p-4 bg-[#131B2E] rounded-2xl border border-white/10 space-y-3">
              <form onSubmit={handleSearchHistory} className="flex gap-2">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Search by Bill #, Buyer Name, Mobile, or GSTIN..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
                >
                  Search
                </button>
              </form>

              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="text-slate-400 text-[11px]">Filter Status:</span>
                {['all', 'ISSUED', 'PAID', 'PARTIALLY_PAID', 'UNPAID', 'DRAFT', 'CANCELLED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setHistoryStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                      historyStatusFilter === st
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {st === 'all' ? 'All Status' : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Invoices List */}
            {isLoadingHistory ? (
              <div className="p-12 text-center text-slate-400 bg-[#131B2E] rounded-2xl border border-white/10">
                <span className="material-symbols-outlined text-3xl animate-spin mb-2">progress_activity</span>
                <p className="text-xs">Loading bills & invoices...</p>
              </div>
            ) : invoicesList.length === 0 ? (
              <EmptyState
                emoji="📑"
                title="No Invoices Found"
                description="No bills have been created yet. Generate your first GST bill or retail receipt above!"
                actionLabel="Create Bill Now"
                onAction={() => setActiveTab('create')}
              />
            ) : (
              <div className="space-y-3">
                {invoicesList.map((inv) => {
                  const isPaid = inv.paymentStatus === 'PAID' || inv.status === 'PAID';
                  const isPartiallyPaid = inv.paymentStatus === 'PARTIALLY_PAID';
                  const isCancelled = inv.status === 'CANCELLED';

                  return (
                    <div
                      key={inv.id}
                      className="p-4 rounded-2xl bg-[#131B2E] border border-white/10 hover:border-blue-500/40 transition-all space-y-3 shadow-md"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-blue-400">
                              #{inv.invoiceNumber}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-white/5 text-slate-300 border border-white/10">
                              {inv.documentType}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isCancelled
                                  ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                                  : isPaid
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : isPartiallyPaid
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {inv.status}
                            </span>
                          </div>

                          <div className="text-xs text-slate-300 mt-1 font-semibold">
                            Buyer: {inv.buyerName} {inv.buyerPhone ? `(${inv.buyerPhone})` : ''}
                          </div>

                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-3">
                            <span>📅 {new Date(inv.invoiceDate || inv.billDate).toLocaleDateString('en-IN')}</span>
                            {inv.buyerGSTIN && <span>GSTIN: {inv.buyerGSTIN}</span>}
                            <span>Supply: {inv.placeOfSupply || 'State'}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-base font-black text-white font-mono">
                            ₹{inv.grandTotal.toLocaleString('en-IN')}
                          </div>
                          {inv.amountDue > 0 && !isCancelled && (
                            <div className="text-[11px] text-rose-400 font-semibold font-mono">
                              Due: ₹{inv.amountDue.toLocaleString('en-IN')}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400">
                            {inv.items.length} {inv.items.length === 1 ? 'item' : 'items'}
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-white/5">
                        <button
                          onClick={() => {
                            setPreviewingInvoice(inv);
                            setShowPreview(true);
                          }}
                          className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          <span>View & Print</span>
                        </button>

                        {!isPaid && !isCancelled && inv.status !== 'DRAFT' && (
                          <button
                            onClick={() => {
                              setPayingInvoice(inv);
                              setPaymentAmount(String(inv.amountDue));
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow"
                          >
                            <span className="material-symbols-outlined text-[16px]">payments</span>
                            <span>Record Payment</span>
                          </button>
                        )}

                        {!isCancelled && inv.status !== 'DRAFT' && (
                          <button
                            onClick={() => setCancellingInvoice(inv)}
                            className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">cancel</span>
                            <span>Cancel Bill</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {payingInvoice && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#131B2E] border border-white/20 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">💳</span>
                <h3 className="text-base font-bold text-white">Record Invoice Payment</h3>
              </div>
              <button
                onClick={() => setPayingInvoice(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-white/10 space-y-1 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Bill Number:</span>
                <span className="font-mono font-bold text-blue-400">#{payingInvoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Customer:</span>
                <span>{payingInvoice.buyerName}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Total Amount:</span>
                <span className="font-mono">₹{payingInvoice.grandTotal}</span>
              </div>
              <div className="flex justify-between text-rose-400 font-bold border-t border-white/10 pt-1">
                <span>Outstanding Balance:</span>
                <span className="font-mono">₹{payingInvoice.amountDue}</span>
              </div>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300">
                  Payment Amount (₹) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={payingInvoice.amountDue}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer / NEFT / IMPS</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">Transaction Reference #</label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref / UTR / Cheque #"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">Notes</label>
                <input
                  type="text"
                  placeholder="Optional payment note"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPayingInvoice(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isSubmittingPayment ? 'Recording...' : 'Record Payment & Sync Khata'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Invoice Confirmation Modal */}
      {cancellingInvoice && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#131B2E] border border-rose-500/30 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center gap-2 text-rose-400">
              <span className="material-symbols-outlined text-2xl">warning</span>
              <h3 className="text-base font-bold text-white">Cancel Invoice #{cancellingInvoice.invoiceNumber}?</h3>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to cancel this invoice? Stock deducted for this sale will be safely returned to your catalog, and any Khata balance will be reversed.
            </p>

            <div>
              <label className="text-[11px] font-semibold text-slate-300">Reason for Cancellation</label>
              <input
                type="text"
                placeholder="e.g. Order cancelled by customer"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancellingInvoice(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancelInvoice}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm & Reverse Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#131B2E] border border-white/20 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">➕</span>
                <h3 className="text-base font-bold text-white">{t.addCustomItem}</h3>
              </div>
              <button
                onClick={() => setShowAddItemModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300">
                  {t.itemName} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Wedding Photography / Cotton Fabric"
                  value={newItemName}
                  onChange={(e) => {
                    setNewItemName(e.target.value);
                    if (itemFormErrors.name) setItemFormErrors({ ...itemFormErrors, name: undefined });
                  }}
                  className={`w-full mt-1 bg-[#1E293B] border rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-colors ${
                    itemFormErrors.name ? 'border-rose-500' : 'border-white/10 focus:border-blue-500'
                  }`}
                />
                {itemFormErrors.name && (
                  <p className="text-[10px] text-rose-400 mt-1">{itemFormErrors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300">Item Type</label>
                  <select
                    value={newItemType}
                    onChange={(e) => setNewItemType(e.target.value as any)}
                    className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Service">Service</option>
                    <option value="Goods">Goods / Physical Item</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300">HSN / SAC Code</label>
                  <input
                    type="text"
                    value={newItemCode}
                    onChange={(e) => setNewItemCode(e.target.value)}
                    className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300">
                    {t.qty} <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newItemQty}
                    onChange={(e) => {
                      setNewItemQty(e.target.value);
                      if (itemFormErrors.qty) setItemFormErrors({ ...itemFormErrors, qty: undefined });
                    }}
                    className={`w-full mt-1 bg-[#1E293B] border rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-colors ${
                      itemFormErrors.qty ? 'border-rose-500' : 'border-white/10 focus:border-blue-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300">
                    {t.rate} <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={newItemRate}
                    onChange={(e) => {
                      setNewItemRate(e.target.value);
                      if (itemFormErrors.rate) setItemFormErrors({ ...itemFormErrors, rate: undefined });
                    }}
                    className={`w-full mt-1 bg-[#1E293B] border rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-colors ${
                      itemFormErrors.rate ? 'border-rose-500' : 'border-white/10 focus:border-blue-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300">GST Rate (%)</label>
                  <select
                    disabled={!isGstEnabled}
                    value={newItemGst}
                    onChange={(e) => setNewItemGst(e.target.value)}
                    className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="0">0% (Nil)</option>
                    <option value="5">5% GST</option>
                    <option value="12">12% GST</option>
                    <option value="18">18% GST</option>
                    <option value="28">28% GST</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer active:scale-95"
                >
                  {t.save} 📦
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation Modal */}
      <ConfirmModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDeleteItem}
        title={isHindi ? 'बिल से आइटम हटाएं?' : 'Remove Item from Invoice?'}
        message={
          isHindi
            ? `क्या आप निश्चित रूप से "${itemToDelete?.name}" को बिल से हटाना चाहते हैं?`
            : `Are you sure you want to remove "${itemToDelete?.name}" from this invoice?`
        }
        confirmText={t.delete}
        cancelText={t.cancel}
        isDestructive={true}
        icon="delete"
      />

      {/* Invoice Preview Modal with Real PDF Download & Thermal POS */}
      <InvoicePreviewModal
        isOpen={showPreview}
        onClose={() => {
          setShowPreview(false);
          setPreviewingInvoice(null);
        }}
        invoice={
          previewingInvoice
            ? {
                invoiceNumber: previewingInvoice.invoiceNumber,
                customerName: previewingInvoice.buyerName,
                customerPhone: previewingInvoice.buyerPhone || '',
                customerType: previewingInvoice.buyerGSTIN ? 'B2B Commercial' : 'B2C Retail',
                billDate: new Date(previewingInvoice.invoiceDate || previewingInvoice.billDate).toLocaleDateString('en-IN'),
                dueDate: previewingInvoice.dueDate ? new Date(previewingInvoice.dueDate).toLocaleDateString('en-IN') : '',
                paymentMethod: previewingInvoice.paymentMethod,
                paymentStatus: previewingInvoice.paymentStatus,
                items: previewingInvoice.items.map((it: any) => ({
                  id: it.id,
                  name: it.productNameSnapshot || it.name,
                  code: it.hsnSacSnapshot || it.code || '',
                  type: it.type === 'GOODS' ? 'Goods' : 'Service',
                  qty: it.quantity ?? it.qty ?? 1,
                  rate: Number(it.rate),
                  gstPercent: it.gstRate ?? it.gstPercent ?? 18,
                  totalAmount: Number(it.totalAmount),
                  unit: it.unit,
                })),
                notes: previewingInvoice.notes,
                terms: previewingInvoice.termsAndConditions || previewingInvoice.terms,
                isGstBill: previewingInvoice.isGstBill,
                documentType: previewingInvoice.documentType,
                buyerGSTIN: previewingInvoice.buyerGSTIN,
                placeOfSupply: previewingInvoice.placeOfSupply,
              }
            : {
                ...invoice,
                placeOfSupply,
                buyerGSTIN: buyerGstin || undefined,
              }
        }
        business={business}
        subtotal={previewingInvoice ? previewingInvoice.subtotal : subtotal}
        discount={previewingInvoice ? previewingInvoice.totalDiscount : discount}
        cgst={previewingInvoice ? previewingInvoice.totalCGST : cgst}
        sgst={previewingInvoice ? previewingInvoice.totalSGST : sgst}
        igst={previewingInvoice ? previewingInvoice.totalIGST : igst}
        cess={previewingInvoice ? previewingInvoice.totalCess : 0}
        roundOff={previewingInvoice ? previewingInvoice.roundOff : 0}
        grandTotal={previewingInvoice ? previewingInvoice.grandTotal : grandTotal}
        amountPaid={previewingInvoice ? previewingInvoice.amountPaid : undefined}
        amountDue={previewingInvoice ? previewingInvoice.amountDue : undefined}
        amountInWords={previewingInvoice ? previewingInvoice.amountInWords : undefined}
        buyerGstin={previewingInvoice ? previewingInvoice.buyerGSTIN : buyerGstin}
        placeOfSupply={previewingInvoice ? previewingInvoice.placeOfSupply : placeOfSupply}
      />

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScanSuccess={handleBarcodeScanned}
        title={isHindi ? 'बिल में उत्पाद बारकोड स्कैन करें' : 'Scan Product Barcode into Bill'}
      />
    </div>
  );
};
