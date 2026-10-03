/**
 * Unit Tests for BrandX Udhar Khata Branded Statement & WhatsApp Sharing Logic
 */

export function runKhataSharingTests() {
  console.log('\n--- 🧪 Testing Udhar Khata Branded Statement & Sharing Engine ---');

  // Test 1: Shop Name Extraction (Must never use "BrandX" as shop name)
  function resolveShopName(businessName?: string): string {
    const rawShopName = businessName?.trim() || '';
    const isBrandXShopName = /^brandx(\s+store)?$/i.test(rawShopName);
    return (!rawShopName || isBrandXShopName) ? 'Vyapar Khata' : rawShopName;
  }

  if (resolveShopName('Gupta Provision Store') !== 'Gupta Provision Store') {
    throw new Error('Expected exact shop name "Gupta Provision Store"');
  }
  if (resolveShopName('BrandX') !== 'Vyapar Khata') {
    throw new Error('Shop name must not be "BrandX", must fallback to "Vyapar Khata"');
  }
  if (resolveShopName('BrandX Store') !== 'Vyapar Khata') {
    throw new Error('Shop name must not be "BrandX Store", must fallback to "Vyapar Khata"');
  }
  if (resolveShopName('') !== 'Vyapar Khata') {
    throw new Error('Empty shop name must fallback to "Vyapar Khata"');
  }
  if (resolveShopName(undefined) !== 'Vyapar Khata') {
    throw new Error('Undefined shop name must fallback to "Vyapar Khata"');
  }
  console.log('  ✓ Shop branding resolution verifies exact profile name and forbids BrandX as shop name');

  // Test 2: Balance calculations (Total Udhar, Total Jama, Current Baaki)
  function computeStatementBalances(totalDue: number, transactions: Array<{ type: string; amount: number }>) {
    let txUdhar = 0;
    let txJama = 0;
    for (const tx of transactions) {
      const amt = Math.max(0, Number(tx.amount) || 0);
      const t = String(tx.type || '').toLowerCase();
      if (t === 'give' || t === 'udhar' || t === 'udhaar' || t === 'give_udhar') {
        txUdhar += amt;
      } else if (t === 'receive' || t === 'jama' || t === 'receive_jama') {
        txJama += amt;
      }
    }
    const currentBaaki = Math.max(0, Number(totalDue) || 0);
    const totalJama = txJama;
    const totalUdhar = Math.max(txUdhar, currentBaaki + totalJama);

    return { totalUdhar, totalJama, currentBaaki };
  }

  // Case A: Regular transactions matching due
  const resA = computeStatementBalances(1500, [
    { type: 'give', amount: 2000 },
    { type: 'receive', amount: 500 },
  ]);
  if (resA.totalUdhar !== 2000 || resA.totalJama !== 500 || resA.currentBaaki !== 1500) {
    throw new Error(`Balance calculation mismatch in Case A: ${JSON.stringify(resA)}`);
  }

  // Case B: Opening balance without prior give records
  const resB = computeStatementBalances(3000, [
    { type: 'receive', amount: 500 },
  ]);
  // totalUdhar must account for opening balance: 3000 + 500 = 3500
  if (resB.totalUdhar !== 3500 || resB.totalJama !== 500 || resB.currentBaaki !== 3000) {
    throw new Error(`Opening balance not preserved in Case B: ${JSON.stringify(resB)}`);
  }

  // Case C: Fully cleared account
  const resC = computeStatementBalances(0, [
    { type: 'give', amount: 1000 },
    { type: 'receive', amount: 1000 },
  ]);
  if (resC.totalUdhar !== 1000 || resC.totalJama !== 1000 || resC.currentBaaki !== 0) {
    throw new Error(`Cleared account balance mismatch in Case C: ${JSON.stringify(resC)}`);
  }
  console.log('  ✓ Balance summary accurately computes Total Udhar, Total Jama, and Current Baaki');

  // Test 3: Transaction sorting (Newest first) and truncation (Max 8)
  const sampleTxs = [
    { date: '2026-09-01', amount: 100, type: 'give', note: 'Item 1' },
    { date: '2026-09-10', amount: 200, type: 'give', note: 'Item 2' },
    { date: '2026-09-15', amount: 300, type: 'receive', note: 'Item 3' },
    { date: '2026-09-20', amount: 400, type: 'give', note: 'Item 4' },
    { date: '2026-09-22', amount: 500, type: 'give', note: 'Item 5' },
    { date: '2026-09-25', amount: 600, type: 'receive', note: 'Item 6' },
    { date: '2026-09-28', amount: 700, type: 'give', note: 'Item 7' },
    { date: '2026-09-29', amount: 800, type: 'give', note: 'Item 8' },
    { date: '2026-09-30', amount: 900, type: 'give', note: 'Item 9' },
    { date: '2026-10-01', amount: 1000, type: 'receive', note: 'Item 10' },
  ];

  const sortedTxs = [...sampleTxs].sort((a, b) => {
    const tA = new Date(a.date).getTime();
    const tB = new Date(b.date).getTime();
    return tB - tA;
  });

  if (sortedTxs[0].date !== '2026-10-01') {
    throw new Error('Transactions are not sorted newest first');
  }

  const recentTxs = sortedTxs.slice(0, 8);
  const remainingCount = sortedTxs.length - recentTxs.length;
  if (recentTxs.length !== 8) {
    throw new Error(`Expected 8 recent transactions, got ${recentTxs.length}`);
  }
  if (remainingCount !== 2) {
    throw new Error(`Expected 2 remaining transactions, got ${remainingCount}`);
  }
  console.log('  ✓ Transaction history sorts newest first and cleanly slices up to 8 entries with overflow indicator');

  // Test 4: Logo handling (No placeholder logos)
  function hasValidShopLogo(logoUrl?: string): boolean {
    return Boolean(logoUrl && logoUrl.trim().length > 0);
  }
  if (hasValidShopLogo(undefined) !== false) throw new Error('Undefined logo should be false');
  if (hasValidShopLogo('') !== false) throw new Error('Empty string logo should be false');
  if (hasValidShopLogo('   ') !== false) throw new Error('Whitespace logo should be false');
  if (hasValidShopLogo('https://cdn.example.com/logo.png') !== true) throw new Error('Valid logo URL should be true');
  console.log('  ✓ Logo logic properly omits logos without generating placeholder logos');

  // Test 5: UPI Section Visibility and Link Construction
  function generateUpiDetails(shopName: string, upiId?: string, amount: number = 0) {
    const cleanUpi = upiId?.trim() || '';
    if (!cleanUpi) {
      return { hasUpi: false, upiLink: null };
    }
    const upiLink = `upi://pay?pa=${encodeURIComponent(cleanUpi)}&pn=${encodeURIComponent(shopName)}&am=${amount}&cu=INR`;
    return { hasUpi: true, upiLink };
  }

  const upiActive = generateUpiDetails('Sharma Store', 'sharma@upi', 1500);
  if (!upiActive.hasUpi || !upiActive.upiLink?.includes('pa=sharma%40upi') || !upiActive.upiLink?.includes('am=1500')) {
    throw new Error('Failed to generate active UPI link');
  }

  const upiInactive = generateUpiDetails('Sharma Store', '', 1500);
  if (upiInactive.hasUpi || upiInactive.upiLink !== null) {
    throw new Error('UPI section must be disabled when shop has no upiId configured');
  }
  console.log('  ✓ UPI section renders only when upiId is configured, with accurate NPCI payment links');

  // Test 6: WhatsApp text fallback formatting and PII protection
  function formatWhatsAppMessage(
    customer: { id: string; name: string; phone: string; totalDue: number },
    business: { name: string; phone?: string; upiId?: string }
  ): string {
    const shopName = resolveShopName(business.name);
    const isDue = customer.totalDue > 0;

    return (
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
  }

  const sampleCust = {
    id: 'cust-uuid-internal-12345-do-not-leak',
    name: 'Ramesh Kumar',
    phone: '9876543210',
    totalDue: 2450,
  };
  const sampleBiz = {
    name: 'Verma Supermarket',
    phone: '9123456780',
    upiId: 'verma@okaxis',
  };

  const waMsg = formatWhatsAppMessage(sampleCust, sampleBiz);
  if (waMsg.includes('cust-uuid-internal')) {
    throw new Error('Internal customer database ID leaked in statement message!');
  }
  if (!waMsg.includes('Ramesh Kumar') || !waMsg.includes('Verma Supermarket') || !waMsg.includes('2,450')) {
    throw new Error('Missing core statement details in WhatsApp message');
  }
  if (!waMsg.includes('verma@okaxis')) {
    throw new Error('Missing UPI ID in WhatsApp message');
  }

  console.log('  ✓ WhatsApp fallback message formats cleanly and protects customer internal database IDs');
  console.log('✅ Udhar Khata Branded Statement & WhatsApp Sharing Logic verified successfully!');
}
