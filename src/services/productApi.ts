/**
 * BRANDX — Product & Stock Master API Service
 * Connects BrandX Frontend directly to PostgreSQL Product, Category & Stock Endpoints
 */

import { authApi } from './authApi';
import { StoreProduct, ProductCategoryItem } from '../types';

export interface BackendProduct {
  id: string;
  businessId: string;
  name: string;
  itemCode?: string | null;
  sku?: string | null;
  barcode?: string | null;
  categoryId?: string | null;
  category: string;
  description?: string | null;
  type: 'GOODS' | 'SERVICE';
  purchasePrice?: number | null;
  sellingPrice: number;
  mrp?: number | null;
  hsnSac?: string | null;
  hsnCode?: string | null;
  gstRate: number;
  gstPercent: number;
  taxType: 'EXCLUSIVE' | 'INCLUSIVE' | 'EXEMPT';
  cessRate?: number | null;
  unit: string;
  secondaryUnit?: string | null;
  conversionFactor?: number | null;
  openingStock: number;
  currentStock: number;
  stockQty: number;
  lowStockThreshold: number;
  isActive: boolean;
  isAvailable: boolean;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  categoryRel?: {
    id: string;
    name: string;
  } | null;
}

export interface InventoryTransactionItem {
  id: string;
  businessId: string;
  productId: string;
  type: string;
  quantity: number;
  rate?: number | null;
  total?: number | null;
  balanceAfter: number;
  referenceType?: string | null;
  referenceId?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface StockSummaryData {
  productId: string;
  name: string;
  currentStock: number;
  unit: string;
  lowStockThreshold: number;
  isLowStock: boolean;
  openingStock: number;
  totalIn: number;
  totalOut: number;
  lastUpdated: string;
}

export interface CreateProductInput {
  name: string;
  itemCode?: string;
  sku?: string;
  barcode?: string;
  categoryId?: string;
  category?: string;
  description?: string;
  type?: 'GOODS' | 'SERVICE';
  sellingPrice: number;
  purchasePrice?: number;
  mrp?: number;
  hsnSac?: string;
  hsnCode?: string;
  gstRate?: number;
  gstPercent?: number;
  taxType?: 'EXCLUSIVE' | 'INCLUSIVE' | 'EXEMPT';
  cessRate?: number;
  unit?: string;
  secondaryUnit?: string;
  conversionFactor?: number;
  openingStock?: number;
  currentStock?: number;
  lowStockThreshold?: number;
  isActive?: boolean;
  isAvailable?: boolean;
  imageUrl?: string;
}

export interface ProductListParams {
  search?: string;
  category?: string;
  categoryId?: string;
  lowStock?: boolean;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: {
    code?: string;
    message?: string;
    details?: any;
  };
}

import { API_BASE_URL } from '../config/env';


class ProductApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = (await authApi.ensureValidToken()) || authApi.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: data.error?.code || `HTTP_${response.status}`,
            message: data.message || data.error?.message || 'API request failed',
            details: data.error?.details || data.details,
          },
        };
      }

      return data;
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: err.message || 'Unable to connect to BrandX server. Please check your network.',
        },
      };
    }
  }

  // ==========================================================
  // DATA ADAPTER
  // ==========================================================
  backendToStoreProduct(item: any): StoreProduct {
    const sellingPrice =
      typeof item.sellingPrice === 'number'
        ? item.sellingPrice
        : typeof item.price === 'number'
        ? item.price
        : Number(item.sellingPrice ?? item.price ?? 0);

    const mrp =
      item.mrp != null
        ? Number(item.mrp)
        : item.originalPrice != null
        ? Number(item.originalPrice)
        : undefined;

    const currentStock =
      typeof item.currentStock === 'number'
        ? item.currentStock
        : typeof item.stockQty === 'number'
        ? item.stockQty
        : Number(item.currentStock ?? item.stockQty ?? 0);

    return {
      id: item.id,
      name: item.name || '',
      category: item.category || (item.categoryRel?.name ?? 'General'),
      categoryId: item.categoryId || undefined,
      price: sellingPrice,
      sellingPrice,
      purchasePrice: item.purchasePrice != null ? Number(item.purchasePrice) : undefined,
      mrp,
      originalPrice: mrp,
      imageUrl: item.imageUrl || '',
      description: item.description || '',
      isAvailable: item.isActive !== undefined ? item.isActive : (item.isAvailable ?? true),
      isActive: item.isActive !== undefined ? item.isActive : (item.isAvailable ?? true),
      type: item.type || 'GOODS',
      itemCode: item.itemCode || undefined,
      sku: item.sku || undefined,
      barcode: item.barcode || undefined,
      hsnSac: item.hsnSac || item.hsnCode || undefined,
      hsnCode: item.hsnCode || item.hsnSac || undefined,
      gstRate: item.gstRate ?? item.gstPercent ?? 18,
      gstPercent: item.gstPercent ?? item.gstRate ?? 18,
      taxType: item.taxType || 'EXCLUSIVE',
      cessRate: item.cessRate != null ? Number(item.cessRate) : undefined,
      unit: item.unit || 'PCS',
      secondaryUnit: item.secondaryUnit || undefined,
      conversionFactor: item.conversionFactor != null ? Number(item.conversionFactor) : undefined,
      openingStock: item.openingStock != null ? Number(item.openingStock) : 0,
      currentStock,
      stockQty: currentStock,
      lowStockThreshold: item.lowStockThreshold != null ? Number(item.lowStockThreshold) : 5,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  // ==========================================================
  // PRODUCTS CRUD
  // ==========================================================

  async listProducts(params: ProductListParams = {}): Promise<ApiResponse<BackendProduct[]>> {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.categoryId) query.append('categoryId', params.categoryId);
    if (params.lowStock !== undefined) query.append('lowStock', String(params.lowStock));
    if (params.isActive !== undefined) query.append('isActive', String(params.isActive));
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request<BackendProduct[]>(`/products${queryString}`);
  }

  async getProduct(id: string): Promise<ApiResponse<BackendProduct>> {
    return this.request<BackendProduct>(`/products/${id}`);
  }

  async createProduct(payload: CreateProductInput): Promise<ApiResponse<BackendProduct>> {
    return this.request<BackendProduct>('/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateProduct(id: string, payload: Partial<CreateProductInput>): Promise<ApiResponse<BackendProduct>> {
    return this.request<BackendProduct>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteProduct(id: string): Promise<ApiResponse<{ message: string; softDeleted: boolean }>> {
    return this.request<{ message: string; softDeleted: boolean }>(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  // ==========================================================
  // STOCK MANAGEMENT
  // ==========================================================

  async changeStock(
    id: string,
    payload: {
      type: 'STOCK_IN' | 'STOCK_OUT' | 'RETURN_IN' | 'RETURN_OUT' | string;
      quantity: number;
      note?: string;
      referenceType?: string;
      referenceId?: string;
    }
  ): Promise<ApiResponse<{ product: BackendProduct; transaction: InventoryTransactionItem }>> {
    return this.request<{ product: BackendProduct; transaction: InventoryTransactionItem }>(
      `/products/${id}/stock`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async adjustStock(
    id: string,
    payload: {
      quantity: number;
      adjustmentType: 'SET' | 'ADD' | 'SUBTRACT' | string;
      reason: string;
      note?: string;
    }
  ): Promise<ApiResponse<{ product: BackendProduct; transaction: InventoryTransactionItem }>> {
    return this.request<{ product: BackendProduct; transaction: InventoryTransactionItem }>(
      `/products/${id}/stock-adjustment`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async getStockSummary(id: string): Promise<ApiResponse<StockSummaryData>> {
    return this.request<StockSummaryData>(`/products/${id}/stock-summary`);
  }

  async listStockHistory(
    id: string,
    params: { page?: number; limit?: number } = {}
  ): Promise<ApiResponse<InventoryTransactionItem[]>> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<InventoryTransactionItem[]>(`/products/${id}/stock-history${qs}`);
  }

  // ==========================================================
  // CATEGORIES CRUD
  // ==========================================================

  async listCategories(): Promise<ApiResponse<ProductCategoryItem[]>> {
    return this.request<ProductCategoryItem[]>('/product-categories');
  }

  async getCategory(id: string): Promise<ApiResponse<ProductCategoryItem>> {
    return this.request<ProductCategoryItem>(`/product-categories/${id}`);
  }

  async createCategory(payload: {
    name: string;
    description?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<ProductCategoryItem>> {
    return this.request<ProductCategoryItem>('/product-categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateCategory(
    id: string,
    payload: {
      name?: string;
      description?: string;
      isActive?: boolean;
    }
  ): Promise<ApiResponse<ProductCategoryItem>> {
    return this.request<ProductCategoryItem>(`/product-categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteCategory(id: string): Promise<ApiResponse<{ message: string; softDeleted: boolean }>> {
    return this.request<{ message: string; softDeleted: boolean }>(`/product-categories/${id}`, {
      method: 'DELETE',
    });
  }
}

export const productApi = new ProductApiService();
