/**
 * BrandX IndexedDB Storage Engine
 * Provides high-capacity, offline-first persistent storage for Vyapari data:
 * Invoices, Customer Khata, Dukan Kharcha (Expenses), and Product Catalog.
 */

const DB_NAME = 'brandx_db';
const DB_VERSION = 1;

export const STORES = {
  BUSINESS: 'business_profile',
  INVOICES: 'invoices',
  CUSTOMERS: 'khata_customers',
  PRODUCTS: 'store_products',
  EXPENSES: 'expenses',
  SETTINGS: 'app_settings',
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Initializes the IndexedDB database with necessary object stores.
 */
export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Single business profile (key: 'profile')
      if (!db.objectStoreNames.contains(STORES.BUSINESS)) {
        db.createObjectStore(STORES.BUSINESS);
      }

      // Invoices
      if (!db.objectStoreNames.contains(STORES.INVOICES)) {
        db.createObjectStore(STORES.INVOICES, { keyPath: 'invoiceNumber' });
      }

      // Khata Customers
      if (!db.objectStoreNames.contains(STORES.CUSTOMERS)) {
        db.createObjectStore(STORES.CUSTOMERS, { keyPath: 'id' });
      }

      // Products with barcode lookup
      if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
        const prodStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
        prodStore.createIndex('barcode', 'barcode', { unique: false });
      }

      // Expenses
      if (!db.objectStoreNames.contains(STORES.EXPENSES)) {
        const expStore = db.createObjectStore(STORES.EXPENSES, { keyPath: 'id' });
        expStore.createIndex('category', 'category', { unique: false });
        expStore.createIndex('date', 'date', { unique: false });
      }

      // Generic Settings (API Keys, etc.)
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('BrandX IndexedDB Error:', request.error);
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * Generic helper to read a single item
 */
export async function dbGet<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn(`IndexedDB dbGet failed for ${storeName}:`, e);
    return null;
  }
}

/**
 * Generic helper to save or update an item
 */
export async function dbPut<T>(storeName: string, value: T, key?: IDBValidKey): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = key !== undefined ? store.put(value, key) : store.put(value);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn(`IndexedDB dbPut failed for ${storeName}:`, e);
  }
}

/**
 * Generic helper to read all items from a store
 */
export async function dbGetAll<T>(storeName: string): Promise<T[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn(`IndexedDB dbGetAll failed for ${storeName}:`, e);
    return [];
  }
}

/**
 * Generic helper to bulk set all items in a store
 */
export async function dbBulkPut<T>(storeName: string, items: T[]): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.clear();
      items.forEach((item) => store.put(item));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn(`IndexedDB dbBulkPut failed for ${storeName}:`, e);
  }
}

/**
 * Delete a specific item
 */
export async function dbDelete(storeName: string, key: IDBValidKey): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn(`IndexedDB dbDelete failed for ${storeName}:`, e);
  }
}

/**
 * Synchronizes and migrates localStorage data into IndexedDB on first load.
 */
export async function migrateFromLocalStorage(): Promise<void> {
  try {
    // Customers
    const localCust = localStorage.getItem('brandx_khata_customers');
    if (localCust) {
      const parsed = JSON.parse(localCust);
      if (Array.isArray(parsed) && parsed.length > 0) {
        await dbBulkPut(STORES.CUSTOMERS, parsed);
      }
    }

    // Products
    const localProd = localStorage.getItem('brandx_store_products');
    if (localProd) {
      const parsed = JSON.parse(localProd);
      if (Array.isArray(parsed) && parsed.length > 0) {
        await dbBulkPut(STORES.PRODUCTS, parsed);
      }
    }

    // Expenses
    const localExp = localStorage.getItem('brandx_expenses');
    if (localExp) {
      const parsed = JSON.parse(localExp);
      if (Array.isArray(parsed) && parsed.length > 0) {
        await dbBulkPut(STORES.EXPENSES, parsed);
      }
    }

    // Business Profile
    const localBiz = localStorage.getItem('brandx_business_profile');
    if (localBiz) {
      await dbPut(STORES.BUSINESS, JSON.parse(localBiz), 'current');
    }
  } catch (e) {
    console.warn('Migration from localStorage to IndexedDB encountered an issue:', e);
  }
}

/**
 * Purge all data from IndexedDB on user logout for tenant isolation
 */
export async function clearAllStores(): Promise<void> {
  try {
    const db = await getDB();
    const storeNames = [
      STORES.BUSINESS,
      STORES.INVOICES,
      STORES.CUSTOMERS,
      STORES.PRODUCTS,
      STORES.EXPENSES,
      STORES.SETTINGS,
    ];
    for (const name of storeNames) {
      if (db.objectStoreNames.contains(name)) {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(name, 'readwrite');
          const store = tx.objectStore(name);
          const req = store.clear();
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      }
    }
  } catch (e) {
    console.warn('Failed to clear IndexedDB stores:', e);
  }
}
