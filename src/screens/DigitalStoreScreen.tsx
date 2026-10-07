import React, { useState, useEffect, useMemo } from 'react';
import { BusinessProfile, StoreProduct, ProductCategoryItem } from '../types';
import { APP_IMAGES } from '../data/mockData';
import { useLanguage } from '../context/LanguageContext';
import { EmptyState } from '../components/EmptyState';
import { ConfirmModal } from '../components/ConfirmModal';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { QRCodeModal } from '../components/QRCodeModal';
import { NfcWriterModal } from '../components/NfcWriterModal';
import {
  productApi,
  authApi,
  digitalStoreApi,
  digitalCardApi,
  BackendDigitalStore,
  BackendDigitalStoreItem,
  BackendDigitalCard,
} from '../services/api';
import { NfcCardPdfTemplate, NfcCardExportData } from '../components/NfcCardPdfTemplate';
import { exportNfcVisitingCardToPdf, prepareNfcCardExportData } from '../utils/nfcCardPdfExport';
import { getNfcCardTheme } from '../utils/nfcCardTheme';
import { resolveImageUrl } from '../utils/imageUrl';


interface DigitalStoreScreenProps {
  business: BusinessProfile;
  products: StoreProduct[];
  onUpdateProducts: (products: StoreProduct[]) => void;
  onOpenPro: () => void;
}

const COMMON_UNITS = [
  'PCS', 'BOX', 'KG', 'GRAM', 'LITRE', 'ML', 'METER',
  'CM', 'FEET', 'DOZEN', 'PAIR', 'PACK', 'BAG', 'BOTTLE', 'SET', 'OTHER'
];

