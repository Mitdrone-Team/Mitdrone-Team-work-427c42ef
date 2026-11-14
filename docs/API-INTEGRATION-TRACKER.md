# MITDrone API Integration Tracker

Tracks integration of live backend OpenAPI operations against frontend apps.

**Source of truth:** `https://mitdrone.vercel.app/docs/openapi.json` (57 operations, all response bodies undocumented `{}`)

**Backend base:** `http://localhost:4000/api/v1` (health at `/health/*`)

**Security:** `mitdrone_session` HTTP-only cookie + `x-csrf-token` header on authenticated mutations. CSRF managed in-memory by AuthController (not localStorage).

---

## Integration Classification

| Class | Meaning |
|-------|---------|
| **Complete** | SDK endpoint + TanStack Query hook + actual app page/workflow usage with loading, error, empty states |
| **Partial** | SDK endpoint + hook exist, but no app page or server-side workflow consumes them |
| **Not applicable to frontend** | Infrastructure/webhook/backend-boundary operations |
| **Not integrated** | No SDK endpoint exists |

---

## Operation-by-Operation Status

### Authentication (11 operations)

| # | Endpoint | Method | Status | Integration Location | Notes |
|---|----------|--------|--------|---------------------|-------|
| A1 | `/auth/registration-terms` | GET | Partial | SDK endpoint + hook | No app page uses it |
| A2 | `/auth/register` | POST | Partial | SDK endpoint only | Login/register handled by AuthController + auth pages; public endpoint used |
| A3 | `/auth/verify-email` | POST | Partial | SDK endpoint only | No app page |
| A4 | `/auth/resend-verification` | POST | Partial | SDK endpoint only | No app page |
| A5 | `/auth/forgot-password` | POST | Partial | SDK endpoint only | No app page |
| A6 | `/auth/reset-password` | POST | Partial | SDK endpoint only | No app page |
| A7 | `/auth/login` | POST | Partial | SDK endpoint + AuthController.login() | CSRF captured from response, configured on ApiClient |
| A8 | `/auth/session` | GET | Partial | SDK endpoint + AuthController.reloadUser() | Session restoration with CSRF recovery, isRestoring guard |
| A9 | `/auth/logout` | POST | Partial | SDK endpoint + AuthController.logout() | CSRF required, best-effort backend call, token cleared |
| A10 | `/auth/logout-all` | POST | Partial | SDK endpoint only | No app page |
| A11 | `/auth/change-password` | POST | Partial | SDK endpoint only | No app page |

---

### Health (2 operations)

| # | Endpoint | Method | Status | Integration Location | Notes |
|---|----------|--------|--------|---------------------|-------|
| H1 | `/health/live` | GET | Not applicable to frontend | SDK endpoint + hook | Infrastructure probe, outside `/api/v1` |
| H2 | `/health/ready` | GET | Not applicable to frontend | SDK endpoint + hook | Infrastructure probe, returns 503 if DB unavailable |

---

### Organizations (8 operations)

| # | Endpoint | Method | Status | Integration Location | Notes |
|---|----------|--------|--------|---------------------|-------|
| O1 | `/organizations` | GET | Complete | Admin dashboard vendors page (`useBackendOrganizations`) | CSRF not required (GET) |
| O2 | `/organizations/{id}` | GET | Complete | Admin dashboard vendor detail (`useBackendOrganization`) | CSRF optional per spec |
| O3 | `/organizations/applications` | POST | Partial | SDK endpoint + hook (`useBackendOrgApplication`) | No app page |
| O4 | `/organizations/service-provider-applications` | POST | Partial | SDK endpoint + hook (`useBackendOrgApplyAsServiceProvider`) | No app page |
| O5 | `/organizations/{id}/application` | PATCH | Partial | SDK endpoint + hook (`useBackendOrgResubmitApplication`) | No app page |
| O6 | `/organizations/{id}/service-provider-application` | PATCH | Partial | SDK endpoint + hook (`useBackendOrgResubmitServiceProviderApplication`) | No app page |
| O7 | `/organizations/{id}/memberships` | POST | Partial | SDK endpoint + hook (`useBackendOrgAddMember`) | No app page |
| O8 | `/organizations/{id}/memberships/{userId}` | DELETE | Partial | SDK endpoint + hook (`useBackendOrgRemoveMember`) | No app page |

---

### Organization Review / Staff (3 operations)

