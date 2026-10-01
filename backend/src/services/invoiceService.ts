import { invoiceRepository } from '../repositories/invoiceRepository.js';
import { businessRepository } from '../repositories/businessRepository.js';
import { customerRepository } from '../repositories/customerRepository.js';
import { productRepository } from '../repositories/productRepository.js';
import { calculateInvoice, round2 } from '../utils/gstCalculator.js';
import { getDefaultPrefixForDocType, getFinancialYear } from '../utils/invoiceNumberGenerator.js';
import { computeKhataBalance } from '../utils/khataCalculator.js';
import { prisma } from '../config/database.js';
import { DocumentType, InvoiceStatus, InvoicePaymentStatus, PaymentMethod, Prisma } from '@prisma/client';

export class InvoiceService {
  /**
   * Serialize Prisma Decimal fields to clean numbers for JSON responses
   */
  public serializeInvoice(inv: any) {
    if (!inv) return null;
    return {
      ...inv,
      subtotal: inv.subtotal ? Number(inv.subtotal) : Number(inv.totalAmount || 0),
      totalDiscount: inv.totalDiscount ? Number(inv.totalDiscount) : Number(inv.discountAmount || 0),
      taxableAmount: Number(inv.taxableAmount || 0),
      totalCGST: inv.totalCGST ? Number(inv.totalCGST) : Number(inv.cgstAmount || 0),
      totalSGST: inv.totalSGST ? Number(inv.totalSGST) : Number(inv.sgstAmount || 0),
      totalIGST: inv.totalIGST ? Number(inv.totalIGST) : Number(inv.igstAmount || 0),
      totalCess: inv.totalCess ? Number(inv.totalCess) : Number(inv.cessAmount || 0),
      roundOff: Number(inv.roundOff || 0),
      grandTotal: inv.grandTotal ? Number(inv.grandTotal) : Number(inv.totalAmount || 0),
      totalAmount: inv.grandTotal ? Number(inv.grandTotal) : Number(inv.totalAmount || 0),
      amountPaid: Number(inv.amountPaid || 0),
      amountDue: Number(inv.amountDue || 0),
      items: inv.items
        ? inv.items.map((it: any) => ({
            ...it,
            rate: Number(it.rate || 0),
            mrp: it.mrp !== null && it.mrp !== undefined ? Number(it.mrp) : null,
            discountValue: Number(it.discountValue || 0),
            discountAmount: Number(it.discountAmount || it.discount || 0),
            discount: Number(it.discountAmount || it.discount || 0),
            taxableValue: Number(it.taxableValue || it.taxableAmount || 0),
            taxableAmount: Number(it.taxableValue || it.taxableAmount || 0),
            cgstAmount: Number(it.cgstAmount || 0),
            sgstAmount: Number(it.sgstAmount || 0),
            igstAmount: Number(it.igstAmount || 0),
            cessAmount: Number(it.cessAmount || 0),
            totalAmount: Number(it.totalAmount || 0),
            gstRate: it.gstRate !== undefined ? Number(it.gstRate) : Number(it.gstPercent || 18),
            gstPercent: it.gstRate !== undefined ? Number(it.gstRate) : Number(it.gstPercent || 18),
          }))
        : [],
      payments: inv.payments
        ? inv.payments.map((p: any) => ({
            ...p,
            amount: Number(p.amount || 0),
          }))
        : [],
    };
  }