export const DigitalStoreScreen: React.FC<DigitalStoreScreenProps> = ({
  business,
  products,
  onUpdateProducts,
}) => {
  const { t, isHindi } = useLanguage();
  const [activeTab, setActiveTab] = useState<'store' | 'vcard' | 'manage'>('store');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('500');

  // Backend Real State
  const [store, setStore] = useState<BackendDigitalStore | null>(null);
  const [card, setCard] = useState<BackendDigitalCard | null>(null);
  const [isStoreLoading, setIsStoreLoading] = useState(false);
  const [isCardLoading, setIsCardLoading] = useState(false);

  // Search & Filters for Catalog (Manage Tab)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [categories, setCategories] = useState<ProductCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals & Forms for Catalog
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null);
  const [productToDelete, setProductToDelete] = useState<StoreProduct | null>(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Quick Stock In/Out Adjustment Modal
  const [stockActionProduct, setStockActionProduct] = useState<StoreProduct | null>(null);
  const [stockActionType, setStockActionType] = useState<'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT'>('STOCK_IN');
  const [stockActionQty, setStockActionQty] = useState('1');
  const [stockActionNote, setStockActionNote] = useState('');
  const [isStockSaving, setIsStockSaving] = useState(false);

  // QR Code & NFC Modals
  const [qrModalConfig, setQrModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    url: string;
    shopName: string;
    type: 'store' | 'card';
  }>({
    isOpen: false,
    title: '',
    url: '',
    shopName: '',
    type: 'store',
  });

  const [nfcModalConfig, setNfcModalConfig] = useState<{
    isOpen: boolean;
    url: string;
    name: string;
  }>({
    isOpen: false,
    url: '',
    name: '',
  });

  // Store Settings Modal State
  const [showStoreSettingsModal, setShowStoreSettingsModal] = useState(false);
  const [isSavingStore, setIsSavingStore] = useState(false);
  const [storeFormData, setStoreFormData] = useState({
    title: '',
    tagline: '',
    description: '',
    whatsappNumber: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    mapUrl: '',
    websiteUrl: '',
    upiId: '',
    businessHours: '',
    googleReviewUrl: '',
    theme: 'MODERN',
  });

  // Card Settings Modal State
  const [showCardSettingsModal, setShowCardSettingsModal] = useState(false);
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [cardFormData, setCardFormData] = useState({
    fullName: '',
    designation: '',
    companyName: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    bio: '',
    upiId: '',
    website: '',
    theme: 'CLASSIC_DARK',
  });

  // Add to Showcase Modal State
  const [showAddShowcaseModal, setShowAddShowcaseModal] = useState(false);
  const [showcaseSearchQuery, setShowcaseSearchQuery] = useState('');
  const [addingShowcaseId, setAddingShowcaseId] = useState<string | null>(null);

  // NFC Card PDF Export State
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfProgressText, setPdfProgressText] = useState('');
  const [exportCardData, setExportCardData] = useState<NfcCardExportData | null>(null);

  // Card 3D Flip State
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Product Form Fields (Item Master)
  const [formData, setFormData] = useState({
    name: '',
    type: 'GOODS' as 'GOODS' | 'SERVICE',
    category: 'General',
    categoryId: '',
    sellingPrice: '999',
    purchasePrice: '',
    mrp: '',
    hsnSac: '',
    gstRate: '18',
    taxType: 'EXCLUSIVE' as 'EXCLUSIVE' | 'INCLUSIVE' | 'EXEMPT',
    unit: 'PCS',
    itemCode: '',
    sku: '',
    barcode: '',
    stockQty: '10',
    lowStockThreshold: '5',
    description: '',
    imageUrl: APP_IMAGES.weddingTemplate,
  });

  const [formErrors, setFormErrors] = useState<{ name?: string; price?: string }>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch real Digital Store and Digital Card
  const fetchStoreAndCard = async () => {
    if (!authApi.isAuthenticated()) return;

    setIsStoreLoading(true);
    digitalStoreApi.getStore()
      .then((res) => {
        if (res.success && res.data) {
          setStore(res.data);
          setStoreFormData({
            title: res.data.title || business.name || '',
            tagline: res.data.tagline || '',
            description: res.data.description || '',
            whatsappNumber: res.data.whatsappNumber || res.data.phone || business.phone || '',
            email: res.data.email || business.email || '',
            address: res.data.address || business.address || '',
            city: res.data.city || business.city || '',
            state: res.data.state || business.state || '',
            pincode: res.data.pincode || business.pincode || '',
            mapUrl: res.data.mapUrl || '',
            websiteUrl: res.data.websiteUrl || res.data.website || '',
            upiId: res.data.upiId || business.upiId || '',
            businessHours: res.data.businessHours || 'Mon - Sat: 9:00 AM - 9:00 PM',
            googleReviewUrl: res.data.googleReviewUrl || '',
            theme: res.data.theme || 'MODERN',
          });
        }
      })
      .catch((err) => console.error('Error fetching store:', err))
      .finally(() => setIsStoreLoading(false));

    setIsCardLoading(true);
    digitalCardApi.getCard()
      .then((res) => {
        if (res.success && res.data) {
          setCard(res.data);
          setCardFormData({
            fullName: res.data.fullName || res.data.name || business.ownerName || business.name || '',
            designation: res.data.designation || 'Owner / Vyapari',
            companyName: res.data.companyName || res.data.company || business.name || '',
            phone: res.data.phone || res.data.mobile || business.phone || '',
            whatsapp: res.data.whatsapp || business.phone || '',
            email: res.data.email || business.email || '',
            address: res.data.address || `${business.address || ''}, ${business.city || ''}`,
            bio: res.data.bio || 'Excellence and trust in every interaction ✨',
            upiId: res.data.upiId || business.upiId || '',
            website: res.data.website || '',
            theme: res.data.theme || 'CLASSIC_DARK',
          });
        }
      })
      .catch((err) => console.error('Error fetching card:', err))
      .finally(() => setIsCardLoading(false));
  };

  // Load categories and sync products & store/card on mount
  useEffect(() => {
    productApi.listCategories()
      .then((res) => {
        if (res.success && res.data && Array.isArray(res.data)) {
          setCategories(res.data);
        }
      })
      .catch(() => {});

    if (authApi.isAuthenticated()) {
      setIsLoading(true);
      productApi.listProducts({ limit: 200 })
        .then((res) => {
          if (res.success && res.data && Array.isArray(res.data)) {
            const mapped = res.data.map((p) => productApi.backendToStoreProduct(p));
            onUpdateProducts(mapped);
          }
        })
        .finally(() => setIsLoading(false));

      fetchStoreAndCard();
    }
  }, []);

  // Compute public URLs
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://brandx.me';
  const storeSlug = store?.slug || business.storeSlug || business.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const cardSlug = card?.slug || business.name.toLowerCase().replace(/[^a-z0-9]/g, '-');

  const storeUrl = `${currentOrigin}/store/${storeSlug}`;
  const cardUrl = `${currentOrigin}/card/${cardSlug}`;
  const activeCardTheme = getNfcCardTheme(cardFormData.theme || card?.theme);


  // Store actions
  const handleCopyStoreLink = () => {
    navigator.clipboard.writeText(storeUrl);
    showToast('Digital Dukaan link copied to clipboard! 📋');
  };

  const handleShareWhatsAppStore = () => {
    const text = encodeURIComponent(
      `🛍️ *Welcome to ${store?.title || business.name}!* \n\n` +
      `Explore our latest products, festive offers & order directly online:\n` +
      `🔗 ${storeUrl}\n\n` +
      `📍 *Visit Us:* ${store?.address || business.address}, ${store?.city || business.city}\n` +
      `📞 *Call / WhatsApp:* +91 ${store?.phone || business.phone}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    showToast('Dukaan link shared to WhatsApp! 💬');
  };

  const handleTogglePublishStore = async () => {
    if (!store) return;
    try {
      if (store.isPublished) {
        const res = await digitalStoreApi.unpublishStore();
        if (res.success && res.data) {
          setStore(res.data);
          showToast('Digital Dukaan unpublished (Draft Mode).');
        }
      } else {
        const res = await digitalStoreApi.publishStore();
        if (res.success && res.data) {
          setStore(res.data);
          showToast('Digital Dukaan is now LIVE to the world! 🌐');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Error toggling publish status');
    }
  };

  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingStore(true);
    try {
      const res = await digitalStoreApi.updateStore(storeFormData);
      if (res.success && res.data) {
        setStore(res.data);
        showToast('Digital Dukaan settings updated! ✨');
        setShowStoreSettingsModal(false);
      } else {
        showToast(res.error?.message || 'Failed to update store settings');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save store settings');
    } finally {
      setIsSavingStore(false);
    }
  };

  // Card actions
  const handleCopyCardLink = () => {
    navigator.clipboard.writeText(cardUrl);
    showToast('NFC Digital Card link copied! 📋');
  };

  const handleShareWhatsAppCard = () => {
    const text = encodeURIComponent(
      `📇 *Digital Visiting Card of ${card?.fullName || business.ownerName || business.name}*\n` +
      `${card?.designation || 'Owner'} at ${card?.companyName || business.name}\n\n` +
      `Save my contact directly into your phone with one tap:\n` +
      `🔗 ${cardUrl}\n\n` +
      `📞 Phone: +91 ${card?.phone || business.phone}\n` +
      `💬 WhatsApp: +91 ${card?.whatsapp || business.phone}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    showToast('Card link shared to WhatsApp! 💬');
  };

  const handleTogglePublishCard = async () => {
    if (!card) return;
    try {
      if (card.isPublished) {
        const res = await digitalCardApi.unpublishCard();
        if (res.success && res.data) {
          setCard(res.data);
          showToast('Digital Card unpublished (Draft Mode).');
        }
      } else {
        const res = await digitalCardApi.publishCard();
        if (res.success && res.data) {
          setCard(res.data);
          showToast('NFC Digital Card is now LIVE! 🌐');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Error toggling card publish status');
    }
  };

  const handleSaveCardSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCard(true);
    try {
      const res = await digitalCardApi.updateCard(cardFormData);
      if (res.success && res.data) {
        setCard(res.data);
        showToast('NFC Card settings updated! ✨');
        setShowCardSettingsModal(false);
      } else {
        showToast(res.error?.message || 'Failed to update card settings');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save card settings');
    } finally {
      setIsSavingCard(false);
    }
  };

  // Download direct vCard from backend
  const handleDownloadVCard = () => {
    if (card?.slug) {
      const downloadUrl = digitalCardApi.getVCardDownloadUrl(card.slug);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `${(card.fullName || business.name).replace(/\s+/g, '_')}_contact.vcf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Downloading verified vCard (.vcf) 📇');
    } else {
      // Local fallback vCard generator
      const vCardData = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${card?.fullName || business.name}`,
        `ORG:${card?.companyName || business.name}`,
        `TITLE:${card?.designation || business.category}`,
        `TEL;TYPE=WORK,VOICE:+91${card?.phone || business.phone}`,
        `EMAIL:${card?.email || business.email || 'info@brandx.me'}`,
        `ADR;TYPE=WORK:;;${card?.address || business.address};${business.city};;;India`,
        `URL:${cardUrl}`,
        `NOTE:UPI: ${card?.upiId || business.upiId}`,
        'END:VCARD'
      ].join('\n');

      const blob = new Blob([vCardData], { type: 'text/vcard;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${business.name.replace(/\s+/g, '_')}_contact.vcf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Digital vCard (.vcf) downloaded! 📇');
    }
  };

  // Pre-prepare high-resolution card export template and QR code whenever card, business or theme changes
  useEffect(() => {
    if (activeTab === 'vcard' || !exportCardData) {
      prepareNfcCardExportData(business, card, cardUrl, cardFormData.theme || card?.theme)
        .then((data) => setExportCardData(data))
        .catch((err) => console.warn('Could not prepare NFC card export data:', err));
    }
  }, [activeTab, business, card, cardUrl, cardFormData.theme]);

  // Download high-resolution print-ready 2-page NFC Card PDF (Front & Back)
  const handleDownloadCardPdf = async (printAfter = false) => {
    setIsExportingPdf(true);
    setPdfProgressText(printAfter ? 'Preparing card for print...' : 'Generating 2-page Card PDF...');
    showToast(printAfter ? 'Generating print-ready Card PDF... 🖨️' : 'Generating high-res NFC Card PDF... 📇');

    try {
      // 1. Fresh sync of data with current form theme
      const freshData = await prepareNfcCardExportData(
        business,
        card,
        cardUrl,
        cardFormData.theme || card?.theme
      );
      setExportCardData(freshData);

      // Brief delay to let React flush the DOM update to the template container
      await new Promise((r) => setTimeout(r, 150));

      const res = await exportNfcVisitingCardToPdf({
        business,
        card,
        cardUrl,
        themeId: cardFormData.theme || card?.theme,
        printAfterGenerate: printAfter,
        onProgress: (step) => setPdfProgressText(step),
      });

      if (res.success) {
        showToast(
          printAfter
            ? 'High-res NFC Card sent to printer! 🖨️'
            : `NFC Card PDF downloaded! (${res.filename}) ✨`
        );
      } else {
        showToast(`PDF Export failed: ${res.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('PDF export error:', err);
      showToast(`Error: ${err?.message || 'Failed to export card PDF'}`);
    } finally {
      setIsExportingPdf(false);
      setPdfProgressText('');
    }
  };


  // Add Product to Store Showcase
  const handleAddProductToShowcase = async (product: StoreProduct) => {
    setAddingShowcaseId(product.id);
    try {
      const res = await digitalStoreApi.addStoreItem({
        productId: product.id,
        name: product.name,
        displayName: product.name,
        price: product.sellingPrice ?? product.price,
        displayPrice: product.sellingPrice ?? product.price,
        originalPrice: product.mrp || product.originalPrice || undefined,
        description: product.description,
        imageUrl: product.imageUrl,
        category: product.category || 'General',
        isAvailable: true,
        isVisible: true,
        sortOrder: store?.items?.length || 0,
      });

      if (res.success && res.data) {
        if (store) {
          setStore({
            ...store,
            items: [...store.items, res.data],
          });
        }
        showToast(`"${product.name}" added to Digital Dukaan showcase! 🎉`);
      } else {
        showToast(res.error?.message || 'Failed to add item to showcase');
      }
    } catch (err: any) {
      showToast(err.message || 'Error adding item to showcase');
    } finally {
      setAddingShowcaseId(null);
    }
  };

  // Toggle Showcase Item Visibility
  const handleToggleItemVisibility = async (item: BackendDigitalStoreItem) => {
    try {
      const res = await digitalStoreApi.updateStoreItem(item.id, {
        isVisible: !item.isVisible,
      });
      if (res.success && res.data && store) {
        setStore({
          ...store,
          items: store.items.map((i) => (i.id === item.id ? res.data : i)),
        });
        showToast(item.isVisible ? 'Item hidden from storefront' : 'Item visible on storefront ✨');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating item visibility');
    }
  };

  // Remove Item from Showcase (leaves Product Master intact)
  const handleDeleteShowcaseItem = async (itemId: string, itemName: string) => {
    try {
      const res = await digitalStoreApi.deleteStoreItem(itemId);
      if (res.success && store) {
        setStore({
          ...store,
          items: store.items.filter((i) => i.id !== itemId),
        });
        showToast(`"${itemName}" removed from showcase (Product Master preserved).`);
      }
    } catch (err: any) {
      showToast(err.message || 'Error removing item from showcase');
    }
  };

  // Reorder Showcase Items (Move Up / Down)
  const handleMoveShowcaseItem = async (index: number, direction: 'up' | 'down') => {
    if (!store || !store.items) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= store.items.length) return;

    const newItems = [...store.items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    // Update local state instantly for smooth UX
    setStore({
      ...store,
      items: newItems,
    });

    const payload = newItems.map((item, idx) => ({
      id: item.id,
      sortOrder: idx,
    }));

    try {
      await digitalStoreApi.reorderStoreItems(payload);
    } catch (err) {
      console.error('Failed to sync reordered showcase items:', err);
    }
  };

  // Phone Mockup Instant UPI Pay
  const handlePayViaUpi = () => {
    const amount = parseFloat(payAmount) || 0;
    if (amount <= 0) {
      showToast('Please enter an amount to pay');
      return;
    }
    const upiIdToUse = store?.upiId || business.upiId;
    if (!upiIdToUse) {
      showToast('Merchant UPI ID not configured. Please add in Profile.');
      return;
    }
    const upiLink = `upi://pay?pa=${encodeURIComponent(upiIdToUse)}&pn=${encodeURIComponent(store?.title || business.name || 'Merchant')}&am=${amount}&cu=INR`;
    window.location.href = upiLink;
    showToast('Opening UPI App (GPay / PhonePe / Paytm)...');
  };

  // Catalog Item Master handlers (Manage Tab)
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      type: 'GOODS',
      category: categories[0]?.name || 'General',
      categoryId: categories[0]?.id || '',
      sellingPrice: '',
      purchasePrice: '',
      mrp: '',
      hsnSac: '',
      gstRate: '18',
      taxType: 'EXCLUSIVE',
      unit: 'PCS',
      itemCode: '',
      sku: '',
      barcode: '',
      stockQty: '10',
      lowStockThreshold: '5',
      description: '',
      imageUrl: APP_IMAGES.weddingTemplate,
    });
    setFormErrors({});
    setShowProductModal(true);
  };

  const handleOpenEditModal = (p: StoreProduct) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      type: p.type || 'GOODS',
      category: p.category || 'General',
      categoryId: p.categoryId || '',
      sellingPrice: String(p.sellingPrice ?? p.price ?? ''),
      purchasePrice: p.purchasePrice != null ? String(p.purchasePrice) : '',
      mrp: p.mrp != null ? String(p.mrp) : p.originalPrice != null ? String(p.originalPrice) : '',
      hsnSac: p.hsnSac || p.hsnCode || '',
      gstRate: String(p.gstRate ?? p.gstPercent ?? 18),
      taxType: p.taxType || 'EXCLUSIVE',
      unit: p.unit || 'PCS',
      itemCode: p.itemCode || '',
      sku: p.sku || '',
      barcode: p.barcode || '',
      stockQty: String(p.currentStock ?? p.stockQty ?? 0),
      lowStockThreshold: String(p.lowStockThreshold ?? 5),
      description: p.description || '',
      imageUrl: p.imageUrl || APP_IMAGES.weddingTemplate,
    });
    setFormErrors({});
    setShowProductModal(true);
  };

  const validateProductForm = (): boolean => {
    const errors: { name?: string; price?: string } = {};
    if (!formData.name.trim()) {
      errors.name = isHindi ? 'सामान का नाम आवश्यक है' : 'Product name is required';
    }
    const priceVal = parseFloat(formData.sellingPrice);
    if (isNaN(priceVal) || priceVal < 0) {
      errors.price = isHindi ? 'मान्य विक्रय मूल्य (₹ >= 0) दर्ज करें' : 'Valid selling price (₹ >= 0) required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateProductForm()) return;

    setIsSaving(true);
    const sellingPrice = parseFloat(formData.sellingPrice) || 0;
    const purchasePrice = formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined;
    const mrp = formData.mrp ? parseFloat(formData.mrp) : undefined;
    const stockQty = parseInt(formData.stockQty) || 0;
    const lowStockThreshold = parseInt(formData.lowStockThreshold) || 5;
    const gstRate = parseFloat(formData.gstRate) || 18;

    const payload = {
      name: formData.name.trim(),
      type: formData.type,
      category: formData.category.trim() || 'General',
      categoryId: formData.categoryId || undefined,
      sellingPrice,
      purchasePrice,
      mrp,
      hsnSac: formData.hsnSac.trim() || undefined,
      hsnCode: formData.hsnSac.trim() || undefined,
      gstRate,
      gstPercent: gstRate,
      taxType: formData.taxType,
      unit: formData.unit,
      itemCode: formData.itemCode.trim() || undefined,
      sku: formData.sku.trim() || undefined,
      barcode: formData.barcode.trim() || undefined,
      openingStock: stockQty,
      currentStock: stockQty,
      lowStockThreshold,
      description: formData.description.trim() || 'Quality assured by vyapari.',
      imageUrl: formData.imageUrl || APP_IMAGES.weddingTemplate,
      isActive: true,
      isAvailable: true,
    };

    try {
      if (editingProduct) {
        const res = await productApi.updateProduct(editingProduct.id, payload);
        if (res.success && res.data) {
          const updated = productApi.backendToStoreProduct(res.data);
          onUpdateProducts(products.map((p) => (p.id === editingProduct.id ? updated : p)));
        } else {
          const localUpdated: StoreProduct = {
            ...editingProduct,
            ...payload,
            price: sellingPrice,
            stockQty,
          };
          onUpdateProducts(products.map((p) => (p.id === editingProduct.id ? localUpdated : p)));
        }
        showToast(`Item "${payload.name}" updated successfully! ✨`);
      } else {
        const res = await productApi.createProduct(payload);
        if (res.success && res.data) {
          const created = productApi.backendToStoreProduct(res.data);
          onUpdateProducts([created, ...products]);
        } else {
          const localCreated: StoreProduct = {
            id: `sp-${Date.now()}`,
            ...payload,
            price: sellingPrice,
            stockQty,
          };
          onUpdateProducts([localCreated, ...products]);
        }
        showToast(`Product "${payload.name}" added to catalog! 🎉`);
      }
      setShowProductModal(false);
    } catch (err: any) {
      showToast(err.message || 'Error saving product');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await productApi.deleteProduct(productToDelete.id);
      const updated = products.filter((p) => p.id !== productToDelete.id);
      onUpdateProducts(updated);
      showToast(`Product "${productToDelete.name}" removed from catalog.`);
    } catch {
      const updated = products.filter((p) => p.id !== productToDelete.id);
      onUpdateProducts(updated);
      showToast(`Product "${productToDelete.name}" removed from catalog.`);
    } finally {
      setProductToDelete(null);
    }
  };

  const handleConfirmStockAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockActionProduct) return;
    const qty = parseFloat(stockActionQty);
    if (isNaN(qty) || qty <= 0) {
      showToast('Please enter a valid quantity greater than 0');
      return;
    }

    setIsStockSaving(true);
    try {
      if (stockActionType === 'ADJUSTMENT') {
        const res = await productApi.adjustStock(stockActionProduct.id, {
          quantity: qty,
          adjustmentType: 'SET',
          reason: stockActionNote || 'Manual physical stock adjustment',
        });
        if (res.success && res.data?.product) {
          const updated = productApi.backendToStoreProduct(res.data.product);
          onUpdateProducts(products.map((p) => (p.id === stockActionProduct.id ? updated : p)));
        } else {
          onUpdateProducts(
            products.map((p) =>
              p.id === stockActionProduct.id
                ? { ...p, currentStock: qty, stockQty: qty }
                : p
            )
          );
        }
        showToast(`Stock count reset to ${qty} ${stockActionProduct.unit || 'PCS'} 📦`);
      } else {
        const res = await productApi.changeStock(stockActionProduct.id, {
          type: stockActionType,
          quantity: qty,
          note: stockActionNote || undefined,
        });
        if (res.success && res.data?.product) {
          const updated = productApi.backendToStoreProduct(res.data.product);
          onUpdateProducts(products.map((p) => (p.id === stockActionProduct.id ? updated : p)));
        } else {
          const current = stockActionProduct.currentStock ?? stockActionProduct.stockQty ?? 0;
          const newStock = stockActionType === 'STOCK_IN' ? current + qty : Math.max(0, current - qty);
          onUpdateProducts(
            products.map((p) =>
              p.id === stockActionProduct.id
                ? { ...p, currentStock: newStock, stockQty: newStock }
                : p
            )
          );
        }
        showToast(
          stockActionType === 'STOCK_IN'
            ? `Added +${qty} to stock! 📈`
            : `Deducted -${qty} from stock! 📉`
        );
      }
      setStockActionProduct(null);
      setStockActionNote('');
    } catch (err: any) {
      showToast(err.message || 'Error updating stock');
    } finally {
      setIsStockSaving(false);
    }
  };

  // Filter Catalog Products (Manage Tab)
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesCat = p.category?.toLowerCase().includes(q);
        const matchesBarcode = p.barcode?.toLowerCase().includes(q);
        const matchesSku = p.sku?.toLowerCase().includes(q);
        const matchesCode = p.itemCode?.toLowerCase().includes(q);
        const matchesHsn = (p.hsnSac || p.hsnCode)?.toLowerCase().includes(q);
        if (!matchesName && !matchesCat && !matchesBarcode && !matchesSku && !matchesCode && !matchesHsn) {
          return false;
        }
      }

      if (selectedCategoryFilter !== 'All') {
        if (p.category !== selectedCategoryFilter) return false;
      }

      if (showLowStockOnly) {
        const current = p.currentStock ?? p.stockQty ?? 0;
        const threshold = p.lowStockThreshold ?? 5;
        if (current > threshold) return false;
      }

      return true;
    });
  }, [products, searchQuery, selectedCategoryFilter, showLowStockOnly]);

  const filterCategories = useMemo(() => {
    const set = new Set<string>();
    categories.forEach((c) => set.add(c.name));
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [categories, products]);

  // Showcase items list to display
  const showcaseItems = store?.items || [];

  return (
    <div className="flex flex-col w-full pb-32 bg-[#0B0F19] text-white min-h-screen">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-2xl flex items-center gap-2 border border-white/20 animate-bounce">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-6xl mx-auto w-full px-4 pt-4 space-y-5">
        
        {/* Header Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E1B4B] via-[#0F172A] to-[#1E293B] p-5 border border-white/10 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-2xl">🌐</span>
              <h1 className="text-lg md:text-xl font-black text-white tracking-wide">
                {activeTab === 'store' ? (store?.title || business.name) : activeTab === 'vcard' ? (card?.fullName || business.name) : t.titleDukaan}
              </h1>
              {activeTab === 'store' ? (
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border flex items-center gap-1 ${
                  store?.isPublished
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${store?.isPublished ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  {store?.isPublished ? 'DUKAAN LIVE' : 'DRAFT MODE'}
                </span>
              ) : activeTab === 'vcard' ? (
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border flex items-center gap-1 ${
                  card?.isPublished
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${card?.isPublished ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  {card?.isPublished ? 'CARD LIVE' : 'DRAFT MODE'}
                </span>
              ) : null}

              {/* Views Count */}
              {activeTab === 'store' && store && (
                <span className="text-[11px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-blue-400">visibility</span>
                  <span>{store.viewsCount || 0} views</span>
                </span>
              )}
              {activeTab === 'vcard' && card && (
                <span className="text-[11px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-purple-400">contactless</span>
                  <span>{card.viewsCount || 0} taps</span>
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 max-w-xl">
              {activeTab === 'store'
                ? (store?.tagline || 'Accept direct WhatsApp orders, instant UPI payments, and showcase featured catalog 24/7.')
                : activeTab === 'vcard'
                ? 'High-impact contactless digital business card with RFC 2426 vCard download, Web NFC tap, and instant contact save.'
                : 'Manage your centralized Product Master, inventory stock levels, barcode scanner, and GST rates.'}
            </p>

            <div className="flex items-center gap-2 pt-0.5">
              <code className="text-[11px] text-blue-400 bg-blue-950/70 px-2.5 py-1 rounded-xl border border-blue-800/50 select-all font-mono truncate max-w-md">
                {activeTab === 'store' ? storeUrl : activeTab === 'vcard' ? cardUrl : storeUrl}
              </code>
            </div>
          </div>

          {/* Quick Header Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {activeTab === 'store' ? (
              <>
                <button
                  onClick={handleCopyStoreLink}
                  className="flex items-center gap-1 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/10 transition-all active:scale-95 cursor-pointer"
                  title="Copy Storefront URL"
                >
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  <span>Copy</span>
                </button>
                <button
                  onClick={handleShareWhatsAppStore}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
                  title="Share Store on WhatsApp"
                >
                  <span>💬</span>
                  <span>Share</span>
                </button>
                <button
                  onClick={() =>
                    setQrModalConfig({
                      isOpen: true,
                      title: 'Digital Dukaan QR Standee',
                      subtitle: 'Customers scan to open your online store, browse catalog & pay via UPI',
                      url: storeUrl,
                      shopName: store?.title || business.name,
                      type: 'store',
                    })
                  }
                  className="flex items-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow transition-all active:scale-95 cursor-pointer"
                  title="Generate QR Standee"
                >
                  <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                  <span>QR Code</span>
                </button>
                <a
                  href={storeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-3 py-2 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 hover:text-white text-xs font-semibold rounded-xl border border-blue-500/40 transition-all"
                  title="Open Public Storefront"
                >
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  <span>Open</span>
                </a>
              </>
            ) : activeTab === 'vcard' ? (
              <>
                <button
                  onClick={handleCopyCardLink}
                  className="flex items-center gap-1 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/10 transition-all active:scale-95 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  <span>Copy</span>
                </button>
                <button
                  onClick={handleShareWhatsAppCard}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
                >
                  <span>💬</span>
                  <span>Share</span>
                </button>
                <button
                  onClick={() =>
                    setQrModalConfig({
                      isOpen: true,
                      title: 'Smart Visiting Card QR',
                      subtitle: 'Scan to save full contact details & open digital visiting card',
                      url: cardUrl,
                      shopName: card?.fullName || business.name,
                      type: 'card',
                    })
                  }
                  className="flex items-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow transition-all active:scale-95 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                  <span>QR</span>
                </button>
                <button
                  onClick={() =>
                    setNfcModalConfig({
                      isOpen: true,
                      url: cardUrl,
                      name: card?.fullName || business.name,
                    })
                  }
                  className="flex items-center gap-1 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow transition-all active:scale-95 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">contactless</span>
                  <span>NFC Tag</span>
                </button>
                <a
                  href={cardUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-3 py-2 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 hover:text-white text-xs font-semibold rounded-xl border border-blue-500/40 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  <span>Open</span>
                </a>
              </>
            ) : null}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-center gap-2 p-1.5 bg-[#131B2E] rounded-2xl border border-white/10 max-w-lg mx-auto">
          <button
            onClick={() => setActiveTab('store')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'store'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🏪</span>
            <span>Digital Dukaan</span>
          </button>
          <button
            onClick={() => setActiveTab('vcard')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'vcard'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>📇</span>
            <span>NFC Visiting Card</span>
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'manage'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>📦</span>
            <span>{t.catalog} ({products.length})</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: Digital Dukaan Manager & Live Mobile Preview                        */}
        {/* ========================================================================= */}
        {activeTab === 'store' && (
          <div className="space-y-6">
            {/* Store Management Sub-Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#131B2E] p-4 rounded-2xl border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 p-0.5 shrink-0 overflow-hidden shadow">
                  <img
                    src={resolveImageUrl(business.logoUrl || APP_IMAGES.logo)}
                    alt={business.name}
                    className="w-full h-full object-cover rounded-[10px]"
                  />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>{store?.title || business.name}</span>
                    <span className="material-symbols-outlined text-blue-400 text-[16px]">verified</span>
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Showcase: {showcaseItems.length} items &bull; Slug: <span className="font-mono text-indigo-300">/{storeSlug}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Store Settings Button */}
                <button
                  onClick={() => setShowStoreSettingsModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-xl border border-white/10 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">tune</span>
                  <span>Edit Dukaan Details</span>
                </button>

                {/* Publish / Unpublish Toggle */}
                <button
                  onClick={handleTogglePublishStore}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow active:scale-95 cursor-pointer ${
                    store?.isPublished
                      ? 'bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {store?.isPublished ? 'pause_circle' : 'rocket_launch'}
                  </span>
                  <span>{store?.isPublished ? 'Make Draft' : 'Publish Store 🚀'}</span>
                </button>
              </div>
            </div>

            {/* Split View: Showcase Management on Left, Live Mockup on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Dukaan Showcase Items Management */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between bg-[#131B2E] p-3.5 rounded-2xl border border-white/10">
                  <div>
                    <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <span>Dukaan Showcase Items</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300">
                        {showcaseItems.length}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      These items are featured on your public storefront. Removing them here keeps them in your Product Master.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddShowcaseModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow transition-all active:scale-95 cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span>+ Add Items</span>
                  </button>
                </div>

                {/* Items List */}
                {showcaseItems.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-[#131B2E] border border-white/10 text-center space-y-3">
                    <div className="text-4xl">🛍️</div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white">No items in your Dukaan showcase yet</h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Pick items from your Product Master catalog to feature them on your online storefront.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddShowcaseModal(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow cursor-pointer"
                    >
                      + Add Products from Catalog
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {showcaseItems.map((item, index) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          item.isVisible
                            ? 'bg-[#131B2E] border-white/10 hover:border-blue-500/30'
                            : 'bg-slate-900/50 border-white/5 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Reorder Buttons */}
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => handleMoveShowcaseItem(index, 'up')}
                              disabled={index === 0}
                              className="p-1 hover:bg-white/10 disabled:opacity-20 text-slate-400 hover:text-white rounded cursor-pointer"
                              title="Move Up"
                            >
                              <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                            </button>
                            <button
                              onClick={() => handleMoveShowcaseItem(index, 'down')}
                              disabled={index === showcaseItems.length - 1}
                              className="p-1 hover:bg-white/10 disabled:opacity-20 text-slate-400 hover:text-white rounded cursor-pointer"
                              title="Move Down"
                            >
                              <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                            </button>
                          </div>

                          <img
                            src={resolveImageUrl(item.imageUrl || APP_IMAGES.weddingTemplate)}
                            alt={item.name}
                            className="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/10"
                          />

                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-white truncate max-w-[180px]">
                                {item.displayName || item.name}
                              </h4>
                              {!item.isVisible && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                                  HIDDEN
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 truncate max-w-[220px]">
                              {item.category} &bull; {item.description || 'No description'}
                            </p>
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs font-bold text-emerald-400 font-mono">
                                ₹{item.displayPrice ?? item.price}
                              </span>
                              {item.originalPrice && (
                                <span className="text-[10px] text-slate-400 line-through font-mono">
                                  ₹{item.originalPrice}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Item Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Visibility Toggle */}
                          <button
                            onClick={() => handleToggleItemVisibility(item)}
                            className={`p-2 rounded-xl transition-all cursor-pointer ${
                              item.isVisible
                                ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                            title={item.isVisible ? 'Hide from storefront' : 'Make visible on storefront'}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {item.isVisible ? 'visibility' : 'visibility_off'}
                            </span>
                          </button>

                          {/* Delete Showcase Item */}
                          <button
                            onClick={() => handleDeleteShowcaseItem(item.id, item.name)}
                            className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-all cursor-pointer"
                            title="Remove from Dukaan (leaves Product Master intact)"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Phone Mockup Frame (Live Preview) */}
              <div className="lg:col-span-5 flex justify-center sticky top-4">
                <div className="w-full max-w-[360px] bg-slate-900 p-3 rounded-[40px] shadow-2xl border-4 border-slate-700/80 relative">
                  
                  {/* Phone Speaker & Dynamic Island */}
                  <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-3.5 bg-slate-950 rounded-full z-20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-slate-800 mr-2" />
                    <div className="w-2 h-2 rounded-full bg-blue-900/60" />
                  </div>

                  {/* Phone Screen Container */}
                  <div className="bg-[#0B0F19] rounded-[30px] overflow-y-auto max-h-[580px] scrollbar-thin scrollbar-thumb-slate-800 text-slate-100 border border-slate-800">
                    
                    {/* Store Banner */}
                    <div className="relative h-24 w-full bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 overflow-hidden">
                      <img
                        src={resolveImageUrl(store?.coverImageUrl || APP_IMAGES.storeBanner)}
                        alt="Store Banner"
                        className="w-full h-full object-cover opacity-60"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-transparent to-transparent" />
                    </div>

                    {/* Shop Avatar & Info */}
                    <div className="px-4 -mt-8 relative space-y-2">
                      <div className="flex items-end justify-between">
                        <div className="w-16 h-16 rounded-2xl bg-white p-1 shadow-xl border-2 border-blue-500 overflow-hidden shrink-0">
                          <img
                            src={resolveImageUrl(store?.logoUrl || business.logoUrl || APP_IMAGES.logo)}
                            alt={store?.title || business.name}
                            className="w-full h-full object-cover rounded-xl"
                          />
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Open 24/7
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-1">
                          <h2 className="text-sm font-black text-white truncate">{store?.title || business.name}</h2>
                          <span className="material-symbols-outlined text-blue-400 text-[14px]">verified</span>
                        </div>
                        <p className="text-[10px] text-slate-400">{business.category} &bull; {store?.city || business.city}</p>
                        <p className="text-[10px] text-slate-300 italic mt-0.5 line-clamp-2">
                          {store?.tagline || 'Excellence & trust in every deal ✨'}
                        </p>
                      </div>

                      {/* Quick Action Grid */}
                      <div className="grid grid-cols-4 gap-1 pt-1">
                        <a
                          href={`tel:+91${store?.phone || business.phone}`}
                          className="flex flex-col items-center justify-center p-1.5 bg-slate-800/80 rounded-xl border border-slate-700 text-center"
                        >
                          <span className="material-symbols-outlined text-[16px] text-blue-400">call</span>
                          <span className="text-[8px] font-bold text-slate-300 mt-0.5">Call</span>
                        </a>
                        <a
                          href={`https://api.whatsapp.com/send?phone=91${(store?.whatsappNumber || store?.phone || business.phone).replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex flex-col items-center justify-center p-1.5 bg-slate-800/80 rounded-xl border border-slate-700 text-center"
                        >
                          <span className="text-[12px]">💬</span>
                          <span className="text-[8px] font-bold text-slate-300 mt-0.5">Chat</span>
                        </a>
                        <a
                          href={store?.mapUrl || `https://maps.google.com/?q=${encodeURIComponent(`${store?.title || business.name} ${store?.address || business.address}`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex flex-col items-center justify-center p-1.5 bg-slate-800/80 rounded-xl border border-slate-700 text-center"
                        >
                          <span className="material-symbols-outlined text-[16px] text-rose-400">location_on</span>
                          <span className="text-[8px] font-bold text-slate-300 mt-0.5">Map</span>
                        </a>
                        <button
                          onClick={handleShareWhatsAppStore}
                          className="flex flex-col items-center justify-center p-1.5 bg-slate-800/80 rounded-xl border border-slate-700 text-center cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px] text-purple-400">share</span>
                          <span className="text-[8px] font-bold text-slate-300 mt-0.5">Share</span>
                        </button>
                      </div>

                      {/* Instant UPI Pay Box */}
                      <div className="p-2.5 rounded-2xl bg-gradient-to-r from-blue-950/90 to-slate-900 border border-blue-500/30 space-y-1.5 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1">
                            <span>⚡</span> Instant UPI Pay
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono truncate max-w-[120px]">
                            {store?.upiId || business.upiId || 'UPI not set'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <div className="relative flex-1">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                            <input
                              type="number"
                              value={payAmount}
                              onChange={(e) => setPayAmount(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-5 pr-2 py-1 text-xs font-bold text-white focus:outline-none focus:border-blue-400"
                            />
                          </div>
                          <button
                            onClick={handlePayViaUpi}
                            className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-[11px] rounded-lg shadow active:scale-95 cursor-pointer"
                          >
                            Pay 💳
                          </button>
                        </div>
                      </div>

                      {/* Featured Showcase Items inside phone */}
                      <div className="pt-2 space-y-2 pb-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[11px] font-black text-white uppercase tracking-wider">
                            Featured Products
                          </h3>
                          <span className="text-[9px] text-blue-400 font-semibold">
                            {showcaseItems.filter((i) => i.isVisible).length} items
                          </span>
                        </div>

                        {showcaseItems.filter((i) => i.isVisible).length === 0 ? (
                          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center text-[11px] text-slate-400">
                            No items visible in showcase.
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {showcaseItems
                              .filter((i) => i.isVisible)
                              .map((p) => (
                                <div
                                  key={p.id}
                                  className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex gap-2 items-start"
                                >
                                  <img
                                    src={resolveImageUrl(p.imageUrl || APP_IMAGES.weddingTemplate)}
                                    alt={p.name}
                                    className="w-12 h-12 object-cover rounded-lg shrink-0"
                                  />
                                  <div className="flex-1 min-w-0 space-y-0.5">
                                    <h4 className="text-[11px] font-bold text-white truncate">{p.displayName || p.name}</h4>
                                    <p className="text-[9px] text-slate-400 line-clamp-1">{p.description}</p>
                                    <div className="flex items-center justify-between pt-0.5">
                                      <span className="text-[11px] font-black text-emerald-400 font-mono">
                                        ₹{p.displayPrice ?? p.price}
                                      </span>
                                      <button
                                        onClick={() => {
                                          const text = encodeURIComponent(
                                            `Hello ${store?.title || business.name}, I want to order:\n` +
                                            `🛍️ *${p.displayName || p.name}*\n` +
                                            `💰 Price: ₹${p.displayPrice ?? p.price}`
                                          );
                                          window.open(`https://api.whatsapp.com/send?phone=91${(store?.whatsappNumber || store?.phone || business.phone).replace(/\D/g, '')}&text=${text}`, '_blank');
                                        }}
                                        className="px-2 py-0.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded text-[9px] font-bold"
                                      >
                                        Order 💬
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: Smart NFC Visiting Card                                            */}
        {/* ========================================================================= */}
        {activeTab === 'vcard' && (
          <div className="flex flex-col items-center justify-center space-y-6 py-2">
            
            {/* Action Toolbar for Card */}
            <div className="w-full max-w-xl flex flex-wrap items-center justify-between gap-2 bg-[#131B2E] p-3.5 rounded-2xl border border-white/10">
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold text-white">NFC Smart Visiting Card</h3>
                <p className="text-[11px] text-slate-400">
                  Slug: <span className="font-mono text-indigo-300">/{cardSlug}</span> &bull; Tap count: {card?.viewsCount || 0}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCardSettingsModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-xl border border-white/10 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">tune</span>
                  <span>Edit Card</span>
                </button>

                <button
                  onClick={handleTogglePublishCard}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow cursor-pointer ${
                    card?.isPublished
                      ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {card?.isPublished ? 'pause_circle' : 'rocket_launch'}
                  </span>
                  <span>{card?.isPublished ? 'Draft' : 'Publish'}</span>
                </button>
              </div>
            </div>

            {/* Interactive 3D Card Preview with Flip toggle */}
            <div className="w-full max-w-md space-y-3">
              <div className="flex items-center justify-between px-2 text-xs text-slate-400">
                <span>{isCardFlipped ? 'Back Side (QR & Save Info)' : 'Front Side (Contact & Branding)'}</span>
                <button
                  onClick={() => setIsCardFlipped(!isCardFlipped)}
                  className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">flip</span>
                  <span>Flip Card</span>
                </button>
              </div>

              {/* Card Container */}
              <div
                onClick={() => setIsCardFlipped(!isCardFlipped)}
                className="cursor-pointer transition-transform duration-300 hover:scale-[1.01]"
              >
                {!isCardFlipped ? (
                  /* Front Side */
                  <div
                    style={{
                      background: activeCardTheme.frontGradient,
                      backgroundColor: activeCardTheme.frontFallbackBg,
                      borderColor: activeCardTheme.borderColor,
                      color: activeCardTheme.textPrimary,
                    }}
                    className="relative aspect-[1.75/1] rounded-3xl p-6 border-2 shadow-2xl flex flex-col justify-between overflow-hidden"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-base font-black tracking-wide" style={{ color: activeCardTheme.textPrimary }}>
                          {card?.companyName || business.name}
                        </h3>
                        <p className="text-xs" style={{ color: activeCardTheme.textSecondary }}>{business.category}</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-white/10 p-1 border border-white/20 overflow-hidden shadow">
                        <img
                          src={resolveImageUrl(card?.logoUrl || business.logoUrl || APP_IMAGES.logo)}
                          alt="Logo"
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="font-extrabold text-sm" style={{ color: activeCardTheme.textPrimary }}>
                        {card?.fullName || business.ownerName || business.name}
                      </div>
                      <div className="text-[11px] font-semibold" style={{ color: activeCardTheme.accentColor }}>
                        {card?.designation || 'Owner / Vyapari'}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: activeCardTheme.textPrimary }}>
                        <span className="material-symbols-outlined text-[14px]" style={{ color: activeCardTheme.accentColor }}>call</span>
                        <span>+91 {card?.phone || business.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: activeCardTheme.textSecondary }}>
                        <span className="material-symbols-outlined text-[14px] text-rose-400">location_on</span>
                        <span className="truncate">{card?.address || `${business.address}, ${business.city}`}</span>
                      </div>
                    </div>

                    <div
                      style={{ borderTopColor: activeCardTheme.borderColor, color: activeCardTheme.textSecondary }}
                      className="flex items-center justify-between border-t pt-2 text-[9px]"
                    >
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]" style={{ color: activeCardTheme.accentColor }}>contactless</span>
                        <span>SMART NFC BUSINESS CARD</span>
                      </span>
                      <span className="font-mono text-slate-400">TAP TO CONNECT</span>
                    </div>
                  </div>
                ) : (
                  /* Back Side */
                  <div
                    style={{
                      background: activeCardTheme.backGradient,
                      backgroundColor: activeCardTheme.backFallbackBg,
                      borderColor: activeCardTheme.borderColor,
                      color: activeCardTheme.textPrimary,
                    }}
                    className="relative aspect-[1.75/1] rounded-3xl p-6 border-2 shadow-2xl flex items-center justify-between overflow-hidden"
                  >
                    <div className="space-y-2 max-w-[55%]">
                      <span
                        style={{ color: activeCardTheme.accentColor }}
                        className="text-[10px] font-extrabold uppercase tracking-wider"
                      >
                        SCAN TO SAVE CONTACT
                      </span>
                      <h4 className="text-xs font-bold" style={{ color: activeCardTheme.textPrimary }}>
                        Save {card?.fullName || business.name} directly into your phone
                      </h4>
                      <p className="text-[10px]" style={{ color: activeCardTheme.textSecondary }}>
                        Includes Phone, WhatsApp, Maps &amp; Digital Dukaan Link.
                      </p>
                    </div>

                    {/* QR Code on card */}
                    <div
                      style={{
                        backgroundColor: activeCardTheme.qrContainerBg,
                        borderColor: activeCardTheme.qrBorderColor,
                      }}
                      className="p-2 rounded-2xl shadow-xl flex flex-col items-center justify-center shrink-0 border-2"
                    >
                      <img
                        src={exportCardData?.qrDataUrl || `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(cardUrl)}`}
                        alt="QR Code"
                        className="w-20 h-20"
                      />
                      <span
                        style={{ color: activeCardTheme.qrLabelColor }}
                        className="text-[8px] font-black mt-1 uppercase"
                      >
                        BRANDX NFC
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons for Visiting Card */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => handleDownloadCardPdf(false)}
                disabled={isExportingPdf}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60 text-white text-xs font-bold rounded-2xl shadow-lg shadow-emerald-900/40 transition-all active:scale-95 cursor-pointer border border-emerald-400/30"
              >
                {isExportingPdf ? (
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                )}
                <span>{isExportingPdf ? (pdfProgressText || 'Exporting PDF...') : 'Download Card PDF (Front & Back) 📄'}</span>
              </button>

              <button
                onClick={() => handleDownloadCardPdf(true)}
                disabled={isExportingPdf}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 disabled:opacity-60 text-slate-200 text-xs font-bold rounded-2xl border border-white/10 transition-all active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                <span>Print Standee / Cards 🖨️</span>
              </button>

              <button
                onClick={handleDownloadVCard}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                <span>{t.downloadVCard} (.vcf)</span>
              </button>

              <button
                onClick={() =>
                  setNfcModalConfig({
                    isOpen: true,
                    url: cardUrl,
                    name: card?.fullName || business.name,
                  })
                }
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">contactless</span>
                <span>Program NFC Tag 📡</span>
              </button>
            </div>

            {/* Hidden Off-Screen Deterministic Card Template for High-Res PDF Export */}
            {exportCardData && <NfcCardPdfTemplate cardData={exportCardData} />}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: Manage Item Master & Inventory (Preserved & Enhanced)              */}
        {/* ========================================================================= */}
        {activeTab === 'manage' && (
          <div className="space-y-4">
            {/* Action Bar & Search / Filter Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#131B2E] p-3.5 rounded-2xl border border-white/10">
              <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Search by name, SKU, barcode, HSN..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>

                {/* Category Filter */}
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="All">All Categories ({products.length})</option>
                  {filterCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                {/* Low Stock Toggle */}
                <button
                  onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    showLowStockOnly
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-[#1E293B] text-slate-400 hover:text-white border border-white/10'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px] text-amber-400">warning</span>
                  <span>Low Stock Only</span>
                </button>
              </div>

              {/* Add Product Button */}
              <button
                onClick={handleOpenAddModal}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>+ Add Item Master</span>
              </button>
            </div>

            {/* Product Cards List */}
            {filteredProducts.length === 0 ? (
              <EmptyState
                emoji="🛍️"
                title={searchQuery || showLowStockOnly ? 'No matching items found' : t.noProducts}
                description={
                  searchQuery || showLowStockOnly
                    ? 'Try adjusting your search query or removing filters.'
                    : t.noProductsSub
                }
                actionLabel={searchQuery || showLowStockOnly ? 'Clear Filters' : t.addProduct}
                onAction={() => {
                  if (searchQuery || showLowStockOnly || selectedCategoryFilter !== 'All') {
                    setSearchQuery('');
                    setSelectedCategoryFilter('All');
                    setShowLowStockOnly(false);
                  } else {
                    handleOpenAddModal();
                  }
                }}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredProducts.map((p) => {
                  const currentStock = p.currentStock ?? p.stockQty ?? 0;
                  const threshold = p.lowStockThreshold ?? 5;
                  const isOutOfStock = currentStock <= 0;
                  const isLowStock = currentStock > 0 && currentStock <= threshold;

                  return (
                    <div
                      key={p.id}
                      className="bg-[#131B2E] border border-white/10 hover:border-blue-500/40 rounded-2xl p-4 flex flex-col justify-between relative group transition-all"
                    >
                      <div className="flex gap-3 items-start">
                        <img
                          src={resolveImageUrl(p.imageUrl || APP_IMAGES.weddingTemplate)}
                          alt={p.name}
                          className="w-18 h-18 rounded-xl object-cover shrink-0 border border-white/10"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider truncate">
                              {p.category || 'General'}
                            </span>
                            {p.type === 'SERVICE' && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold">
                                SERVICE
                              </span>
                            )}
                          </div>

                          <h4 className="text-xs font-bold text-white line-clamp-1" title={p.name}>
                            {p.name}
                          </h4>

                          {/* Code / Barcode line */}
                          {(p.itemCode || p.barcode || p.hsnSac || p.hsnCode) && (
                            <div className="text-[10px] text-slate-400 font-mono truncate">
                              {p.itemCode && <span>Code: {p.itemCode} </span>}
                              {(p.hsnSac || p.hsnCode) && <span>HSN: {p.hsnSac || p.hsnCode}</span>}
                            </div>
                          )}

                          {/* Price & GST */}
                          <div className="flex items-baseline gap-2 pt-0.5">
                            <span className="text-sm font-black text-emerald-400 font-mono">
                              ₹{p.sellingPrice ?? p.price}
                            </span>
                            {(p.mrp || p.originalPrice) && (
                              <span className="text-xs text-slate-400 line-through font-mono">
                                ₹{p.mrp || p.originalPrice}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">
                              +{p.gstRate ?? p.gstPercent ?? 18}% GST
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stock Status Bar */}
                      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {isOutOfStock ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                              Out of Stock
                            </span>
                          ) : isLowStock ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                              Low: {currentStock} {p.unit || 'PCS'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Stock: {currentStock} {p.unit || 'PCS'}
                            </span>
                          )}
                        </div>

                        {/* Quick Action Buttons */}
                        <div className="flex items-center gap-1">
                          {/* Stock In (+) */}
                          <button
                            onClick={() => {
                              setStockActionProduct(p);
                              setStockActionType('STOCK_IN');
                              setStockActionQty('1');
                              setStockActionNote('Stock receipt');
                            }}
                            className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                            title="Add Stock In"
                          >
                            + Stock
                          </button>

                          {/* Edit Item */}
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-all cursor-pointer"
                            title="Edit Item Master"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>

                          {/* Delete Item */}
                          <button
                            onClick={() => setProductToDelete(p)}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-all cursor-pointer"
                            title="Delete Item"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: Store Settings                                                     */}
      {/* ========================================================================= */}
      {showStoreSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-[#131B2E] border border-white/20 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-scale-in my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏪</span>
                <h3 className="text-base font-bold text-white">Digital Dukaan Settings</h3>
              </div>
              <button
                onClick={() => setShowStoreSettingsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveStoreSettings} className="space-y-3.5 max-h-[75vh] overflow-y-auto pr-1">
              <div>
                <label className="text-[11px] font-semibold text-slate-300">Store Title / Dukaan Name</label>
                <input
                  type="text"
                  required
                  value={storeFormData.title}
                  onChange={(e) => setStoreFormData({ ...storeFormData, title: e.target.value })}
                  className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">Tagline / Catchphrase</label>
                <input
                  type="text"
                  placeholder="e.g. Best quality grocery at wholesale rates"
                  value={storeFormData.tagline}
                  onChange={(e) => setStoreFormData({ ...storeFormData, tagline: e.target.value })}
                  className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300">WhatsApp Number</label>
                  <input
                    type="text"
                    placeholder="9876543210"
                    value={storeFormData.whatsappNumber}
                    onChange={(e) => setStoreFormData({ ...storeFormData, whatsappNumber: e.target.value })}
                    className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300">UPI ID for Direct Pay</label>
                  <input
                    type="text"
                    placeholder="shopname@okaxis"
                    value={storeFormData.upiId}
                    onChange={(e) => setStoreFormData({ ...storeFormData, upiId: e.target.value })}
                    className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">Google Review URL</label>
                <input
                  type="url"
                  placeholder="https://g.page/r/..."
                  value={storeFormData.googleReviewUrl}
                  onChange={(e) => setStoreFormData({ ...storeFormData, googleReviewUrl: e.target.value })}
                  className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">Google Maps / Location URL</label>
                <input
                  type="url"
                  placeholder="https://maps.google.com/..."
                  value={storeFormData.mapUrl}
                  onChange={(e) => setStoreFormData({ ...storeFormData, mapUrl: e.target.value })}
                  className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">Business Hours</label>
                <input
                  type="text"
                  placeholder="e.g. Mon - Sat: 9:00 AM - 9:00 PM"
                  value={storeFormData.businessHours}
                  onChange={(e) => setStoreFormData({ ...storeFormData, businessHours: e.target.value })}
                  className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">About Store / Description</label>
                <textarea
                  rows={2}
                  placeholder="Tell your customers about your products and services..."
                  value={storeFormData.description}
                  onChange={(e) => setStoreFormData({ ...storeFormData, description: e.target.value })}
                  className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowStoreSettingsModal(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingStore}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  {isSavingStore && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
                  <span>Save Settings ✨</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Card Settings                                                      */}
      {/* ========================================================================= */}
      {showCardSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-[#131B2E] border border-white/20 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-scale-in my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📇</span>
                <h3 className="text-base font-bold text-white">NFC Visiting Card Settings</h3>
              </div>
              <button
                onClick={() => setShowCardSettingsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveCardSettings} className="space-y-3.5 max-h-[75vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={cardFormData.fullName}
                    onChange={(e) => setCardFormData({ ...cardFormData, fullName: e.target.value })}
                    className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300">Designation / Role</label>
                  <input
                    type="text"
                    placeholder="Owner, Director, Manager"
                    value={cardFormData.designation}
                    onChange={(e) => setCardFormData({ ...cardFormData, designation: e.target.value })}
                    className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">Company / Shop Name</label>
                <input
                  type="text"
                  required
                  value={cardFormData.companyName}
                  onChange={(e) => setCardFormData({ ...cardFormData, companyName: e.target.value })}
                  className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={cardFormData.phone}
                    onChange={(e) => setCardFormData({ ...cardFormData, phone: e.target.value })}
                    className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300">WhatsApp Number</label>
                  <input
                    type="text"
                    value={cardFormData.whatsapp}
                    onChange={(e) => setCardFormData({ ...cardFormData, whatsapp: e.target.value })}
                    className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300">Email Address</label>
                  <input
                    type="email"
                    value={cardFormData.email}
                    onChange={(e) => setCardFormData({ ...cardFormData, email: e.target.value })}
                    className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300">UPI ID</label>
                  <input
                    type="text"
                    placeholder="yourname@okhdfcbank"
                    value={cardFormData.upiId}
                    onChange={(e) => setCardFormData({ ...cardFormData, upiId: e.target.value })}
                    className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">Address / Location</label>
                <input
                  type="text"
                  value={cardFormData.address}
                  onChange={(e) => setCardFormData({ ...cardFormData, address: e.target.value })}
                  className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">Card Theme Style</label>
                <select
                  value={cardFormData.theme}
                  onChange={(e) => setCardFormData({ ...cardFormData, theme: e.target.value })}
                  className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="CLASSIC_DARK">Classic Dark Obsidian</option>
                  <option value="GOLD_LUXURY">Gold Luxury Merchant</option>
                  <option value="ROYAL_BLUE">Royal Sapphire Blue</option>
                  <option value="EMERALD_SLATE">Emerald Vyapari Slate</option>
                  <option value="NEON_CYAN">Neon Cyber Cyan</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">Bio / About Me</label>
                <textarea
                  rows={2}
                  value={cardFormData.bio}
                  onChange={(e) => setCardFormData({ ...cardFormData, bio: e.target.value })}
                  className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCardSettingsModal(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCard}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  {isSavingCard && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
                  <span>Save Card ✨</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Add Products to Dukaan Showcase from Product Master               */}
      {/* ========================================================================= */}
      {showAddShowcaseModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-[#131B2E] border border-white/20 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4 animate-scale-in my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛍️</span>
                <div>
                  <h3 className="text-base font-bold text-white">Add Products to Dukaan Showcase</h3>
                  <p className="text-[11px] text-slate-400">Pick from your centralized Product Master</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddShowcaseModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Search filter for showcase modal */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search catalog products..."
                value={showcaseSearchQuery}
                onChange={(e) => setShowcaseSearchQuery(e.target.value)}
                className="w-full bg-[#1E293B] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Catalog List */}
            <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
              {products
                .filter((p) =>
                  !showcaseSearchQuery.trim()
                    ? true
                    : p.name.toLowerCase().includes(showcaseSearchQuery.toLowerCase()) ||
                      p.category?.toLowerCase().includes(showcaseSearchQuery.toLowerCase())
                )
                .map((product) => {
                  const isAlreadyInShowcase = showcaseItems.some((item) => item.productId === product.id);

                  return (
                    <div
                      key={product.id}
                      className="p-3 bg-[#1E293B] border border-white/5 rounded-2xl flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={resolveImageUrl(product.imageUrl || APP_IMAGES.weddingTemplate)}
                          alt={product.name}
                          className="w-11 h-11 rounded-xl object-cover shrink-0 border border-white/10"
                        />
                        <div className="min-w-0 space-y-0.5">
                          <h4 className="text-xs font-bold text-white truncate max-w-[240px]">
                            {product.name}
                          </h4>
                          <p className="text-[10px] text-slate-400">
                            {product.category || 'General'} &bull; Stock: {product.currentStock ?? product.stockQty ?? 0} {product.unit || 'PCS'}
                          </p>
                          <span className="text-xs font-bold text-emerald-400 font-mono">
                            ₹{product.sellingPrice ?? product.price}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddProductToShowcase(product)}
                        disabled={isAlreadyInShowcase || addingShowcaseId === product.id}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                          isAlreadyInShowcase
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow active:scale-95'
                        }`}
                      >
                        {addingShowcaseId === product.id ? (
                          <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                        ) : isAlreadyInShowcase ? (
                          <>
                            <span className="material-symbols-outlined text-[14px]">check</span>
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[14px]">add</span>
                            <span>Add to Dukaan</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setShowAddShowcaseModal(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS: QR Code Modal & NFC Writer Modal                                  */}
      {/* ========================================================================= */}
      <QRCodeModal
        isOpen={qrModalConfig.isOpen}
        onClose={() => setQrModalConfig({ ...qrModalConfig, isOpen: false })}
        title={qrModalConfig.title}
        subtitle={qrModalConfig.subtitle}
        url={qrModalConfig.url}
        shopName={qrModalConfig.shopName}
        type={qrModalConfig.type}
      />

      <NfcWriterModal
        isOpen={nfcModalConfig.isOpen}
        onClose={() => setNfcModalConfig({ ...nfcModalConfig, isOpen: false })}
        cardUrl={nfcModalConfig.url}
        cardName={nfcModalConfig.name}
      />

      {/* ========================================================================= */}
      {/* MODAL: Add / Edit Product Modal (Item Master)                             */}
      {/* ========================================================================= */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-[#131B2E] border border-white/20 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-scale-in my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛍️</span>
                <h3 className="text-base font-bold text-white">
                  {editingProduct ? 'Edit Item Master' : 'Add Item / Product to Master'}
                </h3>
              </div>
              <button
                onClick={() => setShowProductModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5 max-h-[75vh] overflow-y-auto pr-1">
              <div>
                <label className="text-[11px] font-semibold text-slate-300">
                  {t.itemName} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tata Tea Gold 500g / Wedding Photography"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (formErrors.name) setFormErrors({ ...formErrors, name: undefined });
                  }}
                  className={`w-full mt-1 bg-[#1E293B] border rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors ${
                    formErrors.name ? 'border-rose-500' : 'border-white/10 focus:border-blue-500'
                  }`}
                />
                {formErrors.name && (
                  <p className="text-[10px] text-rose-400 mt-1">{formErrors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300">Item Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="GOODS">Goods / Physical Item</option>
                    <option value="SERVICE">Service</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300">Category</label>
                  <input
                    type="text"
                    list="category-suggestions"
                    placeholder="e.g. Grocery, Dairy, Services"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                  <datalist id="category-suggestions">
                    {categories.map((c) => (
                      <option key={c.id} value={c.name} />
                    ))}
                    <option value="General" />
                    <option value="Grocery & Kirana" />
                    <option value="Dairy & Beverages" />
                    <option value="Electronics & Mobiles" />
                    <option value="Apparel & Clothing" />
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300">
                    Selling Price (₹) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="999"
                    value={formData.sellingPrice}
                    onChange={(e) => {
                      setFormData({ ...formData, sellingPrice: e.target.value });
                      if (formErrors.price) setFormErrors({ ...formErrors, price: undefined });
                    }}
                    className={`w-full mt-1 bg-[#1E293B] border rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-colors ${
                      formErrors.price ? 'border-rose-500' : 'border-white/10 focus:border-blue-500'
                    }`}
                  />
                  {formErrors.price && (
                    <p className="text-[10px] text-rose-400 mt-1">{formErrors.price}</p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300">MRP (₹)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="1200"
                    value={formData.mrp}
                    onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                    className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300">Purchase Price (₹)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="800"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300">GST Rate (%)</label>
                  <select
                    value={formData.gstRate}
                    onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
                    className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="0">0% (Nil)</option>
                    <option value="5">5% GST</option>
                    <option value="12">12% GST</option>
                    <option value="18">18% GST</option>
                    <option value="28">28% GST</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300">Tax Type</label>
                  <select
                    value={formData.taxType}
                    onChange={(e) => setFormData({ ...formData, taxType: e.target.value as any })}
                    className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="EXCLUSIVE">Tax Exclusive</option>
                    <option value="INCLUSIVE">Tax Inclusive</option>
                    <option value="EXEMPT">Tax Exempt</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300">HSN / SAC Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 0902"
                    value={formData.hsnSac}
                    onChange={(e) => setFormData({ ...formData, hsnSac: e.target.value })}
                    className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300">Measuring Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {COMMON_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300">Item Code / SKU</label>
                  <input
                    type="text"
                    placeholder="e.g. TEA-001"
                    value={formData.itemCode}
                    onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })}
                    className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                    <span>Barcode</span>
                    <button
                      type="button"
                      onClick={() => setShowBarcodeScanner(true)}
                      className="text-blue-400 hover:text-blue-300 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[13px]">barcode_scanner</span>
                      <span>Scan 📷</span>
                    </button>
                  </label>
                  <input
                    type="text"
                    placeholder="8901..."
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300">
                    {editingProduct ? 'Current Stock' : 'Opening Stock'} ({formData.unit})
                  </label>
                  <input
                    type="number"
                    placeholder="10"
                    value={formData.stockQty}
                    onChange={(e) => setFormData({ ...formData, stockQty: e.target.value })}
                    className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300">
                    Low Stock Alert Threshold
                  </label>
                  <input
                    type="number"
                    placeholder="5"
                    value={formData.lowStockThreshold}
                    onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                    className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">{t.description}</label>
                <textarea
                  rows={2}
                  placeholder="Details of the product package, brand warranty, materials..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  {isSaving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
                  <span>{editingProduct ? 'Save Changes' : `${t.save} 🛍️`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Quick Stock Adjustment                                             */}
      {/* ========================================================================= */}
      {stockActionProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#131B2E] border border-white/20 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Update Stock</h3>
                <p className="text-[11px] text-blue-400 font-semibold truncate max-w-[240px]">
                  {stockActionProduct.name}
                </p>
              </div>
              <button
                onClick={() => setStockActionProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleConfirmStockAction} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#1E293B] rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setStockActionType('STOCK_IN')}
                  className={`py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    stockActionType === 'STOCK_IN'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  + Stock In
                </button>
                <button
                  type="button"
                  onClick={() => setStockActionType('STOCK_OUT')}
                  className={`py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    stockActionType === 'STOCK_OUT'
                      ? 'bg-rose-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  - Stock Out
                </button>
                <button
                  type="button"
                  onClick={() => setStockActionType('ADJUSTMENT')}
                  className={`py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    stockActionType === 'ADJUSTMENT'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Set Count
                </button>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">
                  {stockActionType === 'ADJUSTMENT' ? 'New Physical Count' : 'Quantity'} ({stockActionProduct.unit || 'PCS'})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={stockActionQty}
                  onChange={(e) => setStockActionQty(e.target.value)}
                  className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-bold font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">Reason / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Fresh shipment, damaged goods, physical count"
                  value={stockActionNote}
                  onChange={(e) => setStockActionNote(e.target.value)}
                  className="w-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStockActionProduct(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isStockSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  {isStockSaving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
                  <span>Save Stock 📦</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Delete Product Confirmation (Item Master)                          */}
      {/* ========================================================================= */}
      <ConfirmModal
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleConfirmDeleteProduct}
        title={isHindi ? 'दुकान से सामान हटाएं?' : 'Remove Product from Catalog?'}
        message={
          isHindi
            ? `क्या आप निश्चित रूप से "${productToDelete?.name}" को कैटलॉग से हटाना चाहते हैं?`
            : `Are you sure you want to remove "${productToDelete?.name}" from your catalog?`
        }
        confirmText={t.delete}
        cancelText={t.cancel}
        isDestructive={true}
        icon="delete"
      />

      {/* ========================================================================= */}
      {/* MODAL: Barcode Scanner                                                    */}
      {/* ========================================================================= */}
      <BarcodeScannerModal
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScanSuccess={(code) => {
          setFormData((prev) => ({ ...prev, barcode: code }));
          setShowBarcodeScanner(false);
          showToast(`Barcode Scanned: ${code} 📷`);
        }}
        title={isHindi ? 'उत्पाद बारकोड स्कैन करें' : 'Scan Product Barcode'}
      />
    </div>
  );
};
