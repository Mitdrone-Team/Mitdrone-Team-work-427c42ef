import type { CurrencyCode, Inventory, Money, Product } from '@mitdrone/types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getStr(obj: Record<string, unknown>, key: string, fallback = ''): string {
  const v = obj[key];
  return typeof v === 'string' ? v : fallback;
}

function getNum(obj: Record<string, unknown>, key: string, fallback = 0): number {
  const v = obj[key];
  return typeof v === 'number' ? v : fallback;
}

function getBool(obj: Record<string, unknown>, key: string, fallback = false): boolean {
  const v = obj[key];
  return typeof v === 'boolean' ? v : fallback;
}

function getArr<T>(obj: Record<string, unknown>, key: string, fallback: T[] = []): T[] {
  const v = obj[key];
  return Array.isArray(v) ? (v as unknown as T[]) : fallback;
}

export function defaultMoney(): Money {
  return { amount: 0, currency: 'NGN' };
}

export function defaultInventory(): Inventory {
  return {
    sku: '',
    quantity: 0,
    lowStockThreshold: 5,
    trackInventory: true,
    allowBackorder: false,
  };
}

export function normalizeBackendProduct(raw: unknown): Product {
  if (!isRecord(raw)) return defaultProduct();

  const images = getArr<Record<string, unknown>>(raw, 'images', []).map((img) => ({
    url: getStr(img, 'url', ''),
    alt: getStr(img, 'alt', ''),
  }));

  return {
    id: getStr(raw, 'id', ''),
    slug: getStr(raw, 'slug', ''),
    title: getStr(raw, 'title', 'Untitled Product'),
    description: getStr(raw, 'description', ''),
    shortDescription: getStr(raw, 'shortDescription', ''),
    kind: 'drone',
    listingType: 'sale',
    condition: 'new',
    status: 'active',
    vendorId: getStr(raw, 'vendorId', ''),
    brand: getStr(raw, 'brand', ''),
    categoryIds: getArr<string>(raw, 'categoryIds', []),
    images,
    price: {
      amount: getNum(raw, 'price', 0),
      currency: (getStr(raw, 'currency', 'NGN') as CurrencyCode),
    },
    compareAtPrice: undefined,
    rental: undefined,
    variants: [],
    inventory: {
      sku: getStr(raw, 'sku', ''),
      quantity: getNum(raw, 'quantity', 0),
      lowStockThreshold: getNum(raw, 'lowStockThreshold', 5),
      trackInventory: getBool(raw, 'trackInventory', true),
      allowBackorder: getBool(raw, 'allowBackorder', false),
    },
    specs: {},
    tags: [],
    rating: getNum(raw, 'rating', 0),
    reviewCount: getNum(raw, 'reviewCount', 0),
    salesCount: getNum(raw, 'salesCount', 0),
    featured: getBool(raw, 'featured', false),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeBackendProductList(raw: unknown): Product[] {
  if (!isRecord(raw)) return [];
  const items =
    getArr<unknown>(raw, 'data', []) ??
    getArr<unknown>(raw, 'products', []) ??
    getArr<unknown>(raw, 'offers', []) ??
    [];
  return items.map(normalizeBackendProduct);
}

export function extractBackendItems(
  raw: unknown,
  keys: string[] = ['data', 'offers', 'assets', 'orders', 'reservations', 'products'],
): unknown[] {
  if (!isRecord(raw)) return [];
  for (const key of keys) {
    const items = getArr<unknown>(raw, key, []);
    if (items.length > 0) return items;
  }
  return [];
}

function defaultProduct(): Product {
  return {
    id: '',
    slug: '',
    title: 'Untitled Product',
    description: '',
    shortDescription: '',
    kind: 'drone',
    listingType: 'sale',
    condition: 'new',
    status: 'active',
    vendorId: '',
    brand: '',
    categoryIds: [],
    images: [],
    price: defaultMoney(),
    compareAtPrice: undefined,
    rental: undefined,
    variants: [],
    inventory: defaultInventory(),
    specs: {},
    tags: [],
    rating: 0,
    reviewCount: 0,
    salesCount: 0,
    featured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
