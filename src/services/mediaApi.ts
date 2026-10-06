/**
 * BRANDX — Centralized Media API Service
 * Handles authenticated uploads of business logos, profile photos, and marketing assets
 * directly to the PostgreSQL MediaAsset storage pipeline.
 */

import { API_BASE_URL } from '../config/env';
import { authApi } from './authApi';

export interface MediaUploadResult {
  url: string;
  key: string;
  id: string;
  mimeType: string;
  sizeBytes: number;
}

export const mediaApi = {
  /**
   * Upload an image file to the permanent MediaAsset database storage
   */
  async uploadImage(
    file: File,
    folder: 'logos' | 'avatars' | 'daily-status' | 'posters' | 'festivals' | 'announcements' | 'general' = 'general',
    entityType?: string,
    entityId?: string
  ): Promise<MediaUploadResult> {
    if (!file || !file.type.startsWith('image/')) {
      throw new Error('Please select a valid image file (.png, .jpg, .webp)');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error('Image file exceeds maximum allowed size of 10MB');
    }

    // Read as Base64 Data URL
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });

    // Get Auth Token: try user token first, then admin token from localStorage
    let token = authApi.getAccessToken();
    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('brandx_admin_token') || sessionStorage.getItem('brandx_admin_token');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/media/upload`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        imageBase64: base64Data,
        fileName: file.name,
        mimeType: file.type,
        folder,
        entityType,
        entityId,
      }),
    });

    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.success) {
      throw new Error(json?.error?.message || json?.message || 'Failed to upload image to backend');
    }

    return json.data;
  },
};
