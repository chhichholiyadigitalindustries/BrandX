import { BACKEND_ORIGIN } from '../config/env';

/**
 * BRANDX — Centralized Image & Media URL Resolution Utility
 * 
 * Ensures all images and media assets load seamlessly across both local development
 * and production Render environments.
 * 
 * Correctly handles:
 * - In-memory previews (data: URLs and blob: URLs)
 * - Frontend static assets (/brandx-logo.png, /pwa-..., /assets/...)
 * - Relative backend paths (/uploads/..., uploads/..., /api/v1/..., /media/...)
 * - MediaAsset database keys (daily-content/..., logos/..., posters/..., etc.)
 * - MediaAsset UUID identifiers
 * - Stored dev localhost URLs that need rewriting against live production backend
 * - Absolute remote URLs (CDN, S3, Firebase Storage)
 * - Safe handling of null, undefined, and empty inputs
 */
export function resolveImageUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return '';
  }

  // 1. In-memory client-side preview URLs
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // 2. Static frontend assets (served from frontend public/ folder)
  const isFrontendAsset =
    trimmed === '/brandx-logo.png' ||
    trimmed === 'brandx-logo.png' ||
    trimmed.startsWith('/pwa-') ||
    trimmed.startsWith('pwa-') ||
    trimmed.startsWith('/apple-touch-icon') ||
    trimmed.startsWith('/playstore-feature-graphic') ||
    trimmed.startsWith('/icon.svg') ||
    trimmed === '/favicon.ico' ||
    trimmed === 'favicon.ico' ||
    trimmed.startsWith('/assets/');

  if (isFrontendAsset) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  // Live backend origin (e.g., https://brandx-backend-okj8.onrender.com or http://localhost:5000)
  const origin = BACKEND_ORIGIN.replace(/\/+$/, '');

  // 3. Rewrite accidental frontend domain media URLs (e.g. https://brandx-frontend.onrender.com/uploads/...)
  if (trimmed.includes('brandx-frontend.onrender.com')) {
    const pathPart = trimmed.replace(/^https?:\/\/[^/]+/, '');
    if (pathPart && !isFrontendAsset) {
      return `${origin}${pathPart.startsWith('/') ? pathPart : '/' + pathPart}`;
    }
  }

  // 4. Rewrite stored localhost / private IP URLs if frontend is connected to a remote production backend
  if (
    trimmed.includes('localhost:') ||
    trimmed.includes('127.0.0.1:') ||
    trimmed.includes('10.248.105.')
  ) {
    if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      const pathPart = trimmed.replace(/^https?:\/\/[^/]+/, '');
      return `${origin}${pathPart.startsWith('/') ? pathPart : '/' + pathPart}`;
    }
  }

  // 5. If already an absolute HTTP/HTTPS URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // 6. Handle /uploads/... or uploads/...
  if (trimmed.startsWith('/uploads/')) {
    return `${origin}${trimmed}`;
  }
  if (trimmed.startsWith('uploads/')) {
    return `${origin}/${trimmed}`;
  }

  // 7. Handle /api/v1/... or api/v1/...
  if (trimmed.startsWith('/api/v1/')) {
    return `${origin}${trimmed}`;
  }
  if (trimmed.startsWith('api/v1/')) {
    return `${origin}/${trimmed}`;
  }

  // 8. Handle /media/... or media/...
  if (trimmed.startsWith('/media/')) {
    return `${origin}/api/v1${trimmed}`;
  }
  if (trimmed.startsWith('media/')) {
    return `${origin}/api/v1/${trimmed}`;
  }

  // 9. Handle MediaAsset database keys (folder/filename)
  const isMediaKey = /^(daily-content|daily-status|posters|festivals|logos|avatars|announcements|general)\/[a-zA-Z0-9_.-]+$/i.test(trimmed);
  if (isMediaKey) {
    return `${origin}/api/v1/media/${trimmed}`;
  }

  // 10. Handle MediaAsset UUID identifiers (e.g., a5b268ff-cda5-48e4-b163-6d3eb2421fa7)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
  if (isUuid) {
    return `${origin}/api/v1/media/${trimmed}`;
  }

  // 11. Generic relative path starting with /
  if (trimmed.startsWith('/')) {
    return `${origin}${trimmed}`;
  }

  // 12. Fallback
  return `${origin}/${trimmed}`;
}