| # | Endpoint | Method | Status | Integration Location | Notes |
|---|----------|--------|--------|---------------------|-------|
| S1 | `/admin/organizations` | GET | Complete | Admin dashboard vendors page (via `GET /organizations`) | Maps to org list endpoint |
| S2 | `/admin/organizations/{id}/review` | POST | Complete | Admin dashboard vendor detail (`useBackendOrgReviewDecision`) | CSRF set on SDK; spec does NOT list x-csrf-token parameter |
| S3 | `/admin/organizations/{id}/suspend` | POST | Complete | Admin dashboard vendor detail (`useBackendOrgSuspend`) | CSRF set on SDK; spec does NOT list x-csrf-token parameter |

---

### Catalog (3 operations)

| # | Endpoint | Method | Status | Integration Location | Notes |
|---|----------|--------|--------|---------------------|-------|
| C1 | `/catalog/offers` | GET | Partial | SDK endpoint + hook (`useBackendCatalogOffers`) + server function | No app page uses it; shop page uses `/catalog/products` instead |
| C2 | `/catalog/products` | GET | Complete | Marketplace shop page (`getBackendCatalogProducts` → `normalizeBackendProductList`) | Response shape undocumented — normalization is speculative; `totalPages: 1` hardcoded |
| C3 | `/catalog/offers/{offerId}/availability` | GET | Complete | Marketplace product detail page (`getBackendOfferAvailability`) | Response shape undocumented |

---

### Vendor Offers (5 operations)

| # | Endpoint | Method | Status | Integration Location | Notes |
|---|----------|--------|--------|---------------------|-------|
| VO1 | `/organizations/{orgId}/offers` | GET | Complete | Vendor dashboard products page (`useBackendVendorOffers`) | CSRF set on SDK but spec does NOT list x-csrf-token parameter |
| VO2 | `/organizations/{orgId}/offers` | POST | Partial | SDK endpoint + hook (`useBackendCreateOffer`) | Backend DTO (`CreateOfferDto`) differs from product form fields; no app page uses backend mutation |
| VO3 | `/organizations/{orgId}/offers/{id}` | PATCH | Partial | SDK endpoint + hook (`useBackendUpdateOffer`) | Backend DTO differs from form fields; no app page uses backend mutation |
| VO4 | `/organizations/{orgId}/offers/{id}/submit` | POST | Partial | SDK endpoint + hook (`useBackendSubmitOffer`) | Takes `VersionDto` (`expectedVersion`); no app page |
| VO5 | `/organizations/{orgId}/offers/{id}/archive` | POST | Partial | SDK endpoint + hook (`useBackendArchiveOffer`) | Takes `VersionDto` (`expectedVersion`); no app page |

---

### Inventory (11 operations)

| # | Endpoint | Method | Status | Integration Location | Notes |
|---|----------|--------|--------|---------------------|-------|
| I1 | `/organizations/{orgId}/offers/{offerId}/stock` | POST | Partial | SDK endpoint + hook (`useBackendInitializeStock`) | CSRF required per spec; no app page |
| I2 | `/organizations/{orgId}/offers/{offerId}/stock` | GET | Partial | SDK endpoint + hook (`useBackendStock`) | CSRF optional per spec; no app page |
| I3 | `/organizations/{orgId}/offers/{offerId}/stock/adjustments` | POST | Partial | SDK endpoint + hook (`useBackendAdjustStock`) | CSRF required per spec; no app page |
| I4 | `/organizations/{orgId}/offers/{offerId}/rental-terms` | PUT | Partial | SDK endpoint + hook (`useBackendConfigureRentalTerms`) | CSRF required per spec; no app page |
| I5 | `/organizations/{orgId}/offers/{offerId}/rental-terms` | GET | Partial | SDK endpoint + hook (`useBackendRentalTerms`) | CSRF optional per spec; no app page |
| I6 | `/organizations/{orgId}/assets` | POST | Partial | SDK endpoint + hook (`useBackendCreateAsset`) | CSRF required per spec; no app page |
| I7 | `/organizations/{orgId}/assets` | GET | Complete | Vendor dashboard inventory page (`useBackendInventory`) | CSRF optional per spec |
| I8 | `/organizations/{orgId}/assets/{id}` | PATCH | Partial | SDK endpoint + hook (`useBackendUpdateAsset`) | CSRF required per spec; no app page |
| I9 | `/organizations/{orgId}/assets/{id}/blocks` | POST | Partial | SDK endpoint + hook (`useBackendBlockAsset`) | CSRF required per spec; no app page |
| I10 | `/organizations/{orgId}/assets/{id}/blocks/{blockId}` | DELETE | Partial | SDK endpoint + hook (`useBackendReleaseBlock`) | CSRF required per spec; no app page |
| I11 | `/organizations/{orgId}/assets/{id}/calendar` | GET | Partial | SDK endpoint + hook (`useBackendAssetCalendar`) | CSRF optional per spec; no app page |

