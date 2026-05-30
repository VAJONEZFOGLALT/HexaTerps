export type Category = {
  id: number;
  name: string;
};

export type Cannabinoid = {
  id: number;
  name: string;
};

export type CannabinoidUnit = 'PERCENT' | 'MG';

export type ProductCannabinoid = {
  productId: number;
  cannabinoidId: number;
  percentage: string;
  unit: CannabinoidUnit;
  cannabinoid: Cannabinoid;
};

export type Strain = 'SATIVA' | 'INDICA' | 'HYBRID';

export type Product = {
  id: number;
  name: string;
  categoryId: number;
  category: Category;
  description: string | null;
  strain: Strain;
  flavour: string | null;
  price: string;
  stock: number;
  image: string | null;
  featured: boolean;
  cannabinoids: ProductCannabinoid[];
};

export type DeliveryMethod = 'PICKUP' | 'COURIER';

export type CreateOrderItem = {
  productId: number;
  quantity: number;
};

export type CreateOrderPayload = {
  fullName: string;
  contact: string;
  deliveryMethod: DeliveryMethod;
  note?: string;
  items: CreateOrderItem[];
};

export type Order = {
  id: number;
  fullName: string;
  contact: string;
  deliveryMethod: DeliveryMethod;
  totalPrice: string;
  orderStatus: string;
  note: string | null;
  createdAt: string;
  items: Array<{
    id: number;
    productId: number;
    productName: string;
    unitPrice: string;
    quantity: number;
    lineTotal: string;
  }>;
};
