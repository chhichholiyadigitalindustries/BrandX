import React, { useState } from 'react';
import { BusinessProfile, ExpenseCategory, ExpenseItem } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { EmptyState } from './EmptyState';
import { ConfirmModal } from './ConfirmModal';

interface ExpenseBookProps {
  business: BusinessProfile;
  expenses: ExpenseItem[];
  onUpdateExpenses: (expenses: ExpenseItem[]) => void;
  totalRevenue?: number;
}

export const ExpenseBook: React.FC<ExpenseBookProps> = ({
  business,
  expenses,
  onUpdateExpenses,
  totalRevenue = 38500, // Combined sales and jama collections
}) => {
  const { isHindi } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('Tea & Refreshment');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formPaymentMode, setFormPaymentMode] = useState<'Cash' | 'UPI' | 'Bank Transfer'>('Cash');
  const [formNote, setFormNote] = useState('');
  const [formErrors, setFormErrors] = useState<{ title?: string; amount?: string }>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const categories: Array<{ label: string; cat: ExpenseCategory; icon: string }> = [
    { label: 'Shop Rent', cat: 'Rent', icon: 'home' },
    { label: 'Electricity & Bills', cat: 'Electricity & Bills', icon: 'bolt' },
    { label: 'Staff Salary', cat: 'Staff Salary', icon: 'badge' },
    { label: 'Supplier / Stock', cat: 'Supplier / Stock', icon: 'inventory_2' },
    { label: 'Tea & Refreshment', cat: 'Tea & Refreshment', icon: 'coffee' },
    { label: 'Transport & Fuel', cat: 'Transport & Fuel', icon: 'local_shipping' },
    { label: 'Marketing', cat: 'Marketing', icon: 'campaign' },
    { label: 'Maintenance', cat: 'Maintenance', icon: 'build' },
    { label: 'Other', cat: 'Other', icon: 'receipt' },
  ];

  // Calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const todayExpenses = expenses
    .filter((e) => e.date === todayStr)
    .reduce((acc, e) => acc + e.amount, 0);

  const totalExpenseAmount = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = totalRevenue - totalExpenseAmount;
  const isProfitable = netProfit >= 0;

  // Filtered expenses
  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.note && e.note.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || e.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Validation
  const validateForm = (): boolean => {
    const errors: { title?: string; amount?: string } = {};
    if (!formTitle.trim()) {
      errors.title = isHindi ? 'खर्चे का विवरण दर्ज करें' : 'Expense title is required';
    }
    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0) {
      errors.amount = isHindi ? 'मान्य राशि दर्ज करें' : 'Enter a valid amount';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Add Expense
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const newExpense: ExpenseItem = {
      id: `exp-${Date.now()}`,
      title: formTitle.trim(),
      category: formCategory,
      amount: parseFloat(formAmount),
      date: formDate,
      paymentMode: formPaymentMode,
      note: formNote.trim() || undefined,
    };

    onUpdateExpenses([newExpense, ...expenses]);
    showToast(isHindi ? 'खर्चा सफलतापूर्वक जोड़ा गया! 💸' : 'Expense added successfully! 💸');
    setShowAddModal(false);

    // Reset Form
    setFormTitle('');
    setFormAmount('');
    setFormNote('');
    setFormCategory('Tea & Refreshment');
  };

  // Delete Expense
  const handleConfirmDelete = () => {
    if (!expenseToDelete) return;
    const updated = expenses.filter((e) => e.id !== expenseToDelete.id);
    onUpdateExpenses(updated);
    showToast(isHindi ? 'खर्चा हटा दिया गया' : 'Expense removed');
    setExpenseToDelete(null);
  };

  // WhatsApp Financial Summary Share
  const handleShareWhatsAppReport = () => {
    const message = encodeURIComponent(
      `📊 *${business.name.toUpperCase()} - VYAPAR FINANCIAL REPORT* 📈\n\n` +
      `📅 *Date:* ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}\n` +
      `💰 *Total Revenue (Aavak):* ₹${totalRevenue.toLocaleString('en-IN')}\n` +
      `💸 *Total Expenses (Kharcha):* ₹${totalExpenseAmount.toLocaleString('en-IN')}\n` +
      `──────────────────────────\n` +
      `${isProfitable ? '🟢 *NET PROFIT (Shuddh Munafa):*' : '🔴 *NET LOSS (Nuksan):*'} ₹${Math.abs(netProfit).toLocaleString('en-IN')}\n` +
      `──────────────────────────\n\n` +
      `Generated via BrandX Business Super App.`
    );
    window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank');
    showToast('Financial report shared to WhatsApp!');
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#283044] text-white px-4 py-2 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2 animate-fade-in border border-white/10">
          <span className="material-symbols-outlined text-[16px] text-emerald-400">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Munafa / Nuksan (P&L) Super Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Card 1: Total Revenue */}
        <div className="bg-[#131B2E] border border-white/10 p-4 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {isHindi ? 'कुल आय (Total Sales)' : 'Total Revenue'}
            </span>
            <span className="material-symbols-outlined text-emerald-400 text-xl">trending_up</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">₹{totalRevenue.toLocaleString('en-IN')}</span>
            <span className="text-[10px] text-emerald-400 font-bold">Billing + Jama</span>
          </div>
        </div>

        {/* Card 2: Total Expenses */}
        <div className="bg-[#131B2E] border border-white/10 p-4 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {isHindi ? 'कुल खर्चा (Total Kharcha)' : 'Total Expenses'}
            </span>
            <span className="material-symbols-outlined text-rose-400 text-xl">trending_down</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-400">₹{totalExpenseAmount.toLocaleString('en-IN')}</span>
            <span className="text-[10px] text-slate-400">Today: ₹{todayExpenses.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Card 3: Net Profit / Margin */}
        <div className={`border p-4 rounded-2xl shadow-lg relative overflow-hidden ${
          isProfitable 
            ? 'bg-gradient-to-br from-emerald-950/40 via-[#131B2E] to-[#131B2E] border-emerald-500/30' 
            : 'bg-gradient-to-br from-rose-950/40 via-[#131B2E] to-[#131B2E] border-rose-500/30'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
              {isProfitable 
                ? (isHindi ? '🟢 शुद्ध मुनाफा (Net Profit)' : '🟢 Net Profit') 
                : (isHindi ? '🔴 कुल नुकसान (Net Loss)' : '🔴 Net Loss')}
            </span>
            <button
              onClick={handleShareWhatsAppReport}
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white"
              title="Share P&L on WhatsApp"
            >
              <span className="material-symbols-outlined text-base">share</span>
            </button>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black ${isProfitable ? 'text-emerald-300' : 'text-rose-400'}`}>
              ₹{Math.abs(netProfit).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              {isProfitable ? 'Healthy Margin 🚀' : 'Deficit ⚠️'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Bar & Category Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Search */}
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
            search
          </span>
          <input
            type="text"
            placeholder={isHindi ? 'खर्चा खोजें (उदा. किराया, चाय, बिजली)...' : 'Search expenses (Rent, Tea, Electricity)...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#131B2E] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Add Expense Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 shrink-0 hover:scale-105 transition-all"
        >
          <span className="material-symbols-outlined text-base">add</span>
          <span>{isHindi ? 'नया खर्चा जोड़ें' : '+ Add Shop Expense'}</span>
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setSelectedCategory('All')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
            selectedCategory === 'All'
              ? 'bg-blue-600 text-white shadow'
              : 'bg-[#131B2E] text-slate-400 hover:text-white border border-white/10'
          }`}
        >
          {isHindi ? 'सभी' : 'All'} ({expenses.length})
        </button>
        {categories.map((c) => (
          <button
            key={c.cat}
            onClick={() => setSelectedCategory(c.cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1 ${
              selectedCategory === c.cat
                ? 'bg-blue-600 text-white shadow font-bold'
                : 'bg-[#131B2E] text-slate-400 hover:text-white border border-white/10'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{c.icon}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      {/* Expenses List */}
      {filteredExpenses.length === 0 ? (
        <EmptyState
          icon="receipt_long"
          title={isHindi ? 'कोई खर्चा नहीं मिला' : 'No expenses found'}
          description={
            searchQuery
              ? (isHindi ? 'खोज के अनुसार कोई खर्चा नहीं है' : 'Try searching with another term')
              : (isHindi ? 'दुकान के दैनिक खर्चे दर्ज करें और मुनाफा ट्रैक करें' : 'Record your daily shop expenses to track net profits')
          }
          actionLabel={isHindi ? '+ पहला खर्चा जोड़ें' : '+ Add First Expense'}
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="space-y-2">
          {filteredExpenses.map((exp) => {
            const catObj = categories.find((c) => c.cat === exp.category);
            return (
              <div
                key={exp.id}
                className="bg-[#131B2E] border border-white/10 p-3.5 rounded-2xl flex items-center justify-between hover:border-white/20 transition-all shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
                    <span className="material-symbols-outlined text-xl">
                      {catObj?.icon || 'receipt'}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white">{exp.title}</h4>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/5 text-slate-300">
                        {exp.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                      <span>{exp.date}</span>
                      <span>•</span>
                      <span className="text-blue-400 font-semibold">{exp.paymentMode}</span>
                      {exp.note && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[150px]">{exp.note}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-rose-400">
                    -₹{exp.amount.toLocaleString('en-IN')}
                  </span>
                  <button
                    onClick={() => setExpenseToDelete(exp)}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors"
                    title="Delete Expense"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-md bg-[#131B2E] border border-white/15 rounded-3xl p-6 space-y-4 shadow-2xl animate-fade-in text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-400 text-xl">payments</span>
                <h3 className="text-sm font-black text-white">
                  {isHindi ? 'दुकान का नया खर्चा दर्ज करें' : 'Record Shop Expense'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-slate-300"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-3 text-xs">
              {/* Title */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  {isHindi ? 'खर्चे का नाम / शीर्षक *' : 'Expense Title / Purpose *'}
                </label>
                <input
                  type="text"
                  placeholder={isHindi ? 'उदा. अक्टूबर का दुकान किराया' : 'e.g. October Shop Rent'}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                />
                {formErrors.title && <p className="text-red-400 text-[10px] mt-1">{formErrors.title}</p>}
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    {isHindi ? 'राशि (₹) *' : 'Amount (₹) *'}
                  </label>
                  <input
                    type="number"
                    placeholder="1500"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-black text-rose-400 focus:outline-none focus:border-rose-500"
                  />
                  {formErrors.amount && <p className="text-red-400 text-[10px] mt-1">{formErrors.amount}</p>}
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    {isHindi ? 'तारीख' : 'Date'}
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  {isHindi ? 'कैटेगरी' : 'Category'}
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                  className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  {categories.map((c) => (
                    <option key={c.cat} value={c.cat} className="bg-[#131B2E]">
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Mode */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  {isHindi ? 'भुगतान का तरीका' : 'Payment Mode'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Cash', 'UPI', 'Bank Transfer'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setFormPaymentMode(mode)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        formPaymentMode === mode
                          ? 'bg-rose-600 text-white border-rose-500 shadow'
                          : 'bg-[#0B0F19] border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  {isHindi ? 'टिप्पणी / रसीद विवरण (वैकल्पिक)' : 'Notes / Vendor Name (Optional)'}
                </label>
                <input
                  type="text"
                  placeholder={isHindi ? 'उदा. शर्मा टी स्टॉल से बिल' : 'e.g. Paid via PhonePe to landlord'}
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/3 py-2.5 bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold rounded-xl"
                >
                  {isHindi ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl shadow-lg"
                >
                  {isHindi ? 'खर्चा सहेजें 💾' : 'Save Expense 💾'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!expenseToDelete}
        title={isHindi ? 'खर्चा हटाएं?' : 'Delete Expense?'}
        message={
          expenseToDelete
            ? `${isHindi ? 'क्या आप सचमुच' : 'Are you sure you want to delete'} "${expenseToDelete.title}" (₹${expenseToDelete.amount}) ${isHindi ? 'को हटाना चाहते हैं?' : '?'}`
            : ''
        }
        confirmText={isHindi ? 'हां, हटाएं' : 'Delete'}
        cancelText={isHindi ? 'रद्द करें' : 'Cancel'}
        onConfirm={handleConfirmDelete}
        onCancel={() => setExpenseToDelete(null)}
        isDestructive={true}
      />
    </div>
  );
};