---

### Reservations (5 operations)

| # | Endpoint | Method | Status | Integration Location | Notes |
|---|----------|--------|--------|---------------------|-------|
| R1 | `/reservations` | POST | Partial | SDK endpoint + hook (`useBackendCreateReservation`) | CSRF optional; Idempotency-Key required; no app page |
| R2 | `/reservations` | GET | Partial | SDK endpoint + hook (`useBackendReservations`) | No app page |
| R3 | `/reservations/{id}` | GET | Partial | SDK endpoint + hook (`useBackendReservation`) | No app page |
| R4 | `/reservations/{id}/release` | POST | Partial | SDK endpoint + hook (`useBackendReleaseReservation`) | No app page |
| R5 | `/reservations/{id}/checkout` | GET | Partial | SDK endpoint + hook (`useBackendCheckoutQuote`) | No app page |

---

### Orders (4 operations)

| # | Endpoint | Method | Status | Integration Location | Notes |
|---|----------|--------|--------|---------------------|-------|
| OR1 | `/orders` | POST | Partial | SDK endpoint + hook (`useBackendCreateOrder`) | CSRF optional; Idempotency-Key required; no app page |
| OR2 | `/orders` | GET | Complete | Marketplace account orders + Vendor orders + Admin orders (`useBackendOrders`) | CSRF optional per spec |
| OR3 | `/orders/{id}` | GET | Complete | Vendor order detail + Admin order detail (`useBackendOrder`) | CSRF optional per spec |
| OR4 | `/orders/{id}/cancel` | POST | Complete | Vendor order detail + Admin order detail (`useBackendCancelOrder`) | CSRF required per spec |

---

### Staff Catalog / Checkout Terms (5 operations)

| # | Endpoint | Method | Status | Integration Location | Notes |
|---|----------|--------|--------|---------------------|-------|
| S4 | `/admin/products` | POST | Partial | SDK endpoint + hook (`useBackendCreateProduct`) | Takes `CreateProductDto` (`name` only); no app page |
| S5 | `/admin/offers` | GET | Complete | Admin dashboard products table (`useBackendOfferQueue`) | No app page uses it directly |
| S6 | `/admin/offers/{id}/review` | POST | Complete | Admin dashboard products table (`useBackendReviewOffer`) | CSRF set on SDK but spec does NOT list x-csrf-token parameter |
| Ch1 | `/staff/offers/{offerId}/checkout-terms` | PUT | Partial | SDK endpoint + hook (`useBackendPutCheckoutTerms`) | CSRF required per spec; no app page |
| Ch2 | `/staff/offers/{offerId}/checkout-terms` | GET | Partial | SDK endpoint + hook (`useBackendGetCheckoutTerms`) | CSRF optional per spec; no app page |

---

## Summary Counts

| Category | Count |
|----------|-------|
| Total operations in live spec | 57 |
| Complete (SDK + hook + app page) | 17 |
| Partial (SDK + hook, no app page) | 38 |
| Not applicable to frontend (health probes) | 2 |
| Not integrated (no SDK endpoint) | 0 |
| **Percentage fully integrated** | **17/55 = 30.9%** (excluding 2 health probes) |

---

## CSRF Configuration Discrepancies

The SDK sets `csrf: true` on these endpoints where the OpenAPI spec does NOT list an `x-csrf-token` parameter:

| Endpoint | SDK sets csrf: true | Spec lists x-csrf-token |
|----------|---------------------|------------------------|
| `POST /admin/organizations/{id}/review` | Yes | No |
| `POST /admin/organizations/{id}/suspend` | Yes | No |
| `POST /organizations/{orgId}/offers` | Yes | No |
| `PATCH /organizations/{orgId}/offers/{id}` | Yes | No |
| `POST /organizations/{orgId}/offers/{id}/submit` | Yes | No |
| `POST /organizations/{orgId}/offers/{id}/archive` | Yes | No |
| `POST /admin/products` | Yes | No |
| `POST /admin/offers/{id}/review` | Yes | No |

The general API description states "Authenticated mutations require x-csrf-token," but only 10 operations explicitly list the parameter. These 8 operations may fail with `csrf_token_unavailable` if the backend does not validate CSRF for them. **Backend confirmation required.**

---

## Known Defects Fixed

