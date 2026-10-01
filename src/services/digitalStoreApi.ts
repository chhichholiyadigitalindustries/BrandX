/**
 * BRANDX — Digital Store (Dukaan) API Client
 */

import { authApi, ApiResponse } from './authApi';

import { API_BASE_URL } from '../config/env';
const BASE_URL = API_BASE_URL;

export interface BackendDigitalStoreItem {
  id: string;
  storeId: string;
  productId: string | null;
  name: string;
  displayName?: string | null;
  price: number;
  displayPrice?: number | null;
  originalPrice?: number | null;
  description?: string | null;
  imageUrl?: string | null;
  category: string;
  isAvailable: boolean;
  isVisible: boolean;
  sortOrder: number;
  currentStock?: number | null;
  unit?: string;
  product?: {
    id: string;
    name: string;
    sellingPrice: any;
    mrp: any;
    currentStock: number;
    unit: string;
    imageUrl: string | null;
    isActive: boolean;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackendDigitalStore {
  id: string;
  businessId: string;
  slug: string;
  title: string;
  tagline?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  phone: string;
  whatsappNumber?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  mapUrl?: string | null;
  websiteUrl?: string | null;
  website?: string | null;
  upiId?: string | null;
  businessHours?: string | null;
  googleReviewUrl?: string | null;
  instagram?: string | null;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    youtube?: string;
    linkedin?: string;
    twitter?: string;
    telegram?: string;
    whatsapp?: string;
  } | null;
  theme: string;
  viewsCount: number;
  isPublished: boolean;
  items: BackendDigitalStoreItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PublicStoreData {
  id: string;
  slug: string;
  title: string;
  tagline?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  phone: string;
  whatsappNumber?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  mapUrl?: string | null;
  websiteUrl?: string | null;
  upiId?: string | null;
  businessHours?: string | null;
  googleReviewUrl?: string | null;
  socialLinks?: Record<string, string> | null;
  theme: string;
  viewsCount: number;
  business: {
    name?: string;
    city?: string;
    state?: string;
    category?: string;
  };
  items: {
    id: string;
    productId?: string | null;
    name: string;
    price: number;
    originalPrice?: number | null;
    description?: string | null;
    imageUrl?: string | null;
    category: string;
    isAvailable: boolean;
    currentStock?: number | null;
    unit?: string;
    sortOrder: number;
  }[];
}

class DigitalStoreApi {
  private getHeaders(): HeadersInit {
    const token = authApi.getAccessToken();
    const activeBizId = typeof window !== 'undefined' ? localStorage.getItem('brandx_active_business_id') : null;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (activeBizId) headers['x-business-id'] = activeBizId;
    return headers;
  }

  /**
   * Retrieves the current business's Digital Store
   */
  async getStore(): Promise<ApiResponse<BackendDigitalStore>> {
    const res = await fetch(`${BASE_URL}/digital-store`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return res.json();
  }

  /**
   * Updates store settings
   */
  async updateStore(data: Partial<BackendDigitalStore>): Promise<ApiResponse<BackendDigitalStore>> {
    const res = await fetch(`${BASE_URL}/digital-store`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  }

  /**
   * Publishes store
   */
  async publishStore(storeId?: string): Promise<ApiResponse<BackendDigitalStore>> {
    const url = storeId ? `${BASE_URL}/digital-store/${storeId}/publish` : `${BASE_URL}/digital-store/publish`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return res.json();
  }

  /**
   * Unpublishes store
   */
  async unpublishStore(storeId?: string): Promise<ApiResponse<BackendDigitalStore>> {
    const url = storeId ? `${BASE_URL}/digital-store/${storeId}/unpublish` : `${BASE_URL}/digital-store/unpublish`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return res.json();
  }

  /**
   * Adds an item to the store showcase
   */
  async addStoreItem(item: {
    productId?: string;
    name: string;
    displayName?: string;
    price: number;
    displayPrice?: number;
    originalPrice?: number;
    description?: string;
    imageUrl?: string;
    category?: string;
    isAvailable?: boolean;
    isVisible?: boolean;
    sortOrder?: number;
  }): Promise<ApiResponse<BackendDigitalStoreItem>> {
    const res = await fetch(`${BASE_URL}/digital-store/items`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(item),
    });
    return res.json();
  }

  /**
   * Updates a showcase item
   */
  async updateStoreItem(
    itemId: string,
    data: Partial<BackendDigitalStoreItem>
  ): Promise<ApiResponse<BackendDigitalStoreItem>> {
    const res = await fetch(`${BASE_URL}/digital-store/items/${itemId}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  }

  /**
   * Removes an item from the showcase (preserves master product)
   */
  async deleteStoreItem(itemId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    const res = await fetch(`${BASE_URL}/digital-store/items/${itemId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return res.json();
  }

  /**
   * Reorders items
   */
  async reorderStoreItems(items: { id: string; sortOrder: number }[]): Promise<ApiResponse<any>> {
    const res = await fetch(`${BASE_URL}/digital-store/items/reorder`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ items }),
    });
    return res.json();
  }

  /**
   * Retrieves public published store by slug (no auth required)
   */
  async getPublicStore(slug: string): Promise<ApiResponse<PublicStoreData>> {
    const res = await fetch(`${BASE_URL}/public/store/${encodeURIComponent(slug)}`, {
      method: 'GET',
    });
    return res.json();
  }
}

export const digitalStoreApi = new DigitalStoreApi();
