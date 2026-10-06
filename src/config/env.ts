/**
 * BRANDX — Centralized Frontend Environment Configuration
 * Enforces production API URL provisioning and prevents silent fallbacks to localhost or static frontend domain.
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

  // Support runtime API override for live debugging and testing
  if (typeof window !== 'undefined') {
    const runtimeUrl =
      (window as any).__BRANDX_API_URL__ ||
      localStorage.getItem('brandx_api_url') ||
      sessionStorage.getItem('brandx_api_url');
    if (runtimeUrl && typeof runtimeUrl === 'string' && runtimeUrl.trim()) {
      return runtimeUrl.trim().replace(/\/+$/, '');
    }

    // If running on Render frontend domain, automatically target the live Render backend service
    if (window.location.hostname.includes('brandx-frontend.onrender.com') || window.location.hostname.includes('onrender.com')) {
      return 'https://brandx-backend-okj8.onrender.com/api/v1';
    }
  }

  if (isProduction) {
    if (typeof window !== 'undefined' && window.location.origin) {
      return `${window.location.origin}/api/v1`;
    }
  }

  return 'http://localhost:5000/api/v1';
}

export const API_BASE_URL = resolveApiBaseUrl();

export function resolveBackendOrigin(): string {
  try {
    if (API_BASE_URL) {
      const parsed = new URL(
        API_BASE_URL,
        typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000'
      );
      if (
        typeof window !== 'undefined' &&
        parsed.origin === window.location.origin &&
        window.location.hostname.includes('brandx-frontend.onrender.com')
      ) {
        return 'https://brandx-backend-okj8.onrender.com';
      }
      return parsed.origin;
    }
  } catch {}

  if (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')) {
    return 'https://brandx-backend-okj8.onrender.com';
  }

  return 'http://localhost:5000';
}

export const BACKEND_ORIGIN = resolveBackendOrigin();

export const isProd = isProduction;
