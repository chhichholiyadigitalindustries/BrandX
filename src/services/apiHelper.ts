import { authApi } from './authApi';

export function getActiveBusinessId(): string | null {
  if (typeof window === 'undefined') return null;
  const directId = localStorage.getItem('brandx_active_business_id');
  if (directId) return directId;

  try {
    const raw =
      localStorage.getItem('brandx_business_profile') ||
      localStorage.getItem('brandx_selected_business');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id) return parsed.id;
    }
  } catch {}

  return null;
}

export function setActiveBusinessId(id: string): void {
  if (typeof window === 'undefined' || !id) return;
  try {
    localStorage.setItem('brandx_active_business_id', id);
  } catch {}
}

export function clearActiveBusinessId(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('brandx_active_business_id');
  } catch {}
}

export async function getStandardHeaders(extraHeaders: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = (await authApi.ensureValidToken()) || authApi.getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const businessId = getActiveBusinessId();
  if (businessId) {
    headers['x-business-id'] = businessId;
  }

  return headers;
}
