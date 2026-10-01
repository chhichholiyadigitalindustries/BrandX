import { DocumentType, InvoiceStatus, PaymentMethod } from '@prisma/client';

export interface CalculatedInvoiceItem {
  productId?: string | null;
  productNameSnapshot: string;
  name: string;
  itemCodeSnapshot?: string | null;
  code?: string | null;
  hsnSacSnapshot?: string | null;
  type: 'GOODS' | 'SERVICE';
  quantity: number;
  qty: number;
  unit: string;
  rate: number;
  mrp?: number | null;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  discountAmount: number;
  discount: number;
  taxableValue: number;
  taxableAmount: number;
  gstRate: number;
  gstPercent: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  totalAmount: number;
}

export interface CalculatedInvoiceTotals {
  subtotal: number;
  totalDiscount: number;
  discountAmount: number;
  taxableAmount: number;
  totalCGST: number;
  cgstAmount: number;
  totalSGST: number;
  sgstAmount: number;
  totalIGST: number;
  igstAmount: number;
  totalCess: number;
  cessAmount: number;
  roundOff: number;
  grandTotal: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  amountInWords: string;
}

export interface RawInvoiceItemInput {
  productId?: string | null;
  name?: string;
  productNameSnapshot?: string;
  itemCode?: string | null;
  code?: string | null;
  itemCodeSnapshot?: string | null;
  hsnSac?: string | null;
  hsnCode?: string | null;
  hsnSacSnapshot?: string | null;
  type?: 'GOODS' | 'SERVICE';
  quantity?: number;
  qty?: number;
  unit?: string;
  rate?: number;
  mrp?: number | null;
  discountType?: 'PERCENT' | 'FIXED';
  discountValue?: number;
  discountAmount?: number;
  discount?: number;
  gstRate?: number;
  gstPercent?: number;
  cessRate?: number;
}
