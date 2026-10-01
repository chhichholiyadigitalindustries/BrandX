/**
 * BRANDX — Unified REST API Authentication Service
 * Connects BrandX Frontend to BrandX Backend (PostgreSQL + Express + Prisma)
 */

import { firebaseAuthService } from './firebaseAuthService';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: string;
}

export interface BackendUser {
  id: string;
  name: string;
  mobile: string;
  email?: string | null;
  profileImage?: string | null;
  language?: string;
  isPro?: boolean;
  status?: string;
}

export interface BackendBusiness {
  id: string;
  ownerId: string;
  name: string;
  ownerName: string;
  mobile: string;
  email?: string | null;
  category: string;
  gstin?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  upiId?: string | null;
  logoUrl?: string | null;
}

export interface AuthResponseData {
  user: BackendUser;
  primaryBusiness?: BackendBusiness | null;
  tokens: AuthTokens;
  isNewUser?: boolean;
}

export interface RegisterPayload {
  name: string;
  mobile: string;
  email?: string;
  password?: string;
  businessName?: string;
  businessCategory?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    details?: any;
  };
}

import { API_BASE_URL } from '../config/env';


const ACCESS_TOKEN_KEY = 'brandx_access_token';
const REFRESH_TOKEN_KEY = 'brandx_refresh_token';
const USER_PROFILE_KEY = 'brandx_user_profile';

