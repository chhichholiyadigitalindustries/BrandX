import { PrismaClient } from '@prisma/client';
import { config } from './index.js';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

const rawPrisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log: config.isProduction ? ['error', 'warn'] : ['query', 'info', 'warn', 'error'],
  });

if (!config.isProduction) {
  globalThis.prismaGlobal = rawPrisma;
}

/**
 * Tracks whether a successful connection to the live PostgreSQL instance is active.
 * In production, PostgreSQL is the ONLY allowed persistence engine.
 */
export let isPostgresConnected = false;

// Dynamic in-memory fallback store for local development when PostgreSQL is offline
const devMemoryStore: Record<string, Map<string, any>> = {
  user: new Map<string, any>(),
  business: new Map<string, any>(),
  userSession: new Map<string, any>(),
  businessSettings: new Map<string, any>(),
  auditLog: new Map<string, any>(),
};

function createMemoryDelegate(entityName: string) {
  if (!devMemoryStore[entityName]) {
    devMemoryStore[entityName] = new Map<string, any>();
  }
  const store = devMemoryStore[entityName];

  return {
    findUnique: async ({ where, include }: any = {}) => {
      if (!where) return null;
      let result: any = null;
      if (where.id) result = store.get(where.id) || null;
      if (!result) {
        for (const item of store.values()) {
          if (where.firebaseUid && item.firebaseUid === where.firebaseUid) { result = item; break; }
          if (where.mobile && item.mobile === where.mobile) { result = item; break; }
          if (where.email && item.email?.toLowerCase() === where.email?.toLowerCase()) { result = item; break; }
          if (where.businessId && item.businessId === where.businessId) { result = item; break; }
        }
      }
      if (result && include?.businesses) {
        const bizs: any[] = [];
        const bizStore = devMemoryStore.business || new Map();
        for (const b of bizStore.values()) {
          if (b.ownerId === result.id) bizs.push(b);
        }
        return { ...result, businesses: bizs };
      }
      return result ? { ...result } : null;
    },
    findFirst: async ({ where = {} }: any = {}) => {
      for (const item of store.values()) {
        let match = true;
        for (const [k, v] of Object.entries(where || {})) {
          if (v !== undefined && item[k] !== v) {
            match = false;
            break;
          }
        }
        if (match) return { ...item };
      }
      return null;
    },
    findMany: async ({ where = {} }: any = {}) => {
      const results: any[] = [];
      for (const item of store.values()) {
        let match = true;
        for (const [k, v] of Object.entries(where || {})) {
          if (v !== undefined && item[k] !== v) {
            match = false;
            break;
          }
        }
        if (match) results.push({ ...item });
      }
      return results;
    },
    create: async ({ data }: any = {}) => {
      const id = data?.id || `${entityName.slice(0, 3)}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const record = { id, ...data, isPro: data?.isPro || false, createdAt: new Date(), updatedAt: new Date() };
      store.set(id, record);
      return { ...record };
    },
    update: async ({ where = {}, data = {} }: any = {}) => {
      let existing: any = where.id ? store.get(where.id) : null;
      if (!existing) {
        for (const item of store.values()) {
          if (where.firebaseUid && item.firebaseUid === where.firebaseUid) { existing = item; break; }
          if (where.mobile && item.mobile === where.mobile) { existing = item; break; }
          if (where.email && item.email?.toLowerCase() === where.email?.toLowerCase()) { existing = item; break; }
        }
      }
      if (!existing) throw new Error(`${entityName} record not found for update`);
      const updated = { ...existing, ...data, updatedAt: new Date() };
      store.set(existing.id, updated);
      return { ...updated };
    },
    delete: async ({ where = {} }: any = {}) => {
      const existing = store.get(where.id);
      if (existing) store.delete(where.id);
      return existing ? { ...existing } : null;
    },
    deleteMany: async ({ where = {} }: any = {}) => {
      let count = 0;
      for (const [id, item] of Array.from(store.entries())) {
        let match = true;
        for (const [k, v] of Object.entries(where || {})) {
          if (v && typeof v === 'object' && 'in' in (v as any)) {
            if (!(v as any).in.includes(item[k])) match = false;
          } else if (v !== undefined && item[k] !== v) {
            match = false;
          }
        }
        if (match) {
          store.delete(id);
          count++;
        }
      }
      return { count };
    },
    count: async ({ where = {} }: any = {}) => {
      let count = 0;
      for (const item of store.values()) {
        let match = true;
        for (const [k, v] of Object.entries(where || {})) {
          if (v !== undefined && item[k] !== v) match = false;
        }
        if (match) count++;
      }
      return count;
    },
    upsert: async ({ where = {}, update = {}, create = {} }: any = {}) => {
      let existing = null;
      for (const item of store.values()) {
        if (where.businessId && item.businessId === where.businessId) { existing = item; break; }
        if (where.id && item.id === where.id) { existing = item; break; }
      }
      if (existing) {
        const updated = { ...existing, ...update, updatedAt: new Date() };
        store.set(existing.id, updated);
        return { ...updated };
      }
      const id = `${entityName.slice(0, 3)}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const createdRecord = { id, ...create, createdAt: new Date(), updatedAt: new Date() };
      store.set(id, createdRecord);
      return { ...createdRecord };
    },
  };
}

