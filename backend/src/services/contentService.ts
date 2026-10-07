import { contentRepository } from '../repositories/contentRepository.js';
import { prisma } from '../config/database.js';
import { storageProvider } from '../integrations/storageProvider.js';
import { sanitizeSlug, generateUniqueSlug } from '../utils/slugGenerator.js';
import { getIndiaDateString, getIndiaDateRange } from '../utils/timezone.js';
import {
  DailyContent,
  Festival,
  ContentCategory,
  ContentAsset,
  ContentType,
  ContentEventType,
  ContentTier,
} from '@prisma/client';

export class ContentService {
  // ============================================================
  // USER-FACING APIs
  // ============================================================

  /**
   * Get today's daily content.
   * Returns null if no content exists for today (NO fake mock fallback).
   */
  async getTodayContent(params?: {
    dateStr?: string;
    language?: string;
    categoryId?: string;
    contentType?: string;
  }): Promise<DailyContent | null> {
    return contentRepository.getTodayContent(params);
  }

  /**
   * Get content by ID (published only for users)
   */
  async getPublishedContentById(id: string): Promise<DailyContent> {
    const content = await contentRepository.getPublishedContentById(id);
    if (!content) {
      throw new Error('Content not found or not published');
    }
    return content;
  }

  /**
   * Get content for specific calendar date
   */
  async getContentByDate(dateStr: string, language?: string): Promise<DailyContent[]> {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new Error('Invalid date format. Expected YYYY-MM-DD');
    }
    return contentRepository.getContentByDate(dateStr, language);
  }

  /**
   * List published daily content with filtering & pagination
   */
  async listPublishedDailyContent(params: {
    page?: number;
    limit?: number;
    date?: string;
    categoryId?: string;
    festivalId?: string;
    language?: string;
    contentType?: string;
    search?: string;
  }) {
    return contentRepository.listPublishedDailyContent(params);
  }

  /**
   * 365-Day Calendar Feed (Real database content only)
   */
  async getCalendarFeed(params?: {
    startDate?: string;
    endDate?: string;
    language?: string;
  }) {
    return contentRepository.get365DayCalendarFeed(params);
  }

  /**
   * Get festival by ID with its published assets
   */
  async getFestivalContent(festivalId: string) {
    const festival = await contentRepository.getFestivalById(festivalId, true);
    if (!festival) {
      throw new Error('Festival not found');
    }
    return festival;
  }

  /**
   * List all active festivals
   */
  async listFestivals(params?: { year?: number; language?: string }) {
    return contentRepository.listFestivals({ ...params, isActive: true });
  }

  /**
   * List active categories
   */
  async listCategories() {
    return contentRepository.listCategories(true);
  }

  /**
   * List marketing posters derived from DailyContent (Single Source of Truth)
   */
  async listPosters(params: {
    page?: number;
    limit?: number;
    categoryId?: string;
    category?: string;
    festivalId?: string;
    language?: string;
    contentType?: string;
    aspectRatio?: string;
    tier?: string;
    search?: string;
  }) {
    return contentRepository.listMarketingPosters({
      ...params,
      isPublished: true,
    });
  }

  async listMarketingPosters(params: {
    page?: number;
    limit?: number;
    categoryId?: string;
    category?: string;
    festivalId?: string;
    language?: string;
    contentType?: string;
    aspectRatio?: string;
    tier?: string;
    search?: string;
  }) {
    return this.listPosters(params);
  }

  /**
   * Real event tracking (VIEW, DOWNLOAD, SHARE, WHATSAPP_CLICK, FAVORITE)
   */
  async trackEvent(data: {
    contentId?: string;
    assetId?: string;
    userId?: string;
    businessId?: string;
    eventType: ContentEventType;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return contentRepository.trackEvent(data);
  }

  // ============================================================
  // ADMIN CMS APIs (Protected with RBAC & AuditLog)
  // ============================================================

  async adminListDailyContent(params: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    festivalId?: string;
    language?: string;
    contentType?: string;
    isPublished?: boolean;
    isFeatured?: boolean;
    startDate?: string;
    endDate?: string;
  }) {
    return contentRepository.adminListDailyContent(params);
  }

  async adminGetDailyContentById(id: string) {
    const content = await contentRepository.adminGetDailyContentById(id);
    if (!content) {
      throw new Error('Content not found');
    }
    return content;
  }

  async adminCreateDailyContent(
    data: any,
    adminUser: { id: string; email: string },
    ipAddress?: string,
    userAgent?: string
  ): Promise<DailyContent> {
    const dateStr = data.date || (data.contentDate ? getIndiaDateString(new Date(data.contentDate)) : getIndiaDateString());
    const { startUtc } = getIndiaDateRange(dateStr);
    const contentDate = data.contentDate ? new Date(data.contentDate) : startUtc;

    let publishAt = data.publishAt ? new Date(data.publishAt) : new Date();
    let expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;

    const created = await contentRepository.createDailyContent({
      title: data.title,
      description: data.description || null,
      contentText: data.contentText || null,
      headline: data.headline || null,
      quoteHindi: data.quoteHindi || null,
      quoteEnglish: data.quoteEnglish || null,
      quoteHinglish: data.quoteHinglish || null,
      imageUrl: data.imageUrl,
      thumbnailUrl: data.thumbnailUrl || data.imageUrl,
      contentType: (data.contentType as ContentType) || ContentType.SUVICHAR,
      language: data.language ? data.language.toLowerCase() : 'hi',
      aspectRatio: data.aspectRatio || '9:16',
      date: dateStr,
      contentDate,
      tier: (data.tier as ContentTier) || ContentTier.FREE,
      status: data.status || 'ACTIVE',
      visibility: data.visibility || 'PUBLIC',
      isPublished: data.isPublished !== false,
      isFeatured: Boolean(data.isFeatured),
      sortOrder: Number(data.sortOrder) || 0,
      publishAt,
      expiresAt,
      tags: Array.isArray(data.tags) ? data.tags : [],
      createdBy: adminUser.email,
      authorAdminId: adminUser.id,
      categoryRel: data.categoryId ? { connect: { id: data.categoryId } } : undefined,
      festival: data.festivalId ? { connect: { id: data.festivalId } } : undefined,
    });

    // Write AuditLog
    await prisma.auditLog.create({
      data: {
        actorId: adminUser.id,
        actorType: 'ADMIN',
        action: 'DAILY_CONTENT_CREATE',
        entity: 'DailyContent',
        entityId: created.id,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        metadata: {
          title: created.title,
          date: created.date,
          contentType: created.contentType,
        },
      },
    }).catch(() => null);

    return created;
  }

  async adminUpdateDailyContent(
    id: string,
    data: any,
    adminUser: { id: string; email: string },
    ipAddress?: string,
    userAgent?: string
  ): Promise<DailyContent> {
    const existing = await contentRepository.adminGetDailyContentById(id);
    if (!existing) {
      throw new Error('Daily content not found');
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.contentText !== undefined) updateData.contentText = data.contentText;
    if (data.headline !== undefined) updateData.headline = data.headline;
    if (data.quoteHindi !== undefined) updateData.quoteHindi = data.quoteHindi;
    if (data.quoteEnglish !== undefined) updateData.quoteEnglish = data.quoteEnglish;
    if (data.quoteHinglish !== undefined) updateData.quoteHinglish = data.quoteHinglish;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl;
    if (data.contentType !== undefined) updateData.contentType = data.contentType as ContentType;
    if (data.language !== undefined) updateData.language = data.language.toLowerCase();
    if (data.aspectRatio !== undefined) updateData.aspectRatio = data.aspectRatio;
    if (data.tier !== undefined) updateData.tier = data.tier as ContentTier;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.visibility !== undefined) updateData.visibility = data.visibility;
    if (data.isPublished !== undefined) updateData.isPublished = Boolean(data.isPublished);
    if (data.isFeatured !== undefined) updateData.isFeatured = Boolean(data.isFeatured);
    if (data.sortOrder !== undefined) updateData.sortOrder = Number(data.sortOrder);
    if (data.date !== undefined) {
      updateData.date = data.date;
      if (!data.contentDate) {
        updateData.contentDate = getIndiaDateRange(data.date).startUtc;
      }
    }
    if (data.contentDate !== undefined) updateData.contentDate = new Date(data.contentDate);
    if (data.publishAt !== undefined) updateData.publishAt = data.publishAt ? new Date(data.publishAt) : null;
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    if (data.tags !== undefined) updateData.tags = Array.isArray(data.tags) ? data.tags : [];


    if (data.categoryId !== undefined) {
      if (data.categoryId) {
        updateData.categoryRel = { connect: { id: data.categoryId } };
      } else {
        updateData.categoryRel = { disconnect: true };
      }
    }

    if (data.festivalId !== undefined) {
      if (data.festivalId) {
        updateData.festival = { connect: { id: data.festivalId } };
      } else {
        updateData.festival = { disconnect: true };
      }
    }

    const updated = await contentRepository.updateDailyContent(id, updateData);

    await prisma.auditLog.create({
      data: {
        actorId: adminUser.id,
        actorType: 'ADMIN',
        action: 'DAILY_CONTENT_UPDATE',
        entity: 'DailyContent',
        entityId: updated.id,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        metadata: { changes: Object.keys(updateData) },
      },
    }).catch(() => null);

    return updated;
  }

  async adminDeleteDailyContent(
    id: string,
    adminUser: { id: string; email: string },
    ipAddress?: string,
    userAgent?: string
  ): Promise<DailyContent> {
    const existing = await contentRepository.adminGetDailyContentById(id);
    if (!existing) {
      throw new Error('Daily content not found');
    }

    const deleted = await contentRepository.deleteDailyContent(id);

    await prisma.auditLog.create({
      data: {
        actorId: adminUser.id,
        actorType: 'ADMIN',
        action: 'DAILY_CONTENT_DELETE',
        entity: 'DailyContent',
        entityId: id,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        metadata: { title: existing.title, date: existing.date },
      },
    }).catch(() => null);

    return deleted;
  }

  async adminPublishDailyContent(
    id: string,
    adminUser: { id: string; email: string },
    ipAddress?: string,
    userAgent?: string
  ): Promise<DailyContent> {
    const updated = await contentRepository.updateDailyContent(id, {
      isPublished: true,
      publishAt: new Date(),
    });

    await prisma.auditLog.create({
      data: {
        actorId: adminUser.id,
        actorType: 'ADMIN',
        action: 'DAILY_CONTENT_PUBLISH',
        entity: 'DailyContent',
        entityId: id,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    }).catch(() => null);

    return updated;
  }

  async adminUnpublishDailyContent(
    id: string,
    adminUser: { id: string; email: string },
    ipAddress?: string,
    userAgent?: string
  ): Promise<DailyContent> {
    const updated = await contentRepository.updateDailyContent(id, {
      isPublished: false,
    });

    await prisma.auditLog.create({
      data: {
        actorId: adminUser.id,
        actorType: 'ADMIN',
        action: 'DAILY_CONTENT_UNPUBLISH',
        entity: 'DailyContent',
        entityId: id,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    }).catch(() => null);

    return updated;
  }

  async adminScheduleDailyContent(
    id: string,
    schedule: { publishAt: string; expiresAt?: string },
    adminUser: { id: string; email: string },
    ipAddress?: string,
    userAgent?: string
  ): Promise<DailyContent> {
    const publishDate = new Date(schedule.publishAt);
    if (isNaN(publishDate.getTime())) {
      throw new Error('Invalid publishAt date');
    }

    const expiresDate = schedule.expiresAt ? new Date(schedule.expiresAt) : null;
    if (expiresDate && isNaN(expiresDate.getTime())) {
      throw new Error('Invalid expiresAt date');
    }

    if (expiresDate && expiresDate <= publishDate) {
      throw new Error('expiresAt must be after publishAt');
    }

    const updated = await contentRepository.updateDailyContent(id, {
      isPublished: true,
      publishAt: publishDate,
      expiresAt: expiresDate,
    });

    await prisma.auditLog.create({
      data: {
        actorId: adminUser.id,
        actorType: 'ADMIN',
        action: 'DAILY_CONTENT_SCHEDULE',
        entity: 'DailyContent',
        entityId: id,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        metadata: {
          publishAt: publishDate.toISOString(),
          expiresAt: expiresDate?.toISOString() || null,
        },
      },
    }).catch(() => null);

    return updated;
  }

  // Festival Admin CRUD
  async adminCreateFestival(
    data: any,
    adminUser: { id: string; email: string },
    ipAddress?: string,
    userAgent?: string
  ): Promise<Festival> {
    const festivalDate = new Date(data.festivalDate);
    const dateStr = data.date || festivalDate.toISOString().split('T')[0];
    const year = data.year || festivalDate.getFullYear();

    let slug = data.slug ? sanitizeSlug(data.slug) : sanitizeSlug(data.name);
    slug = await generateUniqueSlug(slug, async (candidate) => {
      const exists = await prisma.festival.findUnique({ where: { slug: candidate } });
      return !!exists;
    });

    const festival = await contentRepository.createFestival({
      name: data.name,
      hindiName: data.hindiName || null,
      slug,
      description: data.description || null,
      festivalDate,
      date: dateStr,
      year,
      language: data.language ? data.language.toLowerCase() : 'hi',
      imageUrl: data.imageUrl || data.bannerUrl || null,
      bannerUrl: data.bannerUrl || data.imageUrl || null,
      priority: Number(data.priority) || 1,
      tags: Array.isArray(data.tags) ? data.tags : [],
      isActive: data.isActive !== false,
    });

    await prisma.auditLog.create({
      data: {
        actorId: adminUser.id,
        actorType: 'ADMIN',
        action: 'FESTIVAL_CREATE',
        entity: 'Festival',
        entityId: festival.id,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        metadata: { name: festival.name, slug: festival.slug, date: dateStr },
      },
    }).catch(() => null);

    return festival;
  }

  async adminUpdateFestival(
    id: string,
    data: any,
    adminUser: { id: string; email: string },
    ipAddress?: string,
    userAgent?: string
  ): Promise<Festival> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.hindiName !== undefined) updateData.hindiName = data.hindiName;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.festivalDate !== undefined) {
      updateData.festivalDate = new Date(data.festivalDate);
      updateData.date = data.festivalDate.split('T')[0];
      updateData.year = updateData.festivalDate.getFullYear();
    }
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.bannerUrl !== undefined) updateData.bannerUrl = data.bannerUrl;
    if (data.priority !== undefined) updateData.priority = Number(data.priority);
    if (data.tags !== undefined) updateData.tags = Array.isArray(data.tags) ? data.tags : [];
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);
    if (data.language !== undefined) updateData.language = data.language.toLowerCase();

    const festival = await contentRepository.updateFestival(id, updateData);

    await prisma.auditLog.create({
      data: {
        actorId: adminUser.id,
        actorType: 'ADMIN',
        action: 'FESTIVAL_UPDATE',
        entity: 'Festival',
        entityId: id,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    }).catch(() => null);

    return festival;
  }

  async adminDeleteFestival(
    id: string,
    adminUser: { id: string; email: string },
    ipAddress?: string,
    userAgent?: string
  ): Promise<Festival> {
    const festival = await contentRepository.deleteFestival(id);

    await prisma.auditLog.create({
      data: {
        actorId: adminUser.id,
        actorType: 'ADMIN',
        action: 'FESTIVAL_DELETE',
        entity: 'Festival',
        entityId: id,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    }).catch(() => null);

    return festival;
  }

  // Category Admin CRUD
  async adminCreateCategory(
    data: any,
    adminUser: { id: string; email: string },
    ipAddress?: string,
    userAgent?: string
  ): Promise<ContentCategory> {
    let slug = data.slug ? sanitizeSlug(data.slug) : sanitizeSlug(data.name);
    slug = await generateUniqueSlug(slug, async (candidate) => {
      const exists = await prisma.contentCategory.findUnique({ where: { slug: candidate } });
      return !!exists;
    });

    const category = await contentRepository.createCategory({
      name: data.name,
      slug,
      description: data.description || null,
      icon: data.icon || 'category',
      sortOrder: Number(data.sortOrder) || 0,
      isActive: data.isActive !== false,
    });

    await prisma.auditLog.create({
      data: {
        actorId: adminUser.id,
        actorType: 'ADMIN',
        action: 'CONTENT_CATEGORY_CREATE',
        entity: 'ContentCategory',
        entityId: category.id,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    }).catch(() => null);

    return category;
  }

  async adminUpdateCategory(
    id: string,
    data: any,
    adminUser: { id: string; email: string }
  ): Promise<ContentCategory> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.sortOrder !== undefined) updateData.sortOrder = Number(data.sortOrder);
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);

    return contentRepository.updateCategory(id, updateData);
  }

  async adminDeleteCategory(id: string): Promise<ContentCategory> {
    return contentRepository.deleteCategory(id);
  }

  // Poster Assets Admin CRUD
  async adminCreateAsset(
    data: any,
    adminUser: { id: string; email: string },
    ipAddress?: string,
    userAgent?: string
  ): Promise<ContentAsset> {
    const asset = await contentRepository.createAsset({
      title: data.title,
      description: data.description || null,
      imageUrl: data.imageUrl,
      thumbnailUrl: data.thumbnailUrl || data.imageUrl,
      contentType: (data.contentType as ContentType) || ContentType.BUSINESS,
      language: data.language ? data.language.toLowerCase() : 'hi',
      aspectRatio: data.aspectRatio || '1:1',
      format: data.format || '1:1 Sq',
      tier: (data.tier as ContentTier) || ContentTier.FREE,
      tags: Array.isArray(data.tags) ? data.tags : [],
      isPublished: data.isPublished !== false,
      isFeatured: Boolean(data.isFeatured),
      createdBy: adminUser.email,
      category: data.categoryId ? { connect: { id: data.categoryId } } : undefined,
      festival: data.festivalId ? { connect: { id: data.festivalId } } : undefined,
    });

    await prisma.auditLog.create({
      data: {
        actorId: adminUser.id,
        actorType: 'ADMIN',
        action: 'POSTER_ASSET_CREATE',
        entity: 'ContentAsset',
        entityId: asset.id,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    }).catch(() => null);

    return asset;
  }

  async adminUpdateAsset(
    id: string,
    data: any,
    adminUser: { id: string; email: string }
  ): Promise<ContentAsset> {
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl;
    if (data.contentType !== undefined) updateData.contentType = data.contentType as ContentType;
    if (data.language !== undefined) updateData.language = data.language.toLowerCase();
    if (data.aspectRatio !== undefined) updateData.aspectRatio = data.aspectRatio;
    if (data.format !== undefined) updateData.format = data.format;
    if (data.tier !== undefined) updateData.tier = data.tier as ContentTier;
    if (data.tags !== undefined) updateData.tags = Array.isArray(data.tags) ? data.tags : [];
    if (data.isPublished !== undefined) updateData.isPublished = Boolean(data.isPublished);
    if (data.isFeatured !== undefined) updateData.isFeatured = Boolean(data.isFeatured);

    if (data.categoryId !== undefined) {
      if (data.categoryId) updateData.category = { connect: { id: data.categoryId } };
      else updateData.category = { disconnect: true };
    }

    if (data.festivalId !== undefined) {
      if (data.festivalId) updateData.festival = { connect: { id: data.festivalId } };
      else updateData.festival = { disconnect: true };
    }

    return contentRepository.updateAsset(id, updateData);
  }

  async adminDeleteAsset(id: string): Promise<ContentAsset> {
    return contentRepository.deleteAsset(id);
  }

  async createDailyContent(data: any, adminId?: string): Promise<DailyContent> {
    return this.adminCreateDailyContent(data, { id: adminId || 'system', email: 'admin@brandx.in' });
  }

  async createPosterTemplate(data: any): Promise<ContentAsset> {
    return this.adminCreateAsset(data, { id: 'system', email: 'admin@brandx.in' });
  }

  async createFestival(data: any): Promise<Festival> {
    return this.adminCreateFestival(data, { id: 'system', email: 'admin@brandx.in' });
  }

  /**
   * Upload poster / daily content image using storage abstraction
   */
  async uploadContentImage(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    folder = 'daily-content'
  ): Promise<{ url: string; key: string }> {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('Image file buffer is empty');
    }
    if (!mimeType.startsWith('image/')) {
      throw new Error('Only image files (JPEG, PNG, WebP) are supported');
    }
    // Limit to 10MB
    if (fileBuffer.length > 10 * 1024 * 1024) {
      throw new Error('Image file exceeds maximum allowed size of 10MB');
    }

    return storageProvider.uploadFile({
      fileName,
      buffer: fileBuffer,
      mimeType,
      folder,
    });
  }
}

export const contentService = new ContentService();
