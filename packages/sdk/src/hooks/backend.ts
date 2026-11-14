import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { api } from '../endpoints';
import { generateIdempotencyKey } from '../idempotency';
import { keys } from '../query-keys';

/* ------------------------------------------------------------------ catalog */
export const useBackendCatalogOffers = (
  query: { mode?: 'SALE' | 'RENTAL'; page?: number; limit?: number } = {},
) =>
  useQuery({
    queryKey: keys.backendCatalog('offers', query),
    queryFn: () => api.backend.catalog.offers(query),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

export const useBackendCatalogProducts = (
  query: { page?: number; limit?: number } = {},
) =>
  useQuery({
    queryKey: keys.backendCatalog('products', query),
    queryFn: () => api.backend.catalog.products(query),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

export const useBackendOfferAvailability = (
  offerId: string,
  query?: { startsAt?: string; endsAt?: string },
) =>
  useQuery({
    queryKey: keys.backendCatalog('availability', offerId, query),
    queryFn: () => api.backend.catalog.availability(offerId, query),
    enabled: Boolean(offerId),
    placeholderData: keepPreviousData,
  });

/* ---------------------------------------------------------- organizations */
export const useBackendOrganizations = (
  query: { page?: number; limit?: number } = {},
) =>
  useQuery({
    queryKey: keys.backendOrganizations(query),
    queryFn: () => api.backend.organizations.list(query),
    placeholderData: keepPreviousData,
  });

export const useBackendOrganization = (id: string | undefined) =>
  useQuery({
    queryKey: keys.backendOrganizations('detail', id),
    queryFn: () => api.backend.organizations.detail(id!),
    enabled: Boolean(id),
  });

export const useBackendOrgApplication = () =>
  useMutation({
    mutationFn: (body: Parameters<typeof api.backend.organizations.apply>[0]) =>
      api.backend.organizations.apply(body),
  });

export const useBackendOrgApplyAsServiceProvider = () =>
  useMutation({
    mutationFn: (body: Parameters<typeof api.backend.organizations.applyAsServiceProvider>[0]) =>
      api.backend.organizations.applyAsServiceProvider(body),
  });

export const useBackendOrgResubmitApplication = (id: string) =>
  useMutation({
    mutationFn: (body: Parameters<typeof api.backend.organizations.resubmitApplication>[1]) =>
      api.backend.organizations.resubmitApplication(id, body),
  });

export const useBackendOrgResubmitServiceProviderApplication = (id: string) =>
  useMutation({
    mutationFn: (
      body: Parameters<typeof api.backend.organizations.resubmitServiceProviderApplication>[1],
    ) => api.backend.organizations.resubmitServiceProviderApplication(id, body),
  });

export const useBackendOrgAddMember = (id: string) =>
  useMutation({
    mutationFn: (body: Parameters<typeof api.backend.organizations.addMember>[1]) =>
      api.backend.organizations.addMember(id, body),
  });

export const useBackendOrgRemoveMember = (id: string) =>
  useMutation({
    mutationFn: (userId: string) => api.backend.organizations.removeMember(id, userId),
  });

/* ---------------------------------------------------------- org review */
export const useBackendOrgReviewQueue = (
  query: { page?: number; limit?: number; status?: string; kind?: string } = {},
) =>
  useQuery({
    queryKey: keys.backendOrgReview(query),
    queryFn: () => api.backend.orgReview.queue(query),
    placeholderData: keepPreviousData,
  });

export const useBackendOrgReviewDecision = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Parameters<typeof api.backend.orgReview.review>[1];
    }) => api.backend.orgReview.review(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.backendOrgReview() }),
  });
};

export const useBackendOrgSuspend = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Parameters<typeof api.backend.orgReview.suspend>[1];
    }) => api.backend.orgReview.suspend(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.backendOrgReview() }),
  });
};

/* ------------------------------------------------------------ vendor offers */
export const useBackendVendorOffers = (
  organizationId: string,
  query: { page?: number; limit?: number; status?: string } = {},
) =>
  useQuery({
    queryKey: keys.backendVendorOffers(organizationId, query),
    queryFn: () => api.backend.vendorOffers.list(organizationId, query),
    placeholderData: keepPreviousData,
    enabled: Boolean(organizationId),
  });

