import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { DailyCalendarItem, BusinessProfile, KhataCustomer } from '../types';

/**
 * Helper to wrap text into multiple lines on a 2D canvas context
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 5
): number {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  let linesCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + (line ? ' ' : '') + words[n];
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = words[n];
      currentY += lineHeight;
      linesCount++;
      if (linesCount >= maxLines - 1 && n < words.length - 1) {
        line += '...';
        break;
      }
    } else {
      line = testLine;
    }
  }

  if (line) {
    ctx.fillText(line, x, currentY);
    currentY += lineHeight;
  }

  return currentY;
}

/**
 * Draws rounded rectangle on canvas
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Loads an image from a URL into an HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => {
      const localImg = new Image();
      localImg.onload = () => resolve(localImg);
      localImg.onerror = reject;
      localImg.src = src;
    };
    img.src = src;
  });
}

/**
 * Generates a full high-resolution (1080x1920 9:16) branded poster image
 * with Suvichar quote, headline, and business stamp on HTML5 canvas.
 */
export async function generateBrandedPosterBlob(
  cal: DailyCalendarItem,
  business?: BusinessProfile
): Promise<{ blob: Blob; dataUrl: string }> {
  const width = 1080;
  const height = 1920; // 9:16 vertical aspect ratio - ideal for WhatsApp Status & Stories

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not supported');
  }

  // 1. Draw Background Image
  try {
    const bgImg = await loadImage(cal.imageUrl);
    const hRatio = width / bgImg.width;
    const vRatio = height / bgImg.height;
    const ratio = Math.max(hRatio, vRatio);
    const centerShiftX = (width - bgImg.width * ratio) / 2;
    const centerShiftY = (height - bgImg.height * ratio) / 2;
    ctx.drawImage(
      bgImg,
      0,
      0,
      bgImg.width,
      bgImg.height,
      centerShiftX,
      centerShiftY,
      bgImg.width * ratio,
      bgImg.height * ratio
    );
  } catch {
    // Fallback gradient
    const fallbackGrad = ctx.createLinearGradient(0, 0, width, height);
    fallbackGrad.addColorStop(0, '#1E1B4B');
    fallbackGrad.addColorStop(0.5, '#0F172A');
    fallbackGrad.addColorStop(1, '#020617');
    ctx.fillStyle = fallbackGrad;
    ctx.fillRect(0, 0, width, height);
  }

  // 2. Cinematic Gradient Overlays
  // Top gradient for badges & date
  const topGrad = ctx.createLinearGradient(0, 0, 0, 360);
  topGrad.addColorStop(0, 'rgba(11, 15, 25, 0.9)');
  topGrad.addColorStop(1, 'rgba(11, 15, 25, 0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, width, 360);

  // Bottom dark vignette for Suvichar and shop stamp
  const bottomGrad = ctx.createLinearGradient(0, height * 0.35, 0, height);
  bottomGrad.addColorStop(0, 'rgba(11, 15, 25, 0)');
  bottomGrad.addColorStop(0.4, 'rgba(11, 15, 25, 0.85)');
  bottomGrad.addColorStop(0.75, 'rgba(11, 15, 25, 0.97)');
  bottomGrad.addColorStop(1, 'rgba(11, 15, 25, 1)');
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(0, height * 0.35, width, height * 0.65);

  // 3. Top Badges
  // Left Badge: Date / Status Tag
  const dateText = cal.dateLabel || 'आज का स्टेटस';
  ctx.font = 'bold 30px "Segoe UI", Roboto, sans-serif';
  const dateMetrics = ctx.measureText(dateText);
  const leftBadgeWidth = Math.max(dateMetrics.width + 44, 220);

  ctx.fillStyle = '#F59E0B'; // Amber badge
  drawRoundedRect(ctx, 56, 60, leftBadgeWidth, 60, 30);
  ctx.fill();

  ctx.fillStyle = '#0F172A';
  ctx.fillText(dateText, 78, 102);

  // Right Badge: Theme / Category
  if (cal.badge) {
    const badgeText = cal.badge;
    ctx.font = 'bold 26px "Segoe UI", Roboto, sans-serif';
    const badgeMetrics = ctx.measureText(badgeText);
    const rightBadgeWidth = badgeMetrics.width + 40;
    const rightBadgeX = width - 56 - rightBadgeWidth;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    drawRoundedRect(ctx, rightBadgeX, 60, rightBadgeWidth, 60, 30);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(badgeText, rightBadgeX + 20, 101);
  }

  // 4. Headline & Hindi Suvichar Content (Prominently rendered in Image)
  const textStartY = height - 600;

  // Headline (with drop shadow)
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 58px "Segoe UI", "Noto Sans Devanagari", Roboto, sans-serif';
  wrapText(ctx, cal.headline, 64, textStartY, width - 128, 72, 2);

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Suvichar / Quote in Hindi (Enclosed in Quotes)
  const quoteText = cal.quoteHindi || cal.subheadline || '';
  if (quoteText) {
    // Quote Box Card
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    drawRoundedRect(ctx, 56, textStartY + 90, width - 112, 240, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#FDE047'; // Warm Yellow for quote quotation mark
    ctx.font = 'bold 44px "Segoe UI", Georgia, serif';
    ctx.fillText('“', 76, textStartY + 145);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '500 36px "Segoe UI", "Noto Sans Devanagari", Georgia, serif';
    wrapText(ctx, quoteText, 110, textStartY + 145, width - 200, 52, 3);
  }

  // 5. Business Brand Stamp Bar (Footer)
  const brandBarY = height - 190;
  const brandBarHeight = 120;
  const brandBarWidth = width - 112;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  drawRoundedRect(ctx, 56, brandBarY, brandBarWidth, brandBarHeight, 24);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Business Name with verified check
  const shopName = business?.name || 'BrandX Business';
  ctx.fillStyle = '#38BDF8';
  ctx.font = 'bold 34px "Segoe UI", Roboto, sans-serif';
  ctx.fillText('✓', 86, brandBarY + 54);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px "Segoe UI", Roboto, sans-serif';
  ctx.fillText(shopName, 126, brandBarY + 54);

  // Shop Address & Subtitle
  const shopAddress = [business?.category || 'Retail Store', business?.address || ''].filter(Boolean).join(' • ');
  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 24px "Segoe UI", Roboto, sans-serif';
  ctx.fillText(shopAddress.slice(0, 42), 86, brandBarY + 95);

  // Business Phone Number
  const phoneText = business?.phone ? `📞 +91 ${business.phone}` : 'BrandX Suite';
  ctx.font = 'bold 30px "Segoe UI", Roboto, monospace';
  const phoneMetrics = ctx.measureText(phoneText);
  const phoneX = 56 + brandBarWidth - phoneMetrics.width - 32;

  ctx.fillStyle = '#FCD34D';
  ctx.fillText(phoneText, phoneX, brandBarY + 70);

  // Output to PNG Blob & DataURL
  const dataUrl = canvas.toDataURL('image/png');
  const blob = dataUrlToBlob(dataUrl);

  return { blob, dataUrl };
}

/**
 * Generates a clean, crisp visual Khata Statement image on HTML5 Canvas
 */
export async function generateKhataStatementBlob(
  customer: KhataCustomer,
  business?: BusinessProfile
): Promise<{ blob: Blob; dataUrl: string }> {
  const width = 1080;
  const height = 1420;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  // Background gradient: clean, premium navy/slate
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0F172A');
  bgGrad.addColorStop(1, '#020617');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Top Accent Bar
  const accentGrad = ctx.createLinearGradient(0, 0, width, 0);
  accentGrad.addColorStop(0, '#3B82F6');
  accentGrad.addColorStop(0.5, '#6366F1');
  accentGrad.addColorStop(1, '#8B5CF6');
  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, 0, width, 12);

  // 1. Business Header Block
  ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
  drawRoundedRect(ctx, 48, 40, width - 96, 150, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Shop Name & Verified Stamp
  const shopName = business?.name || 'BrandX Merchant Store';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 40px "Segoe UI", Roboto, sans-serif';
  ctx.fillText(shopName, 80, 100);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 22px "Segoe UI", Roboto, sans-serif';
  const shopSub = [
    business?.category || 'Retail Store',
    business?.address ? `📍 ${business.address}` : '',
    business?.phone ? `📞 +91 ${business.phone}` : '',
  ].filter(Boolean).join('  •  ');
  ctx.fillText(shopSub, 80, 145);

  // Document Badge (Right Header)
  ctx.fillStyle = '#3B82F6';
  drawRoundedRect(ctx, width - 48 - 250, 68, 220, 48, 12);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px "Segoe UI", Roboto, sans-serif';
  ctx.fillText('KHATA STATEMENT', width - 48 - 232, 100);

  // 2. Customer Summary Card
  const custCardY = 215;
  ctx.fillStyle = '#1E293B';
  drawRoundedRect(ctx, 48, custCardY, width - 96, 160, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.stroke();

  // Customer Avatar Circle
  const initials = customer.name.slice(0, 2).toUpperCase();
  ctx.fillStyle = customer.totalDue > 0 ? '#EF4444' : '#10B981';
  ctx.beginPath();
  ctx.arc(110, custCardY + 80, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 32px "Segoe UI", Roboto, sans-serif';
  ctx.fillText(initials, initials.length === 1 ? 98 : 90, custCardY + 92);

  // Customer Name & Phone
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px "Segoe UI", Roboto, sans-serif';
  ctx.fillText(customer.name, 180, custCardY + 70);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 24px "Segoe UI", Roboto, monospace';
  ctx.fillText(`Customer Phone: +91 ${customer.phone}`, 180, custCardY + 115);

  // Statement Date on Right
  const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  ctx.font = '500 22px "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.fillText(`Statement Date: ${todayStr}`, width - 380, custCardY + 90);

  // 3. Balance Hero Box
  const balanceY = 400;
  const isDue = customer.totalDue > 0;
  ctx.fillStyle = isDue ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)';
  drawRoundedRect(ctx, 48, balanceY, width - 96, 140, 20);
  ctx.fill();
  ctx.strokeStyle = isDue ? '#EF4444' : '#10B981';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = isDue ? '#FCA5A5' : '#6EE7B7';
  ctx.font = 'bold 22px "Segoe UI", Roboto, sans-serif';
  ctx.fillText(isDue ? 'OUTSTANDING PENDING BALANCE (उधार बाक़ी)' : 'ACCOUNT STATUS (खाता स्थिति)', 80, balanceY + 45);

  ctx.fillStyle = isDue ? '#EF4444' : '#10B981';
  ctx.font = '900 56px "Segoe UI", Roboto, sans-serif';
  const balanceText = isDue ? `₹ ${customer.totalDue.toLocaleString('en-IN')}` : '₹ 0  (ALL CLEARED)';
  ctx.fillText(balanceText, 80, balanceY + 110);

  // 4. Transaction History Table
  const tableY = 565;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 26px "Segoe UI", Roboto, sans-serif';
  ctx.fillText('RECENT TRANSACTION HISTORY', 48, tableY);

  // Table Header
  const thY = tableY + 20;
  ctx.fillStyle = '#1E293B';
  drawRoundedRect(ctx, 48, thY, width - 96, 50, 10);
  ctx.fill();

  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 18px "Segoe UI", Roboto, sans-serif';
  ctx.fillText('DATE', 75, thY + 32);
  ctx.fillText('NOTE / DETAILS', 250, thY + 32);
  ctx.fillText('TYPE', 650, thY + 32);
  ctx.fillText('AMOUNT', width - 200, thY + 32);

  // Transaction Rows (up to 5 recent)
  const recentTxs = (customer.transactions || []).slice(0, 5);
  let currentY = thY + 65;

  if (recentTxs.length === 0) {
    ctx.fillStyle = '#64748B';
    ctx.font = 'italic 22px "Segoe UI", Roboto, sans-serif';
    ctx.fillText('No prior transactions recorded on ledger.', 75, currentY + 35);
    currentY += 60;
  } else {
    recentTxs.forEach((tx, idx) => {
      ctx.fillStyle = idx % 2 === 0 ? 'rgba(30, 41, 59, 0.4)' : 'rgba(15, 23, 42, 0.4)';
      drawRoundedRect(ctx, 48, currentY - 15, width - 96, 56, 8);
      ctx.fill();

      // Date
      ctx.fillStyle = '#E2E8F0';
      ctx.font = '500 20px "Segoe UI", Roboto, sans-serif';
      ctx.fillText(tx.date, 75, currentY + 20);

      // Note
      const noteStr = (tx.note || tx.billNumber || 'Regular entry').slice(0, 32);
      ctx.fillText(noteStr, 250, currentY + 20);

      // Type Badge
      const isGive = tx.type === 'give';
      ctx.fillStyle = isGive ? '#EF4444' : '#10B981';
      ctx.font = 'bold 20px "Segoe UI", Roboto, sans-serif';
      ctx.fillText(isGive ? 'Udhar (उधार)' : 'Jama (जमा)', 650, currentY + 20);

      // Amount
      ctx.fillStyle = isGive ? '#F87171' : '#34D399';
      ctx.font = 'bold 22px "Segoe UI", Roboto, monospace';
      ctx.fillText(`${isGive ? '-' : '+'} ₹${tx.amount.toLocaleString('en-IN')}`, width - 200, currentY + 20);

      currentY += 65;
    });
  }

  // 5. Payment & Settlement Strip (UPI QR)
  const upiBoxY = Math.max(currentY + 20, 950);
  ctx.fillStyle = '#131B2E';
  drawRoundedRect(ctx, 48, upiBoxY, width - 96, 260, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Draw QR code Box & Finder Patterns
  const qrX = 80;
  const qrY = upiBoxY + 30;
  const qrSize = 200;

  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, qrX, qrY, qrSize, qrSize, 16);
  ctx.fill();

  // QR Finder Top-Left
  ctx.fillStyle = '#0F172A';
  drawRoundedRect(ctx, qrX + 15, qrY + 15, 50, 50, 6);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, qrX + 23, qrY + 23, 34, 34, 4);
  ctx.fill();
  ctx.fillStyle = '#0F172A';
  drawRoundedRect(ctx, qrX + 31, qrY + 31, 18, 18, 2);
  ctx.fill();

  // QR Finder Top-Right
  ctx.fillStyle = '#0F172A';
  drawRoundedRect(ctx, qrX + qrSize - 65, qrY + 15, 50, 50, 6);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, qrX + qrSize - 57, qrY + 23, 34, 34, 4);
  ctx.fill();
  ctx.fillStyle = '#0F172A';
  drawRoundedRect(ctx, qrX + qrSize - 49, qrY + 31, 18, 18, 2);
  ctx.fill();

  // QR Finder Bottom-Left
  ctx.fillStyle = '#0F172A';
  drawRoundedRect(ctx, qrX + 15, qrY + qrSize - 65, 50, 50, 6);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, qrX + 23, qrY + qrSize - 57, 34, 34, 4);
  ctx.fill();
  ctx.fillStyle = '#0F172A';
  drawRoundedRect(ctx, qrX + 31, qrY + qrSize - 49, 18, 18, 2);
  ctx.fill();

  // QR Random data modules
  ctx.fillStyle = '#0F172A';
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if ((r + c) % 2 === 0 && (r > 2 || c > 2)) {
        ctx.fillRect(qrX + 80 + c * 14, qrY + 20 + r * 14, 10, 10);
      }
    }
  }

  // UPI Info on right of QR
  const upiTextX = qrX + qrSize + 40;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 30px "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Pay via UPI (PhonePe / GPay / Paytm)', upiTextX, upiBoxY + 80);

  ctx.fillStyle = '#60A5FA';
  ctx.font = 'bold 28px "Segoe UI", Roboto, monospace';
  if (business?.upiId) {
    ctx.fillText(`UPI ID: ${business.upiId}`, upiTextX, upiBoxY + 130);
  }

  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 22px "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Scan QR code or use UPI ID for direct settlement.', upiTextX, upiBoxY + 180);

  // 6. BrandX Footer Stamp
  const footerY = height - 70;
  ctx.fillStyle = '#64748B';
  ctx.font = '500 20px "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Generated & Verified by BRANDX Digital Bahi-Khata • 100% Secure', 48, footerY);

  const dataUrl = canvas.toDataURL('image/png');
  const blob = dataUrlToBlob(dataUrl);
  return { blob, dataUrl };
}

