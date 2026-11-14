'use server';

import type { Inventory, Money, Product } from '@mitdrone/types';

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

export function defaultVendorMoney(): Money {
  return { amount: 0, currency: 'NGN' };
}

export function defaultVendorInventory(): Inventory {
  return {
    sku: '',
    quantity: 0,
    lowStockThreshold: 5,
    trackInventory: true,
    allowBackorder: false,
  };
}

export function normalizeVendorBackendProduct(raw: unknown): Product {
  if (!isRecord(raw)) return defaultVendorProduct();

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
      currency: (getStr(raw, 'currency', 'NGN') as 'NGN' | 'USD' | 'GBP' | 'EUR'),
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

export function normalizeVendorBackendProductList(raw: unknown): Product[] {
  if (!isRecord(raw)) return [];
  const items = getArr<unknown>(raw, 'data', []);
  return items.map(normalizeVendorBackendProduct);
}

function defaultVendorProduct(): Product {
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
    price: defaultVendorMoney(),
    compareAtPrice: undefined,
    rental: undefined,
    variants: [],
    inventory: defaultVendorInventory(),
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
