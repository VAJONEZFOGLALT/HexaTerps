import type { Category, CreateOrderPayload, Order, Product } from './types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

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
  getProducts(): Promise<Product[]> {
    return http('/api/products');
  },
  getFeatured(): Promise<Product[]> {
    return http('/api/products/featured');
  },
  createOrder(payload: CreateOrderPayload): Promise<Order> {
    return http('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
