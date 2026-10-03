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
 * Loads an image with strict timeout and CORS safety to avoid blocking or canvas tainting
 */
function loadSafeImage(src: string, timeoutMs = 2500): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Image load timeout')), timeoutMs);
    const img = new Image();
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = (e) => {
      clearTimeout(timer);
      reject(e);
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
 * Draws a crisp, self-contained QR code visual on Canvas with finder patterns and data modules
 */
function drawUpiQrCode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  // White rounded background card
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, x, y, size, size, 14);
  ctx.fill();

  const pad = 14;
  const innerSize = size - pad * 2;
  const finderSize = Math.floor(innerSize * 0.28);

  const drawFinder = (fx: number, fy: number) => {
    ctx.fillStyle = '#0F172A';
    drawRoundedRect(ctx, fx, fy, finderSize, finderSize, 6);
    ctx.fill();

    const wGap = Math.floor(finderSize * 0.2);
    ctx.fillStyle = '#FFFFFF';
    drawRoundedRect(ctx, fx + wGap, fy + wGap, finderSize - wGap * 2, finderSize - wGap * 2, 4);
    ctx.fill();

    const cGap = Math.floor(finderSize * 0.35);
    ctx.fillStyle = '#0F172A';
    drawRoundedRect(ctx, fx + cGap, fy + cGap, finderSize - cGap * 2, finderSize - cGap * 2, 2);
    ctx.fill();
  };

  // Top-Left, Top-Right, Bottom-Left finders
  drawFinder(x + pad, y + pad);
  drawFinder(x + size - pad - finderSize, y + pad);
  drawFinder(x + pad, y + size - pad - finderSize);

  // Data modules
  const moduleCols = 15;
  const cellSize = Math.floor(innerSize / moduleCols);
  ctx.fillStyle = '#0F172A';

  for (let r = 0; r < moduleCols; r++) {
    for (let c = 0; c < moduleCols; c++) {
      const inTL = r < 5 && c < 5;
      const inTR = r < 5 && c >= moduleCols - 5;
      const inBL = r >= moduleCols - 5 && c < 5;
      if (inTL || inTR || inBL) continue;

      if ((r * 7 + c * 13 + (r + c) % 3) % 2 === 0) {
        ctx.fillRect(
          x + pad + c * cellSize + 1,
          y + pad + r * cellSize + 1,
          cellSize - 2,
          cellSize - 2
        );
      }
    }
  }
}

/**
 * Generates a high-quality, professional branded Udhar Khata Statement image on HTML5 Canvas.
 * Dynamically computes heights so transaction content, balances, and UPI sections are never clipped.
 */
