import { DocumentType } from '@prisma/client';

export function getFinancialYear(date: Date = new Date()): string {
  const month = date.getMonth(); // 0-indexed: 0 = Jan, 3 = April
  const year = date.getFullYear();

  if (month >= 3) {
    // April to December
    const nextYearShort = String((year + 1) % 100).padStart(2, '0');
    return `${year}-${nextYearShort}`;
  } else {
    // January to March
    const currentYearShort = String(year % 100).padStart(2, '0');
    return `${year - 1}-${currentYearShort}`;
  }
}

export function getDefaultPrefixForDocType(docType: DocumentType | string, customPrefix?: string | null): string {
  if (customPrefix && customPrefix.trim()) {
    return customPrefix.trim().toUpperCase();
  }

  switch (docType) {
    case 'RETAIL_BILL':
      return 'RET';
    case 'QUOTATION':
      return 'QUO';
    case 'ESTIMATE':
    case 'ESTIMATE_QUOTATION':
      return 'EST';
    case 'DELIVERY_CHALLAN':
      return 'DC';
    case 'PROFORMA_INVOICE':
      return 'PI';
    case 'GST_INVOICE':
    case 'TAX_INVOICE':
    default:
      return 'INV';
  }
}

export function formatInvoiceNumber(
  prefix: string,
  nextSeq: number,
  financialYear?: string,
  date: Date = new Date()
): string {
  const cleanPrefix = (prefix || 'INV').toUpperCase().trim();
  const fy = financialYear || getFinancialYear(date);
  const paddedSeq = String(nextSeq).padStart(4, '0');
  return `${cleanPrefix}/${fy}/${paddedSeq}`;
}
