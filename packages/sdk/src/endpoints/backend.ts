/**
 * Backend-native SDK endpoints derived from the live OpenAPI specification.
 *
 * These methods call the actual MITDrone backend (`/api/v1` + `/health`) using
 * the exact paths, methods, and request schemas from the live specification.
 * They are separate from the existing mocked-demo endpoints in
 * `packages/sdk/src/endpoints/{public,seller,admin}.ts`.
 *
 * Response bodies that are undocumented in the spec (`{}`) are typed as
 * `unknown`. No frontend response schemas are fabricated.
 *
 * CSRF: Authenticated mutations require `x-csrf-token`. The SDK client enforces
 * fail-closed behaviour when `getCsrfToken` is not configured — authenticated
 * mutations throw `csrf_token_unavailable` until the backend documents the
 * token acquisition mechanism.
 *
 * Idempotency: Reservation creation and order creation require an
 * `Idempotency-Key` header. Use `generateIdempotencyKey()` from
 * `@mitdrone/types` to create keys.
 */

import {
  backendRoutes,
  generateIdempotencyKey,
  type AdjustStockDto,
  type ApplicationDto,
  type ApplicationReviewDto,
  type BlockAssetDto,
  type ChangePasswordDto,
  type CheckoutTermsDto,
  type CreateAssetDto,
  type CreateHoldDto,
  type CreateOfferDto,
  type CreateOrderDto,
  type CreateProductDto,
  type CreateStockDto,
  type EmailDto,
  type LoginDto,
  type MemberDto,
  type ReasonDto,
  type RegisterDto,
  type ResubmitApplicationDto,
  type ResubmitServiceProviderApplicationDto,
  type ReviewDto,
  type ResetPasswordDto,
  type RentalTermsDto,
  type ServiceProviderApplicationDto,
  type UpdateAssetDto,
  type UpdateOfferDto,
  type VersionDto,
  type VerifyEmailDto,
  type HealthLiveResponse,
  type RegistrationTermsResponse,
} from '@mitdrone/types';

import type { ApiClient, RequestOptions } from '../client';

/**
 * Merge extra headers (e.g. Idempotency-Key) with per-request options.
 */
function withHeaders(
  options: RequestOptions = {},
  extra: Record<string, string> = {},
): RequestOptions {
  return {
    ...options,
    headers: { ...options.headers, ...extra },
  };
}

/**
 * Backend-native endpoints, grouped by domain.
 */
