/**
 * BRANDX — vCard (RFC 2426 / Version 3.0) Generator Engine
 * Generates standard downloadable .vcf contact files for NFC cards and mobile address books.
 */

export interface VCardContactInput {
  fullName?: string;
  name?: string;
  companyName?: string;
  company?: string;
  designation?: string;
  phone?: string;
  mobile?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  cardUrl?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  bio?: string;
  upiId?: string;
}

/**
 * Escapes special characters for vCard values (RFC 2426).
 */
function escapeVCardValue(val: string): string {
  if (!val) return '';
  return val
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generates a full RFC 2426 compliant vCard 3.0 string.
 */
export function generateVCardString(contact: VCardContactInput): string {
  const displayName = (contact.fullName || contact.name || 'BrandX Contact').trim();
  const company = (contact.companyName || contact.company || '').trim();
  const title = (contact.designation || '').trim();
  const primaryPhone = (contact.phone || contact.mobile || '').trim();
  const email = (contact.email || '').trim();
  const website = (contact.website || contact.cardUrl || '').trim();
  const address = (contact.address || '').trim();
  const city = (contact.city || '').trim();
  const state = (contact.state || '').trim();
  const pincode = (contact.pincode || '').trim();

  const notes: string[] = [];
  if (contact.bio) notes.push(contact.bio.trim());
  if (contact.upiId) notes.push(`UPI ID: ${contact.upiId.trim()}`);
  if (contact.cardUrl) notes.push(`Digital Card: ${contact.cardUrl.trim()}`);

  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escapeVCardValue(displayName)}`,
    `N:${escapeVCardValue(displayName)};;;;`,
  ];

  if (company) {
    lines.push(`ORG:${escapeVCardValue(company)}`);
  }

  if (title) {
    lines.push(`TITLE:${escapeVCardValue(title)}`);
  }

  if (primaryPhone) {
    // Format phone with +91 if 10 digits
    const cleaned = primaryPhone.replace(/\D/g, '');
    const intlPhone = cleaned.length === 10 ? `+91${cleaned}` : `+${cleaned}`;
    lines.push(`TEL;TYPE=CELL,VOICE:${intlPhone}`);
  }

  if (contact.whatsapp && contact.whatsapp !== primaryPhone) {
    const cleanedWa = contact.whatsapp.replace(/\D/g, '');
    const waPhone = cleanedWa.length === 10 ? `+91${cleanedWa}` : `+${cleanedWa}`;
    lines.push(`TEL;TYPE=WORK,VOICE:${waPhone}`);
  }

  if (email) {
    lines.push(`EMAIL;TYPE=INTERNET,WORK:${escapeVCardValue(email)}`);
  }

  if (website) {
    lines.push(`URL:${escapeVCardValue(website)}`);
  }

  if (address || city || state || pincode) {
    // Format: PO Box; Extended Addr; Street; City; Region; Postal Code; Country
    lines.push(
      `ADR;TYPE=WORK:;;${escapeVCardValue(address)};${escapeVCardValue(city)};${escapeVCardValue(state)};${escapeVCardValue(pincode)};India`
    );
  }

  if (notes.length > 0) {
    lines.push(`NOTE:${escapeVCardValue(notes.join(' | '))}`);
  }

  lines.push(`REV:${new Date().toISOString()}`);
  lines.push('END:VCARD');

  return lines.join('\r\n');
}
