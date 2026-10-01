/**
 * BRANDX — Centralized Frontend Environment Configuration
 * Enforces production API URL provisioning and prevents silent fallbacks to localhost.
 */

const rawApiUrl =
  (typeof import.meta !== 'undefined' &&
    (import.meta.env?.VITE_API_URL || import.meta.env?.VITE_API_BASE_URL)) ||
  '';

const isProduction =
  typeof import.meta !== 'undefined' &&
  (import.meta.env?.PROD === true || import.meta.env?.MODE === 'production');

function resolveApiBaseUrl(): string {
  if (rawApiUrl && rawApiUrl.trim()) {
    // Strip trailing slash if present
    return rawApiUrl.trim().replace(/\/+$/, '');
  }

  if (isProduction) {
    console.error(
      '[CRITICAL] VITE_API_URL is missing in production build! API requests will fail unless configured.'
    );
    // In production, never silently fall back to localhost
    return window.location.origin ? `${window.location.origin}/api/v1` : '';
  }

  return 'http://localhost:5000/api/v1';
}

export const API_BASE_URL = resolveApiBaseUrl();

export const isProd = isProduction;