  async listInvoices(
    businessId: string,
    params: {
      page: number;
      limit: number;
      search?: string;
      status?: string;
      documentType?: string;
      paymentStatus?: string;
      customerId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    const { invoices, total } = await invoiceRepository.list(businessId, params);
    return {
      invoices: invoices.map((inv) => this.serializeInvoice(inv)),
      total,
    };
  }

  async getInvoice(invoiceId: string, businessId: string) {
    const invoice = await invoiceRepository.findById(invoiceId, businessId);
    if (!invoice) throw new Error('Invoice not found');
    return this.serializeInvoice(invoice);
  }

  /**
   * Complete Invoice Creation with Server-authoritative Recalculation,
   * Concurrency-safe Numbering, Stock Deductions & Khata integration.
   */
  async createInvoice(businessId: string, userId: string, data: any) {
    // 1. Validate Business ownership
    const business = await businessRepository.findById(businessId);
    if (!business) throw new Error('Business profile not found');

    // 2. Validate Customer ownership if customerId provided
    let customer = null;
    if (data.customerId && data.customerId.trim()) {
      customer = await customerRepository.findById(data.customerId.trim(), businessId);
      if (!customer) {
        throw new Error('Customer not found or does not belong to your business');
      }
    }

    // 3. Validate and resolve product master items
    const rawItemsInput = [];
    for (const item of data.items || []) {
      if (item.productId && item.productId.trim()) {
        const prod = await productRepository.findById(item.productId.trim(), businessId);
        if (!prod) {
          throw new Error(`Product with ID ${item.productId} does not belong to this business`);
        }

        rawItemsInput.push({
          productId: prod.id,
          productNameSnapshot: prod.name,
          name: prod.name,
          itemCodeSnapshot: prod.itemCode || prod.sku || null,
          hsnSacSnapshot: prod.hsnSac || prod.hsnCode || null,
          type: (prod.type as any) || 'GOODS',
          quantity: item.quantity ?? item.qty ?? 1,
          unit: prod.unit || item.unit || 'PCS',
          rate: item.rate !== undefined && item.rate !== null ? Number(item.rate) : Number(prod.sellingPrice),
          mrp: prod.mrp ? Number(prod.mrp) : item.mrp ? Number(item.mrp) : null,
          discountType: item.discountType || 'PERCENT',
          discountValue: item.discountValue ?? item.discount ?? 0,
          gstRate: prod.gstRate ?? prod.gstPercent ?? item.gstRate ?? 18,
          cessRate: prod.cessRate ? Number(prod.cessRate) : item.cessRate ?? 0,
        });
      } else {
        // Custom one-off line item
        rawItemsInput.push({
          productId: null,
          productNameSnapshot: item.productNameSnapshot || item.name || 'Custom Item',
          name: item.productNameSnapshot || item.name || 'Custom Item',
          itemCodeSnapshot: item.itemCodeSnapshot || item.code || null,
          hsnSacSnapshot: item.hsnSacSnapshot || item.hsnSac || item.hsnCode || null,
          type: item.type || 'GOODS',
          quantity: item.quantity ?? item.qty ?? 1,
          unit: item.unit || 'PCS',
          rate: Number(item.rate) || 0,
          mrp: item.mrp ? Number(item.mrp) : null,
          discountType: item.discountType || 'PERCENT',
          discountValue: item.discountValue ?? item.discount ?? 0,
          gstRate: item.gstRate ?? item.gstPercent ?? (business.gstin ? 18 : 0),
          cessRate: item.cessRate ?? 0,
        });
      }
    }

    if (rawItemsInput.length === 0) {
      throw new Error('At least one invoice item is required');
    }

    // 4. Server-authoritative GST & Financial Recalculation
    const docType: DocumentType = (data.documentType as DocumentType) || 'GST_INVOICE';
    const isRetailOrEstimate = ['RETAIL_BILL', 'QUOTATION', 'ESTIMATE', 'ESTIMATE_QUOTATION'].includes(docType);
    const isGstBill = !isRetailOrEstimate && Boolean(business.gstin) && data.isGstBill !== false;
    const placeOfSupply = data.placeOfSupply?.trim() || customer?.address?.split(',').pop()?.trim() || business.state;

    const initialAmountPaid = data.amountPaid !== undefined && data.amountPaid !== null ? Number(data.amountPaid) : undefined;

    const { calculatedItems, totals } = calculateInvoice(rawItemsInput, {
      sellerState: business.state,
      buyerState: placeOfSupply,
      placeOfSupply,
      discountPercent: data.discountPercent || 0,
      isGstBill,
      amountPaid: initialAmountPaid,
    });

    const status: InvoiceStatus = (data.status as InvoiceStatus) || 'ISSUED';
    const isDraft = status === 'DRAFT';
    const shouldDeductStock = !isDraft && ['GST_INVOICE', 'RETAIL_BILL', 'DELIVERY_CHALLAN', 'TAX_INVOICE'].includes(docType);

    // Compute Payment Status
    let paymentStatus: InvoicePaymentStatus = 'UNPAID';
    if (totals.amountDue <= 0) {
      paymentStatus = 'PAID';
    } else if (totals.amountPaid > 0) {
      paymentStatus = 'PARTIALLY_PAID';
    }

    // 5. Execute Atomic Database Transaction
    const invoiceRecord = await prisma.$transaction(async (tx) => {
      // Step A: Sequence Numbering
      let invoiceNumber = '';
      if (isDraft) {
        invoiceNumber = `DFT-${Date.now().toString().slice(-6)}`;
      } else {
        const fy = getFinancialYear(data.invoiceDate ? new Date(data.invoiceDate) : new Date());
        const prefix = getDefaultPrefixForDocType(docType, business.invoicePrefix);
        const seqResult = await invoiceRepository.getNextInvoiceNumber(tx, businessId, docType, fy, prefix);
        invoiceNumber = seqResult.invoiceNumber;
      }

      // Step B: Stock Availability Check for trackable goods
      if (shouldDeductStock) {
        for (const it of calculatedItems) {
          if (it.productId) {
            const currentProd = await tx.product.findUnique({ where: { id: it.productId } });
            if (currentProd && currentProd.type === 'GOODS') {
              if (currentProd.currentStock < it.quantity) {
                throw new Error(
                  `Insufficient stock for "${currentProd.name}". Available: ${currentProd.currentStock} ${currentProd.unit}, Requested: ${it.quantity}`
                );
              }
            }
          }
        }
      }

      // Step C: Create Invoice
      const invoiceDate = data.invoiceDate ? new Date(data.invoiceDate) : (data.billDate ? new Date(data.billDate) : new Date());
      const dueDate = data.dueDate ? new Date(data.dueDate) : null;

      const newInv = await tx.invoice.create({
        data: {
          businessId,
          customerId: customer?.id || null,
          invoiceNumber,
          documentType: docType,
          status,
          invoiceDate,
          billDate: invoiceDate,
          dueDate,
          placeOfSupply,

          // Seller Snapshot (Strictly Authenticated Business Profile - Never BrandX Platform)
          sellerGSTIN: business.gstin || null,
          sellerGstin: business.gstin || null,
          sellerName: business.name,
          sellerAddress: `${business.address}, ${business.city}, ${business.state} - ${business.pincode}`,
          sellerPhone: business.mobile,
          sellerEmail: business.email || null,
          sellerUpi: business.upiId || null,
          upiIdSnapshot: business.upiId || null,
          bankDetailsSnapshot: business.accountNumber ? `${business.bankName || 'Bank'} A/C: ${business.accountNumber}, IFSC: ${business.ifscCode || ''}` : null,

          // Buyer Snapshot
          buyerName: data.buyerName || data.customerName || customer?.name || 'Cash Customer',
          buyerPhone: data.buyerPhone || data.customerPhone || customer?.mobile || null,
          buyerEmail: data.buyerEmail || customer?.email || null,
          buyerGSTIN: data.buyerGSTIN || data.buyerGstin || customer?.gstin || null,
          buyerGstin: data.buyerGSTIN || data.buyerGstin || customer?.gstin || null,
          buyerAddress: data.buyerAddress || customer?.address || null,
          reverseCharge: Boolean(data.reverseCharge),

          // Calculations (High precision Decimal)
          subtotal: new Prisma.Decimal(totals.subtotal.toFixed(2)),
          totalDiscount: new Prisma.Decimal(totals.totalDiscount.toFixed(2)),
          taxableAmount: new Prisma.Decimal(totals.taxableAmount.toFixed(2)),
          totalCGST: new Prisma.Decimal(totals.totalCGST.toFixed(2)),
          totalSGST: new Prisma.Decimal(totals.totalSGST.toFixed(2)),
          totalIGST: new Prisma.Decimal(totals.totalIGST.toFixed(2)),
          totalCess: new Prisma.Decimal(totals.totalCess.toFixed(2)),
          roundOff: new Prisma.Decimal(totals.roundOff.toFixed(2)),
          grandTotal: new Prisma.Decimal(totals.grandTotal.toFixed(2)),
          totalAmount: new Prisma.Decimal(totals.grandTotal.toFixed(2)),
          amountPaid: new Prisma.Decimal(totals.amountPaid.toFixed(2)),
          amountDue: new Prisma.Decimal(totals.amountDue.toFixed(2)),

          // Backward compatible floats
          discountAmount: totals.totalDiscount,
          cgstAmount: totals.totalCGST,
          sgstAmount: totals.totalSGST,
          igstAmount: totals.totalIGST,
          cessAmount: totals.totalCess,
          amountInWords: totals.amountInWords,
          isGstBill,
          discountCode: data.discountCode || null,
          discountPercent: data.discountPercent || 0,

          // Payment details
          paymentMethod: (data.paymentMethod as PaymentMethod) || 'UPI',
          paymentStatus,

          notes: data.notes || null,
          termsAndConditions: data.termsAndConditions || data.terms || business.invoiceTerms || 'Thank you for your business!',
          terms: data.termsAndConditions || data.terms || business.invoiceTerms || 'Thank you for your business!',
          includeSignature: data.includeSignature !== false,
          createdBy: userId,
          stockDeducted: shouldDeductStock,

          // Items creation
          items: {
            create: calculatedItems.map((it) => ({
              productId: it.productId || null,
              productNameSnapshot: it.productNameSnapshot,
              name: it.name,
              itemCodeSnapshot: it.itemCodeSnapshot || null,
              hsnSacSnapshot: it.hsnSacSnapshot || null,
              code: it.code || null,
              type: (it.type as any) || 'GOODS',
              quantity: it.quantity,
              qty: it.quantity,
              unit: it.unit,
              rate: new Prisma.Decimal(it.rate.toFixed(2)),
              mrp: it.mrp !== null && it.mrp !== undefined ? new Prisma.Decimal(it.mrp.toFixed(2)) : null,
              discountType: it.discountType,
              discountValue: new Prisma.Decimal(it.discountValue.toFixed(2)),
              discountAmount: new Prisma.Decimal(it.discountAmount.toFixed(2)),
              discount: it.discountAmount,
              taxableValue: new Prisma.Decimal(it.taxableValue.toFixed(2)),
              taxableAmount: new Prisma.Decimal(it.taxableAmount.toFixed(2)),
              gstRate: it.gstRate,
              gstPercent: it.gstPercent,
              cgstAmount: new Prisma.Decimal(it.cgstAmount.toFixed(2)),
              sgstAmount: new Prisma.Decimal(it.sgstAmount.toFixed(2)),
              igstAmount: new Prisma.Decimal(it.igstAmount.toFixed(2)),
              cessAmount: new Prisma.Decimal(it.cessAmount.toFixed(2)),
              totalAmount: new Prisma.Decimal(it.totalAmount.toFixed(2)),
            })),
          },
        },
        include: { items: true, payments: true },
      });

      // Step D: Create Initial Payment Record if amountPaid > 0
      if (!isDraft && totals.amountPaid > 0) {
        await tx.invoicePayment.create({
          data: {
            invoiceId: newInv.id,
            amount: new Prisma.Decimal(totals.amountPaid.toFixed(2)),
            paymentMethod: (data.paymentMethod as PaymentMethod) || 'UPI',
            referenceNumber: data.referenceNumber || null,
            transactionRef: data.referenceNumber || null,
            notes: 'Settled at invoice issuance',
            note: 'Settled at invoice issuance',
            paymentDate: new Date(),
          },
        });
      }

      // Step E: Stock Deductions & Inventory Transactions
      if (shouldDeductStock) {
        for (const it of calculatedItems) {
          if (it.productId) {
            const product = await tx.product.findUnique({ where: { id: it.productId } });
            if (product) {
              const previousStock = product.currentStock;
              const newStock = round2(previousStock - it.quantity);

              await tx.product.update({
                where: { id: it.productId },
                data: {
                  currentStock: newStock,
                  stockQty: Math.round(newStock),
                },
              });

              await tx.inventoryTransaction.create({
                data: {
                  businessId,
                  productId: it.productId,
                  type: 'SALE',
                  quantity: it.quantity,
                  previousStock,
                  newStock,
                  referenceType: 'INVOICE',
                  referenceId: newInv.id,
                  note: `Invoice sale #${invoiceNumber}`,
                },
              });
            }
          }
        }
      }

      // Step F: Digital Khata UDHAAR integration for credit sales / outstanding balances
      if (!isDraft && customer && totals.amountDue > 0) {
        const khataTx = await tx.khataTransaction.create({
          data: {
            businessId,
            customerId: customer.id,
            type: 'UDHAAR',
            amount: totals.amountDue,
            transactionDate: invoiceDate,
            billNumber: invoiceNumber,
            description: `Invoice #${invoiceNumber} Credit/Udhaar balance`,
            note: `Invoice #${invoiceNumber} Credit/Udhaar balance`,
            paymentMode: data.paymentMethod || 'CASH',
            createdById: userId,
          },
        });

        // Recalculate customer running balance
        const allCustomerTxs = await tx.khataTransaction.findMany({
          where: { customerId: customer.id, businessId },
          select: { type: true, amount: true },
        });

        const { currentBalance } = computeKhataBalance(customer.openingBalance, allCustomerTxs);

        await tx.customer.update({
          where: { id: customer.id },
          data: {
            currentBalance,
            balance: currentBalance,
          },
        });

        await tx.invoice.update({
          where: { id: newInv.id },
          data: { khataTxId: khataTx.id },
        });
      }

      // Step G: Audit Log
      await tx.auditLog.create({
        data: {
          action: 'INVOICE_CREATED',
          entity: 'Invoice',
          entityId: newInv.id,
          actorId: userId,
          metadata: {
            businessId,
            invoiceNumber,
            documentType: docType,
            grandTotal: totals.grandTotal,
            status,
          },
        },
      });

      return newInv;
    });

    return this.getInvoice(invoiceRecord.id, businessId);
  }

  /**
   * Finalize and issue a draft invoice
   */
  async issueInvoice(invoiceId: string, businessId: string, userId: string) {
    const invoice = await invoiceRepository.findById(invoiceId, businessId);
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status !== 'DRAFT') {
      throw new Error(`Only DRAFT invoices can be issued. Current status: ${invoice.status}`);
    }

    const business = await businessRepository.findById(businessId);
    if (!business) throw new Error('Business not found');

    const fy = getFinancialYear(new Date());
    const prefix = getDefaultPrefixForDocType(invoice.documentType, business.invoicePrefix);

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Assign sequential number
      const { invoiceNumber } = await invoiceRepository.getNextInvoiceNumber(
        tx,
        businessId,
        invoice.documentType,
        fy,
        prefix
      );

      const shouldDeductStock = ['GST_INVOICE', 'RETAIL_BILL', 'DELIVERY_CHALLAN', 'TAX_INVOICE'].includes(
        invoice.documentType
      );

      // 2. Stock deductions if applicable
      if (shouldDeductStock && !invoice.stockDeducted) {
        for (const it of invoice.items) {
          if (it.productId) {
            const product = await tx.product.findUnique({ where: { id: it.productId } });
            if (product && product.type === 'GOODS') {
              if (product.currentStock < it.quantity) {
                throw new Error(
                  `Insufficient stock for "${product.name}". Available: ${product.currentStock}, Requested: ${it.quantity}`
                );
              }
              const previousStock = product.currentStock;
              const newStock = round2(previousStock - it.quantity);

              await tx.product.update({
                where: { id: it.productId },
                data: {
                  currentStock: newStock,
                  stockQty: Math.round(newStock),
                },
              });

              await tx.inventoryTransaction.create({
                data: {
                  businessId,
                  productId: it.productId,
                  type: 'SALE',
                  quantity: it.quantity,
                  previousStock,
                  newStock,
                  referenceType: 'INVOICE',
                  referenceId: invoice.id,
                  note: `Invoice sale #${invoiceNumber}`,
                },
              });
            }
          }
        }
      }

      // 3. Khata UDHAAR if balance is due
      let khataTxId = invoice.khataTxId;
      const amountDue = Number(invoice.amountDue);
      if (invoice.customerId && amountDue > 0 && !khataTxId) {
        const customer = await tx.customer.findUnique({ where: { id: invoice.customerId } });
        if (customer) {
          const khataTx = await tx.khataTransaction.create({
            data: {
              businessId,
              customerId: customer.id,
              type: 'UDHAAR',
              amount: amountDue,
              transactionDate: new Date(),
              billNumber: invoiceNumber,
              description: `Issued Invoice #${invoiceNumber} Credit/Udhaar`,
              note: `Issued Invoice #${invoiceNumber} Credit/Udhaar`,
              paymentMode: invoice.paymentMethod,
              createdById: userId,
            },
          });
          khataTxId = khataTx.id;

          const allTxs = await tx.khataTransaction.findMany({
            where: { customerId: customer.id, businessId },
            select: { type: true, amount: true },
          });
          const { currentBalance } = computeKhataBalance(customer.openingBalance, allTxs);

          await tx.customer.update({
            where: { id: customer.id },
            data: { currentBalance, balance: currentBalance },
          });
        }
      }

      return tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'ISSUED',
          invoiceNumber,
          stockDeducted: shouldDeductStock,
          khataTxId,
        },
        include: { items: true, payments: true },
      });
    });

    return this.serializeInvoice(updated);
  }

  /**
   * Cancel an invoice safely, reversing stock and Khata entries
   */
  async cancelInvoice(invoiceId: string, businessId: string, userId: string, reason?: string) {
    const invoice = await invoiceRepository.findById(invoiceId, businessId);
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status === 'CANCELLED') {
      throw new Error('Invoice is already cancelled');
    }

    const cancelled = await prisma.$transaction(async (tx) => {
      // 1. Reverse stock deduction if stock was previously deducted
      if (invoice.stockDeducted) {
        for (const it of invoice.items) {
          if (it.productId) {
            const product = await tx.product.findUnique({ where: { id: it.productId } });
            if (product) {
              const previousStock = product.currentStock;
              const newStock = round2(previousStock + it.quantity);

              await tx.product.update({
                where: { id: it.productId },
                data: {
                  currentStock: newStock,
                  stockQty: Math.round(newStock),
                },
              });

              await tx.inventoryTransaction.create({
                data: {
                  businessId,
                  productId: it.productId,
                  type: 'RETURN_IN',
                  quantity: it.quantity,
                  previousStock,
                  newStock,
                  referenceType: 'INVOICE_CANCEL',
                  referenceId: invoice.id,
                  note: `Stock restored on invoice cancellation #${invoice.invoiceNumber}`,
                },
              });
            }
          }
        }
      }

      // 2. Reverse Khata UDHAAR if created
      if (invoice.customerId && invoice.khataTxId) {
        const customer = await tx.customer.findUnique({ where: { id: invoice.customerId } });
        if (customer) {
          await tx.khataTransaction.create({
            data: {
              businessId,
              customerId: customer.id,
              type: 'JAMA',
              amount: Number(invoice.amountDue),
              transactionDate: new Date(),
              billNumber: invoice.invoiceNumber,
              description: `Cancellation reversal for invoice #${invoice.invoiceNumber}`,
              note: `Cancellation reversal for invoice #${invoice.invoiceNumber}`,
              paymentMode: 'CASH',
              createdById: userId,
            },
          });

          const allTxs = await tx.khataTransaction.findMany({
            where: { customerId: customer.id, businessId },
            select: { type: true, amount: true },
          });
          const { currentBalance } = computeKhataBalance(customer.openingBalance, allTxs);

          await tx.customer.update({
            where: { id: customer.id },
            data: { currentBalance, balance: currentBalance },
          });
        }
      }

      // 3. Mark invoice cancelled
      return tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'CANCELLED',
          paymentStatus: 'CANCELLED',
          stockDeducted: false,
          notes: invoice.notes ? `${invoice.notes} | Cancelled: ${reason || 'Customer request'}` : `Cancelled: ${reason || 'Customer request'}`,
        },
        include: { items: true, payments: true },
      });
    });

    return this.serializeInvoice(cancelled);
  }

  /**
   * Record payment on invoice and sync with Digital Khata
   */
  async recordPayment(invoiceId: string, businessId: string, userId: string, data: any) {
    const invoice = await invoiceRepository.findById(invoiceId, businessId);
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status === 'CANCELLED') {
      throw new Error('Cannot record payment for a cancelled invoice');
    }

    const paymentAmount = round2(Number(data.amount));
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    const currentAmountDue = Number(invoice.amountDue);
    if (paymentAmount > currentAmountDue + 0.01) {
      throw new Error(`Payment amount (₹${paymentAmount}) cannot exceed outstanding amount (₹${currentAmountDue})`);
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create payment record
      const payment = await tx.invoicePayment.create({
        data: {
          invoiceId,
          amount: new Prisma.Decimal(paymentAmount.toFixed(2)),
          paymentMethod: (data.paymentMethod as PaymentMethod) || 'UPI',
          referenceNumber: data.referenceNumber || data.transactionRef || null,
          transactionRef: data.referenceNumber || data.transactionRef || null,
          notes: data.notes || data.note || null,
          note: data.notes || data.note || null,
          paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        },
      });

      // 2. Recalculate amountPaid and amountDue
      const allPayments = await tx.invoicePayment.findMany({
        where: { invoiceId },
        select: { amount: true },
      });

      const totalPaid = round2(allPayments.reduce((acc, p) => acc + Number(p.amount), 0));
      const grandTotal = Number(invoice.grandTotal);
      const newAmountDue = Math.max(0, round2(grandTotal - totalPaid));

      let newPaymentStatus: InvoicePaymentStatus = 'PARTIALLY_PAID';
      let newInvoiceStatus = invoice.status;

      if (newAmountDue === 0) {
        newPaymentStatus = 'PAID';
        if (newInvoiceStatus === 'ISSUED') newInvoiceStatus = 'PAID';
      } else if (totalPaid === 0) {
        newPaymentStatus = 'UNPAID';
      }

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: new Prisma.Decimal(totalPaid.toFixed(2)),
          amountDue: new Prisma.Decimal(newAmountDue.toFixed(2)),
          paymentStatus: newPaymentStatus,
          status: newInvoiceStatus,
        },
        include: { items: true, payments: true },
      });

      // 3. Khata JAMA entry if invoice is tied to customer
      if (invoice.customerId) {
        const customer = await tx.customer.findUnique({ where: { id: invoice.customerId } });
        if (customer) {
          await tx.khataTransaction.create({
            data: {
              businessId,
              customerId: customer.id,
              type: 'JAMA',
              amount: paymentAmount,
              transactionDate: new Date(),
              billNumber: invoice.invoiceNumber,
              description: `Payment received for Bill #${invoice.invoiceNumber}`,
              note: `Payment received for Bill #${invoice.invoiceNumber}`,
              paymentMode: data.paymentMethod || 'UPI',
              reference: data.referenceNumber || null,
              createdById: userId,
            },
          });

          const allTxs = await tx.khataTransaction.findMany({
            where: { customerId: customer.id, businessId },
            select: { type: true, amount: true },
          });
          const { currentBalance } = computeKhataBalance(customer.openingBalance, allTxs);

          await tx.customer.update({
            where: { id: customer.id },
            data: { currentBalance, balance: currentBalance },
          });
        }
      }

      return { payment, invoice: updatedInvoice };
    });

    return {
      payment: {
        ...result.payment,
        amount: Number(result.payment.amount),
      },
      invoice: this.serializeInvoice(result.invoice),
    };
  }

  /**
   * Financial and collection summary
   */
  async getInvoiceSummary(businessId: string) {
    const invoices = await prisma.invoice.findMany({
      where: { businessId },
      select: {
        status: true,
        documentType: true,
        paymentStatus: true,
        grandTotal: true,
        amountPaid: true,
        amountDue: true,
        totalCGST: true,
        totalSGST: true,
        totalIGST: true,
        totalCess: true,
      },
    });

    let totalBilled = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let totalTaxCollected = 0;

    const countByStatus: Record<string, number> = {};
    const countByDocType: Record<string, number> = {};

    for (const inv of invoices) {
      if (inv.status !== 'CANCELLED' && inv.status !== 'DRAFT') {
        totalBilled += Number(inv.grandTotal);
        totalCollected += Number(inv.amountPaid);
        totalOutstanding += Number(inv.amountDue);
        totalTaxCollected +=
          Number(inv.totalCGST) + Number(inv.totalSGST) + Number(inv.totalIGST) + Number(inv.totalCess);
      }

      countByStatus[inv.status] = (countByStatus[inv.status] || 0) + 1;
      countByDocType[inv.documentType] = (countByDocType[inv.documentType] || 0) + 1;
    }

    return {
      totalInvoices: invoices.length,
      totalBilled: round2(totalBilled),
      totalCollected: round2(totalCollected),
      totalOutstanding: round2(totalOutstanding),
      totalTaxCollected: round2(totalTaxCollected),
      countByStatus,
      countByDocType,
    };
  }
}

export const invoiceService = new InvoiceService();