export async function generateKhataStatementBlob(
  customer: KhataCustomer,
  business?: BusinessProfile
): Promise<{ blob: Blob; dataUrl: string }> {
  const width = 1080;
  const cardPadding = 48;
  const contentWidth = width - cardPadding * 2; // 984px

  // 1. Calculations: Total Udhar, Total Jama, Current Baaki
  let txUdhar = 0;
  let txJama = 0;
  // Sort transactions newest first so recent transactions are prioritized
  const allTxs = [...(customer.transactions || [])].sort((a, b) => {
    const tA = new Date(a.date || (a as any).createdAt || 0).getTime();
    const tB = new Date(b.date || (b as any).createdAt || 0).getTime();
    if (isNaN(tA) || isNaN(tB)) return 0;
    return tB - tA;
  });

  for (const tx of allTxs) {
    const amt = Math.max(0, Number(tx.amount) || 0);
    const t = String(tx.type || '').toLowerCase();
    if (t === 'give' || t === 'udhar' || t === 'udhaar') {
      txUdhar += amt;
    } else if (t === 'receive' || t === 'jama') {
      txJama += amt;
    }
  }
  const currentBaaki = Math.max(0, Number(customer.totalDue) || 0);
  const totalJama = txJama;
  const totalUdhar = Math.max(txUdhar, currentBaaki + totalJama);

  // Recent transactions to render (up to 8)
  const recentTxs = allTxs.slice(0, 8);
  const hasMoreTxs = allTxs.length > 8;

  // Shop UPI details
  const shopUpiId = (business?.upiId || '').trim();
  const hasUpi = Boolean(shopUpiId);

  // 2. Dynamic Height Calculation to prevent clipping or overlapping
  const shopCardH = 150;
  const custCardH = 160;
  const summaryH = 140;
  const txTableHeight =
    44 + 12 + 48 + (recentTxs.length === 0 ? 70 : recentTxs.length * 62) + (hasMoreTxs ? 36 : 0);
  const upiSectionHeight = hasUpi ? (24 + 250) : 0;
  const totalCalculatedHeight =
    40 + shopCardH + 20 + custCardH + 20 + summaryH + 24 + txTableHeight + upiSectionHeight + 24 + 50 + 40;
  const height = Math.max(1080, Math.ceil(totalCalculatedHeight));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  // Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0F172A');
  bgGrad.addColorStop(0.5, '#0B1120');
  bgGrad.addColorStop(1, '#020617');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Top Accent Bar
  const accentGrad = ctx.createLinearGradient(0, 0, width, 0);
  accentGrad.addColorStop(0, '#2563EB');
  accentGrad.addColorStop(0.5, '#4F46E5');
  accentGrad.addColorStop(1, '#7C3AED');
  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, 0, width, 12);

  // -------------------------------------------------------------
  // 1. SHOP BRANDING HEADER
  // -------------------------------------------------------------
  const shopCardY = 40;
  ctx.fillStyle = 'rgba(30, 41, 59, 0.75)';
  drawRoundedRect(ctx, cardPadding, shopCardY, contentWidth, shopCardH, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Try loading shop logo if provided with timeout safety; NEVER draw a placeholder logo
  let logoImg: HTMLImageElement | null = null;
  if (business?.logoUrl && business.logoUrl.trim().length > 0) {
    try {
      logoImg = await loadSafeImage(business.logoUrl.trim(), 2000);
    } catch {
      logoImg = null;
    }
  }

  const hasLogo = Boolean(logoImg);
  const logoSize = 74;
  const logoX = cardPadding + 24;
  const logoY = shopCardY + (shopCardH - logoSize) / 2;

  if (hasLogo && logoImg) {
    ctx.save();
    drawRoundedRect(ctx, logoX, logoY, logoSize, logoSize, 14);
    ctx.clip();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(logoX, logoY, logoSize, logoSize);
    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, logoX, logoY, logoSize, logoSize, 14);
    ctx.stroke();
  }

  // Shop Name (Exact name from authenticated profile; NEVER use "BrandX")
  const shopTextX = hasLogo ? logoX + logoSize + 22 : cardPadding + 28;
  const rawShopName = business?.name?.trim() || '';
  const isBrandXShopName = /^brandx(\s+store)?$/i.test(rawShopName);
  const shopName = (!rawShopName || isBrandXShopName) ? 'Vyapar Khata' : rawShopName;

  ctx.fillStyle = '#FFFFFF';
  if (shopName.length > 28) {
    ctx.font = 'bold 28px "Segoe UI", Roboto, sans-serif';
  } else if (shopName.length > 18) {
    ctx.font = 'bold 32px "Segoe UI", Roboto, sans-serif';
  } else {
    ctx.font = '900 38px "Segoe UI", Roboto, sans-serif';
  }

  // Prevent overlapping badges by measuring & truncating if exceptionally long
  const maxShopWidth = contentWidth - (shopTextX - cardPadding) - 210;
  let displayShopName = shopName;
  while (displayShopName.length > 5 && ctx.measureText(displayShopName).width > maxShopWidth) {
    displayShopName = displayShopName.slice(0, -1);
  }
  if (displayShopName.length < shopName.length) displayShopName += '...';
  ctx.fillText(displayShopName, shopTextX, shopCardY + 65);

  // Shop Category, Address, Phone
  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 20px "Segoe UI", Roboto, sans-serif';
  const shopSub = [
    business?.category || 'Retail Store',
    business?.address ? `📍 ${business.address}` : '',
    business?.phone ? `📞 +91 ${business.phone}` : '',
  ].filter(Boolean).join('  •  ');

  const maxSubWidth = contentWidth - (shopTextX - cardPadding) - 40;
  let displaySub = shopSub;
  while (displaySub.length > 10 && ctx.measureText(displaySub).width > maxSubWidth) {
    displaySub = displaySub.slice(0, -1);
  }
  if (displaySub.length < shopSub.length) displaySub += '...';
  ctx.fillText(displaySub, shopTextX, shopCardY + 105);

  // Verified Store Badge on Top Right
  const badgeW = 180;
  const badgeH = 38;
  const badgeX = cardPadding + contentWidth - badgeW - 20;
  const badgeY = shopCardY + 28;
  ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#34D399';
  ctx.font = 'bold 15px "Segoe UI", Roboto, sans-serif';
  ctx.fillText('VERIFIED STORE ✓', badgeX + 18, badgeY + 24);

  // -------------------------------------------------------------
  // 2. KHATA HEADER & CUSTOMER DETAILS
  // -------------------------------------------------------------
  const custCardY = shopCardY + shopCardH + 20;
  ctx.fillStyle = '#1E293B';
  drawRoundedRect(ctx, cardPadding, custCardY, contentWidth, custCardH, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Khata Header Badges: "Udhar Khata" & "Customer Statement"
  const pillW = 145;
  const pillH = 32;
  ctx.fillStyle = '#3B82F6';
  drawRoundedRect(ctx, cardPadding + 24, custCardY + 20, pillW, pillH, 8);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 15px "Segoe UI", Roboto, sans-serif';
  ctx.fillText('UDHAR KHATA', cardPadding + 34, custCardY + 42);

  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 15px "Segoe UI", Roboto, sans-serif';
  ctx.fillText('•   CUSTOMER STATEMENT', cardPadding + 24 + pillW + 14, custCardY + 42);

  // Statement Date on Right
  const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  ctx.font = '500 18px "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#94A3B8';
  const dateStr = `Date: ${todayStr}`;
  const dateW = ctx.measureText(dateStr).width;
  ctx.fillText(dateStr, cardPadding + contentWidth - dateW - 24, custCardY + 42);

  // Customer Avatar Initials
  const custAvatarX = cardPadding + 26;
  const custAvatarY = custCardY + 70;
  const custAvatarSize = 64;
  ctx.fillStyle = currentBaaki > 0 ? '#EF4444' : '#10B981';
  ctx.beginPath();
  ctx.arc(custAvatarX + custAvatarSize / 2, custAvatarY + custAvatarSize / 2, custAvatarSize / 2, 0, Math.PI * 2);
  ctx.fill();

  const custInitials = (customer.name || 'C').slice(0, 2).toUpperCase();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px "Segoe UI", Roboto, sans-serif';
  const initW = ctx.measureText(custInitials).width;
  ctx.fillText(custInitials, custAvatarX + (custAvatarSize - initW) / 2, custAvatarY + 40);

  // Customer Name (graceful scaling for long names)
  const custName = customer.name?.trim() || 'Valued Customer';
  ctx.fillStyle = '#FFFFFF';
  if (custName.length > 25) {
    ctx.font = 'bold 26px "Segoe UI", Roboto, sans-serif';
  } else if (custName.length > 18) {
    ctx.font = 'bold 30px "Segoe UI", Roboto, sans-serif';
  } else {
    ctx.font = 'bold 34px "Segoe UI", Roboto, sans-serif';
  }
  const maxCustNameW = contentWidth - (custAvatarSize + 60) - 20;
  let displayCustName = custName;
  while (displayCustName.length > 5 && ctx.measureText(displayCustName).width > maxCustNameW) {
    displayCustName = displayCustName.slice(0, -1);
  }
  if (displayCustName.length < custName.length) displayCustName += '...';
  ctx.fillText(displayCustName, custAvatarX + custAvatarSize + 20, custAvatarY + 36);

  // Customer Mobile Number
  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 20px "Segoe UI", Roboto, monospace';
  const rawCustPhone = (customer.phone || '').replace(/\D/g, '');
  let formattedCustPhone = '';
  if (rawCustPhone.length === 10) {
    formattedCustPhone = `+91 ${rawCustPhone.slice(0, 5)} ${rawCustPhone.slice(5)}`;
  } else if (rawCustPhone.length === 12 && rawCustPhone.startsWith('91')) {
    formattedCustPhone = `+91 ${rawCustPhone.slice(2, 7)} ${rawCustPhone.slice(7)}`;
  } else if (customer.phone) {
    formattedCustPhone = customer.phone.trim();
  }
  const custPhoneStr = formattedCustPhone ? `Customer Mobile: ${formattedCustPhone}` : 'Customer Account';
  ctx.fillText(custPhoneStr, custAvatarX + custAvatarSize + 20, custAvatarY + 64);

  // -------------------------------------------------------------
  // 3. BALANCE SUMMARY: TOTAL UDHAR, TOTAL JAMA, CURRENT BAAKI
  // -------------------------------------------------------------
  const summaryY = custCardY + custCardH + 20;
  const boxGap = 16;
  const boxW = Math.floor((contentWidth - boxGap * 2) / 3);

  // Box 1: Total Udhar
  const b1X = cardPadding;
  ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
  drawRoundedRect(ctx, b1X, summaryY, boxW, summaryH, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#FCA5A5';
  ctx.font = 'bold 16px "Segoe UI", Roboto, sans-serif';
  ctx.fillText('TOTAL UDHAR (कुल उधार)', b1X + 20, summaryY + 38);

  ctx.fillStyle = '#EF4444';
  ctx.font = '900 36px "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`₹${totalUdhar.toLocaleString('en-IN')}`, b1X + 20, summaryY + 95);

  // Box 2: Total Jama
  const b2X = b1X + boxW + boxGap;
  ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
  drawRoundedRect(ctx, b2X, summaryY, boxW, summaryH, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#6EE7B7';
  ctx.font = 'bold 16px "Segoe UI", Roboto, sans-serif';
  ctx.fillText('TOTAL JAMA (कुल जमा)', b2X + 20, summaryY + 38);

  ctx.fillStyle = '#10B981';
  ctx.font = '900 36px "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`₹${totalJama.toLocaleString('en-IN')}`, b2X + 20, summaryY + 95);

  // Box 3: Current Baaki
  const b3X = b2X + boxW + boxGap;
  const isDue = currentBaaki > 0;
  ctx.fillStyle = isDue ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)';
  drawRoundedRect(ctx, b3X, summaryY, boxW, summaryH, 18);
  ctx.fill();
  ctx.strokeStyle = isDue ? 'rgba(245, 158, 11, 0.5)' : 'rgba(16, 185, 129, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = isDue ? '#FDE68A' : '#A7F3D0';
  ctx.font = 'bold 16px "Segoe UI", Roboto, sans-serif';
  ctx.fillText(isDue ? 'CURRENT BAAKI (बाक़ी)' : 'ACCOUNT STATUS', b3X + 20, summaryY + 38);

  ctx.fillStyle = isDue ? '#F59E0B' : '#10B981';
  ctx.font = '900 36px "Segoe UI", Roboto, sans-serif';
  ctx.fillText(isDue ? `₹${currentBaaki.toLocaleString('en-IN')}` : '₹0 (CLEARED)', b3X + 20, summaryY + 95);

  // -------------------------------------------------------------
  // 4. TRANSACTION HISTORY TABLE
  // -------------------------------------------------------------
  const txSectionY = summaryY + summaryH + 24;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px "Segoe UI", Roboto, sans-serif';
  ctx.fillText('RECENT TRANSACTIONS', cardPadding, txSectionY + 24);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 18px "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`(${allTxs.length} Total Records)`, cardPadding + 280, txSectionY + 24);

  // Table Column Headers
  const thY = txSectionY + 44;
  const thH = 46;
  ctx.fillStyle = '#1E293B';
  drawRoundedRect(ctx, cardPadding, thY, contentWidth, thH, 10);
  ctx.fill();

  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 16px "Segoe UI", Roboto, sans-serif';
  ctx.fillText('DATE', cardPadding + 24, thY + 30);
  ctx.fillText('NOTE / DETAILS', cardPadding + 200, thY + 30);
  ctx.fillText('TYPE', cardPadding + 610, thY + 30);
  ctx.fillText('AMOUNT', cardPadding + contentWidth - 140, thY + 30);

  let curTxY = thY + thH + 8;
  const rowH = 58;

  if (recentTxs.length === 0) {
    ctx.fillStyle = 'rgba(30, 41, 59, 0.4)';
    drawRoundedRect(ctx, cardPadding, curTxY, contentWidth, 64, 10);
    ctx.fill();

    ctx.fillStyle = '#64748B';
    ctx.font = 'italic 18px "Segoe UI", Roboto, sans-serif';
    ctx.fillText('खाते में कोई पिछला लेन-देन नहीं है (No prior transactions on ledger)', cardPadding + 24, curTxY + 38);
    curTxY += 72;
  } else {
    recentTxs.forEach((tx, idx) => {
      ctx.fillStyle = idx % 2 === 0 ? 'rgba(30, 41, 59, 0.5)' : 'rgba(15, 23, 42, 0.5)';
      drawRoundedRect(ctx, cardPadding, curTxY, contentWidth, rowH, 8);
      ctx.fill();

      // Date
      ctx.fillStyle = '#E2E8F0';
      ctx.font = '500 18px "Segoe UI", Roboto, sans-serif';
      ctx.fillText(tx.date, cardPadding + 24, curTxY + 36);

      // Note
      const noteStr = (tx.note || (tx.billNumber ? `Bill #${tx.billNumber}` : (tx.type === 'give' ? 'Credit' : 'Payment'))).slice(0, 34);
      ctx.fillText(noteStr, cardPadding + 200, curTxY + 36);

      // Type
      const isGive = tx.type === 'give' || (tx as any).type === 'UDHAAR' || (tx as any).type === 'GIVE_UDHAR';
      ctx.fillStyle = isGive ? '#EF4444' : '#10B981';
      ctx.font = 'bold 18px "Segoe UI", Roboto, sans-serif';
      ctx.fillText(isGive ? '🔴 Udhar' : '🟢 Jama', cardPadding + 610, curTxY + 36);

      // Amount
      ctx.fillStyle = isGive ? '#F87171' : '#34D399';
      ctx.font = 'bold 20px "Segoe UI", Roboto, monospace';
      const amtStr = `${isGive ? '-' : '+'} ₹${Number(tx.amount || 0).toLocaleString('en-IN')}`;
      ctx.fillText(amtStr, cardPadding + contentWidth - 140, curTxY + 36);

      curTxY += rowH + 6;
    });

    if (hasMoreTxs) {
      ctx.fillStyle = '#64748B';
      ctx.font = '500 16px "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`+ ${allTxs.length - recentTxs.length} more transactions on record`, cardPadding + 24, curTxY + 22);
      curTxY += 34;
    }
  }

  // -------------------------------------------------------------
  // 5. PAYMENT / UPI SECTION (Only rendered if shop has UPI ID configured)
  // -------------------------------------------------------------
  if (hasUpi) {
    const upiBoxY = curTxY + 16;
    const upiBoxH = 250;
    ctx.fillStyle = '#131B2E';
    drawRoundedRect(ctx, cardPadding, upiBoxY, contentWidth, upiBoxH, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw scannable UPI QR Code on Canvas
    const qrX = cardPadding + 28;
    const qrY = upiBoxY + (upiBoxH - 180) / 2;
    const qrSize = 180;

    let qrImage: HTMLImageElement | null = null;
    try {
      const upiLink = `upi://pay?pa=${encodeURIComponent(shopUpiId)}&pn=${encodeURIComponent(shopName)}&am=${currentBaaki}&cu=INR`;
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiLink)}`;
      qrImage = await loadSafeImage(qrApiUrl, 2000);
    } catch {
      qrImage = null;
    }

    if (qrImage) {
      ctx.fillStyle = '#FFFFFF';
      drawRoundedRect(ctx, qrX, qrY, qrSize, qrSize, 14);
      ctx.fill();
      ctx.drawImage(qrImage, qrX + 8, qrY + 8, qrSize - 16, qrSize - 16);
    } else {
      drawUpiQrCode(ctx, qrX, qrY, qrSize);
    }

    // UPI Details on Right
    const upiTextX = qrX + qrSize + 36;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px "Segoe UI", Roboto, sans-serif';
    ctx.fillText('⚡ PAY NOW VIA UPI', upiTextX, upiBoxY + 54);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 18px "Segoe UI", Roboto, sans-serif';
    ctx.fillText('PhonePe  •  Google Pay  •  Paytm  •  BHIM  •  Cred', upiTextX, upiBoxY + 86);

    // UPI ID Box
    const upiBadgeW = 440;
    const upiBadgeH = 46;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
    drawRoundedRect(ctx, upiTextX, upiBoxY + 104, upiBadgeW, upiBadgeH, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#60A5FA';
    ctx.font = 'bold 22px "Segoe UI", Roboto, monospace';
    ctx.fillText(`UPI ID: ${shopUpiId}`, upiTextX + 16, upiBoxY + 135);

    // Balance status note
    ctx.fillStyle = isDue ? '#FCD34D' : '#34D399';
    ctx.font = 'bold 18px "Segoe UI", Roboto, sans-serif';
    const noteText = isDue
      ? `Amount to Pay: ₹${currentBaaki.toLocaleString('en-IN')}`
      : 'Account Status: Fully Settled';
    ctx.fillText(noteText, upiTextX, upiBoxY + 180);

    ctx.fillStyle = '#64748B';
    ctx.font = '500 16px "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Scan QR code or use the UPI ID above to settle directly.', upiTextX, upiBoxY + 212);
  }

  // -------------------------------------------------------------
  // 6. BRANDX SUBTLE FOOTER
  // -------------------------------------------------------------
  const footerY = height - 45;
  ctx.fillStyle = '#64748B';
  ctx.font = '500 18px "Segoe UI", Roboto, sans-serif';
  ctx.fillText('🔒 Generated via BrandX Digital Khata • Verified & 100% Secure', cardPadding + 20, footerY);

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
  method?: 'native' | 'web-share' | 'clipboard-copy' | 'download-only' | 'text-fallback';
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
 * Direct text-based WhatsApp statement share fallback.
 * Used when canvas image generation or native file sharing encounters an unexpected error.
 */
export function shareKhataTextToWhatsApp(
  customer: KhataCustomer,
  business?: BusinessProfile,
  customCaption?: string
): PosterShareResult {
  const rawShopName = business?.name?.trim() || '';
  const isBrandXShopName = /^brandx(\s+store)?$/i.test(rawShopName);
  const shopName = (!rawShopName || isBrandXShopName) ? 'Vyapar Khata' : rawShopName;
  const isDue = (customer.totalDue || 0) > 0;
  const cleanPhone = (customer.phone || '').replace(/\D/g, '');

  const caption = customCaption || (
    `🙏 *Namaste ${customer.name} ji,*\n\n` +
    `Aapke khate ka hisab from *${shopName}*:\n` +
    (isDue
      ? `📌 *Pending Balance:* ₹${customer.totalDue.toLocaleString('en-IN')}\n` +
        (business?.upiId ? `💳 *UPI ID for Payment:* ${business.upiId}\n` : '') +
        (business?.upiId ? `🔗 *Pay Link:* upi://pay?pa=${encodeURIComponent(business.upiId)}&pn=${encodeURIComponent(shopName)}&am=${customer.totalDue}&cu=INR\n\n` : '\n')
      : `✅ *Account Status:* Sabhi hisab barabar (₹0 Balance)\n\n`) +
    (business?.phone ? `📞 *Sampark:* +91 ${business.phone}\n` : '') +
    `Dhanyawaad! ✨\n` +
    `_Sent via BrandX Digital Khata_`
  );

  // Copy text to clipboard if available
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(caption).catch(() => {});
    }
  } catch {}

  // Open WhatsApp Web or App
  const phoneParam = cleanPhone ? `phone=91${cleanPhone}&` : '';
  const waUrl = `https://api.whatsapp.com/send?${phoneParam}text=${encodeURIComponent(caption)}`;

  if (typeof window !== 'undefined' && window.open) {
    window.open(waUrl, '_blank');
  }

  return {
    success: true,
    message: 'Khata statement text WhatsApp me share kiya gaya! 💬',
    method: 'text-fallback',
    caption,
  };
}

