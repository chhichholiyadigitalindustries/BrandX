import { prisma } from '../config/database.js';
import { getIndiaDateString, getIndiaDateRange } from '../utils/timezone.js';
import {
  DailyContent,
  ContentCategory,
  Festival,
  ContentAsset,
  ContentEvent,
  ContentType,
  ContentEventType,
  Prisma,
} from '@prisma/client';

export class ContentRepository {
  // ============================================================
  // USER / PUBLIC CONTENT QUERIES
  // ============================================================

  /**
   * Get today's featured or primary daily content
   * Enforces server-side scheduling: publishAt <= now AND (expiresAt > now OR expiresAt IS NULL)
   * Date logic is grounded strictly in Asia/Kolkata timezone.
   */
  async getTodayContent(params?: {
    dateStr?: string;
    language?: string;
    categoryId?: string;
    contentType?: string;
    tier?: 'FREE' | 'PRO';
  }): Promise<DailyContent | null> {
    const today = params?.dateStr || getIndiaDateString();
    const { startUtc, endUtc } = getIndiaDateRange(today);
    const now = new Date();

    const where: Prisma.DailyContentWhereInput = {
      isActive: true,
      isPublished: true,
      OR: [
        { date: today },
        {
          contentDate: {
            gte: startUtc,
            lte: endUtc,
          },
        },
      ],
      AND: [
        {
          OR: [{ publishAt: null }, { publishAt: { lte: now } }],
        },
        {
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      ],
    };

    if (params?.language) {
      where.language = params.language.toLowerCase();
    }
    if (params?.categoryId) {
      where.categoryId = params.categoryId;
    }
    if (params?.contentType) {
      where.contentType = params.contentType as ContentType;
    }
    if (params?.tier === 'FREE') {
      where.tier = 'FREE';
    }

    const todayMatch = await prisma.dailyContent.findFirst({
      where,
      orderBy: [
        { isFeatured: 'desc' },
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        categoryRel: true,
        festival: true,
      },
    });

    if (todayMatch) return todayMatch;

    // Fallback if today's content has not been explicitly scheduled yet
    if (!params?.dateStr) {
      return prisma.dailyContent.findFirst({
        where: {
          isActive: true,
          isPublished: true,
          ...(params?.tier === 'FREE' ? { tier: 'FREE' } : {}),
          AND: [
            { OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
            { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          ],
        },
        orderBy: [
          { contentDate: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          categoryRel: true,
          festival: true,
        },
      });
    }

    return null;
  }


  /**
   * Get daily content by exact ID (with scheduling check for public users)
   */
  async getPublishedContentById(id: string): Promise<DailyContent | null> {
    const now = new Date();
    return prisma.dailyContent.findFirst({
      where: {
        id,
        isActive: true,
        isPublished: true,
        AND: [
          { OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        ],
      },
      include: {
        categoryRel: true,
        festival: true,
      },
    });
  }

  /**
   * Get all published content for a specific date
   */
  async getContentByDate(dateStr: string, language?: string): Promise<DailyContent[]> {
    const now = new Date();
    const { startUtc, endUtc } = getIndiaDateRange(dateStr);
    const where: Prisma.DailyContentWhereInput = {
      isActive: true,
      isPublished: true,
      OR: [
        { date: dateStr },
        {
          contentDate: {
            gte: startUtc,
            lte: endUtc,
          },
        },
      ],
      AND: [
        { OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      ],
    };

    if (language) {
      where.language = language.toLowerCase();
    }

    return prisma.dailyContent.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        categoryRel: true,
        festival: true,
      },
    });
  }

  /**
   * List published daily content with database pagination & filtering
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
  }): Promise<{ items: DailyContent[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;
    const now = new Date();

    const where: Prisma.DailyContentWhereInput = {
      isActive: true,
      isPublished: true,
      AND: [
        { OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      ],
    };

    if (params.date) {
      where.OR = [
        { date: params.date },
        {
          contentDate: {
            gte: new Date(`${params.date}T00:00:00.000Z`),
            lte: new Date(`${params.date}T23:59:59.999Z`),
          },
        },
      ];
    }
    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.festivalId) where.festivalId = params.festivalId;
    if (params.language) where.language = params.language.toLowerCase();
    if (params.contentType) where.contentType = params.contentType as ContentType;
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { contentText: { contains: params.search, mode: 'insensitive' } },
        { headline: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.dailyContent.findMany({
        where,
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          categoryRel: true,
          festival: true,
        },
      }),
      prisma.dailyContent.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  /**
   * 365-Day Calendar Feed (Fetches upcoming days, festival dates, business days)
   */
  async get365DayCalendarFeed(params?: {
    startDate?: string;
    endDate?: string;
    language?: string;
  }): Promise<{
    today: DailyContent | null;
    upcomingFestivals: Festival[];
    calendarDays: { date: string; contentCount: number; hasFestival: boolean; title?: string }[];
  }> {
    const todayStr = new Date().toISOString().split('T')[0];
    const startDateStr = params?.startDate || todayStr;
    const endDateStr =
      params?.endDate ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [todayContent, upcomingFestivals, contentsInRange] = await Promise.all([
      this.getTodayContent({ dateStr: todayStr, language: params?.language }),
      prisma.festival.findMany({
        where: {
          isActive: true,
          festivalDate: {
            gte: new Date(`${todayStr}T00:00:00.000Z`),
          },
        },
        orderBy: { festivalDate: 'asc' },
        take: 10,
      }),
      prisma.dailyContent.findMany({
        where: {
          isActive: true,
          isPublished: true,
          OR: [
            { date: { gte: startDateStr, lte: endDateStr } },
            {
              contentDate: {
                gte: new Date(`${startDateStr}T00:00:00.000Z`),
                lte: new Date(`${endDateStr}T23:59:59.999Z`),
              },
            },
          ],
        },
        select: { date: true, contentDate: true, title: true, festivalId: true },
      }),
    ]);

    // Group by date
    const dateMap = new Map<string, { count: number; hasFestival: boolean; title?: string }>();
    for (const c of contentsInRange) {
      const d = c.date || (c.contentDate ? c.contentDate.toISOString().split('T')[0] : '');
      if (d) {
        const existing = dateMap.get(d) || { count: 0, hasFestival: false };
        existing.count += 1;
        if (c.festivalId) existing.hasFestival = true;
        if (!existing.title) existing.title = c.title;
        dateMap.set(d, existing);
      }
    }

    const calendarDays: { date: string; contentCount: number; hasFestival: boolean; title?: string }[] = [];
    dateMap.forEach((val, d) => {
      calendarDays.push({
        date: d,
        contentCount: val.count,
        hasFestival: val.hasFestival,
        title: val.title,
      });
    });

    calendarDays.sort((a, b) => a.date.localeCompare(b.date));

    return {
      today: todayContent,
      upcomingFestivals,
      calendarDays,
    };
  }

  /**
   * Get Festival by ID with its published assets
   */
  async getFestivalById(id: string, publishedOnly = true): Promise<Festival & { dailyContents: DailyContent[]; contentAssets: ContentAsset[] } | null> {
    const now = new Date();
    const contentWhere: Prisma.DailyContentWhereInput = publishedOnly
      ? {
          isActive: true,
          isPublished: true,
          AND: [
            { OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
            { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          ],
        }
      : {};

    const assetWhere: Prisma.ContentAssetWhereInput = publishedOnly
      ? { isPublished: true }
      : {};

    return prisma.festival.findUnique({
      where: { id },
      include: {
        dailyContents: {
          where: contentWhere,
          orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
        },
        contentAssets: {
          where: assetWhere,
          orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        },
      },
    });
  }

  /**
   * List Festivals
   */
  async listFestivals(params?: {
    year?: number;
    language?: string;
    isActive?: boolean;
  }): Promise<Festival[]> {
    const where: Prisma.FestivalWhereInput = {};
    if (params?.isActive !== undefined) where.isActive = params.isActive;
    else where.isActive = true;

    if (params?.year) where.year = params.year;
    if (params?.language) where.language = params.language.toLowerCase();

    return prisma.festival.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { festivalDate: 'asc' }],
    });
  }

  /**
   * List Content Categories
   */
  async listCategories(isActive = true): Promise<ContentCategory[]> {
    return prisma.contentCategory.findMany({
      where: isActive ? { isActive: true } : {},
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * List Poster Assets with database pagination
   */
  async listContentAssets(params: {
    page?: number;
    limit?: number;
    categoryId?: string;
    festivalId?: string;
    language?: string;
    contentType?: string;
    aspectRatio?: string;
    tier?: string;
    search?: string;
    isPublished?: boolean;
  }): Promise<{ items: ContentAsset[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 30));
    const skip = (page - 1) * limit;

    const where: Prisma.ContentAssetWhereInput = {};
    if (params.isPublished !== undefined) where.isPublished = params.isPublished;
    else where.isPublished = true;

    if (params.categoryId && params.categoryId !== 'all') where.categoryId = params.categoryId;
    if (params.festivalId && params.festivalId !== 'all') where.festivalId = params.festivalId;
    if (params.language) where.language = params.language.toLowerCase();
    if (params.contentType) where.contentType = params.contentType as ContentType;
    if (params.aspectRatio && params.aspectRatio !== 'all') where.aspectRatio = params.aspectRatio;
    if (params.tier && params.tier !== 'all') where.tier = params.tier.toUpperCase() as any;
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { tags: { has: params.search.toLowerCase() } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.contentAsset.findMany({
        where,
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          category: true,
          festival: true,
        },
      }),
      prisma.contentAsset.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  /**
   * Real Event Tracking (VIEW, DOWNLOAD, SHARE, WHATSAPP_CLICK, FAVORITE)
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
  }): Promise<ContentEvent> {
    const event = await prisma.contentEvent.create({
      data: {
        contentId: data.contentId || null,
        assetId: data.assetId || null,
        userId: data.userId || null,
        businessId: data.businessId || null,
        eventType: data.eventType,
        metadata: data.metadata || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    });

    // Increment counters on targets atomically
    if (data.contentId) {
      const updateData: Prisma.DailyContentUpdateInput = {};
      if (data.eventType === 'VIEW') updateData.viewsCount = { increment: 1 };
      if (data.eventType === 'DOWNLOAD') updateData.downloadsCount = { increment: 1 };
      if (data.eventType === 'SHARE' || data.eventType === 'WHATSAPP_CLICK') {
        updateData.sharesCount = { increment: 1 };
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.dailyContent.update({
          where: { id: data.contentId },
          data: updateData,
        }).catch(() => null);
      }
    }

    if (data.assetId) {
      const updateData: Prisma.ContentAssetUpdateInput = {};
      if (data.eventType === 'VIEW') updateData.viewsCount = { increment: 1 };
      if (data.eventType === 'DOWNLOAD') updateData.downloadsCount = { increment: 1 };
      if (data.eventType === 'SHARE' || data.eventType === 'WHATSAPP_CLICK') {
        updateData.sharesCount = { increment: 1 };
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.contentAsset.update({
          where: { id: data.assetId },
          data: updateData,
        }).catch(() => null);
      }
    }

    return event;
  }

  // ============================================================
  // ADMIN CMS CRUD OPERATIONS
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
  }): Promise<{ items: DailyContent[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.DailyContentWhereInput = {};
    if (params.isPublished !== undefined) where.isPublished = params.isPublished;
    if (params.isFeatured !== undefined) where.isFeatured = params.isFeatured;
    if (params.categoryId && params.categoryId !== 'all') where.categoryId = params.categoryId;
    if (params.festivalId && params.festivalId !== 'all') where.festivalId = params.festivalId;
    if (params.language && params.language !== 'all') where.language = params.language.toLowerCase();
    if (params.contentType && params.contentType !== 'all') {
      where.contentType = params.contentType as ContentType;
    }
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { contentText: { contains: params.search, mode: 'insensitive' } },
        { headline: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.startDate || params.endDate) {
      where.contentDate = {};
      if (params.startDate) where.contentDate.gte = new Date(`${params.startDate}T00:00:00.000Z`);
      if (params.endDate) where.contentDate.lte = new Date(`${params.endDate}T23:59:59.999Z`);
    }

    const [items, total] = await Promise.all([
      prisma.dailyContent.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          categoryRel: true,
          festival: true,
        },
      }),
      prisma.dailyContent.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async adminGetDailyContentById(id: string): Promise<DailyContent | null> {
    return prisma.dailyContent.findUnique({
      where: { id },
      include: {
        categoryRel: true,
        festival: true,
      },
    });
  }

  async createDailyContent(data: Prisma.DailyContentCreateInput): Promise<DailyContent> {
    return prisma.dailyContent.create({
      data,
      include: {
        categoryRel: true,
        festival: true,
      },
    });
  }

  async updateDailyContent(id: string, data: Prisma.DailyContentUpdateInput): Promise<DailyContent> {
    return prisma.dailyContent.update({
      where: { id },
      data,
      include: {
        categoryRel: true,
        festival: true,
      },
    });
  }

  async deleteDailyContent(id: string): Promise<DailyContent> {
    return prisma.dailyContent.delete({
      where: { id },
    });
  }

  // Festival CRUD
  async createFestival(data: Prisma.FestivalCreateInput): Promise<Festival> {
    return prisma.festival.create({ data });
  }

  async updateFestival(id: string, data: Prisma.FestivalUpdateInput): Promise<Festival> {
    return prisma.festival.update({
      where: { id },
      data,
    });
  }

  async deleteFestival(id: string): Promise<Festival> {
    return prisma.festival.delete({
      where: { id },
    });
  }

  // Category CRUD
  async createCategory(data: Prisma.ContentCategoryCreateInput): Promise<ContentCategory> {
    return prisma.contentCategory.create({ data });
  }

  async updateCategory(id: string, data: Prisma.ContentCategoryUpdateInput): Promise<ContentCategory> {
    return prisma.contentCategory.update({
      where: { id },
      data,
    });
  }

  async deleteCategory(id: string): Promise<ContentCategory> {
    return prisma.contentCategory.delete({
      where: { id },
    });
  }

  // Asset CRUD
  async createAsset(data: Prisma.ContentAssetCreateInput): Promise<ContentAsset> {
    return prisma.contentAsset.create({
      data,
      include: {
        category: true,
        festival: true,
      },
    });
  }

  async updateAsset(id: string, data: Prisma.ContentAssetUpdateInput): Promise<ContentAsset> {
    return prisma.contentAsset.update({
      where: { id },
      data,
      include: {
        category: true,
        festival: true,
      },
    });
  }

  async deleteAsset(id: string): Promise<ContentAsset> {
    return prisma.contentAsset.delete({
      where: { id },
    });
  }
}

export const contentRepository = new ContentRepository();
