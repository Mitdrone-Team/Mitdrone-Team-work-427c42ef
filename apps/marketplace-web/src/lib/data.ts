import 'server-only';

import { isApiError, type ProductQuery } from '@mitdrone/sdk';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { normalizeBackendProductList, extractBackendItems } from './normalization';
import { REVALIDATE_SECONDS, serverApi } from './server-api';

import type { ContentSection, PageParams, HealthLiveResponse, RegistrationTermsResponse } from '@mitdrone/types';

const next = { revalidate: REVALIDATE_SECONDS };

/** Turns an API 404 into Next's notFound(); rethrows everything else to the error boundary. */
async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (isApiError(error) && error.status === 404) notFound();
    throw error;
  }
}

export const getProducts = async (query: ProductQuery = {}) =>
  (await serverApi()).catalog.products(query, { next });
export const getProduct = cache(async (slug: string) =>
  orNotFound((await serverApi()).catalog.product(slug, { next })),
);
export const getReviews = async (productId: string, query: PageParams = {}) =>
  (await serverApi()).catalog.reviews(productId, query);
export const getCategories = cache(async () =>
  (await serverApi()).catalog.categories({}, { next }),
);
export const getVendors = async (query: PageParams & { type?: string; state?: string } = {}) =>
  (await serverApi()).catalog.vendors(query, { next });
export const getManufacturers = async (query: PageParams & { nigerian?: boolean } = {}) =>
  (await serverApi()).catalog.manufacturers(query, { next });
export const getServices = async (query: PageParams & { category?: string; state?: string } = {}) =>
  (await serverApi()).services.list(query, { next });
export const getServiceCategories = cache(async () =>
  (await serverApi()).services.categories({ next }),
);
export const getLiveSessions = async () =>
  (await serverApi()).live.sessions({ pageSize: 4 }, { next });

export const getVendor = cache(async (slug: string) =>
  orNotFound((await serverApi()).catalog.vendor(slug, { next })),
);
export const getManufacturer = cache(async (slug: string) =>
  orNotFound((await serverApi()).catalog.manufacturer(slug, { next })),
);
export const getService = cache(async (slug: string) =>
  orNotFound((await serverApi()).services.detail(slug, { next })),
);
export const getSearch = async (q: string) => (await serverApi()).catalog.search(q, { next });
export const getLiveSession = cache(async (id: string) =>
  orNotFound((await serverApi()).live.session(id, { next: { revalidate: 15 } })),
);
export const getLiveSessionsBy = async (
  query: Parameters<Awaited<ReturnType<typeof serverApi>>['live']['sessions']>[0] = {},
) => (await serverApi()).live.sessions(query, { next: { revalidate: 15 } });
export const getContentPages = cache(async (section?: ContentSection) =>
  (await serverApi()).content.pages(section, { next }),
);
export const getContentPage = cache(async (slug: string) =>
  orNotFound((await serverApi()).content.page(slug, { next })),
);

/* ------------------------------------------------------------------ backend */
export const getBackendHealthLive = async (): Promise<HealthLiveResponse | undefined> => {
  try {
    return (await serverApi()).backend.health.live();
  } catch {
    return undefined;
  }
};

export const getBackendHealthReady = async (): Promise<boolean> => {
  try {
    await (await serverApi()).backend.health.ready();
    return true;
  } catch {
    return false;
  }
};

export const getBackendRegistrationTerms = async (): Promise<
  RegistrationTermsResponse | undefined
> => {
  try {
    return (await serverApi()).backend.auth.registrationTerms();
  } catch {
    return undefined;
  }
};

export const getBackendCatalogOffers = async (query: {
  mode?: 'SALE' | 'RENTAL';
  page?: number;
  limit?: number;
} = {}) => {
  return (await serverApi()).backend.catalog.offers(query);
};

export const getBackendCatalogProducts = async (query: {
  page?: number;
  limit?: number;
} = {}) => {
  const raw = await (await serverApi()).backend.catalog.products(query);
  const products = normalizeBackendProductList(raw);
  return {
    data: products,
    meta: { total: products.length, page: query.page ?? 1, totalPages: 1 },
  };
};

export const getBackendOrders = async (query: {
  page?: number;
  limit?: number;
} = {}) => {
  const raw = await (await serverApi()).backend.orders.list(query);
  const items = extractBackendItems(raw, ['orders', 'data']);
  return {
    data: items,
    meta: { total: items.length, page: query.page ?? 1, totalPages: 1 },
  };
};

export const getBackendOrder = async (orderId: string) => {
  return (await serverApi()).backend.orders.detail(orderId);
};

export const getBackendReservations = async (query: {
  page?: number;
  limit?: number;
} = {}) => {
  const raw = await (await serverApi()).backend.reservations.list(query);
  const items = extractBackendItems(raw, ['reservations', 'data']);
  return {
    data: items,
    meta: { total: items.length, page: query.page ?? 1, totalPages: 1 },
  };
};

export const getBackendOfferAvailability = async (
  offerId: string,
  query?: { startsAt?: string; endsAt?: string },
) => {
  return (await serverApi()).backend.catalog.availability(offerId, query);
};

export const getBackendOrganizations = async (query: {
  page?: number;
  limit?: number;
} = {}) => {
  return (await serverApi()).backend.organizations.list(query);
};
