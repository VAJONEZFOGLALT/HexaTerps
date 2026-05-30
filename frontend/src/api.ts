import type { Cannabinoid, Category, CreateOrderPayload, Device, Order, Product } from './types';

export const API_BASE = (window as any).__API_BASE_URL__ ?? '';

export function buildApiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), init);

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export const api = {
  getCategories(): Promise<Category[]> {
    return http('/api/categories');
  },

  updateCategory(id: number, payload: { name: string; featured: boolean }, adminToken: string): Promise<Category> {
    return http(`/api/admin/categories/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken,
      },
      body: JSON.stringify(payload),
    });
  },

  deleteProduct(id: number, adminToken: string): Promise<{ ok: true }> {
    return http(`/api/admin/products/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken,
      },
    });
  },

  getProducts(): Promise<Product[]> {
    return http('/api/products');
  },

  getFeatured(): Promise<Product[]> {
    return http('/api/products/featured');
  },

  getCannabinoids(): Promise<Cannabinoid[]> {
    return http('/api/cannabinoids');
  },

  createCannabinoid(payload: { name: string; position?: number }, adminToken: string): Promise<Cannabinoid> {
    return http('/api/admin/cannabinoids', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken,
      },
      body: JSON.stringify(payload),
    });
  },

  updateCannabinoid(
    id: number,
    payload: { name?: string; position?: number },
    adminToken: string,
  ): Promise<Cannabinoid> {
    return http(`/api/admin/cannabinoids/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken,
      },
      body: JSON.stringify(payload),
    });
  },

  deleteCannabinoid(id: number, adminToken: string): Promise<Cannabinoid> {
    return http(`/api/admin/cannabinoids/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken,
      },
    });
  },

  reorderCannabinoids(orderedIds: number[], adminToken: string): Promise<Cannabinoid[]> {
    return http('/api/admin/cannabinoids/reorder', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken,
      },
      body: JSON.stringify({ orderedIds }),
    });
  },

  getDevices(): Promise<Device[]> {
    return http('/api/devices');
  },

  createOrder(payload: CreateOrderPayload): Promise<Order> {
    return http('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  },
};