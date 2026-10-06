import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import { prisma } from '../config/database.js';

export interface UploadOptions {
  fileName: string;
  buffer: Buffer;
  mimeType: string;
  folder?: string;
  entityType?: string;
  entityId?: string;
}

export interface MediaAssetResult {
  url: string;
  key: string;
  id: string;
  mimeType: string;
  sizeBytes: number;
}

export interface StorageProvider {
  uploadFile(options: UploadOptions): Promise<MediaAssetResult>;
  deleteFile(keyOrId: string): Promise<boolean>;
  getMediaAsset(keyOrId: string): Promise<{ buffer: Buffer; mimeType: string; fileName: string; id: string; key: string } | null>;
}

// Canonical MIME type to safe extension map
const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
};

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif', 'pdf']);

/**
 * Validates and extracts a canonical file extension strictly based on MIME type or safe fallback
 */
export function getValidatedExtension(mimeType: string, rawFileName?: string): string {
  const normalizedMime = (mimeType || '').trim().toLowerCase();
  if (MIME_EXTENSION_MAP[normalizedMime]) {
    return MIME_EXTENSION_MAP[normalizedMime];
  }

  // Fallback: only if mimeType is generic, inspect sanitized raw filename extension
  if (rawFileName) {
    const cleanRaw = rawFileName
      .replace(/%2e/gi, '.')
      .replace(/\0/g, '')
      .replace(/[\x00-\x1F\x7F]/g, '');

    const match = cleanRaw.match(/\.([a-zA-Z0-9]{1,10})$/);
    if (match) {
      const ext = match[1].toLowerCase();
      if (ALLOWED_EXTENSIONS.has(ext)) {
        return ext === 'jpeg' ? 'jpg' : ext;
      }
    }
  }

  throw new Error(`Unsupported or disallowed file MIME type: ${mimeType || 'unknown'}`);
}

/**
 * Generates an unforgeable, server-side filename that completely strips all user-provided
 * basename characters, eliminating path traversal, control characters, and length vulnerabilities.
 * Format: <timestamp>_<8-char-hex-random>.<validated-extension>
 * Example: 1790803210007_a8f3c91d.png
 */
export function generateSafeFileName(mimeType: string, rawFileName: string): string {
  const extension = getValidatedExtension(mimeType, rawFileName);
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(4).toString('hex'); // 8 hex characters
  return `${timestamp}_${randomSuffix}.${extension}`;
}

/**
 * Sanitizes destination folder to strictly prohibit path traversal outside root
 */
export function sanitizeFolder(folder?: string): string {
  if (!folder) return '';
  return folder
    .replace(/%2e/gi, '.')
    .replace(/%2f/gi, '/')
    .replace(/%5c/gi, '\\')
    .replace(/\0/g, '')
    .replace(/[/\\]+/g, '/')
    .split('/')
    .filter((segment) => segment && segment !== '.' && segment !== '..' && /^[a-zA-Z0-9_-]+$/.test(segment))
    .join('/');
}

