/**
 * BRANDX — Universal Business UPI QR & URI Utility
 * Single Source of Truth for generating standard NPCI UPI payment payloads
 * and machine-scannable QR Codes across all modules:
 * 1. UPI QR Standee
 * 2. Billing / GST Invoice / POS Receipt
 * 3. Udhar Khata (Customer payment collections)
 * 4. Digital Dukaan (Storefront checkout & payments)
 */
import QRCode from 'qrcode';

export interface BusinessUpiDetails {
  upiId?: string | null;
  name?: string | null;
  ownerName?: string | null;
}

export interface UpiPayloadOptions {
  amount?: number | null;
  note?: string | null;
}

export interface GenerateQrOptions extends UpiPayloadOptions {
  width?: number;
  margin?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  darkColor?: string;
  lightColor?: string;
}

/**
 * Standard Indian UPI Virtual Payment Address (VPA) Regex
 * Matches handles like: merchant@okhdfcbank, 9876543210@paytm, store-1@ybl
 */
export const UPI_ID_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9.\-_]{2,64}$/;

/**
 * Validates Indian UPI Virtual Payment Address (VPA) format
 */
export function validateUpiId(upiId: string | null | undefined): { isValid: boolean; error?: string } {
  if (!upiId || typeof upiId !== 'string') {
    return { isValid: false, error: 'UPI ID is required' };
  }
  const clean = upiId.trim().toLowerCase();
  if (!clean) {
    return { isValid: false, error: 'UPI ID cannot be blank' };
  }
  if (!clean.includes('@')) {
    return { isValid: false, error: 'UPI ID must contain "@" (e.g. shop@okhdfcbank or 9876543210@paytm)' };
  }
  if (!UPI_ID_REGEX.test(clean)) {
    return { isValid: false, error: 'Invalid UPI ID format (e.g. shop@okhdfcbank or 9876543210@paytm)' };
  }
  return { isValid: true };
}

/**
 * Formats UPI ID consistently (lowercase, trimmed)
 */
export function normalizeUpiId(upiId: string | null | undefined): string {
  if (!upiId || typeof upiId !== 'string') return '';
  return upiId.trim().toLowerCase();
}

/**
 * Builds an official NPCI standard UPI payment URI deep link.
 * Example: upi://pay?pa=REAL_UPI_ID&pn=REAL_BUSINESS_NAME&am=500.00&cu=INR&tn=Invoice+INV-1001
 * 
 * Strict specifications:
 * - pa = logged-in business owner's saved UPI ID (payee address)
 * - pn = business/shop name (payee name)
 * - am = amount (included when positive number, omitted for general open payment QR)
 * - cu = INR (Indian Rupees)
 * - tn = transaction note (optional)
 */
export function buildUpiPaymentUri(
  upiId: string,
  merchantName: string,
  amount?: number | null,
  note?: string | null
): string {
  const cleanUpi = normalizeUpiId(upiId);
  const cleanName = (merchantName || 'Merchant').trim();
  const encodedUpi = encodeURIComponent(cleanUpi);
  const encodedName = encodeURIComponent(cleanName);

  let uri = `upi://pay?pa=${encodedUpi}&pn=${encodedName}&cu=INR`;

  if (typeof amount === 'number' && amount > 0 && !isNaN(amount)) {
    const formattedAmt = amount % 1 === 0 ? amount.toFixed(2) : amount.toFixed(2);
    uri += `&am=${formattedAmt}`;
  }

  if (note && note.trim()) {
    uri += `&tn=${encodeURIComponent(note.trim())}`;
  }

  return uri;
}

/**
 * Generates high-contrast machine-scannable QR Data URL using bundled 'qrcode' library.
 * 100% client-side, offline-capable, zero network dependency or CORS issues.
 */
export async function generateUpiQrDataUrl(
  upiUri: string,
  options: GenerateQrOptions = {}
): Promise<string> {
  return QRCode.toDataURL(upiUri, {
    width: options.width || 300,
    margin: options.margin !== undefined ? options.margin : 2,
    errorCorrectionLevel: options.errorCorrectionLevel || 'M',
    color: {
      dark: options.darkColor || '#0F172A',
      light: options.lightColor || '#FFFFFF',
    },
  });
}

/**
 * Generates full business UPI payload and scannable QR data URL from business profile.
 * Fails safely if business does not have a valid UPI ID configured.
 */
export async function generateBusinessUpiQr(
  business: BusinessUpiDetails,
  options: GenerateQrOptions = {}
): Promise<{ success: true; uri: string; qrDataUrl: string; upiId: string } | { success: false; error: string }> {
  const upiId = normalizeUpiId(business.upiId);
  const validation = validateUpiId(upiId);
  if (!validation.isValid) {
    return {
      success: false,
      error: validation.error || 'Please add your UPI ID in Business Settings to generate your payment QR.',
    };
  }

  const merchantName = (business.name || business.ownerName || 'Merchant').trim();
  const uri = buildUpiPaymentUri(upiId, merchantName, options.amount, options.note);
  const qrDataUrl = await generateUpiQrDataUrl(uri, options);

  return {
    success: true,
    uri,
    qrDataUrl,
    upiId,
  };
}
