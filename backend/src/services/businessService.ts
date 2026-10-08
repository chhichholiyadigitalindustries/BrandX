import { businessRepository } from '../repositories/businessRepository.js';
import { prisma } from '../config/database.js';

export class BusinessService {
  async getBusiness(businessId: string, userId: string) {
    const biz = await businessRepository.findById(businessId);
    if (!biz || biz.ownerId !== userId) {
      throw new Error('Business profile not found or access denied');
    }
    return biz;
  }

  async listUserBusinesses(userId: string) {
    return businessRepository.findByOwnerId(userId);
  }

  async createBusiness(userId: string, data: any) {
    const normalizedName = data.name || data.businessName;
    const normalizedLogo = data.logoUrl || data.logo || null;
    const normalizedGstin = data.gstin || data.GSTIN || null;
    const normalizedPan = data.pan || data.PAN || null;
    const rawUpi = data.upiId !== undefined ? data.upiId : data.upi;
    const normalizedUpi = typeof rawUpi === 'string' && rawUpi.trim() ? rawUpi.trim().toLowerCase() : null;

    return businessRepository.create({
      owner: { connect: { id: userId } },
      name: normalizedName,
      ownerName: data.ownerName,
      businessType: data.businessType || 'Retail',
      category: data.category || 'Retail & Kirana',
      mobile: data.mobile,
      email: data.email || null,
      address: data.address,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      gstin: normalizedGstin,
      pan: normalizedPan,
      tagline: data.tagline || null,
      logoUrl: normalizedLogo,
      upiId: normalizedUpi,
      upiLinked: Boolean(normalizedUpi),
      bankName: data.bankName || null,
      accountNumber: data.accountNumber || null,
      ifscCode: data.ifscCode || null,
      accountHolderName: data.accountHolderName || null,
      invoicePrefix: data.invoicePrefix || 'INV',
      nextInvoiceNumber: data.nextInvoiceNumber || 1,
      invoiceTerms: data.invoiceTerms || null,
      signatureUrl: data.signatureUrl || null,
      instagram: data.instagram || null,
      settings: {
        create: {
          autoShareWhatsapp: true,
          showGstOnBill: Boolean(normalizedGstin),
          defaultGstRate: 18.0,
        },
      },
    });
  }

  async updateBusiness(businessId: string, userId: string, data: any) {
    const existing = await businessRepository.findById(businessId);
    if (!existing || existing.ownerId !== userId) {
      throw new Error('Business not found or access denied');
    }

    const updatePayload: any = {};

    if (data.name !== undefined || data.businessName !== undefined) {
      updatePayload.name = data.name || data.businessName;
    }
    if (data.ownerName !== undefined) updatePayload.ownerName = data.ownerName;
    if (data.businessType !== undefined) updatePayload.businessType = data.businessType;
    if (data.category !== undefined) updatePayload.category = data.category;
    if (data.mobile !== undefined) updatePayload.mobile = data.mobile;
    if (data.email !== undefined) updatePayload.email = data.email || null;
    if (data.address !== undefined) updatePayload.address = data.address;
    if (data.city !== undefined) updatePayload.city = data.city;
    if (data.state !== undefined) updatePayload.state = data.state;
    if (data.pincode !== undefined) updatePayload.pincode = data.pincode;

    if (data.gstin !== undefined || data.GSTIN !== undefined) {
      updatePayload.gstin = data.gstin || data.GSTIN || null;
    }
    if (data.pan !== undefined || data.PAN !== undefined) {
      updatePayload.pan = data.pan || data.PAN || null;
    }
    if (data.tagline !== undefined) updatePayload.tagline = data.tagline || null;
    if (data.logoUrl !== undefined || data.logo !== undefined) {
      updatePayload.logoUrl = data.logoUrl || data.logo || null;
    }
    if (data.upiId !== undefined || data.upi !== undefined) {
      const rawUpi = data.upiId !== undefined ? data.upiId : data.upi;
      const upi = typeof rawUpi === 'string' && rawUpi.trim() ? rawUpi.trim().toLowerCase() : null;
      updatePayload.upiId = upi;
      updatePayload.upiLinked = Boolean(upi);
    }
    if (data.bankName !== undefined) updatePayload.bankName = data.bankName || null;
    if (data.accountNumber !== undefined) updatePayload.accountNumber = data.accountNumber || null;
    if (data.ifscCode !== undefined) updatePayload.ifscCode = data.ifscCode || null;
    if (data.accountHolderName !== undefined) updatePayload.accountHolderName = data.accountHolderName || null;

    if (data.invoicePrefix !== undefined) updatePayload.invoicePrefix = data.invoicePrefix;
    if (data.nextInvoiceNumber !== undefined) updatePayload.nextInvoiceNumber = data.nextInvoiceNumber;
    if (data.invoiceTerms !== undefined) updatePayload.invoiceTerms = data.invoiceTerms || null;
    if (data.signatureUrl !== undefined) updatePayload.signatureUrl = data.signatureUrl || null;
    if (data.instagram !== undefined) updatePayload.instagram = data.instagram || null;

    const updated = await businessRepository.update(businessId, updatePayload);
    if (updatePayload.upiId !== undefined) {
      await prisma.digitalStore.updateMany({
        where: { businessId },
        data: { upiId: updatePayload.upiId },
      }).catch(() => {});
    }
    return updated;
  }

  async updateSettings(businessId: string, userId: string, data: any) {
    const existing = await businessRepository.findById(businessId);
    if (!existing || existing.ownerId !== userId) {
      throw new Error('Business not found or access denied');
    }

    return businessRepository.updateSettings(businessId, data);
  }

  async deleteBusiness(businessId: string, userId: string) {
    const existing = await businessRepository.findById(businessId);
    if (!existing || existing.ownerId !== userId) {
      throw new Error('Business not found or access denied');
    }

    return businessRepository.delete(businessId);
  }
}

export const businessService = new BusinessService();
