'use server';

import { isApiError } from '@mitdrone/sdk';

import { serverApi } from '@/lib/server-api';

export async function getAdminBackendHealthLive() {
  try {
    return (await serverApi()).backend.health.live();
  } catch {
    return undefined;
  }
}

export async function getAdminBackendHealthReady() {
  try {
    await (await serverApi()).backend.health.ready();
    return true;
  } catch {
    return false;
  }
}

export async function getAdminBackendOrganizations(query: { page?: number; limit?: number } = {}) {
  return (await serverApi()).backend.organizations.list(query);
}

export async function getAdminBackendOrganization(organizationId: string) {
  return (await serverApi()).backend.organizations.detail(organizationId);
}

export async function getAdminBackendOrgReviewQueue(query: {
  page?: number;
  limit?: number;
  status?: string;
  kind?: string;
} = {}) {
  return (await serverApi()).backend.orgReview.queue(query);
}

export async function getAdminBackendOfferQueue(query: {
  page?: number;
  limit?: number;
  status?: string;
} = {}) {
  return (await serverApi()).backend.staffCatalog.offerQueue(query);
}

export async function getAdminBackendCheckoutTerms(offerId: string) {
  return (await serverApi()).backend.staffCatalog.getCheckoutTerms(offerId);
}

export async function getAdminBackendOrders(query: { page?: number; limit?: number } = {}) {
  return (await serverApi()).backend.orders.list(query);
}

export async function getAdminBackendOrder(orderId: string) {
  return (await serverApi()).backend.orders.detail(orderId);
}

export { isApiError };