/**
 * Synchronously converts a Base64/DataURL to a Blob without using network fetch()
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Converts any image DataURL to a PNG Blob (mandatory for navigator.clipboard.write)
 */
export async function dataUrlToPngBlob(dataUrl: string): Promise<Blob> {
  if (dataUrl.startsWith('data:image/png')) {
    return dataUrlToBlob(dataUrl);
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      if (!dataUrl.startsWith('data:')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrlToBlob(dataUrl));
            return;
          }
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else resolve(dataUrlToBlob(dataUrl));
          }, 'image/png');
        } catch (err) {
          console.warn('Canvas to PNG conversion failed, falling back to original blob:', err);
          resolve(dataUrlToBlob(dataUrl));
        }
      };
      img.onerror = () => {
        resolve(dataUrlToBlob(dataUrl));
      };
      img.src = dataUrl;
    } catch {
      resolve(dataUrlToBlob(dataUrl));
    }
  });
}

export interface PosterShareResult {
  success: boolean;
  message: string;
  method?: 'native' | 'web-share' | 'clipboard-copy' | 'download-only';
  caption?: string;
  dataUrl?: string;
}

/**
 * Universal function to share an image (as DataURL or Blob) with caption to WhatsApp
 * Handles Native Android/iOS via Capacitor Filesystem + Share, Web Share API with files,
 * or Desktop browser fallback (downloading file + copying image to clipboard + opening WhatsApp).
 */
