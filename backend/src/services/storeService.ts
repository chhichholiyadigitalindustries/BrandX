import { storeRepository } from '../repositories/storeRepository.js';
import { businessRepository } from '../repositories/businessRepository.js';
import { productRepository } from '../repositories/productRepository.js';
import { generateUniqueSlug, isValidSlug } from '../utils/slugGenerator.js';

export class StoreService {
  /**
   * Retrieves or auto-initializes the primary Digital Dukaan for an authenticated business.
   */
  async getStoreByBusinessId(businessId: string) {
    let store = await storeRepository.findByBusinessId(businessId);
    if (!store) {
      const biz = await businessRepository.findById(businessId);
      if (!biz) throw new Error('Business profile not found');

      // Generate a collision-safe slug from shop name
      const slug = await generateUniqueSlug(biz.name, (s) => storeRepository.isSlugTaken(s));

      store = (await storeRepository.upsert(businessId, {
        slug,
        title: biz.name,
        tagline: biz.tagline || 'Apni Digital Dukaan',
        description: `Welcome to our official digital store! Explore our products and services.`,
        phone: biz.mobile,
        whatsappNumber: biz.mobile,
        whatsapp: biz.mobile,
        email: biz.email || null,
        address: biz.address,
        city: biz.city,
        state: biz.state,
        pincode: biz.pincode,
        upiId: biz.upiId || null,
        instagram: biz.instagram || null,
        theme: 'emerald',
        isPublished: true,
      })) as any;

      store = await storeRepository.findByBusinessId(businessId);
    }
    return store;
  }

  /**
   * Retrieves store by ID with multi-tenant ownership check.
   */
  async getStoreById(id: string, businessId: string) {
    const store = await storeRepository.findById(id);
    if (!store || store.businessId !== businessId) {
      throw new Error('Digital Store not found or unauthorized');
    }
    return store;
  }

  /**
   * Retrieves public published Digital Dukaan storefront by slug.
   */
  async getPublicStoreBySlug(slug: string) {
    const store = await storeRepository.findBySlug(slug);
    if (!store || !store.isPublished) {
      throw new Error('Digital Dukaan not found or is currently unpublished');
    }

    // Increment view count asynchronously
    storeRepository.incrementViews(slug).catch(() => {});

    // Format public-safe response
    return {
      id: store.id,
      slug: store.slug,
      title: store.title,
      tagline: store.tagline,
      description: store.description,
      logoUrl: store.logoUrl || store.business?.logoUrl || null,
      coverImageUrl: store.coverImageUrl,
      phone: store.phone,
      whatsappNumber: store.whatsappNumber || store.whatsapp,
      email: store.email,
      address: store.address,
      city: store.city,
      state: store.state,
      pincode: store.pincode,
      mapUrl: store.mapUrl,
      websiteUrl: store.websiteUrl || store.website,
      upiId: store.upiId || store.business?.upiId || null,
      businessHours: store.businessHours,
      googleReviewUrl: store.googleReviewUrl,
      socialLinks: store.socialLinks,
      theme: store.theme,
      viewsCount: store.viewsCount,
      business: {
        name: store.business?.name,
        city: store.business?.city,
        state: store.business?.state,
        category: store.business?.category,
      },
      items: (store.items || []).map((item: any) => ({
        id: item.id,
        productId: item.productId,
        name: item.displayName || item.name,
        price: item.displayPrice ?? (item.product?.sellingPrice != null ? Number(item.product.sellingPrice) : item.price),
        originalPrice: item.originalPrice ?? (item.product?.mrp != null ? Number(item.product.mrp) : null),
        description: item.description,
        imageUrl: item.imageUrl || item.product?.imageUrl || null,
        category: item.category,
        isAvailable: item.isAvailable && (item.product ? item.product.currentStock > 0 && item.product.isActive : true),
        currentStock: item.product?.currentStock ?? null,
        unit: item.product?.unit || 'PCS',
        sortOrder: item.sortOrder,
      })),
    };
  }

