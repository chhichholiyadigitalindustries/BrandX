/**
 * BRANDX — Digital NFC Visiting Card API Client
 */

import { authApi, ApiResponse } from './authApi';

import { API_BASE_URL } from '../config/env';
const BASE_URL = API_BASE_URL;

export interface BackendDigitalCard {
  id: string;
  businessId: string;
  digitalStoreId?: string | null;
  name: string;
  fullName?: string | null;
  designation?: string | null;
  company: string;
  companyName?: string | null;
  mobile: string;
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  profileImageUrl?: string | null;
  logoUrl?: string | null;
  bio?: string | null;
  slug: string;
  upiId?: string | null;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    youtube?: string;
    linkedin?: string;
    twitter?: string;
    telegram?: string;
    whatsapp?: string;
  } | null;
  qrData?: string | null;
  viewsCount: number;
  theme: string;
  isPublished: boolean;
  digitalStore?: {
    slug: string;
    title: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicCardData {
  id: string;
  slug: string;
  fullName: string;
  designation?: string | null;
  companyName: string;
  phone: string;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  profileImageUrl?: string | null;
  logoUrl?: string | null;
  bio?: string | null;
  upiId?: string | null;
  socialLinks?: Record<string, string> | null;
  theme: string;
  viewsCount: number;
  digitalStoreSlug?: string | null;
  digitalStoreTitle?: string | null;
  business: {
    name?: string;
    city?: string;
    state?: string;
    category?: string;
  };
}

class DigitalCardApi {
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
   * Retrieves current business's Digital Visiting Card
   */
  async getCard(): Promise<ApiResponse<BackendDigitalCard>> {
    const res = await fetch(`${BASE_URL}/digital-card`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return res.json();
  }

  /**
   * Updates card details
   */
  async updateCard(data: Partial<BackendDigitalCard>): Promise<ApiResponse<BackendDigitalCard>> {
    const res = await fetch(`${BASE_URL}/digital-card`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  }

  /**
   * Publishes card
   */
  async publishCard(cardId?: string): Promise<ApiResponse<BackendDigitalCard>> {
    const url = cardId ? `${BASE_URL}/digital-card/${cardId}/publish` : `${BASE_URL}/digital-card/publish`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return res.json();
  }

  /**
   * Unpublishes card
   */
  async unpublishCard(cardId?: string): Promise<ApiResponse<BackendDigitalCard>> {
    const url = cardId ? `${BASE_URL}/digital-card/${cardId}/unpublish` : `${BASE_URL}/digital-card/unpublish`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return res.json();
  }

  /**
   * Retrieves public published card by slug (no auth required)
   */
  async getPublicCard(slug: string): Promise<ApiResponse<PublicCardData>> {
    const res = await fetch(`${BASE_URL}/public/card/${encodeURIComponent(slug)}`, {
      method: 'GET',
    });
    return res.json();
  }

  /**
   * Returns direct download URL for vCard .vcf
   */
  getVCardDownloadUrl(slug: string): string {
    return `${BASE_URL}/public/card/${encodeURIComponent(slug)}/vcard`;
  }
}

export const digitalCardApi = new DigitalCardApi();
