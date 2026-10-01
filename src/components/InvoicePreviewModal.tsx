import React, { useState } from 'react';
import { InvoiceData, BusinessProfile } from '../types';
import { exportInvoiceToPdf } from '../utils/pdfExport';
import { useLanguage } from '../context/LanguageContext';
import { shareImageToWhatsApp } from '../utils/posterShare';
import { exportElementToPng } from '../utils/domToImage';
import { WhatsAppShareGuideModal } from './WhatsAppShareGuideModal';
import { UpiQrCode } from './UpiQrCode';

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceData | any;
  business: BusinessProfile;
  subtotal: number;
  discount: number;
  cgst: number;
  sgst: number;
  igst?: number;
  cess?: number;
  roundOff?: number;
  grandTotal: number;
  amountPaid?: number;
  amountDue?: number;
  amountInWords?: string;
  sellerGstin?: string;
  buyerGstin?: string;
  placeOfSupply?: string;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  isOpen,
  onClose,
  invoice,
  business,
  subtotal,
  discount,
  cgst,
  sgst,
  igst = 0,
  cess = 0,
  roundOff = 0,
  grandTotal,
  amountPaid,
  amountDue,
  amountInWords,
  sellerGstin,
  buyerGstin,
  placeOfSupply,
}) => {
  const { t } = useLanguage();
  const [printFormat, setPrintFormat] = useState<'a4' | 'thermal'>('a4');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
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

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const docType = invoice.documentType || (invoice.isGstBill ? 'Tax Invoice' : 'Estimate / Quotation');
  const isGst = invoice.isGstBill !== undefined ? invoice.isGstBill : (business.hasGst !== false && !!business.gstin);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    showToast('Generating high-resolution PDF... 📄');
    
    const targetElementId = printFormat === 'a4' ? 'invoice-a4-printable' : 'invoice-thermal-printable';
    const result = await exportInvoiceToPdf({
      elementId: targetElementId,
      invoiceNumber: invoice.invoiceNumber,
      format: printFormat,
      customerName: invoice.customerName,
    });

    setIsExportingPdf(false);
    if (result.success) {
      showToast(`Invoice PDF downloaded: ${result.filename} ✅`);
    } else {
      showToast('PDF generation failed, opened browser print preview.');
    }
  };

  const handleWhatsAppShare = async () => {
    setIsSharingWhatsApp(true);
    showToast('🖼️ WhatsApp ke liye Invoice Image taiyar ho rahi hai...');

    try {
      const targetElementId = printFormat === 'a4' ? 'invoice-a4-printable' : 'invoice-thermal-printable';
      const element = document.getElementById(targetElementId);
      if (!element) throw new Error('Invoice preview element not found');

      // High-resolution crisp canvas capture with OKLCH color sanitization
      const { dataUrl, blob } = await exportElementToPng(targetElementId, {
        scale: 2.5,
        backgroundColor: '#ffffff',
        windowWidth: printFormat === 'a4' ? 800 : 380,
      });

      const caption =
        `🧾 *${docType}* #${invoice.invoiceNumber} from *${business.name}*\n\n` +
        `👤 *Customer:* ${invoice.customerName || 'Valued Customer'}\n` +
        `📅 *Date:* ${invoice.billDate}\n` +
        `💰 *Total Amount:* ₹${grandTotal.toLocaleString('en-IN')}\n` +
        `💳 *Payment Mode:* ${invoice.paymentMethod}\n` +
        (business.upiId ? `📲 *Pay via UPI:* ${business.upiId}\n\n` : '\n') +
        `_Thank you for doing business with us!_`;

      const title = `Invoice-${invoice.invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, '_')}`;
      const res = await shareImageToWhatsApp(dataUrl, caption, title, blob, invoice.customerPhone);
      showToast(res.message);

      if (res.method === 'clipboard-copy' || res.method === 'download-only') {
        setWhatsAppGuide({
          isOpen: true,
          caption,
          imageUrl: dataUrl,
          title: `${docType} #${invoice.invoiceNumber}`,
          phoneNumber: invoice.customerPhone,
        });
      }
    } catch (err: any) {
      console.error('Invoice share error:', err);
      showToast('Invoice image share error: ' + (err.message || 'Failed'));
    } finally {
      setIsSharingWhatsApp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-60 bg-[#131b2e] text-white px-4 py-2.5 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2 border border-white/20 animate-bounce">
          <span className="material-symbols-outlined text-[16px] text-[#6ffbbe]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in text-gray-800">
        
        {/* Modal Top Bar */}
        <div className="px-5 py-3.5 bg-[#F8FAFC] border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 text-[22px]">receipt_long</span>
            <span className="font-bold text-gray-900 text-sm">{docType} Preview</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
              isGst ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-blue-100 text-blue-800 border border-blue-300'
            }`}>
              {isGst ? 'GST Compliant' : 'Retail / Estimate'}
            </span>
          </div>

          {/* Format Switcher: A4 vs 80mm Thermal POS */}
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-200/80 p-0.5 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setPrintFormat('a4')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  printFormat === 'a4' ? 'bg-white text-gray-900 shadow font-bold' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📄 Standard A4
              </button>
              <button
                onClick={() => setPrintFormat('thermal')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  printFormat === 'thermal' ? 'bg-white text-gray-900 shadow font-bold' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🖨️ 80mm Thermal POS
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
              title="Print Bill"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* FORMAT 1: A4 Standard Executive GST Invoice */}
        {printFormat === 'a4' && (
          <div
            id="invoice-a4-printable"
            className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white font-sans text-gray-800 text-xs"
          >
            {/* Header Section */}
            <div className="flex justify-between items-start border-b border-gray-200 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xl text-blue-950">{business.name}</span>
                  <span className="material-symbols-outlined text-blue-600 text-[18px]">verified</span>
                </div>
                <p className="text-gray-500">{business.address}, {business.city} - {business.pincode}</p>
                {isGst && business.gstin ? (
                  <p className="font-mono font-bold text-gray-700">
                    GSTIN: <span className="text-blue-700">{business.gstin}</span>
                  </p>
                ) : (
                  <p className="font-semibold text-emerald-700">
                    ● Non-GST Retail / Estimate Bill
                  </p>
                )}
                <p className="text-gray-600">📞 Phone / WhatsApp: +91 {business.phone}</p>
              </div>

              <div className="text-right space-y-1">
                <span className="inline-block bg-blue-50 text-blue-800 text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wider border border-blue-200">
                  {docType.toUpperCase()}
                </span>
                <p className="text-sm font-bold font-mono text-gray-900 mt-1">#{invoice.invoiceNumber}</p>
                <p className="text-gray-500">Bill Date: <span className="font-medium text-gray-700">{invoice.billDate}</span></p>
                <p className="text-gray-500">Due Date: <span className="font-medium text-gray-700">{invoice.dueDate}</span></p>
              </div>
            </div>

            {/* Billed To & Payment Bar */}
            <div className="grid grid-cols-2 gap-4 py-4 border-b border-gray-200 bg-gray-50/80 -mx-6 px-6 sm:-mx-8 sm:px-8">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Billed To (Customer)
                </span>
                <p className="font-bold text-gray-900 text-sm">{invoice.buyerName || invoice.customerName || 'Cash Retail Customer'}</p>
                <p className="text-gray-600">Ph: +91 {invoice.buyerPhone || invoice.customerPhone || business.phone}</p>
                {(buyerGstin || invoice.buyerGSTIN || invoice.buyerGstin) && (
                  <p className="text-[11px] font-mono font-bold text-blue-800 mt-0.5">
                    GSTIN: <span>{buyerGstin || invoice.buyerGSTIN || invoice.buyerGstin}</span>
                  </p>
                )}
                {(placeOfSupply || invoice.placeOfSupply) && (
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Place of Supply: <span className="font-semibold text-gray-700">{placeOfSupply || invoice.placeOfSupply}</span>
                  </p>
                )}
                <span className="inline-block mt-1 text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold border border-amber-300">
                  {invoice.customerType || (buyerGstin || invoice.buyerGSTIN ? 'B2B Commercial' : 'B2C Retail')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Payment Status
                </span>
                <p className="text-xs font-medium text-gray-700">Mode: <span className="font-bold text-blue-700">{invoice.paymentMethod}</span></p>
                {business.upiId && <p className="text-xs text-gray-500 font-mono mt-0.5">UPI: {business.upiId}</p>}
                <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded font-semibold ${
                  invoice.paymentStatus === 'PAID' || invoice.paymentMethod === 'Mark Paid'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : invoice.paymentStatus === 'PARTIALLY_PAID'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}>
                  {invoice.paymentStatus === 'PAID' || invoice.paymentMethod === 'Mark Paid'
                    ? '✅ Paid & Settled'
                    : invoice.paymentStatus === 'PARTIALLY_PAID'
                    ? '⏳ Partially Paid'
                    : '⚠️ Unpaid / Udhar'}
                </span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="mt-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-2.5">Item Description</th>
                    {isGst && <th className="py-2.5">HSN/SAC</th>}
                    <th className="py-2.5 text-center">Qty</th>
                    <th className="py-2.5 text-right">Rate (₹)</th>
                    {isGst && <th className="py-2.5 text-right">GST %</th>}
                    <th className="py-2.5 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {invoice.items.map((item: any, idx: number) => {
                    const qty = item.quantity ?? item.qty ?? 1;
                    const rate = Number(item.rate || 0);
                    const base = qty * rate;
                    const gstP = item.gstRate ?? item.gstPercent ?? (isGst ? 18 : 0);
                    const gst = isGst ? (base * gstP) / 100 : 0;
                    const total = Number(item.totalAmount) || base + gst;
                    return (
                      <tr key={item.id || idx}>
                        <td className="py-3">
                          <span className="font-bold text-gray-900 block">{item.productNameSnapshot || item.name}</span>
                          <span className="text-[10px] text-gray-500">{item.type || 'Goods'} {item.unit ? `• ${item.unit}` : ''}</span>
                        </td>
                        {isGst && <td className="py-3 font-mono text-gray-600">{item.hsnSacSnapshot || item.code || '-'}</td>}
                        <td className="py-3 text-center font-medium">{qty}</td>
                        <td className="py-3 text-right font-mono">₹{rate.toLocaleString('en-IN')}</td>
                        {isGst && (
                          <td className="py-3 text-right font-mono text-gray-600">
                            {gstP}% (₹{gst.toLocaleString('en-IN', { maximumFractionDigits: 2 })})
                          </td>
                        )}
                        <td className="py-3 text-right font-bold text-gray-900 font-mono">
                          ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Summary + UPI QR Section */}
            <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
              
              {/* Scan & Pay QR Code */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-gray-200">
                <UpiQrCode
                  className="w-20 h-20"
                  upiId={business.upiId}
                  amount={grandTotal}
                  logoUrl={business.logoUrl || '/brandx-logo.png'}
                />
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-blue-700 uppercase tracking-wider block">SCAN & PAY WITH ANY UPI APP</span>
                  <p className="text-xs font-bold text-gray-900">₹{grandTotal.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-gray-500 font-mono">{business.upiId}</p>
                  <div className="flex items-center gap-1 text-[9px] text-emerald-700 font-bold">
                    <span>GPay • PhonePe • Paytm • BHIM</span>
                  </div>
                </div>
              </div>

              {/* Calculation Totals Table */}
              <div className="w-full sm:w-80 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal (Base Value):</span>
                  <span className="font-mono font-medium">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Discount:</span>
                    <span className="font-mono">-₹{discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {igst > 0 ? (
                  <div className="flex justify-between text-gray-600">
                    <span>IGST (Inter-State):</span>
                    <span className="font-mono font-medium">₹{igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ) : isGst ? (
                  <>
                    <div className="flex justify-between text-gray-600">
                      <span>CGST:</span>
                      <span className="font-mono">₹{cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>SGST:</span>
                      <span className="font-mono">₹{sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>GST (0% Non-GST Bill):</span>
                    <span className="font-mono">₹0.00</span>
                  </div>
                )}
                {cess > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Cess:</span>
                    <span className="font-mono font-medium">₹{cess.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {roundOff !== 0 && (
                  <div className="flex justify-between text-gray-500 text-[11px]">
                    <span>Round Off:</span>
                    <span className="font-mono">{roundOff > 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}</span>
                  </div>
                )}
                <div className="border-t-2 border-blue-600 pt-2 flex justify-between items-baseline">
                  <span className="font-bold text-sm text-gray-900">Grand Total:</span>
                  <span className="font-black text-xl text-blue-700 font-mono">
                    ₹{grandTotal.toLocaleString('en-IN')}
                  </span>
                </div>
                {amountDue !== undefined && amountDue > 0 && (
                  <div className="pt-1.5 border-t border-dashed border-gray-200 space-y-1 text-[11px]">
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Amount Paid:</span>
                      <span className="font-mono">₹{(amountPaid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-rose-700 font-bold">
                      <span>Balance Due:</span>
                      <span className="font-mono">₹{amountDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}
                {(amountInWords || invoice.amountInWords) && (
                  <div className="pt-1 text-[10px] text-gray-500 italic">
                    <span className="font-semibold text-gray-700">In Words:</span> {amountInWords || invoice.amountInWords}
                  </div>
                )}
              </div>
            </div>

            {/* Bank Details & Authorized Signatory */}
            <div className="mt-8 pt-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-end text-xs text-gray-500 gap-4">
              <div className="space-y-0.5 text-[11px]">
                <p className="font-bold text-gray-700">Bank Transfer Details:</p>
                <p>Bank: {business.bankName || 'HDFC Bank'} | A/C: {business.accountNumber || '50200012345678'}</p>
                <p>IFSC: {business.ifscCode || 'HDFC0001234'} | Holder: {business.accountHolderName || business.ownerName}</p>
              </div>

              <div className="text-center space-y-1">
                <div className="w-32 border-b border-gray-400 pb-8 text-center">
                  <span className="text-[10px] text-blue-800 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    DIGITALLY VERIFIED
                  </span>
                </div>
                <p className="font-bold text-[11px] text-gray-800">For {business.name}</p>
                <p className="text-[10px] text-gray-400">Authorized Signatory</p>
              </div>
            </div>
          </div>
        )}

        {/* FORMAT 2: 80mm / 58mm Thermal POS Receipt Layout */}
        {printFormat === 'thermal' && (
          <div className="flex-1 overflow-y-auto p-6 bg-gray-100 flex justify-center">
            <div
              id="invoice-thermal-printable"
              className="w-[320px] bg-white p-4 shadow-xl border border-gray-300 font-mono text-[11px] text-gray-900 space-y-3"
            >
              {/* Receipt Header */}
              <div className="text-center space-y-1 border-b border-dashed border-gray-400 pb-3">
                <h2 className="text-sm font-black uppercase tracking-wider">{business.name}</h2>
                <p className="text-[10px] text-gray-600">{business.address}, {business.city}</p>
                <p className="text-[10px] text-gray-600">Ph: +91 {business.phone}</p>
                {isGst && business.gstin && <p className="text-[10px] font-bold">GSTIN: {business.gstin}</p>}
                <div className="pt-1 font-bold text-xs uppercase underline">*** {docType} ***</div>
              </div>

              {/* Receipt Metadata */}
              <div className="border-b border-dashed border-gray-400 pb-2 space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span>Bill No: #{invoice.invoiceNumber}</span>
                  <span>Date: {invoice.billDate || invoice.invoiceDate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cust: {invoice.buyerName || invoice.customerName || 'Cash'}</span>
                  <span>Ph: {invoice.buyerPhone || invoice.customerPhone || '-'}</span>
                </div>
                {(buyerGstin || invoice.buyerGSTIN || invoice.buyerGstin) && (
                  <div className="flex justify-between font-bold text-blue-900">
                    <span>Buyer GST:</span>
                    <span>{buyerGstin || invoice.buyerGSTIN || invoice.buyerGstin}</span>
                  </div>
                )}
                {(placeOfSupply || invoice.placeOfSupply) && (
                  <div className="flex justify-between text-gray-600">
                    <span>Supply:</span>
                    <span>{placeOfSupply || invoice.placeOfSupply}</span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="border-b border-dashed border-gray-400 pb-2 space-y-1">
                <div className="flex justify-between font-bold border-b border-gray-300 pb-1 text-[10px]">
                  <span>ITEM</span>
                  <span>QTY x RATE</span>
                  <span>AMT</span>
                </div>
                {invoice.items.map((item) => (
                  <div key={item.id} className="space-y-0.5">
                    <div className="font-bold">{item.name}</div>
                    <div className="flex justify-between text-gray-700">
                      <span>{item.qty} x ₹{item.rate}</span>
                      <span className="font-bold">₹{item.qty * item.rate}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-b border-dashed border-gray-400 pb-2 space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount:</span>
                    <span>-₹{discount.toFixed(2)}</span>
                  </div>
                )}
                {igst > 0 ? (
                  <div className="flex justify-between">
                    <span>IGST:</span>
                    <span>₹{igst.toFixed(2)}</span>
                  </div>
                ) : isGst ? (
                  <>
                    <div className="flex justify-between">
                      <span>CGST:</span>
                      <span>₹{cgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SGST:</span>
                      <span>₹{sgst.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-emerald-700">
                    <span>GST (0% Non-GST):</span>
                    <span>₹0.00</span>
                  </div>
                )}
                {cess > 0 && (
                  <div className="flex justify-between">
                    <span>Cess:</span>
                    <span>₹{cess.toFixed(2)}</span>
                  </div>
                )}
                {roundOff !== 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Round Off:</span>
                    <span>{roundOff > 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm pt-1 border-t border-gray-300">
                  <span>TOTAL:</span>
                  <span>₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
                {amountDue !== undefined && amountDue > 0 && (
                  <div className="pt-1 border-t border-dashed border-gray-300 space-y-0.5">
                    <div className="flex justify-between text-emerald-700">
                      <span>Paid:</span>
                      <span>₹{(amountPaid || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-rose-700">
                      <span>Balance Due:</span>
                      <span>₹{amountDue.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Thermal UPI QR */}
              <div className="text-center py-2 space-y-1">
                <UpiQrCode
                  className="w-24 h-24 mx-auto"
                  upiId={business.upiId}
                  amount={grandTotal}
                  logoUrl={business.logoUrl || '/brandx-logo.png'}
                />
                <p className="text-[9px] font-bold">SCAN & PAY VIA UPI</p>
                <p className="text-[8px] text-gray-500 font-mono">{business.upiId}</p>
              </div>

              <div className="text-center text-[9px] text-gray-500 pt-2 border-t border-dashed border-gray-400">
                <p>Thank You For Your Visit! 🙏</p>
                <p>Goods once sold cannot be returned.</p>
              </div>
            </div>
          </div>
        )}

        {/* Modal Bottom Action Bar */}
        <div className="p-4 bg-[#F8FAFC] border-t border-gray-200 flex flex-wrap gap-2.5">
          <button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer active:scale-95"
          >
            {isExportingPdf ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">download</span>
                <span>Download PDF File 📄</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="flex-1 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            <span>Print {printFormat === 'a4' ? 'A4 Invoice' : 'Thermal POS'}</span>
          </button>
          
          <button
            onClick={handleWhatsAppShare}
            disabled={isSharingWhatsApp}
            className="flex-1 h-11 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 transition-all cursor-pointer active:scale-95"
          >
            <span>💬</span>
            <span>{isSharingWhatsApp ? 'Image Bheji ja rahi...' : 'WhatsApp Share (Image)'}</span>
          </button>
        </div>
      </div>

      {/* WhatsApp Desktop Share Guide Modal */}
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
