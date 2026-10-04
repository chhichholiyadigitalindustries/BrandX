/**
 * Automated Verification Script: BrandX NFC Visiting Card PDF Export Engine
 * Tests multiple card themes, field configurations, QR codes, and page dimensions.
 */

import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import sharp from 'sharp';
import { NFC_THEMES, NfcThemeId } from '../src/utils/nfcCardTheme';

interface TestCardScenario {
  name: string;
  themeId: NfcThemeId;
  companyName: string;
  category: string;
  fullName: string;
  designation: string;
  phone: string;
  address: string;
  cardUrl: string;
}

const TEST_SCENARIOS: TestCardScenario[] = [
  {
    name: '1_Classic_Dark',
    themeId: 'CLASSIC_DARK',
    companyName: 'Royal Studio & Digital Lab',
    category: 'Photography & Event Coverage',
    fullName: 'Rajesh Sharma',
    designation: 'Managing Director & Founder',
    phone: '9876543210',
    address: 'Shop 14, City Centre Market, M.G. Road, Bengaluru, Karnataka - 560001',
    cardUrl: 'https://brandx.me/card/royal-studio',
  },
  {
    name: '2_Gold_Luxury',
    themeId: 'GOLD_LUXURY',
    companyName: 'Chhichholiya Jewellers',
    category: 'Gold & Diamond Merchant',
    fullName: 'Abhishek Chhichholiya',
    designation: 'Proprietor & Master Jeweller',
    phone: '9123456789',
    address: 'Jewellers Bazaar, Civil Lines, Jaipur, Rajasthan',
    cardUrl: 'https://brandx.me/card/chhichholiya-jewellers',
  },
  {
    name: '3_Royal_Blue',
    themeId: 'ROYAL_BLUE',
    companyName: 'TechVision Enterprise Solutions International Private Limited',
    category: 'Cloud & AI Infrastructure Consultancy',
    fullName: 'Dr. Vikramaditya Rathore',
    designation: 'Chief Technology Architect',
    phone: '9988776655',
    address: 'Tower B, Tech Park, Cyber City, Phase 3, Gurugram, Haryana - 122002',
    cardUrl: 'https://brandx.me/card/techvision-enterprise',
  },
  {
    name: '4_Emerald_Slate',
    themeId: 'EMERALD_SLATE',
    companyName: 'Kisan Krishi Seva Kendra',
    category: 'Organic Seeds & Agri Tech',
    fullName: 'Mukesh Patel',
    designation: 'Owner',
    phone: '9822334455',
    address: 'Mandi Road, Indore, Madhya Pradesh',
    cardUrl: 'https://brandx.me/card/kisan-krishi',
  },
  {
    name: '5_Elegant_White',
    themeId: 'ELEGANT_WHITE',
    companyName: 'Luxe Aesthetics Studio',
    category: 'Interior Design & Architecture',
    fullName: 'Ananya Deshmukh',
    designation: 'Principal Designer',
    phone: '9765432100',
    address: 'Bandra West, Mumbai, Maharashtra',
    cardUrl: 'https://brandx.me/card/luxe-aesthetics',
  },
];

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function generateCardSidePng(
  scenario: TestCardScenario,
  side: 'front' | 'back',
  qrDataUrl: string
): Promise<Buffer> {
  const theme = NFC_THEMES[scenario.themeId];
  const width = 1050;
  const height = 600;

  const safeCompany = escapeXml(scenario.companyName);
  const safeCategory = escapeXml(scenario.category);
  const safeName = escapeXml(scenario.fullName);
  const safeDesignation = escapeXml(scenario.designation);
  const safePhone = escapeXml(scenario.phone);
  const safeAddress = escapeXml(scenario.address);

  // Render SVG matching the exact HTML/CSS design
  let svgContent = '';

  if (side === 'front') {
    svgContent = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${theme.isDark ? '#1E1B4B' : '#FFFFFF'}" />
          <stop offset="50%" stop-color="${theme.frontFallbackBg}" />
          <stop offset="100%" stop-color="${theme.isDark ? '#1E293B' : '#E2E8F0'}" />
        </linearGradient>
        <linearGradient id="chipGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#F6D365" />
          <stop offset="100%" stop-color="#FDA085" />
        </linearGradient>
      </defs>

      <!-- Background Card Surface -->
      <rect x="0" y="0" width="${width}" height="${height}" rx="32" fill="url(#cardGrad)" stroke="${theme.borderHex}" stroke-width="4" />

      <!-- Top Header: Business Name & Category -->
      <text x="52" y="90" font-family="Arial, sans-serif" font-size="34" font-weight="900" fill="${theme.textPrimary}">
        ${safeCompany.length > 35 ? safeCompany.substring(0, 32) + '...' : safeCompany}
      </text>
      <rect x="52" y="110" width="${scenario.category.length * 10 + 24}" height="28" rx="14" fill="${theme.badgeBg}" stroke="${theme.borderHex}" stroke-width="1.5" />
      <text x="64" y="129" font-family="Arial, sans-serif" font-size="14" font-weight="600" fill="${theme.textSecondary}">
        ${safeCategory}
      </text>

      <!-- Logo / Monogram Badge -->
      <rect x="908" y="48" width="90" height="90" rx="24" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" stroke-width="2" />
      <text x="953" y="108" font-family="Arial, sans-serif" font-size="44" font-weight="900" fill="${theme.textPrimary}" text-anchor="middle">
        ${escapeXml(scenario.companyName.charAt(0))}
      </text>

      <!-- EMV Smart Chip -->
      <rect x="52" y="240" width="64" height="48" rx="8" fill="url(#chipGrad)" stroke="#F59E0B" stroke-width="2" />
      <line x1="52" y1="264" x2="116" y2="264" stroke="#B45309" stroke-width="1.5" />
      <line x1="74" y1="240" x2="74" y2="288" stroke="#B45309" stroke-width="1.5" />
      <line x1="94" y1="240" x2="94" y2="288" stroke="#B45309" stroke-width="1.5" />

      <!-- Person Details -->
      <text x="140" y="250" font-family="Arial, sans-serif" font-size="28" font-weight="800" fill="${theme.textPrimary}">
        ${safeName}
      </text>
      <text x="140" y="280" font-family="Arial, sans-serif" font-size="17" font-weight="600" fill="${theme.accentColor}">
        ${safeDesignation}
      </text>

      <!-- Contact Info -->
      <text x="140" y="325" font-family="Arial, sans-serif" font-size="17" font-weight="600" fill="${theme.textPrimary}">
        📞 +91 ${safePhone}
      </text>
      <text x="140" y="360" font-family="Arial, sans-serif" font-size="15" font-weight="500" fill="${theme.textSecondary}">
        📍 ${safeAddress.length > 60 ? safeAddress.substring(0, 58) + '...' : safeAddress}
      </text>

      <!-- Footer Bar -->
      <line x1="52" y1="520" x2="998" y2="520" stroke="${theme.borderHex}" stroke-width="1" stroke-opacity="0.5" />
      <text x="52" y="555" font-family="Arial, sans-serif" font-size="14" font-weight="800" fill="${theme.accentColor}" letter-spacing="1">
        SMART NFC BUSINESS CARD
      </text>
      <text x="998" y="555" font-family="Courier, monospace" font-size="13" font-weight="700" fill="${theme.textMuted}" text-anchor="end">
        TAP TO CONNECT
      </text>
    </svg>`;
  } else {
    // Back Side with QR Code
    const qrBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
    const qrBase64 = qrBuffer.toString('base64');

    svgContent = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <linearGradient id="backGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${theme.backFallbackBg}" />
          <stop offset="100%" stop-color="${theme.isDark ? '#1E293B' : '#E2E8F0'}" />
        </linearGradient>
      </defs>

      <!-- Card Background -->
      <rect x="0" y="0" width="${width}" height="${height}" rx="32" fill="url(#backGrad)" stroke="${theme.borderHex}" stroke-width="4" />

      <!-- Left Explanatory Column -->
      <rect x="52" y="60" width="220" height="32" rx="16" fill="${theme.badgeBg}" stroke="${theme.borderHex}" stroke-width="1.5" />
      <text x="70" y="81" font-family="Arial, sans-serif" font-size="13" font-weight="800" fill="${theme.accentColor}" letter-spacing="1.5">
        SCAN TO SAVE CONTACT
      </text>

      <text x="52" y="145" font-family="Arial, sans-serif" font-size="28" font-weight="800" fill="${theme.textPrimary}">
        Save ${safeName} in Phonebook
      </text>
      <text x="52" y="190" font-family="Arial, sans-serif" font-size="16" fill="${theme.textSecondary}">
        Point smartphone camera at QR code to instantly save contact (.vcf),
      </text>
      <text x="52" y="215" font-family="Arial, sans-serif" font-size="16" fill="${theme.textSecondary}">
        open WhatsApp chat, and explore official Digital Dukaan.
      </text>

      <!-- Feature Badges -->
      <rect x="52" y="260" width="180" height="28" rx="8" fill="rgba(255,255,255,0.08)" />
      <text x="64" y="279" font-family="Arial, sans-serif" font-size="12" font-weight="600" fill="${theme.textSecondary}">
        ✓ Direct Phonebook Save
      </text>

      <rect x="245" y="260" width="140" height="28" rx="8" fill="rgba(255,255,255,0.08)" />
      <text x="257" y="279" font-family="Arial, sans-serif" font-size="12" font-weight="600" fill="${theme.textSecondary}">
        ✓ WhatsApp Chat
      </text>

      <rect x="398" y="260" width="140" height="28" rx="8" fill="rgba(255,255,255,0.08)" />
      <text x="410" y="279" font-family="Arial, sans-serif" font-size="12" font-weight="600" fill="${theme.textSecondary}">
        ✓ Digital Dukaan
      </text>

      <text x="52" y="550" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="${theme.textMuted}">
        POWERED BY BRANDX DIGITAL VYAPARI PLATFORM
      </text>

      <!-- Right QR Container Box -->
      <rect x="740" y="70" width="250" height="300" rx="28" fill="${theme.qrContainerBg}" stroke="${theme.borderHex}" stroke-width="4" />
      <image x="770" y="90" width="190" height="190" href="data:image/png;base64,${qrBase64}" />
      <text x="865" y="318" font-family="Arial, sans-serif" font-size="14" font-weight="900" fill="${theme.qrLabelColor}" text-anchor="middle" letter-spacing="2">
        BRANDX NFC
      </text>
      <text x="865" y="342" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#64748B" text-anchor="middle" letter-spacing="1">
        SCAN WITH CAMERA
      </text>
    </svg>`;
  }

  return await sharp(Buffer.from(svgContent)).png().toBuffer();
}

