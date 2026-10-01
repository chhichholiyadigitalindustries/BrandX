import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

export interface UploadOptions {
  fileName: string;
  buffer: Buffer;
  mimeType: string;
  folder?: string;
}

export interface StorageProvider {
  uploadFile(options: UploadOptions): Promise<{ url: string; key: string }>;
  deleteFile(key: string): Promise<boolean>;
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
  const randomSuffix = crypto.randomBytes(4).toString('hex'); // 8 hex characters e.g. 'a8f3c91d'
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

  public async uploadFile(options: UploadOptions): Promise<{ url: string; key: string }> {
    // 1. Generate strictly sanitized, server-side filename (never uses user-provided basename)
    const safeName = generateSafeFileName(options.mimeType, options.fileName);

    // 2. Sanitize destination folder
    const cleanFolder = sanitizeFolder(options.folder);

    // 3. Resolve destination directory and enforce storage-root containment
    const targetFolder = cleanFolder ? path.join(this.uploadsDir, cleanFolder) : this.uploadsDir;
    const resolvedTarget = path.resolve(targetFolder);
    const resolvedRoot = path.resolve(this.uploadsDir);

    if (!resolvedTarget.startsWith(resolvedRoot)) {
      throw new Error('Security Error: Upload directory escapes storage root');
    }

    if (!fs.existsSync(resolvedTarget)) {
      fs.mkdirSync(resolvedTarget, { recursive: true });
    }

    // 4. Resolve full file destination and verify containment
    const filePath = path.join(resolvedTarget, safeName);
    const resolvedFilePath = path.resolve(filePath);

    if (!resolvedFilePath.startsWith(resolvedTarget)) {
      throw new Error('Security Error: Upload file path escapes target directory');
    }

    await fs.promises.writeFile(resolvedFilePath, options.buffer);

    const key = cleanFolder ? `${cleanFolder}/${safeName}` : safeName;
    const url = `/uploads/${key}`;

    logger.info(`File uploaded locally: ${url}`);
    return { url, key };
  }

  public async deleteFile(key: string): Promise<boolean> {
    try {
      const cleanKey = key
        .replace(/%2e/gi, '.')
        .replace(/%2f/gi, '/')
        .replace(/%5c/gi, '\\')
        .replace(/\0/g, '')
        .replace(/[/\\]+/g, path.sep);

      const filePath = path.join(this.uploadsDir, cleanKey);
      const resolvedPath = path.resolve(filePath);
      const resolvedRoot = path.resolve(this.uploadsDir);

      if (!resolvedPath.startsWith(resolvedRoot)) {
        logger.warn(`Security Warning: attempt to delete file outside storage root: ${key}`);
        return false;
      }

      if (fs.existsSync(resolvedPath)) {
        await fs.promises.unlink(resolvedPath);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Error deleting local file ${key}:`, error);
      return false;
    }
  }
}

export const storageProvider: StorageProvider = new LocalStorageProvider();