export const useBackendCreateOffer = (organizationId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.backend.vendorOffers.create>[1]) =>
      api.backend.vendorOffers.create(organizationId, body),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: keys.backendVendorOffers(organizationId),
      }),
  });
};

export const useBackendUpdateOffer = (organizationId: string, id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.backend.vendorOffers.update>[2]) =>
      api.backend.vendorOffers.update(organizationId, id, body),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: keys.backendVendorOffers(organizationId),
      }),
  });
};

export const useBackendSubmitOffer = (organizationId: string, id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.backend.vendorOffers.submit>[2]) =>
      api.backend.vendorOffers.submit(organizationId, id, body),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: keys.backendVendorOffers(organizationId),
      }),
  });
};

export const useBackendArchiveOffer = (organizationId: string, id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.backend.vendorOffers.archive>[2]) =>
      api.backend.vendorOffers.archive(organizationId, id, body),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: keys.backendVendorOffers(organizationId),
      }),
  });
};

/* ------------------------------------------------------------------- inventory */
export const useBackendInventory = (
  organizationId: string,
  query: { page?: number; limit?: number; status?: string } = {},
) =>
  useQuery({
    queryKey: keys.backendInventory(organizationId, query),
    queryFn: () => api.backend.inventory.listAssets(organizationId, query),
    placeholderData: keepPreviousData,
    enabled: Boolean(organizationId),
  });

export const useBackendStock = (
  organizationId: string,
  offerId: string,
) =>
  useQuery({
    queryKey: keys.backendInventory(organizationId, 'stock', offerId),
    queryFn: () => api.backend.inventory.getStock(organizationId, offerId),
  });

export const useBackendInitializeStock = (organizationId: string, offerId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.backend.inventory.initializeStock>[2]) =>
      api.backend.inventory.initializeStock(organizationId, offerId, body),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: keys.backendInventory(organizationId, 'stock', offerId),
      }),
  });
};

export const useBackendAdjustStock = (organizationId: string, offerId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.backend.inventory.adjustStock>[2]) =>
      api.backend.inventory.adjustStock(organizationId, offerId, body),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: keys.backendInventory(organizationId, 'stock', offerId),
      }),
  });
};

export const useBackendRentalTerms = (
  organizationId: string,
  offerId: string,
) =>
  useQuery({
    queryKey: keys.backendInventory(organizationId, 'rental-terms', offerId),
    queryFn: () => api.backend.inventory.getRentalTerms(organizationId, offerId),
  });

export const useBackendConfigureRentalTerms = (
  organizationId: string,
  offerId: string,
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.backend.inventory.configureRentalTerms>[2]) =>
      api.backend.inventory.configureRentalTerms(organizationId, offerId, body),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: keys.backendInventory(organizationId, 'rental-terms', offerId),
      }),
  });
};

export const useBackendCreateAsset = (organizationId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.backend.inventory.createAsset>[1]) =>
      api.backend.inventory.createAsset(organizationId, body),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: keys.backendInventory(organizationId),
      }),
  });
};

export const useBackendUpdateAsset = (organizationId: string, id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.backend.inventory.updateAsset>[2]) =>
      api.backend.inventory.updateAsset(organizationId, id, body),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: keys.backendInventory(organizationId),
      }),
  });
};

export const useBackendBlockAsset = (organizationId: string, id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.backend.inventory.blockAsset>[2]) =>
      api.backend.inventory.blockAsset(organizationId, id, body),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: keys.backendInventory(organizationId),
      }),
  });
};

export const useBackendReleaseBlock = (organizationId: string, id: string, blockId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.backend.inventory.releaseBlock(organizationId, id, blockId),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: keys.backendInventory(organizationId),
      }),
  });
};

export const useBackendAssetCalendar = (
  organizationId: string,
  id: string,
  query: { startsAt: string; endsAt: string },
) =>
  useQuery({
    queryKey: keys.backendInventory(organizationId, 'calendar', id),
    queryFn: () => api.backend.inventory.getAssetCalendar(organizationId, id, query),
    enabled: Boolean(organizationId && id),
  });

