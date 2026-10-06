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
  if (!trimmed || trimmed.startsWith('role:')) {
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
  let resolved = '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    resolved = trimmed;
  } else if (trimmed.startsWith('/uploads/')) {
    // 6. Handle /uploads/... or uploads/...
    resolved = `${origin}${trimmed}`;
  } else if (trimmed.startsWith('uploads/')) {
    resolved = `${origin}/${trimmed}`;
  } else if (trimmed.startsWith('/api/v1/')) {
    // 7. Handle /api/v1/... or api/v1/...
    resolved = `${origin}${trimmed}`;
  } else if (trimmed.startsWith('api/v1/')) {
    resolved = `${origin}/${trimmed}`;
  } else if (trimmed.startsWith('/media/')) {
    // 8. Handle /media/... or media/...
    resolved = `${origin}/api/v1${trimmed}`;
  } else if (trimmed.startsWith('media/')) {
    resolved = `${origin}/api/v1/${trimmed}`;
  } else {
    // 9. Handle MediaAsset database keys (folder/filename)
    const isMediaKey = /^(daily-content|daily-status|posters|festivals|logos|avatars|announcements|general)\/[a-zA-Z0-9_.-]+$/i.test(trimmed);
    // 10. Handle MediaAsset UUID identifiers
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);

    if (isMediaKey || isUuid) {
      resolved = `${origin}/api/v1/media/${trimmed}`;
    } else if (trimmed.startsWith('/')) {
      // 11. Generic relative path starting with /
      resolved = `${origin}${trimmed}`;
    } else {
      // 12. Fallback
      resolved = `${origin}/${trimmed}`;
    }
  }

  // Diagnostics logging
  if (typeof window !== 'undefined' && ((window as any).__BRANDX_DEBUG_IMAGES__ || import.meta.env?.DEV)) {
    console.debug(`[IMAGE_RESOLVE] input=${trimmed} backend=${origin} output=${resolved}`);
  }

  return resolved;
}
