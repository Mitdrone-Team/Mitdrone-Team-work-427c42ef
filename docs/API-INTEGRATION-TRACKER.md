# MITDrone API Integration Tracker

Tracks integration of live backend OpenAPI operations against frontend apps.

**Source of truth:** `https://mitdrone.vercel.app/docs/openapi.json` (57 operations, all response bodies undocumented `{}`)

**Backend base:** `http://localhost:4000/api/v1` (health at `/health/*`)

**Security:** `mitdrone_session` HTTP-only cookie + `x-csrf-token` header on authenticated mutations. CSRF managed in-memory by AuthController (not localStorage).

**Last verified:** typecheck 11/11, lint 11/11, tests 11/11, production build 3/3.

---

## Integration Classification

| Class | Meaning |
|-------|---------|
| **Complete** | SDK endpoint + TanStack Query hook + actual app page/workflow usage with loading, error, empty states |
| **Partial** | SDK endpoint + hook exist, but no app page consumes them (or intentionally blocked) |
| **Not applicable to frontend** | Infrastructure/webhook/backend-boundary operations |
| **Not integrated** | No SDK endpoint exists |

---

## Operation-by-Operation Status

### Authentication (11 operations)

| # | Endpoint | Method | Status | Integration Location | Notes |
|---|----------|--------|--------|---------------------|-------|
| A1 | `/auth/registration-terms` | GET | Complete | Register form, vendor/service apply forms (`termsVersion`) | Used to source `termsVersion` |
| A2 | `/auth/register` | POST | Complete | Register form + `AuthController.register()` | CSRF captured from response |
| A3 | `/auth/verify-email` | POST | Complete | `/verify-email` token action form | |
| A4 | `/auth/resend-verification` | POST | Complete | Register form + verify-email token actions | |
| A5 | `/auth/forgot-password` | POST | Complete | `/forgot-password` form | |
| A6 | `/auth/reset-password` | POST | Complete | `/reset-password` token action form | |
| A7 | `/auth/login` | POST | Complete | Login form + `AuthController.login()` | CSRF captured from response, configured on ApiClient |
| A8 | `/auth/session` | GET | Complete | `AuthController.reloadUser()` on provider mount | Session restore with CSRF recovery, `isRestoring` guard |
| A9 | `/auth/logout` | POST | Complete | `AuthController.logout()` | CSRF required; best-effort backend call, token cleared |
| A10 | `/auth/logout-all` | POST | Complete | Account profile form ("Sign out of all devices") | |
| A11 | `/auth/change-password` | POST | Complete | `packages/auth/src/change-password-form.tsx` | |

---

### Health (2 operations)

| # | Endpoint | Method | Status | Integration Location | Notes |
|---|----------|--------|--------|---------------------|-------|
| H1 | `/health/live` | GET | Complete | Admin dashboard overview badge (`getAdminBackendHealthLive`) | Outside `/api/v1` |
| H2 | `/health/ready` | GET | Complete | Admin dashboard overview badge (`getAdminBackendHealthReady`) | 503 surfaces as "dependencies unavailable" |

---

### Organizations (8 operations)

| # | Endpoint | Method | Status | Integration Location | Notes |
|---|----------|--------|--------|---------------------|-------|
| O1 | `/organizations` | GET | Complete | Admin vendors table (`useBackendOrganizations`) | GET, no CSRF |
| O2 | `/organizations/{id}` | GET | Complete | Admin vendor detail (`useBackendOrganization`) | |
| O3 | `/organizations/applications` | POST | Complete | Marketplace `/sell/apply` (`useBackendOrgApplication`) | |
| O4 | `/organizations/service-provider-applications` | POST | Complete | Marketplace `/services/apply` (`useBackendOrgApplyAsServiceProvider`) | |
| O5 | `/organizations/{id}/application` | PATCH | Complete | Marketplace apply form resubmit mode | `expectedVersion` from existing application |
| O6 | `/organizations/{id}/service-provider-application` | PATCH | Complete | Marketplace apply form resubmit mode | |
| O7 | `/organizations/{id}/memberships` | POST | Complete | Vendor settings "Team members" (`useBackendOrgAddMember`) | |
| O8 | `/organizations/{id}/memberships/{userId}` | DELETE | Complete | Vendor settings "Team members" remove | Uses `user.vendorId` |

---

### Organization Review / Staff (3 operations)

| # | Endpoint | Method | Status | Integration Location | Notes |
|---|----------|--------|--------|---------------------|-------|
| S1 | `/admin/organizations` | GET | Complete | Admin vendors table (`useBackendOrgReviewQueue`) | Status/kind mapped to UI enums |
| S2 | `/admin/organizations/{id}/review` | POST | Complete | Admin vendor detail (`useBackendOrgReviewDecision`) | CSRF set on SDK; spec does NOT list x-csrf-token |
| S3 | `/admin/organizations/{id}/suspend` | POST | Complete | Admin vendor detail (`useBackendOrgSuspend`) | CSRF set on SDK; spec does NOT list x-csrf-token |

---

### Catalog (3 operations)