/* --------------------------------------------------------------- reservations */
export const useBackendReservations = (
  query: { page?: number; limit?: number } = {},
) =>
  useQuery({
    queryKey: keys.backendReservations(query),
    queryFn: () => api.backend.reservations.list(query),
    placeholderData: keepPreviousData,
  });

export const useBackendReservation = (id: string | undefined) =>
  useQuery({
    queryKey: keys.backendReservations('detail', id),
    queryFn: () => api.backend.reservations.detail(id!),
    enabled: Boolean(id),
  });

export const useBackendCreateReservation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      body,
      idempotencyKey,
    }: {
      body: Parameters<typeof api.backend.reservations.create>[0];
      idempotencyKey?: string;
    }) =>
      api.backend.reservations.create(
        body,
        idempotencyKey ?? generateIdempotencyKey(),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.backendReservations() }),
  });
};

export const useBackendReleaseReservation = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.backend.reservations.release(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: keys.backendReservations() }),
  });
};

export const useBackendCheckoutQuote = (id: string | undefined) =>
  useQuery({
    queryKey: keys.backendReservations('checkout', id),
    queryFn: () => api.backend.reservations.checkoutQuote(id!),
    enabled: Boolean(id),
  });

/* ------------------------------------------------------------------- orders */
export const useBackendOrders = (
  query: { page?: number; limit?: number } = {},
) =>
  useQuery({
    queryKey: keys.backendOrders(query),
    queryFn: () => api.backend.orders.list(query),
    placeholderData: keepPreviousData,
  });

export const useBackendOrder = (id: string | undefined) =>
  useQuery({
    queryKey: keys.backendOrders('detail', id),
    queryFn: () => api.backend.orders.detail(id!),
    enabled: Boolean(id),
  });

export const useBackendCreateOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      body,
      idempotencyKey,
    }: {
      body: Parameters<typeof api.backend.orders.create>[0];
      idempotencyKey?: string;
    }) =>
      api.backend.orders.create(body, idempotencyKey ?? generateIdempotencyKey()),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.backendOrders() }),
  });
};

export const useBackendCancelOrder = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.backend.orders.cancel(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: keys.backendOrders() }),
  });
};

/* ------------------------------------------------------------------- health */
export const useBackendHealthLive = () =>
  useQuery({
    queryKey: keys.backendHealth('live'),
    queryFn: () => api.backend.health.live(),
    staleTime: 30_000,
  });

export const useBackendHealthReady = () =>
  useQuery({
    queryKey: keys.backendHealth('ready'),
    queryFn: () => api.backend.health.ready(),
    staleTime: 30_000,
  });

/* ------------------------------------------------------------ staff catalog */
export const useBackendCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.backend.staffCatalog.createProduct>[0]) =>
      api.backend.staffCatalog.createProduct(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.backendStaffCatalog() }),
  });
};

export const useBackendOfferQueue = (
  query: { page?: number; limit?: number; status?: string } = {},
) =>
  useQuery({
    queryKey: keys.backendStaffCatalog('queue', query),
    queryFn: () => api.backend.staffCatalog.offerQueue(query),
    placeholderData: keepPreviousData,
  });

export const useBackendReviewOffer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Parameters<typeof api.backend.staffCatalog.reviewOffer>[1];
    }) => api.backend.staffCatalog.reviewOffer(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.backendStaffCatalog() }),
  });
};

export const useBackendGetCheckoutTerms = (offerId: string | undefined) =>
  useQuery({
    queryKey: keys.backendStaffCatalog('checkout-terms', offerId),
    queryFn: () => api.backend.staffCatalog.getCheckoutTerms(offerId!),
    enabled: Boolean(offerId),
  });

export const useBackendPutCheckoutTerms = (offerId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.backend.staffCatalog.putCheckoutTerms>[1]) =>
      api.backend.staffCatalog.putCheckoutTerms(offerId, body),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: keys.backendStaffCatalog('checkout-terms', offerId),
      }),
  });
};
