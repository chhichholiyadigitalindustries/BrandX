import { prisma } from '../config/database.js';
import { DigitalCard } from '@prisma/client';

export class CardRepository {
  async findByBusinessId(businessId: string): Promise<DigitalCard | null> {
    return prisma.digitalCard.findFirst({
      where: { businessId },
      include: {
        digitalStore: {
          select: {
            slug: true,
            title: true,
          },
        },
      },
    });
  }

  async findById(id: string): Promise<DigitalCard | null> {
    return prisma.digitalCard.findUnique({
      where: { id },
      include: {
        digitalStore: {
          select: {
            slug: true,
            title: true,
          },
        },
      },
    });
  }

  async findBySlug(slug: string): Promise<any | null> {
    return prisma.digitalCard.findUnique({
      where: { slug },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            address: true,
            category: true,
            mobile: true,
            upiId: true,
            logoUrl: true,
          },
        },
        digitalStore: {
          select: {
            slug: true,
            title: true,
            isPublished: true,
          },
        },
      },
    });
  }

  async isSlugTaken(slug: string, excludeCardId?: string): Promise<boolean> {
    const existing = await prisma.digitalCard.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) return false;
    if (excludeCardId && existing.id === excludeCardId) return false;
    return true;
  }

  async incrementViews(slug: string): Promise<void> {
    await prisma.digitalCard.update({
      where: { slug },
      data: { viewsCount: { increment: 1 } },
    });
  }

  async upsert(businessId: string, data: any): Promise<DigitalCard> {
    const existing = await this.findByBusinessId(businessId);

    const name = data.fullName || data.name || 'BrandX Merchant';
    const company = data.companyName || data.company || 'Business';
    const phone = data.phone || data.mobile || '';

    const payload: any = {
      name,
      fullName: data.fullName || name,
      designation: data.designation || 'Business Owner',
      company,
      companyName: data.companyName || company,
      mobile: phone,
      phone,
      email: data.email || null,
      whatsapp: data.whatsapp || phone || null,
      website: data.website || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      pincode: data.pincode || null,
      profileImageUrl: data.profileImageUrl || null,
      logoUrl: data.logoUrl || null,
      bio: data.bio || null,
      upiId: data.upiId || null,
      socialLinks: data.socialLinks || null,
      theme: data.theme || 'executive',
      isPublished: data.isPublished !== undefined ? Boolean(data.isPublished) : true,
    };

    if (data.digitalStoreId) {
      payload.digitalStoreId = data.digitalStoreId;
    }

    if (data.slug) {
      payload.slug = data.slug;
    }

    if (existing) {
      return prisma.digitalCard.update({
        where: { id: existing.id },
        data: payload,
      });
    }

    return prisma.digitalCard.create({
      data: {
        ...payload,
        slug: data.slug,
        business: { connect: { id: businessId } },
      },
    });
  }

  async updatePublishStatus(id: string, isPublished: boolean, businessId?: string): Promise<DigitalCard> {
    if (businessId) {
      const existing = await prisma.digitalCard.findFirst({ where: { id, businessId } });
      if (!existing) {
        throw new Error('Digital Card not found or unauthorized business access');
      }
    }
    return prisma.digitalCard.update({
      where: { id },
      data: { isPublished },
    });
  }
}

export const cardRepository = new CardRepository();