| # | Endpoint | Method | Status | Integration Location | Notes |
|---|----------|--------|--------|---------------------|-------|
| C1 | `/catalog/offers` | GET | Complete | Marketplace listing (`/rent` → RENTAL, `/offers` → SALE) via `getBackendCatalogOffers` | Response shape undocumented → defensive normalizer |
| C2 | `/catalog/products` | GET | Complete | Marketplace shop + search via `getBackendCatalogProducts` | Response shape undocumented; `totalPages: 1` fallback |
| C3 | `/catalog/offers/{offerId}/availability` | GET | Complete | Marketplace product detail (`getBackendOfferAvailability`) | Response shape undocumented |

---

### Vendor Offers (5 operations)

| # | Endpoint | Method | Status | Integration Location | Notes |
|---|----------|--------|--------|---------------------|-------|
| VO1 | `/organizations/{orgId}/offers` | GET | Complete | Vendor products table (`useBackendVendorOffers`) | Normalized to product rows |
| VO2 | `/organizations/{orgId}/offers` | POST | Partial | SDK endpoint + hook only (`useBackendCreateOffer`) | **Blocked:** backend `CreateOfferDto` requires `productId`; no vendor-facing product-create endpoint exists. Create/edit UI stays on mock seller SDK by design |
| VO3 | `/organizations/{orgId}/offers/{id}` | PATCH | Partial | SDK endpoint + hook only (`useBackendUpdateOffer`) | **Blocked:** pricing-only DTO, same `productId` gap as VO2 |
| VO4 | `/organizations/{orgId}/offers/{id}/submit` | POST | Complete | Vendor products table (`useBackendSubmitOffer`) | `expectedVersion` from row `version` |
| VO5 | `/organizations/{orgId}/offers/{id}/archive` | POST | Complete | Vendor products table (`useBackendArchiveOffer`) | `expectedVersion` from row `version` |

---

### Inventory (11 operations)

| # | Endpoint | Method | Status | Integration Location | Notes |
|---|----------|--------|--------|---------------------|-------|
| I1 | `/organizations/{orgId}/offers/{offerId}/stock` | POST | Complete | Vendor products "Manage stock" (`useBackendInitializeStock`) | CSRF required |
| I2 | `/organizations/{orgId}/offers/{offerId}/stock` | GET | Complete | Vendor products stock dialog (`useBackendStock`) | |
| I3 | `/organizations/{orgId}/offers/{offerId}/stock/adjustments` | POST | Complete | Vendor products stock dialog (`useBackendAdjustStock`) | CSRF required |
| I4 | `/organizations/{orgId}/offers/{offerId}/rental-terms` | PUT | Complete | Vendor products "Rental terms" dialog (`useBackendConfigureRentalTerms`) | CSRF required |
| I5 | `/organizations/{orgId}/offers/{offerId}/rental-terms` | GET | Complete | Vendor products "Rental terms" dialog (`useBackendRentalTerms`) | |
| I6 | `/organizations/{orgId}/assets` | POST | Complete | Vendor inventory "New asset" (`useBackendCreateAsset`) | CSRF required |
| I7 | `/organizations/{orgId}/assets` | GET | Complete | Vendor inventory table (`useBackendInventory`) | Normalized asset rows |
| I8 | `/organizations/{orgId}/assets/{id}` | PATCH | Complete | Vendor inventory asset actions (`useBackendUpdateAsset`) | CSRF required |
| I9 | `/organizations/{orgId}/assets/{id}/blocks` | POST | Complete | Vendor inventory asset actions (`useBackendBlockAsset`) | CSRF required |
| I10 | `/organizations/{orgId}/assets/{id}/blocks/{blockId}` | DELETE | Complete | Vendor inventory asset actions (`useBackendReleaseBlock`) | CSRF required |
| I11 | `/organizations/{orgId}/assets/{id}/calendar` | GET | Complete | Vendor inventory asset actions (`useBackendAssetCalendar`) | Requires `startsAt`/`endsAt` |

---

### Reservations (5 operations)

| # | Endpoint | Method | Status | Integration Location | Notes |
|---|----------|--------|--------|---------------------|-------|
| R1 | `/reservations` | POST | Complete | Account reservations view (`useBackendCreateReservation`) | `Idempotency-Key` required |
| R2 | `/reservations` | GET | Complete | Account reservations view (`useBackendReservations`) | Linked from account nav |
| R3 | `/reservations/{id}` | GET | Complete | Account reservations detail (`useBackendReservation`) | |
| R4 | `/reservations/{id}/release` | POST | Complete | Account reservations release (`useBackendReleaseReservation`) | CSRF now set (`csrf: true`) |
| R5 | `/reservations/{id}/checkout` | GET | Complete | Account reservations checkout quote (`useBackendCheckoutQuote`) | Response shape undocumented → `readQuote` fallback |

---

### Orders (4 operations)

