/**
 * BRANDX - NFC Visiting Card High-Resolution PDF Export Engine
 * 
 * Generates production-grade, print-ready, double-sided business card PDFs
 * preserving 100% of the visual styling, gradients, typography, logos, and QR codes.
 * 
 * Standard Card Format:
 *  - Width: 88.9 mm (3.5 in)
 *  - Height: 50.8 mm (2.0 in)
 *  - Aspect Ratio: 1.75 : 1 (matches exact on-screen aspect-[1.75/1] card)
 *  - Page 1: Front Side (Branding, Name, Designation, Phone, Location, NFC Branding)
 *  - Page 2: Back Side (Scan to Save, Explanatory Details, High-Res QR Code, BrandX NFC)
 */

import QRCode from 'qrcode';
import { sanitizeClonedElement, waitForAssets } from './domToImage';
import { BackendDigitalCard, PublicCardData } from '../services/digitalCardApi';
import { BusinessProfile } from '../types';
import { NfcCardExportData } from '../components/NfcCardPdfTemplate';

export interface ExportNfcCardPdfOptions {
  business: BusinessProfile;
  card?: BackendDigitalCard | PublicCardData | null;
  cardUrl: string;
  themeId?: string;
  printAfterGenerate?: boolean;
  onProgress?: (step: string) => void;
}

export interface NfcCardPdfExportResult {
  success: boolean;
  filename: string;
  pdfBlob?: Blob;
  error?: string;
}

/**
 * Converts any accessible image URL to a secure, same-origin base64 Data URL.
 * Prevents canvas tainting and CORS failures inside html2canvas.
 */
export async function convertImageUrlToDataUrl(
  url: string,
  timeoutMs = 3500
): Promise<string | null> {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('data:')) return url;

  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 200;
        canvas.height = img.naturalHeight || 200;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      } catch (err) {
        console.warn('Canvas export tainted or blocked for image, using fallback:', err);
        resolve(null);
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };

    img.src = url;
  });
}

/**
 * Prepares the complete normalized data payload required for card rendering & PDF export.
 */
export async function prepareNfcCardExportData(
  business: BusinessProfile,
  card: BackendDigitalCard | PublicCardData | null | undefined,
  cardUrl: string,
  themeId?: string
): Promise<NfcCardExportData> {
  // 1. Generate local high-resolution QR code data URL (100% offline, zero CORS taint)
  const qrDataUrl = await QRCode.toDataURL(cardUrl, {
    width: 450,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#0F172A',
      light: '#FFFFFF',
    },
  });

  // 2. Preload and resolve logo / avatar image as safe base64
  const candidateLogo =
    card?.logoUrl ||
    card?.profileImageUrl ||
    business.logoUrl ||
    null;

  let logoDataUrl: string | null = null;
  if (candidateLogo) {
    logoDataUrl = await convertImageUrlToDataUrl(candidateLogo);
  }

  const selectedTheme = themeId || card?.theme || 'CLASSIC_DARK';

  return {
    companyName: card?.companyName || business.name || 'BrandX Business',
    category: business.category || 'Professional Services',
    fullName: card?.fullName || business.ownerName || business.name || 'Business Owner',
    designation: card?.designation || 'Owner / Vyapari',
    phone: card?.phone || business.phone || '',
    whatsapp: card?.whatsapp || business.phone || '',
    email: card?.email || business.email || '',
    website: card?.website || '',
    address: card?.address || business.address || '',
    city: card?.city || business.city || '',
    state: card?.state || business.state || '',
    pincode: card?.pincode || business.pincode || '',
    logoUrl: candidateLogo,
    profileImageUrl: card?.profileImageUrl,
    bio: card?.bio || '',
    upiId: card?.upiId || business.upiId || '',
    slug: card?.slug || business.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    theme: selectedTheme,
    qrDataUrl,
    logoDataUrl,
  };
}

/**
 * Captures an HTML element to high-res PNG data URL with full color sanitization
 */
async function captureCardSideElement(
  elementId: string,
  scale = 2.5
): Promise<string> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`NFC Card render element #${elementId} not found in DOM`);
  }

  // Ensure all fonts & images inside element are ready
  await waitForAssets(element);

  const html2canvasModule = await import('html2canvas');
  const html2canvas = (html2canvasModule.default || html2canvasModule) as unknown as (
    el: HTMLElement,
    opts?: any
  ) => Promise<HTMLCanvasElement>;

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: false,
    backgroundColor: null, // Critical: preserves rich CSS gradients without white canvas overlay
    logging: false,
    scrollX: 0,
    scrollY: 0,
    windowWidth: 1200,
    onclone: (clonedDoc, clonedEl) => {
      try {
        const target = clonedDoc.getElementById(elementId) || clonedEl;
        if (target) {
          sanitizeClonedElement(element, target as HTMLElement, clonedDoc);
        }
      } catch (cloneErr) {
        console.warn('DOM clone sanitization notice:', cloneErr);
      }
    },
  });

  return canvas.toDataURL('image/png', 1.0);
}

/**
 * Exports NFC Visiting Card to a downloadable 2-page PDF matching exact business card dimensions.
 */
export async function exportNfcVisitingCardToPdf({
  business,
  card,
  cardUrl,
  themeId,
  printAfterGenerate = false,
  onProgress,
}: ExportNfcCardPdfOptions): Promise<NfcCardPdfExportResult> {
  const cleanName = (card?.fullName || card?.companyName || business.name || 'Card')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `BrandX_NFC_Card_${cleanName}.pdf`;

  try {
    onProgress?.('Preparing high-res graphics and QR...');

    // Wait a brief moment for document fonts to settle
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 800)),
      ]);
    }

    // Capture Front side
    onProgress?.('Rendering Card Front...');
    const frontDataUrl = await captureCardSideElement('nfc-card-export-front', 2.5);

    // Capture Back side
    onProgress?.('Rendering Card Back...');
    const backDataUrl = await captureCardSideElement('nfc-card-export-back', 2.5);

    // Assemble PDF using jsPDF
    onProgress?.('Generating PDF document...');
    const jspdfModule = await import('jspdf');
    const { jsPDF } = jspdfModule;

    // Standard Business Card dimensions: 88.9mm x 50.8mm (3.5" x 2", 1.75:1 aspect ratio)
    const cardWidthMm = 88.9;
    const cardHeightMm = 50.8;

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [cardWidthMm, cardHeightMm],
      compress: true,
    });

    // Page 1: Card Front
    pdf.addImage(frontDataUrl, 'PNG', 0, 0, cardWidthMm, cardHeightMm, undefined, 'FAST');

    // Page 2: Card Back
    pdf.addPage([cardWidthMm, cardHeightMm], 'landscape');
    pdf.addImage(backDataUrl, 'PNG', 0, 0, cardWidthMm, cardHeightMm, undefined, 'FAST');

    const pdfBlob = pdf.output('blob');

    if (printAfterGenerate) {
      // Direct high-quality vector print preview
      pdf.autoPrint();
      const blobUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(blobUrl, '_blank');
      if (!printWindow) {
        // Fallback to save if popup blocked
        pdf.save(filename);
      }
    } else {
      // Direct download
      pdf.save(filename);
    }

    onProgress?.('Done!');
    return {
      success: true,
      filename,
      pdfBlob,
    };
  } catch (err: any) {
    console.error('Error generating NFC Card PDF:', err);
    return {
      success: false,
      filename,
      error: err?.message || 'Failed to export NFC Card PDF',
    };
  }
}