export class LocalStorageProvider implements StorageProvider {
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  public async uploadFile(options: UploadOptions): Promise<MediaAssetResult> {
    const startTimestamp = Date.now();
    logger.info(`[MEDIA_UPLOAD_START] Starting media upload: fileName="${options.fileName}", mimeType="${options.mimeType}", size=${options.buffer?.length}B, folder="${options.folder || 'general'}"`);

    if (!options.buffer || options.buffer.length === 0) {
      logger.error('[MEDIA_UPLOAD_FAILURE] File buffer is empty');
      throw new Error('Image file buffer is empty');
    }

    if (options.buffer.length > 10 * 1024 * 1024) {
      logger.error(`[MEDIA_UPLOAD_FAILURE] File size ${options.buffer.length} exceeds 10MB limit`);
      throw new Error('Image file exceeds maximum allowed size of 10MB');
    }

    // 1. Generate strictly sanitized, server-side filename
    const safeName = generateSafeFileName(options.mimeType, options.fileName);

    // 2. Sanitize destination folder
    const cleanFolder = sanitizeFolder(options.folder);

    // 3. Key identification
    const key = cleanFolder ? `${cleanFolder}/${safeName}` : safeName;

    // 4. Resolve destination directory for local disk cache
    const targetFolder = cleanFolder ? path.join(this.uploadsDir, cleanFolder) : this.uploadsDir;
    const resolvedTarget = path.resolve(targetFolder);
    const resolvedRoot = path.resolve(this.uploadsDir);

    if (!resolvedTarget.startsWith(resolvedRoot)) {
      logger.error('[MEDIA_UPLOAD_FAILURE] Directory escapes storage root');
      throw new Error('Security Error: Upload directory escapes storage root');
    }

    if (!fs.existsSync(resolvedTarget)) {
      fs.mkdirSync(resolvedTarget, { recursive: true });
    }

    const filePath = path.join(resolvedTarget, safeName);
    const resolvedFilePath = path.resolve(filePath);

    if (!resolvedFilePath.startsWith(resolvedTarget)) {
      logger.error('[MEDIA_UPLOAD_FAILURE] File path escapes target directory');
      throw new Error('Security Error: Upload file path escapes target directory');
    }

    // 5. Write to local disk cache (non-critical, cache-only)
    try {
      await fs.promises.writeFile(resolvedFilePath, options.buffer);
    } catch (diskErr) {
      logger.warn(`Failed to write local disk cache for ${key}:`, diskErr);
    }

    // 6. PERMANENT SOURCE OF TRUTH: Persist binary bytes into PostgreSQL MediaAsset table
    let savedAsset: any;
    try {
      savedAsset = await prisma.mediaAsset.upsert({
        where: { key },
        create: {
          key,
          fileName: safeName,
          mimeType: options.mimeType,
          sizeBytes: options.buffer.length,
          data: options.buffer,
        },
        update: {
          fileName: safeName,
          mimeType: options.mimeType,
          sizeBytes: options.buffer.length,
          data: options.buffer,
        },
      });
      logger.info(`[MEDIA_UPLOAD_SUCCESS] File permanently persisted in PostgreSQL MediaAsset: id="${savedAsset.id}", key="${key}", sizeBytes=${options.buffer.length}, durationMs=${Date.now() - startTimestamp}`);
    } catch (dbErr: any) {
      logger.error(`[MEDIA_UPLOAD_FAILURE] Critical error saving MediaAsset into database for ${key}:`, dbErr);
      throw new Error(`Permanent media storage failed: ${dbErr?.message || 'Database error'}`);
    }

    // Return the permanent, backend-routed API URL
    const url = `/api/v1/media/${key}`;
    return {
      url,
      key,
      id: savedAsset.id,
      mimeType: options.mimeType,
      sizeBytes: options.buffer.length,
    };
  }

