import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'hi';

export interface Translations {
  // Navigation & General
  navPosters: string;
  navBilling: string;
  navCreate: string;
  navKhata: string;
  navDukaan: string;
  proVip: string;
  proTrial: string;
  activeAccount: string;
  logout: string;
  settings: string;
  themeToggle: string;
  languageToggle: string;
  darkMode: string;
  lightMode: string;
  
  // Headers & Screen Titles
  titlePosters: string;
  titleBilling: string;
  titleKhata: string;
  titleDukaan: string;
  titleStandee: string;
  titleEditor: string;
  titleCopilot: string;
  titleOnboarding: string;
  titleAuth: string;

  // Home Quick Stats
  quickStatsTitle: string;
  totalUdhar: string;
  activeBilling: string;
  totalCustomers: string;
  totalProducts: string;
  collectNow: string;
  viewBills: string;
  openDukaan: string;

  // Khata
  khataSub: string;
  addCustomer: string;
  searchCustomers: string;
  allFilter: string;
  dueFilter: string;
  settledFilter: string;
  pendingDue: string;
  allClear: string;
  giveCredit: string;
  receivePayment: string;
  sendReminder: string;
  clearBalance: string;
  deleteCustomer: string;
  customerName: string;
  whatsappNumber: string;
  openingBalance: string;
  amount: string;
  billNumber: string;
  note: string;
  txHistory: string;

  // Invoices & Billing
  document: string;
  taxInvoice: string;
  estimate: string;
  challan: string;
  proforma: string;
  gstActive: string;
  nonGst: string;
  previewPrint: string;
  downloadPdf: string;
  customerInfo: string;
  billDate: string;
  dueDate: string;
  paymentStatus: string;
  itemsServices: string;
  itemCatalog: string;
  addCustomItem: string;
  itemName: string;
  rate: string;
  qty: string;
  subtotal: string;
  discount: string;
  grandTotal: string;
  whatsappShare: string;

  // Digital Dukaan
  storeSub: string;
  copyLink: string;
  shareDukaan: string;
  livePreview: string;
  nfcCard: string;
  catalog: string;
  addProduct: string;
  sellingPrice: string;
  mrp: string;
  description: string;
  orderViaWhatsapp: string;
  downloadVCard: string;

  // Common Actions & Form Buttons
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  confirm: string;
  close: string;
  searchPlaceholder: string;
  
  // Empty states
  noCustomers: string;
  noCustomersSub: string;
  noItems: string;
  noItemsSub: string;
  noProducts: string;
  noProductsSub: string;
  noTemplates: string;
  noTemplatesSub: string;
  noTransactions: string;
  noTransactionsSub: string;
}