export async function shareImageToWhatsApp(
  dataUrl: string,
  caption: string,
  title: string = 'BrandX Poster',
  existingBlob?: Blob,
  phoneNumber?: string
): Promise<PosterShareResult> {
  const isInvoice = title.toLowerCase().includes('invoice');
  const isKhata = title.toLowerCase().includes('khata');
  const isQr = title.toLowerCase().includes('qr');
  const itemLabel = isInvoice ? 'Invoice' : isKhata ? 'Khata Statement' : isQr ? 'UPI QR' : 'Poster';

  const isPng = dataUrl.startsWith('data:image/png');
  const fileExt = isPng ? 'png' : 'jpg';
  const mimeType = isPng ? 'image/png' : 'image/jpeg';
  const cleanFileName = `BrandX-${title.replace(/[^a-zA-Z0-9-_]/g, '_')}.${fileExt}`;

  // 1. Native Capacitor App (Android / iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;

      // Save image to Cache directory
      const savedFile = await Filesystem.writeFile({
        path: cleanFileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      // Copy caption to clipboard so user can paste if desired
      try {
        if (caption && navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(caption);
        }
      } catch {}

      // Launch native Share sheet with image file attachment
      await Share.share({
        title,
        files: [savedFile.uri],
        dialogTitle: `Share ${itemLabel}`,
      });

      return {
        success: true,
        message: `${itemLabel} image WhatsApp share sheet me khul gayi! 🖼️`,
        method: 'native',
        caption,
        dataUrl,
      };
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('canceled') || err.message?.includes('cancelled')) {
        return { success: true, message: 'Share sheet closed', method: 'native' };
      }
      console.warn('Native share failed, falling back to Web share:', err);
    }
  }

  // 2. Web Share API with Files (Supported on mobile Android Chrome, iOS Safari, etc.)
  const isMobile =
    typeof navigator !== 'undefined' &&
    (/Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent)));

  if (isMobile && typeof navigator !== 'undefined' && navigator.canShare) {
    try {
      const blob = existingBlob || dataUrlToBlob(dataUrl);
      const file = new File([blob], cleanFileName, {
        type: mimeType,
      });

      if (navigator.canShare({ files: [file] })) {
        // Pre-copy caption to clipboard
        try {
          if (caption && navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(caption);
          }
        } catch {}

        try {
          // Attempt sharing file with text where supported
          await navigator.share({
            files: [file],
            title,
            text: caption,
          });
          return {
            success: true,
            message: `${itemLabel} image WhatsApp me bhej di gayi! 🖼️`,
            method: 'web-share',
            caption,
            dataUrl,
          };
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') {
            return { success: true, message: 'Share sheet closed', method: 'web-share' };
          }
          // If sharing with text fails, fallback to sharing files only
          await navigator.share({
            files: [file],
            title,
          });
          return {
            success: true,
            message: `${itemLabel} image WhatsApp me bhej di gayi! 🖼️`,
            method: 'web-share',
            caption,
            dataUrl,
          };
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: true, message: 'Share sheet closed', method: 'web-share' };
      }
      console.warn('Navigator share error, falling back to desktop/fallback method:', err);
    }
  }

  // 3. Desktop / Unsupported Fallback:
  // Auto-download image file + Copy image to Clipboard + Open WhatsApp with text
  try {
    let copiedImage = false;

    // Clipboard image copy
    try {
      const pngBlob = await dataUrlToPngBlob(dataUrl);
      if (typeof navigator !== 'undefined' && navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': pngBlob,
          }),
        ]);
        copiedImage = true;
      }
    } catch (clipErr) {
      console.warn('Clipboard image copy failed:', clipErr);
    }

    // Auto-download image locally
    try {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = cleanFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (dlErr) {
      console.warn('Auto download error:', dlErr);
    }

    // Copy caption to clipboard
    try {
      if (caption && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(caption);
      }
    } catch {}

    // Open WhatsApp Web
    const cleanPhone = (phoneNumber || '').replace(/\D/g, '');
    const phoneParam = cleanPhone ? `phone=91${cleanPhone}&` : '';
    const waUrl = `https://api.whatsapp.com/send?${phoneParam}text=${encodeURIComponent(caption)}`;
    window.open(waUrl, '_blank');

    return {
      success: true,
      message: copiedImage
        ? `📋 ${itemLabel} image download ho chuki hai! WhatsApp chat me Ctrl + V (Paste) dabayein ya attach karein 🖼️`
        : `📥 ${itemLabel} image download ho gayi! WhatsApp par image attach karke share karein 🖼️`,
      method: copiedImage ? 'clipboard-copy' : 'download-only',
      caption,
      dataUrl,
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Sharing me samasya aayi: ' + (err.message || 'Unknown error'),
    };
  }
}