  public async getMediaAsset(keyOrId: string): Promise<{ buffer: Buffer; mimeType: string; fileName: string; id: string; key: string } | null> {
    if (!keyOrId || typeof keyOrId !== 'string') return null;

    logger.debug(`[MEDIA_FETCH] Requested media: "${keyOrId}"`);

    const cleanInput = keyOrId
      .replace(/%2e/gi, '.')
      .replace(/%2f/gi, '/')
      .replace(/%5c/gi, '\\')
      .replace(/\0/g, '')
      .replace(/^\/+/, '')
      .trim();

    if (!cleanInput) return null;

    // 1. Check local disk cache first if cleanInput matches file path
    const filePath = path.join(this.uploadsDir, cleanInput.replace(/[/\\]+/g, path.sep));
    const resolvedPath = path.resolve(filePath);
    const resolvedRoot = path.resolve(this.uploadsDir);

    if (resolvedPath.startsWith(resolvedRoot) && fs.existsSync(resolvedPath)) {
      try {
        const stats = await fs.promises.stat(resolvedPath);
        if (stats.isFile()) {
          const buffer = await fs.promises.readFile(resolvedPath);
          const ext = path.extname(cleanInput).replace('.', '').toLowerCase();
          let mimeType = 'image/png';
          if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
          else if (ext === 'webp') mimeType = 'image/webp';
          else if (ext === 'svg') mimeType = 'image/svg+xml';
          else if (ext === 'gif') mimeType = 'image/gif';
          else if (ext === 'pdf') mimeType = 'application/pdf';

          return {
            buffer,
            mimeType,
            fileName: path.basename(cleanInput),
            id: cleanInput,
            key: cleanInput.replace(/\\/g, '/'),
          };
        }
      } catch (err) {
        logger.warn(`Error reading disk cache for ${cleanInput}, falling back to PostgreSQL:`, err);
      }
    }

    // 2. Query permanent PostgreSQL MediaAsset table (Source of Truth)
    try {
      const normalizedKey = cleanInput.replace(/\\/g, '/');

      // Match by exact key, UUID id, endsWith key, or fileName
      const asset = await prisma.mediaAsset.findFirst({
        where: {
          OR: [
            { key: normalizedKey },
            { id: normalizedKey },
            { key: { endsWith: normalizedKey } },
            { fileName: normalizedKey },
            { key: `daily-content/${normalizedKey}` },
            { key: `daily-status/${normalizedKey}` },
            { key: `posters/${normalizedKey}` },
            { key: `logos/${normalizedKey}` },
            { key: `avatars/${normalizedKey}` },
          ],
        },
      });

      if (asset && asset.data) {
        const buffer = Buffer.from(asset.data);
        logger.info(`[MEDIA_FETCH_REHYDRATED] Rehydrated media from PostgreSQL: id="${asset.id}", key="${asset.key}", mimeType="${asset.mimeType}", size=${buffer.length}B`);

        // Heal local disk cache asynchronously
        const diskTarget = path.join(this.uploadsDir, asset.key.replace(/[/\\]+/g, path.sep));
        const resolvedDiskTarget = path.resolve(diskTarget);
        if (resolvedDiskTarget.startsWith(resolvedRoot)) {
          const parentDir = path.dirname(resolvedDiskTarget);
          fs.promises
            .mkdir(parentDir, { recursive: true })
            .then(() => fs.promises.writeFile(resolvedDiskTarget, buffer))
            .catch(() => null);
        }

        return {
          buffer,
          mimeType: asset.mimeType,
          fileName: asset.fileName,
          id: asset.id,
          key: asset.key,
        };
      }
    } catch (dbErr) {
      logger.error(`Error querying MediaAsset for ${cleanInput}:`, dbErr);
    }

    logger.warn(`[MEDIA_FETCH_NOT_FOUND] Media not found for identifier: "${cleanInput}"`);
    return null;
  }

  public async deleteFile(keyOrId: string): Promise<boolean> {
    try {
      const cleanInput = keyOrId
        .replace(/%2e/gi, '.')
        .replace(/%2f/gi, '/')
        .replace(/%5c/gi, '\\')
        .replace(/\0/g, '')
        .replace(/^\/+/, '')
        .trim();

      const normalizedKey = cleanInput.replace(/\\/g, '/');

      // Remove from disk cache
      const filePath = path.join(this.uploadsDir, cleanInput.replace(/[/\\]+/g, path.sep));
      const resolvedPath = path.resolve(filePath);
      const resolvedRoot = path.resolve(this.uploadsDir);

      if (resolvedPath.startsWith(resolvedRoot) && fs.existsSync(resolvedPath)) {
        await fs.promises.unlink(resolvedPath).catch(() => null);
      }

      // Remove from PostgreSQL
      await prisma.mediaAsset.deleteMany({
        where: {
          OR: [
            { key: normalizedKey },
            { id: normalizedKey },
          ],
        },
      }).catch(() => null);

      return true;
    } catch (error) {
      logger.error(`Error deleting file ${keyOrId}:`, error);
      return false;
    }
  }
}

export const storageProvider: StorageProvider = new LocalStorageProvider();
