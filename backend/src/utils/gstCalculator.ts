import { CalculatedInvoiceItem, CalculatedInvoiceTotals, RawInvoiceItemInput } from '../types/invoice.js';

export function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function isStateEqual(stateA?: string | null, stateB?: string | null): boolean {
  if (!stateA || !stateB) return true;
  const a = stateA.trim().toLowerCase();
  const b = stateB.trim().toLowerCase();
  if (a === b) return true;

  // Common Indian State aliases
  const stateAliases: Record<string, string[]> = {
    delhi: ['dl', 'nct of delhi', '07'],
    maharashtra: ['mh', '27'],
    gujarat: ['gj', '24'],
    karnataka: ['ka', '29'],
    'tamil nadu': ['tn', '33'],
    'uttar pradesh': ['up', '09'],
    rajasthan: ['rj', '08'],
    'madhya pradesh': ['mp', '23'],
    'west bengal': ['wb', '19'],
    haryana: ['hr', '06'],
    punjab: ['pb', '03'],
    bihar: ['br', '10'],
    telangana: ['ts', 'tg', '36'],
    'andhra pradesh': ['ap', '37'],
    kerala: ['kl', '32'],
    odisha: ['or', 'od', '21'],
    jharkhand: ['jh', '20'],
    chhattisgarh: ['cg', 'ct', '22'],
    uttarakhand: ['uk', 'ua', '05'],
    'himachal pradesh': ['hp', '02'],
    assam: ['as', '18'],
    goa: ['ga', '30'],
  };

  for (const [canonical, aliases] of Object.entries(stateAliases)) {
    const set = new Set([canonical, ...aliases]);
    if (set.has(a) && set.has(b)) return true;
  }

  return false;
}

