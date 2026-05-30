import type { Category, CreateOrderPayload, Device, Order, Product } from './types';

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

  getCannabinoids(): Promise<Array<{ id: number; name: string }>> {
    return http('/api/cannabinoids');
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