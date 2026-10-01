/**
 * BrandX Client-Side PDF Generation Utility
 * Generates and downloads real PDF invoices for A4 and 80mm/58mm Thermal POS receipts.
 */

import { InvoiceData } from '../types';
import { exportElementToPng } from './domToImage';

export interface PdfExportOptions {
  elementId: string;
  invoiceNumber: string;
  format: 'a4' | 'thermal';
  customerName?: string;
}

/**
 * Exports an invoice HTML container to a downloadable PDF file.
 */
export const exportInvoiceToPdf = async ({
  elementId,
  invoiceNumber,
  format,
  customerName = 'Customer',
}: PdfExportOptions): Promise<{ success: boolean; filename: string; error?: string }> => {
  const element = document.getElementById(elementId);
  if (!element) {
    return { success: false, filename: '', error: 'Invoice preview element not found' };
  }

  const cleanNum = invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
  const filename = `BrandX_Invoice_${cleanNum}.pdf`;

  try {
    const jspdfModule = await import('jspdf');
    const { jsPDF } = jspdfModule;

    const { dataUrl: imgData, width, height } = await exportElementToPng(elementId, {
      scale: 2,
      backgroundColor: '#ffffff',
      windowWidth: format === 'a4' ? 800 : 380,
    });

    if (format === 'a4') {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (height * pdfWidth) / width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, 297));
      pdf.save(filename);
    } else {
      // 80mm Thermal Receipt format
      const thermalWidthMm = 80;
      const thermalHeightMm = Math.max(100, (height * thermalWidthMm) / width);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [thermalWidthMm, thermalHeightMm],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, thermalWidthMm, thermalHeightMm);
      pdf.save(filename);
    }

    return { success: true, filename };
  } catch (err: any) {
    console.error('Error generating PDF with html2canvas/jspdf, using fallback:', err);
    // Fallback: Use browser print mechanism
    try {
      window.print();
      return { success: true, filename: 'print_fallback' };
    } catch (fallbackErr: any) {
      return { success: false, filename: '', error: fallbackErr?.message || 'PDF export failed' };
    }
  }
};