  /**
   * Updates an existing Digital Dukaan with multi-tenant verification.
   */
  async updateStore(businessId: string, data: any) {
    const existing = await this.getStoreByBusinessId(businessId);

    // If slug is being updated, validate uniqueness
    if (existing && data.slug && data.slug !== existing.slug) {
      if (!isValidSlug(data.slug)) {
        throw new Error('Invalid slug. Use 2-60 lowercase alphanumeric characters and hyphens.');
      }
      const isTaken = await storeRepository.isSlugTaken(data.slug, existing.id);
      if (isTaken) {
        throw new Error(`The slug "${data.slug}" is already taken. Please choose another.`);
      }
    }

    return storeRepository.upsert(businessId, data);
  }

  /**
   * Publishes or unpublishes the Digital Dukaan.
   */
  async setPublishStatus(id: string, businessId: string, isPublished: boolean) {
    await this.getStoreById(id, businessId);
    return storeRepository.updatePublishStatus(id, isPublished);
  }

  /**
   * Adds an item to the Digital Dukaan showcase.
   */
  async addStoreItem(businessId: string, data: any) {
    const store = await this.getStoreByBusinessId(businessId);
    if (!store) throw new Error('Digital Store not found');

    // If linking to a Product Master item, verify ownership
    let productSnap: any = null;
    if (data.productId) {
      productSnap = await productRepository.findById(data.productId, businessId);
      if (!productSnap || productSnap.businessId !== businessId) {
        throw new Error('Product not found in your catalog');
      }
    }

    return storeRepository.addItem({
      store: { connect: { id: store.id } },
      name: data.name || productSnap?.name || 'Store Item',
      displayName: data.displayName || null,
      price: data.price ?? (productSnap ? Number(productSnap.sellingPrice) : 0),
      displayPrice: data.displayPrice ?? null,
      originalPrice: data.originalPrice ?? (productSnap?.mrp ? Number(productSnap.mrp) : null),
      description: data.description || productSnap?.description || null,
      imageUrl: data.imageUrl || productSnap?.imageUrl || null,
      category: data.category || (productSnap as any)?.productCategory?.name || 'General',
      isAvailable: data.isAvailable !== false,
      isVisible: data.isVisible !== false,
      sortOrder: data.sortOrder ?? 0,
      product: data.productId ? { connect: { id: data.productId } } : undefined,
    });
  }

  /**
   * Updates an existing showcase item.
   */
  async updateStoreItem(businessId: string, itemId: string, data: any) {
    const item = await storeRepository.findItemById(itemId);
    if (!item) throw new Error('Store item not found');

    const store = await this.getStoreByBusinessId(businessId);
    if (!store || item.storeId !== store.id) {
      throw new Error('Unauthorized item update');
    }

    return storeRepository.updateItem(itemId, {
      name: data.name,
      displayName: data.displayName,
      price: data.price,
      displayPrice: data.displayPrice,
      originalPrice: data.originalPrice,
      description: data.description,
      imageUrl: data.imageUrl,
      category: data.category,
      isAvailable: data.isAvailable,
      isVisible: data.isVisible,
      sortOrder: data.sortOrder,
    });
  }

  /**
   * Removes an item from the Digital Dukaan showcase.
   * Note: Does NOT delete the master product from the catalog!
   */
  async deleteStoreItem(businessId: string, itemId: string) {
    const item = await storeRepository.findItemById(itemId);
    if (!item) throw new Error('Store item not found');

    const store = await this.getStoreByBusinessId(businessId);
    if (!store || item.storeId !== store.id) {
      throw new Error('Unauthorized item deletion');
    }

    return storeRepository.deleteItem(itemId);
  }

  /**
   * Reorders items within the Digital Dukaan showcase.
   */
  async reorderStoreItems(businessId: string, items: { id: string; sortOrder: number }[]) {
    const store = await this.getStoreByBusinessId(businessId);
    if (!store) throw new Error('Digital Store not found');
    await storeRepository.reorderItems(store.id, items);
    return { success: true, reordered: items.length };
  }
}

export const storeService = new StoreService();