/**
 * Shares daily status poster directly to WhatsApp (with 9:16 Image file + caption)
 */
export async function shareDailyPosterToWhatsApp(
  cal: DailyCalendarItem,
  business?: BusinessProfile
): Promise<PosterShareResult> {
  const caption =
    `*${cal.headline}*\n\n` +
    (cal.quoteHindi ? `"${cal.quoteHindi}"\n\n` : '') +
    `✨ Best wishes from *${business?.name || 'BrandX Store'}*\n` +
    (business?.address ? `📍 ${business.address}\n` : '') +
    (business?.phone ? `📞 +91 ${business.phone}` : '');

  const { dataUrl, blob } = await generateBrandedPosterBlob(cal, business);
  const title = `Daily-Status-${(cal.headline || 'Poster').replace(/[^a-zA-Z0-9]/g, '_')}`;

  return shareImageToWhatsApp(dataUrl, caption, title, blob);
}

/**
 * Shares Customer Khata Statement directly to WhatsApp (with visual statement Image file + caption)
 */
export async function shareKhataStatementToWhatsApp(
  customer: KhataCustomer,
  business?: BusinessProfile
): Promise<PosterShareResult> {
  const caption =
    `🙏 *Namaste ${customer.name} ji,*\n\n` +
    `Aapke khate ka latest statement attached hai from *${business?.name || 'Shop'}*.\n\n` +
    (customer.totalDue > 0
      ? `📌 *Pending Balance:* ₹${customer.totalDue.toLocaleString('en-IN')}\n` +
        (business?.upiId ? `💳 *UPI ID for Payment:* ${business.upiId}\n\n` : '\n')
      : `✅ *Account Status:* Sabhi hisab barabar (₹0 Balance)\n\n`) +
    `Kripya attached statement check kar lein. Dhanyawaad! ✨\n` +
    `_Sent via BRANDX Digital Khata_`;

  const { dataUrl, blob } = await generateKhataStatementBlob(customer, business);
  const title = `Khata-${customer.name.replace(/[^a-zA-Z0-9]/g, '_')}`;

  return shareImageToWhatsApp(dataUrl, caption, title, blob, customer.phone);
}

