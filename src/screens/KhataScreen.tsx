import React, { useState } from 'react';
import { BusinessProfile, KhataCustomer, KhataTransaction, ExpenseItem } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { EmptyState } from '../components/EmptyState';
import { ConfirmModal } from '../components/ConfirmModal';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { ExpenseBook } from '../components/ExpenseBook';
import { shareKhataStatementToWhatsApp } from '../utils/posterShare';
import { WhatsAppShareGuideModal } from '../components/WhatsAppShareGuideModal';
import { customerKhataApi, authApi } from '../services/api';

interface KhataScreenProps {
  business: BusinessProfile;
  customers: KhataCustomer[];
  onUpdateCustomers: (customers: KhataCustomer[]) => void;
  onOpenPro: () => void;
  expenses?: ExpenseItem[];
  onUpdateExpenses?: (expenses: ExpenseItem[]) => void;
  totalRevenue?: number;
}

export const KhataScreen: React.FC<KhataScreenProps> = ({
  business,
  customers,
  onUpdateCustomers,
  onOpenPro,
  expenses = [],
  onUpdateExpenses = () => {},
  totalRevenue,
}) => {
  const { t, isHindi } = useLanguage();
  const [mainTab, setMainTab] = useState<'customers' | 'expenses'>('customers');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'due' | 'settled'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<KhataCustomer | null>(null);
  
  // Modals
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showAddTxModal, setShowAddTxModal] = useState<'give' | 'receive' | null>(null);
  
  // Confirmation Modals
  const [customerToDelete, setCustomerToDelete] = useState<KhataCustomer | null>(null);
  const [customerToClear, setCustomerToClear] = useState<KhataCustomer | null>(null);
  
  // Sharing State
  const [sharingCustomerId, setSharingCustomerId] = useState<string | null>(null);
  const [whatsAppGuide, setWhatsAppGuide] = useState<{
    isOpen: boolean;
    caption: string;
    imageUrl: string;
    title: string;
    phoneNumber?: string;
  }>({
    isOpen: false,
    caption: '',
    imageUrl: '',
    title: '',
  });
  
  // New Customer Form State & Validation Errors
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustInitialDue, setNewCustInitialDue] = useState('');
  const [formErrors, setFormErrors] = useState<{ name?: string; phone?: string; amount?: string }>({});

  // New Transaction Form State
  const [txAmount, setTxAmount] = useState('');
  const [txNote, setTxNote] = useState('');
  const [txBillNumber, setTxBillNumber] = useState('');
  
  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Calculations
  const totalUdhar = customers.reduce((acc, c) => acc + (c.totalDue > 0 ? c.totalDue : 0), 0);
  const totalSettledCount = customers.filter(c => c.totalDue <= 0).length;
  const totalDueCount = customers.filter(c => c.totalDue > 0).length;

  // Filtered list
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery);
    if (!matchesSearch) return false;
    if (filterMode === 'due') return c.totalDue > 0;
    if (filterMode === 'settled') return c.totalDue <= 0;
    return true;
  });

  // Validation for Add Customer
  const validateCustomerForm = (): boolean => {
    const errors: { name?: string; phone?: string } = {};
    if (!newCustName.trim()) {
      errors.name = isHindi ? 'कृपया ग्राहक का नाम दर्ज करें' : 'Customer name is required';
    } else if (newCustName.trim().length < 2) {
      errors.name = isHindi ? 'नाम कम से कम 2 अक्षरों का होना चाहिए' : 'Name must be at least 2 characters';
    }

    const cleanPhone = newCustPhone.replace(/\D/g, '');
    if (!cleanPhone) {
      errors.phone = isHindi ? 'कृपया 10-अंकों का मोबाइल नंबर दर्ज करें' : 'Phone number is required';
    } else if (cleanPhone.length !== 10) {
      errors.phone = isHindi ? 'मान्य 10-अंकों का मोबाइल नंबर दर्ज करें' : 'Must be a valid 10-digit mobile number';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Add Customer
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCustomerForm()) return;

    const initialDue = parseFloat(newCustInitialDue) || 0;
    const cleanPhone = newCustPhone.replace(/\D/g, '');

    let createdCustomer: KhataCustomer = {
      id: `cust-${Date.now()}`,
      name: newCustName.trim(),
      phone: cleanPhone,
      totalDue: initialDue,
      lastTransactionDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      transactions: initialDue > 0 ? [
        {
          id: `tx-${Date.now()}`,
          customerId: `cust-${Date.now()}`,
          type: 'give',
          amount: initialDue,
          date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          note: isHindi ? 'शुरुआती उधार बैलेंस' : 'Opening Udhar balance',
        }
      ] : []
    };

    if (authApi.isAuthenticated()) {
      try {
        const res = await customerKhataApi.createCustomer({
          name: newCustName.trim(),
          phone: cleanPhone,
          openingBalance: initialDue,
        });

        if (res.success && res.data) {
          createdCustomer = customerKhataApi.backendToFrontendCustomer(res.data);
        }
      } catch (err: any) {
        console.warn('[Khata] Backend createCustomer fallback to local:', err);
      }
    }

    const updated = [createdCustomer, ...customers];
    onUpdateCustomers(updated);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustInitialDue('');
    setFormErrors({});
    setShowAddCustomerModal(false);
    showToast(`${isHindi ? 'ग्राहक जोड़ा गया' : 'Customer added'}: "${createdCustomer.name}" 📒`);
  };

  // Handle Add Transaction (Give or Receive)
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    
    const amount = parseFloat(txAmount);
    if (!amount || amount <= 0) {
      setFormErrors({ amount: isHindi ? 'मान्य राशि दर्ज करें (₹ > 0)' : 'Please enter a valid amount (₹ > 0)' });
      return;
    }

    const isGive = showAddTxModal === 'give';
    let newTx: KhataTransaction = {
      id: `tx-${Date.now()}`,
      customerId: selectedCustomer.id,
      type: isGive ? 'give' : 'receive',
      amount: amount,
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      billNumber: txBillNumber.trim() || undefined,
      note: txNote.trim() || (isGive ? (isHindi ? 'उधार सामान / सेवा' : 'Goods / Services given on credit') : (isHindi ? 'भुगतान प्राप्त' : 'Payment received')),
    };

    let newDue = isGive 
      ? selectedCustomer.totalDue + amount 
      : Math.max(0, selectedCustomer.totalDue - amount);

    if (authApi.isAuthenticated()) {
      try {
        const res = await customerKhataApi.addTransaction(selectedCustomer.id, {
          type: isGive ? 'UDHAAR' : 'JAMA',
          amount: amount,
          note: txNote.trim() || (isGive ? 'Goods / Services given on credit' : 'Payment received'),
          billNumber: txBillNumber.trim() || undefined,
        });

        if (res.success && res.data) {
          newDue = Number(res.data.currentBalance);
          if (res.data.transaction) {
            newTx.id = res.data.transaction.id;
          }
        }
      } catch (err: any) {
        console.warn('[Khata] Backend addTransaction fallback to local:', err);
      }
    }

    const updatedCustomer: KhataCustomer = {
      ...selectedCustomer,
      totalDue: newDue,
      lastTransactionDate: newTx.date,
      transactions: [newTx, ...selectedCustomer.transactions],
    };

    const updatedList = customers.map(c => c.id === selectedCustomer.id ? updatedCustomer : c);
    onUpdateCustomers(updatedList);
    setSelectedCustomer(updatedCustomer);
    
    setTxAmount('');
    setTxNote('');
    setTxBillNumber('');
    setFormErrors({});
    setShowAddTxModal(null);
    showToast(isGive ? `₹${amount} Udhar recorded! 🔴` : `₹${amount} Payment received & ledger updated! 🟢`);
  };

  // 1-Click WhatsApp Visual Statement & Reminder
  const handleSendWhatsAppReminder = async (customer: KhataCustomer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSharingCustomerId(customer.id);
    showToast(isHindi ? '🖼️ ग्राहक का खाता स्टेटमेंट (Image) तैयार हो रहा है...' : '🖼️ Generating Khata Statement Image...');

    try {
      let reminderCaption = '';
      if (authApi.isAuthenticated()) {
        try {
          const reminderRes = await customerKhataApi.generatePaymentReminder(customer.id, customer.totalDue);
          if (reminderRes.success && reminderRes.data) {
            reminderCaption = isHindi ? reminderRes.data.messageHindi : reminderRes.data.messageEnglish;
          }
        } catch {}
      }

      const res = await shareKhataStatementToWhatsApp(customer, business);
      showToast(res.message);
      if (res.method === 'clipboard-copy' || res.method === 'download-only') {
        setWhatsAppGuide({
          isOpen: true,
          caption: reminderCaption || res.caption || '',
          imageUrl: res.dataUrl || '',
          title: `Khata Statement - ${customer.name}`,
          phoneNumber: customer.phone,
        });
      }
    } catch (err: any) {
      console.error('Khata share error:', err);
      showToast('Khata share error: ' + (err.message || 'Failed'));
    } finally {
      setSharingCustomerId(null);
    }
  };

  // Execute Confirmed Customer Delete
  const handleConfirmDeleteCustomer = async () => {
    if (!customerToDelete) return;
    if (authApi.isAuthenticated()) {
      try {
        await customerKhataApi.deleteCustomer(customerToDelete.id);
      } catch (err) {
        console.warn('[Khata] Backend deleteCustomer fallback to local:', err);
      }
    }
    const updated = customers.filter(c => c.id !== customerToDelete.id);
    onUpdateCustomers(updated);
    if (selectedCustomer?.id === customerToDelete.id) {
      setSelectedCustomer(null);
    }
    showToast(`Customer "${customerToDelete.name}" deleted from Khata.`);
    setCustomerToDelete(null);
  };

  // Execute Confirmed Clear Balance
  const handleConfirmClearBalance = async () => {
    if (!customerToClear || customerToClear.totalDue <= 0) return;
    const settleAmount = customerToClear.totalDue;
    let settleTx: KhataTransaction = {
      id: `tx-${Date.now()}`,
      customerId: customerToClear.id,
      type: 'receive',
      amount: settleAmount,
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      note: isHindi ? 'पूर्ण भुगतान & खाता बराबर ✅' : 'Full settlement & account cleared ✅',
    };

    if (authApi.isAuthenticated()) {
      try {
        const res = await customerKhataApi.addTransaction(customerToClear.id, {
          type: 'JAMA',
          amount: settleAmount,
          note: isHindi ? 'पूर्ण भुगतान & खाता बराबर ✅' : 'Full settlement & account cleared ✅',
        });
        if (res.success && res.data?.transaction) {
          settleTx.id = res.data.transaction.id;
        }
      } catch (err) {
        console.warn('[Khata] Backend settlement fallback to local:', err);
      }
    }

    const updatedCust: KhataCustomer = {
      ...customerToClear,
      totalDue: 0,
      lastTransactionDate: settleTx.date,
      transactions: [settleTx, ...customerToClear.transactions],
    };

    const updatedList = customers.map(c => c.id === customerToClear.id ? updatedCust : c);
    onUpdateCustomers(updatedList);
    if (selectedCustomer?.id === customerToClear.id) {
      setSelectedCustomer(updatedCust);
    }
    showToast(`Account settled! ₹0 balance for ${customerToClear.name} 🎉`);
    setCustomerToClear(null);
  };

  return (
    <div className="flex flex-col w-full pb-32 bg-[#0B0F19] text-white min-h-screen">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-2xl flex items-center gap-2 border border-white/20 animate-bounce">
          <span className="material-symbols-outlined text-[18px]">info</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto w-full px-4 pt-4 space-y-5">
        
        {/* Main Tab Switcher: Grahak Khata vs Dukan Kharcha */}
        <div className="flex items-center gap-2 p-1.5 bg-[#131B2E] rounded-2xl border border-white/10 shadow-lg">
          <button
            onClick={() => setMainTab('customers')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
              mainTab === 'customers'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">menu_book</span>
            <span>{isHindi ? '👥 ग्राहक खाता (उधार-जमा)' : '👥 Customer Ledger (Khata)'}</span>
          </button>
          <button
            onClick={() => setMainTab('expenses')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
              mainTab === 'expenses'
                ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">payments</span>
            <span>{isHindi ? '💸 दुकान खर्चा & मुनाफा (P&L)' : '💸 Shop Expenses & P&L'}</span>
          </button>
        </div>

        {mainTab === 'expenses' ? (
          <ExpenseBook
            business={business}
            expenses={expenses || []}
            onUpdateExpenses={onUpdateExpenses || (() => {})}
            totalRevenue={totalRevenue}
          />
        ) : (
          <>
            {/* Top Header Card: Udhar-Bahi Summary */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#1E1B4B] p-5 border border-white/10 shadow-xl">
          <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-6 -top-6 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">📒</span>
                <h1 className="text-lg font-bold text-white tracking-wide">{t.titleKhata}</h1>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{t.khataSub}</p>
            </div>

            <button
              onClick={() => {
                setFormErrors({});
                setShowAddCustomerModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/25 transition-all transform active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              <span>{t.addCustomer}</span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <span className="text-[11px] font-semibold text-red-400 uppercase tracking-wider flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                {t.totalUdhar}
              </span>
              <div className="text-xl font-extrabold text-red-400 mt-1">
                ₹{totalUdhar.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-slate-400">{totalDueCount} {isHindi ? 'बकाया खाते' : 'pending accounts'}</span>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {t.settledFilter}
              </span>
              <div className="text-xl font-extrabold text-emerald-400 mt-1">
                {totalSettledCount} {isHindi ? 'खाते साफ' : 'Clear'}
              </div>
              <span className="text-[10px] text-slate-400">{isHindi ? 'शून्य बकाया' : 'Zero dues pending'}</span>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                {t.totalCustomers}
              </span>
              <div className="text-xl font-extrabold text-white mt-1">
                {customers.length}
              </div>
              <span className="text-[10px] text-blue-400 flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[12px]">verified</span> {isHindi ? '100% सुरक्षित डिजिटल खाता' : '100% Secure Local Ledger'}
              </span>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder={t.searchCustomers}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#131B2E] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-[#131B2E] p-1 rounded-xl border border-white/10 text-xs shrink-0">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                filterMode === 'all' ? 'bg-blue-600 text-white font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.allFilter} ({customers.length})
            </button>
            <button
              onClick={() => setFilterMode('due')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer ${
                filterMode === 'due' ? 'bg-red-500/20 text-red-300 border border-red-500/30 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {t.dueFilter} ({totalDueCount})
            </button>
            <button
              onClick={() => setFilterMode('settled')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer ${
                filterMode === 'settled' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {t.settledFilter} ({totalSettledCount})
            </button>
          </div>
        </div>

        {/* Customer Cards List or Empty State */}
        <div className="space-y-2.5">
          {filteredCustomers.length === 0 ? (
            customers.length === 0 ? (
              <EmptyState
                emoji="📒"
                title={t.noCustomers}
                description={t.noCustomersSub}
                actionLabel={t.addCustomer}
                onAction={() => {
                  setFormErrors({});
                  setShowAddCustomerModal(true);
                }}
              />
            ) : (
              <EmptyState
                icon="search_off"
                title={isHindi ? 'कोई ग्राहक नहीं मिला' : 'No matching customers'}
                description={isHindi ? 'खोज शब्द बदलकर देखें या फ़िल्टर साफ़ करें।' : 'Try changing your search keywords or resetting filters.'}
                actionLabel={isHindi ? 'फ़िल्टर साफ़ करें' : 'Clear Filters'}
                onAction={() => {
                  setSearchQuery('');
                  setFilterMode('all');
                }}
              />
            )
          ) : (
            filteredCustomers.map((cust) => {
              const hasDue = cust.totalDue > 0;
              return (
                <div
                  key={cust.id}
                  onClick={async () => {
                    setSelectedCustomer(cust);
                    if (authApi.isAuthenticated()) {
                      try {
                        const res = await customerKhataApi.getCustomer(cust.id);
                        if (res.success && res.data) {
                          const fullCust = customerKhataApi.backendToFrontendCustomer(res.data);
                          setSelectedCustomer(fullCust);
                          onUpdateCustomers(customers.map(c => c.id === cust.id ? fullCust : c));
                        }
                      } catch {}
                    }
                  }}
                  className="group bg-[#131B2E] hover:bg-[#1A243B] border border-white/10 hover:border-blue-500/40 rounded-2xl p-4 transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0 shadow ${
                      hasDue 
                        ? 'bg-gradient-to-br from-rose-500 to-red-600' 
                        : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                    }`}>
                      {cust.name.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                          {cust.name}
                        </span>
                        {hasDue && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-red-500/10 text-red-400 border border-red-500/20">
                            {t.pendingDue}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>📞 +91 {cust.phone}</span>
                        <span>•</span>
                        <span>{cust.lastTransactionDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className={`text-base font-extrabold ${hasDue ? 'text-red-400' : 'text-emerald-400'}`}>
                        {hasDue ? `₹${cust.totalDue.toLocaleString('en-IN')}` : `₹0 (${t.allClear})`}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {hasDue ? (isHindi ? 'लेना बाक़ी है' : 'Pending due') : (isHindi ? 'साफ़' : 'Settled')}
                      </span>
                    </div>

                    {hasDue && (
                      <button
                        onClick={(e) => handleSendWhatsAppReminder(cust, e)}
                        title="Send 1-Click WhatsApp Reminder"
                        className="p-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center shadow cursor-pointer"
                      >
                        <span className="text-base">💬</span>
                      </button>
                    )}

                    <span className="material-symbols-outlined text-slate-400 text-[18px] group-hover:translate-x-0.5 transition-transform">
                      chevron_right
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </>
    )}
  </div>

      {/* Customer Detail & Transactions Modal / Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-[#131B2E] border border-white/15 w-full max-w-xl max-h-[90vh] rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-slide-up">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-[#1E293B] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base text-white ${
                  selectedCustomer.totalDue > 0 ? 'bg-red-500' : 'bg-emerald-500'
                }`}>
                  {selectedCustomer.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{selectedCustomer.name}</h3>
                  <p className="text-xs text-slate-300">📞 +91 {selectedCustomer.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`tel:+91${selectedCustomer.phone}`}
                  className="p-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 rounded-xl transition-all"
                  title="Call Customer"
                >
                  <span className="material-symbols-outlined text-[18px]">call</span>
                </a>
                
                {/* Delete Customer Button */}
                <button
                  onClick={() => setCustomerToDelete(selectedCustomer)}
                  className="p-2 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 rounded-xl transition-all cursor-pointer"
                  title="Delete Customer"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>

                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-2 bg-white/10 hover:bg-white/20 text-slate-300 rounded-xl transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>

            {/* Current Balance Banner */}
            <div className="p-4 bg-gradient-to-r from-[#172033] to-[#1e293b] border-b border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider">Current Balance</span>
                <div className={`text-2xl font-black ${
                  selectedCustomer.totalDue > 0 ? 'text-red-400' : 'text-emerald-400'
                }`}>
                  {selectedCustomer.totalDue > 0 
                    ? `₹${selectedCustomer.totalDue.toLocaleString('en-IN')} (${t.pendingDue})` 
                    : `₹0 (${t.allClear})`}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedCustomer.totalDue > 0 && (
                  <>
                    <button
                      onClick={() => handleSendWhatsAppReminder(selectedCustomer)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition-all active:scale-95 cursor-pointer"
                    >
                      <span>💬</span>
                      <span>{t.sendReminder}</span>
                    </button>
                    <button
                      onClick={() => setCustomerToClear(selectedCustomer)}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold rounded-xl border border-white/10 transition-all cursor-pointer"
                    >
                      {t.clearBalance}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons: Maine Diya (Udhar) vs Mujhe Mila (Jama) */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-[#0F172A] border-b border-white/10">
              <button
                onClick={() => {
                  setFormErrors({});
                  setShowAddTxModal('give');
                }}
                className="flex items-center justify-center gap-2 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 rounded-xl font-bold text-xs shadow transition-all active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_outward</span>
                <span>{t.giveCredit}</span>
              </button>

              <button
                onClick={() => {
                  setFormErrors({});
                  setShowAddTxModal('receive');
                }}
                className="flex items-center justify-center gap-2 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded-xl font-bold text-xs shadow transition-all active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                <span>{t.receivePayment}</span>
              </button>
            </div>

            {/* Transaction Ledger History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {t.txHistory} ({selectedCustomer.transactions.length})
              </div>

              {selectedCustomer.transactions.length === 0 ? (
                <EmptyState
                  emoji="🧾"
                  title={t.noTransactions}
                  description={t.noTransactionsSub}
                  actionLabel={t.giveCredit}
                  onAction={() => setShowAddTxModal('give')}
                  secondaryActionLabel={t.receivePayment}
                  onSecondaryAction={() => setShowAddTxModal('receive')}
                />
              ) : (
                selectedCustomer.transactions.map((tx) => {
                  const isGive = tx.type === 'give';
                  return (
                    <div
                      key={tx.id}
                      className="bg-[#1E293B]/70 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`p-2 rounded-lg font-bold text-xs ${
                          isGive ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {isGive ? 'UDHAR' : 'JAMA'}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white">{tx.note || (isGive ? 'Goods / Credit' : 'Payment')}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>📅 {tx.date}</span>
                            {tx.billNumber && <span>• Bill #{tx.billNumber}</span>}
                          </div>
                        </div>
                      </div>

                      <div className={`text-sm font-extrabold ${isGive ? 'text-red-400' : 'text-emerald-400'}`}>
                        {isGive ? `+ ₹${tx.amount.toLocaleString('en-IN')}` : `- ₹${tx.amount.toLocaleString('en-IN')}`}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal with Validation */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#131B2E] border border-white/20 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">👤</span>
                <h3 className="text-base font-bold text-white">{t.addCustomer}</h3>
              </div>
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-300">
                  {t.customerName} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder={isHindi ? 'उदा. सुरेश भाई पटेल' : 'e.g. Suresh Bhai Patel'}
                  value={newCustName}
                  onChange={(e) => {
                    setNewCustName(e.target.value);
                    if (formErrors.name) setFormErrors({ ...formErrors, name: undefined });
                  }}
                  className={`w-full mt-1 bg-[#1E293B] border rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors ${
                    formErrors.name ? 'border-rose-500 focus:border-rose-500' : 'border-white/10 focus:border-blue-500'
                  }`}
                />
                {formErrors.name && (
                  <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">error</span>
                    <span>{formErrors.name}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">
                  {t.whatsappNumber} <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center mt-1">
                  <span className="bg-[#1E293B] border border-r-0 border-white/10 text-slate-400 text-xs px-3 py-2 rounded-l-xl">
                    +91
                  </span>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    maxLength={10}
                    value={newCustPhone}
                    onChange={(e) => {
                      setNewCustPhone(e.target.value.replace(/\D/g, ''));
                      if (formErrors.phone) setFormErrors({ ...formErrors, phone: undefined });
                    }}
                    className={`w-full bg-[#1E293B] border rounded-r-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors ${
                      formErrors.phone ? 'border-rose-500 focus:border-rose-500' : 'border-white/10 focus:border-blue-500'
                    }`}
                  />
                </div>
                {formErrors.phone && (
                  <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">error</span>
                    <span>{formErrors.phone}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">
                  {t.openingBalance} ({isHindi ? 'वैकल्पिक' : 'Optional'})
                </label>
                <div className="flex items-center mt-1">
                  <span className="bg-[#1E293B] border border-r-0 border-white/10 text-slate-400 text-xs px-3 py-2 rounded-l-xl">
                    ₹
                  </span>
                  <input
                    type="number"
                    placeholder="0"
                    value={newCustInitialDue}
                    onChange={(e) => setNewCustInitialDue(e.target.value)}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-r-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 cursor-pointer active:scale-95"
                >
                  {t.save} 📒
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Transaction Modal (Udhar or Jama) */}
      {showAddTxModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#131B2E] border border-white/20 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{showAddTxModal === 'give' ? '🔴' : '🟢'}</span>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {showAddTxModal === 'give' ? (isHindi ? 'उधार दर्ज करें (मैंने दिया)' : 'Record Udhar (Gave Credit)') : (isHindi ? 'जमा दर्ज करें (मुझे मिला)' : 'Record Payment (Received)')}
                  </h3>
                  <p className="text-xs text-slate-400">{selectedCustomer.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddTxModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-300">
                  {t.amount} <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center mt-1">
                  <span className="bg-[#1E293B] border border-r-0 border-white/10 text-slate-400 text-sm font-bold px-3.5 py-2.5 rounded-l-xl">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 1500"
                    value={txAmount}
                    onChange={(e) => {
                      setTxAmount(e.target.value);
                      if (formErrors.amount) setFormErrors({ ...formErrors, amount: undefined });
                    }}
                    className={`w-full bg-[#1E293B] border rounded-r-xl px-3 py-2.5 text-sm font-bold text-white placeholder-slate-500 focus:outline-none transition-colors ${
                      formErrors.amount ? 'border-rose-500' : 'border-white/10 focus:border-blue-500'
                    }`}
                  />
                </div>
                {formErrors.amount && (
                  <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">error</span>
                    <span>{formErrors.amount}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">{t.billNumber} ({isHindi ? 'वैकल्पिक' : 'Optional'})</label>
                <input
                  type="text"
                  placeholder="e.g. INV-089"
                  value={txBillNumber}
                  onChange={(e) => setTxBillNumber(e.target.value)}
                  className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">{t.note}</label>
                <input
                  type="text"
                  placeholder={showAddTxModal === 'give' ? 'e.g. 2 Photo frames & wedding album' : 'e.g. GPay UPI payment'}
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                  className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTxModal(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer active:scale-95 ${
                    showAddTxModal === 'give'
                      ? 'bg-red-600 hover:bg-red-500 shadow-red-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  }`}
                >
                  {showAddTxModal === 'give' ? 'Record Udhar 🔴' : 'Record Jama 🟢'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Delete Customer */}
      <ConfirmModal
        isOpen={!!customerToDelete}
        onClose={() => setCustomerToDelete(null)}
        onConfirm={handleConfirmDeleteCustomer}
        title={isHindi ? 'ग्राहक को खाते से हटाएं?' : 'Delete Customer from Khata?'}
        message={isHindi ? `क्या आप निश्चित रूप से "${customerToDelete?.name}" और उनका समस्त लेन-देन इतिहास हटाना चाहते हैं?` : `Are you sure you want to delete "${customerToDelete?.name}" and all associated transaction records? This action cannot be undone.`}
        confirmText={t.delete}
        cancelText={t.cancel}
        isDestructive={true}
        icon="person_remove"
      />

      {/* Confirmation Modal for Clear Balance */}
      <ConfirmModal
        isOpen={!!customerToClear}
        onClose={() => setCustomerToClear(null)}
        onConfirm={handleConfirmClearBalance}
        title={isHindi ? 'खाता बराबर करें?' : 'Clear Customer Balance?'}
        message={isHindi ? `"${customerToClear?.name}" का ₹${customerToClear?.totalDue} बकाया जमा रिकॉर्ड करके शेष राशि ₹0 कर दी जाएगी।` : `This will record a full payment of ₹${customerToClear?.totalDue} and settle "${customerToClear?.name}"'s balance to ₹0.`}
        confirmText={t.confirm}
        cancelText={t.cancel}
        isDestructive={false}
        icon="task_alt"
      />

      {/* WhatsApp Share Guide Modal */}
      <WhatsAppShareGuideModal
        isOpen={whatsAppGuide.isOpen}
        onClose={() => setWhatsAppGuide((prev) => ({ ...prev, isOpen: false }))}
        caption={whatsAppGuide.caption}
        imageUrl={whatsAppGuide.imageUrl}
        title={whatsAppGuide.title}
        phoneNumber={whatsAppGuide.phoneNumber}
      />
    </div>
  );
};