class AuthApiService {
  private baseUrl: string;
  private tokenExchangePromise: Promise<string | null> | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  // -------------------------------------------------------------
  // Token and Local Session Management
  // -------------------------------------------------------------
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return (
      localStorage.getItem(ACCESS_TOKEN_KEY) ||
      localStorage.getItem('brandx_jwt') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('token')
    );
  }

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  getStoredUser(): BackendUser | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(USER_PROFILE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  setSession(tokens: AuthTokens, user?: BackendUser): void {
    if (typeof window === 'undefined') return;
    if (tokens.accessToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
      localStorage.setItem('brandx_jwt', tokens.accessToken);
    }
    if (tokens.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    }
    if (user) {
      localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(user));
    }
  }

  clearSession(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem('brandx_jwt');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_PROFILE_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Checks whether a JWT is expired (decoding exp claim without external dependencies)
   */
  isTokenExpired(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);
      if (!payload.exp) return false;
      // Mark as expired if less than 30s remaining
      return Date.now() >= payload.exp * 1000 - 30000;
    } catch {
      return false;
    }
  }

  /**
   * Ensures a valid BrandX Backend JWT is available.
   * If token is missing or expired:
   * 1. Attempts token refresh via refreshToken().
   * 2. If refresh token is missing or fails, fetches Firebase ID token and exchanges it via POST /api/v1/auth/firebase.
   * 3. Prevents duplicate concurrent exchange calls using a shared promise lock.
   */
  async ensureValidToken(): Promise<string | null> {
    const existingToken = this.getAccessToken();
    if (existingToken && !this.isTokenExpired(existingToken)) {
      return existingToken;
    }

    if (this.tokenExchangePromise) {
      return this.tokenExchangePromise;
    }

    this.tokenExchangePromise = (async () => {
      try {
        // 1. Try refreshing using stored refresh token
        const refreshToken = this.getRefreshToken();
        if (refreshToken) {
          try {
            const refreshRes = await this.refreshToken();
            if (refreshRes.success && refreshRes.data?.accessToken) {
              return refreshRes.data.accessToken;
            }
          } catch {
            // Proceed to Firebase ID token exchange
          }
        }

        // 2. Firebase ID token exchange -> BrandX Backend JWT
        const firebaseIdToken = await firebaseAuthService.getCurrentIdToken();
        if (firebaseIdToken) {
          const exchangeRes = await this.loginWithFirebase(firebaseIdToken);
          if (exchangeRes.success && exchangeRes.data?.tokens?.accessToken) {
            return exchangeRes.data.tokens.accessToken;
          }
        }

        return this.getAccessToken();
      } finally {
        this.tokenExchangePromise = null;
      }
    })();

    return this.tokenExchangePromise;
  }

  // -------------------------------------------------------------
  // HTTP Client Request Handler
  // -------------------------------------------------------------
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuthToken: boolean = false
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (requireAuthToken) {
      const token = await this.ensureValidToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const json: ApiResponse<T> = await response.json().catch(() => ({
        success: response.ok,
        message: response.statusText,
      }));

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: json.error?.code || `HTTP_${response.status}`,
            message: json.error?.message || json.message || 'Request failed',
            details: json.error?.details,
          },
        };
      }

      return json;
    } catch (networkError: any) {
      console.warn(`[BrandX API] Network error on ${endpoint}:`, networkError.message);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Unable to connect to backend server. Working in local offline mode.',
        },
      };
    }
  }

  // -------------------------------------------------------------
  // Authentication REST Endpoints
  // -------------------------------------------------------------

  /**
   * Register a new Vyapari user + initial Business in PostgreSQL
   */
  async register(payload: RegisterPayload): Promise<ApiResponse<AuthResponseData>> {
    const res = await this.request<AuthResponseData>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.success && res.data?.tokens) {
      this.setSession(res.data.tokens, res.data.user);
    }
    return res;
  }

  /**
   * Login existing user via Mobile or Email + optional Password
   */
  async login(identifier: string, password?: string): Promise<ApiResponse<AuthResponseData>> {
    const res = await this.request<AuthResponseData>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });

    if (res.success && res.data?.tokens) {
      this.setSession(res.data.tokens, res.data.user);
    }
    return res;
  }

  /**
   * Authenticate via Firebase ID Token (Phone OTP or Email/Password)
   * Verifies with Firebase Admin SDK and syncs with PostgreSQL User & Business
   */
  async loginWithFirebase(
    idToken: string,
    profileData?: {
      name?: string;
      mobile?: string;
      email?: string;
      businessName?: string;
      businessCategory?: string;
    }
  ): Promise<ApiResponse<AuthResponseData>> {
    const res = await this.request<AuthResponseData>('/auth/firebase', {
      method: 'POST',
      body: JSON.stringify({
        idToken,
        ...(profileData || {}),
      }),
    });

    if (res.success && res.data?.tokens) {
      this.setSession(res.data.tokens, res.data.user);
    }
    return res;
  }

  /**
   * Request OTP dispatch to mobile number
   */
  async requestOtp(mobile: string): Promise<ApiResponse<{ mobile: string; sent: boolean }>> {
    return this.request<{ mobile: string; sent: boolean }>('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ mobile }),
    });
  }

  /**
   * Verify OTP and receive tokens / user profile
   */
  async verifyOtp(mobile: string, otp: string): Promise<ApiResponse<AuthResponseData>> {
    const res = await this.request<AuthResponseData>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ mobile, otp }),
    });

    if (res.success && res.data?.tokens) {
      this.setSession(res.data.tokens, res.data.user);
    }
    return res;
  }

  /**
   * Refresh expired access token
   */
  async refreshToken(): Promise<ApiResponse<AuthTokens>> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return {
        success: false,
        error: { code: 'NO_REFRESH_TOKEN', message: 'No refresh token available' },
      };
    }

    const res = await this.request<AuthTokens>('/auth/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    if (res.success && res.data) {
      this.setSession(res.data);
    }
    return res;
  }

  /**
   * Fetch authenticated user's current profile from backend
   */
  async getMe(): Promise<ApiResponse<BackendUser>> {
    return this.request<BackendUser>('/users/me', { method: 'GET' }, true);
  }

  /**
   * Update authenticated user profile
   */
  async updateMe(data: Partial<BackendUser>): Promise<ApiResponse<BackendUser>> {
    const res = await this.request<BackendUser>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, true);

    if (res.success && res.data) {
      const current = this.getStoredUser() || ({} as BackendUser);
      this.setSession({ accessToken: this.getAccessToken() || '', refreshToken: this.getRefreshToken() || '' }, { ...current, ...res.data });
    }
    return res;
  }

  /**
   * Log out authenticated user and purge tokens from client storage
   */
  async logout(): Promise<void> {
    this.clearSession();
  }
}

export const authApi = new AuthApiService();