| # | Endpoint | Method | Status | Integration Location | Notes |
|---|----------|--------|--------|---------------------|-------|
| OR1 | `/orders` | POST | Complete | Account reservations → "Place order" (`useBackendCreateOrder`) | Reservation-based flow; `Idempotency-Key` required |
| OR2 | `/orders` | GET | Complete | Marketplace account orders, Vendor orders, Admin orders (`useBackendOrders`) | |
| OR3 | `/orders/{id}` | GET | Complete | Marketplace / Vendor / Admin order detail (`useBackendOrder`) | |
| OR4 | `/orders/{id}/cancel` | POST | Complete | Vendor + Admin order detail (`useBackendCancelOrder`) | CSRF now set (`csrf: true`) |

---

### Staff Catalog / Checkout Terms (5 operations)

| # | Endpoint | Method | Status | Integration Location | Notes |
|---|----------|--------|--------|---------------------|-------|
| S4 | `/admin/products` | POST | Complete | Admin products header "New product" (`useBackendCreateProduct`) | `CreateProductDto` (`name` only) |
| S5 | `/admin/offers` | GET | Complete | Admin products table (`useBackendOfferQueue`) | Normalized offer queue |
| S6 | `/admin/offers/{id}/review` | POST | Complete | Admin products row actions approve/reject (`useBackendReviewOffer`) | CSRF set on SDK; spec does NOT list x-csrf-token |
| Ch1 | `/staff/offers/{offerId}/checkout-terms` | PUT | Complete | Admin products row "Checkout terms" (`useBackendPutCheckoutTerms`) | CSRF required |
| Ch2 | `/staff/offers/{offerId}/checkout-terms` | GET | Complete | Admin products row "Checkout terms" (`useBackendGetCheckoutTerms`) | Response shape undocumented |

---

## Summary Counts

| Category | Count |
|----------|-------|
| Total operations in live spec | 57 |
| Complete (SDK + hook + app page) | 55 |
| Partial (SDK + hook, intentionally blocked) | 2 (VO2, VO3) |
| Not applicable to frontend | 0 |
| Not integrated (no SDK endpoint) | 0 |
| **Percentage fully integrated** | **55/57 = 96.5%** |

The two partial operations are blocked by backend contract gaps, not frontend work:
- `CreateOfferDto` requires a `productId` that vendors cannot create (no vendor product-create endpoint).
- `UpdateOfferDto` is pricing-only and carries the same product linkage.

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

The general API description states "Authenticated mutations require x-csrf-token," but only some operations explicitly list the parameter. These 8 operations may fail with `csrf_token_unavailable` if the backend does not validate CSRF for them. **Backend confirmation required.**

`POST /reservations/{id}/release` and `POST /orders/{id}/cancel` were added to the SDK with `csrf: true` to match their spec-declared `x-csrf-token` parameter.

---

## Known Defects Fixed

1. **React Hooks rules-of-hooks**: backend hooks were called conditionally inside ternaries. Fixed by always calling both backend and mock hooks and selecting via `useBackend`.
2. **Invalid status values**: UI statuses leaked into backend queries. Backend paths now use backend enums only.
3. **Duplicate function declarations**: `getBackendOrders` / `getBackendReservations` were declared twice; duplicates removed.
4. **DTO type mismatches**: `CreateOfferDto`/`UpdateOfferDto` do not match product form fields — create/edit remains mock.
5. **Backend enum values**: review decisions use uppercase enums (`APPROVE`, `REJECT`, `REQUEST_MORE_INFORMATION`).
6. **Missing `expectedVersion`**: review/versioned mutations take `expectedVersion` (row `version`, fallback `1`).
7. **`'use server'` in a pure module**: removed from marketplace `src/lib/normalization.ts` (Server Action build error).
8. **Admin order-detail test crash**: backend response field renamed `data` → `order` to match `AdminOrderDetail`.
9. **Import order lint**: normalized type-import ordering across the three apps to clear `--max-warnings=0`.

---

## Mock vs Backend by App

| App | Pages/workflows on backend | Remaining mock surfaces |
|-----|---------------------------|-------------------------|
| Marketplace | Shop + search (products), `/rent` + `/offers` (offers), product detail availability, account orders + detail, account reservations + checkout quote/order, profile sign-out-all, change password, register/verify/reset/forgot, `/sell/apply`, `/services/apply` | Product detail main content (uses public catalog), categories, vendors, manufacturers, reviews, services listings, live sessions, cart checkout flow |
| Vendor dashboard | Products (offers, submit/archive, stock init/adjust, rental terms), Inventory (assets, create/update/block/release/calendar), Orders + detail, Order cancel, Settings team members (add/remove) | Dashboard overview KPIs, payouts, earlier reservations UI, offer create/edit (VO2/VO3 blocked), mock product form data |
| Admin dashboard | Vendors + detail (org review/suspend), Products (offer queue, review approve/reject, create product, checkout terms), Orders + detail (cancel), Overview backend live/ready badge | Users/roles, disputes, payouts, audit logs, platform settings, mock admin SDK |

---

## Response-Shape Caveat

Every backend response body in the live spec is `{}`. All normalizers (`apps/marketplace-web/src/lib/normalization.ts`, vendor inventory/offer normalizers, admin offer normalizer) unwrap common envelopes (`data`/`offers`/`items`/`reservations`/`order`/`assets`/`meta`) with defaults. Shapes must be re-verified once the backend documents response schemas.