const memoryDelegates: Record<string, any> = {};
function getMemoryDelegate(prop: string) {
  if (!memoryDelegates[prop]) {
    memoryDelegates[prop] = createMemoryDelegate(prop);
  }
  return memoryDelegates[prop];
}

const memoryPrisma: any = {
  $transaction: async (fnOrArray: any) => {
    if (typeof fnOrArray === 'function') {
      return fnOrArray(prisma);
    }
    return Promise.all(fnOrArray);
  },
  $connect: async () => {},
  $disconnect: async () => {},
  $queryRaw: async () => {
    throw new Error('PostgreSQL server not reachable at localhost:5432');
  },
};

/**
 * Smart Prisma Client:
 * 1. IN PRODUCTION: Always routes directly to PostgreSQL (rawPrisma). Never falls back to memory.
 * 2. IN DEVELOPMENT: Routes to PostgreSQL when connected. If PostgreSQL is offline, gracefully
 *    services queries via dev in-memory store so UI/local dev can function.
 */
export const prisma: PrismaClient = new Proxy(rawPrisma, {
  get(target, prop, receiver) {
    // Production safety: NEVER use in-memory fallback in production
    if (config.isProduction) {
      return Reflect.get(target, prop, receiver);
    }
    // Development mode with live PostgreSQL connection
    if (isPostgresConnected) {
      return Reflect.get(target, prop, receiver);
    }
    // Development offline fallback
    if (typeof prop === 'string' && prop in memoryPrisma) {
      return memoryPrisma[prop];
    }
    if (typeof prop === 'string') {
      return getMemoryDelegate(prop);
    }
    return Reflect.get(target, prop, receiver);
  },
  set(target, prop, value, receiver) {
    if (config.isProduction) {
      return Reflect.set(target, prop, value, receiver);
    }
    if (isPostgresConnected) {
      return Reflect.set(target, prop, value, receiver);
    }
    if (typeof prop === 'string') {
      memoryPrisma[prop] = value;
      memoryDelegates[prop] = value;
    }
    return true;
  },
}) as unknown as PrismaClient;

/**
 * Strips sensitive connection string credentials (passwords, usernames, host ports)
 * from error messages before emitting to console or logs.
 */
export function sanitizeDatabaseError(error: any): string {
  if (!error) return 'Unknown database error';
  const rawMsg = typeof error === 'string' ? error : error?.message || String(error);
  return rawMsg.replace(/postgres(ql)?:\/\/([^:]+):([^@]+)@/gi, 'postgresql://***:***@');
}

/**
 * Connect to PostgreSQL database with production-strict fail-fast semantics and transient retry support.
 */
export async function connectDatabase(maxRetries = config.isProduction ? 3 : 1): Promise<void> {
  if (isPostgresConnected) return;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await rawPrisma.$connect();
      await rawPrisma.$queryRaw`SELECT 1`;
      isPostgresConnected = true;
      console.log('✅ PostgreSQL database connected successfully via Prisma ORM.');
      return;
    } catch (error: any) {
      lastError = error;
      isPostgresConnected = false;
      const safeErrorMsg = sanitizeDatabaseError(error);

      if (config.isProduction) {
        console.warn(`⚠️ [RETRY] PostgreSQL connection attempt ${attempt}/${maxRetries} failed: ${safeErrorMsg}`);
        if (attempt < maxRetries) {
          const delayMs = attempt * 1500;
          await new Promise((res) => setTimeout(res, delayMs));
        }
      }
    }
  }

  if (config.isProduction) {
    const safeErrorMsg = sanitizeDatabaseError(lastError);
    console.error('❌ [FATAL] PostgreSQL database is UNREACHABLE in production mode.');
    console.error(`❌ Connection error: ${safeErrorMsg}`);
    throw new Error(`CRITICAL: PostgreSQL database connection failed in production: ${safeErrorMsg}`);
  }

  console.warn('⚠️ [DEV ONLY] PostgreSQL database is offline at localhost:5432; running in development in-memory mode.');
  console.warn('⚠️ [DEV ONLY] Note: Start your local PostgreSQL service or Docker container to enable PostgreSQL persistence.');
}

// Auto-connect on module load so status is established immediately
await connectDatabase();

/**
 * Disconnect from database cleanly.
 */
export async function disconnectDatabase(): Promise<void> {
  if (isPostgresConnected) {
    await rawPrisma.$disconnect();
    console.log('🔌 PostgreSQL database disconnected.');
  }
}

/**
 * Reset memory store and cached client (used in testing or hot-reload scenarios).
 */
export function resetDevMemoryStore(): void {
  for (const store of Object.values(devMemoryStore)) {
    store.clear();
  }
  for (const key of Object.keys(memoryDelegates)) {
    delete memoryDelegates[key];
  }
}
