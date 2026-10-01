import { prisma } from '../config/database.js';
import { DigitalStore, DigitalStoreItem, Prisma } from '@prisma/client';

export type StoreWithItems = DigitalStore & {
  items: (DigitalStoreItem & {
    product?: {
      id: string;
      name: string;
      sellingPrice: Prisma.Decimal;
      mrp: Prisma.Decimal | null;
      currentStock: number;
      unit: string;
      hsnSac: string | null;
      imageUrl: string | null;
      isActive: boolean;
    } | null;
  })[];
};

export class StoreRepository {
  async findByBusinessId(businessId: string): Promise<StoreWithItems | null> {
    return prisma.digitalStore.findUnique({
      where: { businessId },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sellingPrice: true,
                mrp: true,
                currentStock: true,
                unit: true,
                hsnSac: true,
                imageUrl: true,
                isActive: true,
              },
            },
          },
        },
      },
    });
  }

  async findById(id: string): Promise<StoreWithItems | null> {
    return prisma.digitalStore.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sellingPrice: true,
                mrp: true,
                currentStock: true,
                unit: true,
                hsnSac: true,
                imageUrl: true,
                isActive: true,
              },
            },
          },
        },
      },
    });
  }

  async findBySlug(slug: string): Promise<any | null> {
    return prisma.digitalStore.findUnique({
      where: { slug },
      include: {
        items: {
          where: {
            isVisible: true,
            isAvailable: true,
          },
          orderBy: { sortOrder: 'asc' },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sellingPrice: true,
                mrp: true,
                currentStock: true,
                unit: true,
                imageUrl: true,
                isActive: true,
              },
            },
          },
        },
        business: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            address: true,
            category: true,
            mobile: true,
            email: true,
            upiId: true,
            logoUrl: true,
          },
        },
      },
    });
  }

  async isSlugTaken(slug: string, excludeStoreId?: string): Promise<boolean> {
    const existing = await prisma.digitalStore.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) return false;
    if (excludeStoreId && existing.id === excludeStoreId) return false;
    return true;
  }

  async upsert(businessId: string, data: any): Promise<DigitalStore> {
    const payload: any = {
      title: data.title,
      tagline: data.tagline,
      description: data.description,
      logoUrl: data.logoUrl,
      coverImageUrl: data.coverImageUrl,
      phone: data.phone,
      whatsappNumber: data.whatsappNumber || data.whatsapp,
      whatsapp: data.whatsapp || data.whatsappNumber,
      email: data.email,
      address: data.address,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      mapUrl: data.mapUrl,
      websiteUrl: data.websiteUrl || data.website,
      website: data.website || data.websiteUrl,
      upiId: data.upiId,
      businessHours: data.businessHours,
      googleReviewUrl: data.googleReviewUrl,
      instagram: data.instagram,
      socialLinks: data.socialLinks,
      theme: data.theme || 'emerald',
      isPublished: data.isPublished !== undefined ? Boolean(data.isPublished) : true,
    };

    if (data.slug) {
      payload.slug = data.slug;
    }

    return prisma.digitalStore.upsert({
      where: { businessId },
      update: payload,
      create: {
        ...payload,
        slug: data.slug,
        business: { connect: { id: businessId } },
      },
    });
  }

  async updatePublishStatus(id: string, isPublished: boolean): Promise<DigitalStore> {
    return prisma.digitalStore.update({
      where: { id },
      data: { isPublished },
    });
  }

  async incrementViews(slug: string): Promise<void> {
    await prisma.digitalStore.update({
      where: { slug },
      data: { viewsCount: { increment: 1 } },
    });
  }

  async addItem(data: Prisma.DigitalStoreItemCreateInput): Promise<DigitalStoreItem> {
    return prisma.digitalStoreItem.create({ data });
  }

  async findItemById(id: string): Promise<DigitalStoreItem | null> {
    return prisma.digitalStoreItem.findUnique({ where: { id } });
  }

  async updateItem(id: string, data: Prisma.DigitalStoreItemUpdateInput): Promise<DigitalStoreItem> {
    return prisma.digitalStoreItem.update({
      where: { id },
      data,
    });
  }

  async deleteItem(id: string): Promise<DigitalStoreItem> {
    return prisma.digitalStoreItem.delete({ where: { id } });
  }

  async reorderItems(storeId: string, items: { id: string; sortOrder: number }[]): Promise<void> {
    await prisma.$transaction(
      items.map((item) =>
        prisma.digitalStoreItem.updateMany({
          where: {
            id: item.id,
            storeId,
          },
          data: {
            sortOrder: item.sortOrder,
          },
        })
      )
    );
  }
}

export const storeRepository = new StoreRepository();