export const backendEndpoints = (c: ApiClient) => ({
  /* ------------------------------------------------------------- auth */
  // Auth paths match the frontend's existing routes exactly; the backend
  // spec documents the same endpoints. Request/response DTOs are typed
  // against the OpenAPI component schemas.
  auth: {
    registrationTerms: () =>
      c.request<RegistrationTermsResponse>(
        'GET',
        backendRoutes.auth.registrationTerms,
        { auth: false },
      ),
    register: (body: RegisterDto) =>
      c.request<unknown>('POST', backendRoutes.auth.register, {
        body,
        auth: false,
      }),
    verifyEmail: (body: VerifyEmailDto) =>
      c.request<unknown>('POST', backendRoutes.auth.verifyEmail, {
        body,
        auth: false,
      }),
    resendVerification: (body: EmailDto) =>
      c.request<unknown>('POST', backendRoutes.auth.resendVerification, {
        body,
        auth: false,
      }),
    forgotPassword: (body: EmailDto) =>
      c.request<unknown>('POST', backendRoutes.auth.forgotPassword, {
        body,
        auth: false,
      }),
    resetPassword: (body: ResetPasswordDto) =>
      c.request<unknown>('POST', backendRoutes.auth.resetPassword, {
        body,
        auth: false,
      }),
    login: (body: LoginDto) =>
      c.request<unknown>('POST', backendRoutes.auth.login, {
        body,
        auth: false,
      }),
    session: () => c.request<unknown>('GET', backendRoutes.auth.session),
    logout: () =>
      c.request<unknown>('POST', backendRoutes.auth.logout, { csrf: true }),
    logoutAll: () =>
      c.request<unknown>('POST', backendRoutes.auth.logoutAll),
    changePassword: (body: ChangePasswordDto) =>
      c.request<unknown>('POST', backendRoutes.auth.changePassword, {
        body,
      }),
  },

  /* ---------------------------------------------------------- organizations */
  organizations: {
    list: (query: { page?: number; limit?: number } = {}) =>
      c.request<unknown>('GET', backendRoutes.organizations.list, {
        query,
      }),
    detail: (id: string) =>
      c.request<unknown>('GET', backendRoutes.organizations.detail(id)),
    apply: (body: ApplicationDto) =>
      c.request<unknown>('POST', backendRoutes.organizations.applications, {
        body,
      }),
    applyAsServiceProvider: (body: ServiceProviderApplicationDto) =>
      c.request<unknown>(
        'POST',
        backendRoutes.organizations.serviceProviderApplications,
        { body },
      ),
    resubmitApplication: (id: string, body: ResubmitApplicationDto) =>
      c.request<unknown>(
        'PATCH',
        backendRoutes.organizations.application(id),
        { body },
      ),
    resubmitServiceProviderApplication: (
      id: string,
      body: ResubmitServiceProviderApplicationDto,
    ) =>
      c.request<unknown>(
        'PATCH',
        backendRoutes.organizations.serviceProviderApplication(id),
        { body },
      ),
    addMember: (id: string, body: MemberDto) =>
      c.request<unknown>('POST', backendRoutes.organizations.memberships(id), {
        body,
      }),
    removeMember: (id: string, userId: string) =>
      c.request<unknown>(
        'DELETE',
        backendRoutes.organizations.membership(id, userId),
      ),
  },

  /* ---------------------------------------------------------- org review (staff) */
  orgReview: {
    queue: (query: {
      page?: number;
      limit?: number;
      status?: string;
      kind?: string;
    } = {}) =>
      c.request<unknown>('GET', backendRoutes.orgReview.queue, { query }),
    review: (id: string, body: ApplicationReviewDto) =>
      c.request<unknown>('POST', backendRoutes.orgReview.review(id), {
        body,
        csrf: true,
      }),
    suspend: (id: string, body: ReasonDto) =>
      c.request<unknown>('POST', backendRoutes.orgReview.suspend(id), {
        body,
        csrf: true,
      }),
  },

  /* ----------------------------------------------------------------- catalog */
  catalog: {
    offers: (query: {
      mode?: 'SALE' | 'RENTAL';
      page?: number;
      limit?: number;
    } = {}) =>
      c.request<unknown>('GET', backendRoutes.catalog.offers, { query }),
    products: (query: { page?: number; limit?: number } = {}) =>
      c.request<unknown>('GET', backendRoutes.catalog.products, { query }),
    availability: (offerId: string, query?: {
      startsAt?: string;
      endsAt?: string;
    }) =>
      c.request<unknown>(
        'GET',
        backendRoutes.catalog.availability(offerId),
        { query },
      ),
  },

  /* ------------------------------------------------------------ vendor offers */
  vendorOffers: {
    list: (
      organizationId: string,
      query: {
        page?: number;
        limit?: number;
        status?: string;
      } = {},
    ) =>
      c.request<unknown>('GET', backendRoutes.vendorOffers.list(organizationId), {
        query,
      }),
    create: (organizationId: string, body: CreateOfferDto) =>
      c.request<unknown>(
        'POST',
        backendRoutes.vendorOffers.create(organizationId),
        { body, csrf: true },
      ),
    update: (
      organizationId: string,
      id: string,
      body: UpdateOfferDto,
    ) =>
      c.request<unknown>(
        'PATCH',
        backendRoutes.vendorOffers.detail(organizationId, id),
        { body, csrf: true },
      ),
    submit: (organizationId: string, id: string, body: VersionDto) =>
      c.request<unknown>(
        'POST',
        backendRoutes.vendorOffers.submit(organizationId, id),
        { body, csrf: true },
      ),
    archive: (organizationId: string, id: string, body: VersionDto) =>
      c.request<unknown>(
        'POST',
        backendRoutes.vendorOffers.archive(organizationId, id),
        { body, csrf: true },
      ),
  },

  /* ------------------------------------------------------------------- inventory */
  inventory: {
    initializeStock: (
      organizationId: string,
      offerId: string,
      body: CreateStockDto,
    ) =>
      c.request<unknown>(
        'POST',
        backendRoutes.inventory.stock(organizationId, offerId),
        { body, csrf: true },
      ),
    getStock: (organizationId: string, offerId: string) =>
      c.request<unknown>(
        'GET',
        backendRoutes.inventory.stock(organizationId, offerId),
      ),
    adjustStock: (
      organizationId: string,
      offerId: string,
      body: AdjustStockDto,
    ) =>
      c.request<unknown>(
        'POST',
        backendRoutes.inventory.stockAdjustments(organizationId, offerId),
        { body, csrf: true },
      ),
    configureRentalTerms: (
      organizationId: string,
      offerId: string,
      body: RentalTermsDto,
    ) =>
      c.request<unknown>(
        'PUT',
        backendRoutes.inventory.rentalTerms(organizationId, offerId),
        { body, csrf: true },
      ),
    getRentalTerms: (organizationId: string, offerId: string) =>
      c.request<unknown>(
        'GET',
        backendRoutes.inventory.rentalTerms(organizationId, offerId),
      ),
    createAsset: (organizationId: string, body: CreateAssetDto) =>
      c.request<unknown>(
        'POST',
        backendRoutes.inventory.assets(organizationId),
        { body, csrf: true },
      ),
    listAssets: (organizationId: string, query?: {
      page?: number;
      limit?: number;
      status?: string;
    }) =>
      c.request<unknown>(
        'GET',
        backendRoutes.inventory.assets(organizationId),
        { query },
      ),
    updateAsset: (
      organizationId: string,
      id: string,
      body: UpdateAssetDto,
    ) =>
      c.request<unknown>(
        'PATCH',
        backendRoutes.inventory.asset(organizationId, id),
        { body, csrf: true },
      ),
    blockAsset: (
      organizationId: string,
      id: string,
      body: BlockAssetDto,
    ) =>
      c.request<unknown>(
        'POST',
        backendRoutes.inventory.assetBlocks(organizationId, id),
        { body, csrf: true },
      ),
    releaseBlock: (
      organizationId: string,
      id: string,
      blockId: string,
    ) =>
      c.request<unknown>(
        'DELETE',
        backendRoutes.inventory.assetBlock(organizationId, id, blockId),
        { csrf: true },
      ),
    getAssetCalendar: (
      organizationId: string,
      id: string,
      query: { startsAt: string; endsAt: string },
    ) =>
      c.request<unknown>(
        'GET',
        backendRoutes.inventory.assetCalendar(organizationId, id),
        { query },
      ),
  },

  /* ------------------------------------------------------------ staff catalog */
  staffCatalog: {
    createProduct: (body: CreateProductDto) =>
      c.request<unknown>('POST', backendRoutes.staffCatalog.createProduct, {
        body,
        csrf: true,
      }),
    offerQueue: (query: {
      page?: number;
      limit?: number;
      status?: string;
    } = {}) =>
      c.request<unknown>('GET', backendRoutes.staffCatalog.offerQueue, {
        query,
      }),
    reviewOffer: (id: string, body: ReviewDto) =>
      c.request<unknown>('POST', backendRoutes.staffCatalog.reviewOffer(id), {
        body,
        csrf: true,
      }),
    getCheckoutTerms: (offerId: string) =>
      c.request<unknown>('GET', backendRoutes.staffCatalog.checkoutTerms(offerId)),
    putCheckoutTerms: (offerId: string, body: CheckoutTermsDto) =>
      c.request<unknown>(
        'PUT',
        backendRoutes.staffCatalog.checkoutTerms(offerId),
        { body, csrf: true },
      ),
  },

  /* --------------------------------------------------------------- reservations */
  reservations: {
    list: (query: { page?: number; limit?: number } = {}) =>
      c.request<unknown>('GET', backendRoutes.reservations.list, { query }),
    create: (body: CreateHoldDto, idempotencyKey?: string) =>
      c.request<unknown>(
        'POST',
        backendRoutes.reservations.create,
        withHeaders(
          { body, csrf: true },
          idempotencyKey
            ? { 'Idempotency-Key': idempotencyKey }
            : { 'Idempotency-Key': generateIdempotencyKey() },
        ),
      ),
    detail: (id: string) =>
      c.request<unknown>('GET', backendRoutes.reservations.detail(id)),
    release: (id: string) =>
      c.request<unknown>('POST', backendRoutes.reservations.release(id), { csrf: true }),
    checkoutQuote: (id: string) =>
      c.request<unknown>('GET', backendRoutes.reservations.checkoutQuote(id)),
  },

  /* ------------------------------------------------------------------- orders */
  orders: {
    list: (query: { page?: number; limit?: number } = {}) =>
      c.request<unknown>('GET', backendRoutes.orders.list, { query }),
    create: (body: CreateOrderDto, idempotencyKey?: string) =>
      c.request<unknown>(
        'POST',
        backendRoutes.orders.create,
        withHeaders(
          { body, csrf: true },
          idempotencyKey
            ? { 'Idempotency-Key': idempotencyKey }
            : { 'Idempotency-Key': generateIdempotencyKey() },
        ),
      ),
    detail: (id: string) => c.request<unknown>('GET', backendRoutes.orders.detail(id)),
    cancel: (id: string) =>
      c.request<unknown>('POST', backendRoutes.orders.cancel(id), { csrf: true }),
  },

  /* ------------------------------------------------------------------- health */
  health: {
    live: () =>
      c.request<HealthLiveResponse>(
        'GET',
        backendRoutes.health.live,
        { auth: false, baseUrlOverride: c.baseUrl.replace(/\/api\/v1$/, '') },
      ),
    ready: () =>
      c.request<unknown>('GET', backendRoutes.health.ready, {
        auth: false,
        baseUrlOverride: c.baseUrl.replace(/\/api\/v1$/, ''),
      }),
  },
});