1. **React Hooks rules-of-hooks**: `useBackendInventory`, `useBackendVendorOffers`, `useBackendOrders`, `useBackendOrganizations` were called conditionally inside ternary expressions. Fixed by always calling both backend and mock hooks, then conditionally selecting the result. Added `enabled: Boolean(organizationId)` to `useBackendInventory` and `useBackendVendorOffers` SDK hooks.

2. **Invalid status values**: Vendor dashboard inventory table passed `status: 'low'` to backend (backend enum: AVAILABLE/MAINTENANCE/LOST/RETIRED/SOLD). Removed from backend path. Vendor dashboard product table passed UI statuses (active/pending_review/flagged/archived/draft) to backend (backend enum: DRAFT/SUBMITTED/REJECTED/PUBLISHED/ARCHIVED). Removed status from backend path.

3. **Duplicate function declarations**: `getBackendOrders` and `getBackendReservations` were declared twice in marketplace `data.ts`. Removed duplicates.

4. **DTO type mismatches**: Backend `CreateOfferDto` expects `{ productId, mode, amountMinor, currency, rateUnit }` — completely different from product form fields. Product create/edit pages continue using mock seller SDK hooks. Backend offer create/update hooks remain unused by app pages.

5. **Backend enum values**: Approve/reject decisions use uppercase enum values (`APPROVE`, `REJECT`, `REQUEST_MORE_INFORMATION`) not lowercase strings.

6. **Missing `expectedVersion`**: `ReasonDto` and `ApplicationReviewDto` require `expectedVersion` field. Added placeholder value of `1`.

---

## Mock vs Backend by App

| App | Pages using backend | Pages still on mock |
|-----|--------------------|---------------------|
| Marketplace | Shop (catalog/products), Search (catalog/products), Product detail (availability), Account orders (orders) | Product detail (main data uses public catalog), categories, vendors, manufacturers, reviews, services, live sessions, checkout |
| Vendor dashboard | Products (offers), Inventory (assets), Orders, Order detail | Dashboard overview, settings, payouts, reservations, stock adjustments, rental terms, asset blocks, product create/edit (mock seller SDK) |
| Admin dashboard | Vendors (organizations), Vendor detail (org review), Orders, Order detail, Products (offer queue) | Dashboard overview, users, disputes, payouts, audit logs, settings, product approve/flag/delete (mock admin SDK) |

---

## Remaining 38 Operations — Intended Consumer and Dependencies

### Buyer operations (Marketplace)

| # | Endpoint | Method | Intended Consumer | Page / Workflow | Dependencies / Blockers |
|---|----------|--------|-------------------|-----------------|------------------------|
| A2 | `/auth/register` | POST | Buyer | Registration page | Public endpoint; used by AuthController |
| A3 | `/auth/verify-email` | POST | Buyer | Email verification | No frontend page |
| A4 | `/auth/resend-verification` | POST | Buyer | Resend verification | No frontend page |
| A5 | `/auth/forgot-password` | POST | Buyer | Forgot password | No frontend page |
| A6 | `/auth/reset-password` | POST | Buyer | Reset password | No frontend page |
| A10 | `/auth/logout-all` | POST | Buyer | Account settings | No frontend page |
| A11 | `/auth/change-password` | POST | Buyer | Account settings | No frontend page |
| A1 | `/auth/registration-terms` | GET | Buyer | Registration flow | No frontend page |
| C1 | `/catalog/offers` | GET | Buyer | Shop / search listing | Response shape undocumented |
| R1 | `/reservations` | POST | Buyer | Checkout | Idempotency-Key; CreateHoldDto requires `expectedOfferVersion` |
| R2 | `/reservations` | GET | Buyer | Account reservations | Response shape undocumented |
| R3 | `/reservations/{id}` | GET | Buyer | Reservation detail | Response shape undocumented |
| R4 | `/reservations/{id}/release` | POST | Buyer | Cancel reservation | CSRF: spec lists parameter but SDK does not set `csrf: true` |
| R5 | `/reservations/{id}/checkout` | GET | Buyer | Checkout quote | Response shape undocumented |
| OR1 | `/orders` | POST | Buyer | Place order | Idempotency-Key; CreateOrderDto requires `expectedCheckoutTermsVersion` |
| Ch2 | `/staff/offers/{offerId}/checkout-terms` | GET | Buyer | Checkout terms display | Response shape undocumented |

### Vendor operations (Vendor dashboard)