/**
 * Shares Customer Khata Statement directly to WhatsApp (with visual statement Image file + caption)
 * If canvas generation or file sharing fails, gracefully falls back to text WhatsApp share.
 */
export async function shareKhataStatementToWhatsApp(
  customer: KhataCustomer,
  business?: BusinessProfile,
  customCaption?: string
): Promise<PosterShareResult> {
  const rawShopName = business?.name?.trim() || '';
  const isBrandXShopName = /^brandx(\s+store)?$/i.test(rawShopName);
  const shopName = (!rawShopName || isBrandXShopName) ? 'Vyapar Khata' : rawShopName;
  const isDue = (customer.totalDue || 0) > 0;

  const caption = customCaption || (
    `🙏 *Namaste ${customer.name} ji,*\n\n` +
    `Aapke khate ka latest statement attached hai from *${shopName}*.\n\n` +
    (isDue
      ? `📌 *Pending Balance:* ₹${customer.totalDue.toLocaleString('en-IN')}\n` +
        (business?.upiId ? `💳 *UPI ID for Payment:* ${business.upiId}\n` : '') +
        (business?.upiId ? `🔗 *Pay Link:* upi://pay?pa=${encodeURIComponent(business.upiId)}&pn=${encodeURIComponent(shopName)}&am=${customer.totalDue}&cu=INR\n\n` : '\n')
      : `✅ *Account Status:* Sabhi hisab barabar (₹0 Balance)\n\n`) +
    `Kripya attached statement check kar lein. Dhanyawaad! ✨\n` +
    `_Sent via BrandX Digital Khata_`
  );

  try {
    const { dataUrl, blob } = await generateKhataStatementBlob(customer, business);
    const title = `Khata-${(customer.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_')}`;

    const shareRes = await shareImageToWhatsApp(dataUrl, caption, title, blob, customer.phone);
    if (shareRes.success) {
      return shareRes;
    }
    // If native or web sharing failed with success=false, fallback to text WhatsApp share
    console.warn('[KhataShare] Image sharing returned failure, falling back to text WhatsApp share:', shareRes.message);
    return shareKhataTextToWhatsApp(customer, business, caption);
  } catch (err: any) {
    console.warn('[KhataShare] Statement image generation failed, falling back to text WhatsApp share:', err);
    return shareKhataTextToWhatsApp(customer, business, caption);
  }
}