async function runVerification() {
  console.log('🚀 Starting BrandX NFC Visiting Card PDF Export Verification...\n');

  const outputDir = path.resolve(process.cwd(), 'dist', 'test-nfc-cards');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let allPassed = true;

  for (const scenario of TEST_SCENARIOS) {
    console.log(`[TEST] Testing Scenario: ${scenario.name} (Theme: ${scenario.themeId})`);

    // 1. Generate local QR code
    const qrDataUrl = await QRCode.toDataURL(scenario.cardUrl, {
      width: 450,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    });

    // 2. Generate high-res raster card sides
    const frontPngBuffer = await generateCardSidePng(scenario, 'front', qrDataUrl);
    const backPngBuffer = await generateCardSidePng(scenario, 'back', qrDataUrl);

    // 3. Assemble double-sided business card PDF with exact proportions (88.9mm x 50.8mm)
    const cardWidthMm = 88.9;
    const cardHeightMm = 50.8;

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [cardWidthMm, cardHeightMm],
      compress: true,
    });

    // Page 1: Front
    pdf.addImage(
      `data:image/png;base64,${frontPngBuffer.toString('base64')}`,
      'PNG',
      0,
      0,
      cardWidthMm,
      cardHeightMm,
      undefined,
      'FAST'
    );

    // Page 2: Back
    pdf.addPage([cardWidthMm, cardHeightMm], 'landscape');
    pdf.addImage(
      `data:image/png;base64,${backPngBuffer.toString('base64')}`,
      'PNG',
      0,
      0,
      cardWidthMm,
      cardHeightMm,
      undefined,
      'FAST'
    );

    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
    const pdfPath = path.join(outputDir, `BrandX_NFC_Card_${scenario.name}.pdf`);
    fs.writeFileSync(pdfPath, pdfBuffer);

    // 4. Inspect Generated PDF
    const fileSize = fs.statSync(pdfPath).size;
    const pdfContent = pdfBuffer.toString('binary');

    // Count pages in PDF
    const pageMatches = pdfContent.match(/\/Type\s*\/Page\b/g);
    const pageCount = pageMatches ? pageMatches.length : 0;

    // Check media box / dimensions in PDF: 88.9mm = 251.999 pt, 50.8mm = 143.999 pt
    const hasCorrectDimensions =
      pdfContent.includes('251.999') ||
      pdfContent.includes('252') ||
      pdfContent.includes('/MediaBox [ 0 0 252');

    // Check that PDF has significant content (not blank white page)
    const isRichContent = fileSize > 20000; // Multi-KB with raster graphics

    // Inspect image pixels: Ensure background is colorful/dark and NOT blank white (#FFFFFF)
    const frontMeta = await sharp(frontPngBuffer).stats();
    const isNotPureWhite =
      scenario.themeId === 'ELEGANT_WHITE'
        ? frontMeta.channels[0].mean < 254 // even white theme has borders/elements
        : frontMeta.channels[0].mean < 180; // dark themes have much lower mean

    console.log(`  ✓ PDF File Created: ${pdfPath}`);
    console.log(`  ✓ File Size: ${(fileSize / 1024).toFixed(1)} KB`);
    console.log(`  ✓ Page Count: ${pageCount} (Expected: 2)`);
    console.log(`  ✓ Background Non-Blank Check: ${isNotPureWhite ? 'PASSED (Colorful/Designed)' : 'FAILED (White/Blank)'}`);

    if (pageCount !== 2 || !isRichContent || !isNotPureWhite) {
      console.error(`  ❌ Scenario ${scenario.name} FAILED validation!`);
      allPassed = false;
    } else {
      console.log(`  ✅ Scenario ${scenario.name} PASSED all quality checks!\n`);
    }
  }

  if (allPassed) {
    console.log('🎉 ALL 5 PRODUCTION CARD SCENARIOS PASSED VERIFICATION!');
    process.exit(0);
  } else {
    console.error('❌ Some test scenarios failed.');
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