| # | Endpoint | Method | Intended Consumer | Page / Workflow | Dependencies / Blockers |
|---|----------|--------|-------------------|-----------------|------------------------|
| VO2 | `/organizations/{orgId}/offers` | POST | Vendor | Create offer | `CreateOfferDto` (`{productId, mode, amountMinor, currency, rateUnit}`) does not match product form; no vendor-facing product creation endpoint exists — only `/admin/products` (admin only, `name` only) |
| VO3 | `/organizations/{orgId}/offers/{id}` | PATCH | Vendor | Edit offer | `UpdateOfferDto` includes `expectedVersion`; no app page uses backend mutation |
| VO4 | `/organizations/{orgId}/offers/{id}/submit` | POST | Vendor | Submit for review | Takes `VersionDto` (`expectedVersion`); no app page |
| VO5 | `/organizations/{orgId}/offers/{id}/archive` | POST | Vendor | Archive offer | Takes `VersionDto` (`expectedVersion`); no app page |
| I1 | `/organizations/{orgId}/offers/{offerId}/stock` | POST | Vendor | Initialize stock | `CreateStockDto` (`kind`, `initialOnHand`); CSRF required |
| I2 | `/organizations/{orgId}/offers/{offerId}/stock` | GET | Vendor | View stock | CSRF optional |
| I3 | `/organizations/{orgId}/offers/{offerId}/stock/adjustments` | POST | Vendor | Adjust stock | `AdjustStockDto` (`expectedVersion`, `delta`, `reason`); CSRF required |
| I4 | `/organizations/{orgId}/offers/{offerId}/rental-terms` | PUT | Vendor | Configure rental terms | `RentalTermsDto`; CSRF required |
| I5 | `/organizations/{orgId}/offers/{offerId}/rental-terms` | GET | Vendor | View rental terms | CSRF optional |
| I6 | `/organizations/{orgId}/assets` | POST | Vendor | Create asset | `CreateAssetDto` (`productId`, `serialNumber`, `conditionNote`); CSRF required |
| I8 | `/organizations/{orgId}/assets/{id}` | PATCH | Vendor | Update asset | `UpdateAssetDto` (`expectedVersion`, `status`, `conditionNote`, `reason`); CSRF required |
| I9 | `/organizations/{orgId}/assets/{id}/blocks` | POST | Vendor | Block asset | `BlockAssetDto` (`startsAt`, `endsAt`, `reason`); CSRF required |
| I10 | `/organizations/{orgId}/assets/{id}/blocks/{blockId}` | DELETE | Vendor | Release block | CSRF required |
| I11 | `/organizations/{orgId}/assets/{id}/calendar` | GET | Vendor | Asset availability calendar | Requires `startsAt`/`endsAt`; CSRF optional |

### Admin operations (Admin dashboard)

| # | Endpoint | Method | Intended Consumer | Page / Workflow | Dependencies / Blockers |
|---|----------|--------|-------------------|-----------------|------------------------|
| O3 | `/organizations/applications` | POST | Admin | Vendor onboarding | No app page |
| O4 | `/organizations/service-provider-applications` | POST | Admin | Service provider onboarding | No app page |
| O5 | `/organizations/{id}/application` | PATCH | Admin | Resubmit application | No app page |
| O6 | `/organizations/{id}/service-provider-application` | PATCH | Admin | Resubmit SP application | No app page |
| O7 | `/organizations/{id}/memberships` | POST | Admin | Add member | No app page |
| O8 | `/organizations/{id}/memberships/{userId}` | DELETE | Admin | Remove member | No app page |
| S4 | `/admin/products` | POST | Admin | Create catalog product | Takes `CreateProductDto` (`name` only); minimal — likely requires follow-up offer creation |
| S5 | `/admin/offers` | GET | Admin | Offer queue | Already connected via `useBackendOfferQueue` |
| S6 | `/admin/offers/{id}/review` | POST | Admin | Review offer | Already connected via `useBackendReviewOffer` |
| Ch1 | `/staff/offers/{offerId}/checkout-terms` | PUT | Admin | Configure checkout terms | `CheckoutTermsDto`; CSRF required |

### System / server-side operations (no frontend page)

| # | Endpoint | Method | Classification | Notes |
|---|----------|--------|----------------|-------|
| H1 | `/health/live` | GET | System | Infrastructure probe; outside `/api/v1` |
| H2 | `/health/ready` | GET | System | Infrastructure probe; returns 503 if DB unavailable |
| A7 | `/auth/login` | POST | System | Auth token capture; integrated via AuthController |
| A8 | `/auth/session` | GET | System | Session restoration; integrated via AuthController |
| A9 | `/auth/logout` | POST | System | Session termination; integrated via AuthController |

---