const translations: Record<Language, Translations> = {
  en: {
    navPosters: 'Posters',
    navBilling: 'Billing',
    navCreate: 'Create',
    navKhata: 'Khata',
    navDukaan: 'Dukaan',
    proVip: 'PRO VIP',
    proTrial: 'PRO (₹1)',
    activeAccount: 'Active Business Account',
    logout: 'Logout / Switch Account',
    settings: 'Business KYC & Settings',
    themeToggle: 'Switch Theme',
    languageToggle: 'Change Language',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',

    titlePosters: 'Posters & Daily Status',
    titleBilling: 'GST & POS Billing',
    titleKhata: 'Digital Khata',
    titleDukaan: 'Digital Dukaan',
    titleStandee: 'UPI Standee Studio',
    titleEditor: 'Poster Canvas Editor',
    titleCopilot: 'AI Voice Copilot',
    titleOnboarding: 'Business KYC Setup',
    titleAuth: 'Sign In',

    quickStatsTitle: 'Live Business Snapshot',
    totalUdhar: 'Total Outstanding Udhar',
    activeBilling: 'Current Invoice Total',
    totalCustomers: 'Khata Customers',
    totalProducts: 'Store Products',
    collectNow: 'Collect',
    viewBills: 'Manage',
    openDukaan: 'View Store',

    khataSub: 'Track customer credit, payments & send instant 1-Click WhatsApp reminders',
    addCustomer: '+ New Customer',
    searchCustomers: 'Search by customer name or phone...',
    allFilter: 'All',
    dueFilter: 'Pending Udhar',
    settledFilter: 'Settled',
    pendingDue: 'Pending',
    allClear: 'All Clear',
    giveCredit: '🔴 Gave Credit (Udhar)',
    receivePayment: '🟢 Received Payment (Jama)',
    sendReminder: 'WhatsApp Reminder',
    clearBalance: 'Clear Balance',
    deleteCustomer: 'Delete Customer',
    customerName: 'Customer Full Name',
    whatsappNumber: 'WhatsApp Mobile Number',
    openingBalance: 'Opening Udhar Balance (₹)',
    amount: 'Amount (₹)',
    billNumber: 'Bill / Invoice #',
    note: 'Item / Transaction Note',
    txHistory: 'Transaction History',

    document: 'Document',
    taxInvoice: 'Tax Invoice',
    estimate: 'Estimate / Quotation',
    challan: 'Delivery Challan',
    proforma: 'Proforma Invoice',
    gstActive: '🧾 GST Active (CGST/SGST)',
    nonGst: '🏷️ Non-GST (0% Tax)',
    previewPrint: 'Preview & Print',
    downloadPdf: 'Download PDF',
    customerInfo: 'Customer & Bill Information',
    billDate: 'Bill Date',
    dueDate: 'Due Date',
    paymentStatus: 'Payment Status',
    itemsServices: 'Items & Services',
    itemCatalog: 'Item Catalog',
    addCustomItem: '+ Custom Item',
    itemName: 'Item / Service Name',
    rate: 'Rate (₹)',
    qty: 'Qty',
    subtotal: 'Subtotal',
    discount: 'Discount',
    grandTotal: 'Grand Total',
    whatsappShare: 'WhatsApp Share',

    storeSub: 'Your 1-page bio-link website with catalog, instant UPI payments, and digital visiting card.',
    copyLink: 'Copy Link',
    shareDukaan: 'Share Dukaan',
    livePreview: 'Live Bio-Link Preview',
    nfcCard: 'NFC Visiting Card',
    catalog: 'Catalog',
    addProduct: '+ Add New Item',
    sellingPrice: 'Selling Price (₹)',
    mrp: 'Original MRP (₹)',
    description: 'Short Description',
    orderViaWhatsapp: 'Order on WhatsApp',
    downloadVCard: 'Download vCard (.vcf)',

    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    confirm: 'Confirm',
    close: 'Close',
    searchPlaceholder: 'Search templates, posters, offers...',

    noCustomers: 'No Customers in Khata Yet',
    noCustomersSub: 'Add your first customer to start tracking udhar and sending WhatsApp reminders.',
    noItems: 'No items in this bill',
    noItemsSub: 'Add items manually or select preset products from the Item Catalog.',
    noProducts: 'Your Digital Dukaan is Empty',
    noProductsSub: 'Add products and services to showcase them on your online storefront.',
    noTemplates: 'No templates match your search',
    noTemplatesSub: 'Try searching for something else or reset your filters.',
    noTransactions: 'No transactions recorded yet',
    noTransactionsSub: 'Record udhar given or payment received to start the ledger.',
  },
  hi: {
    navPosters: 'पोस्टर्स',
    navBilling: 'बिलिंग',
    navCreate: 'नया बनाएं',
    navKhata: 'खाता',
    navDukaan: 'दुकान',
    proVip: 'प्रो वीआईपी',
    proTrial: 'प्रो (₹1)',
    activeAccount: 'एक्टिव बिज़नेस अकाउंट',
    logout: 'लॉगआउट / खाता बदलें',
    settings: 'दुकान प्रोफ़ाइल & सेटिंग्स',
    themeToggle: 'थीम बदलें',
    languageToggle: 'भाषा बदलें',
    darkMode: 'डार्क मोड',
    lightMode: 'लाइट मोड',

    titlePosters: 'पोस्टर्स & दैनिक स्टेटस',
    titleBilling: 'जीएसटी & पीओएस बिलिंग',
    titleKhata: 'डिजिटल खाता',
    titleDukaan: 'डिजिटल दुकान',
    titleStandee: 'यूपीआई स्टेंडी स्टूडियो',
    titleEditor: 'पोस्टर कैनवास एडिटर',
    titleCopilot: 'एआई वॉयस कोपायलट',
    titleOnboarding: 'बिज़नेस प्रोफ़ाइल सेटअप',
    titleAuth: 'साइन इन',

    quickStatsTitle: 'लाइव व्यापार स्थिति',
    totalUdhar: 'कुल बाक़ी उधार (लेना है)',
    activeBilling: 'वर्तमान बिल कुल राशि',
    totalCustomers: 'खाता ग्राहक संख्या',
    totalProducts: 'दुकान प्रोडक्ट्स',
    collectNow: 'उगाही करें',
    viewBills: 'बिल देखें',
    openDukaan: 'दुकान खोलें',

    khataSub: 'ग्राहकों का उधार-जमा ट्रैक करें और 1-क्लिक व्हाट्सएप तकादा भेजें',
    addCustomer: '+ नया ग्राहक जोड़ें',
    searchCustomers: 'ग्राहक का नाम या फोन नंबर खोजें...',
    allFilter: 'सभी',
    dueFilter: 'बाक़ी उधार',
    settledFilter: 'साफ हिसाब',
    pendingDue: 'बाक़ी',
    allClear: 'हिसाब साफ',
    giveCredit: '🔴 मैंने दिया (उधार)',
    receivePayment: '🟢 मुझे मिला (जमा)',
    sendReminder: 'व्हाट्सएप तकादा',
    clearBalance: 'हिसाब बराबर करें',
    deleteCustomer: 'ग्राहक हटाएं',
    customerName: 'ग्राहक का पूरा नाम',
    whatsappNumber: 'व्हाट्सएप मोबाइल नंबर',
    openingBalance: 'शुरुआती उधार राशि (₹)',
    amount: 'राशि (₹)',
    billNumber: 'बिल / इनवॉइस नंबर',
    note: 'सामान या लेन-देन का विवरण',
    txHistory: 'लेन-देन इतिहास',

    document: 'दस्तावेज़ प्रकार',
    taxInvoice: 'टैक्स इनवॉइस',
    estimate: 'कच्चा बिल / कोटेशन',
    challan: 'डिलीवरी चालान',
    proforma: 'प्रोफार्मा इनवॉइस',
    gstActive: '🧾 जीएसटी लागू (CGST/SGST)',
    nonGst: '🏷️ नॉन-जीएसटी (0% टैक्स)',
    previewPrint: 'प्रिंट & देखें',
    downloadPdf: 'पीडीएफ डाउनलोड',
    customerInfo: 'ग्राहक & बिल जानकारी',
    billDate: 'बिल दिनांक',
    dueDate: 'भुगतान अंतिम तिथि',
    paymentStatus: 'भुगतान स्थिति',
    itemsServices: 'सामान & सेवाएं',
    itemCatalog: 'आइटम कैटलॉग',
    addCustomItem: '+ नया आइटम',
    itemName: 'सामान / सेवा का नाम',
    rate: 'दर (₹)',
    qty: 'मात्रा',
    subtotal: 'उप-योग (Subtotal)',
    discount: 'छूट (Discount)',
    grandTotal: 'कुल देय राशि',
    whatsappShare: 'व्हाट्सएप भेजें',

    storeSub: 'आपकी 1-पेज ऑनलाइन दुकान, कैटलॉग, यूपीआई पेमेंट और डिजिटल विजिटिंग कार्ड।',
    copyLink: 'लिंक कॉपी करें',
    shareDukaan: 'दुकान शेयर करें',
    livePreview: 'लाइव बायो-लिंक प्रिव्यू',
    nfcCard: 'NFC विजिटिंग कार्ड',
    catalog: 'कैटलॉग',
    addProduct: '+ नया सामान जोड़ें',
    sellingPrice: 'बिक्री मूल्य (₹)',
    mrp: 'मूल एमआरपी (₹)',
    description: 'संक्षिप्त विवरण',
    orderViaWhatsapp: 'व्हाट्सएप पर ऑर्डर करें',
    downloadVCard: 'vCard (.vcf) डाउनलोड करें',

    save: 'सुरक्षित करें',
    cancel: 'रद्द करें',
    delete: 'हटाएं',
    edit: 'संशोधित करें',
    confirm: 'पुष्टि करें',
    close: 'बंद करें',
    searchPlaceholder: 'पोस्टर्स, ऑफर्स, सुविचार खोजें...',

    noCustomers: 'खाते में अभी कोई ग्राहक नहीं है',
    noCustomersSub: 'उधार ट्रैक करने और व्हाट्सएप तकादा भेजने के लिए पहला ग्राहक जोड़ें।',
    noItems: 'इस बिल में कोई सामान नहीं है',
    noItemsSub: 'नया आइटम जोड़ें या कैटलॉग से सीधे सेलेक्ट करें।',
    noProducts: 'आपकी डिजिटल दुकान खाली है',
    noProductsSub: 'अपनी दुकान पर प्रदर्शित करने के लिए सामान या सेवाएं जोड़ें।',
    noTemplates: 'खोज के अनुसार कोई पोस्टर नहीं मिला',
    noTemplatesSub: 'कुछ और खोजें या फ़िल्टर रीसेट करें।',
    noTransactions: 'अभी कोई लेन-देन दर्ज नहीं है',
    noTransactionsSub: 'उधार या जमा दर्ज करके खाता शुरू करें।',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: Translations;
  isHindi: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('brandx_language') as Language;
      if (saved === 'en' || saved === 'hi') return saved;
    } catch {}
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('brandx_language', lang);
    } catch {}
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'hi' : 'en');
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
    toggleLanguage,
    t: translations[language],
    isHindi: language === 'hi',
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
