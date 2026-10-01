/**
 * BRANDX — Slug Generation & Validation Engine
 * Generates URL-safe, collision-free, stable public slugs for Digital Dukaan & NFC Cards.
 */

export const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'public',
  'store',
  'card',
  'auth',
  'login',
  'logout',
  'register',
  'signup',
  'brandx',
  'app',
  'settings',
  'null',
  'undefined',
  'root',
  'help',
  'support',
  'contact',
  'terms',
  'privacy',
  'dashboard',
  'portal',
  'user',
  'users',
  'billing',
  'invoices',
  'products',
  'khata',
  'vcard',
  'qr',
]);

/**
 * Normalizes raw string into a clean URL-safe slug.
 */
export function sanitizeSlug(input: string): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .trim()
    .normalize('NFKD') // Normalize accented characters
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphen
    .replace(/^-+|-+$/g, '') // Trim leading/trailing hyphens
    .replace(/-{2,}/g, '-'); // Collapse consecutive hyphens
}

/**
 * Checks if a slug is valid and not reserved.
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length < 2 || slug.length > 60) return false;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return false;
  if (RESERVED_SLUGS.has(slug)) return false;
  return true;
}

/**
 * Generates a collision-safe slug using an existence checker callback.
 * If base slug exists, iterates: base-2, base-3, ...
 */
export async function generateUniqueSlug(
  baseText: string,
  isSlugTaken: (slug: string) => Promise<boolean>,
  currentId?: string
): Promise<string> {
  let base = sanitizeSlug(baseText);

  // If base is empty or reserved, provide a prefix
  if (!base || RESERVED_SLUGS.has(base)) {
    base = `store-${base || Math.floor(1000 + Math.random() * 9000)}`;
  }

  // Ensure maximum length before appending suffixes
  if (base.length > 45) {
    base = base.substring(0, 45).replace(/-+$/, '');
  }

  // Check initial slug
  const initialTaken = await isSlugTaken(base);
  if (!initialTaken) {
    return base;
  }

  // Iterate with numeric suffix
  let counter = 2;
  while (counter <= 1000) {
    const candidate = `${base}-${counter}`;
    const taken = await isSlugTaken(candidate);
    if (!taken) {
      return candidate;
    }
    counter++;
  }

  // Fallback random hash
  return `${base}-${Date.now().toString(36)}`;
}
