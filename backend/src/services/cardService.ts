import { cardRepository } from '../repositories/cardRepository.js';
import { businessRepository } from '../repositories/businessRepository.js';
import { storeRepository } from '../repositories/storeRepository.js';
import { generateUniqueSlug, isValidSlug } from '../utils/slugGenerator.js';
import { generateVCardString } from '../utils/vcardGenerator.js';

export class CardService {
  /**
   * Retrieves or auto-initializes the Digital Visiting Card for an authenticated business.
   */
  async getCardByBusinessId(businessId: string) {
    let card = await cardRepository.findByBusinessId(businessId);
    if (!card) {
      const biz = await businessRepository.findById(businessId);
      if (!biz) throw new Error('Business not found');

      // Check if store exists to link
      const store = await storeRepository.findByBusinessId(businessId);

      // Generate unique slug from owner name
      const slug = await generateUniqueSlug(biz.ownerName || biz.name, (s) => cardRepository.isSlugTaken(s));

      card = await cardRepository.upsert(businessId, {
        fullName: biz.ownerName || 'Vyapari Owner',
        name: biz.ownerName || 'Vyapari Owner',
        companyName: biz.name,
        company: biz.name,
        designation: 'Business Owner',
        phone: biz.mobile,
        mobile: biz.mobile,
        whatsapp: biz.mobile,
        email: biz.email || null,
        address: biz.address,
        city: biz.city,
        state: biz.state,
        pincode: biz.pincode,
        upiId: biz.upiId || null,
        logoUrl: biz.logoUrl || null,
        digitalStoreId: store?.id || null,
        slug,
        theme: 'executive',
        isPublished: true,
      });

      card = await cardRepository.findByBusinessId(businessId);
    }
    return card;
  }

  /**
   * Retrieves card by ID with ownership verification.
   */
  async getCardById(id: string, businessId: string) {
    const card = await cardRepository.findById(id);
    if (!card || card.businessId !== businessId) {
      throw new Error('Digital Visiting Card not found or unauthorized');
    }
    return card;
  }

  /**
   * Retrieves public published Digital Card by slug.
   */
  async getPublicCardBySlug(slug: string) {
    const card = await cardRepository.findBySlug(slug);
    if (!card || !card.isPublished) {
      throw new Error('Digital Visiting Card not found or is currently unpublished');
    }

    // Increment views asynchronously
    cardRepository.incrementViews(slug).catch(() => {});

    return {
      id: card.id,
      slug: card.slug,
      fullName: card.fullName || card.name,
      designation: card.designation,
      companyName: card.companyName || card.company,
      phone: card.phone || card.mobile,
      whatsapp: card.whatsapp,
      email: card.email,
      website: card.website,
      address: card.address,
      city: card.city,
      state: card.state,
      pincode: card.pincode,
      profileImageUrl: card.profileImageUrl,
      logoUrl: card.logoUrl || card.business?.logoUrl || null,
      bio: card.bio,
      upiId: card.upiId || card.business?.upiId || null,
      socialLinks: card.socialLinks,
      theme: card.theme,
      viewsCount: card.viewsCount,
      digitalStoreSlug: card.digitalStore?.slug || null,
      digitalStoreTitle: card.digitalStore?.title || null,
      business: {
        name: card.business?.name,
        city: card.business?.city,
        state: card.business?.state,
        category: card.business?.category,
      },
    };
  }

  /**
   * Updates an existing Digital Visiting Card.
   */
  async updateCard(businessId: string, data: any) {
    const existing = await this.getCardByBusinessId(businessId);

    // If slug is modified, validate uniqueness
    if (existing && data.slug && data.slug !== existing.slug) {
      if (!isValidSlug(data.slug)) {
        throw new Error('Invalid slug. Use 2-60 lowercase alphanumeric characters and hyphens.');
      }
      const isTaken = await cardRepository.isSlugTaken(data.slug, existing.id);
      if (isTaken) {
        throw new Error(`The slug "${data.slug}" is already taken. Please choose another.`);
      }
    }

    return cardRepository.upsert(businessId, data);
  }

  /**
   * Publishes or unpublishes the Digital Card.
   */
  async setPublishStatus(id: string, businessId: string, isPublished: boolean) {
    await this.getCardById(id, businessId);
    return cardRepository.updatePublishStatus(id, isPublished);
  }

  /**
   * Generates downloadable RFC 2426 vCard 3.0 content.
   */
  generateVCard(card: any, originUrl?: string): string {
    const cardUrl = originUrl && card.slug ? `${originUrl}/card/${card.slug}` : undefined;
    return generateVCardString({
      fullName: card.fullName || card.name,
      companyName: card.companyName || card.company,
      designation: card.designation,
      phone: card.phone || card.mobile,
      whatsapp: card.whatsapp,
      email: card.email,
      website: card.website || cardUrl,
      cardUrl,
      address: card.address,
      city: card.city,
      state: card.state,
      pincode: card.pincode,
      bio: card.bio,
      upiId: card.upiId,
    });
  }
}

export const cardService = new CardService();