export function calculateInvoice(
  items: RawInvoiceItemInput[],
  options: {
    sellerState?: string;
    buyerState?: string;
    placeOfSupply?: string;
    discountPercent?: number;
    cessPercent?: number;
    isGstBill?: boolean;
    amountPaid?: number;
  }
): {
  calculatedItems: CalculatedInvoiceItem[];
  totals: CalculatedInvoiceTotals;
} {
  const supplyPlace = options.placeOfSupply || options.buyerState || options.sellerState;
  const isInterState = !isStateEqual(options.sellerState, supplyPlace);
  const isGstEnabled = options.isGstBill !== false;

  let totalGross = 0;
  let totalItemDiscount = 0;
  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalCess = 0;

  const calculatedItems: CalculatedInvoiceItem[] = items.map((item, index) => {
    const qty = Math.max(0, Number(item.quantity ?? item.qty ?? 1) || 1);
    const rate = Math.max(0, Number(item.rate) || 0);
    const mrp = item.mrp !== undefined && item.mrp !== null ? Number(item.mrp) : null;
    const name = item.productNameSnapshot || item.name || `Item ${index + 1}`;
    const code = item.hsnSacSnapshot || item.hsnSac || item.hsnCode || item.itemCodeSnapshot || item.itemCode || item.code || null;
    const unit = item.unit || 'PCS';
    const type = item.type || 'GOODS';

    const grossAmount = round2(qty * rate);

    // Item-level discount
    const discountType = item.discountType === 'FIXED' ? 'FIXED' : 'PERCENT';
    const discountValue = Math.max(0, Number(item.discountValue ?? item.discountAmount ?? item.discount ?? 0));
    let discountAmount = 0;

    if (discountType === 'FIXED') {
      discountAmount = Math.min(grossAmount, round2(discountValue));
    } else {
      const pct = Math.min(100, discountValue);
      discountAmount = round2((grossAmount * pct) / 100);
    }

    const taxableValue = Math.max(0, round2(grossAmount - discountAmount));
    const gstRate = isGstEnabled ? Math.max(0, Number(item.gstRate ?? item.gstPercent ?? 18)) : 0;
    const cessRate = isGstEnabled ? Math.max(0, Number(item.cessRate ?? 0)) : 0;

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (gstRate > 0 && taxableValue > 0) {
      if (isInterState) {
        igstAmount = round2((taxableValue * gstRate) / 100);
      } else {
        const halfRate = gstRate / 2;
        cgstAmount = round2((taxableValue * halfRate) / 100);
        sgstAmount = round2((taxableValue * halfRate) / 100);
      }
    }

    const itemCessAmount = cessRate > 0 ? round2((taxableValue * cessRate) / 100) : 0;
    const itemTotal = round2(taxableValue + cgstAmount + sgstAmount + igstAmount + itemCessAmount);

    totalGross += grossAmount;
    totalItemDiscount += discountAmount;
    totalTaxable += taxableValue;
    totalCgst += cgstAmount;
    totalSgst += sgstAmount;
    totalIgst += igstAmount;
    totalCess += itemCessAmount;

    return {
      productId: item.productId || null,
      productNameSnapshot: name,
      name,
      itemCodeSnapshot: item.itemCodeSnapshot || item.itemCode || null,
      code,
      hsnSacSnapshot: item.hsnSacSnapshot || item.hsnSac || item.hsnCode || null,
      type,
      quantity: qty,
      qty,
      unit,
      rate,
      mrp,
      discountType,
      discountValue,
      discountAmount,
      discount: discountAmount,
      taxableValue,
      taxableAmount: taxableValue,
      gstRate,
      gstPercent: gstRate,
      cgstAmount,
      sgstAmount,
      igstAmount,
      cessAmount: itemCessAmount,
      totalAmount: itemTotal,
    };
  });

  // Invoice-level discount scaling if applied
  const invoiceDiscountPercent = Math.max(0, Math.min(100, Number(options.discountPercent) || 0));
  let finalTaxable = totalTaxable;
  let overallDiscountAmount = totalItemDiscount;

  if (invoiceDiscountPercent > 0 && totalTaxable > 0) {
    const additionalDiscount = round2((totalTaxable * invoiceDiscountPercent) / 100);
    overallDiscountAmount = round2(totalItemDiscount + additionalDiscount);
    finalTaxable = Math.max(0, round2(totalTaxable - additionalDiscount));

    const scaleFactor = totalTaxable > 0 ? finalTaxable / totalTaxable : 1;
    totalCgst = round2(totalCgst * scaleFactor);
    totalSgst = round2(totalSgst * scaleFactor);
    totalIgst = round2(totalIgst * scaleFactor);
    totalCess = round2(totalCess * scaleFactor);
  }

  // Round-off calculation to nearest whole Rupee
  const rawTotal = round2(finalTaxable + totalCgst + totalSgst + totalIgst + totalCess);
  const grandTotal = Math.max(0, Math.round(rawTotal));
  const roundOff = round2(grandTotal - rawTotal);

  // Amount Paid & Due calculation
  const amountPaidParam = options.amountPaid !== undefined && options.amountPaid !== null ? Number(options.amountPaid) : grandTotal;
  const amountPaid = Math.max(0, round2(amountPaidParam));
  const amountDue = Math.max(0, round2(grandTotal - amountPaid));

  return {
    calculatedItems,
    totals: {
      subtotal: round2(totalGross),
      totalDiscount: round2(overallDiscountAmount),
      discountAmount: round2(overallDiscountAmount),
      taxableAmount: round2(finalTaxable),
      totalCGST: round2(totalCgst),
      cgstAmount: round2(totalCgst),
      totalSGST: round2(totalSgst),
      sgstAmount: round2(totalSgst),
      totalIGST: round2(totalIgst),
      igstAmount: round2(totalIgst),
      totalCess: round2(totalCess),
      cessAmount: round2(totalCess),
      roundOff,
      grandTotal,
      totalAmount: grandTotal,
      amountPaid,
      amountDue,
      amountInWords: numberToIndianWords(grandTotal),
    },
  };
}

export function numberToIndianWords(num: number): string {
  if (num === 0) return 'Rupees Zero Only';

  const a = [
    '',
    'One ',
    'Two ',
    'Three ',
    'Four ',
    'Five ',
    'Six ',
    'Seven ',
    'Eight ',
    'Nine ',
    'Ten ',
    'Eleven ',
    'Twelve ',
    'Thirteen ',
    'Fourteen ',
    'Fifteen ',
    'Sixteen ',
    'Seventeen ',
    'Eighteen ',
    'Nineteen ',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    let str = '';
    if (n > 19) {
      str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
    } else {
      str += a[n];
    }
    return str;
  };

  let n = Math.floor(Math.abs(num));
  let output = '';

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = Math.floor(n / 100);
  n %= 100;

  if (crore > 0) output += inWords(crore) + 'Crore ';
  if (lakh > 0) output += inWords(lakh) + 'Lakh ';
  if (thousand > 0) output += inWords(thousand) + 'Thousand ';
  if (hundred > 0) output += inWords(hundred) + 'Hundred ';
  if (n > 0) {
    if (output !== '') output += 'and ';
    output += inWords(n);
  }

  return `Rupees ${output.trim()} Only`;
}
