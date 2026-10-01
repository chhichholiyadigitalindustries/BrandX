import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

async function run() {
  const iconSvgPath = path.join(publicDir, 'icon.svg');
  const svgBuffer = fs.readFileSync(iconSvgPath);

  console.log('Generating standard icons...');
  // 192x192 standard icon
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // 512x512 standard icon
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // apple-touch-icon 180x180
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // Maskable icon: Needs 15% safe margin around core icon on a full bleed background
  console.log('Generating maskable icon...');
  const maskableSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <defs>
      <linearGradient id="bgGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1E1B4B" />
        <stop offset="50%" stop-color="#312E81" />
        <stop offset="100%" stop-color="#4338CA" />
      </linearGradient>
      <linearGradient id="goldGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FDE047" />
        <stop offset="50%" stop-color="#F59E0B" />
        <stop offset="100%" stop-color="#D97706" />
      </linearGradient>
      <linearGradient id="accentGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#60A5FA" />
        <stop offset="38BDF8" stop-color="#38BDF8" />
      </linearGradient>
    </defs>
    <!-- Full bleed solid background without rounded corners for maskable -->
    <rect width="512" height="512" fill="url(#bgGrad2)" />

    <!-- Scaled down to safe zone (80% diameter / 410px inner box) -->
    <g transform="translate(51, 51) scale(0.8)">
      <path d="M140 130 C140 130, 256 95, 256 95 C256 95, 372 130, 372 130 C372 265, 290 355, 256 385 C222 355, 140 265, 140 130 Z" 
            fill="#1E293B" stroke="url(#goldGrad2)" stroke-width="10" stroke-linejoin="round" />

      <path d="M205 175 L307 175" stroke="#FFFFFF" stroke-width="16" stroke-linecap="round" />
      <path d="M205 210 L285 210" stroke="#FFFFFF" stroke-width="16" stroke-linecap="round" />
      <path d="M205 175 L205 240 C205 270, 275 270, 275 240 C275 210, 205 210, 205 210" 
            stroke="#FFFFFF" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      <path d="M230 265 L295 335" stroke="url(#goldGrad2)" stroke-width="18" stroke-linecap="round" />

      <path d="M315 155 L355 155 L355 195" fill="none" stroke="url(#accentGrad2)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M285 225 L355 155" fill="none" stroke="url(#accentGrad2)" stroke-width="12" stroke-linecap="round" />

      <polygon points="360,120 364,132 376,136 364,140 360,152 356,140 344,136 356,132" fill="#FDE047" />

      <text x="256" y="440" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="48" fill="#FFFFFF" letter-spacing="3">BRANDX</text>
    </g>
  </svg>`;

  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // 1024x500 Google Play Store Feature Graphic
  console.log('Generating Play Store Feature Graphic...');
  const featureGraphicSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 500" width="1024" height="500">
    <defs>
      <linearGradient id="playGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0F172A" />
        <stop offset="50%" stop-color="#1E1B4B" />
        <stop offset="100%" stop-color="#312E81" />
      </linearGradient>
      <linearGradient id="goldText" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#FDE047" />
        <stop offset="100%" stop-color="#F59E0B" />
      </linearGradient>
    </defs>
    <rect width="1024" height="500" fill="url(#playGrad)" />
    
    <!-- Grid pattern -->
    <circle cx="900" cy="100" r="180" fill="#4338CA" fill-opacity="0.25" />
    <circle cx="150" cy="420" r="220" fill="#3B82F6" fill-opacity="0.15" />

    <!-- Left side Text -->
    <text x="80" y="150" font-family="sans-serif" font-weight="900" font-size="58" fill="#FFFFFF">BRANDX</text>
    <text x="80" y="210" font-family="sans-serif" font-weight="700" font-size="34" fill="url(#goldText)">Poster Maker &amp; GST Billing App</text>
    
    <text x="80" y="270" font-family="sans-serif" font-weight="500" font-size="22" fill="#E2E8F0">&#x2714; 5,000+ Festival &amp; Daily Offer Posters</text>
    <text x="80" y="315" font-family="sans-serif" font-weight="500" font-size="22" fill="#E2E8F0">&#x2714; 1-Tap GST Invoicing &amp; WhatsApp Bill Sharing</text>
    <text x="80" y="360" font-family="sans-serif" font-weight="500" font-size="22" fill="#E2E8F0">&#x2714; Acrylic UPI QR Standees with Shop Branding</text>
    <text x="80" y="405" font-family="sans-serif" font-weight="500" font-size="22" fill="#E2E8F0">&#x2714; Biz AI Copilot in Hindi &amp; Hinglish</text>

    <!-- Right side Badge card -->
    <rect x="700" y="80" width="240" height="340" rx="28" fill="#1E293B" stroke="#F59E0B" stroke-width="4" />
    <circle cx="820" cy="200" r="70" fill="#312E81" />
    <text x="820" y="215" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="50" fill="#FDE047">&#x20B9;</text>
    <text x="820" y="310" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="24" fill="#FFFFFF">100% SECURE</text>
    <text x="820" y="340" text-anchor="middle" font-family="sans-serif" font-weight="600" font-size="16" fill="#94A3B8">Made for Bharat</text>
    <rect x="740" y="370" width="160" height="34" rx="17" fill="#10B981" />
    <text x="820" y="393" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="14" fill="#FFFFFF">&#x2605; 4.9 Play Rating</text>
  </svg>`;

  await sharp(Buffer.from(featureGraphicSvg))
    .resize(1024, 500)
    .png()
    .toFile(path.join(publicDir, 'playstore-feature-graphic.png'));

  console.log('All PWA & Play Store icon assets generated successfully!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
