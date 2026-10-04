import React from 'react';
import { getNfcCardTheme, NfcThemeConfig } from '../utils/nfcCardTheme';

export interface NfcCardExportData {
  companyName: string;
  category?: string;
  fullName: string;
  designation?: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  logoUrl?: string | null;
  profileImageUrl?: string | null;
  bio?: string;
  upiId?: string;
  slug?: string;
  theme?: string;
  qrDataUrl: string; // Pre-generated high-res local QR data URL
  logoDataUrl?: string | null; // Pre-loaded safe data URL or fallback
}

interface NfcCardPdfTemplateProps {
  cardData: NfcCardExportData;
}

export const NfcCardPdfTemplate: React.FC<NfcCardPdfTemplateProps> = ({ cardData }) => {
  const theme: NfcThemeConfig = getNfcCardTheme(cardData.theme);

  const displayCompanyName = cardData.companyName || 'Your Business Name';
  const displayCategory = cardData.category || 'Business & Services';
  const displayName = cardData.fullName || displayCompanyName;
  const displayDesignation = cardData.designation || 'Owner / Vyapari';
  const displayPhone = cardData.phone ? `+91 ${cardData.phone.replace(/^\+?91/, '').trim()}` : '';
  const displayAddress = [cardData.address, cardData.city, cardData.state]
    .filter(Boolean)
    .join(', ');
  const displayLogo = cardData.logoDataUrl || cardData.logoUrl || cardData.profileImageUrl;

  // Extract single initial for luxury fallback avatar
  const initialLetter = (displayCompanyName.charAt(0) || 'B').toUpperCase();

  return (
    <div
      style={{
        position: 'absolute',
        left: '-9999px',
        top: '-9999px',
        width: '1050px',
        display: 'flex',
        flexDirection: 'column',
        gap: '40px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ========================================================================= */}
      {/* CARD FRONT SIDE (1050px x 600px - Aspect Ratio 1.75:1)                    */}
      {/* ========================================================================= */}
      <div
        id="nfc-card-export-front"
        style={{
          width: '1050px',
          height: '600px',
          boxSizing: 'border-box',
          position: 'relative',
          borderRadius: '32px',
          background: theme.frontGradient,
          backgroundColor: theme.frontFallbackBg,
          border: `3px solid ${theme.borderColor}`,
          padding: '48px 52px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Subtle decorative background watermarks */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            right: '-80px',
            width: '320px',
            height: '320px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            left: '250px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${theme.accentColor}10 0%, rgba(0,0,0,0) 70%)`,
            pointerEvents: 'none',
          }}
        />

        {/* TOP HEADER: Business Name & Category + Logo */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', zIndex: 2 }}>
          <div style={{ maxWidth: '75%' }}>
            <h1
              style={{
                margin: 0,
                fontSize: '34px',
                fontWeight: 900,
                letterSpacing: '-0.5px',
                color: theme.textPrimary,
                lineHeight: 1.2,
                wordBreak: 'break-word',
              }}
            >
              {displayCompanyName}
            </h1>
            <div
              style={{
                marginTop: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 14px',
                borderRadius: '999px',
                backgroundColor: theme.badgeBg,
                border: `1px solid ${theme.borderColor}`,
              }}
            >
              <span
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: theme.textSecondary,
                  letterSpacing: '0.3px',
                }}
              >
                {displayCategory}
              </span>
            </div>
          </div>

          {/* Logo or Branded Monogram Badge */}
          <div
            style={{
              width: '90px',
              height: '90px',
              borderRadius: '24px',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              border: '2px solid rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)',
              flexShrink: 0,
            }}
          >
            {displayLogo ? (
              <img
                src={displayLogo}
                alt="Logo"
                crossOrigin="anonymous"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span
                style={{
                  fontSize: '40px',
                  fontWeight: 900,
                  color: theme.textPrimary,
                  textShadow: '0 2px 10px rgba(0,0,0,0.4)',
                }}
              >
                {initialLetter}
              </span>
            )}
          </div>
        </div>

        {/* MIDDLE SECTION: EMV Smart Chip + Contact Details */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '40px', zIndex: 2 }}>
          {/* Smart EMV Chip Visual */}
          <div
            style={{
              width: '64px',
              height: '48px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #F6D365 0%, #FDA085 100%)',
              border: '1.5px solid #F59E0B',
              boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.6), 0 4px 8px rgba(0,0,0,0.3)',
              position: 'relative',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {/* Chip Grid Lines */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                right: 0,
                height: '1px',
                background: 'rgba(180, 83, 9, 0.7)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: '35%',
                top: 0,
                bottom: 0,
                width: '1px',
                background: 'rgba(180, 83, 9, 0.7)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: '35%',
                top: 0,
                bottom: 0,
                width: '1px',
                background: 'rgba(180, 83, 9, 0.7)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '25%',
                bottom: '25%',
                left: '25%',
                right: '25%',
                border: '1px solid rgba(180, 83, 9, 0.7)',
                borderRadius: '3px',
              }}
            />
          </div>

          {/* Person & Contact Information */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
            <div style={{ fontSize: '27px', fontWeight: 800, color: theme.textPrimary, lineHeight: 1.1 }}>
              {displayName}
            </div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: theme.accentColor, marginBottom: '6px' }}>
              {displayDesignation}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 28px', marginTop: '2px' }}>
              {/* Phone */}
              {displayPhone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.accentColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <span style={{ fontSize: '16px', fontWeight: 600, color: theme.textPrimary, letterSpacing: '0.3px' }}>
                    {displayPhone}
                  </span>
                </div>
              )}

              {/* Email */}
              {cardData.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.accentColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <span style={{ fontSize: '15px', fontWeight: 500, color: theme.textSecondary }}>
                    {cardData.email}
                  </span>
                </div>
              )}

              {/* Address */}
              {displayAddress && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F43F5E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span style={{ fontSize: '15px', fontWeight: 500, color: theme.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {displayAddress}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM FOOTER: NFC Branding & Tap to Connect */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: `1px solid ${theme.borderColor}`,
            paddingTop: '16px',
            zIndex: 2,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Contactless waves SVG */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={theme.accentColor} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 16.5a7 7 0 0 1 0-9" />
              <path d="M10.5 18a10.5 10.5 0 0 1 0-12" />
              <path d="M14 19.5a14 14 0 0 1 0-15" />
              <path d="M17.5 21a17.5 17.5 0 0 1 0-18" />
            </svg>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 800,
                letterSpacing: '1.2px',
                color: theme.accentColor,
                textTransform: 'uppercase',
              }}
            >
              SMART NFC BUSINESS CARD
            </span>
          </div>

          <div
            style={{
              fontSize: '12px',
              fontFamily: 'monospace',
              letterSpacing: '1px',
              color: theme.textMuted,
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            TAP TO CONNECT 📡
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CARD BACK SIDE (1050px x 600px - Aspect Ratio 1.75:1)                     */}
      {/* ========================================================================= */}
      <div
        id="nfc-card-export-back"
        style={{
          width: '1050px',
          height: '600px',
          boxSizing: 'border-box',
          position: 'relative',
          borderRadius: '32px',
          background: theme.backGradient,
          backgroundColor: theme.backFallbackBg,
          border: `3px solid ${theme.borderColor}`,
          padding: '48px 52px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Subtle decorative background watermarks */}
        <div
          style={{
            position: 'absolute',
            bottom: '-120px',
            right: '-120px',
            width: '380px',
            height: '380px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* LEFT COLUMN: Explanatory Content */}
        <div style={{ maxWidth: '58%', display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 2 }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                backgroundColor: theme.badgeBg,
                border: `1px solid ${theme.borderColor}`,
                fontSize: '13px',
                fontWeight: 800,
                color: theme.accentColor,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
              }}
            >
              SCAN TO SAVE CONTACT
            </span>
          </div>

          {/* Heading */}
          <h2
            style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: 800,
              color: theme.textPrimary,
              lineHeight: 1.25,
            }}
          >
            Save {displayName} directly into your phone
          </h2>

          {/* Subtitle */}
          <p
            style={{
              margin: 0,
              fontSize: '15px',
              lineHeight: 1.5,
              color: theme.textSecondary,
            }}
          >
            Point your smartphone camera at the QR code to instantly download contact (.vcf), open WhatsApp, view Google Maps location, and browse our official Digital Dukaan.
          </p>

          {/* Feature list pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
            {['Direct Phonebook Save', 'WhatsApp Chat', 'Digital Dukaan', 'Instant Tap & Pay'].map((feat) => (
              <span
                key={feat}
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  color: theme.textSecondary,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                ✓ {feat}
              </span>
            ))}
          </div>

          {/* Bottom NFC Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginTop: '12px',
              color: theme.textMuted,
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.5px',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.accentColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 16.5a7 7 0 0 1 0-9" />
              <path d="M10.5 18a10.5 10.5 0 0 1 0-12" />
              <path d="M14 19.5a14 14 0 0 1 0-15" />
              <path d="M17.5 21a17.5 17.5 0 0 1 0-18" />
            </svg>
            <span>POWERED BY BRANDX DIGITAL VYAPARI PLATFORM</span>
          </div>
        </div>

        {/* RIGHT COLUMN: High-Resolution Scannable QR Code */}
        <div
          style={{
            backgroundColor: theme.qrContainerBg,
            padding: '20px',
            borderRadius: '28px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: `3px solid ${theme.qrBorderColor}`,
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
            zIndex: 2,
            width: '240px',
            boxSizing: 'border-box',
          }}
        >
          <img
            src={cardData.qrDataUrl}
            alt="NFC Contact QR"
            style={{
              width: '190px',
              height: '190px',
              display: 'block',
              imageRendering: 'crisp-edges',
            }}
          />
          <div
            style={{
              marginTop: '10px',
              fontSize: '12px',
              fontWeight: 900,
              letterSpacing: '2px',
              color: theme.qrLabelColor,
              textTransform: 'uppercase',
              textAlign: 'center',
            }}
          >
            BRANDX NFC
          </div>
          <div
            style={{
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '1px',
              color: '#64748B',
              textTransform: 'uppercase',
              marginTop: '2px',
            }}
          >
            SCAN WITH CAMERA
          </div>
        </div>
      </div>
    </div>
  );
};
