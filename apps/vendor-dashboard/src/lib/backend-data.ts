'use server';

import { isApiError } from '@mitdrone/sdk';

import { serverApi } from '@/lib/server-api';

/* ------------------------------------------------------------------ health */
export async function getVendorBackendHealthLive() {
  try {
    return (await serverApi()).backend.health.live();
  } catch {
    return undefined;
  }
}

export async function getVendorBackendHealthReady() {
  try {
    await (await serverApi()).backend.health.ready();
    return true;
  } catch {
    return false;
  }
}

/* ---------------------------------------------------------- organizations */
export async function getVendorBackendOrganization(organizationId: string) {
  return (await serverApi()).backend.organizations.detail(organizationId);
}

export async function getVendorBackendOrganizations(query: { page?: number; limit?: number } = {}) {
  return (await serverApi()).backend.organizations.list(query);
}

/* ------------------------------------------------------------ vendor offers */
export async function getVendorBackendOffers(
  organizationId: string,
  query: { page?: number; limit?: number; status?: string } = {},
) {
  return (await serverApi()).backend.vendorOffers.list(organizationId, query);
}

/* ------------------------------------------------------------------- inventory */
export async function getVendorBackendInventory(
  organizationId: string,
  query: { page?: number; limit?: number; status?: string } = {},
) {
  return (await serverApi()).backend.inventory.listAssets(organizationId, query);
}

export async function getVendorBackendStock(
  organizationId: string,
  offerId: string,
) {
  return (await serverApi()).backend.inventory.getStock(organizationId, offerId);
}

export async function getVendorBackendRentalTerms(
  organizationId: string,
  offerId: string,
) {
  return (await serverApi()).backend.inventory.getRentalTerms(organizationId, offerId);
}

/* --------------------------------------------------------------- reservations */
export async function getVendorBackendReservations(query: {
  page?: number;
  limit?: number;
} = {}) {
  return (await serverApi()).backend.reservations.list(query);
}

/* ------------------------------------------------------------------- orders */
export async function getVendorBackendOrders(query: {
  page?: number;
  limit?: number;
} = {}) {
  return (await serverApi()).backend.orders.list(query);
}

export async function getVendorBackendOrder(orderId: string) {
  return (await serverApi()).backend.orders.detail(orderId);
}

/* ------------------------------------------------------------ staff catalog */
export async function getVendorBackendOfferQueue(query: {
  page?: number;
  limit?: number;
  status?: string;
} = {}) {
  return (await serverApi()).backend.staffCatalog.offerQueue(query);
}

export async function getVendorBackendCheckoutTerms(offerId: string) {
  return (await serverApi()).backend.staffCatalog.getCheckoutTerms(offerId);
}

/* ------------------------------------------------------------------ auth */
export async function getVendorBackendSession() {
  return (await serverApi()).backend.auth.session();
}

export { isApiError };
